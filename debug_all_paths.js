const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'knitflow_vector_logo.svg');
let svgContent = fs.readFileSync(svgPath, 'utf8');

const pathRegex = /<path[^>]*class="st0"[^>]*d="([^"]+)"/g;
let match;
let idx = 0;
let overallMinX = Infinity, overallMinY = Infinity, overallMaxX = -Infinity, overallMaxY = -Infinity;

while ((match = pathRegex.exec(svgContent)) !== null) {
  idx++;
  const d = match[1];
  const nums = d.match(/-?\d+(\.\d+)?/g);
  let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
  if (nums) {
    for (let i = 0; i < nums.length; i += 2) {
      const x = parseFloat(nums[i]);
      const y = parseFloat(nums[i+1]);
      if (!isNaN(x)) {
        if (x < pMinX) pMinX = x;
        if (x > pMaxX) pMaxX = x;
      }
      if (!isNaN(y)) {
        if (y < pMinY) pMinY = y;
        if (y > pMaxY) pMaxY = y;
      }
    }
    console.log(`Path ${idx}: X[${pMinX.toFixed(2)}, ${pMaxX.toFixed(2)}], Y[${pMinY.toFixed(2)}, ${pMaxY.toFixed(2)}]`);
    if (pMinX < overallMinX) overallMinX = pMinX;
    if (pMaxX > overallMaxX) overallMaxX = pMaxX;
    if (pMinY < overallMinY) overallMinY = pMinY;
    if (pMaxY > overallMaxY) overallMaxY = pMaxY;
  }
}

console.log('OVERALL:', { overallMinX, overallMinY, overallMaxX, overallMaxY, width: overallMaxX - overallMinX, height: overallMaxY - overallMinY });
