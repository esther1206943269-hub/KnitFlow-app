const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'knitflow_vector_logo.svg');
let svgContent = fs.readFileSync(svgPath, 'utf8');

// Match path class="st0"
const pathRegex = /<path[^>]*class="st0"[^>]*d="([^"]+)"/g;
let match;
let minY = Infinity, maxY = -Infinity;

while ((match = pathRegex.exec(svgContent)) !== null) {
  const d = match[1];
  // Parse command numbers
  const nums = d.match(/-?\d+(\.\d+)?/g);
  if (nums) {
    for (let i = 0; i < nums.length; i += 2) {
      const x = parseFloat(nums[i]);
      const y = parseFloat(nums[i+1]);
      if (!isNaN(y) && y > 100) { // SVG text elements have Y around 150~310
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
}

console.log({ minY, maxY, height: maxY - minY, centerY: (minY + maxY) / 2 });
