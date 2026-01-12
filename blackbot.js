 // blackbot.js - Student Companion AI Chat Interface - WITH MULTIMODAL FILE ANALYSIS
// Full updated version - Always connected with working voice recognition and complete notes integration
// WITH DOCUMENT/IMAGE ANALYSIS CAPABILITIES
// Configuration - UPDATED FOR GITHUB PAGES
const USE_BACKEND = true; // Always try to use backend
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.port === '5500' || // VS Code Live Server
                   window.location.port === '8080';   // Common dev server port

// FOR PRODUCTION - Use environment-based configuration
let BACKEND_BASE_URL = '';
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    BACKEND_BASE_URL = 'http://localhost:3000';
} else {
    BACKEND_BASE_URL = 'https://edutrack-ld26.onrender.com'; // Your Render backend
}

const API_URL = `${BACKEND_BASE_URL}/api/chat`;
const ENABLE_WEBSEARCH = true;
const SEARCH_API_URL = `${BACKEND_BASE_URL}/api/search`;
const IMAGE_ANALYSIS_URL = `${BACKEND_BASE_URL}/api/analyze-image`;
const DOCUMENT_ANALYSIS_URL = `${BACKEND_BASE_URL}/api/analyze-document`;
const MULTIMODAL_ANALYSIS_URL = `${BACKEND_BASE_URL}/api/analyze-multimodal`;
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
let availableNotes = [];
let notesSearchEnabled = true;

// File Analysis State
let fileAnalysisInProgress = false;
let analyzedFiles = new Map();

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
        
        /* Notes search and filter styles */
        .notes-search-container {
            margin-bottom: 15px;
        }
        
        .notes-search-input {
            width: 100%;
            padding: 10px 15px;
            background: rgba(25, 25, 40, 0.8);
            border: 1px solid rgba(138, 43, 226, 0.3);
            border-radius: 8px;
            color: white;
            font-size: 0.9rem;
        }
        
        .notes-search-input:focus {
            outline: none;
            border-color: #8a2be2;
            box-shadow: 0 0 0 2px rgba(138, 43, 226, 0.2);
        }
        
        .notes-filter-container {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .notes-filter-btn {
            flex: 1;
            padding: 8px;
            background: rgba(138, 43, 226, 0.1);
            border: 1px solid rgba(138, 43, 226, 0.3);
            border-radius: 6px;
            color: #a0a8d6;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 0.85rem;
        }
        
        .notes-filter-btn.active {
            background: rgba(138, 43, 226, 0.3);
            color: white;
            border-color: #8a2be2;
        }
        
        .notes-filter-btn:hover {
            background: rgba(138, 43, 226, 0.2);
        }
        
        .note-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 8px;
        }
        
        .note-tag {
            background: rgba(0, 255, 255, 0.1);
            color: #00ffff;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.7rem;
        }
        
        .empty-notes-message {
            text-align: center;
            padding: 40px 20px;
            color: #6b7299;
        }
        
        .empty-notes-message i {
            font-size: 3rem;
            margin-bottom: 15px;
            opacity: 0.5;
        }
        
        .create-note-btn {
            display: block;
            width: 100%;
            padding: 12px;
            margin-top: 20px;
            background: linear-gradient(135deg, #8a2be2, #00ffff);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.3s;
        }
        
        .create-note-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(138, 43, 226, 0.4);
        }
        
        /* Ask about notes section */
        .ask-about-notes-section {
            margin-top: 20px;
            padding: 15px;
            background: rgba(138, 43, 226, 0.05);
            border-radius: 10px;
            border-left: 4px solid #8a2be2;
        }
        
        .ask-about-notes-section h4 {
            margin-top: 0;
            color: #8a2be2;
            font-size: 1rem;
        }
        
        .ask-notes-btn {
            background: rgba(138, 43, 226, 0.2);
            border: 1px solid rgba(138, 43, 226, 0.4);
            color: #8a2be2;
            padding: 8px 15px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            margin-right: 10px;
            margin-bottom: 10px;
            transition: all 0.3s;
        }
        
        .ask-notes-btn:hover {
            background: rgba(138, 43, 226, 0.4);
            color: white;
        }
        
        .notes-stats {
            font-size: 0.85rem;
            color: #6b7299;
            margin-bottom: 15px;
        }
        
        /* Note attachments preview */
        .note-attachment-preview {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 6px;
        }
        
        .attachment-thumbnail {
            width: 60px;
            height: 60px;
            border-radius: 6px;
            object-fit: cover;
            border: 2px solid rgba(138, 43, 226, 0.3);
        }
        
        .attachment-file {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(138, 43, 226, 0.1);
            border-radius: 6px;
            border: 1px solid rgba(138, 43, 226, 0.3);
        }
        
        .attachment-count {
            background: rgba(0, 255, 255, 0.2);
            color: #00ffff;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.7rem;
            margin-left: 5px;
        }
        
        /* File analysis styles */
        .file-analysis-in-progress {
            background: rgba(255, 193, 7, 0.1) !important;
            border: 1px solid rgba(255, 193, 7, 0.3) !important;
        }
        
        .file-analysis-complete {
            background: rgba(76, 175, 80, 0.1) !important;
            border: 1px solid rgba(76, 175, 80, 0.3) !important;
        }
        
        .file-analysis-failed {
            background: rgba(244, 67, 54, 0.1) !important;
            border: 1px solid rgba(244, 67, 54, 0.3) !important;
        }
        
        .file-analysis-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(138, 43, 226, 0.1);
            border-radius: 6px;
            margin-top: 10px;
            font-size: 0.85rem;
        }
        
        .file-analysis-indicator i {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .analyze-file-btn {
            background: linear-gradient(135deg, #ff6b6b, #ff8e53);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 10px;
            font-size: 0.75rem;
            cursor: pointer;
            margin-left: 8px;
            transition: all 0.3s;
        }
        
        .analyze-file-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
        }
        
        .analyze-file-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* Document type indicators */
        .file-type-indicator {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.7rem;
            margin-left: 8px;
        }
        
        .file-type-pdf {
            background: rgba(244, 67, 54, 0.2);
            color: #f44336;
            border: 1px solid rgba(244, 67, 54, 0.3);
        }
        
        .file-type-doc {
            background: rgba(33, 150, 243, 0.2);
            color: #2196f3;
            border: 1px solid rgba(33, 150, 243, 0.3);
        }
        
        .file-type-txt {
            background: rgba(76, 175, 80, 0.2);
            color: #4caf50;
            border: 1px solid rgba(76, 175, 80, 0.3);
        }
        
        .file-type-image {
            background: rgba(156, 39, 176, 0.2);
            color: #9c27b0;
            border: 1px solid rgba(156, 39, 176, 0.3);
        }
        
        /* File preview modal */
        .file-preview-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
        }
        
        .file-preview-content {
            background: rgba(25, 25, 40, 0.95);
            border-radius: 12px;
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            overflow: hidden;
            border: 1px solid rgba(138, 43, 226, 0.3);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        
        .file-preview-header {
            background: linear-gradient(135deg, #8a2be2, #00ffff);
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .file-preview-body {
            padding: 25px;
            overflow-y: auto;
            max-height: calc(90vh - 100px);
        }
        
        .file-text-content {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 20px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
            color: #e0e0e0;
            line-height: 1.6;
            font-size: 0.9rem;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .file-image-preview {
            max-width: 100%;
            max-height: 400px;
            border-radius: 8px;
            object-fit: contain;
            margin: 0 auto;
            display: block;
        }
        
        /* Toast styles */
        .toast {
            background: linear-gradient(135deg, #8a2be2, #00ffff);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            margin-bottom: 10px;
            animation: fadeInUp 0.3s, fadeOut 0.3s 2.7s;
            max-width: 80%;
            text-align: center;
            font-size: 14px;
            pointer-events: none;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
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
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, duration);
}

// Helper function to convert base64 to blob
function base64ToBlob(base64, mimeType) {
    try {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    } catch (e) {
        console.error('Error converting base64 to blob:', e);
        return null;
    }
}

// Helper function to get file type indicator
function getFileTypeIndicator(fileName, mimeType) {
    if (!fileName) fileName = 'Unknown File';
    const extension = fileName.split('.').pop().toLowerCase();
    
    if (mimeType?.includes('pdf') || extension === 'pdf') {
        return { class: 'file-type-pdf', icon: 'fas fa-file-pdf', text: 'PDF' };
    } else if (mimeType?.includes('word') || extension === 'doc' || extension === 'docx') {
        return { class: 'file-type-doc', icon: 'fas fa-file-word', text: 'DOC' };
    } else if (mimeType?.includes('text') || extension === 'txt') {
        return { class: 'file-type-txt', icon: 'fas fa-file-alt', text: 'TXT' };
    } else if (mimeType?.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
        return { class: 'file-type-image', icon: 'fas fa-file-image', text: 'IMG' };
    } else {
        return { class: 'file-type-txt', icon: 'fas fa-file', text: 'FILE' };
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('🚀 Initializing Student Companion AI - Always Connected');
    console.log('🌐 Backend URL:', BACKEND_BASE_URL);
    console.log('📱 Mobile Device:', isMobileDevice);
    console.log('📄 Document Analysis Enabled: Yes');
    
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
    
    // Preload notes for quick access
    await preloadNotes();
    
    scrollToBottom();
}

// CONNECTION MANAGEMENT FUNCTIONS - FIXED CORS ISSUES
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
            `${BACKEND_BASE_URL}/`
        ];
        
        let connected = false;
        for (const endpoint of endpoints) {
            try {
                console.log(`🔍 Trying endpoint: ${endpoint}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout
                
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                        'Accept': 'application/json'
                    },
                    signal: controller.signal,
                    mode: 'cors',
                    credentials: 'omit' // Don't send cookies for CORS
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok || response.status === 200) {
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
        'notes': ['note', 'notes', 'summary', 'review notes', 'study notes', 'lecture notes'],
        'document': ['document', 'pdf', 'doc', 'docx', 'file', 'image', 'photo', 'scan', 'screenshot']
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
        // Check if we need to analyze files first
        const filesToAnalyze = attachments.filter(att => 
            (att.type === 'photo' || att.type === 'file') && 
            !att.analyzed && 
            !att.analysisInProgress
        );
        
        if (filesToAnalyze.length > 0) {
            // Analyze files first
            await analyzeFiles(filesToAnalyze, messageIndex);
            
            // Update attachments with analysis results
            const updatedAttachments = attachments.map(att => {
                const analyzedFile = analyzedFiles.get(att.id || att.name);
                if (analyzedFile) {
                    return {
                        ...att,
                        analyzed: true,
                        analysis: analyzedFile.analysis,
                        analysisText: analyzedFile.text || '',
                        mimeType: analyzedFile.mimeType
                    };
                }
                return att;
            });
            
            attachments = updatedAttachments;
        }
        
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

// FILE ANALYSIS FUNCTIONS
async function analyzeFiles(files, messageIndex) {
    console.log(`📊 Analyzing ${files.length} file(s)...`);
    
    if (files.length === 0) return;
    
    // Show analysis indicator
    showFileAnalysisIndicator(files, messageIndex);
    
    // Analyze each file
    const analysisPromises = files.map(async (file, index) => {
        try {
            console.log(`🔍 Analyzing file ${index + 1}: ${file.name || file.title}`);
            
            let analysisResult = null;
            
            if (file.type === 'photo' && file.data) {
                // Analyze image
                analysisResult = await analyzeImage(file);
            } else if (file.type === 'file' && file.file) {
                // Analyze document
                analysisResult = await analyzeDocument(file);
            } else if (file.preview && file.preview.startsWith('data:image')) {
                // Analyze image from preview
                analysisResult = await analyzeImage(file);
            }
            
            if (analysisResult) {
                analyzedFiles.set(file.id || file.name, {
                    ...analysisResult,
                    name: file.name || file.title,
                    type: file.type
                });
                
                // Update analysis indicator
                updateFileAnalysisIndicator(file.id || file.name, 'complete', analysisResult.analysis?.substring(0, 100) + '...', messageIndex);
                
                return analysisResult;
            }
        } catch (error) {
            console.error(`❌ Failed to analyze file ${file.name}:`, error);
            updateFileAnalysisIndicator(file.id || file.name, 'failed', error.message, messageIndex);
            throw error;
        }
    });
    
    try {
        await Promise.all(analysisPromises);
        console.log('✅ All files analyzed successfully');
    } catch (error) {
        console.error('❌ Some files failed to analyze:', error);
        showToast('Some files failed to analyze. AI will still respond.', 'warning');
    }
}

async function analyzeImage(file) {
    if (!USE_BACKEND || backendConnectionStatus !== 'connected') {
        return {
            analysis: `[Mock Analysis] Image: ${file.name || 'Untitled Image'}\n\nI can see this is an image. When connected to the backend with OpenAI Vision API, I can analyze images in detail, read text from images, and describe visual content.`,
            text: `Image file: ${file.name || 'Untitled Image'}`,
            mimeType: file.mimeType || 'image/jpeg'
        };
    }
    
    try {
        console.log(`🖼️ Sending image for analysis: ${file.name}`);
        
        // Prepare form data
        const formData = new FormData();
        
        // Convert base64 to blob if needed
        let imageBlob;
        if (file.data && file.data.startsWith('data:')) {
            // Base64 data
            imageBlob = base64ToBlob(file.data, file.mimeType || 'image/jpeg');
            if (!imageBlob) {
                throw new Error('Failed to convert base64 to blob');
            }
        } else if (file.file) {
            // File object
            imageBlob = file.file;
        } else if (file.preview && file.preview.startsWith('data:')) {
            // Preview base64
            imageBlob = base64ToBlob(file.preview, file.mimeType || 'image/jpeg');
            if (!imageBlob) {
                throw new Error('Failed to convert preview to blob');
            }
        } else {
            throw new Error('No image data available for analysis');
        }
        
        formData.append('image', imageBlob, file.name || 'image.jpg');
        formData.append('prompt', 'Analyze this image in detail. If there is text, read it. Describe what you see.');
        if (file.description) {
            formData.append('description', file.description);
        }
        
        const response = await fetch(IMAGE_ANALYSIS_URL, {
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Image analysis failed: ${errorText.substring(0, 100)}`);
        }
        
        const data = await response.json();
        console.log('✅ Image analysis completed');
        
        return {
            analysis: data.analysis,
            text: data.analysis, // For text extraction
            mimeType: data.mimeType || 'image/jpeg',
            fileName: data.fileName,
            fileSize: data.fileSize
        };
        
    } catch (error) {
        console.error('❌ Image analysis error:', error);
        
        // Fallback response
        return {
            analysis: `**Image Analysis**\n\nFile: ${file.name || 'Untitled Image'}\n\nI encountered an error analyzing this image. Here's what I can still help with:\n\n• Describe the file type and size\n• Help with general image-related questions\n• Provide study tips for visual materials\n\n*Error details: ${error.message.substring(0, 200)}*`,
            text: `Image file: ${file.name || 'Untitled Image'} (Analysis failed)`,
            mimeType: file.mimeType || 'image/jpeg'
        };
    }
}

async function analyzeDocument(file) {
    if (!USE_BACKEND || backendConnectionStatus !== 'connected') {
        return {
            analysis: `[Mock Analysis] Document: ${file.name}\n\nI can see this is a document file. When connected to the backend, I can read and analyze PDFs, Word documents, text files, and extract text content for study assistance.`,
            text: `Document file: ${file.name}\nSize: ${file.file ? formatFileSize(file.file.size) : 'Unknown size'}`,
            mimeType: file.mimeType || 'application/octet-stream'
        };
    }
    
    try {
        console.log(`📄 Sending document for analysis: ${file.name}`);
        
        // Prepare form data
        const formData = new FormData();
        
        if (!file.file) {
            throw new Error('No file object available for analysis');
        }
        
        formData.append('document', file.file, file.name);
        formData.append('prompt', 'Extract and analyze this document. Summarize the content and identify key points for study.');
        if (file.description) {
            formData.append('description', file.description);
        }
        
        const response = await fetch(DOCUMENT_ANALYSIS_URL, {
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Document analysis failed: ${errorText.substring(0, 100)}`);
        }
        
        const data = await response.json();
        console.log('✅ Document analysis completed');
        
        return {
            analysis: data.analysis,
            text: data.analysis, // Extracted text
            mimeType: data.fileType || file.mimeType || 'application/octet-stream',
            fileName: data.fileName,
            extractedLength: data.extractedLength
        };
        
    } catch (error) {
        console.error('❌ Document analysis error:', error);
        
        // Fallback response
        return {
            analysis: `**Document Analysis**\n\nFile: ${file.name}\nType: ${file.mimeType || 'Unknown'}\nSize: ${file.file ? formatFileSize(file.file.size) : 'Unknown'}\n\nI encountered an error analyzing this document. Here's what I can still help with:\n\n• Document organization tips\n• Study strategies for this file type\n• How to extract text manually\n\n*Error details: ${error.message.substring(0, 200)}*`,
            text: `Document file: ${file.name} (Analysis failed)`,
            mimeType: file.mimeType || 'application/octet-stream'
        };
    }
}

function showFileAnalysisIndicator(files, messageIndex) {
    const messageDiv = chatMessages?.querySelector(`[data-index="${messageIndex}"]`);
    if (!messageDiv) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'file-analysis-indicator';
    indicator.id = `file-analysis-${messageIndex}`;
    
    let html = `<div style="display: flex; align-items: center; gap: 8px; color: #ff8e53; font-size: 0.9rem;">
        <i class="fas fa-spinner"></i>
        <span>Analyzing ${files.length} file(s)...</span>
    </div>`;
    
    // Add individual file status
    html += `<div style="margin-top: 8px; font-size: 0.8rem; color: #a0a8d6;">`;
    files.forEach((file, index) => {
        const fileId = file.id || file.name || `file_${index}`;
        html += `<div id="file-status-${fileId.replace(/[^a-zA-Z0-9]/g, '-')}" 
                      class="file-analysis-in-progress"
                      style="padding: 4px 8px; margin: 2px 0; border-radius: 4px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-file"></i>
            <span style="flex: 1;">${file.name || file.title || 'File ' + (index + 1)}</span>
            <span style="font-size: 0.7rem; color: #ff8e53;">Analyzing...</span>
        </div>`;
    });
    html += `</div>`;
    
    indicator.innerHTML = html;
    messageDiv.appendChild(indicator);
    
    // Scroll to show the analysis indicator
    scrollToBottom();
}

function updateFileAnalysisIndicator(fileId, status, text = '', messageIndex) {
    const safeFileId = fileId.replace(/[^a-zA-Z0-9]/g, '-');
    const fileStatusElement = document.getElementById(`file-status-${safeFileId}`);
    
    if (!fileStatusElement) return;
    
    // Remove all status classes
    fileStatusElement.classList.remove('file-analysis-in-progress', 'file-analysis-complete', 'file-analysis-failed');
    
    // Add new status class
    fileStatusElement.classList.add(`file-analysis-${status}`);
    
    // Update text
    const statusSpan = fileStatusElement.querySelector('span:last-child');
    if (statusSpan) {
        let statusText = '';
        let icon = '';
        let color = '';
        
        switch(status) {
            case 'complete':
                statusText = '✓ Analyzed';
                icon = 'fas fa-check';
                color = '#4caf50';
                break;
            case 'failed':
                statusText = '✗ Failed';
                icon = 'fas fa-times';
                color = '#f44336';
                break;
            default:
                statusText = 'Analyzing...';
                icon = 'fas fa-spinner';
                color = '#ff8e53';
        }
        
        statusSpan.innerHTML = `<i class="${icon}" style="color: ${color};"></i> ${statusText}`;
        statusSpan.style.color = color;
    }
    
    // Update overall indicator if all files are done
    const indicator = document.getElementById(`file-analysis-${messageIndex}`);
    if (indicator) {
        const allFiles = indicator.querySelectorAll('[id^="file-status-"]');
        const allComplete = Array.from(allFiles).every(file => 
            file.classList.contains('file-analysis-complete') || 
            file.classList.contains('file-analysis-failed')
        );
        
        if (allComplete) {
            const header = indicator.querySelector('div:first-child');
            if (header) {
                header.innerHTML = `<i class="fas fa-check-circle" style="color: #4caf50;"></i>
                                    <span>File analysis complete</span>`;
            }
            
            // Add "View Analysis" button
            if (!indicator.querySelector('.view-analysis-btn')) {
                const viewBtn = document.createElement('button');
                viewBtn.className = 'view-analysis-btn';
                viewBtn.innerHTML = '<i class="fas fa-eye"></i> View Analysis';
                viewBtn.style.cssText = `
                    margin-top: 10px;
                    padding: 6px 12px;
                    background: rgba(138, 43, 226, 0.3);
                    border: 1px solid rgba(138, 43, 226, 0.5);
                    color: #8a2be2;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                `;
                viewBtn.onclick = () => viewFileAnalysis(fileId, messageIndex);
                indicator.appendChild(viewBtn);
            }
        }
    }
}

function viewFileAnalysis(fileId, messageIndex) {
    const fileData = analyzedFiles.get(fileId);
    if (!fileData) {
        showToast('File analysis not found', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'file-preview-modal';
    
    const fileType = getFileTypeIndicator(fileData.name, fileData.mimeType);
    
    modal.innerHTML = `
        <div class="file-preview-content">
            <div class="file-preview-header">
                <div>
                    <h3 style="margin: 0; color: white; font-size: 1.3rem;">
                        <i class="${fileType.icon}"></i> ${escapeHtml(fileData.name)}
                    </h3>
                    <div style="display: flex; gap: 15px; margin-top: 8px; font-size: 0.85rem;">
                        <span style="color: rgba(255,255,255,0.9);">
                            <i class="fas fa-file"></i> ${fileType.text} File
                        </span>
                        ${fileData.fileSize ? `
                            <span style="color: rgba(255,255,255,0.9);">
                                <i class="fas fa-weight-hanging"></i> ${formatFileSize(fileData.fileSize)}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <button id="closeFilePreview" style="
                    background: none;
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    ×
                </button>
            </div>
            <div class="file-preview-body">
                <h4 style="color: #8a2be2; margin-top: 0;">
                    <i class="fas fa-chart-bar"></i> AI Analysis Results
                </h4>
                <div style="
                    background: rgba(138, 43, 226, 0.1);
                    border-left: 4px solid #8a2be2;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    font-size: 0.9rem;
                    line-height: 1.6;
                ">
                    ${fileData.analysis ? md.render(fileData.analysis) : 'No analysis available'}
                </div>
                
                ${fileData.text && fileData.text.length > 0 ? `
                    <h4 style="color: #00ffff; margin-top: 20px;">
                        <i class="fas fa-font"></i> Extracted Content
                    </h4>
                    <div class="file-text-content">
                        ${escapeHtml(fileData.text.substring(0, 5000))}
                        ${fileData.text.length > 5000 ? '\n\n[Content truncated for preview]' : ''}
                    </div>
                ` : ''}
                
                <div style="margin-top: 20px; padding: 15px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
                    <h5 style="color: #a0a8d6; margin-top: 0; font-size: 0.9rem;">
                        <i class="fas fa-lightbulb"></i> What you can ask about this file:
                    </h5>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
                        <button class="quick-file-question" data-question="summarize" style="
                            padding: 6px 12px;
                            background: rgba(138, 43, 226, 0.2);
                            border: 1px solid rgba(138, 43, 226, 0.4);
                            color: #8a2be2;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        ">
                            Summarize this
                        </button>
                        <button class="quick-file-question" data-question="explain" style="
                            padding: 6px 12px;
                            background: rgba(0, 255, 255, 0.2);
                            border: 1px solid rgba(0, 255, 255, 0.4);
                            color: #00ffff;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        ">
                            Explain key points
                        </button>
                        <button class="quick-file-question" data-question="questions" style="
                            padding: 6px 12px;
                            background: rgba(255, 107, 107, 0.2);
                            border: 1px solid rgba(255, 107, 107, 0.4);
                            color: #ff6b6b;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        ">
                            Create study questions
                        </button>
                        <button class="quick-file-question" data-question="quiz" style="
                            padding: 6px 12px;
                            background: rgba(76, 175, 80, 0.2);
                            border: 1px solid rgba(76, 175, 80, 0.4);
                            color: #4caf50;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        ">
                            Make a quiz
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('#closeFilePreview').addEventListener('click', () => {
        modal.remove();
    });
    
    // Close when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Add quick question buttons
    modal.querySelectorAll('.quick-file-question').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionType = e.target.dataset.question;
            const fileName = fileData.name;
            
            const questions = {
                'summarize': `Can you summarize the key points from "${fileName}"?`,
                'explain': `Can you explain the main concepts in "${fileName}"?`,
                'questions': `Based on "${fileName}", create study questions to test understanding.`,
                'quiz': `Create a quiz based on the content of "${fileName}".`
            };
            
            const question = questions[questionType] || `Tell me more about "${fileName}".`;
            
            modal.remove();
            
            // Set the question in the input
            if (messageInput) {
                messageInput.value = question;
                autoResizeTextarea();
                messageInput.focus();
                
                // Send after a short delay
                setTimeout(() => {
                    sendMessage();
                }, 500);
            }
        });
    });
}

function isUserActive() {
    return document.visibilityState === 'visible' && 
           !document.hidden &&
           Date.now() - lastActivityTime < 30000;
}

// AI RESPONSE FUNCTIONS WITH NOTES INTEGRATION AND FILE ANALYSIS
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
        
        // Enhanced system prompt with notes and file analysis integration
        const systemPrompt = `You are an intelligent AI study assistant for students. Help with homework, study techniques, note organization, exam preparation, and programming. Be thorough and helpful. 

IMPORTANT FILE ANALYSIS CAPABILITIES:
1. You can analyze images and documents that users upload
2. When provided with image data, you can describe images in detail, read text from images, and analyze visual content
3. When provided with document files (PDF, DOCX, TXT), you can read and analyze the content
4. Use the analysis results to provide specific, detailed help
5. If multiple files are provided, analyze them together and find connections

IMPORTANT NOTES INTEGRATION:
1. When users ask about their notes, you can access their notes from localStorage
2. Help them organize, summarize, and study from their notes
3. Create study questions based on their notes
4. Help them prepare for exams using their notes
5. Suggest improvements to their note-taking`;

        let context = '';
        if (attachments && attachments.length > 0) {
            context = '\n\n**ATTACHMENTS PROVIDED BY USER:**\n';
            attachments.forEach((att, index) => {
                if (att.type === 'note') {
                    context += `\n---\n`;
                    context += `**NOTE ${index + 1}: ${att.title || 'Untitled Note'}**\n\n`;
                    context += `${att.content || ''}\n`;
                    context += `\n---\n`;
                } else if (att.type === 'file' || att.type === 'photo') {
                    context += `\n---\n`;
                    context += `**FILE ${index + 1}: ${att.name || 'File'}**\n`;
                    context += `Type: ${att.type === 'photo' ? 'Image' : 'Document'}\n`;
                    
                    if (att.analysis) {
                        context += `\n**AI ANALYSIS:**\n${att.analysis}\n`;
                    }
                    
                    if (att.analysisText) {
                        context += `\n**EXTRACTED CONTENT (preview):**\n${att.analysisText.substring(0, 500)}${att.analysisText.length > 500 ? '...' : ''}\n`;
                    }
                    
                    if (att.description) {
                        context += `Description: ${att.description}\n`;
                    }
                    
                    context += `\n---\n`;
                }
            });
        }
        
        // Check if user is asking about notes
        const lowerMessage = message.toLowerCase();
        const noteKeywords = ['note', 'notes', 'my notes', 'study notes', 'lecture notes', 'summary', 'summarize', 'flashcard', 'flash cards'];
        const isAskingAboutNotes = noteKeywords.some(keyword => lowerMessage.includes(keyword));
        
        if (isAskingAboutNotes && !attachments.some(a => a.type === 'note')) {
            // User is asking about notes but hasn't attached any
            const userNotes = await loadNotesForSending();
            if (userNotes.length > 0) {
                context += `\n\n**USER'S AVAILABLE NOTES (from notes.html):**\n`;
                userNotes.forEach((note, index) => {
                    if (index < 5) { // Only show first 5 notes in context
                        context += `\n---\n`;
                        context += `**NOTE ${index + 1}: ${note.title || 'Untitled Note'}**\n`;
                        context += `Tags: ${note.tags ? note.tags.join(', ') : 'No tags'}\n`;
                        context += `Created: ${new Date(note.timestamp).toLocaleDateString()}\n`;
                        // Include first 200 chars of content
                        const preview = note.content.substring(0, 200) + (note.content.length > 200 ? '...' : '');
                        context += `Preview: ${preview}\n`;
                        context += `\n---\n`;
                    }
                });
                
                if (userNotes.length > 5) {
                    context += `\n... and ${userNotes.length - 5} more notes available.\n`;
                }
            }
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
        const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased timeout
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    max_tokens: 3000, // Increased for file analysis
                    temperature: 0.7,
                    user: currentUser,
                    attachments: attachments.filter(att => att.type === 'photo' || att.type === 'file'),
                    notes_context: isAskingAboutNotes // Flag for backend to know we're asking about notes
                }),
                signal: controller.signal,
                mode: 'cors',
                credentials: 'omit' // Important for CORS
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
        const analyzedFiles = attachments.filter(a => (a.type === 'photo' || a.type === 'file') && a.analyzed);
        const noteAttachments = attachments.filter(a => a.type === 'note');
        
        if (analyzedFiles.length > 0) {
            response += `📊 **I analyzed ${analyzedFiles.length} file(s):**\n\n`;
            
            analyzedFiles.forEach((file, index) => {
                response += `**File ${index + 1}: ${file.name || 'Untitled File'}**\n`;
                response += `Type: ${file.type === 'photo' ? 'Image' : 'Document'}\n`;
                
                if (file.analysis) {
                    const preview = file.analysis.substring(0, 150) + (file.analysis.length > 150 ? '...' : '');
                    response += `Analysis: ${preview}\n`;
                }
                
                response += `\n`;
            });
            
            response += `**I can help you:**\n`;
            response += `• Summarize these documents\n`;
            response += `• Extract key information\n`;
            response += `• Create study questions from the content\n`;
            response += `• Compare multiple documents\n\n`;
        }
        
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
        response += `*Note: Currently in offline mode. Connect to backend for enhanced AI capabilities and file analysis.*`;
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
    
    // Check if we have files to analyze
    const hasFilesToAnalyze = pendingAttachments.some(att => 
        (att.type === 'photo' || att.type === 'file') && !att.analyzed
    );
    
    thinkingDiv.innerHTML = `
        <div class="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
        ${webSearchEnabled ? '<span style="margin-left: 8px; color: #ff6b6b;"><i class="fas fa-search"></i> Web</span>' : ''}
        ${hasFilesToAnalyze ? '<span style="margin-left: 8px; color: #ff8e53;"><i class="fas fa-file"></i> Analyzing Files</span>' : ''}
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
    
  
    welcomeText += `**I can help you with:**\n`;
    welcomeText += `• 📚 Homework and assignments\n`;
    welcomeText += `• 🧠 Study techniques and organization\n`;
    welcomeText += `• 📝 Note analysis and summaries (ask about your notes!)\n`;
    welcomeText += `• 📊 Exam preparation strategies\n`;
    welcomeText += `• 💻 Programming and coding help\n`;
    welcomeText += `• 🖼️ **Image analysis** - upload photos, screenshots, diagrams\n`;
    welcomeText += `• 📄 **Document analysis** - PDFs, Word docs, text files\n`;
    welcomeText += `• 🔊 Voice input (click microphone)\n`;
    welcomeText += `• 📎 Attachments and file analysis\n\n`;
    
    welcomeText += `**Try saying or typing:**\n`;
    welcomeText += `• "Help me study for my math test"\n`;
    welcomeText += `• "Explain photosynthesis"\n`;
    welcomeText += `• "Help me organize my notes"\n`;
    welcomeText += `• "Analyze this document" (then attach a file)\n`;
    welcomeText += `• "What's in this image?" (then attach a photo)\n`;
    welcomeText += `• "Create a study schedule"\n`;
    welcomeText += `• "Ask about my notes"\n\n`;
    
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
    attachments.forEach((att, index) => {
        const fileId = att.id || att.name || `file_${index}`;
        const fileType = getFileTypeIndicator(att.name || att.title || 'File', att.mimeType);
        
        if (att.type === 'photo') {
            html += `
                <div style="margin-top: 12px; border-left: 3px solid #ff6b6b; padding-left: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <i class="fas fa-image" style="color: #ff6b6b;"></i>
                        <strong>${escapeHtml(att.name)}</strong>
                        <span class="file-type-indicator ${fileType.class}">
                            <i class="${fileType.icon}"></i> ${fileType.text}
                        </span>
                        ${att.description ? `<span style="font-size: 0.8rem; color: rgba(255,255,255,0.7);">- ${escapeHtml(att.description)}</span>` : ''}
                        ${(!att.analyzed && !att.analysisInProgress) ? `
                            <button class="analyze-file-btn" data-file-id="${fileId}" 
                                    onclick="analyzeSingleFile('${fileId}', ${currentMessages.findIndex(m => m.attachments?.includes(att))})">
                                <i class="fas fa-search"></i> Analyze
                            </button>
                        ` : ''}
                    </div>
                    ${att.preview ? `<img src="${att.preview}" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin: 8px 0;">` : ''}
                    ${att.analyzed ? `
                        <div style="margin-top: 8px; padding: 8px; background: rgba(76, 175, 80, 0.1); border-radius: 6px; border-left: 3px solid #4caf50;">
                            <div style="font-size: 0.8rem; color: #4caf50; margin-bottom: 4px;">
                                <i class="fas fa-check-circle"></i> Analyzed
                            </div>
                            <button onclick="viewFileAnalysis('${fileId}', ${currentMessages.findIndex(m => m.attachments?.includes(att))})" 
                                    style="padding: 4px 8px; background: rgba(76, 175, 80, 0.2); border: 1px solid #4caf50; color: #4caf50; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                                <i class="fas fa-eye"></i> View Analysis
                            </button>
                        </div>
                    ` : ''}
                    ${att.analysisInProgress ? `
                        <div style="margin-top: 8px; padding: 8px; background: rgba(255, 193, 7, 0.1); border-radius: 6px; border-left: 3px solid #ffc107;">
                            <div style="font-size: 0.8rem; color: #ffc107;">
                                <i class="fas fa-spinner fa-spin"></i> Analyzing...
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (att.type === 'file') {
            html += `
                <div style="margin-top: 12px; border-left: 3px solid #8a2be2; padding-left: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <i class="fas fa-file" style="color: #8a2be2;"></i>
                        <strong>${escapeHtml(att.name)}</strong>
                        <span class="file-type-indicator ${fileType.class}">
                            <i class="${fileType.icon}"></i> ${fileType.text}
                        </span>
                        ${att.description ? `<span style="font-size: 0.8rem; color: rgba(255,255,255,0.7);">- ${escapeHtml(att.description)}</span>` : ''}
                        ${(!att.analyzed && !att.analysisInProgress) ? `
                            <button class="analyze-file-btn" data-file-id="${fileId}" 
                                    onclick="analyzeSingleFile('${fileId}', ${currentMessages.findIndex(m => m.attachments?.includes(att))})">
                                <i class="fas fa-search"></i> Analyze
                            </button>
                        ` : ''}
                    </div>
                    ${att.file ? `<div style="font-size: 0.8rem; color: #a0a8d6;">Size: ${formatFileSize(att.file.size)}</div>` : ''}
                    ${att.analyzed ? `
                        <div style="margin-top: 8px; padding: 8px; background: rgba(76, 175, 80, 0.1); border-radius: 6px; border-left: 3px solid #4caf50;">
                            <div style="font-size: 0.8rem; color: #4caf50; margin-bottom: 4px;">
                                <i class="fas fa-check-circle"></i> Analyzed
                            </div>
                            <button onclick="viewFileAnalysis('${fileId}', ${currentMessages.findIndex(m => m.attachments?.includes(att))})" 
                                    style="padding: 4px 8px; background: rgba(76, 175, 80, 0.2); border: 1px solid #4caf50; color: #4caf50; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                                <i class="fas fa-eye"></i> View Analysis
                            </button>
                        </div>
                    ` : ''}
                    ${att.analysisInProgress ? `
                        <div style="margin-top: 8px; padding: 8px; background: rgba(255, 193, 7, 0.1); border-radius: 6px; border-left: 3px solid #ffc107;">
                            <div style="font-size: 0.8rem; color: #ffc107;">
                                <i class="fas fa-spinner fa-spin"></i> Analyzing...
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (att.type === 'note') {
            const attachmentCount = att.fileAttachments ? att.fileAttachments.length : 0;
            html += `
                <div style="margin-top: 12px; border-left: 3px solid #00ffff; padding-left: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <i class="fas fa-sticky-note" style="color: #00ffff;"></i>
                        <strong>${escapeHtml(att.title)}</strong>
                        ${attachmentCount > 0 ? `<span class="attachment-count">${attachmentCount} file${attachmentCount > 1 ? 's' : ''}</span>` : ''}
                        <span style="font-size: 0.7rem; color: #a0a8d6; margin-left: auto;">
                            <i class="fas fa-external-link-alt"></i> From Notes
                        </span>
                    </div>
                    ${att.description ? `<div style="font-size: 0.8rem; color: rgba(255,255,255,0.7); margin-bottom: 8px;">${escapeHtml(att.description)}</div>` : ''}
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

// NOTE SENDING FUNCTIONS - COMPLETE INTEGRATION WITH NOTES.HTML
function setupNoteSending() {
    console.log('📝 Setting up note sending integration...');
    
    // Check if we're coming from notes.html with a note to send
    checkForNoteFromUrl();
    
    // Add event listener for notes modal opening
    document.addEventListener('notesModalOpened', async () => {
        await loadNotesForSending();
    });
}

// Function to preload notes
async function preloadNotes() {
    const currentUser = getCurrentUser();
    if (currentUser === 'Guest') return;
    
    try {
        const notesKey = `studentAI_notes_${currentUser}`;
        availableNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');
        
        // Sort by timestamp, newest first
        availableNotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log(`📋 Preloaded ${availableNotes.length} notes from notes.html`);
    } catch (error) {
        console.error('Error preloading notes:', error);
        availableNotes = [];
    }
}

// Function to load notes WITH file attachments from notes.html
async function loadNotesForSending() {
    console.log('📝 Loading notes for sending...');
    
    const currentUser = getCurrentUser();
    if (currentUser === 'Guest') {
        showToast('Please log in to send notes', 'warning');
        return [];
    }
    
    try {
        const notesKey = `studentAI_notes_${currentUser}`;
        const notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
        
        // Sort by timestamp, newest first
        notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Load file attachments for each note
        const notesWithAttachments = await Promise.all(
            notes.map(async (note) => {
                try {
                    // Get attachments for this note
                    const noteAttachmentsKey = `note_attachments_${currentUser}_${note.id}`;
                    const attachments = JSON.parse(localStorage.getItem(noteAttachmentsKey) || '[]');
                    
                    // Process attachments
                    const processedAttachments = [];
                    
                    for (const att of attachments) {
                        if (att.type === 'photo' && att.data) {
                            try {
                                // For photos, keep the base64 data for preview
                                processedAttachments.push({
                                    type: 'photo',
                                    name: att.name || 'Photo',
                                    preview: att.data, // base64 for preview
                                    description: att.description || '',
                                    timestamp: att.timestamp || note.timestamp,
                                    data: att.data, // Store original data for sending
                                    mimeType: att.mimeType || 'image/jpeg',
                                    id: att.id || `photo_${Date.now()}`
                                });
                            } catch (e) {
                                console.error('Error processing photo:', e);
                            }
                        } else if (att.type === 'file' && att.data) {
                            processedAttachments.push({
                                type: 'file',
                                name: att.name || 'File',
                                description: att.description || '',
                                timestamp: att.timestamp || note.timestamp,
                                data: att.data, // base64 data
                                mimeType: att.mimeType || 'application/octet-stream',
                                id: att.id || `file_${Date.now()}`
                            });
                        }
                    }
                    
                    note.attachments = processedAttachments;
                    
                } catch (e) {
                    console.error('Error loading note attachments:', e);
                    note.attachments = [];
                }
                
                return note;
            })
        );
        
        console.log('📝 Loaded notes with attachments:', notesWithAttachments.length);
        
        // Update the notes modal with loaded notes
        updateNotesModal(notesWithAttachments);
        
        return notesWithAttachments;
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
    
    // Store notes globally for the modal
    currentNotesInModal = notes;
    
    // Add search and filter UI
    notesList.innerHTML = `
        <div class="notes-search-container">
            <input type="text" class="notes-search-input" placeholder="🔍 Search notes..." id="notesSearchInput">
        </div>
        <div class="notes-filter-container">
            <button class="notes-filter-btn active" data-filter="all">All Notes</button>
            <button class="notes-filter-btn" data-filter="recent">Recent</button>
            <button class="notes-filter-btn" data-filter="study">Study</button>
            <button class="notes-filter-btn" data-filter="lecture">Lecture</button>
        </div>
        <div id="notesListContent"></div>
    `;
    
    // Update content
    updateNotesListContent(notes);
    
    // Add search functionality
    const searchInput = document.getElementById('notesSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredNotes = notes.filter(note => 
                note.title.toLowerCase().includes(searchTerm) || 
                note.content.toLowerCase().includes(searchTerm) ||
                (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
            updateNotesListContent(filteredNotes);
        });
    }
    
    // Add filter functionality
    document.querySelectorAll('.notes-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            
            // Update active button
            document.querySelectorAll('.notes-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            let filteredNotes = [...notes];
            
            switch(filter) {
                case 'recent':
                    filteredNotes = notes.filter(note => {
                        const noteDate = new Date(note.timestamp);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return noteDate > weekAgo;
                    });
                    break;
                case 'study':
                    filteredNotes = notes.filter(note => 
                        (note.tags && note.tags.includes('study')) ||
                        note.title.toLowerCase().includes('study') ||
                        note.content.toLowerCase().includes('study')
                    );
                    break;
                case 'lecture':
                    filteredNotes = notes.filter(note => 
                        (note.tags && note.tags.includes('lecture')) ||
                        note.title.toLowerCase().includes('lecture') ||
                        note.content.toLowerCase().includes('lecture')
                    );
                    break;
                // 'all' shows all notes
            }
            
            updateNotesListContent(filteredNotes);
        });
    });
    
    // Add "Ask about notes" section
    const notesContainer = document.getElementById('notesListContent');
    if (notesContainer && notes.length > 0) {
        const askSection = document.createElement('div');
        askSection.className = 'ask-about-notes-section';
        askSection.innerHTML = `
            <h4><i class="fas fa-question-circle"></i> Ask About Your Notes</h4>
            <p class="notes-stats">You have ${notes.length} notes with ${notes.reduce((sum, note) => sum + (note.content.split(' ').length || 0), 0)} words total.</p>
            <div>
                <button class="ask-notes-btn" data-question="summarize">Summarize my notes</button>
                <button class="ask-notes-btn" data-question="organize">Organize my notes</button>
                <button class="ask-notes-btn" data-question="study">Create study questions</button>
                <button class="ask-notes-btn" data-question="flashcards">Make flashcards</button>
                <button class="ask-notes-btn" data-question="review">Review for exam</button>
            </div>
        `;
        
        notesContainer.after(askSection);
        
        // Add event listeners for ask buttons
        document.querySelectorAll('.ask-notes-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionType = e.target.dataset.question;
                askAboutNotes(questionType);
            });
        });
    }
}

function updateNotesListContent(notes) {
    const notesListContent = document.getElementById('notesListContent');
    if (!notesListContent) return;
    
    if (notes.length === 0) {
        notesListContent.innerHTML = `
            <div class="empty-notes-message">
                <i class="fas fa-sticky-note"></i>
                <p>No notes found</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Create notes in the Notes section first</p>
                <button class="create-note-btn" onclick="window.location.href='notes.html'">
                    <i class="fas fa-plus"></i> Create New Note
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    notes.forEach((note, index) => {
        const timestamp = new Date(note.timestamp);
        const now = new Date();
        const isToday = timestamp.toDateString() === now.toDateString();
        const isThisWeek = (now - timestamp) < 7 * 24 * 60 * 60 * 1000;
        
        let timeDisplay = '';
        if (isToday) {
            timeDisplay = `Today ${timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        } else if (isThisWeek) {
            const daysAgo = Math.floor((now - timestamp) / (24 * 60 * 60 * 1000));
            timeDisplay = `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
        } else {
            timeDisplay = timestamp.toLocaleDateString();
        }
        
        // Truncate content for preview
        const previewContent = note.content.length > 150 
            ? note.content.substring(0, 150) + '...' 
            : note.content;
        
        // Get word count
        const wordCount = note.content.split(' ').length;
        
        // Count attachments
        const attachmentCount = note.attachments ? note.attachments.length : 0;
        
        html += `
            <div class="note-select-item" data-index="${index}">
                <div style="display: flex; align-items: flex-start; gap: 12px; width: 100%;">
                    <div style="
                        width: 50px;
                        height: 50px;
                        background: linear-gradient(135deg, #8a2be2, #00ffff);
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 1.5rem;
                        flex-shrink: 0;
                    ">
                        <i class="fas fa-sticky-note"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                            <strong style="font-size: 1rem; color: white;">${escapeHtml(note.title)}</strong>
                            <span style="font-size: 0.7rem; color: #6b7299;">${timeDisplay}</span>
                        </div>
                        <div style="font-size: 0.85rem; color: #a0a8d6; margin-bottom: 8px; 
                                    max-height: 40px; overflow: hidden; text-overflow: ellipsis;">
                            ${escapeHtml(previewContent)}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="font-size: 0.75rem; color: #6b7299;">
                                    <i class="fas fa-font"></i> ${wordCount} words
                                </span>
                                ${attachmentCount > 0 ? `
                                    <span style="font-size: 0.75rem; color: #00ffff; margin-left: 8px;">
                                        <i class="fas fa-paperclip"></i> ${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''}
                                    </span>
                                ` : ''}
                                ${note.tags && note.tags.length > 0 ? `
                                    <div class="note-tags">
                                        ${note.tags.slice(0, 3).map(tag => `
                                            <span class="note-tag">${escapeHtml(tag)}</span>
                                        `).join('')}
                                        ${note.tags.length > 3 ? `<span class="note-tag">+${note.tags.length - 3}</span>` : ''}
                                    </div>
                                ` : ''}
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="send-note-btn" data-index="${index}" title="Send this note with attachments">
                                    <i class="fas fa-paper-plane"></i> Send
                                </button>
                                <button class="view-note-btn" data-index="${index}" title="View full note">
                                    <i class="fas fa-eye"></i> View
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    notesListContent.innerHTML = html;
    
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
    
    // Add click event to note items
    document.querySelectorAll('.note-select-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.send-note-btn') && !e.target.closest('.view-note-btn')) {
                const index = parseInt(e.currentTarget.dataset.index);
                viewNote(index);
            }
        });
    });
}

// Function to ask about notes (automatically sends a message about notes)
function askAboutNotes(questionType) {
    const questions = {
        'summarize': 'Can you summarize my notes for me?',
        'organize': 'Can you help me organize my notes?',
        'study': 'Can you create study questions from my notes?',
        'flashcards': 'Can you make flashcards from my notes?',
        'review': 'Can you help me review my notes for an exam?'
    };
    
    const question = questions[questionType] || 'Can you help me with my notes?';
    
    // Close the modal
    document.getElementById('notesModal')?.classList.remove('active');
    
    // Set the message input
    if (messageInput) {
        messageInput.value = question;
        autoResizeTextarea();
        messageInput.focus();
        
        // Send the message after a short delay
        setTimeout(() => {
            sendMessage();
        }, 500);
    }
}

// Function to send a single note WITH attachments
function sendSingleNote(index) {
    if (index < 0 || index >= currentNotesInModal.length) {
        showToast('Note not found', 'error');
        return;
    }
    
    const note = currentNotesInModal[index];
    
    // Add the note as an attachment
    const noteAttachment = {
        type: 'note',
        id: note.id || `note_${Date.now()}`,
        title: note.title || 'Untitled Note',
        content: note.content || '',
        timestamp: note.timestamp || new Date().toISOString(),
        tags: note.tags || [],
        description: `Note: ${note.title || 'Untitled Note'} (${note.content.split(' ').length} words)`,
        fileAttachments: note.attachments || []
    };
    
    pendingAttachments.push(noteAttachment);
    
    // Add any file attachments from the note
    if (note.attachments && note.attachments.length > 0) {
        note.attachments.forEach((attachment) => {
            pendingAttachments.push({
                type: attachment.type,
                id: attachment.id || `attachment_${Date.now()}`,
                name: attachment.name,
                data: attachment.data, // base64 data
                mimeType: attachment.mimeType,
                description: attachment.description || `Attachment from note: ${note.title}`,
                timestamp: attachment.timestamp,
                noteId: note.id // Reference to the note
            });
        });
    }
    
    // Close modal
    document.getElementById('notesModal')?.classList.remove('active');
    
    // Update input placeholder
    if (messageInput) {
        const totalItems = 1 + (note.attachments?.length || 0);
        messageInput.placeholder = `Added note (${totalItems} items) from: ${note.title.substring(0, 30)}... Type your message here...`;
        messageInput.focus();
    }
    
    showToast(`Note "${note.title}" with ${note.attachments?.length || 0} attachments added to message`, 'success');
    showAttachmentPreview();
}

// Function to view a note with attachments
function viewNote(index) {
    if (index < 0 || index >= currentNotesInModal.length) {
        showToast('Note not found', 'error');
        return;
    }
    
    const note = currentNotesInModal[index];
    
    // Create a modal to view the full note with attachments
    const viewModal = document.createElement('div');
    viewModal.className = 'modal active';
    
    const timestamp = new Date(note.timestamp);
    const wordCount = note.content.split(' ').length;
    const lineCount = note.content.split('\n').length;
    const attachmentCount = note.attachments ? note.attachments.length : 0;
    
    // Prepare attachments section
    let attachmentsHTML = '';
    if (attachmentCount > 0) {
        attachmentsHTML = `
            <div style="margin: 20px 0; padding: 15px; background: rgba(138, 43, 226, 0.1); border-radius: 8px; border-left: 3px solid #8a2be2;">
                <h4 style="margin-top: 0; color: #8a2be2; font-size: 1rem;">
                    <i class="fas fa-paperclip"></i> Note Attachments (${attachmentCount})
                </h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                    ${note.attachments.map((att, idx) => `
                        <div style="
                            background: rgba(255, 255, 255, 0.1);
                            border: 1px solid rgba(138, 43, 226, 0.3);
                            border-radius: 6px;
                            padding: 10px;
                            min-width: 120px;
                            text-align: center;
                        ">
                            <div style="font-size: 2rem; color: ${att.type === 'photo' ? '#ff6b6b' : '#8a2be2'}; margin-bottom: 5px;">
                                <i class="fas ${att.type === 'photo' ? 'fa-image' : 'fa-file'}"></i>
                            </div>
                            <div style="font-size: 0.8rem; color: white; overflow: hidden; text-overflow: ellipsis;">
                                ${escapeHtml(att.name)}
                            </div>
                            <div style="font-size: 0.7rem; color: #a0a8d6;">
                                ${att.type === 'photo' ? 'Image' : 'File'}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <p style="font-size: 0.85rem; color: #a0a8d6; margin-top: 10px; margin-bottom: 0;">
                    These attachments will be included when you send this note to chat.
                </p>
            </div>
        `;
    }
    
    viewModal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, rgba(25, 25, 40, 0.95), rgba(20, 20, 35, 0.98));
            border-radius: 12px;
            width: 90%;
            max-width: 800px;
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
                    <h3 style="margin: 0; color: white; font-size: 1.3rem;">
                        <i class="fas fa-sticky-note"></i> ${escapeHtml(note.title)}
                    </h3>
                    <div style="display: flex; gap: 15px; margin-top: 8px; font-size: 0.85rem;">
                        <span style="color: rgba(255,255,255,0.9);">
                            <i class="far fa-clock"></i> ${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}
                        </span>
                        <span style="color: rgba(255,255,255,0.9);">
                            <i class="fas fa-font"></i> ${wordCount} words
                        </span>
                        <span style="color: rgba(255,255,255,0.9);">
                            <i class="fas fa-paperclip"></i> ${attachmentCount} attachments
                        </span>
                    </div>
                </div>
                <div>
                    <button id="sendThisNoteBtn" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        margin-right: 10px;
                        font-size: 0.9rem;
                    ">
                        <i class="fas fa-paper-plane"></i> Send to Chat
                    </button>
                    <button id="closeViewModal" style="
                        background: none;
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 1.5rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        ×
                    </button>
                </div>
            </div>
            <div style="padding: 25px; overflow-y: auto; max-height: calc(80vh - 100px);">
                ${note.tags && note.tags.length > 0 ? `
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${note.tags.map(tag => `
                                <span style="
                                    background: rgba(0, 255, 255, 0.2);
                                    color: #00ffff;
                                    padding: 5px 12px;
                                    border-radius: 15px;
                                    font-size: 0.85rem;
                                    border: 1px solid rgba(0, 255, 255, 0.3);
                                ">
                                    ${escapeHtml(tag)}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${attachmentsHTML}
                
                <div style="
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 10px;
                    padding: 25px;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    color: #e0e0e0;
                    line-height: 1.6;
                    font-size: 1rem;
                ">
                    ${escapeHtml(note.content).replace(/\n/g, '<br>')}
                </div>
                <div style="margin-top: 20px; padding: 15px; background: rgba(138, 43, 226, 0.1); border-radius: 8px; border-left: 3px solid #8a2be2;">
                    <h4 style="margin-top: 0; color: #8a2be2; font-size: 1rem;">
                        <i class="fas fa-lightbulb"></i> What you can ask about this note:
                    </h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                        <button class="quick-question-btn" data-question="summarize">
                            Summarize this note
                        </button>
                        <button class="quick-question-btn" data-question="explain">
                            Explain concepts
                        </button>
                        <button class="quick-question-btn" data-question="questions">
                            Create study questions
                        </button>
                        <button class="quick-question-btn" data-question="flashcards">
                            Make flashcards
                        </button>
                    </div>
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
    
    // Add quick question buttons
    viewModal.querySelectorAll('.quick-question-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questionType = e.target.dataset.question;
            const noteTitle = note.title;
            
            const questions = {
                'summarize': `Can you summarize this note about "${noteTitle}"?`,
                'explain': `Can you explain the main concepts in this note about "${noteTitle}"?`,
                'questions': `Can you create study questions from this note about "${noteTitle}"?`,
                'flashcards': `Can you make flashcards from this note about "${noteTitle}"?`
            };
            
            const question = questions[questionType] || `Can you help me with this note about "${noteTitle}"?`;
            
            viewModal.remove();
            
            // Send the note and question
            sendSingleNote(index);
            
            // Set the question
            setTimeout(() => {
                if (messageInput) {
                    messageInput.value = question;
                    autoResizeTextarea();
                    messageInput.focus();
                    
                    // Send after another short delay
                    setTimeout(() => {
                        sendMessage();
                    }, 500);
                }
            }, 300);
        });
    });
    
    // Close when clicking outside
    viewModal.addEventListener('click', (e) => {
        if (e.target === viewModal) {
            viewModal.remove();
        }
    });
}

// Function to check if we're coming from notes.html with a note to send
function checkForNoteFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const noteId = urlParams.get('sendNote');
    
    if (noteId) {
        // Remove the parameter from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Load and send the note
        setTimeout(async () => {
            const notes = await loadNotesForSending();
            const noteIndex = notes.findIndex(note => note.id === noteId);
            
            if (noteIndex !== -1) {
                // Open notes modal and highlight the note
                openAttachmentModal('notes');
                
                // Scroll to and highlight the note
                setTimeout(() => {
                    const noteElement = document.querySelector(`[data-index="${noteIndex}"]`);
                    if (noteElement) {
                        noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        noteElement.style.animation = 'pulse 2s infinite';
                        
                        // Remove animation after 3 seconds
                        setTimeout(() => {
                            noteElement.style.animation = '';
                        }, 3000);
                    }
                }, 500);
            }
        }, 1000);
    }
}

// Function to send a note directly from notes.html
function sendNoteToChat(noteId) {
    // This function is called from notes.html
    // Redirect to chat.html with the note ID
    window.location.href = `chat.html?sendNote=${noteId}`;
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
        
        const fileType = getFileTypeIndicator(att.name || att.title || 'File', att.mimeType);
        
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
                position: relative;
            ">
                <i class="fas ${icon}" style="color: ${color};"></i>
                <span style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(att.name || att.title || 'Attachment')}
                </span>
                <span class="file-type-indicator ${fileType.class}" style="font-size: 0.6rem; padding: 1px 4px;">
                    <i class="${fileType.icon}"></i> ${fileType.text}
                </span>
                ${att.type === 'note' && att.fileAttachments && att.fileAttachments.length > 0 ? 
                    `<span class="attachment-count">${att.fileAttachments.length}</span>` : ''}
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

// Single file analysis function
async function analyzeSingleFile(fileId, messageIndex) {
    // Find the file in pending attachments or message attachments
    let fileToAnalyze = null;
    let attachmentIndex = -1;
    
    // First check pending attachments
    pendingAttachments.forEach((att, index) => {
        if ((att.id === fileId || att.name === fileId) && (att.type === 'photo' || att.type === 'file')) {
            fileToAnalyze = att;
            attachmentIndex = index;
        }
    });
    
    // If not found in pending, check current message
    if (!fileToAnalyze && currentMessages[messageIndex]) {
        currentMessages[messageIndex].attachments?.forEach((att, index) => {
            if ((att.id === fileId || att.name === fileId) && (att.type === 'photo' || att.type === 'file')) {
                fileToAnalyze = att;
                attachmentIndex = index;
            }
        });
    }
    
    if (!fileToAnalyze) {
        showToast('File not found', 'error');
        return;
    }
    
    // Mark as analyzing
    fileToAnalyze.analysisInProgress = true;
    
    // Update UI
    const analyzeBtn = document.querySelector(`[data-file-id="${fileId}"]`);
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    }
    
    try {
        let analysisResult = null;
        
        if (fileToAnalyze.type === 'photo') {
            analysisResult = await analyzeImage(fileToAnalyze);
        } else if (fileToAnalyze.type === 'file') {
            analysisResult = await analyzeDocument(fileToAnalyze);
        }
        
        if (analysisResult) {
            // Update the file object
            fileToAnalyze.analyzed = true;
            fileToAnalyze.analysisInProgress = false;
            fileToAnalyze.analysis = analysisResult.analysis;
            fileToAnalyze.analysisText = analysisResult.text;
            fileToAnalyze.mimeType = analysisResult.mimeType;
            
            // Store in analyzed files map
            analyzedFiles.set(fileId, {
                ...analysisResult,
                name: fileToAnalyze.name || fileToAnalyze.title,
                type: fileToAnalyze.type
            });
            
            // Update UI
            if (analyzeBtn) {
                analyzeBtn.innerHTML = '<i class="fas fa-check"></i> Analyzed';
                analyzeBtn.style.background = 'linear-gradient(135deg, #4caf50, #8bc34a)';
                
                // Add view analysis button
                const parentDiv = analyzeBtn.parentElement;
                if (parentDiv && !parentDiv.querySelector('.view-analysis-btn')) {
                    const viewBtn = document.createElement('button');
                    viewBtn.className = 'view-analysis-btn';
                    viewBtn.innerHTML = '<i class="fas fa-eye"></i> View';
                    viewBtn.style.cssText = `
                        margin-left: 8px;
                        padding: 4px 8px;
                        background: rgba(76, 175, 80, 0.2);
                        border: 1px solid #4caf50;
                        color: #4caf50;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.7rem;
                    `;
                    viewBtn.onclick = () => viewFileAnalysis(fileId, messageIndex);
                    parentDiv.appendChild(viewBtn);
                }
            }
            
            showToast('File analysis complete!', 'success');
            
            // Save changes
            saveCurrentChat();
        }
    } catch (error) {
        console.error('Single file analysis error:', error);
        fileToAnalyze.analysisInProgress = false;
        
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze';
        }
        
        showToast('Analysis failed: ' + error.message, 'error');
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
        // Trigger event to load notes
        const event = new Event('notesModalOpened');
        document.dispatchEvent(event);
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
            timestamp: timestamp,
            id: `photo_${Date.now()}`
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
    
    if (file.size > 10 * 1024 * 1024) { // Increased to 10MB for better image quality
        showToast('File too large. Maximum 10MB.', 'error');
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
            timestamp: new Date().toISOString(),
            id: `photo_${Date.now()}`,
            mimeType: file.type
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
    
    if (file.size > 10 * 1024 * 1024) { // Increased to 10MB for documents
        showToast('File too large. Maximum 10MB.', 'error');
        return;
    }
    
    // Check if it's a supported file type
    const supportedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ];
    
    if (!supportedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc|txt|jpg|jpeg|png|gif|webp)$/i)) {
        showToast('Unsupported file type. Please upload PDF, DOCX, TXT, or image files.', 'error');
        return;
    }
    
    // Determine if it's an image or document
    const isImage = file.type.startsWith('image/');
    
    pendingAttachments.push({
        type: isImage ? 'photo' : 'file',
        name: file.name,
        file: file,
        description: '',
        timestamp: new Date().toISOString(),
        id: `${isImage ? 'photo' : 'file'}_${Date.now()}`,
        mimeType: file.type
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
    
    // Show file type indicator
    const fileType = getFileTypeIndicator(file.name, file.type);
    if (fileName) {
        const typeSpan = document.createElement('span');
        typeSpan.className = `file-type-indicator ${fileType.class}`;
        typeSpan.innerHTML = `<i class="${fileType.icon}"></i> ${fileType.text}`;
        typeSpan.style.marginLeft = '8px';
        fileName.appendChild(typeSpan);
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

// NAVIGATION
function navigateTo(page) {
    saveCurrentChat();
    stopConnectionMonitoring();
    window.location.href = page;
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
window.analyzeSingleFile = analyzeSingleFile;
window.viewFileAnalysis = viewFileAnalysis;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
