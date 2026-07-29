const fs = require('fs');
const code = fs.readFileSync('app.js', 'utf8');

const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('打开项目失败') || line.includes('openProject')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
