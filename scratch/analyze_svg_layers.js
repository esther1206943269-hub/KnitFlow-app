const fs = require('fs');

function analyzeFile(fpath) {
  console.log("=== Analyzing:", fpath);
  const content = fs.readFileSync(fpath, 'utf8');
  
  // Find all <g id="...">
  const layerMatches = content.match(/<g\s+id="[^"]*"[^>]*>/gi);
  console.log("Layers:", layerMatches);
  
  // Check image tags and their parent layers
  const images = content.match(/<image[\s\S]*?\/>/gi);
  console.log("Total image tags:", images ? images.length : 0);
  if (images) {
    images.forEach((img, idx) => {
      const wMatch = img.match(/width="([^"]*)"/);
      const hMatch = img.match(/height="([^"]*)"/);
      console.log(`  Img ${idx}: w=${wMatch ? wMatch[1] : ''}, h=${hMatch ? hMatch[1] : ''}, href_len=${img.length}`);
    });
  }
}

analyzeFile('E:\\hwq\\Knit\\棒针符号\\网页封面_画板 1.svg');
analyzeFile('E:\\hwq\\Knit\\棒针符号\\网页封面.svg');
