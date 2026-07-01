/**
 * ACE Student Companion - Timetable Alarm Manager
 * Handles continuous audio ringing when the app is open
 * and schedules Native Push Notifications for when the app is closed.
 */
window.TimetableAlarmManager = {
    audioElement: null,
    checkInterval: null,
    isRinging: false,
    activeAlarms: new Set(),
    alarmSoundUrl: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',

    init() {
        console.log('Initializing Timetable Alarm Manager...');
        this.setupAudio();
        this.startChecking();
        this.scheduleNativeAlarms(); // Schedule upon initialization
    },

    setupAudio() {
        if (!this.audioElement) {
            this.audioElement = document.createElement('audio');
            this.audioElement.src = this.alarmSoundUrl;
            this.audioElement.loop = true;
            this.audioElement.preload = 'auto';
            document.body.appendChild(this.audioElement);
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
                    console.error('Failed to parse timetable data for key:', key);
                }
            }
        }
        return [];
    },

    checkTimetable() {
        if (this.isRinging) return; // Don't trigger if already ringing

        const timetable = this.getTimetableData();
        if (!timetable || timetable.length === 0) return;

        const now = new Date();
        const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        timetable.forEach(item => {
            if (item.day !== currentDay) return;

            // Parse time (e.g., "09:00" or "09:00 AM")
            let [timeStr, modifier] = (item.time || item.startTime || '').split(' ');
            if (!timeStr) return;

            let [hours, minutes] = timeStr.split(':').map(Number);
            if (modifier) {
                if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
            }

            const classTimeInMinutes = hours * 60 + minutes;
            const diffMinutes = classTimeInMinutes - currentTimeInMinutes;

            // Trigger Alarm exactly 20 minutes before, OR exactly at class time
            // Also adding a small window (1 minute) to ensure we don't miss it due to interval timing
            if ((diffMinutes === 20 || diffMinutes === 0) && !this.activeAlarms.has(item.id + '_' + diffMinutes)) {
                this.triggerAlarm(item, diffMinutes);
                this.activeAlarms.add(item.id + '_' + diffMinutes);
            }
        });
    },

    triggerAlarm(item, diffMinutes) {
        console.log('⏰ TRIGGERING ALARM:', item.courseCode, diffMinutes);
        
        // 1. Play continuous audio
        this.playAudio();

        // 2. Show UI Modal
        this.showAlarmModal(item, diffMinutes);

        // 3. Send Local Notification as fallback
        if (window.AceNotifications) {
            const title = diffMinutes === 0 ? `Class Starting Now!` : `Class in 20 Mins!`;
            const message = `${item.courseCode} - ${item.courseTitle} at ${item.location || 'TBA'}`;
            AceNotifications.sendLocal(title, message);
        }
    },

    playAudio() {
        if (this.audioElement) {
            this.isRinging = true;
            this.audioElement.play().catch(e => {
                console.warn('Audio play blocked by browser. User interaction required first.', e);
            });
        }
    },

    stopAudio() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.isRinging = false;
        }
    },

    showAlarmModal(item, diffMinutes) {
        // Remove existing if any
        const existing = document.getElementById('timetable-alarm-modal');
        if (existing) existing.remove();

        const title = diffMinutes === 0 ? `Class Starting Now!` : `Class in 20 Mins!`;
        const timeStr = item.time || item.startTime;

        const modalHtml = `
            <div id="timetable-alarm-modal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:99999; backdrop-filter:blur(5px);">
                <div style="background:var(--surface); border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:30px; text-align:center; max-width:90%; width:350px; animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                    <div style="width:70px; height:70px; border-radius:50%; background:rgba(255, 69, 58, 0.2); color:#ff453a; display:flex; align-items:center; justify-content:center; font-size:30px; margin:0 auto 20px auto; animation: pulse 1s infinite;">
                        <i class="fas fa-bell"></i>
                    </div>
                    <h2 style="color:var(--text); margin-bottom:10px; font-size:1.4rem;">${title}</h2>
                    <p style="color:var(--text-secondary); margin-bottom:5px; font-size:1.1rem; font-weight:bold;">${item.courseCode}</p>
                    <p style="color:var(--text-secondary); margin-bottom:20px; font-size:0.9rem;">${item.location || 'TBA'} • ${timeStr}</p>
                    <button id="stop-alarm-btn" style="background:#ff453a; color:white; border:none; border-radius:12px; padding:15px 30px; font-size:1.1rem; font-weight:600; cursor:pointer; width:100%; transition:0.2s;">
                        STOP ALARM
                    </button>
                </div>
            </div>
            <style>
                @keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,69,58,0.4); } 70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(255,69,58,0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,69,58,0); } }
                @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('stop-alarm-btn').addEventListener('click', () => {
            this.stopAudio();
            document.getElementById('timetable-alarm-modal').remove();
        });
    },

    /**
     * Schedules native Local Notifications via Capacitor for all classes.
     * This ensures the user gets a notification even if the app is closed.
     */
    async scheduleNativeAlarms() {
        if (!window.Capacitor || !window.Capacitor.isNativePlatform()) return;
        
        const { LocalNotifications } = window.Capacitor.Plugins;
        if (!LocalNotifications) return;

        try {
            // Request permissions if needed
            let permStatus = await LocalNotifications.checkPermissions();
            if (permStatus.display === 'prompt') {
                permStatus = await LocalNotifications.requestPermissions();
            }
            if (permStatus.display !== 'granted') return;

            // Clear existing scheduled notifications to avoid duplicates
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel({ notifications: pending.notifications });
            }

            const timetable = this.getTimetableData();
            if (!timetable || timetable.length === 0) return;

            const notificationsToSchedule = [];
            let notificationIdCounter = 1000;

            const now = new Date();
            const daysMap = { 'Sunday':0, 'Monday':1, 'Tuesday':2, 'Wednesday':3, 'Thursday':4, 'Friday':5, 'Saturday':6 };

            timetable.forEach(item => {
                if (!item.time && !item.startTime) return;
                
                let [timeStr, modifier] = (item.time || item.startTime || '').split(' ');
                if (!timeStr) return;

                let [hours, minutes] = timeStr.split(':').map(Number);
                if (modifier) {
                    if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
                    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
                }

                const itemDayIdx = daysMap[item.day];
                if (itemDayIdx === undefined) return;

                // Create Date object for the next occurrence of this class
                let classDate = new Date();
                classDate.setHours(hours, minutes, 0, 0);
                
                // Adjust day to match the class day
                let dayDiff = itemDayIdx - classDate.getDay();
                if (dayDiff < 0 || (dayDiff === 0 && classDate < now)) {
                    dayDiff += 7; // Next week
                }
                classDate.setDate(classDate.getDate() + dayDiff);

                // T-20 minutes
                let tMinus20 = new Date(classDate.getTime() - 20 * 60000);
                if (tMinus20 > now) {
                    notificationsToSchedule.push({
                        title: 'Class in 20 Mins!',
                        body: `${item.courseCode} - ${item.courseTitle} at ${item.location || 'TBA'}`,
                        id: notificationIdCounter++,
                        schedule: { at: tMinus20 },
                        sound: null, // Let system default sound play
                        actionTypeId: '',
                        extra: null
                    });
                }

                // T-0 minutes (Exact time)
                if (classDate > now) {
                    notificationsToSchedule.push({
                        title: 'Class Starting Now!',
                        body: `${item.courseCode} - ${item.courseTitle} at ${item.location || 'TBA'}`,
                        id: notificationIdCounter++,
                        schedule: { at: classDate },
                        sound: null,
                        actionTypeId: '',
                        extra: null
                    });
                }
            });

            if (notificationsToSchedule.length > 0) {
                await LocalNotifications.schedule({ notifications: notificationsToSchedule });
                console.log(`Scheduled ${notificationsToSchedule.length} native alarms via Capacitor.`);
            }

        } catch (err) {
            console.error('Error scheduling native alarms:', err);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Delay slightly to ensure user data is parsed
    setTimeout(() => {
        if (window.TimetableAlarmManager) window.TimetableAlarmManager.init();
    }, 2000);
});
