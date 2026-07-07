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
        classReminderTime: 10,
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
    initialized: false,

    translations: {
        en: {},
        es: {
            'Home': 'Inicio',
            'Tools': 'Herramientas',
            'Settings': 'Configuracion',
            'Profile': 'Perfil',
            'Timetable': 'Horario',
            'Notes': 'Notas',
            'GPA': 'Promedio',
            'Novels': 'Novelas',
            'AI Assistant': 'Asistente IA',
            'General Settings': 'Configuracion general',
            'Theme': 'Tema',
            'Choose your preferred theme': 'Elige tu tema preferido',
            'Dark': 'Oscuro',
            'Light': 'Claro',
            'Auto (System)': 'Automatico (sistema)',
            'Language': 'Idioma',
            'Interface language': 'Idioma de la interfaz',
            'Accent Color': 'Color de acento',
            'Choose your primary color': 'Elige tu color principal',
            'Premium Subscription': 'Suscripcion premium',
            'Access premium features': 'Accede a funciones premium',
            'Subscribe Now': 'Suscribirse ahora',
            'Logout': 'Cerrar sesion',
            'Sign out of your account': 'Salir de tu cuenta',
            'Notifications': 'Notificaciones',
            'Enable Notifications': 'Activar notificaciones',
            'Receive notifications for important updates': 'Recibe notificaciones de actualizaciones importantes',
            'Save Settings': 'Guardar configuracion',
            'Reset Settings': 'Restablecer configuracion',
            'New Chat': 'Nuevo chat',
            'Recent Chats': 'Chats recientes',
            'Attach File': 'Adjuntar archivo',
            'Take Photo': 'Tomar foto',
            'Choose Photo': 'Elegir foto',
            'Ask about Notes': 'Preguntar sobre notas',
            'Message Student Companion AI...': 'Mensaje para Student Companion AI...',
            'Delete Note': 'Eliminar nota',
            'Save Note': 'Guardar nota',
            'Cancel': 'Cancelar',
            'Search': 'Buscar',
            'Premium Feature': 'Funcion premium'
        },
        fr: {
            'Home': 'Accueil',
            'Tools': 'Outils',
            'Settings': 'Parametres',
            'Profile': 'Profil',
            'Timetable': 'Emploi du temps',
            'Notes': 'Notes',
            'GPA': 'Moyenne',
            'Novels': 'Romans',
            'AI Assistant': 'Assistant IA',
            'General Settings': 'Parametres generaux',
            'Theme': 'Theme',
            'Choose your preferred theme': 'Choisissez votre theme prefere',
            'Dark': 'Sombre',
            'Light': 'Clair',
            'Auto (System)': 'Auto (systeme)',
            'Language': 'Langue',
            'Interface language': "Langue de l'interface",
            'Accent Color': "Couleur d'accent",
            'Choose your primary color': 'Choisissez votre couleur principale',
            'Premium Subscription': 'Abonnement premium',
            'Access premium features': 'Accedez aux fonctions premium',
            'Subscribe Now': "S'abonner",
            'Logout': 'Deconnexion',
            'Sign out of your account': 'Se deconnecter du compte',
            'Notifications': 'Notifications',
            'Enable Notifications': 'Activer les notifications',
            'Receive notifications for important updates': 'Recevoir les mises a jour importantes',
            'Save Settings': 'Enregistrer',
            'Reset Settings': 'Reinitialiser',
            'New Chat': 'Nouveau chat',
            'Recent Chats': 'Chats recents',
            'Attach File': 'Joindre un fichier',
            'Take Photo': 'Prendre une photo',
            'Choose Photo': 'Choisir une photo',
            'Ask about Notes': 'Question sur les notes',
            'Message Student Companion AI...': 'Message pour Student Companion AI...',
            'Delete Note': 'Supprimer la note',
            'Save Note': 'Enregistrer la note',
            'Cancel': 'Annuler',
            'Search': 'Rechercher',
            'Premium Feature': 'Fonction premium'
        },
        de: {
            'Home': 'Start',
            'Tools': 'Tools',
            'Settings': 'Einstellungen',
            'Profile': 'Profil',
            'Timetable': 'Stundenplan',
            'Notes': 'Notizen',
            'GPA': 'Notenschnitt',
            'Novels': 'Romane',
            'AI Assistant': 'KI-Assistent',
            'General Settings': 'Allgemeine Einstellungen',
            'Theme': 'Design',
            'Choose your preferred theme': 'Wahle dein bevorzugtes Design',
            'Dark': 'Dunkel',
            'Light': 'Hell',
            'Auto (System)': 'Automatisch (System)',
            'Language': 'Sprache',
            'Interface language': 'Sprache der Oberflache',
            'Accent Color': 'Akzentfarbe',
            'Choose your primary color': 'Wahle deine Hauptfarbe',
            'Premium Subscription': 'Premium-Abo',
            'Access premium features': 'Premium-Funktionen nutzen',
            'Subscribe Now': 'Jetzt abonnieren',
            'Logout': 'Abmelden',
            'Sign out of your account': 'Von deinem Konto abmelden',
            'Notifications': 'Benachrichtigungen',
            'Enable Notifications': 'Benachrichtigungen aktivieren',
            'Receive notifications for important updates': 'Wichtige Updates erhalten',
            'Save Settings': 'Einstellungen speichern',
            'Reset Settings': 'Zurucksetzen',
            'New Chat': 'Neuer Chat',
            'Recent Chats': 'Letzte Chats',
            'Attach File': 'Datei anhangen',
            'Take Photo': 'Foto aufnehmen',
            'Choose Photo': 'Foto auswahlen',
            'Ask about Notes': 'Zu Notizen fragen',
            'Message Student Companion AI...': 'Nachricht an Student Companion AI...',
            'Delete Note': 'Notiz loschen',
            'Save Note': 'Notiz speichern',
            'Cancel': 'Abbrechen',
            'Search': 'Suchen',
            'Premium Feature': 'Premium-Funktion'
        },
        pt: {
            'Home': 'Inicio',
            'Tools': 'Ferramentas',
            'Settings': 'Configuracoes',
            'Profile': 'Perfil',
            'Timetable': 'Horario',
            'Notes': 'Notas',
            'GPA': 'Media',
            'Novels': 'Romances',
            'AI Assistant': 'Assistente de IA',
            'General Settings': 'Configuracoes gerais',
            'Theme': 'Tema',
            'Choose your preferred theme': 'Escolha seu tema preferido',
            'Dark': 'Escuro',
            'Light': 'Claro',
            'Auto (System)': 'Automatico (sistema)',
            'Language': 'Idioma',
            'Interface language': 'Idioma da interface',
            'Accent Color': 'Cor de destaque',
            'Choose your primary color': 'Escolha sua cor principal',
            'Premium Subscription': 'Assinatura premium',
            'Access premium features': 'Acesse recursos premium',
            'Subscribe Now': 'Assinar agora',
            'Logout': 'Sair',
            'Notifications': 'Notificacoes',
            'Enable Notifications': 'Ativar notificacoes',
            'New Chat': 'Novo chat',
            'Recent Chats': 'Chats recentes',
            'Cancel': 'Cancelar',
            'Search': 'Pesquisar'
        },
        yo: {
            'Home': 'Ile',
            'Tools': 'Irinse',
            'Settings': 'Eto',
            'Profile': 'Profaili',
            'Timetable': 'Tabili akoko',
            'Notes': 'Awon akọsilẹ',
            'GPA': 'GPA',
            'Novels': 'Awon iwe itan',
            'AI Assistant': 'Oluranlowo AI',
            'General Settings': 'Eto gbogbogbo',
            'Theme': 'Akori',
            'Language': 'Ede',
            'Logout': 'Jade',
            'Notifications': 'Awon iwifunni',
            'New Chat': 'Iwiregbe tuntun',
            'Recent Chats': 'Awon iwiregbe to ṣẹṣẹ',
            'Cancel': 'Fagilee',
            'Search': 'Wa'
        },
        ha: {
            'Home': 'Gida',
            'Tools': 'Kayan aiki',
            'Settings': 'Saituna',
            'Profile': 'Bayanan martaba',
            'Timetable': 'Jadawali',
            'Notes': 'Bayanan rubutu',
            'GPA': 'GPA',
            'Novels': 'Littattafai',
            'AI Assistant': 'Mataimakin AI',
            'General Settings': 'Saitunan gaba daya',
            'Theme': 'Jigo',
            'Language': 'Harshe',
            'Logout': 'Fita',
            'Notifications': 'Sanarwa',
            'New Chat': 'Sabuwar hira',
            'Recent Chats': 'Hirarraki na baya',
            'Cancel': 'Soke',
            'Search': 'Nema'
        },
        ig: {
            'Home': 'Ulo',
            'Tools': 'Ngwaoru',
            'Settings': 'Ntọala',
            'Profile': 'Profaịlụ',
            'Timetable': 'Usoro oge',
            'Notes': 'Ndetu',
            'GPA': 'GPA',
            'Novels': 'Akwụkwọ akụkọ',
            'AI Assistant': 'Onye enyemaka AI',
            'General Settings': 'Ntọala izugbe',
            'Theme': 'Isiokwu',
            'Language': 'Asusu',
            'Logout': 'Puo',
            'Notifications': 'Ozi amamọkwa',
            'New Chat': 'Mkparịta uka ọhụrụ',
            'Recent Chats': 'Mkparịta uka nso nso',
            'Cancel': 'Kagbuo',
            'Search': 'Choo'
        }
    },

    // Initialize settings
    init: function() {
        if (this.initialized) return;
        this.initialized = true;
        console.log('Initializing SettingsManager...');
        this.loadSettings();
        this.applySettings();
        this.initEventListeners();
        this.initLanguageObserver();

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
        this.applyLanguage();
    },

    // Update UI with current settings
    updateSettingsUI: function() {
        // Theme select
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = this.current.theme;
        
        // Language select
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            this.ensureLanguageOptions(languageSelect);
            languageSelect.value = this.current.language;
        }
        
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
        
        // Selects
        const classReminderTime = document.getElementById('classReminderTime');
        if (classReminderTime) {
            classReminderTime.value = this.current.classReminderTime || 10;
        }
        
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
        const bottomNav = document.querySelector('.bottom-nav, .bottom-nav-container');
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

    ensureLanguageOptions: function(languageSelect) {
        const options = [
            ['en', 'English'],
            ['es', 'Spanish'],
            ['fr', 'French'],
            ['de', 'German'],
            ['pt', 'Portuguese'],
            ['yo', 'Yoruba'],
            ['ha', 'Hausa'],
            ['ig', 'Igbo']
        ];

        options.forEach(([value, label]) => {
            if (!languageSelect.querySelector(`option[value="${value}"]`)) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                languageSelect.appendChild(option);
            }
        });
    },

    getTranslation: function(key) {
        const language = this.current.language || 'en';
        return (this.translations[language] && this.translations[language][key]) || key;
    },

    rememberSourceText: function(element, value, attrName) {
        const sourceAttr = attrName ? `data-i18n-source-${attrName}` : 'data-i18n-source';
        if (!element.getAttribute(sourceAttr)) {
            element.setAttribute(sourceAttr, value);
        }
        return element.getAttribute(sourceAttr);
    },

    translateTextNodes: function(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE'].includes(parent.tagName)) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (parent.closest('[data-i18n-ignore], #chatMessages, #chatList, .message-content, .chat-messages')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });

        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);

        nodes.forEach((node) => {
            const parent = node.parentElement;
            const source = this.rememberSourceText(parent, node.textContent);
            const trimmed = source.trim();
            if (!trimmed) return;

            const translated = this.getTranslation(trimmed);
            const leading = source.match(/^\s*/)[0];
            const trailing = source.match(/\s*$/)[0];
            node.textContent = `${leading}${translated}${trailing}`;
        });
    },

    translateElementAttributes: function(root) {
        root.querySelectorAll('[placeholder], [aria-label], [title]').forEach((element) => {
            ['placeholder', 'aria-label', 'title'].forEach((attrName) => {
                const value = element.getAttribute(attrName);
                if (!value) return;
                const source = this.rememberSourceText(element, value, attrName);
                element.setAttribute(attrName, this.getTranslation(source));
            });
        });
    },

    applyLanguage: function() {
        document.documentElement.lang = this.current.language || 'en';
        document.documentElement.dir = 'ltr';

        const explicitElements = document.querySelectorAll('[data-i18n]');
        explicitElements.forEach((element) => {
            const key = element.getAttribute('data-i18n');
            if (key) element.textContent = this.getTranslation(key);
        });

        this.translateTextNodes(document.body);
        this.translateElementAttributes(document.body);
        document.dispatchEvent(new CustomEvent('settings-language-changed', {
            detail: { language: this.current.language || 'en' }
        }));
    },

    initLanguageObserver: function() {
        if (!window.MutationObserver || this.languageObserver) return;

        let timer = null;
        this.languageObserver = new MutationObserver((mutations) => {
            const hasAddedElements = mutations.some((mutation) =>
                Array.from(mutation.addedNodes).some((node) => node.nodeType === Node.ELEMENT_NODE)
            );
            if (!hasAddedElements) return;

            window.clearTimeout(timer);
            timer = window.setTimeout(() => this.applyLanguage(), 80);
        });

        this.languageObserver.observe(document.body, { childList: true, subtree: true });
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

        // Logout button
        const logoutButtons = document.querySelectorAll('#logoutBtnSettings, [data-action="logout"]');
        logoutButtons.forEach((logoutBtn) => {
            if (logoutBtn.dataset.settingsLogoutBound === 'true') return;
            logoutBtn.dataset.settingsLogoutBound = 'true';
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('Logout clicked in settings');
                if (confirm('Are you sure you want to log out?')) {
                    if (window.SupabaseAuthManager && typeof window.SupabaseAuthManager.logout === 'function') {
                        await window.SupabaseAuthManager.logout();
                    } else {
                        // Fallback for legacy logout
                        localStorage.removeItem('currentUser');
                        localStorage.removeItem('loginUser');
                        sessionStorage.removeItem('currentUser');
                        localStorage.removeItem('user_id');
                        window.location.href = 'login.html';
                    }
                }
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

        // Selects
        const classReminderTime = document.getElementById('classReminderTime');
        if (classReminderTime) {
            classReminderTime.addEventListener('change', (e) => {
                this.current.classReminderTime = parseInt(e.target.value);
                this.saveSettings();
                this.showNotification(`Reminder set to ${e.target.value} minutes`, 'success');
            });
        }

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

window.SettingsManager = SettingsManager;

// Auto-init if on a page that supports it
document.addEventListener('DOMContentLoaded', () => {
    SettingsManager.init();
});
