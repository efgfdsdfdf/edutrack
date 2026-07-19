const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === 'vendor' || file === 'custom-modals.js' || file === 'blackbot.js') return;
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.html') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(__dirname);
let replacedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Replacing alert, confirm, prompt
    content = content.replace(/\balert\s*\(/g, 'customAlert(');
    content = content.replace(/\bconfirm\s*\(/g, 'await customConfirm(');
    content = content.replace(/\bprompt\s*\(/g, 'await customPrompt(');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        replacedCount++;
        console.log(`Updated ${file}`);
    }
});

console.log(`Finished updating ${replacedCount} files.`);
