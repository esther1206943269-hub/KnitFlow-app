const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const lines = cssContent.split('\n');
lines.forEach((line, index) => {
  if (line.includes('main-header') || line.includes('.glass') || line.includes('background: rgba')) {
    console.log(`L${index + 1}: ${line}`);
  }
});
