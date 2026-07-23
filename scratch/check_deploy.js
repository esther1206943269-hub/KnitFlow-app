const fs = require('fs');
const { execSync } = require('child_process');

console.log("=== Checking package.json ===");
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log("Package scripts:", pkg.scripts);
} catch(e) {
  console.log("No package.json or error reading it:", e.message);
}

console.log("\n=== Checking Git Remote & Branch ===");
try {
  const remote = execSync('git remote -v', { encoding: 'utf8' });
  console.log("Git Remotes:\n" + remote);
  const status = execSync('git status --short', { encoding: 'utf8' });
  console.log("Git Status:\n" + status);
} catch(e) {
  console.log("Git check error:", e.message);
}
