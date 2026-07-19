(function() {
    'use strict';

    // Inject CSS for Custom Modals
    const style = document.createElement('style');
    style.innerHTML = `
        .custom-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 999999;
            display: flex; align-items: center; justify-content: center;
        }
        .custom-modal-box {
            background: var(--card-bg, #1a1b23); width: 90%; max-width: 400px;
            padding: 24px; border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            color: var(--text, #ffffff);
            border: 1px solid rgba(255,255,255,0.05);
        }
        .custom-modal-btn {
            padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 0.95rem; transition: transform 0.1s;
        }
        .custom-modal-btn:active { transform: scale(0.95); }
        .custom-modal-btn.primary-btn { background: var(--primary, #00ff9d); color: #000; }
        .custom-modal-btn.secondary-btn { background: rgba(255,255,255,0.1); color: var(--text, #fff); }
        .custom-modal-btn.danger-btn { background: #ef4444; color: white; }
    `;
    document.head.appendChild(style);

    function esc(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    window.customAlert = function(msg) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'custom-modal-overlay';
            overlay.innerHTML = `
                <div class="custom-modal-box">
                    <h3 style="margin-top:0;margin-bottom:15px;color:inherit;font-size:1.2rem;">Notification</h3>
                    <p style="margin-bottom:20px;color:rgba(255,255,255,0.7);font-size:0.95rem;">${esc(msg)}</p>
                    <div style="text-align:right;">
                        <button class="custom-modal-btn primary-btn" id="cAlertBtn">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            document.getElementById('cAlertBtn').onclick = () => {
                document.body.removeChild(overlay);
                resolve();
            };
        });
    };

    window.customConfirm = function(msg) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'custom-modal-overlay';
            overlay.innerHTML = `
                <div class="custom-modal-box">
                    <h3 style="margin-top:0;margin-bottom:15px;color:inherit;font-size:1.2rem;">Confirm</h3>
                    <p style="margin-bottom:20px;color:rgba(255,255,255,0.7);font-size:0.95rem;">${esc(msg)}</p>
                    <div style="display:flex;justify-content:flex-end;gap:10px;">
                        <button class="custom-modal-btn secondary-btn" id="cConfCancel">Cancel</button>
                        <button class="custom-modal-btn danger-btn" id="cConfOk">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            document.getElementById('cConfCancel').onclick = () => {
                document.body.removeChild(overlay);
                resolve(false);
            };
            document.getElementById('cConfOk').onclick = () => {
                document.body.removeChild(overlay);
                resolve(true);
            };
        });
    };

    window.customPrompt = function(msg, defaultText) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'custom-modal-overlay';
            overlay.innerHTML = `
                <div class="custom-modal-box">
                    <h3 style="margin-top:0;margin-bottom:15px;color:inherit;font-size:1.2rem;">${esc(msg)}</h3>
                    <input type="text" id="cPromptInput" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.2);color:inherit;margin-bottom:20px;" value="${esc(defaultText || '')}" />
                    <div style="display:flex;justify-content:flex-end;gap:10px;">
                        <button class="custom-modal-btn secondary-btn" id="cPromptCancel">Cancel</button>
                        <button class="custom-modal-btn primary-btn" id="cPromptOk">Save</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const input = document.getElementById('cPromptInput');
            input.focus();
            
            document.getElementById('cPromptCancel').onclick = () => {
                document.body.removeChild(overlay);
                resolve(null);
            };
            document.getElementById('cPromptOk').onclick = () => {
                document.body.removeChild(overlay);
                resolve(input.value);
            };
        });
    };
})();
