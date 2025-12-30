// blackbot.js - Student Companion AI Chat Interface - WITH WEB SEARCH & BACKGROUND PROCESSING & CONNECTION RECOVERY & NOTE SENDING
// Full updated version - Always connected with working voice recognition

// Configuration - UPDATED FOR GITHUB PAGES
const USE_BACKEND = true; // Always try to use backend
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isGithubPages = window.location.hostname.includes('github.io');
const BACKEND_BASE_URL = isLocalhost ? 'http://localhost:3000' : 'https://your-backend-url.herokuapp.com'; // CHANGE THIS TO YOUR ACTUAL BACKEND URL
const API_URL = `${BACKEND_BASE_URL}/api/chat`;
const ENABLE_WEBSEARCH = true;
const SEARCH_API_URL = `${BACKEND_BASE_URL}/api/search`;
const CONNECTION_CHECK_INTERVAL = 15000; // 15 seconds
const MAX_RETRY_ATTEMPTS = 5;

// Initialize markdown parser with safe fallback
const md = window.markdownit ? window.markdownit({
    html: false,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
        if (window.hljs && lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(str, { language: lang }).value;
            } catch (err) {
                console.error('Highlight error:', err);
            }
        }
        return '';
    }
}) : {
    render: (text) => {
        // Simple fallback
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                   .replace(/\n/g, '<br>')
                   .replace(/`(.*?)`/g, '<code>$1</code>');
    }
};

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
let cameraStream = null;
let facingMode = 'user';
let fileProcessingMode = 'separate';
let awaitingFileDecision = false;
let typingPaused = false;
let currentTypingMessage = null;
let sendButtonMode = 'send';
let isProcessingMessage = false;

// Web Search State
let webSearchEnabled = true;

// Background Processing State
let backgroundProcessing = true;
let backgroundTasks = new Map();
let offlineMode = false;
let lastActivityTime = Date.now();

// Connection Management State
let backendConnectionStatus = 'unknown';
let connectionCheckInterval = null;
let retryAttempts = 0;
let lastSuccessfulConnection = Date.now();
let autoReconnectEnabled = true;

// Voice Recognition - FIXED FOR MOBILE
let isListening = false;
let recognition = null;
let silenceTimer = null;
let finalTranscript = '';
let interimTranscript = '';
let recognitionActive = false;
let isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Notes Management State
let currentNotesInModal = [];

// Scroll tracking
let userScrolledUp = false;
let scrollToBottomBtn = null;

// Add retry button styles
function addRetryButtonStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .retry-btn-outside {
            position: absolute;
            left: -45px;
            top: 50%;
            transform: translateY(-50%);
            background: linear-gradient(135deg, #ff416c, #ff4b2b);
            color: white;
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            transition: all 0.3s;
            font-size: 14px;
        }
        
        .retry-btn-outside:hover {
            transform: translateY(-50%) scale(1.1);
            background: linear-gradient(135deg, #ff4b2b, #ff416c);
        }
        
        .retry-btn-outside:active {
            transform: translateY(-50%) scale(0.95);
        }
        
        .message.failed {
            border-left: 3px solid #ff416c !important;
            animation: pulseFailed 2s infinite;
        }
        
        @keyframes pulseFailed {
            0% { border-left-color: #ff416c; }
            50% { border-left-color: rgba(255, 65, 108, 0.5); }
            100% { border-left-color: #ff416c; }
        }
        
        .user-message {
            position: relative;
        }
        
        /* Notes modal styles */
        .note-select-item {
            background: rgba(138, 43, 226, 0.1);
            border: 1px solid rgba(138, 43, 226, 0.2);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            transition: all 0.3s;
            cursor: pointer;
        }
        
        .note-select-item:hover {
            background: rgba(138, 43, 226, 0.15);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(138, 43, 226, 0.2);
        }
        
        .send-note-btn, .view-note-btn {
            background: rgba(138, 43, 226, 0.3);
            border: 1px solid rgba(138, 43, 226, 0.5);
            color: #8a2be2;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        
        .send-note-btn:hover {
            background: rgba(138, 43, 226, 0.5);
            color: white;
        }
        
        .view-note-btn {
            background: rgba(0, 255, 255, 0.1);
            border: 1px solid rgba(0, 255, 255, 0.3);
            color: #00ffff;
        }
        
        .view-note-btn:hover {
            background: rgba(0, 255, 255, 0.3);
            color: white;
        }
    `;
    document.head.appendChild(style);
}

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer') || (() => {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 0;
            right: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(container);
        return container;
    })();
    
    // Don't show duplicate toasts
    const existingToasts = toastContainer.querySelectorAll('.toast');
    for (const toast of existingToasts) {
        if (toast.textContent.includes(message.substring(0, 50))) {
            return;
        }
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        background: linear-gradient(135deg, ${type === 'success' ? '#00b09b, #96c93d' : type === 'error' ? '#ff416c, #ff4b2b' : type === 'warning' ? '#ff9966, #ff5e62' : '#8a2be2, #00ffff'});
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        margin-bottom: 10px;
        animation: fadeInUp 0.3s, fadeOut 0.3s ${duration - 300}ms;
        max-width: 80%;
        text-align: center;
        font-size: 14px;
        pointer-events: none;
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, duration);
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('🚀 Initializing Student Companion AI - Always Connected');
    console.log('🌐 Backend URL:', BACKEND_BASE_URL);
    console.log('📱 Mobile Device:', isMobileDevice);
    
    // Add retry button styles
    addRetryButtonStyles();
    
    // Get current user
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser === 'Guest') {
        showToast('Please log in to use the chat', 'warning');
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 2000);
        return;
    }
    
    console.log('👤 Current user:', currentUser);
    
    // Setup connection indicator
    setupConnectionIndicator();
    
    // Try to connect to backend
    await checkAndRestoreBackendConnection(true);
    
    // Load user data
    const userChatsKey = `studentAI_chats_${currentUser}`;
    try {
        chats = JSON.parse(localStorage.getItem(userChatsKey) || '[]');
        console.log('📂 Loaded chats:', chats.length);
    } catch (e) {
        chats = [];
    }
    
    // Create or load current chat
    const currentChatKey = `currentChat_${currentUser}`;
    currentChatId = localStorage.getItem(currentChatKey);
    
    if (!currentChatId) {
        currentChatId = `chat_${Date.now()}_${currentUser}`;
        localStorage.setItem(currentChatKey, currentChatId);
    }
    
    // Load messages
    const chatMessagesKey = `chat_${currentUser}_${currentChatId}`;
    try {
        currentMessages = JSON.parse(localStorage.getItem(chatMessagesKey) || '[]');
        console.log('💬 Loaded messages:', currentMessages.length);
    } catch (e) {
        currentMessages = [];
    }
    
    // Load settings
    loadSettings();
    
    // Load UI
    loadChats();
    renderMessages();
    setupEventListeners();
    
    // Initialize components
    updateSendButton();
    initVoiceRecognition();
    setupScrollTracking();
    setupWebSearchButton();
    setupBackgroundProcessing();
    setupNoteSending();
    
    // Show welcome if no messages
    if (currentMessages.length === 0) {
        await showWelcomeMessage();
    }
    
    // Check for pending tasks
    checkPendingTasks();
    setTimeout(() => checkForCompletedBackgroundResponses(), 1000);
    
    // Start connection monitoring
    startConnectionMonitoring();
    
    scrollToBottom();
}

// CONNECTION MANAGEMENT FUNCTIONS
async function checkAndRestoreBackendConnection(showNotification = true) {
    if (!USE_BACKEND) {
        backendConnectionStatus = 'mock';
        updateConnectionIndicator();
        return false;
    }
    
    try {
        console.log('🔄 Checking backend connection...');
        backendConnectionStatus = 'retrying';
        updateConnectionIndicator();
        
        // Try multiple endpoints
        const endpoints = [
            `${BACKEND_BASE_URL}/api/health`,
            `${BACKEND_BASE_URL}/health`,
            API_URL
        ];
        
        let connected = false;
        for (const endpoint of endpoints) {
            try {
                console.log(`🔍 Trying endpoint: ${endpoint}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    signal: controller.signal,
                    mode: 'cors'
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    console.log('✅ Backend connection successful');
                    backendConnectionStatus = 'connected';
                    lastSuccessfulConnection = Date.now();
                    retryAttempts = 0;
                    updateConnectionIndicator();
                    
                    if (showNotification && retryAttempts > 0) {
                        showToast('✅ Backend connected!', 'success');
                    }
                    connected = true;
                    break;
                }
            } catch (error) {
                console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
                continue;
            }
        }
        
        if (!connected) {
            throw new Error('All endpoints failed');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Backend connection failed:', error.message);
        
        if (backendConnectionStatus === 'connected' && showNotification) {
            showToast('⚠️ Connection lost. Will retry...', 'warning');
        }
        
        backendConnectionStatus = 'disconnected';
        retryAttempts++;
        updateConnectionIndicator();
        
        if (retryAttempts >= MAX_RETRY_ATTEMPTS) {
            showToast('⚠️ Using offline mode. Some features limited.', 'error');
            backendConnectionStatus = 'offline';
            updateConnectionIndicator();
        }
        
        return false;
    }
}

function setupConnectionIndicator() {
    const connectionIndicator = document.getElementById('connectionIndicator');
    if (connectionIndicator) connectionIndicator.remove();
    
    const newIndicator = document.createElement('div');
    newIndicator.id = 'connectionIndicator';
    newIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        z-index: 10000;
        transition: all 0.3s;
        cursor: pointer;
        box-shadow: 0 0 8px currentColor;
    `;
    newIndicator.title = 'Connection status: Checking...';
    newIndicator.addEventListener('click', showConnectionStatusDialog);
    
    document.body.appendChild(newIndicator);
    updateConnectionIndicator();
}

function updateConnectionIndicator() {
    const indicator = document.getElementById('connectionIndicator');
    if (!indicator) return;
    
    let statusText = 'Connection status: ';
    let color = 'gray';
    let pulse = false;
    
    switch (backendConnectionStatus) {
        case 'connected':
            color = '#00ff00';
            statusText += 'Connected';
            pulse = true;
            break;
        case 'disconnected':
            color = '#ff0000';
            statusText += 'Disconnected';
            pulse = true;
            break;
        case 'retrying':
            color = '#ff9900';
            statusText += 'Retrying...';
            pulse = true;
            break;
        case 'offline':
            color = '#888888';
            statusText += 'Offline Mode';
            break;
        case 'mock':
            color = '#8a2be2';
            statusText += 'Mock Mode';
            break;
        default:
            color = '#888888';
            statusText += 'Unknown';
    }
    
    indicator.style.background = color;
    indicator.style.boxShadow = `0 0 10px ${color}`;
    indicator.title = statusText + `\nURL: ${BACKEND_BASE_URL}`;
    
    if (pulse) {
        indicator.style.animation = 'pulse 2s infinite';
    } else {
        indicator.style.animation = 'none';
    }
}

function showConnectionStatusDialog() {
    const existingDialog = document.querySelector('.connection-dialog');
    if (existingDialog) existingDialog.remove();
    
    const dialog = document.createElement('div');
    dialog.className = 'connection-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 30px;
        right: 30px;
        background: rgba(25, 25, 40, 0.95);
        border: 1px solid rgba(138, 43, 226, 0.5);
        border-radius: 10px;
        padding: 20px;
        z-index: 10001;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
    `;
    
    let statusHTML = '';
    switch (backendConnectionStatus) {
        case 'connected':
            statusHTML = `
                <h3 style="margin-top: 0; color: #00ff00;">✅ Connected</h3>
                <p>Backend server is running properly.</p>
                <p><small>Server URL: ${BACKEND_BASE_URL}</small></p>
                <p><small>Last successful: ${new Date(lastSuccessfulConnection).toLocaleTimeString()}</small></p>
            `;
            break;
        case 'disconnected':
        case 'retrying':
            statusHTML = `
                <h3 style="margin-top: 0; color: #ff9900;">⚠️ Connection Issue</h3>
                <p>Cannot connect to backend server.</p>
                <p><small>Server URL: ${BACKEND_BASE_URL}</small></p>
                <p><small>Attempt ${retryAttempts} of ${MAX_RETRY_ATTEMPTS}</small></p>
                <div style="margin-top: 15px; padding: 10px; background: rgba(255, 153, 0, 0.1); border-radius: 5px; border-left: 3px solid #ff9900;">
                    <p><strong>If running locally:</strong></p>
                    <ol style="margin: 5px 0 5px 15px; font-size: 0.9em;">
                        <li>Make sure backend server is running</li>
                        <li>Check if port 3000 is available</li>
                        <li>Run: <code>node server.js</code></li>
                    </ol>
                </div>
            `;
            break;
        case 'offline':
            statusHTML = `
                <h3 style="margin-top: 0; color: #888888;">🔌 Offline Mode</h3>
                <p>Using offline capabilities.</p>
                <p><small>Basic features available</small></p>
                <p><small>Full AI features require backend connection</small></p>
            `;
            break;
        default:
            statusHTML = `
                <h3 style="margin-top: 0; color: #888888;">❓ Unknown</h3>
                <p>Connection status unknown.</p>
                <p><small>Server URL: ${BACKEND_BASE_URL}</small></p>
            `;
    }
    
    dialog.innerHTML = `
        ${statusHTML}
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button id="testConnectionBtn" style="flex: 1; padding: 8px; background: #8a2be2; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Test Connection
            </button>
            <button id="closeDialogBtn" style="flex: 1; padding: 8px; background: #444; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Close
            </button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('#testConnectionBtn').addEventListener('click', async () => {
        dialog.querySelector('#testConnectionBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        await checkAndRestoreBackendConnection(true);
        setTimeout(() => {
            dialog.remove();
            showConnectionStatusDialog();
        }, 1000);
    });
    
    dialog.querySelector('#closeDialogBtn').addEventListener('click', () => {
        dialog.remove();
    });
    
    setTimeout(() => {
        const clickHandler = (e) => {
            if (!dialog.contains(e.target) && e.target.id !== 'connectionIndicator') {
                dialog.remove();
                document.removeEventListener('click', clickHandler);
            }
        };
        document.addEventListener('click', clickHandler);
    }, 100);
}

function startConnectionMonitoring() {
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
    }
    
    connectionCheckInterval = setInterval(async () => {
        if (!document.hidden && USE_BACKEND) {
            await checkAndRestoreBackendConnection(false);
        }
    }, CONNECTION_CHECK_INTERVAL);
    
    console.log('📡 Started connection monitoring');
}

// VOICE RECOGNITION FUNCTIONS - FIXED FOR MOBILE
function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.log('Speech recognition not supported');
        if (micBtn) micBtn.style.display = 'none';
        return;
    }
    
    recognition = new SpeechRecognition();
    
    // Mobile-friendly settings
    if (isMobileDevice) {
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3; // More alternatives for better accuracy
    } else {
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
    }
    
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        console.log('🎤 Voice recognition started');
        isListening = true;
        recognitionActive = true;
        if (micBtn) micBtn.classList.add('active');
        if (voiceFeedback) voiceFeedback.style.display = 'flex';
        if (voiceText) voiceText.textContent = 'Listening... Speak now';
        finalTranscript = '';
        interimTranscript = '';
        
        if (messageInput) {
            messageInput.value = '';
            messageInput.focus();
        }
        
        clearTimeout(silenceTimer);
        
        // Longer silence timeout on mobile
        const silenceTimeout = isMobileDevice ? 3000 : 2000;
        silenceTimer = setTimeout(() => {
            if (isListening && finalTranscript.trim()) {
                console.log('🔇 Auto-sending after silence');
                stopVoiceRecognition();
                setTimeout(() => {
                    if (messageInput && messageInput.value.trim()) {
                        sendMessage();
                    }
                }, 500);
            }
        }, silenceTimeout);
    };
    
    recognition.onresult = (event) => {
        clearTimeout(silenceTimer);
        
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Update input field
        const displayText = finalTranscript + interimTranscript;
        if (messageInput) {
            messageInput.value = displayText;
            autoResizeTextarea();
        }
        
        // Update voice feedback
        if (voiceText) {
            if (interimTranscript) {
                voiceText.textContent = `"${interimTranscript}"`;
            } else if (finalTranscript) {
                voiceText.textContent = `"${finalTranscript.trim()}"`;
            }
        }
        
        // Reset silence timer
        const silenceTimeout = isMobileDevice ? 3000 : 2000;
        silenceTimer = setTimeout(() => {
            if (isListening && finalTranscript.trim()) {
                console.log('🔇 Auto-sending after silence');
                stopVoiceRecognition();
                setTimeout(() => {
                    if (messageInput && messageInput.value.trim()) {
                        sendMessage();
                    }
                }, 500);
            }
        }, silenceTimeout);
    };
    
    recognition.onerror = (event) => {
        console.error('🎤 Speech recognition error:', event.error);
        
        let errorMessage = 'Voice recognition error';
        switch (event.error) {
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please enable microphone permissions in browser settings.';
                break;
            case 'no-speech':
                errorMessage = 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage = 'No microphone found. Please check your microphone.';
                break;
            case 'network':
                errorMessage = 'Network error occurred. Please check your connection.';
                break;
        }
        
        showToast(errorMessage, 'error');
        stopVoiceRecognition();
    };
    
    recognition.onend = () => {
        console.log('🎤 Voice recognition ended');
        recognitionActive = false;
        
        // Auto-restart if still supposed to be listening
        if (isListening) {
            try {
                setTimeout(() => {
                    if (isListening && recognition) {
                        recognition.start();
                    }
                }, 100);
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
        showToast('Voice recognition not supported in your browser', 'error');
        return;
    }
    
    // Check HTTPS for non-localhost
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        showToast('Voice recognition requires HTTPS on most browsers. Please use HTTPS or localhost.', 'warning');
        return;
    }
    
    // Request microphone permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                try {
                    recognition.start();
                    showToast('🎤 Voice recognition started. Speak now!', 'success');
                } catch (e) {
                    console.error('Failed to start recognition:', e);
                    showToast('Failed to start voice recognition. Please refresh and try again.', 'error');
                }
            })
            .catch(err => {
                console.error('Microphone permission denied:', err);
                showToast('Microphone access denied. Please allow microphone access in browser settings.', 'error');
            });
    } else {
        try {
            recognition.start();
            showToast('🎤 Voice recognition started. Speak now!', 'success');
        } catch (e) {
            console.error('Failed to start recognition:', e);
            showToast('Failed to start voice recognition', 'error');
        }
    }
}

function stopVoiceRecognition() {
    isListening = false;
    recognitionActive = false;
    clearTimeout(silenceTimer);
    
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            console.error('Error stopping recognition:', e);
        }
    }
    
    if (micBtn) micBtn.classList.remove('active');
    if (voiceFeedback) voiceFeedback.style.display = 'none';
    
    if (finalTranscript.trim() && messageInput && messageInput.value.trim()) {
        showToast('Voice message ready. Press Enter or click Send.', 'success');
    }
}

// Get current user
function getCurrentUser() {
    try {
        const loggedInUser = localStorage.getItem('currentUser');
        if (loggedInUser && loggedInUser !== 'Guest') {
            return loggedInUser;
        }
        
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        for (const username in users) {
            if (users[username] && users[username].isLoggedIn === true) {
                localStorage.setItem('currentUser', username);
                return username;
            }
        }
    } catch (e) {
        console.error('Error reading users:', e);
    }
    
    return 'Guest';
}

function loadSettings() {
    const savedWebSearch = localStorage.getItem('webSearchEnabled');
    webSearchEnabled = savedWebSearch !== 'false' && ENABLE_WEBSEARCH;
    
    const savedBackground = localStorage.getItem('backgroundProcessingEnabled');
    backgroundProcessing = savedBackground !== 'false';
}

// Setup event listeners
function setupEventListeners() {
    console.log('🔌 Setting up event listeners...');
    
    // Menu toggle
    if (menuToggle) menuToggle.addEventListener('click', () => {
        if (sidebar) sidebar.classList.add('active');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    });
    
    // Close sidebar when clicking overlay
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => {
        if (sidebar) sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
    
    // Close sidebar on mobile when clicking nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth < 769 && sidebar) {
                sidebar.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            }
        });
    });

    // New chat
    if (newChatBtn) newChatBtn.addEventListener('click', createNewChat);

    // Send message
    if (sendBtn) sendBtn.addEventListener('click', handleSendButton);
    if (messageInput) messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    if (messageInput) messageInput.addEventListener('input', autoResizeTextarea);

    // Attachments
    if (attachBtn) attachBtn.addEventListener('click', toggleAttachmentMenu);
    
    // Close attachment menu when clicking outside
    document.addEventListener('click', (e) => {
        if (attachBtn && attachmentMenu && !attachBtn.contains(e.target) && !attachmentMenu.contains(e.target)) {
            attachmentMenu.classList.remove('show');
        }
    });

    // Attachment options
    document.querySelectorAll('.attachment-option').forEach(btn => {
        btn.addEventListener('click', handleAttachmentOption);
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close, .camera-btn[data-modal]').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                stopCamera();
            }
        });
    });

    // Camera controls
    document.getElementById('switchCamera')?.addEventListener('click', switchCamera);
    document.getElementById('capturePhoto')?.addEventListener('click', capturePhoto);
    document.getElementById('usePhoto')?.addEventListener('click', usePhoto);
    document.getElementById('uploadFile')?.addEventListener('click', uploadFile);

    // File inputs
    document.getElementById('photoInput')?.addEventListener('change', handlePhotoSelect);
    document.getElementById('fileInput')?.addEventListener('change', handleFileSelect);
    
    // Microphone button with touch support
    if (micBtn) {
        micBtn.addEventListener('click', toggleVoiceRecognition);
        
        // Touch support for mobile
        micBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            micBtn.style.transform = 'scale(0.95)';
        }, { passive: false });
        
        micBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            micBtn.style.transform = 'scale(1)';
            toggleVoiceRecognition();
        }, { passive: false });
    }
    
    // Auto-focus message input
    if (messageInput) messageInput.focus();
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Save pending tasks before unload
    window.addEventListener('beforeunload', savePendingTasks);
    
    // Auto-reconnect when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && USE_BACKEND) {
            setTimeout(() => checkAndRestoreBackendConnection(true), 1000);
        }
    });
}

function handleVisibilityChange() {
    if (document.hidden) {
        offlineMode = true;
        
        if (isTyping && !typingPaused) {
            typingPaused = true;
            sendButtonMode = 'resume';
            updateSendButton();
        }
        
        // Pause voice recognition when tab is hidden
        if (isListening) {
            clearTimeout(silenceTimer);
        }
        
    } else {
        offlineMode = false;
        updateLastActivityTime();
        
        // Try to reconnect when tab becomes visible
        if (USE_BACKEND) {
            setTimeout(async () => {
                await checkAndRestoreBackendConnection(true);
            }, 500);
        }
        
        if (isTyping && typingPaused) {
            typingPaused = false;
            sendButtonMode = 'pause';
            updateSendButton();
            if (currentTypingMessage) {
                continueTyping(currentTypingMessage);
            }
        }
        
        checkForCompletedBackgroundResponses();
    }
}

function autoResizeTextarea() {
    if (!messageInput) return;
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
}

function updateLastActivityTime() {
    lastActivityTime = Date.now();
}

function toggleAttachmentMenu(e) {
    e.stopPropagation();
    e.preventDefault();
    if (attachmentMenu) attachmentMenu.classList.toggle('show');
}

function handleAttachmentOption(e) {
    const type = e.target.closest('.attachment-option').dataset.type;
    openAttachmentModal(type);
    if (attachmentMenu) attachmentMenu.classList.remove('show');
}

function closeModal(e) {
    const modalId = e.target.closest('.modal-close')?.dataset.modal || 
                   e.target.closest('.camera-btn[data-modal]')?.dataset.modal;
    if (modalId) {
        const modal = document.getElementById(modalId + 'Modal');
        if (modal) {
            modal.classList.remove('active');
            stopCamera();
        }
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// SCROLL TRACKING FUNCTIONS
function setupScrollTracking() {
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
        background: linear-gradient(135deg, #8a2be2, #00ffff);
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
    
    scrollToBottomBtn.addEventListener('click', () => {
        scrollToBottom(true);
        hideScrollButton();
    });
    
    document.body.appendChild(scrollToBottomBtn);
    
    if (chatMessages) {
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
    }
}

function isUserNearBottom() {
    if (!chatMessages) return true;
    const threshold = 100;
    const distanceFromBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
    return distanceFromBottom <= threshold;
}

function showScrollButton() {
    if (!scrollToBottomBtn) return;
    scrollToBottomBtn.style.display = 'flex';
    setTimeout(() => {
        scrollToBottomBtn.style.opacity = '1';
        scrollToBottomBtn.style.transform = 'translateY(0)';
    }, 10);
}

function hideScrollButton() {
    if (!scrollToBottomBtn) return;
    scrollToBottomBtn.style.opacity = '0';
    scrollToBottomBtn.style.transform = 'translateY(10px)';
    setTimeout(() => {
        scrollToBottomBtn.style.display = 'none';
    }, 300);
}

function scrollToBottom(force = false) {
    if (!chatMessages) return;
    if (force || !userScrolledUp || isUserNearBottom()) {
        setTimeout(() => {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }
}

// CHAT MANAGEMENT FUNCTIONS
function loadChats() {
    const currentUser = getCurrentUser();
    if (!chatList) return;
    
    if (currentUser === 'Guest') {
        chatList.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7299;">Please log in to see your chats</div>';
        return;
    }
    
    const userChatsKey = `studentAI_chats_${currentUser}`;
    
    try {
        chats = JSON.parse(localStorage.getItem(userChatsKey) || '[]');
    } catch (e) {
        chats = [];
    }
    
    chatList.innerHTML = '';
    
    if (chats.length === 0) {
        chatList.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7299;">No chats yet</div>';
        return;
    }
    
    chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'chat-item';
        const timestamp = new Date(chat.timestamp);
        const now = new Date();
        const isToday = timestamp.toDateString() === now.toDateString();
        const timeDisplay = isToday ? 
            `Today ${timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` :
            timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        div.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px; padding-right: 40px;">${escapeHtml(chat.title)}</div>
            <div style="font-size: 0.8rem; color: #6b7299;">
                ${timeDisplay}
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
    const currentUser = getCurrentUser();
    if (currentUser === 'Guest') {
        showToast('Please log in to create a chat');
        return;
    }
    
    // Save current chat if it has messages
    if (currentMessages.length > 0) {
        saveCurrentChat();
    }
    
    // Create new chat
    currentChatId = `chat_${Date.now()}_${currentUser}`;
    const currentChatKey = `currentChat_${currentUser}`;
    localStorage.setItem(currentChatKey, currentChatId);
    currentMessages = [];
    
    // Generate chat name
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const defaultName = `Chat ${timeStr}`;
    if (currentChatTitle) currentChatTitle.textContent = defaultName;
    
    // Clear messages and show welcome
    if (chatMessages) chatMessages.innerHTML = '';
    await showWelcomeMessage();
    
    // Close sidebar on mobile
    if (window.innerWidth < 769 && sidebar) {
        sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }
    
    // Save chat
    const chat = {
        id: currentChatId,
        title: defaultName,
        timestamp: new Date().toISOString(),
        messageCount: currentMessages.length,
        userId: currentUser
    };
    
    const userChatsKey = `studentAI_chats_${currentUser}`;
    let userChats = [];
    try {
        userChats = JSON.parse(localStorage.getItem(userChatsKey) || '[]');
    } catch (e) {
        userChats = [];
    }
    
    userChats = userChats.filter(c => c.id !== currentChatId);
    userChats.unshift(chat);
    userChats = userChats.slice(0, 20);
    
    localStorage.setItem(userChatsKey, JSON.stringify(userChats));
    
    showToast('New chat created');
    loadChats();
}

function saveCurrentChat() {
    const currentUser = getCurrentUser();
    if (currentUser === 'Guest' || currentMessages.length === 0) return;
    
    let title = currentChatTitle ? currentChatTitle.textContent : 'New Chat';
    
    if (title === 'New Chat' || title === 'Loading...' || title.startsWith('Chat ')) {
        title = generateChatTitle();
        if (currentChatTitle) currentChatTitle.textContent = title;
    }
    
    const chat = {
        id: currentChatId,
        title: title,
        timestamp: new Date().toISOString(),
        messageCount: currentMessages.length,
        userId: currentUser
    };
    
    const userChatsKey = `studentAI_chats_${currentUser}`;
    let userChats = [];
    try {
        userChats = JSON.parse(localStorage.getItem(userChatsKey) || '[]');
    } catch (e) {
        userChats = [];
    }
    
    userChats = userChats.filter(c => c.id !== currentChatId);
    userChats.unshift(chat);
    userChats = userChats.slice(0, 20);
    
    localStorage.setItem(userChatsKey, JSON.stringify(userChats));
    
    const chatMessagesKey = `chat_${currentUser}_${currentChatId}`;
    localStorage.setItem(chatMessagesKey, JSON.stringify(currentMessages));
    
    loadChats();
}

function generateChatTitle() {
    const userMessages = currentMessages.filter(m => m.role === 'user');
    
    if (userMessages.length === 0) {
        return 'Study Session';
    }
    
    const firstMessage = userMessages[0].content;
    
    const topics = {
        'math': ['calculate', 'equation', 'algebra', 'calculus', 'geometry', 'math', 'statistics'],
        'science': ['science', 'physics', 'chemistry', 'biology', 'experiment', 'theory'],
        'programming': ['code', 'programming', 'javascript', 'python', 'html', 'css', 'function', 'algorithm'],
        'history': ['history', 'historical', 'war', 'event', 'century'],
        'language': ['translate', 'language', 'grammar', 'vocabulary', 'english', 'spanish'],
        'homework': ['homework', 'assignment', 'project', 'due', 'essay', 'paper'],
        'study': ['study', 'learn', 'review', 'prepare', 'exam', 'test', 'quiz'],
        'notes': ['note', 'notes', 'summary', 'review notes', 'study notes', 'lecture notes']
    };
    
    const lowerMessage = firstMessage.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topics)) {
        if (keywords.some(keyword => lowerMessage.includes(keyword))) {
            return `Study: ${topic.charAt(0).toUpperCase() + topic.slice(1)}`;
        }
    }
    
    const words = firstMessage.split(' ').slice(0, 5).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
}

async function loadChat(chatId) {
    const currentUser = getCurrentUser();
    if (currentUser === 'Guest') {
        showToast('Please log in to load chats');
        return;
    }
    
    currentChatId = chatId;
    const currentChatKey = `currentChat_${currentUser}`;
    localStorage.setItem(currentChatKey, chatId);
    
    const chatMessagesKey = `chat_${currentUser}_${chatId}`;
    try {
        currentMessages = JSON.parse(localStorage.getItem(chatMessagesKey) || '[]');
    } catch (e) {
        currentMessages = [];
    }
    
    // Update title
    const userChatsKey = `studentAI_chats_${currentUser}`;
    const userChats = JSON.parse(localStorage.getItem(userChatsKey) || '[]');
    const chat = userChats.find(c => c.id === chatId);
    if (currentChatTitle) currentChatTitle.textContent = chat ? chat.title : 'Chat';
    
    // Render messages
    if (chatMessages) {
        chatMessages.innerHTML = '';
        currentMessages.forEach((msg, index) => {
            renderMessage(msg, index);
        });
    }
    
    // Close sidebar on mobile
    if (window.innerWidth < 769 && sidebar) {
        sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }
    
    showToast('Chat loaded');
    scrollToBottom();
}

function deleteChat(chatId) {
    const currentUser = getCurrentUser();
    if (currentUser === 'Guest') {
        showToast('Please log in to delete chats');
        return;
    }
    
    if (!confirm('Delete this chat? This cannot be undone.')) return;
    
    const userChatsKey = `studentAI_chats_${currentUser}`;
    let userChats = [];
    try {
        userChats = JSON.parse(localStorage.getItem(userChatsKey) || '[]');
    } catch (e) {
        userChats = [];
    }
    
    userChats = userChats.filter(chat => chat.id !== chatId);
    localStorage.setItem(userChatsKey, JSON.stringify(userChats));
    
    const chatMessagesKey = `chat_${currentUser}_${chatId}`;
    localStorage.removeItem(chatMessagesKey);
    
    if (chatId === currentChatId) {
        createNewChat();
    }
    
    loadChats();
    showToast('Chat deleted');
}

// MESSAGE HANDLING
async function sendMessage() {
    const currentUser = getCurrentUser();
    if (currentUser === 'Guest') {
        showToast('Please log in to send messages');
        return;
    }
    
    if (isProcessingMessage) {
        showToast('Already processing a message. Please wait.');
        return;
    }
    
    const message = messageInput ? messageInput.value.trim() : '';
    if (!message && pendingAttachments.length === 0) {
        showToast('Please enter a message or add an attachment');
        return;
    }
    
    // Check connection
    if (USE_BACKEND && backendConnectionStatus !== 'connected') {
        const shouldRetry = confirm('Backend not connected. Try to connect before sending?');
        if (shouldRetry) {
            await checkAndRestoreBackendConnection(true);
        }
    }
    
    // Clear input
    if (messageInput) {
        messageInput.value = '';
        messageInput.style.height = 'auto';
        messageInput.blur();
    }
    
    // Add user message
    const userMessage = {
        role: 'user',
        content: message,
        attachments: [...pendingAttachments],
        timestamp: new Date().toISOString(),
        editable: true,
        failed: false,
        userId: currentUser
    };
    
    currentMessages.push(userMessage);
    const messageIndex = currentMessages.length - 1;
    
    // Render message immediately
    renderMessage(userMessage, messageIndex);
    
    // Clear pending attachments
    pendingAttachments = [];
    hideAttachmentPreview();
    
    // Show thinking
    showThinking();
    
    // Check file separation
    const hasMultipleFiles = userMessage.attachments.filter(a => 
        a.type === 'file' || a.type === 'photo').length > 1;
    
    if (hasMultipleFiles && !awaitingFileDecision) {
        showFileSeparationDialog(messageIndex);
        awaitingFileDecision = true;
    } else {
        await processMessage(message, userMessage.attachments, messageIndex);
    }
    
    // Update chat title
    if (currentChatTitle) {
        const currentTitle = currentChatTitle.textContent;
        if (currentTitle === 'New Chat' || currentTitle === 'Loading...' || currentTitle.startsWith('Chat ')) {
            currentChatTitle.textContent = generateChatTitle();
        }
    }
    
    saveCurrentChat();
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
    
    const dialogMessage = {
        role: 'ai',
        content: dialogHTML,
        timestamp: new Date().toISOString(),
        isDialog: true
    };
    
    currentMessages.push(dialogMessage);
    renderMessage(dialogMessage, currentMessages.length - 1);
    
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
    
    const dialog = document.querySelector('.file-dialog');
    if (dialog) {
        dialog.parentElement.remove();
    }
    
    showThinking();
    const originalMessage = currentMessages[messageIndex];
    processMessage(originalMessage.content, originalMessage.attachments, messageIndex);
}

async function processMessage(message, attachments, messageIndex) {
    if (isProcessingMessage) return;
    
    isProcessingMessage = true;
    
    try {
        const processingPromise = getAIResponse(message, attachments);
        
        if ((!isUserActive() || offlineMode) && backgroundProcessing) {
            backgroundTasks.set(messageIndex, processingPromise);
            showBackgroundProcessingIndicator(messageIndex);
            processInBackground(messageIndex, processingPromise);
            isProcessingMessage = false;
            return;
        }
        
        const aiResponse = await processingPromise;
        hideThinking();
        
        const currentUser = getCurrentUser();
        const currentChatKey = `currentChat_${currentUser}`;
        const currentChatIdForUser = localStorage.getItem(currentChatKey);
        
        if (currentChatId === currentChatIdForUser) {
            await typeAIResponse(aiResponse);
            saveCurrentChat();
        }
        
    } catch (error) {
        console.error('Error in processMessage:', error);
        hideThinking();
        
        if (currentMessages[messageIndex]) {
            currentMessages[messageIndex].failed = true;
        }
        
        updateMessageWithRetry(messageIndex);
        saveCurrentChat();
        
        showToast('Failed to send. Click the red retry button.', 'error');
    } finally {
        if (!backgroundProcessing || !backgroundTasks.has(messageIndex)) {
            isProcessingMessage = false;
        }
    }
}

function isUserActive() {
    return document.visibilityState === 'visible' && 
           !document.hidden &&
           Date.now() - lastActivityTime < 30000;
}

// AI RESPONSE FUNCTIONS
async function getAIResponse(message, attachments = []) {
    console.log('🤖 Getting AI response...');
    
    // If backend is not connected, use mock response
    if (!USE_BACKEND || backendConnectionStatus !== 'connected') {
        console.log('📴 Using mock response (backend not connected)');
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(getMockResponse(message, attachments));
            }, 1000);
        });
    }
    
    try {
        const currentUser = getCurrentUser();
        
        // Enhanced system prompt
        const systemPrompt = `You are an intelligent AI study assistant for students. Help with homework, study techniques, note organization, exam preparation, and programming. Be thorough and helpful.`;

        let context = '';
        if (attachments && attachments.length > 0) {
            context = '\n\n**ATTACHMENTS PROVIDED BY USER:**\n';
            attachments.forEach((att, index) => {
                if (att.type === 'note') {
                    context += `\n---\n`;
                    context += `**NOTE ${index + 1}: ${att.title || 'Untitled Note'}**\n\n`;
                    context += `${att.content || ''}\n`;
                    context += `\n---\n`;
                } else if (att.type === 'file') {
                    context += `\n📎 FILE: ${att.name || 'File'} - ${att.description || 'No description'}\n`;
                } else if (att.type === 'photo') {
                    context += `\n🖼️ PHOTO: ${att.name || 'Photo'} - ${att.description || 'No description'}\n`;
                }
            });
        }

        const fullMessage = message + context;
        
        const messages = [];
        messages.push({ role: 'system', content: systemPrompt });
        
        // Add recent conversation history (last 5 messages)
        const recentMessages = currentMessages.slice(-10);
        for (const msg of recentMessages) {
            if (msg.role === 'user') {
                messages.push({ role: 'user', content: msg.content });
            } else if (msg.role === 'ai' && !msg.isDialog) {
                messages.push({ role: 'assistant', content: msg.content });
            }
        }
        
        messages.push({ role: 'user', content: fullMessage });
        
        console.log('📤 Sending request to backend...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    max_tokens: 2000,
                    temperature: 0.7,
                    user: currentUser,
                    attachments: attachments
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Backend error response:', errorText);
                throw new Error(`Backend error (${response.status}): ${errorText.substring(0, 100)}`);
            }
            
            const data = await response.json();
            console.log('✅ AI Response received');
            
            let aiResponse = data.reply || data.message || data.choices?.[0]?.message?.content || 
                           data.content || data.response || data.answer || 
                           "I've processed your request successfully!";
            
            lastSuccessfulConnection = Date.now();
            retryAttempts = 0;
            
            if (typeof aiResponse !== 'string') {
                aiResponse = JSON.stringify(aiResponse);
            }
            
            return aiResponse;
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
        }
        
    } catch (error) {
        console.error('❌ Backend API call failed:', error);
        
        // Fall back to mock response
        console.log('⚡ Falling back to mock response');
        return getMockResponse(message, attachments);
    }
}

function getMockResponse(message, attachments = []) {
    const currentUser = getCurrentUser();
    let response = `Hello ${currentUser}! I received: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"\n\n`;
    
    if (attachments && attachments.length > 0) {
        const noteAttachments = attachments.filter(a => a.type === 'note');
        if (noteAttachments.length > 0) {
            response += `📝 **I see ${noteAttachments.length} note(s):**\n\n`;
            
            noteAttachments.forEach((note, index) => {
                response += `**Note ${index + 1}: ${note.title || 'Untitled Note'}**\n`;
                
                const content = note.content || '';
                const wordCount = content.split(' ').length;
                const lineCount = content.split('\n').length;
                
                response += `• Words: ${wordCount}, Lines: ${lineCount}\n`;
                
                // Simple analysis
                if (content.toLowerCase().includes('homework') || content.toLowerCase().includes('assignment')) {
                    response += `• This looks like homework/assignment notes\n`;
                }
                if (content.toLowerCase().includes('study') || content.toLowerCase().includes('review')) {
                    response += `• Study material detected\n`;
                }
                
                response += `\n`;
            });
            
            response += `**I can help you:**\n`;
            response += `• Organize these notes\n`;
            response += `• Create study questions\n`;
            response += `• Summarize key points\n`;
            response += `• Create flashcards\n\n`;
        }
    }
    
    response += `**Example Study Assistance:**\n`;
    response += `1. **Break down complex topics** into manageable parts\n`;
    response += `2. **Create a study schedule** based on your material\n`;
    response += `3. **Practice questions** to test your understanding\n`;
    response += `4. **Memory techniques** like spaced repetition\n`;
    response += `5. **Exam preparation** strategies\n\n`;
    
    if (backendConnectionStatus !== 'connected') {
        response += `*Note: Currently in offline mode. Connect to backend for enhanced AI capabilities.*`;
    }
    
    return response;
}

function updateMessageWithRetry(messageIndex) {
    const messageDiv = chatMessages?.querySelector(`[data-index="${messageIndex}"]`);
    if (!messageDiv) return;
    
    messageDiv.classList.add('failed');
    
    // Remove existing retry button if any
    const existingRetry = messageDiv.querySelector('.retry-btn-outside');
    if (existingRetry) existingRetry.remove();
    
    // Add new retry button
    const retryBtn = document.createElement('button');
    retryBtn.className = 'retry-btn-outside';
    retryBtn.title = 'Retry sending this message';
    retryBtn.innerHTML = '<i class="fas fa-redo"></i>';
    retryBtn.onclick = (e) => {
        e.stopPropagation();
        retryMessage(messageIndex);
    };
    
    // Insert at beginning so it's positioned before message content
    messageDiv.insertBefore(retryBtn, messageDiv.firstChild);
}

function updateFailedMessages() {
    if (!chatMessages) return;
    const failedMessages = chatMessages.querySelectorAll('.message.failed');
    failedMessages.forEach(messageDiv => {
        const index = parseInt(messageDiv.dataset.index);
        if (currentMessages[index] && currentMessages[index].failed) {
            const retryBtn = messageDiv.querySelector('.retry-btn-outside');
            if (retryBtn) {
                retryBtn.style.background = 'linear-gradient(135deg, #00b09b, #96c93d)';
                retryBtn.title = 'Backend reconnected! Click to retry';
            }
        }
    });
}

function retryMessage(messageIndex) {
    console.log('🔄 Retrying message at index:', messageIndex);
    
    const message = currentMessages[messageIndex];
    if (!message) return;
    
    message.failed = false;
    
    const messageDiv = chatMessages?.querySelector(`[data-index="${messageIndex}"]`);
    if (messageDiv) {
        const retryBtn = messageDiv.querySelector('.retry-btn-outside');
        if (retryBtn) retryBtn.remove();
        messageDiv.classList.remove('failed');
    }
    
    // Remove existing AI response if present
    let aiMessageIndex = -1;
    for (let i = messageIndex + 1; i < currentMessages.length; i++) {
        if (currentMessages[i].role === 'ai') {
            aiMessageIndex = i;
            break;
        }
    }
    
    if (aiMessageIndex !== -1) {
        currentMessages.splice(aiMessageIndex, 1);
        
        const aiMessageDiv = chatMessages?.querySelector(`[data-index="${aiMessageIndex}"]`);
        if (aiMessageDiv) {
            aiMessageDiv.remove();
        }
        
        updateMessageIndices();
    }
    
    showThinking();
    processMessage(message.content, message.attachments, messageIndex);
}

// TYPING FUNCTIONS
async function typeAIResponse(text) {
    if (isTyping) return;
    
    isTyping = true;
    typingPaused = false;
    sendButtonMode = 'pause';
    updateSendButton();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    messageDiv.innerHTML = '<div class="ai-content"></div>';
    
    if (chatMessages) chatMessages.appendChild(messageDiv);
    
    const contentDiv = messageDiv.querySelector('.ai-content');
    const formattedText = md.render(text);
    
    scrollToBottom();
    
    await typeText(contentDiv, formattedText);
    
    processCodeBlocks(messageDiv);
    
    currentMessages.push({
        role: 'ai',
        content: text,
        timestamp: new Date().toISOString()
    });
    
    saveCurrentChat();
    
    isTyping = false;
    currentTypingMessage = null;
    sendButtonMode = 'send';
    updateSendButton();
    
    if (isUserNearBottom()) {
        scrollToBottom();
    }
}

async function typeText(element, html) {
    return new Promise(resolve => {
        let i = 0;
        const text = html.replace(/<[^>]*>/g, '');
        const originalHTML = html;
        
        let lastTime = performance.now();
        let accumulatedTime = 0;
        const baseSpeed = isMobileDevice ? 20 : 10; // Faster on mobile
        
        currentTypingMessage = { element, html: originalHTML, text, i, resolve, accumulatedTime };
        
        function typeChar(currentTime) {
            if (typingPaused) {
                currentTypingMessage.i = i;
                currentTypingMessage.accumulatedTime = accumulatedTime;
                return;
            }
            
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            accumulatedTime += deltaTime;
            
            while (accumulatedTime >= baseSpeed && i < text.length) {
                const typedSoFar = originalHTML.substring(0, originalHTML.indexOf(text) + i + 1);
                element.innerHTML = typedSoFar;
                i++;
                accumulatedTime -= baseSpeed;
                
                if (isUserNearBottom()) {
                    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
            
            if (i < text.length) {
                requestAnimationFrame(typeChar);
            } else {
                element.innerHTML = originalHTML;
                resolve();
            }
        }
        
        requestAnimationFrame(typeChar);
    });
}

function continueTyping(typingState) {
    if (!typingState || typingPaused) return;
    
    const { element, html, text, i, resolve, accumulatedTime } = typingState;
    let currentIndex = i;
    let currentAccumulatedTime = accumulatedTime || 0;
    const baseSpeed = isMobileDevice ? 20 : 10;
    
    let lastTime = performance.now();
    
    function typeChar(currentTime) {
        if (typingPaused) {
            currentTypingMessage.i = currentIndex;
            currentTypingMessage.accumulatedTime = currentAccumulatedTime;
            return;
        }
        
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        currentAccumulatedTime += deltaTime;
        
        while (currentAccumulatedTime >= baseSpeed && currentIndex < text.length) {
            const typedSoFar = html.substring(0, html.indexOf(text) + currentIndex + 1);
            element.innerHTML = typedSoFar;
            currentIndex++;
            currentAccumulatedTime -= baseSpeed;
            
            if (isUserNearBottom() && chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
        
        if (currentIndex < text.length) {
            requestAnimationFrame(typeChar);
        } else {
            element.innerHTML = html;
            resolve();
        }
    }
    
    requestAnimationFrame(typeChar);
}

function showThinking() {
    if (isThinking) return;
    isThinking = true;
    
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking';
    thinkingDiv.id = 'thinking';
    
    let thinkingText = 'Thinking...';
    if (backendConnectionStatus !== 'connected') {
        thinkingText = 'Processing (offline)...';
    }
    
    thinkingDiv.innerHTML = `
        <div class="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <span>${thinkingText}</span>
        ${webSearchEnabled ? '<span style="margin-left: 8px; color: #ff6b6b;"><i class="fas fa-search"></i> Web</span>' : ''}
        ${backendConnectionStatus !== 'connected' ? '<span style="margin-left: 8px; color: #888888;"><i class="fas fa-cloud"></i> Offline</span>' : ''}
    `;
    
    if (chatMessages) chatMessages.appendChild(thinkingDiv);
    
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
    const currentUser = getCurrentUser();
    const displayName = currentUser !== 'Guest' ? currentUser : 'there';
    
    let welcomeText = `👋 **Hello ${displayName}! I'm your Student Companion AI.**\n\n`;
    
    if (backendConnectionStatus === 'connected') {
        welcomeText += `✅ **Connected to AI Backend**\n`;
        welcomeText += `Full AI capabilities available!\n\n`;
    } else {
        welcomeText += `⚠️ **Offline Mode**\n`;
        welcomeText += `Basic functionality available. Connect to backend for full AI.\n\n`;
    }
    
    welcomeText += `**I can help you with:**\n`;
    welcomeText += `• 📚 Homework and assignments\n`;
    welcomeText += `• 🧠 Study techniques and organization\n`;
    welcomeText += `• 📝 Note analysis and summaries\n`;
    welcomeText += `• 📊 Exam preparation strategies\n`;
    welcomeText += `• 💻 Programming and coding help\n`;
    welcomeText += `• 🔊 Voice input (click microphone)\n`;
    welcomeText += `• 📎 Attachments and file analysis\n\n`;
    
    welcomeText += `**Try saying or typing:**\n`;
    welcomeText += `• "Help me study for my math test"\n`;
    welcomeText += `• "Explain photosynthesis"\n`;
    welcomeText += `• "Help me organize my notes"\n`;
    welcomeText += `• "Create a study schedule"\n\n`;
    
    welcomeText += `**How can I assist you today?**`;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    messageDiv.innerHTML = '<div class="ai-content"></div>';
    
    if (chatMessages) chatMessages.appendChild(messageDiv);
    
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

// MESSAGE RENDERING
function renderMessage(msg, index) {
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.role === 'user' ? 'user-message' : 'ai-message'}${msg.failed ? ' failed' : ''}`;
    messageDiv.dataset.index = index;
    
    const timestamp = new Date(msg.timestamp);
    const now = new Date();
    const isToday = timestamp.toDateString() === now.toDateString();
    const timeDisplay = isToday ? 
        `Today ${timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` :
        timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    if (msg.role === 'user') {
        // Add retry button first (will be positioned absolutely)
        let retryButtonHTML = '';
        if (msg.failed) {
            retryButtonHTML = `
                <button class="retry-btn-outside" title="Retry sending this message">
                    <i class="fas fa-redo"></i>
                </button>
            `;
        }
        
        messageDiv.innerHTML = `
            ${retryButtonHTML}
            <div class="message-content">
                ${msg.content ? `<p>${escapeHtml(msg.content)}</p>` : ''}
                ${renderAttachments(msg.attachments)}
                <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5); margin-top: 8px; text-align: right;">
                    <i class="far fa-clock"></i> ${timeDisplay}
                </div>
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
        
        // Add retry button event listener
        const retryBtn = messageDiv.querySelector('.retry-btn-outside');
        if (retryBtn) {
            retryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                retryMessage(index);
            });
        }
        
        const copyBtn = messageDiv.querySelector('.copy-message');
        const editBtn = messageDiv.querySelector('.edit-message');
        const cancelBtn = messageDiv.querySelector('.edit-cancel');
        const saveBtn = messageDiv.querySelector('.edit-save');
        const textarea = messageDiv.querySelector('.edit-textarea');
        
        if (copyBtn) copyBtn.addEventListener('click', () => copyMessage(msg));
        if (editBtn) editBtn.addEventListener('click', () => startEditing(index, messageDiv));
        if (cancelBtn) cancelBtn.addEventListener('click', () => cancelEditing(messageDiv));
        if (saveBtn) saveBtn.addEventListener('click', () => saveEditedMessage(index, messageDiv, textarea));
        
    } else if (msg.role === 'ai') {
        if (msg.isDialog) {
            messageDiv.innerHTML = msg.content;
        } else {
            messageDiv.innerHTML = `
                <div class="ai-content">
                    ${md.render(msg.content)}
                    <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5); margin-top: 12px;">
                        <i class="far fa-clock"></i> ${timeDisplay}
                        ${backendConnectionStatus !== 'connected' ? ' <i class="fas fa-cloud" style="margin-left: 8px; color: #888888;"></i> Offline' : ''}
                    </div>
                </div>
            `;
            
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
                <div style="margin-top: 12px; border-left: 3px solid #8a2be2; padding-left: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-file" style="color: #8a2be2;"></i>
                        <strong>${escapeHtml(att.name)}</strong>
                    </div>
                    ${att.description ? `<p style="font-size: 0.9rem; color: rgba(255,255,255,0.8); margin-top: 4px;">${escapeHtml(att.description)}</p>` : ''}
                </div>
            `;
        } else if (att.type === 'note') {
            html += `
                <div style="margin-top: 12px; border-left: 3px solid #00ffff; padding-left: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <i class="fas fa-sticky-note" style="color: #00ffff;"></i>
                        <strong>${escapeHtml(att.title)}</strong>
                        <span style="font-size: 0.7rem; color: #a0a8d6; margin-left: auto;">
                            <i class="fas fa-external-link-alt"></i> From Notes
                        </span>
                    </div>
                    <div style="background: rgba(0, 255, 255, 0.1); padding: 10px; border-radius: 6px; margin: 8px 0;">
                        <div style="font-size: 0.9rem; color: rgba(255,255,255,0.9); max-height: 120px; overflow-y: auto;">
                            ${escapeHtml(att.content.substring(0, 500))}${att.content.length > 500 ? '...' : ''}
                        </div>
                    </div>
                </div>
            `;
        }
    });
    return html;
}

function processCodeBlocks(container) {
    if (!container || !window.hljs) return;
    
    container.querySelectorAll('pre code').forEach((codeBlock) => {
        if (codeBlock.closest('.code-block-wrapper')) return;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        
        const classList = codeBlock.className.split(' ');
        let language = 'text';
        for (const cls of classList) {
            if (cls.startsWith('language-') || cls.startsWith('lang-')) {
                language = cls.replace('language-', '').replace('lang-', '');
                break;
            }
        }
        
        const header = document.createElement('div');
        header.className = 'code-header';
        
        const languageSpan = document.createElement('span');
        languageSpan.className = 'code-language';
        languageSpan.innerHTML = `<i class="fas fa-code"></i> ${language.toUpperCase()}`;
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.innerHTML = '<i class="far fa-copy"></i> Copy';
        copyBtn.title = 'Copy code to clipboard';
        copyBtn.onclick = () => copyCode(codeBlock, copyBtn);
        
        header.appendChild(languageSpan);
        header.appendChild(copyBtn);
        
        const pre = codeBlock.parentNode;
        const codeContainer = document.createElement('div');
        codeContainer.className = 'code-block';
        codeContainer.appendChild(pre.cloneNode(true));
        
        wrapper.appendChild(header);
        wrapper.appendChild(codeContainer);
        
        pre.parentNode.replaceChild(wrapper, pre);
        
        hljs.highlightElement(codeContainer.querySelector('code'));
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
        
        showToast('Code copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy code:', err);
        showToast('Failed to copy code', 'error');
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
        showToast('Message copied to clipboard', 'success');
    });
}

// MESSAGE EDITING
function startEditing(index, messageDiv) {
    const nextMessage = currentMessages[index + 1];
    if (nextMessage && nextMessage.role === 'ai') {
        if (!confirm('Editing this message will remove the AI response. Continue?')) {
            return;
        }
        currentMessages.splice(index + 1, 1);
        const aiMessageDiv = chatMessages?.querySelector(`[data-index="${index + 1}"]`);
        if (aiMessageDiv) aiMessageDiv.remove();
        updateMessageIndices();
    }
    
    messageDiv.classList.add('editing');
    const textarea = messageDiv.querySelector('.edit-textarea');
    if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
}

function cancelEditing(messageDiv) {
    messageDiv.classList.remove('editing');
}

function saveEditedMessage(index, messageDiv, textarea) {
    const newText = textarea.value.trim();
    if (!newText && (!currentMessages[index].attachments || currentMessages[index].attachments.length === 0)) {
        showToast('Message cannot be empty', 'warning');
        return;
    }
    
    currentMessages[index].content = newText;
    currentMessages[index].timestamp = new Date().toISOString();
    
    const contentDiv = messageDiv.querySelector('.message-content');
    const timestamp = new Date(currentMessages[index].timestamp);
    const now = new Date();
    const isToday = timestamp.toDateString() === now.toDateString();
    const timeDisplay = isToday ? 
        `Today ${timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` :
        timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    contentDiv.innerHTML = `
        ${newText ? `<p>${escapeHtml(newText)}</p>` : ''}
        ${renderAttachments(currentMessages[index].attachments)}
        <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5); margin-top: 8px; text-align: right;">
            <i class="far fa-clock"></i> ${timeDisplay} (edited)
        </div>
    `;
    
    cancelEditing(messageDiv);
    saveCurrentChat();
    showToast('Message updated', 'success');
    
    if (index === currentMessages.length - 1 && messageInput) {
        setTimeout(() => {
            messageInput.value = newText;
            autoResizeTextarea();
            sendMessage();
        }, 100);
    }
}

function updateMessageIndices() {
    if (!chatMessages) return;
    const messages = chatMessages.querySelectorAll('.message');
    messages.forEach((div, index) => {
        div.dataset.index = index;
    });
}

// BACKGROUND PROCESSING FUNCTIONS
function showBackgroundProcessingIndicator(messageIndex) {
    const messageDiv = chatMessages?.querySelector(`[data-index="${messageIndex}"]`);
    if (!messageDiv) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'background-processing-indicator';
    indicator.id = `background-indicator-${messageIndex}`;
    indicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; color: #a0a8d6; font-size: 0.9rem;">
            <i class="fas fa-sync-alt fa-spin"></i>
            <span>Processing in background...</span>
        </div>
    `;
    
    messageDiv.appendChild(indicator);
}

function hideBackgroundProcessingIndicator(messageIndex) {
    const indicator = document.getElementById(`background-indicator-${messageIndex}`);
    if (indicator) indicator.remove();
}

async function processInBackground(messageIndex, processingPromise) {
    try {
        const aiResponse = await processingPromise;
        saveBackgroundResponse(messageIndex, aiResponse);
        
        if (document.visibilityState === 'visible' && isUserActive()) {
            hideThinking();
            await showBackgroundResponse(messageIndex, aiResponse);
        }
        
        saveCurrentChat();
        
    } catch (error) {
        console.error('Background processing error:', error);
        saveFailedBackgroundResponse(messageIndex, error);
    } finally {
        backgroundTasks.delete(messageIndex);
        hideBackgroundProcessingIndicator(messageIndex);
        
        if (backgroundTasks.size === 0) {
            isProcessingMessage = false;
        }
    }
}

function saveBackgroundResponse(messageIndex, response) {
    const currentUser = getCurrentUser();
    const key = `background_response_${currentUser}_${currentChatId}_${messageIndex}`;
    
    const backgroundData = {
        messageIndex: messageIndex,
        response: response,
        timestamp: new Date().toISOString(),
        chatId: currentChatId,
        userId: currentUser
    };
    
    localStorage.setItem(key, JSON.stringify(backgroundData));
    
    updateBackgroundIndicator(messageIndex, 'ready');
    
    if (isUserActive()) {
        showToast('AI response is ready!', 'success');
    }
}

function saveFailedBackgroundResponse(messageIndex, error) {
    const currentUser = getCurrentUser();
    const key = `background_failed_${currentUser}_${currentChatId}_${messageIndex}`;
    
    localStorage.setItem(key, JSON.stringify({
        messageIndex: messageIndex,
        error: error.message,
        timestamp: new Date().toISOString()
    }));
    
    updateBackgroundIndicator(messageIndex, 'failed');
}

function updateBackgroundIndicator(messageIndex, status) {
    const indicator = document.getElementById(`background-indicator-${messageIndex}`);
    if (!indicator) return;
    
    if (status === 'ready') {
        indicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; color: #4CAF50; font-size: 0.9rem;">
                <i class="fas fa-check-circle"></i>
                <span>Response ready</span>
                <button class="show-now-btn" style="margin-left: auto; padding: 4px 12px; background: rgba(76, 175, 80, 0.3); border: 1px solid #4CAF50; border-radius: 4px; color: #4CAF50; cursor: pointer; font-size: 0.8rem;">
                    Show Response
                </button>
            </div>
        `;
        
        indicator.querySelector('.show-now-btn').addEventListener('click', () => {
            checkAndShowBackgroundResponse(messageIndex);
        });
    } else if (status === 'failed') {
        indicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; color: #ff6b6b; font-size: 0.9rem;">
                <i class="fas fa-exclamation-circle"></i>
                <span>Failed to process</span>
                <button class="retry-btn" style="margin-left: auto; padding: 4px 12px; background: rgba(255, 107, 107, 0.3); border: 1px solid #ff6b6b; border-radius: 4px; color: #ff6b6b; cursor: pointer; font-size: 0.8rem;">
                    Retry
                </button>
            </div>
        `;
        
        indicator.querySelector('.retry-btn').addEventListener('click', () => {
            retryBackgroundMessage(messageIndex);
        });
    }
}

function checkAndShowBackgroundResponse(messageIndex) {
    const currentUser = getCurrentUser();
    const key = `background_response_${currentUser}_${currentChatId}_${messageIndex}`;
    
    const backgroundData = JSON.parse(localStorage.getItem(key));
    if (backgroundData && backgroundData.response) {
        localStorage.removeItem(key);
        hideThinking();
        hideBackgroundProcessingIndicator(messageIndex);
        showBackgroundResponse(messageIndex, backgroundData.response);
    } else {
        const task = backgroundTasks.get(messageIndex);
        if (task) {
            showToast('Still processing... Please wait.', 'info');
        } else {
            showToast('No background response found.', 'warning');
        }
    }
}

async function showBackgroundResponse(messageIndex, response) {
    const aiMessage = {
        role: 'ai',
        content: response,
        timestamp: new Date().toISOString(),
        fromBackground: true
    };
    
    currentMessages.splice(messageIndex + 1, 0, aiMessage);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message background-message';
    messageDiv.dataset.index = messageIndex + 1;
    
    const timestamp = new Date(aiMessage.timestamp);
    const now = new Date();
    const isToday = timestamp.toDateString() === now.toDateString();
    const timeDisplay = isToday ? 
        `Today ${timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` :
        timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.innerHTML = `
        <div class="ai-content">
            ${md.render(response)}
            <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5); margin-top: 12px;">
                <i class="far fa-clock"></i> ${timeDisplay}
                <span style="margin-left: 8px; color: #8a2be2; font-style: italic;">
                    <i class="fas fa-history"></i> Completed in background
                </span>
            </div>
        </div>
    `;
    
    const userMessageDiv = chatMessages?.querySelector(`[data-index="${messageIndex}"]`);
    if (userMessageDiv) {
        userMessageDiv.after(messageDiv);
    } else if (chatMessages) {
        chatMessages.appendChild(messageDiv);
    }
    
    setTimeout(() => {
        processCodeBlocks(messageDiv);
    }, 100);
    
    updateMessageIndices();
    saveCurrentChat();
    scrollToBottom();
}

function retryBackgroundMessage(messageIndex) {
    const message = currentMessages[messageIndex];
    if (!message) return;
    
    hideBackgroundProcessingIndicator(messageIndex);
    showThinking();
    processMessage(message.content, message.attachments, messageIndex);
}

function checkForCompletedBackgroundResponses() {
    const currentUser = getCurrentUser();
    const keys = Object.keys(localStorage);
    const responseKeys = keys.filter(key => 
        key.startsWith(`background_response_${currentUser}_${currentChatId}_`)
    );
    
    if (responseKeys.length > 0) {
        showToast(`${responseKeys.length} AI response(s) completed while you were away!`, 'success');
        
        setTimeout(() => {
            responseKeys.forEach(key => {
                const match = key.match(/background_response_.*_(\d+)$/);
                if (match) {
                    const messageIndex = parseInt(match[1]);
                    checkAndShowBackgroundResponse(messageIndex);
                }
            });
        }, 2000);
    }
}

function setupBackgroundProcessing() {
    const style = document.createElement('style');
    style.textContent = `
        .background-processing-indicator {
            margin-top: 12px;
            padding: 12px;
            background: rgba(138, 43, 226, 0.1);
            border: 1px solid rgba(138, 43, 226, 0.3);
            border-radius: 8px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
        
        .background-message {
            border-left: 3px solid #8a2be2 !important;
        }
        
        .show-now-btn, .retry-btn {
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        
        .show-now-btn:hover {
            transform: scale(1.05);
            background: rgba(138, 43, 226, 0.5) !important;
        }
        
        .retry-btn:hover {
            transform: scale(1.05);
            background: rgba(255, 107, 107, 0.5) !important;
        }
    `;
    document.head.appendChild(style);
}

function savePendingTasks() {
    if (backgroundTasks.size > 0) {
        const currentUser = getCurrentUser();
        const pendingTasks = Array.from(backgroundTasks.keys());
        
        localStorage.setItem(
            `pending_tasks_${currentUser}_${currentChatId}`,
            JSON.stringify(pendingTasks)
        );
    }
}

function checkPendingTasks() {
    const currentUser = getCurrentUser();
    const key = `pending_tasks_${currentUser}_${currentChatId}`;
    const pendingTasks = JSON.parse(localStorage.getItem(key) || '[]');
    
    if (pendingTasks.length > 0) {
        showToast(`Resuming ${pendingTasks.length} background task(s)...`, 'info');
        localStorage.removeItem(key);
        
        pendingTasks.forEach(messageIndex => {
            const responseKey = `background_response_${currentUser}_${currentChatId}_${messageIndex}`;
            const backgroundData = JSON.parse(localStorage.getItem(responseKey));
            
            if (backgroundData && backgroundData.response) {
                setTimeout(() => {
                    checkAndShowBackgroundResponse(messageIndex);
                }, 1000);
            }
        });
    }
}

// WEB SEARCH FUNCTIONS
function setupWebSearchButton() {
    const webSearchToggle = document.createElement('button');
    webSearchToggle.id = 'webSearchToggle';
    webSearchToggle.className = 'chat-control-btn';
    webSearchToggle.title = 'Toggle web search';
    webSearchToggle.innerHTML = '<i class="fas fa-globe"></i>';
    
    const chatControls = document.querySelector('.chat-controls');
    if (chatControls) chatControls.insertBefore(webSearchToggle, sendBtn);
    
    webSearchToggle.addEventListener('click', toggleWebSearch);
    updateWebSearchButton();
}

function toggleWebSearch() {
    webSearchEnabled = !webSearchEnabled;
    localStorage.setItem('webSearchEnabled', webSearchEnabled);
    updateWebSearchButton();
    
    showToast(webSearchEnabled ? 'Web search enabled' : 'Web search disabled', 'info');
}

function updateWebSearchButton() {
    const webSearchToggle = document.getElementById('webSearchToggle');
    if (!webSearchToggle) return;
    
    webSearchToggle.classList.toggle('active', webSearchEnabled);
}

// NOTE SENDING FUNCTIONS
function setupNoteSending() {
    const style = document.createElement('style');
    style.textContent = `
        .note-select-item {
            display: flex;
            align-items: flex-start;
            padding: 12px;
            margin-bottom: 8px;
            background: rgba(138, 43, 226, 0.1);
            border-radius: 6px;
            border: 1px solid rgba(138, 43, 226, 0.2);
            cursor: pointer;
        }
        
        .note-select-item:hover {
            background: rgba(138, 43, 226, 0.2);
        }
        
        #attachmentPreview {
            margin-bottom: 10px;
            padding: 10px;
            background: rgba(138, 43, 226, 0.1);
            border: 1px solid rgba(138, 43, 226, 0.3);
            border-radius: 8px;
        }
    `;
    document.head.appendChild(style);
}

// Function to load notes from notes.html
async function loadNotesForSending() {
    const currentUser = getCurrentUser();
    if (currentUser === 'Guest') {
        showToast('Please log in to send notes', 'warning');
        return [];
    }
    
    const notesKey = `studentAI_notes_${currentUser}`;
    try {
        const notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
        console.log('📝 Loaded notes for sending:', notes.length);
        
        // Update the notes modal with loaded notes
        updateNotesModal(notes);
        
        return notes;
    } catch (e) {
        console.error('Error loading notes:', e);
        showToast('Error loading notes', 'error');
        return [];
    }
}

// Update the notes modal with loaded notes
function updateNotesModal(notes) {
    const notesList = document.getElementById('notesList');
    if (!notesList) return;
    
    notesList.innerHTML = '';
    
    if (notes.length === 0) {
        notesList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #6b7299;">
                <i class="fas fa-sticky-note" style="font-size: 2rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>No notes yet</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Create notes in the Notes section first</p>
            </div>
        `;
        return;
    }
    
    // Store notes globally for the modal
    currentNotesInModal = notes;
    
    notes.forEach((note, index) => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-select-item';
        noteItem.dataset.index = index;
        
        const timestamp = new Date(note.timestamp);
        const now = new Date();
        const isToday = timestamp.toDateString() === now.toDateString();
        const timeDisplay = isToday ? 
            `Today ${timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` :
            timestamp.toLocaleDateString();
        
        // Truncate content for preview
        const previewContent = note.content.length > 100 
            ? note.content.substring(0, 100) + '...' 
            : note.content;
        
        noteItem.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px; width: 100%;">
                <div style="
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #8a2be2, #00ffff);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.2rem;
                    flex-shrink: 0;
                ">
                    <i class="fas fa-sticky-note"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <strong style="font-size: 0.95rem; color: white;">${escapeHtml(note.title)}</strong>
                        <span style="font-size: 0.7rem; color: #6b7299;">${timeDisplay}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: #a0a8d6; margin-bottom: 8px; 
                                max-height: 40px; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(previewContent)}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="send-note-btn" data-index="${index}" title="Send this note">
                            <i class="fas fa-paper-plane"></i> Send
                        </button>
                        <button class="view-note-btn" data-index="${index}" title="View full note">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        notesList.appendChild(noteItem);
    });
    
    // Add event listeners for send buttons
    document.querySelectorAll('.send-note-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.send-note-btn').dataset.index);
            sendSingleNote(index);
        });
    });
    
    // Add event listeners for view buttons
    document.querySelectorAll('.view-note-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.view-note-btn').dataset.index);
            viewNote(index);
        });
    });
}

// Function to send a single note
function sendSingleNote(index) {
    if (index < 0 || index >= currentNotesInModal.length) {
        showToast('Note not found', 'error');
        return;
    }
    
    const note = currentNotesInModal[index];
    
    // Add to pending attachments
    pendingAttachments.push({
        type: 'note',
        id: note.id || `note_${Date.now()}`,
        title: note.title || 'Untitled Note',
        content: note.content || '',
        timestamp: note.timestamp || new Date().toISOString(),
        description: `Note: ${note.title || 'Untitled Note'}`
    });
    
    // Close modal
    document.getElementById('notesModal')?.classList.remove('active');
    
    // Update input placeholder
    if (messageInput) {
        messageInput.placeholder = `Added note: ${note.title.substring(0, 30)}... Type your message here...`;
        messageInput.focus();
    }
    
    showToast(`Note "${note.title}" added to message`, 'success');
    showAttachmentPreview();
}

// Function to view a note
function viewNote(index) {
    if (index < 0 || index >= currentNotesInModal.length) {
        showToast('Note not found', 'error');
        return;
    }
    
    const note = currentNotesInModal[index];
    
    // Create a modal to view the full note
    const viewModal = document.createElement('div');
    viewModal.className = 'modal active';
    viewModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;
    
    const timestamp = new Date(note.timestamp);
    
    viewModal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, rgba(25, 25, 40, 0.95), rgba(20, 20, 35, 0.98));
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow: hidden;
            border: 1px solid rgba(138, 43, 226, 0.3);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        ">
            <div style="
                background: linear-gradient(135deg, #8a2be2, #00ffff);
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div>
                    <h3 style="margin: 0; color: white; font-size: 1.2rem;">
                        <i class="fas fa-sticky-note"></i> ${escapeHtml(note.title)}
                    </h3>
                    <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.8); font-size: 0.85rem;">
                        <i class="far fa-clock"></i> ${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}
                    </p>
                </div>
                <div>
                    <button id="sendThisNoteBtn" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        margin-right: 10px;
                    ">
                        <i class="fas fa-paper-plane"></i> Send
                    </button>
                    <button id="closeViewModal" style="
                        background: none;
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 1.2rem;
                    ">
                        ×
                    </button>
                </div>
            </div>
            <div style="padding: 20px; overflow-y: auto; max-height: calc(80vh - 80px);">
                <div style="
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 20px;
                    font-family: monospace;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    color: #e0e0e0;
                    line-height: 1.5;
                ">
                    ${escapeHtml(note.content).replace(/\n/g, '<br>')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(viewModal);
    
    // Add event listeners
    viewModal.querySelector('#sendThisNoteBtn').addEventListener('click', () => {
        viewModal.remove();
        sendSingleNote(index);
    });
    
    viewModal.querySelector('#closeViewModal').addEventListener('click', () => {
        viewModal.remove();
    });
    
    // Close when clicking outside
    viewModal.addEventListener('click', (e) => {
        if (e.target === viewModal) {
            viewModal.remove();
        }
    });
}

function showAttachmentPreview() {
    hideAttachmentPreview();
    
    if (pendingAttachments.length === 0) return;
    
    const preview = document.createElement('div');
    preview.id = 'attachmentPreview';
    
    let previewHTML = '<div style="font-size: 0.9rem; color: #a0a8d6; margin-bottom: 8px;"><i class="fas fa-paperclip"></i> Attached:</div>';
    previewHTML += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
    
    pendingAttachments.forEach((att, index) => {
        let icon = 'fa-file';
        let color = '#8a2be2';
        
        if (att.type === 'photo') {
            icon = 'fa-image';
            color = '#ff6b6b';
        } else if (att.type === 'note') {
            icon = 'fa-sticky-note';
            color = '#00ffff';
        }
        
        previewHTML += `
            <div style="
                background: ${color}20;
                border: 1px solid ${color}40;
                border-radius: 6px;
                padding: 6px 10px;
                font-size: 0.8rem;
                display: flex;
                align-items: center;
                gap: 6px;
            ">
                <i class="fas ${icon}" style="color: ${color};"></i>
                <span style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(att.name || att.title || 'Attachment')}
                </span>
                <button onclick="removeAttachment(${index})" style="
                    background: none;
                    border: none;
                    color: #ff6b6b;
                    cursor: pointer;
                    padding: 0;
                    margin-left: 4px;
                ">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    previewHTML += '</div>';
    preview.innerHTML = previewHTML;
    
    const chatControls = document.querySelector('.chat-controls');
    if (chatControls) {
        chatControls.parentNode.insertBefore(preview, chatControls);
    }
}

function hideAttachmentPreview() {
    const existingPreview = document.getElementById('attachmentPreview');
    if (existingPreview) {
        existingPreview.remove();
    }
}

function removeAttachment(index) {
    if (index >= 0 && index < pendingAttachments.length) {
        pendingAttachments.splice(index, 1);
        showAttachmentPreview();
        
        if (pendingAttachments.length === 0 && messageInput) {
            messageInput.placeholder = 'Type your message here...';
        }
    }
}

// UPDATE SEND BUTTON
function updateSendButton() {
    const icon = sendBtn?.querySelector('i');
    if (!icon) return;
    
    if (sendButtonMode === 'send') {
        icon.className = 'fas fa-paper-plane';
        if (sendBtn) sendBtn.title = 'Send message';
        if (sendBtn) sendBtn.disabled = false;
    } else if (sendButtonMode === 'pause') {
        icon.className = 'fas fa-pause';
        if (sendBtn) sendBtn.title = 'Pause AI typing';
        if (sendBtn) sendBtn.disabled = false;
    } else if (sendButtonMode === 'resume') {
        icon.className = 'fas fa-play';
        if (sendBtn) sendBtn.title = 'Resume AI typing';
        if (sendBtn) sendBtn.disabled = false;
    }
}

function handleSendButton() {
    if (sendButtonMode === 'send') {
        sendMessage();
    } else if (sendButtonMode === 'pause') {
        typingPaused = true;
        sendButtonMode = 'resume';
        updateSendButton();
    } else if (sendButtonMode === 'resume') {
        typingPaused = false;
        sendButtonMode = 'pause';
        updateSendButton();
        if (currentTypingMessage) {
            continueTyping(currentTypingMessage);
        }
    }
}

// RENDER ALL MESSAGES
function renderMessages() {
    if (!chatMessages) return;
    chatMessages.innerHTML = '';
    currentMessages.forEach((msg, index) => {
        renderMessage(msg, index);
    });
}

// ATTACHMENT FUNCTIONS
function openAttachmentModal(type) {
    if (type === 'camera') {
        document.getElementById('cameraModal')?.classList.add('active');
        startCamera();
    } else if (type === 'photo') {
        document.getElementById('photoModal')?.classList.add('active');
        const previewContainer = document.getElementById('photoPreviewContainer');
        const preview = document.getElementById('photoPreview');
        const description = document.getElementById('photoDescription');
        if (previewContainer) previewContainer.style.display = 'none';
        if (preview) preview.src = '';
        if (description) description.value = '';
    } else if (type === 'file') {
        document.getElementById('fileModal')?.classList.add('active');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileDescription = document.getElementById('fileDescription');
        if (fileInfo) fileInfo.style.display = 'none';
        if (fileName) fileName.textContent = '';
        if (fileDescription) fileDescription.value = '';
    } else if (type === 'notes') {
        document.getElementById('notesModal')?.classList.add('active');
        loadNotesForSending();
    }
}

async function startCamera() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('Camera not supported on this device', 'error');
            document.getElementById('cameraModal')?.classList.remove('active');
            return;
        }
        
        const constraints = {
            video: { facingMode: facingMode },
            audio: false
        };
        
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('cameraVideo');
        if (video) video.srcObject = cameraStream;
    } catch (error) {
        showToast('Cannot access camera. Please check permissions.', 'error');
        document.getElementById('cameraModal')?.classList.remove('active');
    }
}

function switchCamera() {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera();
}

function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('photoCanvas');
    if (!video || !canvas) return;
    
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob(blob => {
        const timestamp = new Date().toISOString();
        const file = new File([blob], `photo_${timestamp.replace(/[:.]/g, '-')}.png`, { type: 'image/png' });
        const preview = URL.createObjectURL(blob);
        
        pendingAttachments.push({
            type: 'photo',
            name: file.name,
            preview: preview,
            file: file,
            description: '',
            timestamp: timestamp
        });
        
        document.getElementById('cameraModal')?.classList.remove('active');
        document.getElementById('photoModal')?.classList.add('active');
        
        const previewContainer = document.getElementById('photoPreviewContainer');
        const photoPreview = document.getElementById('photoPreview');
        const photoDescription = document.getElementById('photoDescription');
        
        if (previewContainer) previewContainer.style.display = 'block';
        if (photoPreview) photoPreview.src = preview;
        if (photoDescription) {
            photoDescription.value = '';
            photoDescription.focus();
        }
        
        stopCamera();
        showToast('Photo captured! Add a description.', 'success');
    }, 'image/png');
}

function usePhoto() {
    const description = document.getElementById('photoDescription')?.value.trim() || '';
    if (pendingAttachments.length > 0) {
        const lastAttachment = pendingAttachments[pendingAttachments.length - 1];
        lastAttachment.description = description;
        
        if (messageInput) {
            messageInput.value = description ? description + ' ' : '';
            messageInput.focus();
            autoResizeTextarea();
        }
        
        document.getElementById('photoModal')?.classList.remove('active');
        showToast('Photo attached. Send your message.', 'success');
        showAttachmentPreview();
    }
}

function handlePhotoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('File too large. Maximum 5MB.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        pendingAttachments.push({
            type: 'photo',
            name: file.name,
            preview: e.target.result,
            file: file,
            description: '',
            timestamp: new Date().toISOString()
        });
        
        const previewContainer = document.getElementById('photoPreviewContainer');
        const photoPreview = document.getElementById('photoPreview');
        const photoDescription = document.getElementById('photoDescription');
        
        if (previewContainer) previewContainer.style.display = 'block';
        if (photoPreview) photoPreview.src = e.target.result;
        if (photoDescription) {
            photoDescription.value = '';
            photoDescription.focus();
        }
    };
    reader.readAsDataURL(file);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('File too large. Maximum 5MB.', 'error');
        return;
    }
    
    pendingAttachments.push({
        type: 'file',
        name: file.name,
        file: file,
        description: '',
        timestamp: new Date().toISOString()
    });
    
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileDescription = document.getElementById('fileDescription');
    
    if (fileInfo) fileInfo.style.display = 'block';
    if (fileName) fileName.textContent = file.name;
    if (fileDescription) {
        fileDescription.value = '';
        fileDescription.focus();
    }
}

function uploadFile() {
    const description = document.getElementById('fileDescription')?.value.trim() || '';
    if (pendingAttachments.length > 0) {
        const lastAttachment = pendingAttachments[pendingAttachments.length - 1];
        lastAttachment.description = description;
        
        if (messageInput) {
            messageInput.value = description ? description + ' ' : '';
            messageInput.focus();
            autoResizeTextarea();
        }
        
        document.getElementById('fileModal')?.classList.remove('active');
        showToast('File attached. Send your message.', 'success');
        showAttachmentPreview();
    }
}

// NAVIGATION - FIXED TYPO: windows.location.href -> window.location.href
function navigateTo(page) {
    saveCurrentChat();
    stopConnectionMonitoring();
    window.location.href = page; // Fixed typo: "windows" to "window"
}

function stopConnectionMonitoring() {
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
        connectionCheckInterval = null;
    }
}

// MAKE FUNCTIONS AVAILABLE GLOBALLY
window.navigateTo = navigateTo;
window.toggleVoiceRecognition = toggleVoiceRecognition;
window.createNewChat = createNewChat;
window.sendNoteToChat = sendNoteToChat;
window.sendSingleNote = sendSingleNote;
window.removeAttachment = removeAttachment;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
