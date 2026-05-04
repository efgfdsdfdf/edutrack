/**
 * Centralized Settings and Theme Manager for Student Companion
 */

const SettingsManager = {
    // Default settings
    defaults: {
        theme: 'dark',
        language: 'en',
        accentColor: '#7b61ff',
        enableNotifications: true,
        classReminders: true,
        studyReminders: false,
        reminderSound: true,
        autoSync: true,
        dataBackup: true,
        analytics: false,
        focusMode: false,
        studyTimer: 45,
        breakDuration: 10,
        animations: true,
        hapticFeedback: true,
        reduceMotion: false
    },

    // Current settings
    current: {},

    // Initialize settings
    init: function() {
        console.log('Initializing SettingsManager...');
        this.loadSettings();
        this.applySettings();
        this.initEventListeners();

        // Live Sync between tabs
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.endsWith('_settings')) {
                this.loadSettings();
                this.applySettings();
            }
        });

        // Sync when tab gets focus
        window.addEventListener('focus', () => {
            this.loadSettings();
            this.applySettings();
        });

        // Listen for system theme changes if set to auto
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.current.theme === 'auto') {
                this.applyTheme();
            }
        });
    },

    // Load settings from localStorage
    loadSettings: function() {
        let userSettings = {};
        const keys = typeof getSettingsKeyCandidates === 'function' ? getSettingsKeyCandidates() : ['guest'];

        for (const key of keys) {
            try {
                const saved = localStorage.getItem(`${key}_settings`);
                if (saved) {
                    userSettings = JSON.parse(saved);
                    break;
                }
            } catch (e) {
                console.error(`Error parsing settings for key ${key}:`, e);
            }
        }
        
        // Merge with defaults
        this.current = { ...this.defaults, ...userSettings };
        
        // Update UI with loaded settings if on settings page/modal
        this.updateSettingsUI();
    },

    // Save settings to localStorage
    saveSettings: function() {
        const keys = typeof getSettingsKeyCandidates === 'function' ? getSettingsKeyCandidates() : ['guest'];
        
        keys.forEach(key => {
            localStorage.setItem(`${key}_settings`, JSON.stringify(this.current));
        });

        // Broadcast change (for other parts of the same page)
        this.applySettings();
    },

    // Apply settings to the page
    applySettings: function() {
        this.applyTheme();
        this.applyAccentColor();
        this.applyAnimations();
    },

    // Update UI with current settings
    updateSettingsUI: function() {
        // Theme select
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = this.current.theme;
        
        // Language select
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) languageSelect.value = this.current.language;
        
        // Color picker
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.color === this.current.accentColor) {
                option.classList.add('active');
            }
        });
        
        // Toggles
        const toggles = [
            'enableNotifications', 'classReminders', 'studyReminders', 'reminderSound',
            'autoSync', 'dataBackup', 'analytics', 'focusMode', 'animations',
            'hapticFeedback', 'reduceMotion'
        ];
        
        toggles.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.checked = this.current[id];
        });
        
        // Range sliders
        const studyTimer = document.getElementById('studyTimer');
        const timerValue = document.getElementById('timerValue');
        if (studyTimer && timerValue) {
            studyTimer.value = this.current.studyTimer;
            timerValue.textContent = `${this.current.studyTimer} minutes`;
        }
        
        const breakDuration = document.getElementById('breakDuration');
        const breakValue = document.getElementById('breakValue');
        if (breakDuration && breakValue) {
            breakDuration.value = this.current.breakDuration;
            breakValue.textContent = `${this.current.breakDuration} minutes`;
        }
    },

    // Apply theme to the page
    applyTheme: function() {
        document.body.classList.remove('theme-dark', 'theme-light');
        
        let theme = this.current.theme;
        
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        if (theme === 'light') {
            document.body.classList.add('theme-light');
        } else {
            document.body.classList.add('theme-dark');
        }
        
        // Specific UI adjustments for theme consistency
        this.adjustThemedElements(theme);
    },

    // Adjust specific elements that might need dynamic styling
    adjustThemedElements: function(theme) {
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            if (theme === 'light') {
                bottomNav.style.background = 'rgba(255, 255, 255, 0.95)';
                bottomNav.style.borderTop = '1px solid rgba(0, 0, 0, 0.1)';
            } else {
                bottomNav.style.background = 'rgba(15, 17, 20, 0.95)';
                bottomNav.style.borderTop = '1px solid rgba(255, 255, 255, 0.04)';
            }
        }

        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (theme === 'light') {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                navbar.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
            } else {
                navbar.style.background = 'rgba(15, 17, 20, 0.95)';
                navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.04)';
            }
        }
    },

    // Apply accent color
    applyAccentColor: function() {
        document.documentElement.style.setProperty('--mature-accent', this.current.accentColor);
        
        // Calculate a darker shade for accent-2
        const color = this.current.accentColor;
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            
            const darker = `#${Math.max(0, r - 40).toString(16).padStart(2, '0')}${Math.max(0, g - 40).toString(16).padStart(2, '0')}${Math.max(0, b - 40).toString(16).padStart(2, '0')}`;
            document.documentElement.style.setProperty('--mature-accent-2', darker);
        }
    },

    // Apply animation settings
    applyAnimations: function() {
        if (this.current.reduceMotion) {
            document.body.classList.add('reduce-motion');
        } else {
            document.body.classList.remove('reduce-motion');
        }
    },

    // Initialize event listeners for settings
    initEventListeners: function() {
        // Theme select
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.current.theme = e.target.value;
                this.saveSettings();
                this.showNotification('Theme applied', 'success');
            });
        }

        // Language select
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.current.language = e.target.value;
                this.saveSettings();
                this.showNotification('Language preference saved', 'success');
            });
        }

        // Color picker
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
                e.target.classList.add('active');
                this.current.accentColor = e.target.dataset.color;
                this.saveSettings();
                this.showNotification('Accent color applied', 'success');
            });
        });

        // Toggles
        const toggles = [
            'enableNotifications', 'classReminders', 'studyReminders', 'reminderSound',
            'autoSync', 'dataBackup', 'analytics', 'focusMode', 'animations',
            'hapticFeedback', 'reduceMotion'
        ];

        toggles.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.current[id] = e.target.checked;
                    this.saveSettings();
                    this.showNotification(`${id.replace(/([A-Z])/g, ' $1')} ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
                });
            }
        });

        // Range sliders
        const studyTimer = document.getElementById('studyTimer');
        const timerValue = document.getElementById('timerValue');
        if (studyTimer && timerValue) {
            studyTimer.addEventListener('input', (e) => {
                this.current.studyTimer = parseInt(e.target.value);
                timerValue.textContent = `${this.current.studyTimer} minutes`;
            });
            studyTimer.addEventListener('change', () => this.saveSettings());
        }

        const breakDuration = document.getElementById('breakDuration');
        const breakValue = document.getElementById('breakValue');
        if (breakDuration && breakValue) {
            breakDuration.addEventListener('input', (e) => {
                this.current.breakDuration = parseInt(e.target.value);
                breakValue.textContent = `${this.current.breakDuration} minutes`;
            });
            breakDuration.addEventListener('change', () => this.saveSettings());
        }

        // Reset settings
        const resetSettings = document.getElementById('resetSettings');
        if (resetSettings) {
            resetSettings.addEventListener('click', () => {
                if (confirm('Reset all settings to default values?')) {
                    this.current = { ...this.defaults };
                    this.updateSettingsUI();
                    this.saveSettings();
                    this.showNotification('Settings reset to defaults', 'success');
                }
            });
        }

        // Save settings button (explicit save)
        const saveSettingsBtn = document.getElementById('saveSettings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
                this.showNotification('Settings saved successfully', 'success');
            });
        }
    },

    // Helper for notifications
    showNotification: function(message, type) {
        if (window.AceNotifications && typeof window.AceNotifications.show === 'function') {
            window.AceNotifications.show(message, type);
        } else if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`Notification: [${type}] ${message}`);
        }
    }
};

// Auto-init if on a page that supports it
document.addEventListener('DOMContentLoaded', () => {
    SettingsManager.init();
});
