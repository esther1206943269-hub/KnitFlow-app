const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'knitflow_vector_logo.svg');
let svgContent = fs.readFileSync(svgPath, 'utf8');

// Match <path class="st0" d="..."
const pathRegex = /<path[^>]*class="st0"[^>]*d="([^"]+)"/g;
let match;
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

while ((match = pathRegex.exec(svgContent)) !== null) {
  const d = match[1];
  const nums = d.match(/-?\d+(\.\d+)?/g);
  if (nums) {
    for (let i = 0; i < nums.length; i += 2) {
      const x = parseFloat(nums[i]);
      const y = parseFloat(nums[i+1]);
      if (!isNaN(x)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
      if (!isNaN(y)) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
}

console.log({ minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY });
