/**
 * Shared utility functions for Student Companion
 */

// User Management
function getCurrentUser() {
    try {
        const userData = localStorage.getItem('currentUser');
        if (!userData) return null;
        return JSON.parse(userData);
    } catch (e) {
        console.error('Error parsing currentUser:', e);
        return null;
    }
}

function getStoredCurrentUserRaw() {
    return localStorage.getItem('currentUser') || '';
}

function parseCurrentUser() {
    return getCurrentUser();
}

function getUsernameFromUserData(userDataString) {
    if (!userDataString) return 'Guest';
    try {
        if (userDataString.startsWith('{')) {
            const data = JSON.parse(userDataString);
            return data.username || data.email || 'Guest';
        }
        return userDataString;
    } catch (e) {
        return userDataString;
    }
}

function getEmailFromUserData(userDataString) {
    if (!userDataString) return '';
    try {
        if (userDataString.startsWith('{')) {
            const data = JSON.parse(userDataString);
            return data.email || '';
        }
        return '';
    } catch (e) {
        return '';
    }
}

function getSettingsKeyCandidates(user = parseCurrentUser(), rawUser = getStoredCurrentUserRaw()) {
    const keys = new Set();
    const addKey = (value) => {
        if (typeof value === 'string' && value.trim()) {
            keys.add(value.trim());
        }
    };

    if (user) {
        addKey(user.email);
        addKey(user.id);
        addKey(user.username);
        addKey(user.firstName);
        addKey(user.name);
    }

    if (typeof rawUser === 'string' && !rawUser.startsWith('{')) {
        addKey(rawUser);
    }
    
    return [...keys].length > 0 ? [...keys] : ['guest'];
}

function logoutUser() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginUser');
    window.location.href = 'login.html';
}

// UI Utilities
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        // Fallback for pages without notification container
        const fallbackContainer = document.createElement('div');
        fallbackContainer.id = 'notificationContainer';
        fallbackContainer.style.cssText = 'position:fixed; top:20px; right:20px; z-index:9999;';
        document.body.appendChild(fallbackContainer);
        return showNotification(message, type);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(notification);

    // Style the notification if not already styled by CSS
    if (!getComputedStyle(notification).position || getComputedStyle(notification).position === 'static') {
        notification.style.cssText = `
            background: #fff;
            color: #333;
            padding: 12px 20px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            border-left: 4px solid ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
            transform: translateX(120%);
            transition: transform 0.3s ease;
        `;
    }

    setTimeout(() => {
        notification.classList.add('show');
        if (notification.style.transform) notification.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        if (notification.style.transform) notification.style.transform = 'translateX(120%)';
        setTimeout(() => {
            if (notification.parentNode === container) {
                container.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// --- AI Quota & Premium Management ---

function normalizeUsername(username) {
    if (!username) {
        const cur = getCurrentUser();
        if (!cur) return 'guest';
        if (typeof cur === 'string') return cur;
        return cur.username || cur.firstName || (cur.email ? cur.email.split('@')[0] : 'guest');
    }
    if (typeof username === 'object') {
        return username.username || username.firstName || (username.email ? username.email.split('@')[0] : 'guest');
    }
    return String(username);
}

function isPremiumUser(username) {
    username = normalizeUsername(username);
    
    // Check if the currently logged in user has the [PREMIUM] tag in their bio (granted by Admin Panel)
    const currentUser = getCurrentUser();
    if (currentUser && normalizeUsername(currentUser.username) === username && currentUser.bio && currentUser.bio.includes('[PREMIUM]')) {
        return true;
    }

    // Fallback to legacy subscription check
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const userData = users[username];
    if (!userData || !userData.subscription) return false;
    const sub = userData.subscription;
    return sub.active === true && sub.expiryDate && new Date(sub.expiryDate) > new Date();
}

function getUserQuota(username) {
    username = normalizeUsername(username);
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const userData = users[username] || {};
    if (!userData.ai_usage) {
        userData.ai_usage = { used: 0, limit: 15, extra: 0 };
        // Save back
        users[username] = userData;
        localStorage.setItem('users', JSON.stringify(users));
    }
    return userData.ai_usage;
}

function checkAndConsumeQuota(username) {
    username = normalizeUsername(username);
    if (isPremiumUser(username)) {
        return { allowed: true, remaining: Infinity, isPremium: true };
    }
    const quota = getUserQuota(username);
    const totalAllowed = quota.limit + (quota.extra || 0);
    if (quota.used >= totalAllowed) {
        return { allowed: false, remaining: 0, isPremium: false };
    }
    
    // Consume 1 unit
    quota.used += 1;
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    if (users[username]) {
        users[username].ai_usage = quota;
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    return { allowed: true, remaining: totalAllowed - quota.used, isPremium: false };
}

function addExtraQuota(username, amount) {
    username = normalizeUsername(username);
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const userData = users[username] || {};
    if (!userData.ai_usage) {
        userData.ai_usage = { used: 0, limit: 15, extra: 0 };
    }
    userData.ai_usage.extra = (userData.ai_usage.extra || 0) + amount;
    users[username] = userData;
    localStorage.setItem('users', JSON.stringify(users));
    return true;
}

