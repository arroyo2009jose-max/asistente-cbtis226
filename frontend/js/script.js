document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const charCount = document.getElementById('charCount');
    const imageButton = document.getElementById('imageButton');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const removeImage = document.getElementById('removeImage');
    const profileButton = document.getElementById('profileButton');
    const welcomeMessage = document.getElementById('welcomeMessage');

    // Configuración
    const API_URL = 'http://localhost:3000/api/chat';
    const MAX_CHARACTERS = 1000;

    // Variables para manejo de imágenes y sesión
    let selectedImage = null;
    let currentUser = null;

    // Inicialización
    checkSession();
    userInput.focus();
    createFloatingParticles();

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', handleKeyPress);
    userInput.addEventListener('input', updateCharCount);
    imageButton.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageSelect);
    removeImage.addEventListener('click', removeSelectedImage);
    profileButton.addEventListener('click', toggleProfileMenu);

    // Función para verificar sesión
    function checkSession() {
        const userEmail = localStorage.getItem('userEmail');
        const sessionActive = localStorage.getItem('sessionActive');
        
        if (userEmail && sessionActive === 'true') {
            currentUser = userEmail;
            updateUIForLoggedInUser(userEmail);
            loadUserHistory(userEmail);
        } else {
            updateUIForLoggedOutUser();
            // Mostrar recordatorio para iniciar sesión
            showSessionReminder();
        }
    }

    // Función para mostrar recordatorio de sesión
    function showSessionReminder() {
        // Crear mensaje de recordatorio
        const reminderDiv = document.createElement('div');
        reminderDiv.className = 'message bot-message session-reminder';
        reminderDiv.innerHTML = `
            <div class="message-content">
                <p>💡 <strong>Inicia sesión para recordar tus mensajes</strong></p>
                <p>Con tu correo electrónico podrás guardar todo tu historial de conversaciones y continuar donde lo dejaste.</p>
            </div>
        `;
        
        // Agregar al chat
        chatMessages.appendChild(reminderDiv);
        
        // Eliminar después de 10 segundos
        setTimeout(() => {
            if (reminderDiv.parentNode) {
                reminderDiv.parentNode.removeChild(reminderDiv);
            }
        }, 10000);
    }

    // Función para actualizar UI para usuario logueado
    function updateUIForLoggedInUser(email) {
        profileButton.innerHTML = '<i class="fas fa-user-check"></i>';
        profileButton.title = `Sesión activa: ${email}`;
        profileButton.style.background = 'white';
        profileButton.style.color = '#007DF1';
    }

    // Función para actualizar UI para usuario no logueado
    function updateUIForLoggedOutUser() {
        profileButton.innerHTML = '<i class="fas fa-user"></i>';
        profileButton.title = 'Iniciar sesión para recordar tus mensajes';
        profileButton.style.background = 'linear-gradient(135deg, rgba(0, 125, 241, 0.2) 0%, rgba(0, 86, 179, 0.2) 100%)';
    }

    // Función para mostrar menú de perfil
    function toggleProfileMenu() {
        if (currentUser) {
            // Opciones para usuario logueado
            const options = [
                'Cerrar sesión',
                'Limpiar historial'
            ];
            
            const selectedOption = showOptionsMenu('Opciones de perfil', options);
            
            switch(selectedOption) {
                case 'Cerrar sesión':
                    logout();
                    break;
                case 'Limpiar historial':
                    clearHistory();
                    break;
            }
        } else {
            // Mostrar formulario de login
            showLoginForm();
        }
    }

    // Función para mostrar formulario de login
    function showLoginForm() {
        const email = prompt('Ingresa tu correo electrónico para iniciar sesión:');
        
        if (email && email.includes('@')) {
            login(email);
        } else if (email !== null) {
            showNotification('Por favor, ingresa un correo válido');
        }
    }

    // Función para login
    function login(email) {
        localStorage.setItem('userEmail', email);
        localStorage.setItem('sessionActive', 'true');
        currentUser = email;
        updateUIForLoggedInUser(email);
        showNotification(`Sesión iniciada para: ${email}`);
        
        // Actualizar mensaje de bienvenida
        welcomeMessage.innerHTML = `¡Hola! Soy tu asistente escolar del CBTIS 226. Estoy aquí para ayudarte con tus dudas académicas y explicarte cualquier concepto que necesites. ¿En qué puedo ayudarte hoy?`;
        
        // Cargar historial del usuario
        loadUserHistory(email);
    }

    // Función para logout
    function logout() {
        localStorage.removeItem('userEmail');
        localStorage.removeItem('sessionActive');
        currentUser = null;
        updateUIForLoggedOutUser();
        showNotification('Sesión cerrada');
        
        // Limpiar chat y mostrar mensaje original
        chatMessages.innerHTML = `
            <div class="message bot-message">
                <div class="message-content">
                    <p>¡Hola! Soy tu asistente escolar del CBTIS 226. Estoy aquí para ayudarte con tus dudas académicas y explicarte cualquier concepto que necesites. ¿En qué puedo ayudarte hoy?</p>
                </div>
            </div>
        `;
    }

    // Función para cargar historial del usuario
    function loadUserHistory(email) {
        const historyKey = `chatHistory_${email}`;
        const history = localStorage.getItem(historyKey);
        
        if (history) {
            try {
                const messages = JSON.parse(history);
                // Mostrar últimos mensajes en el chat
                messages.slice(-5).forEach(msg => {
                    addMessage(msg.content, msg.role, msg.image);
                });
            } catch (error) {
                console.error('Error al cargar historial:', error);
            }
        }
    }

    // Función para guardar mensaje en historial
    function saveMessageToHistory(message, role, image = null) {
        if (!currentUser) return;
        
        const historyKey = `chatHistory_${currentUser}`;
        const history = localStorage.getItem(historyKey);
        const messages = history ? JSON.parse(history) : [];
        
        messages.push({
            content: message,
            role: role,
            image: image,
            timestamp: new Date().toISOString()
        });
        
        // Mantener solo últimos 50 mensajes
        if (messages.length > 50) {
            messages.splice(0, messages.length - 50);
        }
        
        localStorage.setItem(historyKey, JSON.stringify(messages));
    }

    // Función para mostrar menú de opciones
    function showOptionsMenu(title, options) {
        // Crear menú simple con prompt
        const optionList = options.map((opt, index) => `${index + 1}. ${opt}`).join('\n');
        const selection = prompt(`${title}:\n\n${optionList}\n\nIngresa el número de tu opción:`);
        
        if (selection && !isNaN(selection)) {
            const index = parseInt(selection) - 1;
            if (index >= 0 && index < options.length) {
                return options[index];
            }
        }
        return null;
    }

    // Función para mostrar historial completo
    function showFullHistory() {
        if (!currentUser) return;
        
        const historyKey = `chatHistory_${currentUser}`;
        const history = localStorage.getItem(historyKey);
        
        if (history) {
            try {
                const messages = JSON.parse(history);
                let historyText = 'HISTORIAL COMPLETO:\n\n';
                messages.forEach((msg, index) => {
                    const time = new Date(msg.timestamp).toLocaleString();
                    const role = msg.role === 'user' ? 'Tú' : 'Asistente';
                    historyText += `${index + 1}. [${time}] ${role}: ${msg.content}\n`;
                });
                
                alert(historyText);
            } catch (error) {
                showNotification('Error al mostrar historial');
            }
        }
    }

    // Función para limpiar historial
    function clearHistory() {
        if (!currentUser) return;
        
        if (confirm('¿Estás seguro de que quieres limpiar todo tu historial?')) {
            const historyKey = `chatHistory_${currentUser}`;
            localStorage.removeItem(historyKey);
            showNotification('Historial limpiado');
            
            // Recargar chat
            location.reload();
        }
    }

    // Función para manejar la tecla Enter
    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    // Función para actualizar el contador de caracteres
    function updateCharCount() {
        const currentLength = userInput.value.length;
        charCount.textContent = `${currentLength} / ${MAX_CHARACTERS} caracteres`;
        
        if (currentLength > MAX_CHARACTERS * 0.9) {
            charCount.style.color = '#dc3545';
        } else if (currentLength > MAX_CHARACTERS * 0.7) {
            charCount.style.color = '#ffc107';
        } else {
            charCount.style.color = '#6c757d';
        }
    }

    // Función para manejar la selección de imágenes
    function handleImageSelect(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                selectedImage = e.target.result;
                previewImg.src = selectedImage;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            showNotification('Por favor, selecciona un archivo de imagen válido.');
        }
    }

    // Función para eliminar la imagen seleccionada
    function removeSelectedImage() {
        selectedImage = null;
        imagePreview.style.display = 'none';
        previewImg.src = '';
        imageInput.value = '';
    }

    // Función para obtener historial optimizado
    function getOptimizedHistory() {
        if (!currentUser) return [];
        
        const historyKey = `chatHistory_${currentUser}`;
        const history = localStorage.getItem(historyKey);
        const messages = history ? JSON.parse(history) : [];
        
        // Devolver últimos 6 mensajes EXCLUYENDO el último mensaje (que se acaba de enviar)
        // para evitar duplicación en el contexto
        return messages.slice(-7, -1);
    }

    // Función para enviar mensaje
    async function sendMessage() {
        const message = userInput.value.trim();
        
        if (message === '' && !selectedImage) {
            showNotification('Por favor, escribe un mensaje o adjunta una imagen antes de enviar.');
            return;
        }

        if (message.length > MAX_CHARACTERS) {
            showNotification('El mensaje excede el límite de caracteres.');
            return;
        }

        // Agregar mensaje del usuario al chat
        addMessage(message, 'user', selectedImage);
        
        // Guardar mensaje en historial
        saveMessageToHistory(message, 'user', selectedImage);
        
        // Limpiar input y deshabilitar botón
        userInput.value = '';
        updateCharCount();
        sendButton.disabled = true;
        userInput.disabled = true;
        
        // Limpiar imagen si existe
        const tempImage = selectedImage;
        removeSelectedImage();
        
        // Mostrar indicador de carga en el chat
        showThinkingMessage();

        try {
            // Obtener historial optimizado
            const conversationHistory = getOptimizedHistory();
            console.log('Enviando historial con', conversationHistory.length, 'mensajes');
            
            // Preparar datos para enviar
            const requestData = {
                message: message,
                history: conversationHistory,
                userEmail: currentUser
            };
            
            if (tempImage) {
                // Enviar la imagen como base64 directamente
                requestData.image = tempImage;
            }

            // Enviar mensaje al backend
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Debug: Mostrar la respuesta recibida del backend
            console.log('Respuesta del backend:', data.response);
            console.log('Respuesta con asteriscos:', data.response.includes('*'));

            // Agregar respuesta del bot al chat con efecto de escritura
            addTypewriterMessage(data.response, 'bot');
            
            // Guardar respuesta del bot en historial
            saveMessageToHistory(data.response, 'bot');
            
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            addMessage('Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, inténtalo de nuevo más tarde.', 'bot');
        } finally {
            // Ocultar indicador de carga y rehabilitar controles
            hideThinkingMessage();
            sendButton.disabled = false;
            userInput.disabled = false;
            userInput.focus();
        }
    }

    // Función para agregar mensaje al chat
    function addMessage(text, sender, image = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        // Agregar texto si existe
        if (text && text.trim() !== '') {
            const messageText = document.createElement('p');
            messageText.innerHTML = formatMessage(text);
            content.appendChild(messageText);
        }
        
        // Agregar imagen si existe
        if (image) {
            const img = document.createElement('img');
            img.src = image;
            img.className = 'message-image';
            img.alt = 'Imagen adjunta';
            img.onclick = () => window.open(image, '_blank');
            content.appendChild(img);
        }
        
        // Si no hay texto ni imagen, agregar un mensaje por defecto
        if ((!text || text.trim() === '') && !image) {
            const messageText = document.createElement('p');
            messageText.innerHTML = sender === 'user' ? 'Mensaje de audio' : 'Respuesta de audio';
            content.appendChild(messageText);
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll al final del chat
        scrollToBottom();
    }

    // Función para agregar mensaje con efecto de escritura (typewriter)
    function addTypewriterMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const messageText = document.createElement('p');
        content.appendChild(messageText);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll al final del chat
        scrollToBottom();
        
        // Efecto de escritura palabra por palabra
        typewriterEffect(messageText, text);
    }

    // Función para el efecto de escritura
    function typewriterEffect(element, text) {
        // Carácter por carácter en lugar de palabra por palabra para mejor manejo de formato
        let currentIndex = 0;
        let currentText = '';
        
        function addNextChar() {
            if (currentIndex < text.length) {
                currentText += text[currentIndex];
                
                // Aplicar formato en cada paso para que las negritas se muestren correctamente
                element.innerHTML = formatMessage(currentText);
                
                // Scroll al final para mantener visible el texto que se está escribiendo
                scrollToBottom();
                
                currentIndex++;
                
                // Calcular el tiempo de espera basado en el carácter actual (ultra rápido)
                let delay = 1; // Tiempo base ultra rápido para carácter por carácter
                
                // Si el carácter actual es un espacio, añadir una pequeña pausa
                if (text[currentIndex - 1] === ' ') {
                    delay = 5; // Pequeña pausa después de espacios
                }
                // Si el carácter actual termina en punto, coma u otros signos de puntuación
                else if (text[currentIndex - 1] === '.' || text[currentIndex - 1] === '!' || text[currentIndex - 1] === '?') {
                    delay = 15; // Pausa reducida después de signos de puntuación
                } else if (text[currentIndex - 1] === ',' || text[currentIndex - 1] === ';') {
                    delay = 8; // Pausa reducida después de comas
                }
                
                setTimeout(addNextChar, delay);
            }
        }
        
        addNextChar();
    }

    // Función para hacer scroll al final del chat
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Función para mostrar el indicador de carga
    function showLoading() {
        loadingOverlay.classList.add('active');
    }

    // Función para ocultar el indicador de carga
    function hideLoading() {
        loadingOverlay.classList.remove('active');
    }

    // Función para mostrar mensaje de pensando en el chat
    function showThinkingMessage() {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-message';
        thinkingDiv.id = 'thinkingMessage';
        
        const avatar = document.createElement('div');
        avatar.className = 'thinking-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        
        const content = document.createElement('div');
        content.className = 'thinking-content';
        
        const dots = document.createElement('div');
        dots.className = 'thinking-dots';
        dots.innerHTML = '<div class="thinking-dot"></div><div class="thinking-dot"></div><div class="thinking-dot"></div>';
        
        const text = document.createElement('span');
        text.className = 'thinking-text';
        text.textContent = 'Pensando...';
        
        content.appendChild(dots);
        content.appendChild(text);
        
        thinkingDiv.appendChild(avatar);
        thinkingDiv.appendChild(content);
        
        chatMessages.appendChild(thinkingDiv);
        
        // Scroll al final del chat
        scrollToBottom();
    }

    // Función para ocultar mensaje de pensando
    function hideThinkingMessage() {
        const thinkingMessage = document.getElementById('thinkingMessage');
        if (thinkingMessage) {
            thinkingMessage.remove();
        }
    }

    // Función para mostrar notificaciones
    function showNotification(message) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
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
        `;
        notification.textContent = message;
        
        // Agregar animación CSS
        const style = document.createElement('style');
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
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Eliminar notificación después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }


    // Auto-ajustar altura del textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // Función para crear partículas flotantes dinámicamente
    function createFloatingParticles() {
        const particlesContainer = document.querySelector('.floating-particles');
        if (!particlesContainer) return;
        
        // Crear 15 partículas adicionales
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Posición aleatoria
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            
            // Tamaño aleatorio
            const size = Math.random() * 3 + 1;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            
            // Retraso de animación aleatorio
            particle.style.animationDelay = Math.random() * 20 + 's';
            
            // Duración de animación aleatoria
            particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
            
            particlesContainer.appendChild(particle);
        }
    }

    // Función para formatear el mensaje con negritas y saltos de línea
    function formatMessage(text) {
        console.log('Texto original:', text);
        console.log('¿Contiene asteriscos?', text.includes('*'));
        
        // Convertir saltos de línea dobles en párrafos
        let formattedText = text.replace(/\n\n/g, '</p><p>');
        
        // Convertir saltos de línea simples en <br>
        formattedText = formattedText.replace(/\n/g, '<br>');
        
        // Convertir texto entre **doble asterisco** en negritas (prioridad alta)
        const beforeDoubleBold = formattedText;
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        console.log('¿Hubo cambio en negritas dobles?', beforeDoubleBold !== formattedText);
        
        // Convertir texto entre *asterisco simple* en negritas (solo si no fue procesado como doble)
        const beforeBold = formattedText;
        formattedText = formattedText.replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '<strong>$1</strong>');
        console.log('¿Hubo cambio en negritas simples?', beforeBold !== formattedText);
        
        // Envolver en párrafos si no lo está ya
        if (!formattedText.startsWith('<p>')) {
            formattedText = '<p>' + formattedText + '</p>';
        }
        
        console.log('Texto formateado:', formattedText);
        return formattedText;
    }
});