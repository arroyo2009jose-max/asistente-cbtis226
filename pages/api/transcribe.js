import OpenAI from 'openai';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Configurar OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Deshabilitar el body parser por defecto de Next.js para manejar archivos
export const config = {
    api: {
        bodyParser: false,
    },
};

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
        // Parsear el formulario con formidable
        const form = formidable({
            uploadDir: '/tmp',
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB límite
            filter: function ({ mimetype }) {
                // Aceptar solo archivos de audio
                return mimetype && mimetype.startsWith('audio/');
            }
        });

        const [fields, files] = await form.parse(req);
        const audioFile = files.audio && files.audio[0];

        if (!audioFile) {
            return res.status(400).json({
                error: 'No se recibió ningún archivo de audio'
            });
        }

        console.log(`Audio recibido: ${audioFile.originalFilename}`);

        // Crear un archivo temporal para la transcripción
        const tempAudioPath = path.join('/tmp', `temp_${Date.now()}.wav`);
        
        // Copiar el archivo subido a la ubicación temporal
        fs.copyFileSync(audioFile.filepath, tempAudioPath);

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
                fs.unlinkSync(audioFile.filepath);
                fs.unlinkSync(tempAudioPath);
            } catch (cleanupError) {
                console.error('Error al eliminar archivos temporales:', cleanupError);
            }
        }

    } catch (error) {
        console.error('Error al transcribir audio:', error);

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
}