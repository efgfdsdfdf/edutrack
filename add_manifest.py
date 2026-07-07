import os, glob
files = glob.glob('*.html')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    if '<link rel="manifest" href="manifest.json">' not in content:
        content = content.replace('<head>', '<head>\n  <link rel="manifest" href="manifest.json">')
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f'Added manifest to {f}')
