# Guía de Despliegue en Vercel

## 🚀 Despliegue Automático (Recomendado)

### Paso 1: Preparar el Repositorio
1. **Sube tu código a GitHub/GitLab/Bitbucket**
2. **Asegúrate de incluir todos los archivos**:
   - `package.json`
   - `pages/` (con todas las API routes)
   - `styles/`
   - `public/` (si tienes assets estáticos)
   - `next.config.js`
   - `vercel.json`

### Paso 2: Conectar con Vercel
1. **Ve a [vercel.com](https://vercel.com)**
2. **Inicia sesión con tu cuenta de GitHub**
3. **Haz clic en "New Project"**
4. **Selecciona tu repositorio**
5. **Vercel detectará automáticamente que es un proyecto Next.js**

### Paso 3: Configurar Variables de Entorno
1. **En la configuración del proyecto, ve a "Environment Variables"**
2. **Añade las siguientes variables**:
   ```
   OPENAI_API_KEY=sk-tu-api-key-aqui
   NEXT_PUBLIC_APP_URL=https://tu-proyecto.vercel.app
   ```

### Paso 4: Despliegue
1. **Haz clic en "Deploy"**
2. **Vercel construirá y desplegará tu aplicación automáticamente**
3. **Recibirás una URL única para tu aplicación**

## 🔧 Configuración Avanzada

### Dominio Personalizado
1. **Ve a "Domains" en la configuración del proyecto**
2. **Añade tu dominio personalizado**
3. **Configura los DNS según las instrucciones de Vercel**

### Optimizaciones de Rendimiento
1. **Habilita "Edge Functions" para respuestas más rápidas**
2. **Configura "Image Optimization" para las imágenes**
3. **Activa "Analytics" para monitorear el rendimiento**

## 🛠️ Solución de Problemas Comunes

### Error: "OPENAI_API_KEY not found"
**Solución**: Asegúrate de configurar la variable de entorno en el dashboard de Vercel, no solo en tu archivo `.env.local`.

### Error: "Function timeout"
**Solución**: Aumenta el tiempo de espera en `vercel.json`:
```json
{
  "functions": {
    "pages/api/chat.js": {
      "maxDuration": 60
    }
  }
}
```

### Error: "CORS issues"
**Solución**: Verifica que los headers CORS estén configurados correctamente en `vercel.json` y en tus API routes.

### Error: "Build failed"
**Solución**: Revisa el log de construcción en Vercel. Los problemas más comunes son:
- Dependencias faltantes en `package.json`
- Errores de sintaxis en el código
- Variables de entorno no configuradas

## 📊 Monitoreo y Analytics

### Vercel Analytics
1. **Activa "Web Analytics" en la configuración**
2. **Instala el script de Vercel Analytics** (Next.js lo incluye automáticamente)
3. **Monitorea el rendimiento desde el dashboard**

### Monitoreo de OpenAI
1. **Revisa tu dashboard de OpenAI** para monitorear el uso y costos
2. **Configura alertas** para no exceder tu presupuesto

## 🔄 Actualizaciones Continuas

### Despliegue Automático con Git
1. **Cada push a tu rama principal desencadenará un nuevo despliegue**
2. **Los pull requests crearán previews automáticas**
3. **Puedes configurar ramas específicas para staging/producción**

### Rollbacks
1. **Desde el dashboard de Vercel, puedes volver a despliegues anteriores**
2. **Cada despliegue tiene un hash único para referencia**

## 🎯 Mejores Prácticas

### Seguridad
1. **Nunca expongas tu API key en el frontend**
2. **Usa variables de entorno para todos los datos sensibles**
3. **Habilita HTTPS (Vercel lo hace automáticamente)**

### Rendimiento
1. **Optimiza las imágenes antes de subirlas**
2. **Usa las optimizaciones integradas de Next.js**
3. **Monitorea el Core Web Vitals**

### Escalabilidad
1. **Configura límites de uso para evitar costos inesperados**
2. **Implementa caching donde sea posible**
3. **Monitorea el rendimiento regularmente**

---

## 🎉 ¡Felicidades!

Tu Asistente IA CBTIS 226 ahora está desplegado en Vercel con:
- ✅ Despliegue automático
- ✅ Dominio personalizado
- ✅ Variables de entorno seguras
- ✅ Monitoreo y analytics
- ✅ Actualizaciones continuas

Para soporte adicional, consulta la [documentación de Vercel](https://vercel.com/docs).