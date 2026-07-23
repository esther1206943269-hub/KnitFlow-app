const fs = require('fs');
const path = require('path');

const dirPath = 'E:\\hwq\\Knit\\棒针符号';
const files = fs.readdirSync(dirPath);

files.forEach(fname => {
  if (fname.endsWith('.svg')) {
    const fpath = path.join(dirPath, fname);
    const stat = fs.statSync(fpath);
    console.log(`File: ${fname}, Size: ${stat.size} bytes`);
    const content = fs.readFileSync(fpath, 'utf8');
    const svgMatch = content.match(/<svg[^>]*>/i);
    if (svgMatch) {
      console.log(`  SVG Tag: ${svgMatch[0]}`);
    }
    const hasImage = content.includes('<image');
    console.log(`  Has <image>: ${hasImage}`);
    if (hasImage) {
      const imgMatches = content.match(/<image[^>]*>/gi);
      console.log(`  Image tags count: ${imgMatches ? imgMatches.length : 0}`);
    }
  }
});
