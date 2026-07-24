const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'knitflow_vector_logo.svg');
let svgContent = fs.readFileSync(svgPath, 'utf8');

// Replace viewBox with tight bounding box including O and W
svgContent = svgContent.replace(/viewBox="[^"]+"/, 'viewBox="70 195 710 120"');

fs.writeFileSync(svgPath, svgContent, 'utf8');
console.log("SVG viewBox updated to include ALL letters (KNIT FLOW)!");
