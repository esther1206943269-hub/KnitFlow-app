const fs = require('fs');
const code = fs.readFileSync('app.js', 'utf8');

const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('save-template') || line.includes('Template') || line.includes('模板')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
