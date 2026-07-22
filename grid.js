/**
 * KnitFlow Interactive Knitting Grid Engine
 * 负责渲染像素图解、网格交互、画笔绘制、片织/圈织方向高亮、CSV 导入解析
 */

const Grid = {
  getDefaultStitches() {
    return {
      'k':     { symbol: '|',   name: '下针 (K)',                    color: '#FFFFFF', text: '下针' },
      'p':     { symbol: '—',   name: '上针 (P)',                    color: '#EFEBE4', text: '上针' },
      'yo':    { symbol: '○',   name: '挂针 (YO)',                   color: '#FDE8B3', text: '挂针' },
      'ktbl':  { symbol: '∧',   name: '扭针 (Ktbl)',                 color: '#E8CFD5', text: '扭针' },
      'p1tbl': { symbol: '∧_',  name: '扭上针 (p1 tbl)',             color: '#D6B5BD', text: '扭上针' },
      'ssp':   { symbol: '⋋',   name: '上针的右上二针并一针 (ssp)',   color: '#F7C5BA', text: 'ssp' },
      'ssk':   { symbol: 'λ',   name: '右上二针并一针 (ssk)',         color: '#F4B8A5', text: 'ssk' },
      'p2tog': { symbol: '⋌',   name: '上针的左上二针并一针 (p2tog)', color: '#D4E0C8', text: 'p2tog' },
      'k2tog': { symbol: '人',  name: '左上二针并一针 (k2tog)',       color: '#C3D5B5', text: 'k2tog' },
      'krl':   { symbol: 'ᵀ/',  name: '右加针 (krl)',                 color: '#D1E3E2', text: 'krl' },
      'prl':   { symbol: 'ᵀ/_', name: '上针的右加针 (prl)',          color: '#BACECF', text: 'prl' },
      'kll':   { symbol: '\\ᵀ', name: '左加针 (kll)',                 color: '#E3D8ED', text: 'kll' },
      'pll':   { symbol: '\\ᵀ_',name: '上针的左加针 (pll)',          color: '#CDBEDC', text: 'pll' },
      'c21':   { symbol: '╳',   name: '右上2针与1针的交叉针',         color: '#F3DBBD', text: '交叉针' }
    };
  },

  stitches: {
    'k':     { symbol: '|',   name: '下针 (K)',                    color: '#FFFFFF', text: '下针' },
    'p':     { symbol: '—',   name: '上针 (P)',                    color: '#EFEBE4', text: '上针' },
    'yo':    { symbol: '○',   name: '挂针 (YO)',                   color: '#FDE8B3', text: '挂针' },
    'ktbl':  { symbol: '∧',   name: '扭针 (Ktbl)',                 color: '#E8CFD5', text: '扭针' },
    'p1tbl': { symbol: '∧_',  name: '扭上针 (p1 tbl)',             color: '#D6B5BD', text: '扭上针' },
    'ssp':   { symbol: '⋋',   name: '上针的右上二针并一针 (ssp)',   color: '#F7C5BA', text: 'ssp' },
    'ssk':   { symbol: 'λ',   name: '右上二针并一针 (ssk)',         color: '#F4B8A5', text: 'ssk' },
    'p2tog': { symbol: '⋌',   name: '上针的左上二针并一针 (p2tog)', color: '#D4E0C8', text: 'p2tog' },
    'k2tog': { symbol: '人',  name: '左上二针并一针 (k2tog)',       color: '#C3D5B5', text: 'k2tog' },
    'krl':   { symbol: 'ᵀ/',  name: '右加针 (krl)',                 color: '#D1E3E2', text: 'krl' },
    'prl':   { symbol: 'ᵀ/_', name: '上针的右加针 (prl)',          color: '#BACECF', text: 'prl' },
    'kll':   { symbol: '\\ᵀ', name: '左加针 (kll)',                 color: '#E3D8ED', text: 'kll' },
    'pll':   { symbol: '\\ᵀ_',name: '上针的左加针 (pll)',          color: '#CDBEDC', text: 'pll' },
    'c21':   { symbol: '╳',   name: '右上2针与1针的交叉针',         color: '#F3DBBD', text: '交叉针' }
  },

  loadProjectStitches(customStitches) {
    this.stitches = this.getDefaultStitches();
    if (customStitches && typeof customStitches === 'object') {
      Object.assign(this.stitches, customStitches);
    }
  },

  /**
   * 获取各针法 24x24 矢量 SVG 路径 (精确呈现图一原版符号)
   */
  getStitchSVGPaths(key) {
    switch (key) {
      case 'k': // 下针: 垂直竖线
        return '<line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
      case 'p': // 上针: 水平横线
        return '<line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
      case 'yo': // 挂针: 空心圆
        return '<circle cx="12" cy="12" r="5.5" stroke="currentColor" stroke-width="2" fill="none"/>';
      case 'ktbl': // 扭针: 100% 用户原版 SVG 代码 (M 15 90 C 35 85 65 55 65 30...)
        return '<path d="M 3.6 21.6 C 8.4 20.4 15.6 13.2 15.6 7.2 C 15.6 2.4 8.4 2.4 8.4 7.2 C 8.4 13.2 15.6 20.4 20.4 21.6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
      case 'p1tbl': // 扭上针: 用户原版扭针 SVG + 底部横线
        return '<path d="M 3.6 18.5 C 8.4 17.5 15.6 11.2 15.6 6 C 15.6 1.8 8.4 1.8 8.4 6 C 8.4 11.2 15.6 17.5 20.4 18.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="4" y1="21" x2="20" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
      case 'ssp': // 上针的右上二针并一针 (ssp): 100% 用户图片原版符号 (λ型 + 底部横线)
        return '<path d="M 4.8 3.6 L 19.92 18.96 M 4.08 18.96 L 11.52 10.56 M 6.48 19.2 L 17.04 19.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
      case 'ssk': // 右上二针并一针 (ssk): λ型 (无底部横线)
        return '<path d="M 4.8 3.6 L 19.92 18.96 M 4.08 18.96 L 11.52 10.56" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
      case 'p2tog': // 上针的左上二针并一针 (p2tog): 人字型 + 底部横线
        return '<path d="M 19.2 3.6 L 4.08 18.96 M 19.92 18.96 L 12.48 10.56 M 6.48 19.2 L 17.04 19.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
      case 'k2tog': // 左上二针并一针 (k2tog): 人字型 (无底部横线)
        return '<path d="M 19.2 3.6 L 4.08 18.96 M 19.92 18.96 L 12.48 10.56" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
      case 'krl': // 右加针: 100% 用户原版 SVG 代码 (M 24 30 L 24 72 M 24 53 L 78 34)
        return '<path d="M 5.76 7.2 L 5.76 17.28 M 5.76 12.72 L 18.72 8.16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      case 'prl': // 上针的右加针: 100% 用户原版 SVG 代码 (含底部横线 M 18 80 L 30 80)
        return '<path d="M 5.76 7.2 L 5.76 17.28 M 5.76 12.72 L 18.72 8.16 M 4.32 19.2 L 7.2 19.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      case 'kll': // 左加针: 右加针的镜像对称路径
        return '<path d="M 18.24 7.2 L 18.24 17.28 M 18.24 12.72 L 5.28 8.16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      case 'pll': // 上针的左加针: 右加针镜像 + 底部横线
        return '<path d="M 18.24 7.2 L 18.24 17.28 M 18.24 12.72 L 5.28 8.16 M 16.8 19.2 L 19.68 19.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      case 'c21': // 右上2针与1针的交叉针: 2斜线交叉1斜线
        return '<line x1="4" y1="19" x2="18" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="19" x2="22" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="19" x2="4" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
      default:
        return '';
    }
  },

  /**
   * 生成单个针法的 SVG HTML 字符串 (供 Palette 和 Legend 组装)
   */
  getStitchSVGIcon(key, color = 'currentColor', size = 18) {
    const paths = this.getStitchSVGPaths(key);
    if (!paths) {
      const st = this.stitches[key];
      return `<span style="color: ${color}; font-weight: bold;">${st ? st.symbol : ''}</span>`;
    }
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="color: ${color}; display: block; overflow: visible;">${paths}</svg>`;
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
    if (clean === 'ktbl' || clean === '扭针' || clean === 'ℓ') return 'ktbl';
    if (clean === 'p1tbl' || clean === 'p1 tbl' || clean === '扭上针' || clean === 'ℓ_') return 'p1tbl';
    if (clean === 'ssp' || clean === '上针的右上二针并一针' || clean === '⋋') return 'ssp';
    if (clean === 'ssk' || clean === '右上二针并一针' || clean === 'λ') return 'ssk';
    if (clean === 'p2tog' || clean === '上针的左上二针并一针' || clean === '⋌') return 'p2tog';
    if (clean === 'k2tog' || clean === '左上二针并一针' || clean === '人' || clean === '╱') return 'k2tog';
    if (clean === 'krl' || clean === '右加针' || clean === 'ᵀ/') return 'krl';
    if (clean === 'prl' || clean === '上针的右加针' || clean === 'ᵀ/_') return 'prl';
    if (clean === 'kll' || clean === '左加针' || clean === '\\ᵀ') return 'kll';
    if (clean === 'pll' || clean === '上针的左加针' || clean === '\\ᵀ_') return 'pll';
    if (clean === 'c21' || clean === '右上2针与1针的交叉针' || clean === '交叉针' || clean === '╳') return 'c21';
    
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
    
    const baseCellSize = 30; // 每个格子的基础像素尺寸
    const axisSize = 25; // 边框坐标轴大小
    const textMargin = 5;

    const baseSvgWidth = this.width * baseCellSize + axisSize * 2;
    const baseSvgHeight = this.height * baseCellSize + axisSize * 2;

    const zoomFactor = this.zoom || 1.0;
    const scaledWidth = Math.round(baseSvgWidth * zoomFactor);
    const scaledHeight = Math.round(baseSvgHeight * zoomFactor);

    const svgWidth = baseSvgWidth;
    const svgHeight = baseSvgHeight;
    const cellSize = baseCellSize;

    // 创建 SVG 节点并应用真实 Layout 布局尺寸与 viewBox
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${baseSvgWidth} ${baseSvgHeight}`);
    svg.setAttribute('width', scaledWidth);
    svg.setAttribute('height', scaledHeight);
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

        // 绘制针法 SVG 矢量符号
        const svgPaths = this.getStitchSVGPaths(stitchKey);
        if (svgPaths) {
          let strokeColor = '#3c3530';
          if (stitch.color) {
            let hex = stitch.color.replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            if (hex.length === 6) {
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
              if (yiq < 128) strokeColor = 'rgba(255, 255, 255, 0.95)';
            }
          }

          const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          const iconSize = 20;
          const offsetX = x + (cellSize - iconSize) / 2;
          const offsetY = y + (cellSize - iconSize) / 2;
          group.setAttribute('transform', `translate(${offsetX}, ${offsetY}) scale(${iconSize / 24})`);
          group.setAttribute('style', `color: ${strokeColor}; pointer-events: none;`);
          group.innerHTML = svgPaths;
          svg.appendChild(group);
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
  }
};

// 导出或挂载到 window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Grid;
} else {
  window.Grid = Grid;
}
