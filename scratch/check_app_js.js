const fs = require('fs');

const appJs = fs.readFileSync('app.js', 'utf8');

const elementIds = [
  'btn-home',
  'online-users-badge',
  'pageview-counter-badge',
  'user-auth-entry',
  'btn-toggle-theme',
  'fixed-cat-container'
];

elementIds.forEach(id => {
  const count = (appJs.match(new RegExp(id, 'g')) || []).length;
  console.log(`Reference to '${id}' in app.js: ${count} times`);
});
