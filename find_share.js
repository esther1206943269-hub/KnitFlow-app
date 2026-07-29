const fs = require('fs');
const code = fs.readFileSync('app.js', 'utf8');

const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('存为模板') || line.includes('saveAsTemplate') || line.includes('share') || line.includes('export')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
