const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'knitflow_vector_logo.svg');
let svgContent = fs.readFileSync(svgPath, 'utf8');

// Find all d="..." strings
const matches = svgContent.match(/d="([^"]+)"/g);
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

matches.forEach(m => {
  const nums = m.match(/-?\d+(\.\d+)?/g);
  if (nums) {
    for (let i = 0; i < nums.length; i += 2) {
      const x = parseFloat(nums[i]);
      const y = parseFloat(nums[i+1]);
      if (!isNaN(x) && x < 841.89 && x > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
      if (!isNaN(y) && y < 595.28 && y > 0) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
});

console.log({ minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY });
