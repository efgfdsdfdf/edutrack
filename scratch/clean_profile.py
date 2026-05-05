
import os

file_path = r'c:\Users\ezeil\OneDrive\Desktop\first_code_black_pwa\profile.html'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Clean duplicate doctypes at start
if len(lines) > 5 and '<!DOCTYPE html>' in lines[1] and '<!DOCTYPE html>' in lines[3]:
    del lines[3:5]
    del lines[0:1]

# Clean duplicate </html> at end
while len(lines) > 0 and lines[-1].strip() == '</html>':
    lines.pop()
lines.append('</html>\n')

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("File cleaned successfully.")
