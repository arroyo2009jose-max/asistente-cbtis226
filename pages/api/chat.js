const OpenAI = require('openai');

// Importar las asignaturas y sus prompts
const { SUBJECTS } = require('../../components/SubjectSelector');

// Configurar OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Cache simple para historiales procesados
const historyCache = new Map();

// Función para generar clave de cache
function generateCacheKey(history) {
    if (!history || history.length === 0) return '';
    return history.map(msg => `${msg.role}:${msg.content.substring(0, 50)}`).join('|');
}

// Función para procesar historial y gestionar tokens
function processConversationHistory(history) {
    if (!history || history.length === 0) return [];
    
    // Generar clave de cache
    const cacheKey = generateCacheKey(history);
    
    // Verificar si ya tenemos este historial procesado en cache
    if (historyCache.has(cacheKey)) {
        console.log(`Usando historial desde cache (${history.length} mensajes)`);
        return historyCache.get(cacheKey);
    }
    
    const processedMessages = [];
    let totalTokens = 0;
    const MAX_TOKENS = 2500; // Límite seguro para dejar espacio para respuesta
    
    console.log(`Procesando ${history.length} mensajes del historial`);
    
    // Procesar mensajes del historial
    history.forEach(msg => {
        // Estimar tokens (aproximadamente 1 token por 4 caracteres en español)
        const estimatedTokens = Math.ceil(msg.content.length / 4);
        
        // Si el mensaje es muy largo, truncarlo
        let content = msg.content;
        if (estimatedTokens > 300) {
            content = msg.content.substring(0, 1200) + "... [mensaje truncado]";
        }
        
        // Verificar si podemos agregar este mensaje sin exceder el límite
        if (totalTokens + estimatedTokens < MAX_TOKENS) {
            processedMessages.push({
                role: msg.role === 'bot' ? 'assistant' : 'user',
                content: content
            });
            totalTokens += estimatedTokens;
        }
    });
    
    console.log(`Historial procesado: ${processedMessages.length} mensajes, ~${totalTokens} tokens`);
    
    // Guardar en cache (limitar cache a 50 entradas)
    if (historyCache.size >= 50) {
        const firstKey = historyCache.keys().next().value;
        historyCache.delete(firstKey);
    }
    historyCache.set(cacheKey, processedMessages);
    
    return processedMessages;
}

// Función para limpiar cache periódicamente
function cleanCachePeriodically() {
    setInterval(() => {
        if (historyCache.size > 20) {
            console.log(`Limpiando cache: ${historyCache.size} entradas`);
            historyCache.clear();
        }
    }, 300000); // Limpiar cada 5 minutos
}

// Iniciar limpieza periódica de cache
if (typeof window === 'undefined') {
    cleanCachePeriodically();
}

// Handler principal de la API
export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Log de depuración
    console.log('=== INICIO DE PETICIÓN A API CHAT ===');
    console.log('Método:', req.method);
    console.log('Headers:', req.headers);
    console.log('API Key disponible:', !!process.env.OPENAI_API_KEY);
    console.log('API Key length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);

    try {
        const { message, history = [], userEmail, subject = 'general' } = req.body;

        // Validar que se recibió un mensaje o una imagen
        if ((!message || message.trim() === '') && !req.body.image) {
            return res.status(400).json({
                error: 'Debes enviar un mensaje o una imagen'
            });
        }

        // Validar longitud del mensaje
        if (message && message.length > 4000) {
            return res.status(400).json({
                error: 'El mensaje es demasiado largo (máximo 4000 caracteres)'
            });
        }

        console.log(`Mensaje recibido de ${userEmail || 'usuario anónimo'}: ${message ? message.substring(0, 100) + (message.length > 100 ? '...' : '') : 'Solo imagen'}`);
        console.log(`Historial recibido: ${history.length} mensajes`);

        // Obtener el prompt específico según la asignatura seleccionada
        const selectedSubject = SUBJECTS[subject] || SUBJECTS.general;
        const systemPrompt = selectedSubject.prompt;
        
        console.log(`Asignatura seleccionada: ${selectedSubject.name} (${subject})`);

        // Preparar mensajes para la API
        const messages = [
            {
                role: "system",
                content: systemPrompt
            }
        ];

        // Procesar y agregar historial
        const processedHistory = processConversationHistory(history);
        messages.push(...processedHistory);

        // Construir el contenido del mensaje del usuario
        let userContent = [];
        
        // Agregar texto si existe
        if (message && message.trim() !== '') {
            userContent.push({
                type: "text",
                text: message
            });
        }
        
        // Procesar imagen si existe (en base64)
        if (req.body.image) {
            try {
                // Si la imagen viene como base64
                if (typeof req.body.image === 'string') {
                    userContent.push({
                        type: "image_url",
                        image_url: {
                            url: req.body.image
                        }
                    });
                }
            } catch (error) {
                console.error('Error al procesar la imagen:', error);
                return res.status(500).json({
                    error: 'Error al procesar la imagen'
                });
            }
        }
        
        // Agregar el contenido del usuario a los mensajes
        messages.push({
            role: "user",
            content: userContent
        });

        // Determinar el modelo a usar
        // Para texto: GPT-3.5-turbo (más económico)
        // Para imágenes: GPT-4o (necesario para visión)
        const model = req.body.image ? "gpt-4o" : "gpt-3.5-turbo";

        // Ajustar parámetros según el modelo
        const maxTokens = req.body.image ? 1000 : 1500; // Más tokens para texto puro
        const temperature = req.body.image ? 0.7 : 0.8; // Un poco más creativo para texto

        console.log('=== LLAMANDO A OPENAI ===');
        console.log('Modelo:', model);
        console.log('Mensajes a enviar:', messages.length);
        console.log('Max tokens:', maxTokens);

        // Llamar a la API de OpenAI
        const completion = await openai.chat.completions.create({
            model: model,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        });

        console.log('=== RESPUESTA DE OPENAI RECIBIDA ===');
        console.log('Choices:', completion.choices.length);
        console.log('Usage:', completion.usage);

        // Extraer la respuesta
        const response = completion.choices[0].message.content.trim();
        
        console.log(`Respuesta generada: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);
        console.log('=== ENVIANDO RESPUESTA AL CLIENTE ===');

        // Enviar respuesta al cliente
        res.json({
            response: response,
            model: model,
            usage: completion.usage
        });

    } catch (error) {
        console.error('=== ERROR EN API CHAT ===');
        console.error('Error completo:', error);
        console.error('Mensaje de error:', error.message);
        console.error('Status:', error.status);
        console.error('Tipo de error:', error.constructor.name);
        
        // Si es un error de OpenAI, mostrar más detalles
        if (error.response) {
            console.error('Respuesta de error de OpenAI:', error.response.data);
        }

        // Manejar diferentes tipos de errores
        if (error.status === 401) {
            console.error('ERROR 401: Problema de autenticación');
            return res.status(500).json({
                error: 'Error de autenticación con OpenAI. Verifica tu API key.'
            });
        }

        if (error.status === 429) {
            console.error('ERROR 429: Límite de velocidad excedido');
            return res.status(429).json({
                error: 'Has excedido el límite de solicitudes a OpenAI. Inténtalo más tarde.'
            });
        }

        if (error.status === 400) {
            console.error('ERROR 400: Solicitud inválida');
            return res.status(400).json({
                error: 'Solicitud inválida a OpenAI.'
            });
        }

        console.error('ERROR GENÉRICO: Enviando error 500');
        // Error genérico
        res.status(500).json({
            error: 'Error interno del servidor al procesar tu solicitud.',
            details: error.message
        });
    }
}