const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        searchFiles(fullPath);
      }
    } else if (file.endsWith('.html') || file.endsWith('.js')) {
      let content;
      try {
        content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('\u0000')) {
          content = fs.readFileSync(fullPath, 'utf16le');
        }
      } catch (e) { return; }
      
      const lines = content.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (line.includes("setItem('currentUser'") || line.includes('setItem("currentUser"')) {
          console.log(`${fullPath}:${i+1}: ${line.trim()}`);
        }
      });
    }
  });
}

searchFiles(path.join(__dirname, '..'));
