const fs = require('fs');
const code = fs.readFileSync('app.js', 'utf8');

const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('sync-code') || line.includes('shareCode') || line.includes('口令')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
