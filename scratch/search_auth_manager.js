const fs = require('fs');
const path = require('path');

const homepagePath = path.join(__dirname, '..', 'homepage.html');
let content = fs.readFileSync(homepagePath, 'utf16le');
if (!content.includes('html')) {
    content = fs.readFileSync(homepagePath, 'utf8');
}

const lines = content.split(/\r?\n/);
lines.forEach((line, index) => {
    if (line.includes('SupabaseAuthManager')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
