import re

files = [
    'audio-history.html',
    'audio-notes.html',
    'audio-settings.html'
]

pattern = re.compile(r'document\.addEventListener\(''DOMContentLoaded'', async \(\) => \{.*?showSection\(''dashboard''\);\s*\}\);', re.DOTALL)

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if f == 'audio-history.html':
        replacement = "document.addEventListener('DOMContentLoaded', async () => {\n    await initializeApp();\n    if(typeof loadHistory !== 'undefined') loadHistory();\n});"
    elif f == 'audio-notes.html':
        replacement = "document.addEventListener('DOMContentLoaded', async () => {\n    await initializeApp();\n    if(typeof loadAllNotes !== 'undefined') loadAllNotes();\n});"
    else:
        replacement = "document.addEventListener('DOMContentLoaded', async () => {\n    await initializeApp();\n});"
        
    content = pattern.sub(replacement, content)
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
    print(f"Fixed {f}")
