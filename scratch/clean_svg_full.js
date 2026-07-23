const fs = require('fs');
const path = require('path');

const fpath = 'E:\\hwq\\Knit\\棒针符号\\网页封面.svg';
let content = fs.readFileSync(fpath, 'utf8');

// Remove display:none layer (图层_1)
content = content.replace(/<g id="图层_1" class="st0">[\s\S]*?<\/g>/i, '');
content = content.replace(/<\?xml[\s\S]*?\?>/i, '');
content = content.replace(/<!--[\s\S]*?-->/gi, '');
content = content.trim();

console.log("Optimized 网页封面.svg length:", content.length);
fs.writeFileSync('C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\scratch\\clean_cover_full.svg', content);
