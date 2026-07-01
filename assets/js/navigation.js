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
          <div style="width:min(500px,100%); margin:20px auto 80px; background:linear-gradient(180deg,rgba(10,16,24,0.98),rgba(6,10,17,0.98)); border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:15px; box-shadow:0 30px 60px rgba(0,0,0,0.38);">
            <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.06); margin-bottom:15px;">
              <h2 style="margin:0; font-size:1.3rem; color:#fff;">Settings</h2>
              <button id="globalSettingsClose" style="background:rgba(255,255,255,0.06); border:none; color:#98a0b3; width:36px; height:36px; border-radius:50%; cursor:pointer; font-size:1.1rem; display:flex; align-items:center; justify-content:center;">&times;</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:12px;">
              <!-- Theme -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.04); border-radius:14px; padding:14px;">
                <h3 style="margin:0 0 10px 0; font-size:1rem; color:#c7cbd6;"><i class="fas fa-cog" style="margin-right:8px; color:#7b61ff;"></i>General</h3>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                  <div><span style="color:#c7cbd6; font-weight:500;">Language</span></div>
                  <select id="languageSelect" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:6px 10px; color:#c7cbd6; font-size:0.85rem;">
                    <option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option>
                  </select>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0;">
                  <div><span style="color:#c7cbd6; font-weight:500;">Accent Color</span></div>
                  <div class="color-picker" style="display:flex; gap:6px;">
                    <div class="color-option" style="width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;background:#7b61ff;" data-color="#7b61ff"></div>
                    <div class="color-option" style="width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;background:#00ff9d;" data-color="#00ff9d"></div>
                    <div class="color-option" style="width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;background:#00b8ff;" data-color="#00b8ff"></div>
                    <div class="color-option" style="width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;background:#ffb800;" data-color="#ffb800"></div>
                    <div class="color-option" style="width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;background:#ff6b6b;" data-color="#ff6b6b"></div>
                  </div>
                </div>
              </div>
              <!-- Notifications -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.04); border-radius:14px; padding:14px;">
                <h3 style="margin:0 0 10px 0; font-size:1rem; color:#c7cbd6;"><i class="fas fa-bell" style="margin-right:8px; color:#7b61ff;"></i>Notifications</h3>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0;">
                  <span style="color:#c7cbd6; font-size:0.9rem;">Enable Notifications</span>
                  <label style="position:relative;display:inline-block;width:44px;height:24px;"><input type="checkbox" id="enableNotifications" style="opacity:0;width:0;height:0;"><span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.1);border-radius:24px;transition:0.3s;"></span></label>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0;">
                  <span style="color:#c7cbd6; font-size:0.9rem;">Class Reminders</span>
                  <label style="position:relative;display:inline-block;width:44px;height:24px;"><input type="checkbox" id="classReminders" style="opacity:0;width:0;height:0;"><span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.1);border-radius:24px;transition:0.3s;"></span></label>
                </div>
              </div>
              <!-- Logout -->
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.04); border-radius:14px; padding:14px;">
                <button id="logoutBtnSettings" data-action="logout" style="width:100%; background:rgba(255,107,107,0.1); border:1px solid rgba(255,107,107,0.2); color:#ff6b6b; padding:12px; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.95rem; display:flex; align-items:center; justify-content:center; gap:8px;"><i class="fas fa-sign-out-alt"></i> Logout</button>
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
                // Show the global settings modal on ALL pages (unified functionality)
                const gsm = document.getElementById('globalSettingsModal');
                if (gsm) {
                    gsm.style.display = 'flex';
                    // Trigger opacity transition on next frame
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
