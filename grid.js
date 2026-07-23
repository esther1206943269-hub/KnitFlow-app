/**
 * KnitFlow Interactive Knitting Grid Engine
 * 负责渲染像素图解、网格交互、画笔绘制、片织/圈织方向高亮、CSV 导入解析
 */

const Grid = {
  multiCellConfig: {
    'c21': {
      span: 3,
      vbW: 300,
      vbH: 100,
      name: '右上2针与1针的交叉针',
      color: '#D5C0A5',
      path: 'M 50 15 L 158 85 M 25 80 L 98 62 M 150 15 L 258 85 M 202 38 L 280 20'
    },
    'c21p': {
      span: 3,
      vbW: 300,
      vbH: 100,
      name: '上针的右上2针与1针交叉针',
      color: '#B9B07B',
      path: 'M 50 15 L 158 85 M 25 80 L 98 62 M 85 76 L 115 76 M 150 15 L 258 85 M 202 38 L 280 18'
    },
    'c12': {
      span: 3,
      vbW: 300,
      vbH: 100,
      name: '左上1针与2针交叉针',
      color: '#BA7770',
      path: 'M 20 18 L 98 38 M 45 85 L 155 15 M 145 85 L 255 15 M 202 62 L 280 80'
    },
    'c12p': {
      span: 3,
      vbW: 300,
      vbH: 100,
      name: '上针的左上1针与2针交叉针',
      color: '#EDCE91',
      path: 'M 20 18 L 98 38 M 45 85 L 155 15 M 145 85 L 255 15 M 185 76 L 215 76 M 205 45 L 278 65'
    },
    'c22r': {
      span: 4,
      vbW: 400,
      vbH: 100,
      name: '右上2针与2针交叉针',
      color: '#71744F',
      path: 'M 375 85 L 165 15 M 375 15 L 285 42 M 255 15 L 220 26 M 255 85 L 25 15 M 195 74 L 165 85 M 135 42 L 25 85'
    },
    'c22l': {
      span: 4,
      vbW: 400,
      vbH: 100,
      name: '左上2针与2针交叉针',
      color: '#5C2120',
      path: 'M 25 85 L 235 15 M 25 15 L 115 42 M 145 15 L 180 26 M 145 85 L 375 15 M 205 74 L 235 85 M 265 42 L 375 85'
    }
  },

  getMultiCellConfig(key) {
    if (this.multiCellConfig[key]) return this.multiCellConfig[key];
    const st = this.stitches[key];
    if (st && st.baseStitch && this.multiCellConfig[st.baseStitch]) {
      const baseCfg = this.multiCellConfig[st.baseStitch];
      return {
        ...baseCfg,
        name: st.name || baseCfg.name,
        color: st.color || baseCfg.color
      };
    }
    return null;
  },

  getDefaultStitches() {
    return {
      'k':     { symbol: '|',   symbolMode: 'line', name: '下针 (K)',                      color: '#FFFFFF', text: '下针 (K)' },
      'p':     { symbol: '—',   name: '上针 (P)',                      color: 'rgba(239, 235, 228, 0.65)', text: '上针 (P)' },
      'yo':    { symbol: '○',   name: '挂针 (YO)',                     color: 'rgba(253, 232, 179, 0.65)', text: '挂针 (YO)' },
      'ktbl':  { symbol: '∧',   name: '扭针 (Ktbl)',                   color: 'rgba(232, 207, 213, 0.65)', text: '扭针 (Ktbl)' },
      'p1tbl': { symbol: '∧_',  name: '扭上针 (p1 tbl)',               color: 'rgba(214, 181, 189, 0.65)', text: '扭上针 (p1 tbl)' },
      'ssp':   { symbol: '⋋',   name: '上针的右上2针并1针 (ssp)',      color: 'rgba(247, 197, 186, 0.65)', text: '上针的右上2针并1针 (ssp)' },
      'ssk':   { symbol: 'λ',   name: '右上2针并1针 (ssk)',            color: 'rgba(244, 184, 165, 0.65)', text: '右上2针并1针 (ssk)' },
      'p2tog': { symbol: '⋌',   name: '上针的左上2针并1针 (p2tog)',    color: 'rgba(212, 224, 200, 0.65)', text: '上针的左上2针并1针 (p2tog)' },
      'k2tog': { symbol: '人',  name: '左上2针并1针 (K2tog)',          color: 'rgba(195, 213, 181, 0.65)', text: '左上2针并1针 (K2tog)' },
      'krl':   { symbol: 'ᵀ/',  name: '右加针 (krl)',                  color: 'rgba(209, 227, 226, 0.65)', text: '右加针 (krl)' },
      'prl':   { symbol: 'ᵀ/_', name: '上针的右加针 (prl)',           color: 'rgba(186, 206, 207, 0.65)', text: '上针的右加针 (prl)' },
      'kll':   { symbol: '\\ᵀ', name: '左加针 (kll)',                  color: 'rgba(227, 216, 237, 0.65)', text: '左加针 (kll)' },
      'pll':   { symbol: '\\ᵀ_',name: '上针的左加针 (pll)',           color: 'rgba(205, 190, 220, 0.65)', text: '上针的左加针 (pll)' },
      'c21':   { symbol: '╳',   name: '右上2针与1针的交叉针',          color: '#D5C0A5', text: '右上2针与1针的交叉针' },
      'c21p':  { symbol: '╳',   name: '上针的右上2针与1针交叉针',      color: '#B9B07B', text: '上针的右上2针与1针交叉针' },
      'c12':   { symbol: '╳',   name: '左上1针与2针交叉针',            color: '#BA7770', text: '左上1针与2针交叉针' },
      'c12p':  { symbol: '╳',   name: '上针的左上1针与2针交叉针',      color: '#EDCE91', text: '上针的左上1针与2针交叉针' },
      'c22r':  { symbol: '╳╳',  name: '右上2针与2针交叉针',            color: '#71744F', text: '右上2针与2针交叉针' },
      'c22l':  { symbol: '╳╳',  name: '左上2针与2针交叉针',            color: '#5C2120', text: '左上2针与2针交叉针' }
    };
  },

  stitches: {
    'k':     { symbol: '|',   symbolMode: 'line', name: '下针 (K)',                      color: '#FFFFFF', text: '下针 (K)' },
    'p':     { symbol: '—',   name: '上针 (P)',                      color: 'rgba(239, 235, 228, 0.65)', text: '上针 (P)' },
    'yo':    { symbol: '○',   name: '挂针 (YO)',                     color: 'rgba(253, 232, 179, 0.65)', text: '挂针 (YO)' },
    'ktbl':  { symbol: '∧',   name: '扭针 (Ktbl)',                   color: 'rgba(232, 207, 213, 0.65)', text: '扭针 (Ktbl)' },
    'p1tbl': { symbol: '∧_',  name: '扭上针 (p1 tbl)',               color: 'rgba(214, 181, 189, 0.65)', text: '扭上针 (p1 tbl)' },
    'ssp':   { symbol: '⋋',   name: '上针的右上2针并1针 (ssp)',      color: 'rgba(247, 197, 186, 0.65)', text: '上针的右上2针并1针 (ssp)' },
    'ssk':   { symbol: 'λ',   name: '右上2针并1针 (ssk)',            color: 'rgba(244, 184, 165, 0.65)', text: '右上2针并1针 (ssk)' },
    'p2tog': { symbol: '⋌',   name: '上针的左上2针并1针 (p2tog)',    color: 'rgba(212, 224, 200, 0.65)', text: '上针的左上2针并1针 (p2tog)' },
    'k2tog': { symbol: '人',  name: '左上2针并1针 (K2tog)',          color: 'rgba(195, 213, 181, 0.65)', text: '左上2针并1针 (K2tog)' },
    'krl':   { symbol: 'ᵀ/',  name: '右加针 (krl)',                  color: 'rgba(209, 227, 226, 0.65)', text: '右加针 (krl)' },
    'prl':   { symbol: 'ᵀ/_', name: '上针的右加针 (prl)',           color: 'rgba(186, 206, 207, 0.65)', text: '上针的右加针 (prl)' },
    'kll':   { symbol: '\\ᵀ', name: '左加针 (kll)',                  color: 'rgba(227, 216, 237, 0.65)', text: '左加针 (kll)' },
    'pll':   { symbol: '\\ᵀ_',name: '上针的左加针 (pll)',           color: 'rgba(205, 190, 220, 0.65)', text: '上针的左加针 (pll)' },
    'c21':   { symbol: '╳',   name: '右上2针与1针的交叉针',          color: '#D5C0A5', text: '右上2针与1针的交叉针' },
    'c21p':  { symbol: '╳',   name: '上针的右上2针与1针交叉针',      color: '#B9B07B', text: '上针的右上2针与1针交叉针' },
    'c12':   { symbol: '╳',   name: '左上1针与2针交叉针',            color: '#BA7770', text: '左上1针与2针交叉针' },
    'c12p':  { symbol: '╳',   name: '上针的左上1针与2针交叉针',      color: '#EDCE91', text: '上针的左上1针与2针交叉针' },
    'c22r':  { symbol: '╳╳',  name: '右上2针与2针交叉针',            color: '#71744F', text: '右上2针与2针交叉针' },
    'c22l':  { symbol: '╳╳',  name: '左上2针与2针交叉针',            color: '#5C2120', text: '左上2针与2针交叉针' }
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
    const st = this.stitches[key];
    const targetKey = (st && st.baseStitch) ? st.baseStitch : key;

    const multiCfg = this.getMultiCellConfig(targetKey);
    if (multiCfg) {
      return `<path d="${multiCfg.path}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    switch (targetKey) {
      case 'k': // 下针: 竖线 | 或 空白格
        const kStitch = this.stitches[key] || this.stitches['k'];
        if (kStitch && kStitch.symbolMode === 'blank') {
          return ''; // 空白格，不绘制任何符号路径
        }
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
      default:
        return '';
    }
  },

  /**
   * 生成单个针法的 SVG HTML 字符串 (供 Palette 和 Legend 组装)
   */
  getStitchSVGIcon(key, color = 'currentColor', size = 18) {
    const multiCfg = this.getMultiCellConfig(key);
    if (multiCfg) {
      const paths = `<path d="${multiCfg.path}" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      const ratio = multiCfg.vbW / multiCfg.vbH;
      return `<svg viewBox="0 0 ${multiCfg.vbW} ${multiCfg.vbH}" width="${size * ratio}" height="${size}" style="color: ${color}; display: block; overflow: visible;">${paths}</svg>`;
    }
    const paths = this.getStitchSVGPaths(key);
    if (!paths) {
      const st = this.stitches[key];
      return `<span style="color: ${color}; font-weight: bold;">${st ? (st.symbol || '') : ''}</span>`;
    }
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="color: ${color}; display: block; overflow: visible;">${paths}</svg>`;
  },

  getStrokeColor(colorStr) {
    if (!colorStr) return '#3c3530';
    let r = 255, g = 255, b = 255, a = 1;
    if (colorStr.startsWith('rgb')) {
      const parts = colorStr.match(/[\d.]+/g);
      if (parts && parts.length >= 3) {
        r = parseFloat(parts[0]);
        g = parseFloat(parts[1]);
        b = parseFloat(parts[2]);
        if (parts.length >= 4) a = parseFloat(parts[3]);
      }
    } else {
      let hex = colorStr.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      if (hex.length >= 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
    }
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    if (yiq < 128 && a > 0.4) return 'rgba(255, 255, 255, 0.95)';
    return '#3c3530';
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
  showBindOffDots: true, // 最上面一排代表收针的小黑点显隐控制
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
    if (clean === 'c21' || clean === '右上2针与1针的交叉针' || clean === '交叉针') return 'c21';
    if (clean === 'c21p' || clean === '上针的右上2针与1针交叉针') return 'c21p';
    if (clean === 'c12' || clean === '左上1针与2针交叉针') return 'c12';
    if (clean === 'c12p' || clean === '上针的左上1针与2针交叉针') return 'c12p';
    if (clean === 'c22r' || clean === '右上2针与2针交叉针') return 'c22r';
    if (clean === 'c22l' || clean === '左上2针与2针交叉针') return 'c22l';
    
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

  getBindOffInfo() {
    const bindOffRow = (this.height || 20) + 1;
    const isFlat = this.knitType === 'flat';
    const isOdd = bindOffRow % 2 !== 0;
    // 片织奇数行为正面(RS)，偶数行为反面(WS)；圈织均为正面(RS)
    const isRS = (!isFlat) || isOdd;
    
    return {
      rowNum: bindOffRow,
      isRS: isRS,
      label: isRS ? '正面行收针 (RS Bind-off)' : '反面行收针 (WS Bind-off)',
      shortLabel: isRS ? '收针(正面)' : '收针(反面)',
      color: isRS ? '#D18E97' : '#839958',
      directionText: isRS ? '【从右向左 ←】' : '【从左向右 →】'
    };
  },

  /**
   * 渲染 SVG 网格
   * @param {HTMLElement} container 容器元素
   * @param {number} activeRow 当前活跃行号 (1-indexed)
   * @param {Function} onCellClick 单元格点击回调
   */
  render(container, activeRow, onCellClick) {
    container.innerHTML = '';
    
    const bindOffInfo = (typeof this.getBindOffInfo === 'function')
      ? this.getBindOffInfo()
      : {
          rowNum: (this.height || 20) + 1,
          isRS: true,
          label: '正面行收针 (RS Bind-off)',
          shortLabel: '收针(正面)',
          color: '#D18E97',
          directionText: '【从右向左 ←】'
        };
    const cellWidth = 30;  // 网格列宽
    const cellHeight = 21; // 网格行高 (稍微扁一些的扁长方形格子，符合棒针实际织片比例)
    const axisSize = this.showBindOffDots ? 36 : 25; // 边框坐标轴大小 (若开启收针点，顶部留出更高空间)
    const textMargin = 5;

    const baseSvgWidth = this.width * cellWidth + axisSize * 2;
    const baseSvgHeight = this.height * cellHeight + axisSize * 2;

    const zoomFactor = this.zoom || 1.0;
    const scaledWidth = Math.round(baseSvgWidth * zoomFactor);
    const scaledHeight = Math.round(baseSvgHeight * zoomFactor);

    const svgWidth = baseSvgWidth;
    const svgHeight = baseSvgHeight;

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
      const y = svgHeight - axisSize - (r * cellHeight) - (cellHeight / 2) + 4; // y 轴方向倒转
      const isOdd = rowNum % 2 !== 0;
      const rowColor = isOdd ? '#D18E97' : '#839958';
      const rowWeight = rowNum === activeRow ? '900' : '700';
      const fontSize = rowNum === activeRow ? '11px' : '10px';
      
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

    // 针目序号 (上下两侧均绘制) 与最顶端收针点 (Bind-off Dots)
    // 编织习惯：从右往左数针目！右下角是第一针！
    for (let c = 0; c < this.width; c++) {
      const colNum = c + 1;
      const x = svgWidth - axisSize - (c * cellWidth) - (cellWidth / 2); // 同样反转 x 轴，使右边为第 1 针
      
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
      textT.setAttribute('y', this.showBindOffDots ? 28 : axisSize - 8);
      textT.setAttribute('text-anchor', 'middle');
      textT.setAttribute('font-size', '10px');
      textT.setAttribute('fill', '#867970');
      textT.textContent = colNum;
      svg.appendChild(textT);

      // 最顶层收针黑点 (代表收针/伏针 Bind-off Stitch)
      if (this.showBindOffDots) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', 12);
        dot.setAttribute('rx', 6.5);
        dot.setAttribute('ry', 3.8);
        dot.setAttribute('fill', '#2c2825');
        dot.setAttribute('class', 'bind-off-dot');
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `第 ${colNum} 针收针点 - ${bindOffInfo.label} ${bindOffInfo.directionText}`;
        dot.appendChild(title);
        svg.appendChild(dot);
      }
    }

    // 2. 绘制单元格网格 (分为背景层 cellsGroup 与 符号图层 iconsGroup)
    const cellsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const iconsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(cellsGroup);
    svg.appendChild(iconsGroup);

    for (let r = 0; r < this.height; r++) {
      const rowNum = r + 1;
      const rowIndex = r; // 0-indexed，底层往上
      let skipUntilCol = 0; // 记录当前行跨格 Motif 的跳过截止列
      
      for (let c = 0; c < this.width; c++) {
        const colIndex = c; // 0-indexed，左往右
        const stitchKey = this.data[rowIndex][colIndex];
        const stitch = this.stitches[stitchKey] || this.stitches['k'];
        const multiCfg = this.getMultiCellConfig(stitchKey);

        // 计算长方形格子坐标
        const x = axisSize + colIndex * cellWidth;
        const y = svgHeight - axisSize - (rowIndex + 1) * cellHeight;

        // 格子矩形 (放入背景图层 cellsGroup)
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', cellWidth);
        rect.setAttribute('height', cellHeight);
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
          e.preventDefault();
          this.isDrawing = true;
          handleInteraction(e);
        });

        rect.addEventListener('mouseenter', (e) => {
          if (e.buttons === 0) {
            this.isDrawing = false;
            return;
          }
          if (this.isDrawing) {
            handleInteraction(e);
          }
        });

        cellsGroup.appendChild(rect);

        // 绘制针法 SVG 矢量符号 (放入顶部符号图层 iconsGroup)
        if (multiCfg) {
          if (colIndex < skipUntilCol) {
            // 已由起点的 Motif 统一拉伸绘制
          } else {
            let spanCount = 1;
            for (let offset = 1; offset < multiCfg.span; offset++) {
              if (colIndex + offset < this.width && this.data[rowIndex][colIndex + offset] === stitchKey) {
                spanCount++;
              } else {
                break;
              }
            }

            skipUntilCol = colIndex + spanCount;

            const strokeColor = this.getStrokeColor(stitch.color);
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const targetWidth = cellWidth * spanCount;
            const targetHeight = cellHeight;
            const scaleX = targetWidth / multiCfg.vbW;
            const scaleY = targetHeight / multiCfg.vbH;
            
            group.setAttribute('transform', `translate(${x}, ${y}) scale(${scaleX}, ${scaleY})`);
            group.setAttribute('style', `color: ${strokeColor}; pointer-events: none;`);
            group.innerHTML = `<path d="${multiCfg.path}" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
            iconsGroup.appendChild(group);
          }
        } else {
          const svgPaths = this.getStitchSVGPaths(stitchKey);
          if (svgPaths) {
            const strokeColor = this.getStrokeColor(stitch.color);

            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const iconWidth = 16;
            const iconHeight = 16;
            const offsetX = x + (cellWidth - iconWidth) / 2;
            const offsetY = y + (cellHeight - iconHeight) / 2;
            group.setAttribute('transform', `translate(${offsetX}, ${offsetY}) scale(${iconWidth / 24})`);
            group.setAttribute('style', `color: ${strokeColor}; pointer-events: none;`);
            group.innerHTML = svgPaths;
            iconsGroup.appendChild(group);
          }
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
      const highlightY = svgHeight - axisSize - activeRow * cellHeight;
      const highlightX = axisSize;
      const highlightW = this.width * cellWidth;
      const highlightH = cellHeight;

      // 活跃行半透明遮罩
      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      overlay.setAttribute('x', highlightX);
      overlay.setAttribute('y', highlightY);
      overlay.setAttribute('width', highlightW);
      overlay.setAttribute('height', highlightH);
      overlay.setAttribute('fill', 'rgba(208, 108, 84, 0.15)');
      overlay.setAttribute('pointer-events', 'none');
      overlay.setAttribute('class', 'active-row-overlay');
      svg.appendChild(overlay);

      // 活跃行外框
      const mask = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      mask.setAttribute('x', highlightX);
      mask.setAttribute('y', highlightY);
      mask.setAttribute('width', highlightW);
      mask.setAttribute('height', highlightH);
      mask.setAttribute('fill', 'none');
      mask.setAttribute('stroke', '#d06c54');
      mask.setAttribute('stroke-width', '2.5');
      mask.setAttribute('stroke-dasharray', '4 2');
      mask.setAttribute('class', 'active-row-mask');
      svg.appendChild(mask);

      // 绘制带箭头的线表示读图解方向
      const isFlat = this.knitType === 'flat';
      const isEvenRow = activeRow % 2 === 0;
      const goesLeftToRight = (isFlat && isEvenRow);

      const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const arrowY = highlightY + cellHeight / 2;
      
      let d = '';
      if (goesLeftToRight) {
        const startX = highlightX + 5;
        const endX = highlightX + highlightW - 5;
        d = `M ${startX} ${arrowY} L ${endX} ${arrowY} M ${endX - 6} ${arrowY - 4} L ${endX} ${arrowY} L ${endX - 6} ${arrowY + 4}`;
      } else {
        const startX = highlightX + highlightW - 5;
        const endX = highlightX + 5;
        d = `M ${startX} ${arrowY} L ${endX} ${arrowY} M ${endX + 6} ${arrowY - 4} L ${endX} ${arrowY} L ${endX + 6} ${arrowY + 4}`;
      }
      
      arrowPath.setAttribute('d', d);
      arrowPath.setAttribute('class', 'direction-arrow-path');
      arrowPath.setAttribute('stroke-dasharray', '2 2');
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

