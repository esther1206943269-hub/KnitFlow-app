/**
 * KnitFlow Pattern Parser
 * 用于解析用户输入的各种格式的文字图解，生成结构化的行数据
 */

const Parser = {
  /**
   * 将一段原始文本解析为包含每行指令的数组
   * @param {string} rawText 
   * @returns {Array<{rowNum: number, text: string}>}
   */
  parse(rawText) {
    if (!rawText || !rawText.trim()) {
      return [];
    }

    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const rowMap = new Map(); // 用 Map 来存储行号 -> 指令，方便去重和覆盖
    let currentAutoIncrementRow = 1;

    for (let line of lines) {
      // 1. 尝试匹配行范围，例如 "第 1-5 行：下针" 或 "R1-5: Knit" 或 "3-10行 全下"
      // 匹配：第1-5行、1-5行、R1-5、Row 1-5、1 - 5 行
      const rangeRegex = /^(?:第\s*)?(\d+)\s*[-~至到]\s*(\d+)\s*(?:行|R|Row|Rows)?\s*[:：\s]\s*(.*)$/i;
      const rangeMatch = line.match(rangeRegex);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        const desc = rangeMatch[3].trim();
        const minRow = Math.min(start, end);
        const maxRow = Math.max(start, end);
        
        for (let r = minRow; r <= maxRow; r++) {
          rowMap.set(r, desc);
        }
        currentAutoIncrementRow = maxRow + 1;
        continue;
      }

      // 2. 尝试匹配多行逗号分隔，例如 "第1,3,5行：下针" 或 "R1,3,5: Knit"
      const multiRegex = /^(?:第\s*)?([\d\s,，、]+)\s*(?:行|R|Row|Rows)\s*[:：\s]\s*(.*)$/i;
      const multiMatch = line.match(multiRegex);
      if (multiMatch) {
        const rowNumsStr = multiMatch[1];
        const desc = multiMatch[2].trim();
        // 用正则或者分割拆出数字
        const nums = rowNumsStr.split(/[,，、\s]+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        
        nums.forEach(r => {
          rowMap.set(r, desc);
        });
        
        if (nums.length > 0) {
          currentAutoIncrementRow = Math.max(...nums) + 1;
        }
        continue;
      }

      // 3. 尝试匹配单行，例如 "第1行：下2上2" 或 "R1: K2 P2"
      const singleRegex = /^(?:第\s*)?(\d+)\s*(?:行|R|Row)?\s*[:：\s]\s*(.*)$/i;
      const singleMatch = line.match(singleRegex);
      if (singleMatch) {
        const r = parseInt(singleMatch[1], 10);
        const desc = singleMatch[2].trim();
        rowMap.set(r, desc);
        currentAutoIncrementRow = r + 1;
        continue;
      }

      // 4. 兜底策略：如果没有任何前缀，直接当做下一行。例如用户直接粘贴：
      // 下3, 上3
      // 上3, 下3
      // 直接自增解析为 Row 1, Row 2...
      rowMap.set(currentAutoIncrementRow, line);
      currentAutoIncrementRow++;
    }

    // 转化为数组并根据行号排序
    const sortedRows = Array.from(rowMap.entries())
      .map(([rowNum, text]) => ({ rowNum, text }))
      .sort((a, b) => a.rowNum - b.rowNum);

    // 填充中间漏掉的行号，比如只写了 Row 1 和 Row 3，Row 2 留空
    if (sortedRows.length > 0) {
      const filledRows = [];
      const min = sortedRows[0].rowNum;
      const max = sortedRows[sortedRows.length - 1].rowNum;
      
      const lookup = new Map(sortedRows.map(item => [item.rowNum, item.text]));
      
      for (let r = min; r <= max; r++) {
        filledRows.push({
          rowNum: r,
          text: lookup.has(r) ? lookup.get(r) : '（此行无特定说明，按常规编织）'
        });
      }
      return filledRows;
    }

    return sortedRows;
  }
};

// 导出或挂载到 window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Parser;
} else {
  window.Parser = Parser;
}
