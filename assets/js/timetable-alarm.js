/**
 * ACE Student Companion - Timetable Alarm Manager
 * Uses Web Audio API to generate alarm tones (no external files needed).
 * Handles continuous audio ringing when the app is open
 * and schedules Native Push Notifications for when the app is closed.
 */
window.TimetableAlarmManager = {
    audioContext: null,
    oscillator: null,
    gainNode: null,
    checkInterval: null,
    isRinging: false,
    activeAlarms: new Set(),
    _initialized: false,
    _beepTimer: null,
    _activeOscillators: [],
    _fallbackAudio: null,
    _persistKey: 'timetableAlarmState',
    _modalId: 'timetable-alarm-modal',
    _swStateUrl: '/__timetable-alarm-state.json',

    init() {
        if (this._initialized) return;
        this._initialized = true;
        console.log('[TimetableAlarm] Initializing...');
        this.startChecking();
        this.scheduleNativeAlarms();
        this.registerBackgroundReminder();
        this.syncAlarmStateToServiceWorker();
        this.restoreAlarmFromStorage();

        // Ensure AudioContext is unlocked on first user interaction
        const unlock = () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
    },

    /**
     * Play a continuous alarm tone using Web Audio API.
     * No external files needed - generates a multi-frequency alarm pattern.
     */
    playAudio() {
        if (this.isRinging) return;
        this.isRinging = true;

        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            // Create oscillator for alarm beep pattern
            const ctx = this.audioContext;
            this.gainNode = ctx.createGain();
            this.gainNode.connect(ctx.destination);
            this.gainNode.gain.value = 0.5;

            // Start the alarm beep loop
            this._beepLoop(ctx);

        } catch (e) {
            console.warn('[TimetableAlarm] Web Audio API failed, trying fallback:', e);
            this._fallbackBeep();
        }
    },

    _beepLoop(ctx) {
        if (!this.isRinging) return;

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 880; // A5 note - sharp alarm sound
        osc.connect(this.gainNode);
        osc.start();
        osc.stop(ctx.currentTime + 0.15); // Beep for 150ms
        this._activeOscillators.push(osc);

        // Second beep at a higher pitch
        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.value = 1100;
        osc2.connect(this.gainNode);
        osc2.start(ctx.currentTime + 0.2);
        osc2.stop(ctx.currentTime + 0.35);
        this._activeOscillators.push(osc2);

        // Schedule next beep cycle
        this._beepTimer = setTimeout(() => {
            this._beepLoop(ctx);
        }, 600); // Repeat every 600ms
    },

    _fallbackBeep() {
        // Fallback: use an inline base64 WAV beep
        try {
            if (this._fallbackAudio) {
                this._fallbackAudio.pause();
                this._fallbackAudio.currentTime = 0;
            }
            const audio = new Audio('data:audio/wav;base64,UklGRl9vT19teleWQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==');
            audio.loop = true;
            audio.play().catch(() => {});
            this._fallbackAudio = audio;
        } catch(e) {}
    },

    stopAudio() {
        this.isRinging = false;
        if (this._beepTimer) {
            clearTimeout(this._beepTimer);
            this._beepTimer = null;
        }
        this._activeOscillators.forEach(osc => {
            try { osc.stop(); } catch(e) {}
            try { osc.disconnect(); } catch(e) {}
        });
        this._activeOscillators = [];
        if (this._fallbackAudio) {
            try { this._fallbackAudio.pause(); this._fallbackAudio.currentTime = 0; } catch(e) {}
            this._fallbackAudio = null;
        }
        if (this.gainNode) {
            try { this.gainNode.disconnect(); } catch(e) {}
            this.gainNode = null;
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            try { this.audioContext.suspend(); } catch(e) {}
        }
    },

    startChecking() {
        if (this.checkInterval) clearInterval(this.checkInterval);
        
        // Check every 30 seconds
        this.checkInterval = setInterval(() => {
            this.checkTimetable();
        }, 30000);
        
        // Initial check
        this.checkTimetable();
    },

    getUserId() {
        try {
            const userStr = localStorage.getItem('currentUser') || localStorage.getItem('loginUser');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.id || user.username || 'guest';
            }
        } catch (e) { }
        return 'guest';
    },

    getTimetableData() {
        const userId = this.getUserId();
        const keysToTry = [`${userId}_timetable`, 'guest_timetable'];
        
        for (const key of keysToTry) {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    return JSON.parse(data) || [];
                } catch (e) {
                    console.error('[TimetableAlarm] Failed to parse timetable data for key:', key);
                }
            }
        }
        return [];
    },

    checkTimetable() {
        if (this.isRinging) return; // Don't trigger if already ringing

        this.syncAlarmStateToServiceWorker();

        const timetable = this.getTimetableData();
        if (!timetable || timetable.length === 0) return;

        const now = new Date();
        const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        timetable.forEach(item => {
            if (!item.day || item.day !== currentDay) return;

            // Parse time (e.g., "09:00" or "09:00 AM" or "14:30")
            const rawTime = item.time || item.startTime || item.start_time || '';
            if (!rawTime) return;

            let [timeStr, modifier] = rawTime.split(' ');
            let [hours, minutes] = timeStr.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) return;

            if (modifier) {
                if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
            }

            const classTimeInMinutes = hours * 60 + minutes;
            const diffMinutes = classTimeInMinutes - currentTimeInMinutes;

            const itemKey = (item.id || item.courseCode || item.course || 'unknown');

            // Trigger at T-ReminderTime or T-0
            const reminderTime = (window.SettingsManager && window.SettingsManager.current) 
                ? (window.SettingsManager.current.classReminderTime || 10) 
                : 10;
            
            if ((diffMinutes >= (reminderTime - 1) && diffMinutes <= reminderTime) && !this.activeAlarms.has(itemKey + `_${reminderTime}`)) {
                this.triggerAlarm(item, reminderTime);
                this.activeAlarms.add(itemKey + `_${reminderTime}`);
            } else if ((diffMinutes >= 0 && diffMinutes <= 1) && !this.activeAlarms.has(itemKey + '_0')) {
                this.triggerAlarm(item, 0);
                this.activeAlarms.add(itemKey + '_0');
            }
        });
    },

    triggerAlarm(item, diffMinutes) {
        console.log('[TimetableAlarm] ⏰ TRIGGERING ALARM:', item.courseCode || item.course, 'diff:', diffMinutes);
        
        // 1. Play continuous audio
        this.playAudio();

        // 2. Show UI Modal
        this.showAlarmModal(item, diffMinutes);

        // 3. Send browser notification
        this._sendBrowserNotification(item, diffMinutes);
    },

    persistAlarm(item, diffMinutes) {
        const payload = { item, diffMinutes, createdAt: Date.now() };
        try {
            localStorage.setItem(this._persistKey, JSON.stringify(payload));
        } catch (e) {
            console.warn('[TimetableAlarm] Could not persist alarm state:', e);
        }
        this.syncAlarmStateToServiceWorker(payload);
    },

    async syncAlarmStateToServiceWorker(payload = null) {
        try {
            if (!('caches' in window) || !('serviceWorker' in navigator)) return;
            const statePayload = payload || {
                timetable: this.getTimetableData(),
                userId: this.getUserId(),
                updatedAt: Date.now()
            };
            const cache = await caches.open('ace-pwa-v25-dashboard-activity');
            await cache.put(this._swStateUrl, new Response(JSON.stringify(statePayload), {
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (e) {
            console.warn('[TimetableAlarm] Could not sync alarm state to service worker:', e);
        }
    },

    async registerBackgroundReminder() {
        try {
            if (!('serviceWorker' in navigator)) return;
            const registration = await navigator.serviceWorker.ready;
            if (!registration || !('periodicSync' in registration)) return;
            await registration.periodicSync.unregister('timetable-reminder').catch(() => {});
            await registration.periodicSync.register('timetable-reminder', { minInterval: 60000 });
            console.log('[TimetableAlarm] Registered background reminder sync.');
        } catch (e) {
            console.warn('[TimetableAlarm] Could not register background reminder sync:', e);
        }
    },

    clearPersistedAlarm() {
        try {
            localStorage.removeItem(this._persistKey);
        } catch (e) {}
    },

    restoreAlarmFromStorage() {
        try {
            const raw = localStorage.getItem(this._persistKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && parsed.item) {
                this.playAudio();
                this.showAlarmModal(parsed.item, parsed.diffMinutes);
            }
        } catch (e) {
            console.warn('[TimetableAlarm] Could not restore alarm:', e);
        }
    },

    _sendBrowserNotification(item, diffMinutes) {
        const title = diffMinutes === 0 ? 'Class Starting Now!' : `Class in ${diffMinutes} Mins!`;
        const body = `${item.courseCode || item.course || 'Class'} at ${item.location || 'TBA'}`;

        // Try browser Notification API (ServiceWorker approach is required for most APKs/WebViews)
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                    navigator.serviceWorker.ready.then(reg => {
                        reg.showNotification(title, {
                            body: body,
                            icon: '/assets/img/logo.png',
                            vibrate: [200, 100, 200, 100, 200, 100, 200],
                            requireInteraction: true,
                            tag: 'timetable-alarm',
                            data: { url: '/timetable.html' }
                        });
                    });
                } else {
                    // Fallback to basic Notification if SW is not available
                    const browserNotification = new Notification(title, {
                        body: body,
                        icon: '/assets/img/logo.png',
                        requireInteraction: true,
                        tag: 'timetable-alarm'
                    });
                    browserNotification.onclick = () => {
                        window.focus();
                        window.location.href = '/timetable.html';
                    };
                }
            } catch(e) {
                console.error('[TimetableAlarm] Notification error:', e);
            }
        }

        // Try Capacitor LocalNotifications
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const { LocalNotifications } = window.Capacitor.Plugins;
                if (LocalNotifications) {
                    LocalNotifications.schedule({
                        notifications: [{
                            title: title,
                            body: body,
                            id: Math.floor(Math.random() * 100000),
                            schedule: { at: new Date() }
                        }]
                    });
                }
            } catch(e) {}
        }
    },

    showAlarmModal(item, diffMinutes) {
        this.persistAlarm(item, diffMinutes);

        // Remove existing if any
        const existing = document.getElementById(this._modalId);
        if (existing) existing.remove();

        const title = diffMinutes === 0 ? 'Class Starting Now!' : `Class in ${diffMinutes} Mins!`;
        const timeStr = item.time || item.startTime || item.start_time || '';
        const courseName = item.courseCode || item.course || 'Upcoming Class';
        const location = item.location || item.room || 'TBA';

        const modal = document.createElement('div');
        modal.id = this._modalId;
        modal.innerHTML = `
            <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:99999; backdrop-filter:blur(8px);">
                <div style="background:linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border:1px solid rgba(255,69,58,0.3); border-radius:24px; padding:35px; text-align:center; max-width:90%; width:360px; box-shadow:0 20px 60px rgba(255,69,58,0.2); animation: alarmPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                    <div style="width:80px; height:80px; border-radius:50%; background:rgba(255, 69, 58, 0.15); color:#ff453a; display:flex; align-items:center; justify-content:center; font-size:34px; margin:0 auto 20px auto; animation: alarmPulse 0.8s infinite; border:2px solid rgba(255,69,58,0.3);">
                        <i class="fas fa-bell"></i>
                    </div>
                    <h2 style="color:#fff; margin-bottom:8px; font-size:1.5rem; font-weight:700;">${title}</h2>
                    <p style="color:#ffd700; margin-bottom:4px; font-size:1.2rem; font-weight:700;">${courseName}</p>
                    <p style="color:rgba(255,255,255,0.6); margin-bottom:25px; font-size:0.95rem;">${location} • ${timeStr}</p>
                    <button id="stop-alarm-btn" style="background:linear-gradient(135deg, #ff453a, #ff6b6b); color:white; border:none; border-radius:16px; padding:16px 32px; font-size:1.15rem; font-weight:700; cursor:pointer; width:100%; transition:all 0.3s; box-shadow:0 4px 20px rgba(255,69,58,0.4); letter-spacing:1px;">
                        <i class="fas fa-stop-circle" style="margin-right:8px;"></i> STOP ALARM
                    </button>
                </div>
            </div>
            <style>
                @keyframes alarmPulse { 
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,69,58,0.5); } 
                    50% { transform: scale(1.15); box-shadow: 0 0 0 20px rgba(255,69,58,0); } 
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,69,58,0); } 
                }
                @keyframes alarmPopIn { 
                    from { transform: scale(0.7); opacity: 0; } 
                    to { transform: scale(1); opacity: 1; } 
                }
                #stop-alarm-btn:hover { transform: scale(1.03); box-shadow: 0 6px 25px rgba(255,69,58,0.5); }
                #stop-alarm-btn:active { transform: scale(0.97); }
            </style>
        `;

        document.body.appendChild(modal);

        document.getElementById('stop-alarm-btn').addEventListener('click', () => {
            this.stopAudio();
            this.clearPersistedAlarm();
            modal.remove();
        });
    },

    /**
     * Schedules native Local Notifications via Capacitor for all classes,
     * or uses Web Notification Triggers (showTrigger) for PWAs/WebAPKs.
     */
    async scheduleNativeAlarms() {
        try {
            const timetable = this.getTimetableData();
            if (!timetable || timetable.length === 0) return;

            const notificationsToSchedule = [];
            let idCounter = 1000;
            const now = new Date();
            const daysMap = { 'Sunday':0, 'Monday':1, 'Tuesday':2, 'Wednesday':3, 'Thursday':4, 'Friday':5, 'Saturday':6 };

            timetable.forEach(item => {
                const rawTime = item.time || item.startTime || item.start_time || '';
                if (!rawTime || !item.day) return;

                let [timeStr, modifier] = rawTime.split(' ');
                let [hours, minutes] = timeStr.split(':').map(Number);
                if (isNaN(hours) || isNaN(minutes)) return;

                if (modifier) {
                    if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
                    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
                }

                const itemDayIdx = daysMap[item.day];
                if (itemDayIdx === undefined) return;

                let classDate = new Date();
                classDate.setHours(hours, minutes, 0, 0);
                
                let dayDiff = itemDayIdx - classDate.getDay();
                if (dayDiff < 0 || (dayDiff === 0 && classDate < now)) {
                    dayDiff += 7;
                }
                classDate.setDate(classDate.getDate() + dayDiff);

                const courseName = item.courseCode || item.course || 'Class';
                const location = item.location || item.room || 'TBA';

                // Fetch user reminder time
                const reminderTime = (window.SettingsManager && window.SettingsManager.current) 
                    ? (window.SettingsManager.current.classReminderTime || 10) 
                    : 10;

                // T-ReminderTime minutes
                let tMinusX = new Date(classDate.getTime() - reminderTime * 60000);
                if (tMinusX > now) {
                    notificationsToSchedule.push({
                        title: `Class in ${reminderTime} Mins!`,
                        body: `${courseName} at ${location}`,
                        id: idCounter++,
                        timestamp: tMinusX.getTime()
                    });
                }

                // T-0
                if (classDate > now) {
                    notificationsToSchedule.push({
                        title: 'Class Starting Now!',
                        body: `${courseName} at ${location}`,
                        id: idCounter++,
                        timestamp: classDate.getTime()
                    });
                }
            });

            if (notificationsToSchedule.length === 0) return;

            // 1. Try Capacitor LocalNotifications first
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                const { LocalNotifications } = window.Capacitor.Plugins;
                if (LocalNotifications) {
                    let permStatus = await LocalNotifications.checkPermissions();
                    if (permStatus.display === 'prompt') {
                        permStatus = await LocalNotifications.requestPermissions();
                    }
                    if (permStatus.display === 'granted') {
                        const pending = await LocalNotifications.getPending();
                        if (pending.notifications.length > 0) {
                            await LocalNotifications.cancel({ notifications: pending.notifications });
                        }
                        
                        const capNotifications = notificationsToSchedule.map(n => ({
                            title: n.title,
                            body: n.body,
                            id: n.id,
                            schedule: { at: new Date(n.timestamp) },
                            sound: null,
                            actionTypeId: '',
                            extra: null
                        }));
                        await LocalNotifications.schedule({ notifications: capNotifications });
                        console.log(`[TimetableAlarm] Scheduled ${capNotifications.length} Capacitor alarms.`);
                        return;
                    }
                }
            }

            // 2. Fallback to Web Notification Triggers (showTrigger API for WebAPKs/PWAs)
            if ('Notification' in window && navigator.serviceWorker && navigator.serviceWorker.ready) {
                if ('showTrigger' in Notification.prototype) {
                    const reg = await navigator.serviceWorker.ready;
                    // Note: Browsers usually restrict how many scheduled notifications can exist.
                    for (const n of notificationsToSchedule) {
                        try {
                            await reg.showNotification(n.title, {
                                body: n.body,
                                icon: '/assets/img/logo.png',
                                vibrate: [200, 100, 200, 100, 200, 100, 200],
                                tag: `alarm-${n.id}`,
                                requireInteraction: true,
                                data: { url: '/timetable.html' },
                                showTrigger: new TimestampTrigger(n.timestamp)
                            });
                        } catch (e) {
                            console.warn('[TimetableAlarm] Failed to schedule trigger:', e);
                        }
                    }
                    console.log(`[TimetableAlarm] Scheduled ${notificationsToSchedule.length} Web Trigger alarms.`);
                } else {
                    console.warn('[TimetableAlarm] showTrigger API not supported in this WebView. Alarms will only trigger when app is open.');
                }
            }
        } catch (err) {
            console.error('[TimetableAlarm] Error scheduling native alarms:', err);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.TimetableAlarmManager) window.TimetableAlarmManager.init();
    }, 2000);
});
