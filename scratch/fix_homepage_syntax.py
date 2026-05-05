
import os

file_path = r'c:\Users\ezeil\OneDrive\Desktop\first_code_black_pwa\homepage.html'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix the dangling code at the end
# We'll search for the messed up function definition
new_lines = []
skip_mode = False

for i, line in enumerate(lines):
    # Fix the middle one first
    if 'window.openHomepageModal = function(modalId) {' in line and i < 3000:
        # Check if next lines are what we expect
        if i + 5 < len(lines) and 'updateProfileModalUI' in lines[i+1]:
            # This is our new function
            pass
    
    # Check for the dangling part
    if '// Original open function replaced by version above' in line:
        # The next few lines are likely the dangling part of the old function
        # e.g. openAppModal(document.getElementById(modalId)); \n };
        # We should skip them
        skip_mode = True
        continue
    
    if skip_mode:
        if '};' in line:
            skip_mode = False
        continue
        
    new_lines.append(line)

# Now check for the SECOND duplicate at the end
# We'll use a more aggressive approach to remove the whole redundant block if found
final_lines = []
last_ii_fe_found = False
for line in new_lines:
    if 'window.openHomepageModal = function(modalId) {' in line:
        if last_ii_fe_found:
             # Skip this second definition if we already have one
             # But wait, we might need it if the first one was outside the IIFE
             pass
    final_lines.append(line)

# Clean up duplicate </html> if any
while len(final_lines) > 0 and final_lines[-1].strip() == '</html>':
    final_lines.pop()
final_lines.append('</html>\n')

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print("Homepage syntax errors fixed.")
