const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '..', 'api', 'index.js');
let content = fs.readFileSync(apiPath, 'utf16le');
if (!content.includes('const')) {
    content = fs.readFileSync(apiPath, 'utf8');
}

const lines = content.split(/\r?\n/);
lines.forEach((line, index) => {
    if (line.includes('app.use') || line.includes('static') || line.includes('sendFile') || line.includes('__dirname')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
