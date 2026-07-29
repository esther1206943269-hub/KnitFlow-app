const fs = require('fs');
const code = fs.readFileSync('index.html', 'utf8');

const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('btn-create-project') || line.includes('新建项目') || line.includes('导入项目') || line.includes('import')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
