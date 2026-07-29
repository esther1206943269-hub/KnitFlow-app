const fs = require('fs');
const code = fs.readFileSync('app.js', 'utf8');

const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('getUserProjectKey') || line.includes('syncCloudProjects') || line.includes('pushCloudProjects') || line.includes('loadProjects') || line.includes('saveProjects')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
