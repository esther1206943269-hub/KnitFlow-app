const fs = require('fs');
const path = require('path');

const fpath = 'E:\\hwq\\Knit\\棒针符号\\网页封面_画板 1.svg';
const content = fs.readFileSync(fpath, 'utf8');

// Extract images
const imgRegex = /<image[\s\S]*?\/>/gi;
let match;
let count = 0;
const outDir = 'C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\scratch\\extracted_imgs';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

while ((match = imgRegex.exec(content)) !== null) {
  count++;
  const tag = match[0];
  const hrefMatch = tag.match(/xlink:href="data:image\/([^;]+);base64,([^"]+)"/);
  if (hrefMatch) {
    const ext = hrefMatch[1];
    const base64Data = hrefMatch[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `img_${count}.${ext}`;
    fs.writeFileSync(path.join(outDir, filename), buffer);
    console.log(`Saved ${filename}: ${buffer.length} bytes`);
  } else {
    console.log(`Img ${count}: No data URI match`);
  }
}
