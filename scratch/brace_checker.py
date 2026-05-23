
import sys

def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    balance = 0
    for i, line in enumerate(lines):
        # Ignore braces in strings/template literals for a better guess?
        # Actually, for now just a simple count.
        open_count = line.count('{')
        close_count = line.count('}')
        balance += open_count - close_count
        if balance < 0:
            print(f"Negative balance at line {i+1}: {balance}")
            # Reset balance to 0 to keep going? No, let's just see.
    
    print(f"Final balance: {balance}")

if __name__ == '__main__':
    check_braces('homepage.html')
