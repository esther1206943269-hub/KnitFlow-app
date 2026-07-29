const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'app.js');
const content = fs.readFileSync(appPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('Cloud') || line.includes('cloud') || line.includes('sync') || line.includes('JSONBin') || line.includes('BIN') || line.includes('saveProjects') || line.includes('loadProjects') || line.includes('loginUser')) {
    console.log(`L${index + 1}: ${line.trim().slice(0, 110)}`);
  }
});
