const fs = require('fs');
const path = require('path');

const fpath = 'E:\\hwq\\Knit\\棒针符号\\网页封面_画板 1.svg';
const content = fs.readFileSync(fpath, 'utf8');

console.log("Length:", content.length);
// Find text tags
const textMatches = content.match(/<text[^>]*>([\s\S]*?)<\/text>/gi);
console.log("Text elements count:", textMatches ? textMatches.length : 0);
if (textMatches) {
  textMatches.forEach((t, i) => console.log(`  Text ${i}: ${t.slice(0, 100)}`));
}

// Find path tags count
const pathMatches = content.match(/<path[^>]*>/gi);
console.log("Path elements count:", pathMatches ? pathMatches.length : 0);

// Find g tags count
const gMatches = content.match(/<g[^>]*>/gi);
console.log("G elements count:", gMatches ? gMatches.length : 0);
if (gMatches) {
  gMatches.slice(0, 10).forEach((g, i) => console.log(`  G ${i}: ${g}`));
}
