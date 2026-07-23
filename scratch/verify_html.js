const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log("HTML length:", html.length);
console.log("Contains header-cover-wrapper:", html.includes('class="header-cover-wrapper"'));
console.log("Contains svg-header-cover:", html.includes('id="svg-header-cover"'));
console.log("Contains btn-home:", html.includes('id="btn-home"'));
console.log("Contains online-users-badge:", html.includes('id="online-users-badge"'));
console.log("Contains pageview-counter-badge:", html.includes('id="pageview-counter-badge"'));
console.log("Contains user-auth-entry:", html.includes('id="user-auth-entry"'));
console.log("Contains btn-toggle-theme:", html.includes('id="btn-toggle-theme"'));
console.log("Contains fixed-cat-container:", html.includes('class="fixed-cat-container"'));
