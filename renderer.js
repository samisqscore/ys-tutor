document.addEventListener('DOMContentLoaded', () => {
    const modelSelect = document.getElementById('model-select');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const topicButtons = document.querySelectorAll('.topic-btn');
    const quizButton = document.getElementById('quiz-btn');

    const currentState = {
        selectedSubject: 'chemistry',
        contextId: null
    };

    // Load available models on startup
    loadModels();

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    tabButtons.forEach(button => {
        button.addEventListener('click', changeSubject);
    });

    topicButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const topic = event.currentTarget.dataset.topic;
            messageInput.value = `Explain the topic: ${topic}`;
            sendMessage();
        });
    });

    async function loadModels() {
        try {
            const models = await window.electronAPI.getAvailableModels();
            if (models && models.length > 0) {
                // Filter to only show Gemma models
                const gemmaModels = models.filter(model => 
                    model.name.toLowerCase().includes('gemma')
                );
                
                if (gemmaModels.length > 0) {
                    modelSelect.innerHTML = gemmaModels.map(model => 
                        `<option value="${model.name}">${model.name}</option>`
                    ).join('');
                } else {
                    modelSelect.innerHTML = '<option value="">No Gemma models available</option>';
                }
            } else {
                modelSelect.innerHTML = '<option value="">No models available</option>';
            }
        } catch (error) {
            console.error('Error loading models:', error);
            modelSelect.innerHTML = '<option value="">Error loading models</option>';
        }
    }

    // Quiz button event listener
    quizButton.addEventListener('click', () => {
        messageInput.value = `Start a quiz on ${currentState.selectedSubject}`;
        sendMessage();
    });

    async function sendMessage() {
        if (!messageInput.value.trim()) return;

        const userInput = messageInput.value.trim();
        addMessage(userInput, 'user');
        toggleLoading(true);

        // If this is a new question, generate a new contextId
        if (!currentState.contextId) {
            currentState.contextId = Date.now().toString();
        }

        const model = modelSelect.value;
        const response = await window.electronAPI.sendMessage({
            model,
            message: userInput,
            subject: currentState.selectedSubject,
            contextId: currentState.contextId
        });

        toggleLoading(false);

        if (response && response.success) {
            addMessage(response.response, 'ai');
            messageInput.value = '';
        } else if (response.error === 'inappropriate_content') {
            addMessage(response.message, 'ai');
            currentState.contextId = null; // Reset context
            messageInput.value = '';
        } else {
            addMessage(`Error: ${response.error}`, 'error');
            currentState.contextId = null; // Reset context
        }
    }

    function addMessage(message, author) {
        const msgElement = document.createElement('div');
        msgElement.classList.add('message', `${author}-message`);

        if (author !== 'error') {
            const header = document.createElement('div');
            header.classList.add('message-header');

            const authorElement = document.createElement('span');
            authorElement.classList.add('message-author');
            authorElement.textContent = author === 'user' ? 'You' : 'Tutor';

            header.appendChild(authorElement);
            msgElement.appendChild(header);

            const textElement = document.createElement('p');
            textElement.innerHTML = message.replace(/\n/g, '<br />');
            msgElement.appendChild(textElement);
        } else {
            msgElement.textContent = message;
        }

        chatMessages.appendChild(msgElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }


    function toggleLoading(show) {
        loadingOverlay.classList.toggle('hidden', !show);
    }

    function changeSubject(event) {
        tabButtons.forEach(button => button.classList.remove('active'));
        event.currentTarget.classList.add('active');

        currentState.selectedSubject = event.currentTarget.dataset.subject;
        currentState.contextId = null; // Reset context on subject change

        document.querySelectorAll('.topic-buttons').forEach(div => div.classList.add('hidden'));
        document.getElementById(`${currentState.selectedSubject}-topics`).classList.remove('hidden');
    }
});
