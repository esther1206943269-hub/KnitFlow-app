const fs = require('fs');

// Read clean_cover.svg
const svgContent = fs.readFileSync('C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\scratch\\clean_cover.svg', 'utf8');

// Modify SVG string to add id and class and attributes
let modifiedSvg = svgContent.replace('<svg ', '<svg id="svg-header-cover" class="header-cover-svg" preserveAspectRatio="xMidYMid slice" ');

// Read index.html
let html = fs.readFileSync('C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\index.html', 'utf8');

// Build the top cover wrapper block
const oldHeaderRegex = /<!-- 头部导航 -->[\s\S]*?<\/header>/i;
const headerMatch = html.match(oldHeaderRegex);

if (!headerMatch) {
  console.error("Could not find header in index.html");
  process.exit(1);
}

const originalHeader = headerMatch[0];

// Also check fixed-cat-container
const oldCatRegex = /<!-- 1:1 原图矢量线条猫咪（固定左上方位置，微晃呼吸动效） -->[\s\S]*?<div class="fixed-cat-container">[\s\S]*?<\/div>/i;
const catMatch = html.match(oldCatRegex);

let newTopSection = `<!-- 顶栏与网页封面艺术区域（纯代码嵌入 SVG 网页封面） -->
    <div class="header-cover-wrapper">
      <div class="header-cover-svg-bg">
        ${modifiedSvg}
      </div>

      ${originalHeader}

      <!-- 1:1 原图矢量线条猫咪（固定左上方位置，微晃呼吸动效） -->
      <div class="fixed-cat-container">
        <img src="cat_line_art.svg" alt="Line Art Cat">
      </div>
    </div>`;

// Replace in index.html
// 1. Replace header
html = html.replace(oldHeaderRegex, newTopSection);
// 2. Remove old cat block inside view-dashboard so it's not duplicated
if (catMatch) {
  html = html.replace(oldCatRegex, '');
}

fs.writeFileSync('C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\index.html', html);
console.log("Updated index.html successfully!");

// Now update styles.css
let css = fs.readFileSync('C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\styles.css', 'utf8');

const coverCss = `
/* 网页顶栏封面艺术容器 (纯代码嵌入 SVG 网页封面) */
.header-cover-wrapper {
  position: relative;
  width: 100%;
  border-radius: var(--radius-lg);
  padding: 0.75rem 1.25rem 1.25rem 1.25rem;
  margin-bottom: 1.5rem;
  overflow: hidden;
  background: var(--card-bg);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  transition: var(--transition);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.header-cover-svg-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.header-cover-svg-bg svg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0.88;
  transition: opacity 0.3s ease, filter 0.3s ease;
}

body.dark-mode .header-cover-svg-bg svg {
  opacity: 0.45;
  filter: invert(0.88) hue-rotate(180deg) brightness(0.85);
}

.header-cover-wrapper .main-header {
  position: relative;
  z-index: 2;
  border-bottom: none;
  margin-bottom: 0.75rem;
  padding: 0.25rem 0;
}

.header-cover-wrapper .fixed-cat-container {
  position: relative;
  z-index: 2;
  margin: 0;
}
`;

if (!css.includes('.header-cover-wrapper')) {
  css = css + '\n' + coverCss;
  fs.writeFileSync('C:\\Users\\Wenqinghu\\.gemini\\antigravity\\scratch\\knitting-helper\\styles.css', css);
  console.log("Updated styles.css successfully!");
}
