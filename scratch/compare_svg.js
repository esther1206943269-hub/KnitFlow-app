const fs = require('fs');

const file1 = 'E:\\hwq\\Knit\\棒针符号\\网页封面_画板 1.svg';
const file2 = 'E:\\hwq\\Knit\\棒针符号\\网页封面.svg';

const content1 = fs.readFileSync(file1, 'utf8');
const content2 = fs.readFileSync(file2, 'utf8');

console.log("=== File 1: 网页封面_画板 1.svg ===");
console.log("Length:", content1.length);
console.log("Header:", content1.slice(0, 500));

console.log("\n=== File 2: 网页封面.svg ===");
console.log("Length:", content2.length);
console.log("Header:", content2.slice(0, 500));
