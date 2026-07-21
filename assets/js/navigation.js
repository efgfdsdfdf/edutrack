/**
 * Premium Bottom Navigation & Tool Wheel Component
 */
(function() {
    const toolsList = [
        { name: 'Math Solver', icon: 'fas fa-square-root-variable', url: 'calculator.html', color: '#4cf2c2', premium: false },
        { name: 'Notes', icon: 'fas fa-sticky-note', url: 'notes.html', color: '#7b61ff', premium: false },
        { name: 'GPA Tracker', icon: 'fas fa-chart-line', url: 'gpa.html', color: '#ffd700', premium: false },
        { name: 'Timetable', icon: 'fas fa-calendar-alt', url: 'timetable.html', color: '#ff6b6b', premium: false },
        { name: 'AI Assistant', icon: 'fas fa-robot', url: 'ai2.html', color: '#9d88ff', premium: false },
        { name: 'Brain Teasers', icon: 'fas fa-brain', url: 'brainteaser.html', color: '#ff5e62', premium: true },
        { name: 'Lecture Audio', icon: 'fas fa-microphone', url: 'audio-text.html', color: '#00ffff', premium: true },
        { name: 'Library', icon: 'fas fa-book-open', url: 'novels.html', color: '#ffaa00', premium: false }
    ];

    const premiumPageNames = new Set([
        'brainteaser.html',
        'audio-hub.html',
        'audio-text.html',
        // 'audio-notes.html', // Temporarily disabled for testing redesign
        'audio-history.html',
        'audio-settings.html'
    ]);

    document.addEventListener('DOMContentLoaded', () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration('/sw.js').then((registration) => {
                if (registration) {
                    registration.update().catch(() => {});
                }
            }).catch(() => {});
        }

        // 1. Clean up existing hardcoded bottom-nav elements if present
        const oldNavs = document.querySelectorAll('.bottom-nav, #app-bottom-nav');
        oldNavs.forEach(nav => nav.remove());

        // 2. Inject Backdrop Overlay
        const backdrop = document.createElement('div');
        backdrop.className = 'wheel-backdrop-overlay';
        backdrop.id = 'navWheelBackdrop';
        document.body.appendChild(backdrop);

        // 3. Inject Tool Wheel Container
        const wheel = document.createElement('div');
        wheel.className = 'tool-wheel-wrapper';
        wheel.id = 'navToolWheel';
        document.body.appendChild(wheel);

        // 4. Inject Standardized Bottom Navigation Bar
        const navBar = document.createElement('nav');
        navBar.className = 'bottom-nav-container';
        navBar.innerHTML = `
            <a href="homepage.html" class="nav-item" id="navHome">
                <i class="fas fa-home"></i>
                Home
            </a>
            <button type="button" class="nav-item" id="navToolsToggle">
                <i class="fas fa-th-large"></i>
                Tools
            </button>
            <a href="profile.html?openSettings=true" class="nav-item" id="navSettings">
                <i class="fas fa-cog"></i>
                Settings
            </a>
            <a href="profile.html" class="nav-item" id="navProfile">
                <i class="fas fa-user"></i>
                Profile
            </a>
        `;
        document.body.appendChild(navBar);

        // 4b. Inject Global Settings Modal (available on ALL pages)
        const globalSettingsDiv = document.createElement('div');
        globalSettingsDiv.id = 'globalSettingsModal';
        globalSettingsDiv.className = 'settings-modal';
        globalSettingsDiv.innerHTML = `
<div class="modal-panel">
      <div class="modal-header">
        <h2 class="modal-title">Settings</h2>
        <button class="close-btn" id="globalSettingsClose" type="button" data-close-modal="settingsModal"  aria-label="Close settings modal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="settings-grid">
      <!-- General Settings -->
      <div class="settings-section">
        <h3><i class="fas fa-cog"></i> General Settings</h3>
        
    
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Language</span>
            <span class="setting-desc">Interface language</span>
          </div>
          <div class="select-wrapper">
            <select id="languageSelect">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Accent Color</span>
            <span class="setting-desc">Choose your primary color</span>
          </div>
          <div class="color-picker">
            <div class="color-option" style="background: #7b61ff;" data-color="#7b61ff"></div>
            <div class="color-option" style="background: #00ff9d;" data-color="#00ff9d"></div>
            <div class="color-option" style="background: #00b8ff;" data-color="#00b8ff"></div>
            <div class="color-option active" style="background: #ffb800;" data-color="#ffb800"></div>
            <div class="color-option" style="background: #ff6b6b;" data-color="#ff6b6b"></div>
            <div class="color-option" style="background: #9c27b0;" data-color="#9c27b0"></div>
          </div>
        </div>
        
        <!-- Subscription Status in Settings -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Premium Subscription</span>
            <span class="setting-desc">Access premium features</span>
          </div>
          <div id="settingsSubscriptionStatus">
            <button class="logout-btn" id="manageSubscriptionBtn" type="button" onclick="event.preventDefault(); event.stopImmediatePropagation(); window.openHomepageSubscription && window.openHomepageSubscription();">
              <i class="fas fa-crown"></i> Subscribe Now
            </button>
          </div>
        </div>
        
        <!-- Logout Button in Settings -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Logout</span>
            <span class="setting-desc">Sign out of your account</span>
          </div>
          <button class="logout-btn settings-logout-btn" id="logoutBtnSettings">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
      
      <!-- Notification Settings -->
      <div class="settings-section">
        <h3><i class="fas fa-bell"></i> Notifications</h3>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Enable Notifications</span>
            <span class="setting-desc">Receive notifications for important updates</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="enableNotifications" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Class Reminders</span>
            <span class="setting-desc">Notify before classes start</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="classReminders" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Reminder Time</span>
            <span class="setting-desc">Minutes before class</span>
          </div>
          <div class="select-wrapper">
            <select id="classReminderTime">
              <option value="5">5 minutes</option>
              <option value="10" selected>10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="20">20 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Study Reminders</span>
            <span class="setting-desc">Daily study session reminders</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="studyReminders">
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Reminder Sound</span>
            <span class="setting-desc">Play sound with notifications</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="reminderSound" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <!-- Storage Management Settings -->
      <div class="settings-section">
        <h3><i class="fas fa-hdd"></i> Storage & Backup</h3>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Local Storage Usage</span>
            <span class="setting-desc" id="storageUsageDesc">Calculating...</span>
          </div>
          <div class="stat-progress" style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); margin-top: 10px; border-radius: 4px; overflow: hidden;">
            <div id="storageUsageBar" style="height: 100%; width: 0%; background: var(--primary); border-radius: 4px; transition: width 0.3s;"></div>
          </div>
        </div>
        
        <div class="setting-item" style="display: flex; gap: 10px; margin-top: 15px;">
          <button class="logout-btn" id="exportDataBtn" style="background: rgba(0, 255, 157, 0.1); color: #00ff9d; flex: 1;">
            <i class="fas fa-file-export"></i> Export JSON
          </button>
          <button class="logout-btn" id="clearLocalCacheBtn" style="background: rgba(255, 71, 87, 0.1); color: #ff4757; flex: 1;">
            <i class="fas fa-trash-alt"></i> Clear Cache
          </button>
        </div>
      </div>
      
      <!-- Privacy Settings -->
      <div class="settings-section">
        <h3><i class="fas fa-shield-alt"></i> Privacy & Data</h3>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Auto-sync</span>
            <span class="setting-desc">Automatically sync data to cloud</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="autoSync" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Data Backup</span>
            <span class="setting-desc">Daily automatic backup</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="dataBackup" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Analytics</span>
            <span class="setting-desc">Share anonymous usage data</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="analytics">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <!-- Study Settings -->
      <div class="settings-section">
        <h3><i class="fas fa-graduation-cap"></i> Study Preferences</h3>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Focus Mode</span>
            <span class="setting-desc">Minimize distractions while studying</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="focusMode">
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Study Timer</span>
            <span class="setting-desc">Default study session duration</span>
          </div>
          <div class="range-slider">
            <input type="range" id="studyTimer" min="15" max="120" value="45" step="5">
            <div class="range-value" id="timerValue">45 minutes</div>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Break Duration</span>
            <span class="setting-desc">Break time between sessions</span>
          </div>
          <div class="range-slider">
            <input type="range" id="breakDuration" min="5" max="30" value="10" step="5">
            <div class="range-value" id="breakValue">10 minutes</div>
          </div>
        </div>
      </div>
      
      <!-- Advanced Settings -->
      <div class="settings-section">
        <h3><i class="fas fa-sliders-h"></i> Advanced</h3>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Animations</span>
            <span class="setting-desc">Enable interface animations</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="animations" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Haptic Feedback</span>
            <span class="setting-desc">Vibration feedback on mobile</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="hapticFeedback" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <span class="setting-name">Reduce Motion</span>
            <span class="setting-desc">Minimize animations</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="reduceMotion">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="settings-section">
        <div class="settings-buttons">
          <button class="settings-btn btn-secondary" id="resetSettings">
            <i class="fas fa-undo"></i> Reset to Defaults
          </button>
          <button class="settings-btn btn-danger" id="clearData">
            <i class="fas fa-trash"></i> Clear All Data
          </button>
          <button class="settings-btn btn-primary" id="saveSettings">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>
      </div>
    </div>
`;
        document.body.appendChild(globalSettingsDiv);

        // Close handler for the global settings modal
        const globalCloseBtn = document.getElementById('globalSettingsClose');
        if (globalCloseBtn) {
            globalCloseBtn.addEventListener('click', () => {
                globalSettingsDiv.classList.remove('active');
            });
        }
        // Close on backdrop click (outside the panel)
        globalSettingsDiv.addEventListener('click', (e) => {
            if (e.target === globalSettingsDiv) {
                globalSettingsDiv.classList.remove('active');
            }
        });

        // Initialize SettingsManager if available (binds listeners on modal elements)
        if (typeof SettingsManager !== 'undefined') {
            if (typeof SettingsManager.init === 'function' && !SettingsManager.initialized) {
                SettingsManager.init();
            } else if (typeof SettingsManager.initEventListeners === 'function') {
                SettingsManager.initEventListeners();
                if (typeof SettingsManager.updateSettingsUI === 'function') {
                    SettingsManager.updateSettingsUI();
                }
            }
        }

        // 5. Determine active tab based on window path
        const currentPath = window.location.pathname.toLowerCase();
        const urlParams = new URLSearchParams(window.location.search);
        
        // Setup navSettings intercept — works on ALL pages
        const navSettingsBtn = document.getElementById('navSettings');
        if (navSettingsBtn) {
            navSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Always show the global settings modal
                const gsm = document.getElementById('globalSettingsModal');
                if (gsm) {
                    gsm.classList.add('active');
                }
            });
        }

        if (currentPath.includes('homepage.html') || currentPath.endsWith('/') || currentPath.includes('index.html')) {
            document.getElementById('navHome').classList.add('active');
        } else if (currentPath.includes('profile.html') && urlParams.get('openSettings') === 'true') {
            if (navSettingsBtn) navSettingsBtn.classList.add('active');
        } else if (currentPath.includes('profile.html')) {
            document.getElementById('navProfile').classList.add('active');
        } else {
            document.getElementById('navHome').classList.add('active');
        }

        // 6. Check premium status helper
        function checkIsPremium() {
            try {
                if (typeof window.isPremiumUser === 'function') {
                    const rawUser = localStorage.getItem('currentUser') || localStorage.getItem('loginUser');
                    if (rawUser) {
                        const parsed = rawUser.trim().startsWith('{') ? JSON.parse(rawUser) : null;
                        const username = parsed?.username || parsed?.firstName || (parsed?.email ? parsed.email.split('@')[0] : '');
                        if (window.isPremiumUser(username || parsed || null)) return true;
                    }
                }

                const rawUser = localStorage.getItem('currentUser') || localStorage.getItem('loginUser');
                if (rawUser && rawUser.trim().startsWith('{')) {
                    const user = JSON.parse(rawUser);
                    if (user.is_premium === true) return true;
                    if (user.bio && user.bio.includes('[PREMIUM]')) return true;
                    const username = user.username || user.firstName || (user.email ? user.email.split('@')[0] : 'guest');
                    const users = JSON.parse(localStorage.getItem('users') || '{}');
                    const userData = users[username];
                    if (userData && userData.subscription) {
                        const sub = userData.subscription;
                        return sub.active === true &&
                            sub.verified === true &&
                            sub.expiryDate &&
                            new Date(sub.expiryDate) > new Date();
                    }
                }
            } catch (e) {
                console.warn('Error reading subscription in nav:', e);
            }
            return false;
        }

        function getCurrentPageName() {
            const path = window.location.pathname.split('/').pop().toLowerCase();
            return path || 'homepage.html';
        }

        function updateToolLocks() {
            wheel.querySelectorAll('.wheel-item').forEach(item => {
                const url = item.getAttribute('data-url');
                const tool = toolsList.find(entry => entry.url === url);
                const shouldLock = Boolean(tool?.premium && !isPremium);
                item.toggleAttribute('data-locked', shouldLock);
                let lock = item.querySelector('.lock-badge');
                if (shouldLock && !lock) {
                    lock = document.createElement('span');
                    lock.className = 'lock-badge';
                    lock.innerHTML = '<i class="fas fa-lock"></i>';
                    item.appendChild(lock);
                } else if (!shouldLock && lock) {
                    lock.remove();
                }
            });
        }

        function guardCurrentPage() {
            const pageName = getCurrentPageName();
            if (!premiumPageNames.has(pageName) || isPremium) {
                const overlay = document.getElementById('premiumPageLockOverlay');
                if (overlay) overlay.remove();
                document.body.classList.remove('premium-page-locked');
                return;
            }

            document.body.classList.add('premium-page-locked');

            let overlay = document.getElementById('premiumPageLockOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'premiumPageLockOverlay';
                overlay.innerHTML = `
                    <div class="premium-lock-card">
                        <div class="premium-lock-icon"><i class="fas fa-crown"></i></div>
                        <h3>Premium Access Required</h3>
                        <p>This feature is locked for free users. Unlock it with premium access granted by the admin.</p>
                        <div class="premium-lock-actions">
                            <a href="homepage.html" class="premium-lock-btn premium-lock-home">Go Home</a>
                            <button type="button" class="premium-lock-btn premium-lock-close">Close</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);

                overlay.querySelector('.premium-lock-close').addEventListener('click', () => {
                    overlay.remove();
                    document.body.classList.remove('premium-page-locked');
                });
            }

            overlay.classList.add('active');
            showPremiumPromoModal('Premium Access');
        }

        async function refreshPremiumFromSupabase() {
            try {
                const client = window.supabaseClient || window.dbClient || window.sb || null;
                if (!client || !client.auth || typeof client.auth.getUser !== 'function') return checkIsPremium();

                const { data } = await client.auth.getUser();
                const authUser = data?.user;
                if (!authUser?.id) return checkIsPremium();

                const { data: profile } = await client
                    .from('profiles')
                    .select('username, first_name, email, bio')
                    .eq('id', authUser.id)
                    .maybeSingle();

                if (!profile) return checkIsPremium();

                const stored = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const merged = {
                    ...stored,
                    id: authUser.id,
                    email: profile.email || authUser.email || stored.email || '',
                    username: profile.username || stored.username || '',
                    firstName: profile.first_name || stored.firstName || '',
                    bio: profile.bio || stored.bio || '',
                    is_premium: profile.is_premium === true
                };
                localStorage.setItem('currentUser', JSON.stringify(merged));
                localStorage.setItem('loginUser', JSON.stringify(merged));
                return merged.is_premium || (merged.bio && merged.bio.includes('[PREMIUM]')) || checkIsPremium();
            } catch (e) {
                console.warn('Could not refresh premium status from Supabase:', e);
                return checkIsPremium();
            }
        }

        let isPremium = checkIsPremium();

        // 7. Generate Circular Tool Items in Wheel
        toolsList.forEach((tool, idx) => {
            const item = document.createElement('div');
            item.className = 'wheel-item';
            item.style.setProperty('--hover-color', tool.color);
            item.style.setProperty('--hover-shadow', hexToRgbA(tool.color, 0.45));
            item.setAttribute('data-url', tool.url);
            item.innerHTML = `
                <i class="${tool.icon}" style="color: ${tool.color};"></i>
                <span class="wheel-label">${tool.name}</span>
            `;

            // If the tool is premium and the user is free, display a lock icon
            if (tool.premium && !isPremium) {
                const lock = document.createElement('span');
                lock.className = 'lock-badge';
                lock.innerHTML = '<i class="fas fa-lock"></i>';
                item.appendChild(lock);
                item.setAttribute('data-locked', 'true');
            }

            // Click listener for navigation
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                
                if (item.getAttribute('data-locked') === 'true') {
                    showPremiumPromoModal(tool.name);
                } else {
                    window.location.href = tool.url;
                }
            });

            wheel.appendChild(item);
        });

        updateToolLocks();
        refreshPremiumFromSupabase().then((status) => {
            isPremium = Boolean(status);
            updateToolLocks();
            guardCurrentPage();
        });

        // 8. Event Listeners for Opening/Closing the Wheel
        const toggleBtn = document.getElementById('navToolsToggle');
        
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (wheel.classList.contains('active')) {
                closeWheel();
            } else {
                openWheel();
            }
        });

        backdrop.addEventListener('click', closeWheel);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeWheel();
        });

        // Open Wheel Action
        function openWheel() {
            backdrop.classList.add('active');
            wheel.classList.add('active');
            toggleBtn.classList.add('active');
            
            const items = wheel.querySelectorAll('.wheel-item');
            items.forEach((item, i) => {
                item.style.transitionDelay = `${i * 30}ms`;
                item.style.opacity = '1';
                item.style.transform = `scale(1) translateY(0)`;
                item.style.pointerEvents = 'auto';
            });
            
            wheel.scrollTo({ left: 0, behavior: 'smooth' });
        }

        // Close Wheel Action
        function closeWheel() {
            backdrop.classList.remove('active');
            wheel.classList.remove('active');
            toggleBtn.classList.remove('active');
            
            const items = wheel.querySelectorAll('.wheel-item');
            items.forEach((item) => {
                item.style.transitionDelay = '0ms';
                item.style.opacity = '0';
                item.style.transform = `scale(0.8) translateY(20px)`;
                item.style.pointerEvents = 'none';
            });
        }

        // Helper: Convert HEX color to RGBA for shadows
        function hexToRgbA(hex, alpha) {
            let c;
            if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
                c = hex.substring(1).split('');
                if (c.length === 3) {
                    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
                }
                c = '0x' + c.join('');
                return `rgba(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}, ${alpha})`;
            }
            return `rgba(123, 97, 255, ${alpha})`; // fallback
        }

        // Dynamic Premium Promo Modal
        function showPremiumPromoModal(featureName) {
            // Remove existing modal if any
            const existing = document.getElementById('navPremiumPromoModal');
            if (existing) existing.remove();

            const promoModal = document.createElement('div');
            promoModal.id = 'navPremiumPromoModal';
            promoModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(5,5,8,0.85);
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                animation: navFadeIn 0.3s ease;
            `;

            promoModal.innerHTML = `
                <div style="
                    background: linear-gradient(145deg, #181824, #12121a);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 24px;
                    padding: 36px;
                    max-width: 420px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.6);
                    animation: navSlideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                ">
                    <div style="font-size: 3.5rem; color: #ffd700; margin-bottom: 20px; text-shadow: 0 0 15px rgba(255, 215, 0, 0.3)">
                        <i class="fas fa-crown"></i>
                    </div>
                    <h2 style="color: #fff; margin: 0 0 10px 0; font-size: 1.5rem; font-weight: 700;">Unlock ${featureName}</h2>
                    <p style="color: #a0a8d6; font-size: 0.95rem; line-height: 1.5; margin-bottom: 28px;">
                        This premium feature is locked. Subscribe to **Premium Student Companion** for ₦8,500/month to get:
                    </p>
                    
                    <ul style="color: #fff; text-align: left; list-style: none; padding: 0; margin: 0 0 28px 0; font-size: 0.9rem;">
                        <li style="margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-check-circle" style="color: #4cf2c2;"></i> Brain Teasers (Full access)
                        </li>
                        <li style="margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-check-circle" style="color: #4cf2c2;"></i> Lecture Recorder & Summary
                        </li>
                        <li style="margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-check-circle" style="color: #4cf2c2;"></i> Unlimited Smart AI Prompts
                        </li>
                        <li style="margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-check-circle" style="color: #4cf2c2;"></i> Ad-free study dashboard
                        </li>
                    </ul>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button id="navPromoUpgradeBtn" style="
                            background: linear-gradient(135deg, #7b61ff 0%, #ff5e62 100%);
                            color: white;
                            border: none;
                            padding: 14px;
                            border-radius: 14px;
                            font-weight: 700;
                            cursor: pointer;
                            transition: transform 0.2s;
                            font-size: 0.95rem;
                        ">Upgrade to Premium</button>
                        <button id="navPromoCloseBtn" style="
                            background: rgba(255,255,255,0.05);
                            color: #a0a8d6;
                            border: 1px solid rgba(255,255,255,0.08);
                            padding: 12px;
                            border-radius: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">Dismiss</button>
                    </div>
                </div>
            `;

            // Style animation definitions
            if (!document.getElementById('nav-promo-modal-styles')) {
                const style = document.createElement('style');
                style.id = 'nav-promo-modal-styles';
                style.textContent = `
                    @keyframes navFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes navSlideUp {
                        from { transform: translateY(30px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(promoModal);

            // Button actions
            document.getElementById('navPromoUpgradeBtn').addEventListener('click', () => {
                promoModal.remove();
                if (typeof window.openHomepageSubscription === 'function') {
                    window.openHomepageSubscription();
                } else if (typeof window.openSubscriptionModal === 'function') {
                    window.openSubscriptionModal();
                } else {
                    window.location.href = 'https://paystack.shop/pay/-xrk2381na';
                }
            });

            document.getElementById('navPromoCloseBtn').addEventListener('click', () => {
                promoModal.remove();
            });
        }
    });
})();
