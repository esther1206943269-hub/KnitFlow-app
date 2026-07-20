const fs = require('fs');

const buf = fs.readFileSync('C:\\Users\\Wenqinghu\\.gemini\\antigravity\\brain\\4e118681-6745-4771-aec9-dc5fe2a824c0\\media__1784440120950.png');
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);

console.log(`PNG Dimensions: ${width} x ${height}`);
