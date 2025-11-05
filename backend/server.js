const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
dotenv.config();

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Configurar multer para manejar archivos
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB límite
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen o audio'));
        }
    }
});

// Crear directorio de uploads si no existe
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Ruta principal
app.get('/', (req, res) => {
    res.json({
        message: 'API del Asistente IA',
        version: '1.0.0',
        status: 'running'
    });
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

// Ruta para el chat con OpenAI (soporta texto e imágenes)
app.post('/api/chat', async (req, res) => {
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

Evita usar negritas en respuestas cortas como saludos o confirmaciones simples. En respuestas más extensas, úsalas moderadamente para resaltar solo los conceptos más importantes y mejorar la legibilidad.

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

        // Limpiar archivo temporal si existe
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('Error al eliminar archivo temporal:', cleanupError);
            }
        }

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
});

// Ruta para transcripción de audio con Whisper
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
        const audioFile = req.file;

        if (!audioFile) {
            return res.status(400).json({
                error: 'No se recibió ningún archivo de audio'
            });
        }

        console.log(`Audio recibido: ${audioFile.originalname}`);

        // Leer el archivo de audio
        const audioBuffer = fs.readFileSync(audioFile.path);

        // Crear un archivo temporal para la transcripción
        const tempAudioPath = path.join('uploads', `temp_${Date.now()}.wav`);
        fs.writeFileSync(tempAudioPath, audioBuffer);

        try {
            // Transcribir el audio con Whisper
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempAudioPath),
                model: "whisper-1",
                language: "es", // Español
                response_format: "text"
            });

            console.log(`Transcripción completada: ${transcription.substring(0, 100)}${transcription.length > 100 ? '...' : ''}`);

            // Enviar respuesta al cliente
            res.json({
                transcript: transcription.trim()
            });

        } finally {
            // Limpiar archivos temporales
            try {
                fs.unlinkSync(audioFile.path);
                fs.unlinkSync(tempAudioPath);
            } catch (cleanupError) {
                console.error('Error al eliminar archivos temporales:', cleanupError);
            }
        }

    } catch (error) {
        console.error('Error al transcribir audio:', error);

        // Limpiar archivo temporal si existe
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('Error al eliminar archivo temporal:', cleanupError);
            }
        }

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

        // Error genérico
        res.status(500).json({
            error: 'Error interno del servidor al transcribir el audio.'
        });
    }
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada'
    });
});

// Manejo global de errores
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({
        error: 'Error interno del servidor'
    });
});

// Función para limpiar cache periódicamente
function cleanCachePeriodically() {
    setInterval(() => {
        if (historyCache.size > 20) {
            console.log(`Limpiando cache: ${historyCache.size} entradas`);
            historyCache.clear();
        }
    }, 300000); // Limpiar cada 5 minutos
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor iniciado en http://localhost:${PORT}`);
    console.log(`📝 API endpoint: http://localhost:${PORT}/api/chat`);
    console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configurada ✓' : 'No configurada ✗'}`);
    console.log(`\n⚠️  Asegúrate de que el archivo .env contenga tu API key de OpenAI`);
    console.log(`📖 Para obtener una API key: https://platform.openai.com/api-keys\n`);
    
    // Iniciar limpieza periódica de cache
    cleanCachePeriodically();
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('Recibido SIGTERM. Cerrando servidor gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nRecibido SIGINT. Cerrando servidor...');
    process.exit(0);
});