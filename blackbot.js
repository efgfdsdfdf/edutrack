// blackbot.js - Student Companion AI Chat Interface

// Initialize markdown parser
const md = window.markdownit({
    html: false,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(str, { language: lang }).value;
            } catch (err) {
                console.error('Highlight error:', err);
            }
        }
        return '';
    }
});

// DOM Elements
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const newChatBtn = document.getElementById('newChatBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const attachBtn = document.getElementById('attachBtn');
const attachmentMenu = document.getElementById('attachmentMenu');
const chatMessages = document.getElementById('chatMessages');
const chatList = document.getElementById('chatList');
const currentChatTitle = document.getElementById('currentChatTitle').querySelector('span');
const voiceFeedback = document.getElementById('voiceFeedback');
const voiceText = document.getElementById('voiceText');

// State
let currentChatId = null;
let chats = [];
let currentMessages = [];
let isTyping = false;
let isThinking = false;
let pendingAttachments = [];
let selectedNotes = [];
let cameraStream = null;
let facingMode = 'user';
let fileProcessingMode = 'separate';
let awaitingFileDecision = false;

// Voice Recognition
let isListening = false;
let recognition = null;
let silenceTimer = null;
let finalTranscript = '';

// Scroll tracking
let userScrolledUp = false;
let scrollToBottomBtn = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('Initializing Student Companion AI...');
    
    try { chats = JSON.parse(localStorage.getItem('studentAI_chats') || '[]'); } 
    catch (e) { chats = []; }

    currentChatId = localStorage.getItem('currentChatId') || `chat_${Date.now()}`;
    localStorage.setItem('currentChatId', currentChatId);
    
    try { currentMessages = JSON.parse(localStorage.getItem(`chat_${currentChatId}`) || '[]'); } 
    catch (e) { currentMessages = []; }

    loadChats();
    renderMessages();
    setupEventListeners();
    initVoiceRecognition();
    setupScrollTracking();

    if (currentMessages.length === 0) await showWelcomeMessage();
    scrollToBottom();
}

// Event listeners setup
function setupEventListeners() {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
    });
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth < 769) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }
        });
    });
    newChatBtn.addEventListener('click', createNewChat);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    messageInput.addEventListener('input', autoResizeTextarea);
    attachBtn.addEventListener('click', toggleAttachmentMenu);
    document.addEventListener('click', (e) => {
        if (!attachBtn.contains(e.target) && !attachmentMenu.contains(e.target)) {
            attachmentMenu.classList.remove('show');
        }
    });
    document.querySelectorAll('.attachment-option').forEach(btn => {
        btn.addEventListener('click', handleAttachmentOption);
    });
    document.querySelectorAll('.modal-close, .camera-btn[data-modal]').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
            stopCamera();
        });
    });
    document.getElementById('switchCamera')?.addEventListener('click', switchCamera);
    document.getElementById('capturePhoto')?.addEventListener('click', capturePhoto);
    document.getElementById('usePhoto')?.addEventListener('click', usePhoto);
    document.getElementById('uploadFile')?.addEventListener('click', uploadFile);
    document.getElementById('askNotes')?.addEventListener('click', askAboutNotes);
    document.getElementById('photoInput')?.addEventListener('change', handlePhotoSelect);
    document.getElementById('fileInput')?.addEventListener('change', handleFileSelect);
    micBtn.addEventListener('click', toggleVoiceRecognition);
    messageInput.focus();
}

function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
}
function toggleAttachmentMenu(e) { e.stopPropagation(); attachmentMenu.classList.toggle('show'); }
function handleAttachmentOption(e) { openAttachmentModal(e.target.closest('.attachment-option').dataset.type); attachmentMenu.classList.remove('show'); }
function closeModal(e) { const modalId = e.target.closest('.modal-close')?.dataset.modal || e.target.closest('.camera-btn[data-modal]')?.dataset.modal; if(modalId) document.getElementById(`${modalId}Modal`).classList.remove('active'); stopCamera(); }
function stopCamera() { if(cameraStream){ cameraStream.getTracks().forEach(track=>track.stop()); cameraStream=null;} }

// ==============================
// AI API CALL (via Vercel function)
// ==============================
async function getAIResponse(message, attachments = []) {
    const hasMultipleFiles = attachments.filter(a => a.type === 'file' || a.type === 'photo').length > 1;
    const systemPrompt = `You are an intelligent AI study assistant for students.
Please format code and content properly.`;

    let context = '';
    if(attachments.length>0){
        context='\n\n**Attachments:**\n';
        attachments.forEach((att,index)=>{
            if(att.type==='note') context+=`📝 **Note ${index+1}: ${att.title}**\n${att.content}\n\n`;
            else if(att.type==='file') context+=`📎 **File ${index+1}: ${att.name}**\n${att.description||''}\n\n`;
            else if(att.type==='photo') context+=`📷 **Photo ${index+1}: ${att.name}**\n${att.description||''}\n\n`;
        });
    }

    const messages = [
        { role: 'system', content: systemPrompt },
        ...currentMessages.slice(-10).filter(msg => msg.role==='user'||msg.role==='ai').map(msg=>({ role: msg.role==='user'?'user':'assistant', content: msg.content })),
        { role: 'user', content: message+context }
    ];

    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });

        if(!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch(error){
        console.error('API call failed:', error);
        return `I understand your question: "${message.substring(0,50)}...". Could you provide more details?`;
    }
}

// ==============================
// Rest of your blackbot.js code
// ==============================
// Keep all your existing functions: sendMessage, createNewChat, renderMessage, voice recognition, scroll tracking, notes, typing, attachments, etc.

// Anywhere you previously used API_KEY, just call getAIResponse() as above.
// Do NOT include the API key in this file.



// VOICE RECOGNITION FUNCTIONS
function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.log('Speech recognition not supported');
        micBtn.style.display = 'none';
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
        console.log('Voice recognition started');
        isListening = true;
        micBtn.classList.add('active');
        voiceFeedback.style.display = 'flex';
        voiceText.textContent = 'Listening... Speak now';
        finalTranscript = '';
        messageInput.value = '';
        
        // Auto-start typing
        messageInput.focus();
    };
    
    recognition.onresult = (event) => {
        clearTimeout(silenceTimer);
        
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Update input field in real-time
        const displayText = finalTranscript + interimTranscript;
        messageInput.value = displayText;
        autoResizeTextarea();
        
        // Update feedback with what's being said
        if (interimTranscript) {
            voiceText.textContent = `"${interimTranscript}"`;
        } else if (finalTranscript) {
            voiceText.textContent = `"${finalTranscript.trim()}"`;
        }
        
        // Set timer to stop after 2 seconds of silence
        silenceTimer = setTimeout(() => {
            if (isListening && finalTranscript.trim()) {
                stopVoiceRecognition();
                // Auto-send after short delay
                setTimeout(() => {
                    sendMessage();
                }, 500);
            }
        }, 2000);
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
            showToast('Microphone access denied. Please enable microphone permissions.');
        } else if (event.error === 'no-speech') {
            showToast('No speech detected. Please try again.');
        }
        
        stopVoiceRecognition();
    };
    
    recognition.onend = () => {
        console.log('Voice recognition ended');
        
        // If we're still supposed to be listening (wasn't manually stopped), restart
        if (isListening) {
            try {
                recognition.start();
            } catch (e) {
                console.error('Failed to restart recognition:', e);
                stopVoiceRecognition();
            }
        }
    };
}

function toggleVoiceRecognition() {
    if (isListening) {
        stopVoiceRecognition();
    } else {
        startVoiceRecognition();
    }
}

function startVoiceRecognition() {
    if (!recognition) {
        showToast('Voice recognition not supported in your browser');
        return;
    }
    
    try {
        recognition.start();
        showToast('Voice recognition started. Speak now!');
    } catch (e) {
        console.error('Failed to start recognition:', e);
        showToast('Failed to start voice recognition');
    }
}

function stopVoiceRecognition() {
    isListening = false;
    clearTimeout(silenceTimer);
    
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            console.error('Error stopping recognition:', e);
        }
    }
    
    micBtn.classList.remove('active');
    voiceFeedback.style.display = 'none';
    
    if (finalTranscript.trim()) {
        showToast('Voice message ready. Press Enter or click Send.');
    }
}

// SCROLL TRACKING FUNCTIONS
function setupScrollTracking() {
    // Create scroll to bottom button
    scrollToBottomBtn = document.createElement('button');
    scrollToBottomBtn.id = 'scrollToBottomBtn';
    scrollToBottomBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
    scrollToBottomBtn.title = 'Scroll to bottom';
    scrollToBottomBtn.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 30px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #3a7bd5;
        color: white;
        border: none;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s;
        opacity: 0;
        transform: translateY(10px);
    `;
    
    scrollToBottomBtn.addEventListener('mouseenter', () => {
        scrollToBottomBtn.style.transform = 'scale(1.1) translateY(0)';
        scrollToBottomBtn.style.background = '#2d68c4';
    });
    
    scrollToBottomBtn.addEventListener('mouseleave', () => {
        scrollToBottomBtn.style.transform = 'scale(1) translateY(0)';
        scrollToBottomBtn.style.background = '#3a7bd5';
    });
    
    scrollToBottomBtn.addEventListener('click', () => {
        scrollToBottom(true);
        hideScrollButton();
    });
    
    document.body.appendChild(scrollToBottomBtn);
    
    // Track user scroll
    chatMessages.addEventListener('scroll', () => {
        const isNearBottom = isUserNearBottom();
        
        if (!isNearBottom) {
            userScrolledUp = true;
            showScrollButton();
        } else {
            userScrolledUp = false;
            hideScrollButton();
        }
    });
    
    // Auto-hide scroll button when near bottom
    setInterval(() => {
        if (isUserNearBottom() && scrollToBottomBtn.style.display !== 'none') {
            hideScrollButton();
        }
    }, 500);
}

function isUserNearBottom() {
    const threshold = 100; // pixels from bottom
    const distanceFromBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
    return distanceFromBottom <= threshold;
}

function showScrollButton() {
    scrollToBottomBtn.style.display = 'flex';
    setTimeout(() => {
        scrollToBottomBtn.style.opacity = '1';
        scrollToBottomBtn.style.transform = 'translateY(0)';
    }, 10);
}

function hideScrollButton() {
    scrollToBottomBtn.style.opacity = '0';
    scrollToBottomBtn.style.transform = 'translateY(10px)';
    setTimeout(() => {
        scrollToBottomBtn.style.display = 'none';
    }, 300);
}

// Scroll to bottom function - only scrolls if user is near bottom
function scrollToBottom(force = false) {
    if (force || !userScrolledUp || isUserNearBottom()) {
        setTimeout(() => {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }
}

// Chat Management
function loadChats() {
    chatList.innerHTML = '';
    
    if (chats.length === 0) {
        chatList.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7299;">No chats yet</div>';
        return;
    }
    
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px; padding-right: 40px;">${escapeHtml(chat.title)}</div>
            <div style="font-size: 0.8rem; color: #6b7299;">
                ${new Date(chat.timestamp).toLocaleDateString()}
            </div>
            <button class="delete-btn" data-id="${chat.id}" title="Delete chat">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        div.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-btn')) {
                loadChat(chat.id);
            }
        });
        
        div.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });
        
        chatList.appendChild(div);
    });
}

async function createNewChat() {
    // Save current chat if it has messages
    if (currentMessages.length > 0) {
        saveCurrentChat();
    }
    
    // Create new chat
    currentChatId = `chat_${Date.now()}`;
    localStorage.setItem('currentChatId', currentChatId);
    currentMessages = [];
    currentChatTitle.textContent = 'New Chat';
    
    // Clear messages and show welcome
    chatMessages.innerHTML = '';
    await showWelcomeMessage();
    
    // Close sidebar on mobile
    if (window.innerWidth < 769) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
    
    showToast('New chat created');
}

function saveCurrentChat() {
    if (currentMessages.length === 0) return;
    
    let title = currentChatTitle.textContent;
    
    if (title === 'New Chat' || title === 'Loading...') {
        const firstUserMsg = currentMessages.find(m => m.role === 'user');
        title = firstUserMsg ? 
            firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '') : 
            'Study Session';
        currentChatTitle.textContent = title;
    }
    
    const chat = {
        id: currentChatId,
        title: title,
        timestamp: new Date().toISOString(),
        messageCount: currentMessages.length
    };
    
    // Remove existing and add to beginning
    chats = chats.filter(c => c.id !== currentChatId);
    chats.unshift(chat);
    chats = chats.slice(0, 20);
    
    localStorage.setItem('studentAI_chats', JSON.stringify(chats));
    localStorage.setItem(`chat_${currentChatId}`, JSON.stringify(currentMessages));
    
    loadChats();
}

async function loadChat(chatId) {
    currentChatId = chatId;
    localStorage.setItem('currentChatId', chatId);
    
    try {
        currentMessages = JSON.parse(localStorage.getItem(`chat_${chatId}`) || '[]');
    } catch (e) {
        currentMessages = [];
    }
    
    // Update title
    const chat = chats.find(c => c.id === chatId);
    currentChatTitle.textContent = chat ? chat.title : 'Chat';
    
    // Render messages
    chatMessages.innerHTML = '';
    currentMessages.forEach((msg, index) => {
        renderMessage(msg, index);
    });
    
    // Close sidebar on mobile
    if (window.innerWidth < 769) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
    
    showToast('Chat loaded');
    scrollToBottom();
}

function deleteChat(chatId) {
    if (!confirm('Delete this chat? This cannot be undone.')) return;
    
    chats = chats.filter(chat => chat.id !== chatId);
    localStorage.setItem('studentAI_chats', JSON.stringify(chats));
    localStorage.removeItem(`chat_${chatId}`);
    
    if (chatId === currentChatId) {
        createNewChat();
    }
    
    loadChats();
    showToast('Chat deleted');
}

// Message Handling
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message && pendingAttachments.length === 0) return;
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Add user message
    const userMessage = {
        role: 'user',
        content: message,
        attachments: [...pendingAttachments],
        timestamp: new Date().toISOString(),
        editable: true,
        failed: false
    };
    
    currentMessages.push(userMessage);
    const messageIndex = currentMessages.length - 1;
    
    // Render message
    renderMessage(userMessage, messageIndex);
    
    // Save chat
    saveCurrentChat();
    
    // Clear pending attachments
    pendingAttachments = [];
    
    // Show thinking
    showThinking();
    
    // Check if we need to ask about file separation
    const hasMultipleFiles = userMessage.attachments.filter(a => 
        a.type === 'file' || a.type === 'photo').length > 1;
    
    if (hasMultipleFiles && !awaitingFileDecision) {
        // Ask about file separation
        showFileSeparationDialog(messageIndex);
        awaitingFileDecision = true;
    } else {
        // Send directly
        processMessage(message, userMessage.attachments, messageIndex);
    }
}

function showFileSeparationDialog(messageIndex) {
    hideThinking();
    
    const dialogHTML = `
        <div class="file-dialog">
            <div class="file-dialog-title">
                <i class="fas fa-code"></i>
                How should I handle these files?
            </div>
            <p style="margin-bottom: 16px; color: #a0a8d6;">I noticed you have multiple files. Would you like me to:</p>
            <div class="file-dialog-options">
                <button class="file-option-btn" data-action="separate">
                    <i class="fas fa-file-code"></i>
                    Create separate files
                </button>
                <button class="file-option-btn" data-action="join">
                    <i class="fas fa-file-alt"></i>
                    Combine into one file
                </button>
            </div>
            <div style="font-size: 0.85rem; color: #6b7299; margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; border-left: 3px solid #3a7bd5;">
                <i class="fas fa-info-circle"></i>
                Separate files will create multiple code blocks. Combined files will create one code block.
            </div>
        </div>
    `;
    
    // Add dialog as AI message
    const dialogMessage = {
        role: 'ai',
        content: dialogHTML,
        timestamp: new Date().toISOString(),
        isDialog: true
    };
    
    currentMessages.push(dialogMessage);
    renderMessage(dialogMessage, currentMessages.length - 1);
    
    // Add event listeners to buttons
    setTimeout(() => {
        document.querySelectorAll('.file-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.closest('.file-option-btn').dataset.action;
                handleFileDecision(action, messageIndex);
            });
        });
    }, 100);
}

function handleFileDecision(action, messageIndex) {
    fileProcessingMode = action;
    awaitingFileDecision = false;
    
    // Remove dialog
    const dialog = document.querySelector('.file-dialog');
    if (dialog) {
        dialog.parentElement.remove();
    }
    
    // Show thinking and process message
    showThinking();
    const originalMessage = currentMessages[messageIndex];
    processMessage(originalMessage.content, originalMessage.attachments, messageIndex);
}

async function processMessage(message, attachments, messageIndex) {
    try {
        const aiResponse = await getAIResponse(message, attachments);
        hideThinking();
        
        // Add AI response
        await typeAIResponse(aiResponse);
        
        // Save chat
        saveCurrentChat();
        
    } catch (error) {
        console.error('Error processing message:', error);
        hideThinking();
        
        // Mark message as failed
        currentMessages[messageIndex].failed = true;
        
        // Update message UI with retry button at bottom left
        updateMessageWithRetry(messageIndex);
        
        // Save chat
        saveCurrentChat();
        
        showToast('Failed to send. Click the red retry button.');
    }
}

async function getAIResponse(message, attachments = []) {
    const hasMultipleFiles = attachments.filter(a => 
        a.type === 'file' || a.type === 'photo').length > 1;
    
    const systemPrompt = `You are an intelligent AI study assistant for students.
    
CRITICAL INSTRUCTIONS FOR CODE GENERATION:
1. When creating forms or web pages, you MUST provide COMPLETE HTML, CSS, and JavaScript code
2. NEVER skip the HTML part - always include the full HTML file
3. Format code with proper file structure:
   - First: Complete HTML code in a code block with \`\`\`html
   - Second: CSS code in a separate code block with \`\`\`css
   - Third: JavaScript code in a separate code block with \`\`\`javascript
4. Each code block must have a proper filename comment at the top
5. Keep all code blocks visible - do not remove any part after showing it

${hasMultipleFiles && fileProcessingMode === 'separate' ? 
'**IMPORTANT: The user wants SEPARATE files. When providing code, create separate code blocks for each file with clear filenames.**' : 
''}

**Example format for form creation:**
\`\`\`html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Form Example</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Form HTML here -->
</body>
</html>
\`\`\`

\`\`\`css
/* styles.css */
/* CSS code here */
\`\`\`

\`\`\`javascript
/* script.js */
// JavaScript code here
\`\`\`

**Format your responses properly:**
1. Use headings for sections
2. Use bullet points for lists
3. Use **bold** for important terms
4. For code, use triple backticks with language specification
5. Explain complex concepts clearly

**For code blocks:**
- Always specify the language (html, css, javascript, python, etc.)
- Include comments in the code
- Explain what the code does`;

    let context = '';
    if (attachments.length > 0) {
        context = '\n\n**Attachments:**\n';
        attachments.forEach((att, index) => {
            if (att.type === 'note') {
                context += `📝 **Note ${index + 1}: ${att.title}**\n${att.content}\n\n`;
            } else if (att.type === 'file') {
                context += `📎 **File ${index + 1}: ${att.name}**\n`;
                if (att.description) {
                    context += `Description: ${att.description}\n`;
                }
            } else if (att.type === 'photo') {
                context += `📷 **Photo ${index + 1}: ${att.name}**\n`;
                if (att.description) {
                    context += `Description: ${att.description}\n`;
                }
            }
        });
    }

    const messages = [
        { role: 'system', content: systemPrompt },
        ...currentMessages.slice(-10)
            .filter(msg => msg.role === 'user' || msg.role === 'ai')
            .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
        { role: 'user', content: message + context }
    ];

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Student Companion AI'
            },
            body: JSON.stringify({
                model: 'openai/gpt-3.5-turbo',
                messages: messages,
                max_tokens: 2500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('API call failed:', error);
        // Fallback response
        return `I understand your question: "${message.substring(0, 50)}...". As your Student Companion AI, I can help with study tips, code examples, and academic guidance. Could you provide more details about what you need help with?`;
    }
}

function updateMessageWithRetry(messageIndex) {
    const messageDiv = chatMessages.querySelector(`[data-index="${messageIndex}"]`);
    if (!messageDiv) return;
    
    // Remove existing retry button
    const existingRetry = messageDiv.querySelector('.retry-btn-outside');
    if (existingRetry) existingRetry.remove();
    
    // Add new retry button at bottom left
    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn-outside';
    retryBtn.title = 'Retry sending this message';
    retryBtn.innerHTML = '<i class="fas fa-redo"></i>';
    retryBtn.onclick = () => retryMessage(messageIndex);
    messageDiv.appendChild(retryBtn);
}

function retryMessage(messageIndex) {
    const message = currentMessages[messageIndex];
    if (!message) return;
    
    // Remove failed state and retry button
    message.failed = false;
    const messageDiv = chatMessages.querySelector(`[data-index="${messageIndex}"]`);
    if (messageDiv) {
        const retryBtn = messageDiv.querySelector('.retry-btn-outside');
        if (retryBtn) retryBtn.remove();
    }
    
    // Show thinking
    showThinking();
    
    // Process message again
    processMessage(message.content, message.attachments, messageIndex);
}

// TYPING FUNCTIONS - IMPROVED FOR SCROLLING
async function typeAIResponse(text) {
    if (isTyping) return;
    isTyping = true;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    messageDiv.innerHTML = '<div class="ai-content"></div>';
    chatMessages.appendChild(messageDiv);
    
    const contentDiv = messageDiv.querySelector('.ai-content');
    const formattedText = md.render(text);
    
    // Show initial message container
    scrollToBottom();
    
    // Type the text WITHOUT interrupting user scrolling
    await typeText(contentDiv, formattedText);
    
    // Process code blocks AFTER typing is complete
    processCodeBlocks(messageDiv);
    
    // Save AI message
    currentMessages.push({
        role: 'ai',
        content: text,
        timestamp: new Date().toISOString()
    });
    
    saveCurrentChat();
    isTyping = false;
    
    // Only scroll if user is near bottom
    if (isUserNearBottom()) {
        scrollToBottom();
    }
}

// Improved typing function that respects user scrolling
async function typeText(element, html) {
    return new Promise(resolve => {
        let i = 0;
        const text = html.replace(/<[^>]*>/g, '');
        const originalHTML = html;
        
        // Store the current scroll position
        let lastScrollCheck = Date.now();
        
        function typeChar() {
            if (i < text.length) {
                const typedSoFar = originalHTML.substring(0, originalHTML.indexOf(text) + i + 1);
                element.innerHTML = typedSoFar + '<span class="typing-cursor"></span>';
                i++;
                
                // Only check scrolling every 5 characters to improve performance
                if (i % 5 === 0) {
                    const now = Date.now();
                    if (now - lastScrollCheck > 100) { // Check every 100ms at most
                        // Only auto-scroll if user is near bottom
                        if (isUserNearBottom()) {
                            // Smooth scroll to keep up with typing
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                        lastScrollCheck = now;
                    }
                }
                
                // Variable speed for more natural typing
                const speed = Math.random() * 15 + 5;
                setTimeout(typeChar, speed);
            } else {
                element.innerHTML = originalHTML;
                resolve();
            }
        }
        
        typeChar();
    });
}

function showThinking() {
    if (isThinking) return;
    isThinking = true;
    
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking';
    thinkingDiv.id = 'thinking';
    thinkingDiv.innerHTML = `
        <div class="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <span>Thinking...</span>
    `;
    chatMessages.appendChild(thinkingDiv);
    
    // Only scroll if user is near bottom
    if (isUserNearBottom()) {
        scrollToBottom();
    }
}

function hideThinking() {
    isThinking = false;
    const element = document.getElementById('thinking');
    if (element) element.remove();
}

async function showWelcomeMessage() {
    const welcomeText = `👋 **Hello! I'm your Student Companion AI.**\n\n**I can help you with:**\n• 📚 Homework and assignments\n• 🧠 Study techniques\n• 📝 Note organization\n• 📊 Exam preparation\n• ⏰ Time management\n• 💻 Code and programming help\n\n**How can I assist you today?**`;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    messageDiv.innerHTML = '<div class="ai-content"></div>';
    chatMessages.appendChild(messageDiv);
    
    const contentDiv = messageDiv.querySelector('.ai-content');
    const formattedText = md.render(welcomeText);
    
    await typeText(contentDiv, formattedText);
    
    currentMessages.push({
        role: 'ai',
        content: welcomeText,
        timestamp: new Date().toISOString()
    });
    
    saveCurrentChat();
}

// Message Rendering
function renderMessage(msg, index) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.role === 'user' ? 'user-message' : 'ai-message'}`;
    messageDiv.dataset.index = index;
    
    if (msg.role === 'user') {
        messageDiv.innerHTML = `
            <div class="message-content">
                ${msg.content ? `<p>${escapeHtml(msg.content)}</p>` : ''}
                ${renderAttachments(msg.attachments)}
            </div>
            <div class="message-actions">
                <button class="message-action-btn copy-message" title="Copy message">
                    <i class="far fa-copy"></i>
                </button>
                <button class="message-action-btn edit-message" title="Edit message">
                    <i class="far fa-edit"></i>
                </button>
            </div>
            <div class="message-editing">
                <textarea class="edit-textarea" placeholder="Edit your message...">${escapeHtml(msg.content || '')}</textarea>
                <div class="edit-actions">
                    <button class="edit-btn edit-cancel">Cancel</button>
                    <button class="edit-btn edit-save">Save</button>
                </div>
            </div>
        `;
        
        // Add retry button if message failed (at bottom left)
        if (msg.failed) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'retry-btn-outside';
            retryBtn.title = 'Retry sending this message';
            retryBtn.innerHTML = '<i class="fas fa-redo"></i>';
            retryBtn.onclick = () => retryMessage(index);
            messageDiv.appendChild(retryBtn);
        }
        
        // Add event listeners
        const copyBtn = messageDiv.querySelector('.copy-message');
        const editBtn = messageDiv.querySelector('.edit-message');
        const cancelBtn = messageDiv.querySelector('.edit-cancel');
        const saveBtn = messageDiv.querySelector('.edit-save');
        const textarea = messageDiv.querySelector('.edit-textarea');
        
        copyBtn.addEventListener('click', () => copyMessage(msg));
        editBtn.addEventListener('click', () => startEditing(index, messageDiv));
        cancelBtn.addEventListener('click', () => cancelEditing(messageDiv));
        saveBtn.addEventListener('click', () => saveEditedMessage(index, messageDiv, textarea));
        
    } else if (msg.role === 'ai') {
        if (msg.isDialog) {
            messageDiv.innerHTML = msg.content;
        } else {
            messageDiv.innerHTML = `<div class="ai-content">${md.render(msg.content)}</div>`;
            
            // Process code blocks after rendering
            setTimeout(() => {
                processCodeBlocks(messageDiv);
            }, 100);
        }
    }
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function renderAttachments(attachments = []) {
    if (!attachments || attachments.length === 0) return '';
    
    let html = '';
    attachments.forEach(att => {
        if (att.type === 'photo') {
            html += `
                <div style="margin-top: 12px; border-left: 3px solid #ff6b6b; padding-left: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <i class="fas fa-image" style="color: #ff6b6b;"></i>
                        <strong>${escapeHtml(att.name)}</strong>
                    </div>
                    ${att.preview ? `<img src="${att.preview}" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin: 8px 0;">` : ''}
                    ${att.description ? `<p style="font-size: 0.9rem; color: rgba(255,255,255,0.8);">${escapeHtml(att.description)}</p>` : ''}
                </div>
            `;
        } else if (att.type === 'file') {
            html += `
                <div style="margin-top: 12px; border-left: 3px solid #3a7bd5; padding-left: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-file" style="color: #3a7bd5;"></i>
                        <strong>${escapeHtml(att.name)}</strong>
                    </div>
                    ${att.description ? `<p style="font-size: 0.9rem; color: rgba(255,255,255,0.8); margin-top: 4px;">${escapeHtml(att.description)}</p>` : ''}
                </div>
            `;
        } else if (att.type === 'note') {
            html += `
                <div style="margin-top: 12px; border-left: 3px solid #2ecc71; padding-left: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-sticky-note" style="color: #2ecc71;"></i>
                        <strong>${escapeHtml(att.title)}</strong>
                    </div>
                    <p style="font-size: 0.9rem; color: rgba(255,255,255,0.8); margin-top: 4px;">
                        ${escapeHtml(att.content.substring(0, 100))}${att.content.length > 100 ? '...' : ''}
                    </p>
                </div>
            `;
        }
    });
    return html;
}

function processCodeBlocks(container) {
    container.querySelectorAll('pre').forEach(pre => {
        if (pre.closest('.code-block-wrapper')) return;
        
        const code = pre.querySelector('code');
        if (code) {
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';
            
            const language = code.className.replace('language-', '') || 
                            code.className.replace('lang-', '') || 
                            'text';
            
            const header = document.createElement('div');
            header.className = 'code-header';
            
            const languageSpan = document.createElement('span');
            languageSpan.className = 'code-language';
            languageSpan.innerHTML = `<i class="fas fa-code"></i> ${language.toUpperCase()}`;
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy-btn';
            copyBtn.innerHTML = '<i class="far fa-copy"></i> Copy';
            copyBtn.title = 'Copy code to clipboard';
            copyBtn.onclick = () => copyCode(code, copyBtn);
            
            const codeBlock = document.createElement('div');
            codeBlock.className = 'code-block';
            codeBlock.appendChild(pre);
            
            header.appendChild(languageSpan);
            header.appendChild(copyBtn);
            wrapper.appendChild(header);
            wrapper.appendChild(codeBlock);
            
            pre.parentNode.replaceChild(wrapper, pre);
            
            // Highlight code
            hljs.highlightElement(code);
        }
    });
}

function copyCode(codeElement, button) {
    const text = codeElement.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.classList.add('copied');
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('copied');
        }, 2000);
        showToast('Code copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy code');
    });
}

function copyMessage(msg) {
    let text = msg.content || '';
    if (msg.attachments) {
        msg.attachments.forEach(att => {
            text += `\n\nAttachment: ${att.name || att.title}`;
            if (att.description) text += `\nDescription: ${att.description}`;
        });
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Message copied to clipboard');
    });
}

// Message Editing
function startEditing(index, messageDiv) {
    // Check if there's an AI response after this
    const nextMessage = currentMessages[index + 1];
    if (nextMessage && nextMessage.role === 'ai') {
        if (!confirm('Editing this message will remove the AI response. Continue?')) {
            return;
        }
        // Remove AI response
        currentMessages.splice(index + 1, 1);
        const aiMessageDiv = chatMessages.querySelector(`[data-index="${index + 1}"]`);
        if (aiMessageDiv) aiMessageDiv.remove();
        updateMessageIndices();
    }
    
    messageDiv.classList.add('editing');
    const textarea = messageDiv.querySelector('.edit-textarea');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function cancelEditing(messageDiv) {
    messageDiv.classList.remove('editing');
}

function saveEditedMessage(index, messageDiv, textarea) {
    const newText = textarea.value.trim();
    if (!newText && (!currentMessages[index].attachments || currentMessages[index].attachments.length === 0)) {
        showToast('Message cannot be empty');
        return;
    }
    
    // Update message
    currentMessages[index].content = newText;
    
    // Update UI
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.innerHTML = `
        ${newText ? `<p>${escapeHtml(newText)}</p>` : ''}
        ${renderAttachments(currentMessages[index].attachments)}
    `;
    
    cancelEditing(messageDiv);
    saveCurrentChat();
    showToast('Message updated');
    
    // Auto-resend if it was the last message
    if (index === currentMessages.length - 1) {
        setTimeout(() => {
            messageInput.value = newText;
            autoResizeTextarea();
            sendMessage();
        }, 100);
    }
}

function updateMessageIndices() {
    chatMessages.querySelectorAll('.message').forEach((div, index) => {
        div.dataset.index = index;
    });
}

// NOTES FUNCTIONS
function loadNotes() {
    try {
        // Get notes from localStorage
        const notes = JSON.parse(localStorage.getItem('student_notes') || '[]');
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = '';
        selectedNotes = [];
        
        // Reset button text
        const askBtn = document.getElementById('askNotes');
        if (askBtn) {
            askBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Ask About Selected`;
        }
        
        if (notes.length === 0) {
            notesList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7299;">
                    <i class="fas fa-sticky-note" style="font-size: 3rem; opacity: 0.5; margin-bottom: 16px;"></i>
                    <p>No notes found</p>
                    <p style="font-size: 0.9rem; margin-top: 8px;">Create notes in the Notes page first</p>
                    <button onclick="window.location.href='notes.html'" style="margin-top: 16px; padding: 8px 16px; background: #3a7bd5; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-external-link-alt"></i> Go to Notes
                    </button>
                </div>
            `;
            return;
        }
        
        notes.forEach((note, index) => {
            const div = document.createElement('div');
            div.className = 'note-item';
            div.innerHTML = `
                <div class="note-title">
                    <i class="fas fa-sticky-note"></i>
                    ${escapeHtml(note.title || `Note ${index + 1}`)}
                    <span style="margin-left: auto; font-size: 0.8rem; color: #a0a8d6;">
                        ${new Date(note.date || note.timestamp || Date.now()).toLocaleDateString()}
                    </span>
                </div>
                <div class="note-preview">
                    ${escapeHtml(note.content?.substring(0, 150) || 'No content')}
                    ${note.content && note.content.length > 150 ? '...' : ''}
                </div>
            `;
            
            div.addEventListener('click', () => {
                div.classList.toggle('selected');
                if (div.classList.contains('selected')) {
                    selectedNotes.push({
                        type: 'note',
                        id: note.id || index,
                        title: note.title || `Note ${index + 1}`,
                        content: note.content || '',
                        date: note.date || note.timestamp
                    });
                } else {
                    selectedNotes = selectedNotes.filter(n => n.id !== (note.id || index));
                }
                
                // Update button text
                const askBtn = document.getElementById('askNotes');
                if (askBtn) {
                    askBtn.innerHTML = selectedNotes.length > 0 
                        ? `<i class="fas fa-paper-plane"></i> Ask About ${selectedNotes.length} Note${selectedNotes.length > 1 ? 's' : ''}`
                        : `<i class="fas fa-paper-plane"></i> Ask About Selected`;
                }
            });
            
            notesList.appendChild(div);
        });
        
    } catch (error) {
        console.error('Error loading notes:', error);
        notesList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff6b6b;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 16px;"></i>
                <p>Error loading notes</p>
                <p style="font-size: 0.9rem; margin-top: 8px;">Please check your notes.html page</p>
            </div>
        `;
    }
}

// ASK ABOUT NOTES FUNCTION
function askAboutNotes() {
    if (selectedNotes.length === 0) {
        showToast('Please select at least one note');
        return;
    }
    
    // Build a comprehensive prompt with all selected notes
    let prompt = 'I have selected the following notes. Please help me with them:\n\n';
    
    selectedNotes.forEach((note, index) => {
        prompt += `**Note ${index + 1}: ${note.title}**\n`;
        prompt += `Created: ${new Date(note.date).toLocaleDateString()}\n`;
        prompt += `Content:\n${note.content}\n\n`;
    });
    
    prompt += 'Based on these notes, please:\n';
    prompt += '1. Summarize the key points\n';
    prompt += '2. Identify any important concepts\n';
    prompt += '3. Suggest study questions based on the content\n';
    prompt += '4. Provide any additional insights or connections\n\n';
    prompt += 'Please format your response clearly with headings and bullet points.';
    
    // Set the prompt in the input
    messageInput.value = prompt;
    messageInput.focus();
    autoResizeTextarea();
    
    // Close modal
    document.getElementById('notesModal').classList.remove('active');
    showToast(`Notes loaded. Ready to ask about ${selectedNotes.length} note${selectedNotes.length > 1 ? 's' : ''}.`);
}

// Attachment Functions
function openAttachmentModal(type) {
    if (type === 'camera') {
        document.getElementById('cameraModal').classList.add('active');
        startCamera();
    } else if (type === 'photo') {
        document.getElementById('photoModal').classList.add('active');
        // Reset photo preview
        document.getElementById('photoPreviewContainer').style.display = 'none';
        document.getElementById('photoPreview').src = '';
        document.getElementById('photoDescription').value = '';
    } else if (type === 'file') {
        document.getElementById('fileModal').classList.add('active');
        // Reset file info
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('fileName').textContent = '';
        document.getElementById('fileDescription').value = '';
    } else if (type === 'notes') {
        document.getElementById('notesModal').classList.add('active');
        loadNotes();
    }
}

async function startCamera() {
    try {
        const constraints = {
            video: { facingMode: facingMode },
            audio: false
        };
        
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        document.getElementById('cameraVideo').srcObject = cameraStream;
    } catch (error) {
        showToast('Cannot access camera. Please check permissions.');
        document.getElementById('cameraModal').classList.remove('active');
    }
}

function switchCamera() {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera();
}

function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('photoCanvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob(blob => {
        const file = new File([blob], `photo_${Date.now()}.png`, { type: 'image/png' });
        const preview = URL.createObjectURL(blob);
        
        pendingAttachments.push({
            type: 'photo',
            name: file.name,
            preview: preview,
            file: file,
            description: ''
        });
        
        document.getElementById('cameraModal').classList.remove('active');
        document.getElementById('photoModal').classList.add('active');
        document.getElementById('photoPreviewContainer').style.display = 'block';
        document.getElementById('photoPreview').src = preview;
        document.getElementById('photoDescription').value = '';
        document.getElementById('photoDescription').focus();
        
        stopCamera();
        showToast('Photo captured! Add a description.');
    }, 'image/png');
}

function usePhoto() {
    const description = document.getElementById('photoDescription').value.trim();
    if (pendingAttachments.length > 0) {
        const lastAttachment = pendingAttachments[pendingAttachments.length - 1];
        lastAttachment.description = description;
        
        messageInput.value = description ? description + ' ' : '';
        messageInput.focus();
        autoResizeTextarea();
        
        document.getElementById('photoModal').classList.remove('active');
        showToast('Photo attached. Send your message.');
    }
}

function handlePhotoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('File too large. Maximum 5MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        pendingAttachments.push({
            type: 'photo',
            name: file.name,
            preview: e.target.result,
            file: file,
            description: ''
        });
        
        document.getElementById('photoPreviewContainer').style.display = 'block';
        document.getElementById('photoPreview').src = e.target.result;
        document.getElementById('photoDescription').value = '';
        document.getElementById('photoDescription').focus();
    };
    reader.readAsDataURL(file);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('File too large. Maximum 5MB.');
        return;
    }
    
    pendingAttachments.push({
        type: 'file',
        name: file.name,
        file: file,
        description: ''
    });
    
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileDescription').value = '';
    document.getElementById('fileDescription').focus();
}

function uploadFile() {
    const description = document.getElementById('fileDescription').value.trim();
    if (pendingAttachments.length > 0) {
        const lastAttachment = pendingAttachments[pendingAttachments.length - 1];
        lastAttachment.description = description;
        
        messageInput.value = description ? description + ' ' : '';
        messageInput.focus();
        autoResizeTextarea();
        
        document.getElementById('fileModal').classList.remove('active');
        showToast('File attached. Send your message.');
    }
}

// Navigation function
function navigateTo(page) {
    // Save current chat before navigating
    saveCurrentChat();
    window.location.href = page;
}

// Utility Functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.getElementById('toastContainer').appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function renderMessages() {
    chatMessages.innerHTML = '';
    currentMessages.forEach((msg, index) => {
        renderMessage(msg, index);
    });
}
