/**
 * ACE Student Companion - Notification System (Capacitor Optimized)
 * Handles native push notifications for Android/iOS and Web Push for PWA.
 */
window.AceNotifications = {
    async init() {
        console.log('Initializing notification system...');
        
        // 1. Check if we are running in Capacitor (Native App)
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
        
        if (isNative) {
            await this.initNativePush();
        } else {
            await this.initWebPush();
        }
    },

    /**
     * Initialize Native Push (Capacitor)
     */
    async initNativePush() {
        const { PushNotifications } = window.Capacitor.Plugins;

        if (!PushNotifications) {
            console.error('Push Notifications plugin not found. Please install @capacitor/push-notifications');
            return;
        }

        // Request permission
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            console.warn('User denied push permissions');
            return;
        }

        // Register for push
        await PushNotifications.register();

        // Listen for token registration
        PushNotifications.addListener('registration', async (token) => {
            console.log('Native Push Token:', token.value);
            await this.saveTokenToSupabase(token.value, window.Capacitor.getPlatform());
        });

        // Listen for errors
        PushNotifications.addListener('registrationError', (error) => {
            console.error('Push Registration Error:', error);
        });

        // Handle incoming notifications
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push Received:', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push Action:', notification);
        });
    },

    /**
     * Initialize Web Push (PWA)
     */
    async initWebPush() {
        if (!('serviceWorker' in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');

            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    console.log('Web Notification permission granted');
                }
            }
        } catch (error) {
            console.error('Web Push Init Failed:', error);
        }
    },

    /**
     * Save the device token to Supabase
     */
    async saveTokenToSupabase(token, platform) {
        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) return;

            const { error } = await window.supabase
                .from('user_push_tokens')
                .upsert({
                    user_id: user.id,
                    token: token,
                    platform: platform,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, token' });

            if (error) console.error('Error saving push token:', error);
            else console.log('Push token saved to Supabase');
        } catch (err) {
            console.error('Supabase token save failed:', err);
        }
    },

    /**
     * Send a local notification (works everywhere)
     */
    sendLocal(title, message) {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const { LocalNotifications } = window.Capacitor.Plugins;
            if (LocalNotifications) {
                LocalNotifications.schedule({
                    notifications: [{ title, body: message, id: 1 }]
                });
            }
        } else {
            if (Notification.permission === 'granted') {
                new Notification(title, { body: message });
            }
        }
    },

    /**
     * Show a UI toast notification
     */
    show(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) {
            console.warn('Notification container not found. Adding one to body.');
            const newContainer = document.createElement('div');
            newContainer.id = 'notificationContainer';
            document.body.appendChild(newContainer);
            return this.show(message, type);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';

        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
            <div class="notification-progress"></div>
        `;

        container.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => {
                if (notification.parentNode === container) {
                    container.removeChild(notification);
                }
            }, 500);
        }, 4000);
    }
};
