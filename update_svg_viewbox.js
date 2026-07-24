const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'knitflow_vector_logo.svg');
let svgContent = fs.readFileSync(svgPath, 'utf8');

// Replace viewBox="0 0 841.89 595.28" with viewBox="72 205 538 106"
svgContent = svgContent.replace(/viewBox="[^"]+"/, 'viewBox="70 200 545 112"');
// Clean up style enable-background
svgContent = svgContent.replace(/style="enable-background:[^"]+"/, '');

fs.writeFileSync(svgPath, svgContent, 'utf8');
console.log("SVG viewBox updated to tight text bounding box!");
