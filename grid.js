/**
 * KnitFlow Interactive Knitting Grid Engine
 * 负责渲染像素图解、网格交互、画笔绘制、片织/圈织方向高亮、CSV 导入解析
 */

const Grid = {
  getDefaultStitches() {
    return {
      'k':     { symbol: ' ', name: 'Knit 下针 (K)', color: '#ffffff', text: 'Knit' },
      'p':     { symbol: '—', name: 'Purl 上针 (P)', color: '#e8e4db', text: 'Purl' },
      'yo':    { symbol: '○', name: 'Yarn Over 挂针 (YO)', color: '#fef3c7', text: 'Yarn Over' },
      'k2tog': { symbol: '╱', name: 'K2tog 右上二并一', color: '#fecaca', text: 'K2tog' },
      'ssk':   { symbol: '╲', name: 'SSK 左上二并一', color: '#fed7aa', text: 'SSK' },
      'c2f':   { symbol: '╏', name: 'C2F 前交叉麻花', color: '#e0e7ff', text: 'C2F Cable' },
      'c2b':   { symbol: '╎', name: 'C2B 后交叉麻花', color: '#ddd6fe', text: 'C2B Cable' },
      'sl':    { symbol: 'V', name: 'Slip 挑针/滑针', color: '#f3e8ff', text: 'Slip' },
      'm1':    { symbol: '+', name: 'Make 1 扭加针', color: '#dcfce7', text: 'Make 1' },
      'c1':    { symbol: '', name: 'Rosy Pink 玫瑰粉 (A)', color: '#D18E97', text: 'Rosy Pink' },
      'c2':    { symbol: '', name: 'Mustard 芥末黄 (B)', color: '#D2A432', text: 'Mustard' },
      'c3':    { symbol: '', name: 'Sage Green 鼠尾草绿 (C)', color: '#979E6C', text: 'Sage Green' },
      'c4':    { symbol: '', name: 'Cocoa Brown 可可棕 (D)', color: '#7c5436', text: 'Cocoa Brown' },
      'c5':    { symbol: '', name: 'Slate Blue 靛蓝 (E)', color: '#5b8296', text: 'Slate Blue' },
      'c6':    { symbol: '', name: 'Cream White 米白 (F)', color: '#F7F4D5', text: 'Cream White' },
      'c7':    { symbol: '', name: 'Charcoal 深灰 (G)', color: '#332A2B', text: 'Charcoal' },
      'c8':    { symbol: '', name: 'Coral Orange 珊瑚橙 (H)', color: '#E87A5D', text: 'Coral' },
      'c9':    { symbol: '', name: 'Lavender 薰衣草紫 (I)', color: '#9B89B3', text: 'Lavender' },
      'c10':   { symbol: '', name: 'Sky Blue 天空蓝 (J)', color: '#76A5AF', text: 'Sky Blue' }
    };
  },

  stitches: {
    'k':     { symbol: ' ', name: 'Knit 下针 (K)', color: '#ffffff', text: 'Knit' },
    'p':     { symbol: '—', name: 'Purl 上针 (P)', color: '#e8e4db', text: 'Purl' },
    'yo':    { symbol: '○', name: 'Yarn Over 挂针 (YO)', color: '#fef3c7', text: 'Yarn Over' },
    'k2tog': { symbol: '╱', name: 'K2tog 右上二并一', color: '#fecaca', text: 'K2tog' },
    'ssk':   { symbol: '╲', name: 'SSK 左上二并一', color: '#fed7aa', text: 'SSK' },
    'c2f':   { symbol: '╏', name: 'C2F 前交叉麻花', color: '#e0e7ff', text: 'C2F Cable' },
    'c2b':   { symbol: '╎', name: 'C2B 后交叉麻花', color: '#ddd6fe', text: 'C2B Cable' },
    'sl':    { symbol: 'V', name: 'Slip 挑针/滑针', color: '#f3e8ff', text: 'Slip' },
    'm1':    { symbol: '+', name: 'Make 1 扭加针', color: '#dcfce7', text: 'Make 1' },
    'c1':    { symbol: '', name: 'Rosy Pink 玫瑰粉 (A)', color: '#D18E97', text: 'Rosy Pink' },
    'c2':    { symbol: '', name: 'Mustard 芥末黄 (B)', color: '#D2A432', text: 'Mustard' },
    'c3':    { symbol: '', name: 'Sage Green 鼠尾草绿 (C)', color: '#979E6C', text: 'Sage Green' },
    'c4':    { symbol: '', name: 'Cocoa Brown 可可棕 (D)', color: '#7c5436', text: 'Cocoa Brown' },
    'c5':    { symbol: '', name: 'Slate Blue 靛蓝 (E)', color: '#5b8296', text: 'Slate Blue' },
    'c6':    { symbol: '', name: 'Cream White 米白 (F)', color: '#F7F4D5', text: 'Cream White' },
    'c7':    { symbol: '', name: 'Charcoal 深灰 (G)', color: '#332A2B', text: 'Charcoal' },
    'c8':    { symbol: '', name: 'Coral Orange 珊瑚橙 (H)', color: '#E87A5D', text: 'Coral' },
    'c9':    { symbol: '', name: 'Lavender 薰衣草紫 (I)', color: '#9B89B3', text: 'Lavender' },
    'c10':   { symbol: '', name: 'Sky Blue 天空蓝 (J)', color: '#76A5AF', text: 'Sky Blue' }
  },

  loadProjectStitches(customStitches) {
    this.stitches = this.getDefaultStitches();
    if (customStitches && typeof customStitches === 'object') {
      Object.assign(this.stitches, customStitches);
    }
  },

  // 动态增减网格行与列
  addRow() {
    const newRow = [];
    for (let c = 0; c < this.width; c++) {
      newRow.push('k');
    }
    this.data.push(newRow);
    this.height = this.data.length;
  },

  removeRow() {
    if (this.height <= 1) return;
    this.data.pop();
    this.height = this.data.length;
  },

  addCol() {
    for (let r = 0; r < this.height; r++) {
      this.data[r].push('k');
    }
    this.width = this.data[0].length;
  },

  removeCol() {
    if (this.width <= 1) return;
    for (let r = 0; r < this.height; r++) {
      this.data[r].pop();
    }
    this.width = this.data[0].length;
  },

  // 状态变量
  width: 20,
  height: 20,
  data: [], // 二维数组，从底往上存储行。即 data[0] 是最底部的第 1 行 (Row 1)
  knitType: 'flat', // flat (片织) 或 circular (圈织)
  zoom: 1.0,
  isEditMode: true,
  selectedStitch: 'k', // 选中的画笔针法
  isDrawing: false,

  /**
   * 初始化一个空白网格
   * @param {number} w 宽度 (针数)
   * @param {number} h 高度 (行数)
   * @param {string} type 编织方式 'flat'|'circular'
   */
  initBlank(w, h, type = 'flat') {
    this.width = w;
    this.height = h;
    this.knitType = type;
    this.data = [];
    
    // 初始化全为下针 ('k') 的二维数组
    // data[0] 为最下面的一行 (Row 1)
    for (let r = 0; r < h; r++) {
      const row = [];
      for (let c = 0; c < w; c++) {
        row.push('k');
      }
      this.data.push(row);
    }
  },

  /**
   * 从 CSV 文本解析网格
   * @param {string} csvText CSV 文本内容
   * @param {string} type 编织方式
   */
  parseCSV(csvText, type = 'flat') {
    if (!csvText || !csvText.trim()) return false;
    
    // 按换行分割
    const lines = csvText.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
      
    if (lines.length === 0) return false;

    // 解析出矩阵
    const rows = lines.map(line => {
      // 兼容逗号、制表符 \t、或空格分隔
      let cells = [];
      if (line.includes(',')) {
        cells = line.split(',');
      } else if (line.includes('\t')) {
        cells = line.split('\t');
      } else {
        cells = line.split(/[\s]+/);
      }
      return cells.map(c => c.trim().toLowerCase());
    });

    const parsedHeight = rows.length;
    const parsedWidth = Math.max(...rows.map(r => r.length));

    this.width = parsedWidth;
    this.height = parsedHeight;
    this.knitType = type;
    this.data = [];

    // 编织习惯：Excel 画图时，顶行是最后织的，底行是最先织的 (Row 1)
    // 所以我们需要将 Excel 的行序进行反转，使 data[0] 对应 CSV 的最后一行
    for (let r = parsedHeight - 1; r >= 0; r--) {
      const csvRow = rows[r];
      const gridRow = [];
      for (let c = 0; c < parsedWidth; c++) {
        const rawVal = csvRow[c] || '';
        gridRow.push(this.mapRawStitchValue(rawVal));
      }
      this.data.push(gridRow);
    }

    return true;
  },

  /**
   * 将 Excel/CSV 输入的各种模糊符号映射到标准针法键
   */
  mapRawStitchValue(val) {
    if (!val) return 'k';
    
    // 清理首尾空格及引号
    const clean = val.replace(/["']/g, '').trim().toLowerCase();

    if (clean === '' || clean === 'k' || clean === '下' || clean === '下针' || clean === '1' || clean === '|') return 'k';
    if (clean === '-' || clean === 'p' || clean === '上' || clean === '上针' || clean === '—') return 'p';
    if (clean === 'o' || clean === 'yo' || clean === '挂' || clean === '挂针' || clean === '0' || clean === '○') return 'yo';
    if (clean === '/' || clean === 'k2tog' || clean === '并' || clean === '右上二并一' || clean === '╱') return 'k2tog';
    if (clean === '\\' || clean === 'ssk' || clean === '左上二并一' || clean === '╲') return 'ssk';
    if (clean === 'a' || clean === '配色a' || clean === 'c1' || clean === '2') return 'c1';
    if (clean === 'b' || clean === '配色b' || clean === 'c2' || clean === '3') return 'c2';
    if (clean === 'c' || clean === '配色c' || clean === 'c3' || clean === '4') return 'c3';
    
    // 默认兜底为下针
    return 'k';
  },

  /**
   * 获取某行针法序列的简写或大纲描述（用于 TTS 朗读）
   * @param {number} rowNum 1-indexed 行号
   */
  getRowDescription(rowNum) {
    const rowIndex = rowNum - 1;
    if (rowIndex < 0 || rowIndex >= this.height) return '';

    const rowData = this.data[rowIndex];
    const isFlat = this.knitType === 'flat';
    const isEvenRow = rowNum % 2 === 0;

    // 确定阅读和编织顺序
    // 如果是片织且是偶数行，需要从左往右看 (Left-to-Right)
    // 圈织或片织奇数行，从右往左看 (Right-to-Left)
    const readSequence = [];
    if (isFlat && isEvenRow) {
      // 从左往右
      for (let c = 0; c < this.width; c++) {
        readSequence.push(rowData[c]);
      }
    } else {
      // 从右往左
      for (let c = this.width - 1; c >= 0; c--) {
        readSequence.push(rowData[c]);
      }
    }

    // 压缩连续相同的针法：例如 ['k', 'k', 'k', 'p'] -> "下针3针，上针1针"
    const runs = [];
    let currentStitch = readSequence[0];
    let count = 1;

    for (let i = 1; i <= readSequence.length; i++) {
      if (i < readSequence.length && readSequence[i] === currentStitch) {
        count++;
      } else {
        const stitchInfo = this.stitches[currentStitch] || this.stitches['k'];
        runs.push(`${stitchInfo.text}${count}针`);
        if (i < readSequence.length) {
          currentStitch = readSequence[i];
          count = 1;
        }
      }
    }

    const directionText = (isFlat && isEvenRow) ? '【从左向右】' : '【从右向左】';
    return directionText + ' ' + runs.join('，');
  },

  /**
   * 渲染 SVG 网格
   * @param {HTMLElement} container 容器元素
   * @param {number} activeRow 当前活跃行号 (1-indexed)
   * @param {Function} onCellClick 单元格点击回调
   */
  render(container, activeRow, onCellClick) {
    container.innerHTML = '';
    
    const cellSize = 30; // 每个格子的像素尺寸
    const axisSize = 25; // 边框坐标轴大小
    const textMargin = 5;

    const svgWidth = this.width * cellSize + axisSize * 2;
    const svgHeight = this.height * cellSize + axisSize * 2;

    // 创建 SVG 节点
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);
    svg.setAttribute('class', 'knitting-grid-svg');
    svg.addEventListener('dragstart', (e) => e.preventDefault());
    
    // 1. 绘制外部坐标轴与数字
    // 行号 (左右两侧均绘制: 单数行粉红 / 双数行草绿)
    for (let r = 0; r < this.height; r++) {
      const rowNum = r + 1; // 编织是从下往上，r=0 代表最底部 Row 1
      const y = svgHeight - axisSize - (r * cellSize) - (cellSize / 2) + 5; // y 轴方向需要倒转
      const isOdd = rowNum % 2 !== 0;
      const rowColor = isOdd ? '#D18E97' : '#839958';
      const rowWeight = rowNum === activeRow ? '900' : '700';
      const fontSize = rowNum === activeRow ? '12px' : '10px';
      
      // 左侧行号
      const textL = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textL.setAttribute('x', axisSize - textMargin);
      textL.setAttribute('y', y);
      textL.setAttribute('text-anchor', 'end');
      textL.setAttribute('font-size', fontSize);
      textL.setAttribute('font-weight', rowWeight);
      textL.setAttribute('fill', rowColor);
      textL.textContent = rowNum;
      svg.appendChild(textL);

      // 右侧行号
      const textR = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textR.setAttribute('x', svgWidth - axisSize + textMargin);
      textR.setAttribute('y', y);
      textR.setAttribute('text-anchor', 'start');
      textR.setAttribute('font-size', fontSize);
      textR.setAttribute('font-weight', rowWeight);
      textR.setAttribute('fill', rowColor);
      textR.textContent = rowNum;
      svg.appendChild(textR);
    }

    // 针目序号 (上下两侧均绘制)
    // 编织习惯：从右往左数针目！右下角是第一针！
    for (let c = 0; c < this.width; c++) {
      const colNum = c + 1;
      const x = svgWidth - axisSize - (c * cellSize) - (cellSize / 2); // 同样反转 x 轴，使右边为第 1 针
      
      // 底部针目号
      const textB = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textB.setAttribute('x', x);
      textB.setAttribute('y', svgHeight - axisSize + 15);
      textB.setAttribute('text-anchor', 'middle');
      textB.setAttribute('font-size', '10px');
      textB.setAttribute('fill', '#867970');
      textB.textContent = colNum;
      svg.appendChild(textB);

      // 顶部针目号
      const textT = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textT.setAttribute('x', x);
      textT.setAttribute('y', axisSize - 8);
      textT.setAttribute('text-anchor', 'middle');
      textT.setAttribute('font-size', '10px');
      textT.setAttribute('fill', '#867970');
      textT.textContent = colNum;
      svg.appendChild(textT);
    }

    // 2. 绘制单元格网格
    for (let r = 0; r < this.height; r++) {
      const rowNum = r + 1;
      const rowIndex = r; // 0-indexed，底层往上
      
      for (let c = 0; c < this.width; c++) {
        const colIndex = c; // 0-indexed，左往右
        const stitchKey = this.data[rowIndex][colIndex];
        const stitch = this.stitches[stitchKey] || this.stitches['k'];

        // 计算格子坐标
        // x轴：左侧轴宽度 + (colIndex * cellSize)
        // y轴：svgHeight - 右侧底轴宽度 - ( (rowIndex+1) * cellSize )
        const x = axisSize + colIndex * cellSize;
        const y = svgHeight - axisSize - (rowIndex + 1) * cellSize;

        // 格子矩形
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', cellSize);
        rect.setAttribute('height', cellSize);
        rect.setAttribute('fill', stitch.color);
        rect.setAttribute('class', 'grid-cell');
        if (rowNum === activeRow) {
          rect.classList.add('active-row-cell');
        }

        // 点击/绘图事件处理
        const handleInteraction = (e) => {
          if (onCellClick) {
            onCellClick(rowIndex, colIndex, e);
          }
        };

        rect.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return; // 仅左键响应
          e.preventDefault(); // 防止 Edge 等浏览器触发默认原生拖拽导致 mouseup 事件丢失
          this.isDrawing = true;
          handleInteraction(e);
        });

        rect.addEventListener('mouseenter', (e) => {
          // 双重保险：检查当前按键状态，如果鼠标左键已被松开，强制结束绘图
          if (e.buttons === 0) {
            this.isDrawing = false;
            return;
          }
          if (this.isDrawing) {
            handleInteraction(e);
          }
        });

        svg.appendChild(rect);

        // 绘制针法简易符号
        if (stitch.symbol.trim() !== '') {
          let textColor = '#3c3530';
          if (stitch.color) {
            let hex = stitch.color.replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            if (hex.length === 6) {
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
              if (yiq < 128) textColor = 'rgba(255, 255, 255, 0.9)';
            }
          }

          const textSym = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textSym.setAttribute('x', x + cellSize / 2);
          textSym.setAttribute('y', y + cellSize / 2 + 5);
          textSym.setAttribute('text-anchor', 'middle');
          textSym.setAttribute('font-family', 'monospace');
          textSym.setAttribute('font-size', '16px');
          textSym.setAttribute('font-weight', 'bold');
          textSym.setAttribute('fill', textColor);
          textSym.setAttribute('pointer-events', 'none'); // 让文本不干扰鼠标拖拽事件
          textSym.textContent = stitch.symbol;
          svg.appendChild(textSym);
        }
      }
    }

    // 全局鼠标抬起事件
    const handleMouseUp = () => {
      this.isDrawing = false;
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('touchcancel', handleMouseUp);
    window.addEventListener('pointerup', handleMouseUp);
    window.addEventListener('pointercancel', handleMouseUp);
    window.addEventListener('blur', handleMouseUp);

    // 3. 绘制活跃行高亮框及阅读方向指示箭头
    const activeRowIndex = activeRow - 1;
    if (activeRowIndex >= 0 && activeRowIndex < this.height) {
      const highlightY = svgHeight - axisSize - activeRow * cellSize;
      const highlightX = axisSize;
      const highlightW = this.width * cellSize;
      const highlightH = cellSize;

      // 活跃行半透明遮罩
      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      overlay.setAttribute('x', highlightX);
      overlay.setAttribute('y', highlightY);
      overlay.setAttribute('width', highlightW);
      overlay.setAttribute('height', highlightH);
      overlay.setAttribute('class', 'active-row-overlay');
      svg.appendChild(overlay);

      // 活跃行外框
      const mask = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      mask.setAttribute('x', highlightX);
      mask.setAttribute('y', highlightY);
      mask.setAttribute('width', highlightW);
      mask.setAttribute('height', highlightH);
      mask.setAttribute('class', 'active-row-mask');
      svg.appendChild(mask);

      // 绘制带箭头的线表示读图解方向
      // Flat (片织) 偶数行从左往右，其他从右往左
      const isFlat = this.knitType === 'flat';
      const isEvenRow = activeRow % 2 === 0;
      const goesLeftToRight = (isFlat && isEvenRow);

      const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const arrowY = highlightY + cellSize / 2;
      
      let d = '';
      if (goesLeftToRight) {
        // 从左往右箭头 (从 x=0 到 x=width)
        const startX = highlightX + 5;
        const endX = highlightX + highlightW - 5;
        d = `M ${startX} ${arrowY} L ${endX} ${arrowY} M ${endX - 6} ${arrowY - 4} L ${endX} ${arrowY} L ${endX - 6} ${arrowY + 4}`;
      } else {
        // 从右往左箭头 (从 x=width 到 x=0)
        const startX = highlightX + highlightW - 5;
        const endX = highlightX + 5;
        d = `M ${startX} ${arrowY} L ${endX} ${arrowY} M ${endX + 6} ${arrowY - 4} L ${endX} ${arrowY} L ${endX + 6} ${arrowY + 4}`;
      }
      
      arrowPath.setAttribute('d', d);
      arrowPath.setAttribute('class', 'direction-arrow-path');
      arrowPath.setAttribute('stroke-dasharray', '2 2'); // 使其呈虚线避免遮挡
      arrowPath.setAttribute('opacity', '0.6');
      svg.appendChild(arrowPath);
    }

    container.appendChild(svg);
    // 应用缩放
    svg.style.transform = `scale(${this.zoom})`;
  }
};

// 导出或挂载到 window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Grid;
} else {
  window.Grid = Grid;
}
