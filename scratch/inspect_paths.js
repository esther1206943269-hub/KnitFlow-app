const fs = require('fs');

function inspectPaths(fpath) {
  console.log("=== Inspecting paths in:", fpath);
  const content = fs.readFileSync(fpath, 'utf8');
  
  const pathRegex = /<path[\s\S]*?\/>/gi;
  let match;
  let count = 0;
  while ((match = pathRegex.exec(content)) !== null) {
    count++;
    console.log(`Path ${count}: ${match[0].slice(0, 150)}...`);
  }
  console.log(`Total paths: ${count}`);
}

inspectPaths('E:\\hwq\\Knit\\棒针符号\\网页封面_画板 1.svg');
