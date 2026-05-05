
import re
import os

def check_file(file_name):
    file_path = os.path.join(r'c:\Users\ezeil\OneDrive\Desktop\first_code_black_pwa', file_name)
    if not os.path.exists(file_path):
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    ids = re.findall(r'id=[\"\'](.*?)[\"\']', content)
    seen = {}
    dups = []
    for i in ids:
        if i in seen:
            dups.append(i)
        seen[i] = True
    
    if dups:
        print(f"Duplicate IDs in {file_name}: {dups}")
    else:
        print(f"No duplicate IDs in {file_name}")

files = ['index.html', 'homepage.html', 'profile.html', 'timetable.html', 'notes.html', 'gpa.html', 'novels.html', 'ai2.html']
for f in files:
    check_file(f)
