const fs = require('fs');
const path = require('path');

const fpath = 'E:\\hwq\\Knit\\棒针符号\\网页封面_画板 1.svg';
let content = fs.readFileSync(fpath, 'utf8');

// Remove display:none layer (图层_1)
content = content.replace(/<g id="图层_1" class="st0">[\s\S]*?<\/g>/i, '');

// Clean up xml declaration and doctype
content = content.replace(/<\?xml[\s\S]*?\?>/i, '');
content = content.replace(/<!--[\s\S]*?-->/gi, '');

// Make sure classes inside SVG are scoped or unique if necessary
content = content.trim();

console.log("Optimized SVG length:", content.length);

fs.writeFileSync('C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\scratch\\clean_cover.svg', content);
console.log("Saved clean_cover.svg");
