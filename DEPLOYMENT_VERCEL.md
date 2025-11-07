# Configuración de Variables de Entorno en Vercel

## Pasos para configurar la API Key de OpenAI

1. **Ve al dashboard de Vercel**
   - Inicia sesión en [vercel.com](https://vercel.com)
   - Selecciona tu proyecto `asistente-cbtis226`

2. **Configura las variables de entorno**
   - Ve a la pestaña "Settings"
   - Haz clic en "Environment Variables"
   - Agrega las siguientes variables:

   ```
   Nombre: OPENAI_API_KEY
   Valor: sk-your-actual-openai-api-key-here
   Entornos: Production, Preview, Development
   ```

   ```
   Nombre: CUSTOM_KEY
   Valor: your-custom-key-here (opcional)
   Entornos: Production, Preview, Development
   ```

3. **Redespliega el proyecto**
   - Después de configurar las variables, ve a la pestaña "Deployments"
   - Haz clic en los tres puntos (...) al lado del último deployment
   - Selecciona "Redeploy"

## Verificación

Para verificar que las variables están configuradas correctamente:

1. Abre la aplicación en Vercel
2. Envía un mensaje de prueba
3. Si funciona, deberías recibir una respuesta del asistente

## Problemas Comunes

### Error: "Error de autenticación con OpenAI"
- **Causa**: La API key no está configurada correctamente o es inválida
- **Solución**: Verifica que la variable `OPENAI_API_KEY` esté configurada correctamente en Vercel

### Error: "No se recibió ninguna respuesta"
- **Causa**: Problemas con los módulos ES o configuración
- **Solución**: Asegúrate de que el último deployment incluya los cambios de módulos ES

## Notas Importantes

- Nunca expongas tu API key en el código o en commits públicos
- Las variables de entorno en Vercel están encriptadas y son seguras
- Puedes tener diferentes valores para diferentes entornos (Production, Preview, Development)