/**
 * Premium Bottom Navigation & Tool Wheel Component
 */
(function() {
    // List of tools displayed in the radial wheel
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
            <a href="ai2.html" class="nav-item" id="navAI">
                <i class="fas fa-robot"></i>
                Ace AI
            </a>
            <a href="profile.html" class="nav-item" id="navProfile">
                <i class="fas fa-user"></i>
                Profile
            </a>
        `;
        document.body.appendChild(navBar);

        // 5. Determine active tab based on window path
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('homepage.html')) {
            document.getElementById('navHome').classList.add('active');
        } else if (currentPath.includes('ai2.html')) {
            document.getElementById('navAI').classList.add('active');
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
                <span class="tooltip">${tool.name}</span>
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
            
            // Calculate coordinates to expand upwards in a semi-circular arc
            const items = wheel.querySelectorAll('.wheel-item');
            const total = items.length;
            const radius = 120; // Arc radius in pixels
            
            // Arc bounds: 195 degrees (left-ish) to 345 degrees (right-ish)
            const startAngle = 195;
            const endAngle = 345;
            const step = (endAngle - startAngle) / (total - 1);

            items.forEach((item, i) => {
                const angle = (startAngle + i * step) * Math.PI / 180;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius; // Goes upward (negative y)
                
                // Add bounce transition delay based on position
                item.style.transitionDelay = `${i * 30}ms`;
                item.style.opacity = '1';
                item.style.transform = `translate(${x}px, ${y}px) scale(1)`;
                item.style.pointerEvents = 'auto';
            });
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
                item.style.transform = `translate(0px, 0px) scale(0)`;
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
                window.location.href = 'homepage.html?openUpgrade=true';
            });

            document.getElementById('navPromoCloseBtn').addEventListener('click', () => {
                promoModal.remove();
            });
        }
    });
})();
