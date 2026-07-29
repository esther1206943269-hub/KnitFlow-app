const fs = require('fs');
const code = fs.readFileSync('index.html', 'utf8');

const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('btn-save-as-template') || line.includes('存为模板')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
