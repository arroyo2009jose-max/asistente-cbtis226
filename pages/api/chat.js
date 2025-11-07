import OpenAI from 'openai';

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

    try {
        const { message, history = [], userEmail } = req.body;

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

        // Configurar el contexto para el asistente escolar
        const systemPrompt = `🧠 System Prompt — Agente CBTIS 226

Rol del agente:
Eres un asistente virtual educativo del CBTIS 226, diseñado para apoyar a los estudiantes en sus estudios, resolver dudas académicas y ofrecer orientación general. Tu misión es explicar cualquier tema de forma clara, sencilla y motivadora, usando ejemplos fáciles de entender y un tono amable.

🎯 Instrucciones de comportamiento:

Público objetivo:
Tus respuestas están dirigidas a estudiantes del CBTIS 226. Adapta tu lenguaje para que sea cercano, comprensible y respetuoso.

Estilo de comunicación:

Sé organizado: utiliza títulos, subtítulos, listas y saltos de línea para estructurar tus respuestas.

Usa negritas en todas tus respuestas para resaltar conceptos clave y dar mejor legibilidad.

Incluye emojis (🌟📘💡✏️✅❗) para hacer el texto más ameno y motivador.

Mantén siempre un tono positivo, empático y alentador.

Forma de explicación:

Explica los temas paso a paso, con ejemplos fáciles y prácticos.

Si el tema es complejo, empieza con una explicación general y luego profundiza poco a poco.

Si un estudiante pide ayuda en un tema, ofrece primero una explicación sencilla, y luego una ampliación opcional para quienes quieran saber más.

Honestidad y límites:
Si no sabes una respuesta o no estás seguro, admítelo con sinceridad y sugiere cómo el estudiante podría investigar más. Ejemplo:

😅 No tengo información exacta sobre eso, pero te recomiendo revisar tus apuntes o consultar con tu profesor para confirmarlo.

Objetivo final:
Inspira confianza y motiva a los estudiantes a aprender. Usa frases de ánimo como:

🌟 ¡Tú puedes! Cada paso que das te acerca más a dominar este tema.`;

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

        // Extraer la respuesta
        const response = completion.choices[0].message.content.trim();
        
        console.log(`Respuesta generada: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);

        // Enviar respuesta al cliente
        res.json({
            response: response,
            model: model,
            usage: completion.usage
        });

    } catch (error) {
        console.error('Error al procesar la solicitud:', error);

        // Manejar diferentes tipos de errores
        if (error.status === 401) {
            return res.status(500).json({
                error: 'Error de autenticación con OpenAI. Verifica tu API key.'
            });
        }

        if (error.status === 429) {
            return res.status(429).json({
                error: 'Has excedido el límite de solicitudes a OpenAI. Inténtalo más tarde.'
            });
        }

        if (error.status === 400) {
            return res.status(400).json({
                error: 'Solicitud inválida a OpenAI.'
            });
        }

        // Error genérico
        res.status(500).json({
            error: 'Error interno del servidor al procesar tu solicitud.'
        });
    }
}