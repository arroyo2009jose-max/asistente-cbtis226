import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

export default function Home() {
  // Estados
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      content: '¡Hola! Soy tu asistente escolar del CBTIS 226. Estoy aquí para ayudarte con tus dudas académicas y explicarte cualquier concepto que necesites. ¿En qué puedo ayudarte hoy?',
      role: 'bot',
      image: null
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [charCount, setCharCount] = useState(0)
  const [showSessionReminder, setShowSessionReminder] = useState(false)

  // Refs
  const chatMessagesRef = useRef(null)
  const userInputRef = useRef(null)
  const fileInputRef = useRef(null)

  // Configuración
  const API_URL = '/api/chat'
  const MAX_CHARACTERS = 1000

  // Efectos
  useEffect(() => {
    checkSession()
    userInputRef.current?.focus()
    createFloatingParticles()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Funciones de gestión de sesión
  const checkSession = () => {
    if (typeof window === 'undefined') return
    
    const userEmail = localStorage.getItem('userEmail')
    const sessionActive = localStorage.getItem('sessionActive')
    
    if (userEmail && sessionActive === 'true') {
      setCurrentUser(userEmail)
      loadUserHistory(userEmail)
    } else {
      setShowSessionReminder(true)
      setTimeout(() => setShowSessionReminder(false), 10000)
    }
  }

  const login = (email) => {
    if (typeof window === 'undefined') return
    
    localStorage.setItem('userEmail', email)
    localStorage.setItem('sessionActive', 'true')
    setCurrentUser(email)
    
    // Actualizar mensaje de bienvenida
    setMessages(prev => [
      {
        id: 'welcome',
        content: `¡Hola ${email}! Soy tu asistente escolar del CBTIS 226. Estoy aquí para ayudarte con tus dudas académicas y explicarte cualquier concepto que necesites. ¿En qué puedo ayudarte hoy?`,
        role: 'bot',
        image: null
      }
    ])
    
    loadUserHistory(email)
  }

  const logout = () => {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem('userEmail')
    localStorage.removeItem('sessionActive')
    setCurrentUser(null)
    
    setMessages([
      {
        id: 'welcome',
        content: '¡Hola! Soy tu asistente escolar del CBTIS 226. Estoy aquí para ayudarte con tus dudas académicas y explicarte cualquier concepto que necesites. ¿En qué puedo ayudarte hoy?',
        role: 'bot',
        image: null
      }
    ])
  }

  const loadUserHistory = (email) => {
    if (typeof window === 'undefined') return
    
    const historyKey = `chatHistory_${email}`
    const history = localStorage.getItem(historyKey)
    
    if (history) {
      try {
        const parsedMessages = JSON.parse(history)
        // Mostrar últimos mensajes en el chat
        const lastMessages = parsedMessages.slice(-5)
        setMessages(prev => [
          prev[0], // Mantener mensaje de bienvenida
          ...lastMessages.map((msg, index) => ({
            id: `history-${index}`,
            content: msg.content,
            role: msg.role,
            image: msg.image
          }))
        ])
      } catch (error) {
        console.error('Error al cargar historial:', error)
      }
    }
  }

  const saveMessageToHistory = (messageContent, role, image = null) => {
    if (!currentUser || typeof window === 'undefined') return
    
    const historyKey = `chatHistory_${currentUser}`
    const history = localStorage.getItem(historyKey)
    const parsedMessages = history ? JSON.parse(history) : []
    
    parsedMessages.push({
      content: messageContent,
      role: role,
      image: image,
      timestamp: new Date().toISOString()
    })
    
    // Mantener solo últimos 50 mensajes
    if (parsedMessages.length > 50) {
      parsedMessages.splice(0, parsedMessages.length - 50)
    }
    
    localStorage.setItem(historyKey, JSON.stringify(parsedMessages))
  }

  const getOptimizedHistory = () => {
    if (!currentUser || typeof window === 'undefined') return []
    
    const historyKey = `chatHistory_${currentUser}`
    const history = localStorage.getItem(historyKey)
    const parsedMessages = history ? JSON.parse(history) : []
    
    // Devolver últimos 6 mensajes EXCLUYENDO el último mensaje
    return parsedMessages.slice(-7, -1)
  }

  // Funciones de manejo de mensajes
  const sendMessage = async () => {
    const trimmedMessage = message.trim()
    
    if (trimmedMessage === '' && !selectedImage) {
      showNotification('Por favor, escribe un mensaje o adjunta una imagen antes de enviar.')
      return
    }

    if (trimmedMessage.length > MAX_CHARACTERS) {
      showNotification('El mensaje excede el límite de caracteres.')
      return
    }

    // Agregar mensaje del usuario al chat
    const userMessage = {
      id: `user-${Date.now()}`,
      content: trimmedMessage,
      role: 'user',
      image: selectedImage
    }
    setMessages(prev => [...prev, userMessage])
    
    // Guardar mensaje en historial
    saveMessageToHistory(trimmedMessage, 'user', selectedImage)
    
    // Limpiar input y deshabilitar botón
    setMessage('')
    setCharCount(0)
    setIsLoading(true)
    
    // Limpiar imagen si existe
    const tempImage = selectedImage
    setSelectedImage(null)
    
    // Mostrar indicador de carga en el chat
    const thinkingMessage = {
      id: 'thinking',
      content: '',
      role: 'thinking'
    }
    setMessages(prev => [...prev, thinkingMessage])

    try {
      // Obtener historial optimizado
      const conversationHistory = getOptimizedHistory()
      console.log('Enviando historial con', conversationHistory.length, 'mensajes')
      
      // Preparar datos para enviar
      const requestData = {
        message: trimmedMessage,
        history: conversationHistory,
        userEmail: currentUser
      }
      
      if (tempImage) {
        requestData.image = tempImage
      }

      // Enviar mensaje al backend
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Remover mensaje de pensamiento y agregar respuesta del bot
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'thinking')
        return [
          ...filtered,
          {
            id: `bot-${Date.now()}`,
            content: data.response,
            role: 'bot',
            image: null
          }
        ]
      })
      
      // Guardar respuesta del bot en historial
      saveMessageToHistory(data.response, 'bot')
      
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
      
      // Remover mensaje de pensamiento y agregar mensaje de error
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'thinking')
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            content: 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, inténtalo de nuevo más tarde.',
            role: 'bot',
            image: null
          }
        ]
      })
    } finally {
      setIsLoading(false)
      userInputRef.current?.focus()
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const updateCharCount = (e) => {
    const currentLength = e.target.value.length
    setCharCount(currentLength)
  }

  // Funciones de manejo de imágenes
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = function(event) {
        setSelectedImage(event.target.result)
      }
      reader.readAsDataURL(file)
    } else {
      showNotification('Por favor, selecciona un archivo de imagen válido.')
    }
  }

  const removeSelectedImage = () => {
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Funciones de UI
  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }

  const showNotification = (messageText) => {
    if (typeof window === 'undefined') return
    
    // Crear elemento de notificación
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      max-width: 300px;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `
    notification.textContent = messageText
    
    // Agregar animación CSS
    const style = document.createElement('style')
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `
    document.head.appendChild(style)
    
    document.body.appendChild(notification)
    
    // Eliminar notificación después de 3 segundos
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease-out reverse'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }

  const toggleProfileMenu = () => {
    if (currentUser) {
      const options = ['Cerrar sesión', 'Limpiar historial']
      const selectedOption = window.prompt(`Opciones de perfil:\n\n${options.map((opt, index) => `${index + 1}. ${opt}`).join('\n')}\n\nIngresa el número de tu opción:`)
      
      if (selectedOption && !isNaN(selectedOption)) {
        const index = parseInt(selectedOption) - 1
        if (index === 0) logout()
        else if (index === 1) clearHistory()
      }
    } else {
      const email = window.prompt('Ingresa tu correo electrónico para iniciar sesión:')
      if (email && email.includes('@')) {
        login(email)
      } else if (email !== null) {
        showNotification('Por favor, ingresa un correo válido')
      }
    }
  }

  const clearHistory = () => {
    if (!currentUser || typeof window === 'undefined') return
    
    if (window.confirm('¿Estás seguro de que quieres limpiar todo tu historial?')) {
      const historyKey = `chatHistory_${currentUser}`
      localStorage.removeItem(historyKey)
      showNotification('Historial limpiado')
      
      // Recargar chat
      window.location.reload()
    }
  }

  const createFloatingParticles = () => {
    if (typeof window === 'undefined') return
    
    const particlesContainer = document.querySelector('.floating-particles')
    if (!particlesContainer) return
    
    // Crear 15 partículas adicionales
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div')
      particle.className = 'particle'
      
      // Posición aleatoria
      particle.style.left = Math.random() * 100 + '%'
      particle.style.top = Math.random() * 100 + '%'
      
      // Tamaño aleatorio
      const size = Math.random() * 3 + 1
      particle.style.width = size + 'px'
      particle.style.height = size + 'px'
      
      // Retraso de animación aleatorio
      particle.style.animationDelay = Math.random() * 20 + 's'
      
      // Duración de animación aleatoria
      particle.style.animationDuration = (Math.random() * 10 + 15) + 's'
      
      particlesContainer.appendChild(particle)
    }
  }

  const formatMessage = (text) => {
    // Convertir saltos de línea dobles en párrafos
    let formattedText = text.replace(/\n\n/g, '</p><p>')
    
    // Convertir saltos de línea simples en <br>
    formattedText = formattedText.replace(/\n/g, '<br>')
    
    // Convertir texto entre **doble asterisco** en negritas (prioridad alta)
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Convertir texto entre *asterisco simple* en negritas (solo si no fue procesado como doble)
    formattedText = formattedText.replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '<strong>$1</strong>')
    
    // Envolver en párrafos si no lo está ya
    if (!formattedText.startsWith('<p>')) {
      formattedText = '<p>' + formattedText + '</p>'
    }
    
    return formattedText
  }

  // Auto-ajustar altura del textarea
  const handleInputChange = (e) => {
    setMessage(e.target.value)
    updateCharCount(e)
    
    // Auto-ajustar altura
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <>
      <Head>
        <title>Asistente IA CBTIS 226</title>
        <meta name="description" content="Asistente escolar especializado para resolver dudas y explicar conceptos" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container">
        {/* Efectos futuristas fuera del chat */}
        <div className="futuristic-effects">
          <div className="floating-particles"></div>
          <div className="energy-rings">
            <div className="energy-ring"></div>
            <div className="energy-ring"></div>
            <div className="energy-ring"></div>
          </div>
          <div className="light-beams">
            <div className="light-beam"></div>
            <div className="light-beam"></div>
            <div className="light-beam"></div>
          </div>
        </div>

        <header className="header">
          <div className="header-content">
            <div className="logo">
              <i className="fas fa-robot"></i>
              <h1>Asistente IA CBTIS 226</h1>
            </div>
            <div className="header-actions">
              <button 
                className="profile-button" 
                title={currentUser ? `Sesión activa: ${currentUser}` : 'Iniciar sesión para recordar tus mensajes'}
                onClick={toggleProfileMenu}
                style={{
                  background: currentUser ? 'white' : 'linear-gradient(135deg, rgba(0, 125, 241, 0.2) 0%, rgba(0, 86, 179, 0.2) 100%)',
                  color: currentUser ? '#007DF1' : '#007DF1'
                }}
              >
                <i className={currentUser ? "fas fa-user-check" : "fas fa-user"}></i>
              </button>
            </div>
          </div>
          <p className="subtitle">Tu asistente escolar especializado para resolver dudas y explicar conceptos</p>
        </header>

        <main className="main-content">
          <div className="chat-container">
            <div className="chat-rays"></div>
            <div className="chat-messages" ref={chatMessagesRef}>
              {showSessionReminder && (
                <div className="message bot-message session-reminder">
                  <div className="message-content">
                    <p>💡 <strong>Inicia sesión para recordar tus mensajes</strong></p>
                    <p>Con tu correo electrónico podrás guardar todo tu historial de conversaciones y continuar donde lo dejaste.</p>
                  </div>
                </div>
              )}
              
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}-message`}>
                  {msg.role === 'thinking' ? (
                    <>
                      <div className="thinking-avatar">
                        <i className="fas fa-robot"></i>
                      </div>
                      <div className="thinking-content">
                        <div className="thinking-dots">
                          <div className="thinking-dot"></div>
                          <div className="thinking-dot"></div>
                          <div className="thinking-dot"></div>
                        </div>
                        <span className="thinking-text">Pensando...</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="message-avatar">
                        <i className={msg.role === 'user' ? "fas fa-user" : "fas fa-robot"}></i>
                      </div>
                      <div className="message-content">
                        {msg.content && (
                          <p 
                            dangerouslySetInnerHTML={{ 
                              __html: formatMessage(msg.content) 
                            }} 
                          />
                        )}
                        {msg.image && (
                          <img 
                            src={msg.image} 
                            alt="Imagen adjunta" 
                            className="message-image"
                            onClick={() => window.open(msg.image, '_blank')}
                          />
                        )}
                        {(!msg.content || msg.content.trim() === '') && !msg.image && (
                          <p>{msg.role === 'user' ? 'Mensaje de audio' : 'Respuesta de audio'}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="input-container">
              <div className="input-wrapper">
                <textarea
                  ref={userInputRef}
                  id="userInput"
                  placeholder="Escribe tu pregunta aquí..."
                  rows="3"
                  maxLength={MAX_CHARACTERS}
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  disabled={isLoading}
                  style={{
                    height: 'auto',
                    minHeight: '60px'
                  }}
                />
                <div className="input-buttons">
                  <button 
                    className="send-button image-button" 
                    title="Adjuntar imagen"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <i className="fas fa-image"></i>
                  </button>
                  <button 
                    className="send-button"
                    onClick={sendMessage}
                    disabled={isLoading}
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  id="imageInput" 
                  accept="image/*" 
                  style={{ display: 'none' }}
                  onChange={handleImageSelect}
                  disabled={isLoading}
                />
              </div>
              <div className="input-info">
                <span style={{ 
                  color: charCount > MAX_CHARACTERS * 0.9 ? '#dc3545' : 
                         charCount > MAX_CHARACTERS * 0.7 ? '#ffc107' : '#6c757d' 
                }}>
                  {charCount} / {MAX_CHARACTERS} caracteres
                </span>
              </div>
              {selectedImage && (
                <div className="image-preview">
                  <img src={selectedImage} alt="Vista previa" />
                  <button className="remove-image" onClick={removeSelectedImage}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        <div className={`loading-overlay ${isLoading ? 'active' : ''}`}>
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Pensando...</p>
          </div>
        </div>
      </div>
    </>
  )
}