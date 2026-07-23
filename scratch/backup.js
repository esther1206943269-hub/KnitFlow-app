// Backup script
const fs = require('fs');
fs.copyFileSync('C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\index.html', 'C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\index.html.bak');
fs.copyFileSync('C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\styles.css', 'C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\styles.css.bak');
console.log("Backups created successfully.");
