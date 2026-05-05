
import os
import re

def update_page_css(file_name):
    file_path = os.path.join(r'c:\Users\ezeil\OneDrive\Desktop\first_code_black_pwa', file_name)
    if not os.path.exists(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    
    # Link notifications.css if missing
    css_link = '<link rel="stylesheet" href="assets/css/notifications.css">'
    if css_link not in content:
        # Find where to insert (after font-awesome)
        if '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">' in content:
            content = content.replace('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">', 
                                     '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\n  ' + css_link)
        else:
            # Fallback to after <title>
            content = content.replace('</title>', '</title>\n  ' + css_link)
        modified = True
    
    # Remove inline notification CSS if present (to avoid duplication)
    if '/* ===== NOTIFICATIONS ===== */' in content:
        # Simple removal of the block
        content = re.sub(r'/\* ===== NOTIFICATIONS ===== \*/.*?@keyframes progress \{.*?\}', '', content, flags=re.DOTALL)
        modified = True

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated CSS for {file_name}")

pages = ['index.html', 'homepage.html', 'profile.html', 'timetable.html', 'notes.html', 'gpa.html', 'novels.html', 'ai2.html']
for p in pages:
    update_page_css(p)
