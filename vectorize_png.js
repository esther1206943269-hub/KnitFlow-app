const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('C:\\Users\\Wenqinghu\\.gemini\\antigravity\\brain\\4e118681-6745-4771-aec9-dc5fe2a824c0\\media__1784440120950.png');

const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);

console.log(`Decoding ${width}x${height} PNG...`);

// Extract IDAT chunks
let idatChunks = [];
let offset = 8;
while (offset < buf.length - 4) {
  const length = buf.readUInt32BE(offset);
  const type = buf.toString('ascii', offset + 4, offset + 8);
  if (type === 'IDAT') {
    idatChunks.push(buf.slice(offset + 8, offset + 8 + length));
  }
  offset += 12 + length;
}

const idatBuffer = Buffer.concat(idatChunks);
const decompressed = zlib.inflateSync(idatBuffer);

const scanlineLength = Math.floor(decompressed.length / height);
const bpp = Math.floor((scanlineLength - 1) / width);
console.log(`Scanline length: ${scanlineLength}, Bytes per pixel: ${bpp}`);

// Unfilter PNG scanlines
const rawPixels = Buffer.alloc(width * height * 4);

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

let srcPos = 0;
const rowBytes = width * bpp;
const previousRow = Buffer.alloc(rowBytes);
const currentRow = Buffer.alloc(rowBytes);

const grid = Array.from({ length: height }, () => new Uint8Array(width));

for (let y = 0; y < height; y++) {
  const filterType = decompressed[srcPos++];
  for (let i = 0; i < rowBytes; i++) {
    let val = decompressed[srcPos++];
    let left = i >= bpp ? currentRow[i - bpp] : 0;
    let up = previousRow[i];
    let upLeft = i >= bpp ? previousRow[i - bpp] : 0;

    if (filterType === 1) { // Sub
      val = (val + left) & 0xff;
    } else if (filterType === 2) { // Up
      val = (val + up) & 0xff;
    } else if (filterType === 3) { // Average
      val = (val + Math.floor((left + up) / 2)) & 0xff;
    } else if (filterType === 4) { // Paeth
      val = (val + paethPredictor(left, up, upLeft)) & 0xff;
    }
    currentRow[i] = val;
  }
  previousRow.set(currentRow);

  for (let x = 0; x < width; x++) {
    let r = 255, g = 255, b = 255, a = 255;
    if (bpp === 4) {
      r = currentRow[x * 4];
      g = currentRow[x * 4 + 1];
      b = currentRow[x * 4 + 2];
      a = currentRow[x * 4 + 3];
    } else if (bpp === 3) {
      r = currentRow[x * 3];
      g = currentRow[x * 3 + 1];
      b = currentRow[x * 3 + 2];
    } else if (bpp === 1) {
      r = g = b = currentRow[x];
    }

    if (r < 140 && g < 140 && b < 140 && a > 50) {
      grid[y][x] = 1;
    }
  }
}

// Convert grid to SVG path segments
let paths = [];
for (let y = 0; y < height; y++) {
  let inLine = false;
  let startX = 0;
  for (let x = 0; x < width; x++) {
    if (grid[y][x] === 1) {
      if (!inLine) {
        inLine = true;
        startX = x;
      }
    } else {
      if (inLine) {
        inLine = false;
        paths.push(`M ${startX} ${y} h ${x - startX} v 1 h -${x - startX} Z`);
      }
    }
  }
  if (inLine) {
    paths.push(`M ${startX} ${width - startX} v 1 h -${width - startX} Z`);
  }
}

console.log(`Generated ${paths.length} pixel vector paths.`);

const svgContent = `<svg class="line-art-cat-svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <path d="${paths.join(' ')}" fill="var(--text-main, #000000)" />
</svg>`;

fs.writeFileSync('C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\cat_line_art.svg', svgContent, 'utf-8');
console.log('Saved 1:1 vector SVG file to cat_line_art.svg');
