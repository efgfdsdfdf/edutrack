/**
 * Premium Bottom Navigation & Tool Wheel Component
 */
(function() {
    const toolsList = [
        { name: 'Math Solver', icon: 'fas fa-square-root-variable', url: 'calculator.html', color: '#4cf2c2', premium: false },
        { name: 'Notes', icon: 'fas fa-sticky-note', url: 'notes.html', color: '#7b61ff', premium: false },
        { name: 'GPA Tracker', icon: 'fas fa-chart-line', url: 'gpa.html', color: '#ffd700', premium: false },
        { name: 'Timetable', icon: 'fas fa-calendar-alt', url: 'timetable.html', color: '#ff6b6b', premium: false },
        { name: 'Brain Teasers', icon: 'fas fa-brain', url: 'brainteaser.html', color: '#ff5e62', premium: true },
        { name: 'Lecture Audio', icon: 'fas fa-microphone', url: 'audio-text.html', color: '#00ffff', premium: true },
        { name: 'Library', icon: 'fas fa-book-open', url: 'novels.html', color: '#ffaa00', premium: false }
    ];

    document.addEventListener('DOMContentLoaded', () => {
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
        globalSettingsDiv.style.cssText = 'display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(6,6,10,0.95); backdrop-filter:blur(20px); z-index:9999; padding:15px; overflow-y:auto; opacity:0; transition:opacity 0.3s ease;';
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
                globalSettingsDiv.style.opacity = '0';
                setTimeout(() => { globalSettingsDiv.style.display = 'none'; }, 300);
            });
        }
        // Close on backdrop click (outside the panel)
        globalSettingsDiv.addEventListener('click', (e) => {
            if (e.target === globalSettingsDiv) {
                globalSettingsDiv.style.opacity = '0';
                setTimeout(() => { globalSettingsDiv.style.display = 'none'; }, 300);
            }
        });

        // Initialize SettingsManager if available (binds listeners on modal elements)
        if (typeof SettingsManager !== 'undefined' && typeof SettingsManager.init === 'function') {
            SettingsManager.init();
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
                    gsm.style.display = 'flex';
                    requestAnimationFrame(() => { gsm.style.opacity = '1'; });
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
            // If they are on a tool page, highlight the tools toggle
            document.getElementById('navToolsToggle').classList.add('active');
        }

        // 6. Check premium status helper
        function checkIsPremium() {
            try {
                // Read local storage user record
                const rawUser = localStorage.getItem('currentUser') || localStorage.getItem('loginUser');
                if (rawUser && rawUser.trim().startsWith('{')) {
                    const user = JSON.parse(rawUser);
                    // Owner account always gets premium
                    if (user.email && user.email.toLowerCase() === 'ezeilodavid292@gmail.com') return true;
                    // Check bio tag from admin panel
                    if (user.bio && user.bio.includes('[PREMIUM]')) return true;
                    const username = user.username || user.firstName || (user.email ? user.email.split('@')[0] : 'guest');
                    const users = JSON.parse(localStorage.getItem('users') || '{}');
                    const userData = users[username];
                    if (userData && userData.subscription) {
                        const sub = userData.subscription;
                        return sub.active === true && sub.expiryDate && new Date(sub.expiryDate) > new Date();
                    }
                }
            } catch (e) {
                console.warn('Error reading subscription in nav:', e);
            }
            return false;
        }

        const isPremium = checkIsPremium();

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
                closeWheel();
                
                if (item.getAttribute('data-locked') === 'true') {
                    showPremiumPromoModal(tool.name);
                } else {
                    window.location.href = tool.url;
                }
            });

            wheel.appendChild(item);
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
                // Staggered animation delay
                item.style.transitionDelay = `${i * 30}ms`;
                item.style.opacity = '1';
                item.style.transform = `scale(1) translateY(0)`;
                item.style.pointerEvents = 'auto';
            });
            
            // Auto scroll to start
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
