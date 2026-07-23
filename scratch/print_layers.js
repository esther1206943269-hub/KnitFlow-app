const fs = require('fs');

const fpath = 'E:\\hwq\\Knit\\棒针符号\\网页封面_画板 1.svg';
let content = fs.readFileSync(fpath, 'utf8');

// Replace long base64 string for clean output
content = content.replace(/data:image\/[^;]+;base64,[^"]+/g, '[BASE64_IMAGE_DATA]');

const layers = ['图层_1', '图层_2', '图层_3', '图层_4'];

layers.forEach(layerId => {
  console.log(`\n=================== ${layerId} ===================`);
  const regex = new RegExp(`<g id="${layerId}"[\\s\\S]*?<\\/g>`, 'i');
  // Find where this layer starts and ends
  const startIdx = content.indexOf(`id="${layerId}"`);
  if (startIdx !== -1) {
    console.log(content.slice(startIdx, startIdx + 1500));
  } else {
    console.log("Not found");
  }
});
