
import os
import re

def update_page(file_name):
    file_path = os.path.join(r'c:\Users\ezeil\OneDrive\Desktop\first_code_black_pwa', file_name)
    if not os.path.exists(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # Add notificationContainer if missing
    if 'id="notificationContainer"' not in content:
        content = content.replace('</body>', '  <div id="notificationContainer"></div>\n</body>')
        modified = True
    
    # Add AceNotifications.init() if missing in DOMContentLoaded
    if 'AceNotifications.init()' not in content:
        # Try to find DOMContentLoaded
        if 'document.addEventListener(\'DOMContentLoaded\'' in content:
            content = content.replace('DOMContentLoaded\', function() {', 'DOMContentLoaded\', function() {\n      if (window.AceNotifications) window.AceNotifications.init();')
            content = content.replace('DOMContentLoaded\', () => {', 'DOMContentLoaded\', () => {\n      if (window.AceNotifications) window.AceNotifications.init();')
            modified = True
    
    # If it's timetable.html, we can do more cleanup but let's be safe for now
    
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_name}")

pages = ['timetable.html', 'notes.html', 'gpa.html', 'novels.html', 'ai2.html']
for p in pages:
    update_page(p)
