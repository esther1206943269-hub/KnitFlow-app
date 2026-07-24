const fs = require('fs');
const path = require('path');

['app.js', 'speech.js', 'grid.js'].forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('Audio') || line.includes('audio') || line.includes('sound') || line.includes('Sound') || line.includes('beep') || line.includes('click')) {
      console.log(`[${file}] L${index + 1}: ${line.trim().slice(0, 100)}`);
    }
  });
});
