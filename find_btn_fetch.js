const fs = require('fs');
const code = fs.readFileSync('app.js', 'utf8');

const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('btn-fetch-sync-code') || line.includes('fetch-sync-code')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
