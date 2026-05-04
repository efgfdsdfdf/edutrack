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
    window.location.href = 'index.html';
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
