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
                // Validar que la imagen esté en formato base64 válido
                if (typeof req.body.image === 'string') {
                    // Verificar que sea un base64 válido y no demasiado grande
                    const base64Data = req.body.image;
                    const base64Size = Buffer.byteLength(base64Data, 'base64');
                    
                    // Límite de 20MB para la imagen (aproximadamente)
                    const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
                    
                    if (base64Size > MAX_IMAGE_SIZE) {
                        console.error('Imagen demasiado grande:', base64Size, 'bytes');
                        return res.status(400).json({
                            error: 'La imagen es demasiado grande. Por favor, usa una imagen más pequeña (máximo 20MB).'
                        });
                    }
                    
                    // Validar formato de imagen
                    if (!base64Data.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,/)) {
                        console.error('Formato de imagen no válido');
                        return res.status(400).json({
                            error: 'Formato de imagen no compatible. Por favor, usa JPEG, PNG, GIF o WebP.'
                        });
                    }
                    
                    userContent.push({
                        type: "image_url",
                        image_url: {
                            url: base64Data,
                            detail: "low" // Reducir detalle para procesamiento más rápido
                        }
                    });
                } else {
                    throw new Error('Formato de imagen inválido');
                }
            } catch (error) {
                console.error('Error al procesar la imagen:', error);
                return res.status(400).json({
                    error: 'Error al procesar la imagen. Verifica que el formato sea compatible y el tamaño no exceda los límites.'
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
        console.log('¿Con imagen?:', !!req.body.image);

        // Configurar timeout para evitar peticiones colgadas (60 segundos para imágenes, 30 para texto)
        const timeoutMs = req.body.image ? 60000 : 30000;

        // Crear un controlador de timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Timeout: La solicitud tardó demasiado en procesarse. Inténtalo con una imagen más simple o sin imagen.'));
            }, timeoutMs);
        });

        // Llamar a la API de OpenAI con timeout
        const completionPromise = openai.chat.completions.create({
            model: model,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        });

        // Usar Promise.race para manejar el timeout
        const completion = await Promise.race([completionPromise, timeoutPromise]);

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
            // Errores específicos de imágenes
            if (req.body.image && error.message && (
                error.message.includes('image') ||
                error.message.includes('vision') ||
                error.message.includes('format') ||
                error.message.includes('size')
            )) {
                return res.status(400).json({
                    error: 'La imagen no pudo ser procesada. Intenta con una imagen más clara, simple o con mejor calidad. Formatos compatibles: JPEG, PNG, GIF, WebP.'
                });
            }
            return res.status(400).json({
                error: 'Solicitud inválida a OpenAI.'
            });
        }

        // Error de timeout específico
        if (error.message && error.message.includes('Timeout')) {
            console.error('ERROR DE TIMEOUT:', error.message);
            return res.status(408).json({
                error: 'La imagen es demasiado compleja para procesar. Por favor, intenta con una imagen más simple o describe lo que necesitas en texto.'
            });
        }

        // Error específico para procesamiento de imágenes
        if (req.body.image && error.message && (
            error.message.includes('invalid_image') ||
            error.message.includes('image_format') ||
            error.message.includes('image_size')
        )) {
            console.error('ERROR DE IMAGEN:', error.message);
            return res.status(400).json({
                error: 'No se pudo procesar la imagen. Verifica que sea una imagen clara y en formato compatible (JPEG, PNG, GIF, WebP) con un tamaño razonable.'
            });
        }

        console.error('ERROR GENÉRICO: Enviando error 500');
        // Error genérico
        res.status(500).json({
            error: 'Error interno del servidor al procesar tu solicitud.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}