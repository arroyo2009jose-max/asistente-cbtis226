# Asistente IA CBTIS 226 con Next.js y Memoria Persistente

## 🚀 Cómo Correr el Programa
cd D:\Users\100034881\Documents\Pruebas_Cursor\cbtisv2copia\backend
npm run dev

### Requisitos Previos
1. **Node.js** (versión 18 o superior)
2. **API Key de OpenAI** con método de pago configurado

### Pasos de Instalación y Ejecución

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   - Copia el archivo `.env.local.example` a `.env.local`
   - Añade tu API key de OpenAI

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Abrir la aplicación:**
   - Navega a `http://localhost:3000`

## 📋 Características Básicas

- **Asistente escolar especializado**: Enfocado en resolver dudas académicas del CBTIS 226
- **Interfaz futurista**: Diseño moderno con efectos visuales atractivos
- **Soporte multimodal**: Texto, imágenes y audio
- **Respuestas contextuales**: La IA se adapta al nivel del usuario
- **Diseño responsive**: Funciona en escritorio y móviles
- **Optimizado para Vercel**: Despliegue fácil con un solo clic

## 🧠 Funcionalidades (Memoria)

### Sistema de Memoria Persistente
- **Memoria conversacional**: El chatbot recuerda mensajes anteriores dentro de la misma sesión
- **Memoria persistente**: Recuerda conversaciones incluso después de cerrar el navegador
- **Contexto inteligente**: Envía los últimos 12 mensajes relevantes a OpenAI
- **Gestión de tokens**: Optimiza el uso para no exceder límites de la API
- **Cache eficiente**: Sistema de cache para mejorar el rendimiento

### Experiencia de Usuario
- **Sesiones por usuario**: Cada usuario tiene su propio historial
- **Carga automática**: Al iniciar sesión, recupera conversaciones anteriores
- **Sin interferencia visual**: La memoria funciona en segundo plano
- **Historial local**: Los mensajes se guardan en el navegador del usuario

## 💰 Costos de la IA

### Modelos Utilizados
- **GPT-3.5-turbo**: ~$0.002 por 1,000 tokens (texto)
- **GPT-4o**: ~$0.005 por 1,000 tokens (imágenes)
- **Whisper**: ~$0.006 por minuto de audio

### Estrategia de Optimización
- **Selección inteligente**: Usa GPT-3.5 para texto (más económico)
- **Uso selectivo de GPT-4o**: Solo para análisis de imágenes
- **Gestión de tokens**: Limita el contexto a 2,500 tokens por solicitud
- **Cache de historial**: Evita reprocesar el mismo contenido

### Estimación de Costos
- **Conversación típica**: <$0.01 por 10 mensajes de texto
- **Con imágenes**: ~$0.01-0.02 por solicitud con imagen
- **Uso moderado**: <$1 mensual para uso personal regular

## 🔒 Seguridad

### Protección de Datos
- **API key segura**: Nunca se expone en el frontend
- **Comunicación segura**: Todas las solicitudes a OpenAI desde el backend
- **Almacenamiento local**: El historial se guarda solo en el navegador del usuario
- **Sin persistencia en servidor**: Las conversaciones no se almacenan en el backend

### Mejores Prácticas
- **Variables de entorno**: Configuración sensible en archivo `.env.local`
- **Validación de entrada**: Filtrado y sanitización de datos
- **Manejo de errores**: Respuestas controladas ante fallos
- **Límites de uso**: Restricciones para prevenir abusos

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Next.js 14**: Framework React con SSR y SSG
- **React 18**: Biblioteca de UI con hooks modernos
- **CSS3**: Diseño futurista con glassmorphism y animaciones
- **Font Awesome**: Iconos modernos
- **Google Fonts**: Tipografía Inter optimizada

### Backend (API Routes)
- **Next.js API Routes**: Endpoints serverless
- **OpenAI API**: Integración con modelos GPT-3.5-turbo, GPT-4o y Whisper
- **Formidable**: Manejo de archivos multipart
- **CORS**: Compartición de recursos entre orígenes

### Arquitectura de Memoria
- **localStorage**: Almacenamiento persistente en el cliente
- **Cache Map**: Sistema de cache en el backend
- **Gestión de tokens**: Algoritmo de optimización de contexto
- **Serialización JSON**: Formato de intercambio de datos

## 🎯 Funcionalidades Detalladas

### Interacción Básica
- **Chat conversacional**: Diálogo natural con el asistente
- **Soporte a imágenes**: Análisis visual de contenido
- **Transcripción de audio**: Conversión de voz a texto
- **Efectos de escritura**: Experiencia de usuario mejorada

### Sistema de Memoria
- **Historial persistente**: Conversaciones guardadas por usuario
- **Contexto inteligente**: Los últimos 12 mensajes se envían a OpenAI
- **Optimización automática**: Truncado de mensajes largos
- **Gestión de sesión**: Inicio y cierre de sesión por usuario

### Características Avanzadas
- **Detección de idioma**: Respuestas en español automáticamente
- **Formato enriquecido**: Negritas, emojis y estructuración
- **Validación de entrada**: Límites de caracteres y tipos de archivo
- **Manejo de errores**: Mensajes informativos y recuperación

## 📊 Arquitectura del Sistema

```
Frontend (Next.js)
├── React Hooks (estado y efectos)
├── localStorage (historial por usuario)
├── Gestión de sesión
└── Envío de historial + mensaje

Backend (Next.js API Routes)
├── /api/chat (procesamiento de texto e imágenes)
├── /api/transcribe (procesamiento de audio)
├── Recepción de historial
├── Procesamiento y cache
├── Optimización de tokens
└── Llamada a OpenAI con contexto

OpenAI API
├── GPT-3.5-turbo (texto)
├── GPT-4o (imágenes)
└── Whisper (audio)
```

## 🔧 Configuración Avanzada

### Variables de Entorno
```env
OPENAI_API_KEY=sk-tu-api-key-aqui
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Límites del Sistema
- **Mensajes en historial**: 50 por usuario
- **Contexto enviado**: 12 mensajes recientes
- **Límite de tokens**: 2,500 por solicitud
- **Tamaño de imágenes**: 10MB máximo
- **Longitud de texto**: 1,000 caracteres por mensaje

## 🚀 Despliegue en Vercel

### Despliegue Automático
1. **Conectar repositorio a Vercel**
2. **Configurar variables de entorno** en el dashboard de Vercel
3. **Despliegue automático** con cada push a main

### Configuración de Vercel
- **Framework Preset**: Next.js
- **Node.js Version**: 18.x
- **Environment Variables**:
  - `OPENAI_API_KEY`: Tu API key de OpenAI
  - `NEXT_PUBLIC_APP_URL`: URL de producción

### Optimizaciones para Vercel
- **API Routes**: Funciones serverless automáticas
- **Static Assets**: Optimizados y cacheados
- **Image Optimization**: Configurado para Next.js
- **Edge Functions**: Para respuestas rápidas

## 🚨 Solución de Problemas Comunes

### Issues de Memoria
- **Problema**: No recuerda conversaciones anteriores
- **Solución**: Inicia sesión con el mismo correo electrónico

### Issues de Conexión
- **Problema**: Error al conectar con el backend
- **Solución**: Verifica que el servidor esté corriendo en el puerto 3000

### Issues de API
- **Problema**: Error de autenticación con OpenAI
- **Solución**: Verifica tu API key y fondos disponibles

### Issues de Despliegue
- **Problema**: Error al desplegar en Vercel
- **Solución**: Verifica las variables de entorno en el dashboard de Vercel

## 📝 Licencia

MIT License - Uso libre para fines personales y comerciales.

---

**¡Disfruta de tu asistente escolar con memoria persistente en Next.js!** 🤖🧠✨