
import os

file_path = r'c:\Users\ezeil\OneDrive\Desktop\first_code_black_pwa\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the style block with the cyberpunk one
cyber_style = """
    /* ===== MODERN CYBERPUNK GLASSMORPHISM THEME ===== */
    :root {
      --mature-bg: linear-gradient(180deg,#06060a,#0b0b10);
      --mature-surface: rgba(255,255,255,0.03);
      --mature-card: rgba(15, 17, 20, 0.8);
      --mature-accent: #7b61ff;
      --mature-accent-2: #6248e6;
      --muted-text: #c7cbd6;
      --muted-weak: #98a0b3;
      --border-soft: rgba(255,255,255,0.08);
      --success: #00ff9d;
      --info: #00b8ff;
      --warning: #ffb800;
      --danger: #ff6b6b;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-sans);
      background: #06060a !important;
      color: var(--muted-text);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow-x: hidden;
      position: relative;
    }

    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: 
        linear-gradient(rgba(123, 97, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(123, 97, 255, 0.05) 1px, transparent 1px);
      background-size: 30px 30px;
      pointer-events: none;
      z-index: -1;
    }

    /* ===== CYBER CARD ===== */
    .cyber-card {
      width: 100%;
      max-width: 440px;
      background: var(--mature-card);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 40px;
      border: 1px solid var(--border-soft);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: hidden;
    }

    .cyber-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, var(--mature-accent), var(--info));
    }

    .card-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .card-title {
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }

    .card-subtitle {
      color: var(--muted-weak);
      font-size: 0.95rem;
    }

    /* ===== FORM ELEMENTS ===== */
    .input-group {
      margin-bottom: 24px;
    }

    .input-label {
      display: block;
      margin-bottom: 8px;
      color: var(--muted-text);
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .cyber-input {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-soft);
      border-radius: 12px;
      color: #fff;
      font-size: 1rem;
      transition: var(--transition);
    }

    .cyber-input:focus {
      outline: none;
      border-color: var(--mature-accent);
      background: rgba(123, 97, 255, 0.05);
      box-shadow: 0 0 0 4px rgba(123, 97, 255, 0.1);
    }

    .btn-primary {
      width: 100%;
      padding: 16px;
      background: var(--mature-accent);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .btn-primary:hover {
      background: var(--mature-accent-2);
      transform: translateY(-2px);
      box-shadow: 0 10px 20px -5px rgba(123, 97, 255, 0.4);
    }

    .forgot-link {
      display: block;
      text-align: right;
      margin-top: 12px;
      color: var(--muted-weak);
      text-decoration: none;
      font-size: 0.85rem;
      transition: var(--transition);
    }

    .forgot-link:hover {
      color: var(--mature-accent);
    }

    /* ===== NOTIFICATIONS ===== */
    #notificationContainer {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .notification {
      background: var(--mature-card);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-soft);
      border-radius: 16px;
      padding: 16px 20px;
      min-width: 300px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .notification.hide {
      animation: slideOut 0.3s forwards;
    }

    @keyframes slideOut {
      to { transform: translateX(100%); opacity: 0; }
    }

    .notification-content {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #fff;
    }

    .notification.success i { color: var(--success); }
    .notification.error i { color: var(--danger); }
    .notification.info i { color: var(--info); }
    .notification.warning i { color: var(--warning); }

    .notification-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      background: var(--mature-accent);
      animation: progress 4s linear forwards;
    }

    @keyframes progress {
      from { width: 100%; }
      to { width: 0%; }
    }
"""

# Extract the style block and replace it
import re
new_content = re.sub(r'<style>.*?</style>', f'<style>{cyber_style}</style>', content, flags=re.DOTALL)

# Update head to include necessary scripts
scripts_to_add = """
  <script src="assets/js/supabase-config.js"></script>
  <script src="assets/js/utils.js"></script>
  <script src="assets/js/settings-manager.js"></script>
  <script src="assets/js/notifications.js"></script>
"""

if '<script src="assets/js/notifications.js"></script>' not in new_content:
    new_content = new_content.replace('<!-- Load Supabase JS -->', scripts_to_add + '\n  <!-- Load Supabase JS -->')

# Add notificationContainer
if '<div id="notificationContainer"></div>' not in new_content:
    new_content = new_content.replace('</body>', '  <div id="notificationContainer"></div>\n</body>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Index.html modernized with Cyberpunk theme.")
