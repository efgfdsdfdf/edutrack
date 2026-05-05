
import os

files = ['notes.html', 'gpa.html', 'timetable.html', 'profile.html', 'index.html', 'homepage.html']

for file_name in files:
    file_path = os.path.join(r'c:\Users\ezeil\OneDrive\Desktop\first_code_black_pwa', file_name)
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix duplicate DOCTYPE
    if content.startswith('<!DOCTYPE html>\n<!DOCTYPE html>'):
        content = content.replace('<!DOCTYPE html>\n<!DOCTYPE html>', '<!DOCTYPE html>', 1)
    
    # Fix duplicate </html> at the end
    while content.strip().endswith('</html>\n</html>'):
        content = content.strip()[:-7] + '\n'
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Global HTML structure cleanup finished.")
