const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'knitflow_vector_logo.svg');
let svgContent = fs.readFileSync(svgPath, 'utf8');

// Replace viewBox with 100% vertically centered bounding box
// minY: 212.48, maxY: 307.91 -> center 260.2. Height 120 -> Y from 200.2 to 320.2
svgContent = svgContent.replace(/viewBox="[^"]+"/, 'viewBox="70 200 710 120"');

fs.writeFileSync(svgPath, svgContent, 'utf8');
console.log("SVG viewBox updated to perfectly centered Y bounds (200..320)!");
