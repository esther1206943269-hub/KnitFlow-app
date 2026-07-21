/**
 * KnitFlow Core Application Controller
 * 管理状态、视图切换、本地存储、键盘快捷键、定时器与事件绑定
 */

const App = {
  // 数据状态
  projects: [],
  customTemplates: [],
  deletedPresetKeys: [],
  currentProject: null,
  timerInterval: null,
  isRecordingTime: false,
  sessionTime: 0,
  isTimerPaused: false,
  
  // 页面加载入口
  init() {
    this.loadProjects();
    this.loadCustomTemplates();
    this.loadDeletedPresets();
    this.bindEvents();
    this.initTTSControls();
    this.renderProjectList();
    this.renderPresetTemplates();
    this.setupKeyboardShortcuts();
  },

  // ==========================================================================
  // 本地存储管理 (Local Storage)
  // ==========================================================================
  loadProjects() {
    try {
      const stored = localStorage.getItem('knitflow_projects');
      this.projects = stored ? JSON.parse(stored) : this.getSampleProjects();
      
      // 自动迁移旧项目，确保都有 referenceLinks 数组
      this.projects.forEach(p => {
        if (!p.referenceLinks) {
          p.referenceLinks = [];
          if (p.tutorialUrl && p.tutorialUrl.trim()) {
            p.referenceLinks.push({ title: '项目主教程', url: p.tutorialUrl });
          }
        }
      });
    } catch (e) {
      console.error('加载本地项目失败，将使用初始样例：', e);
      this.projects = this.getSampleProjects();
    }
  },

  saveProjects() {
    try {
      localStorage.setItem('knitflow_projects', JSON.stringify(this.projects));
    } catch (e) {
      console.error('保存本地项目失败：', e);
    }
  },

  loadCustomTemplates() {
    try {
      const stored = localStorage.getItem('knitflow_custom_templates');
      this.customTemplates = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('加载自定义模板库失败：', e);
      this.customTemplates = [];
    }
  },

  saveCustomTemplates() {
    try {
      localStorage.setItem('knitflow_custom_templates', JSON.stringify(this.customTemplates));
    } catch (e) {
      console.error('保存自定义模板库失败：', e);
    }
  },

  loadDeletedPresets() {
    try {
      const stored = localStorage.getItem('knitflow_deleted_preset_templates');
      this.deletedPresetKeys = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('加载被删除的预设模板列表失败：', e);
      this.deletedPresetKeys = [];
    }
  },

  saveDeletedPresets() {
    try {
      localStorage.setItem('knitflow_deleted_preset_templates', JSON.stringify(this.deletedPresetKeys));
    } catch (e) {
      console.error('保存被删除的预设模板列表失败：', e);
    }
  },

  getSampleProjects() {
    return [
      {
        id: 'sample-text',
        name: 'Winter Cable Scarf (Written)',
        type: 'text',
        currentLoc: 1,
        totalTime: 120, // 2 mins
        referenceLinks: [
          { title: '🎥 Scarf Knitting Video Guide', url: 'https://www.youtube.com', memo: 'Cast-on and basic stitch demo for beginners' },
          { title: '📖 Cable Stitch Diagram Tutorial', url: 'https://www.google.com', memo: 'Used for Row 3 and Row 4 cable twists' }
        ],
        updatedAt: new Date().toISOString(),
        data: [
          { rowNum: 1, text: 'R1 (RS): Knit all stitches (K100)' },
          { rowNum: 2, text: 'R2 (WS): Purl all stitches (P100)' },
          { rowNum: 3, text: 'R3 (RS): K3, P3 repeat across' },
          { rowNum: 4, text: 'R4 (WS): P3, K3 repeat across' },
          { rowNum: 5, text: 'R5-10: Repeat Row 3 & Row 4' }
        ]
      },
      {
        id: 'sample-grid',
        name: 'Nordic Snowflake Jacquard (Grid)',
        type: 'grid',
        currentLoc: 1,
        knitType: 'flat',
        totalTime: 45,
        referenceLinks: [
          { title: '🎥 Fair Isle Stranded Knitting Guide', url: 'https://www.youtube.com', memo: 'How to manage float yarn tension on WS' },
          { title: '📖 Elastic Two-Color Bind-Off', url: 'https://www.google.com', memo: 'Recommended for final bind off row' }
        ],
        updatedAt: new Date().toISOString(),
        // 10*10 网格，第一行在最底 data[0]
        data: [
          ['k', 'k', 'yo', 'yo', 'k', 'k', 'yo', 'yo', 'k', 'k'],
          ['k', 'p', 'k', 'p', 'k', 'p', 'k', 'p', 'k', 'p'],
          ['yo', 'yo', 'k', 'k', 'yo', 'yo', 'k', 'k', 'yo', 'yo'],
          ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
          ['k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k'],
          ['c1', 'c1', 'c2', 'c2', 'c1', 'c1', 'c2', 'c2', 'c1', 'c1'],
          ['c2', 'c2', 'c1', 'c1', 'c2', 'c2', 'c1', 'c1', 'c2', 'c2'],
          ['ssk', 'k', 'k', 'k', 'yo', 'yo', 'k', 'k', 'k', 'k2tog'],
          ['k', 'ssk', 'k', 'yo', 'k', 'k', 'yo', 'k', 'k2tog', 'k'],
          ['k', 'k', 'ssk', 'yo', 'k', 'k', 'yo', 'k2tog', 'k', 'k']
        ]
      }
    ];
  },

  // ==========================================================================
  // 视图切换与路由
  // ==========================================================================
  switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
    }
    
    // 如果离开播放器视图，停止计时器和TTS
    if (viewId !== 'view-text-player' && viewId !== 'view-grid-player') {
      this.stopTimer();
      Speech.stop();
    }
  },

  // ==========================================================================
  // UI 渲染与列表更新
  // ==========================================================================
  renderProjectList() {
    const container = document.getElementById('project-list');
    container.innerHTML = '';
    
    if (this.projects.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No saved projects yet. Create one to start!</p>
        </div>
      `;
      return;
    }

    const colors = [
      { bg: '#0A3323', text: '#F7F4D5', title: '#0A3323', darkTitle: '#F7F4D5' }, // Dark green
      { bg: '#839958', text: '#0A3323', title: '#839958', darkTitle: '#c2d1a4' }, // Moss green
      { bg: '#F7F4D5', text: '#839958', title: '#b29c6b', darkTitle: '#F7F4D5' }, // Beige
      { bg: '#D3968C', text: '#ffffff', title: '#D3968C', darkTitle: '#f0cdc8' }, // Rosy brown
      { bg: '#105666', text: '#f2c7c0', title: '#105666', darkTitle: '#f2c7c0' }  // Midnight green
    ];

    this.projects.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'project-item';
      
      const color = colors[idx % colors.length];
      item.style.setProperty('--hover-bg', color.bg);
      item.style.setProperty('--hover-text', color.text);
      item.style.setProperty('--title-color', color.title);
      item.style.setProperty('--dark-title-color', color.darkTitle);
      
      const totalRows = p.data.length;
      const progressPct = totalRows > 0 ? Math.round((p.currentLoc / totalRows) * 100) : 0;
      const timeStr = this.formatCumulativeTime(p.totalTime || 0);

      const typeLabel = p.type === 'text' ? 'Written' : 'Grid';
      const specsLabel = p.type === 'text' ? `${totalRows} Rows` : `Size ${p.data[0].length}×${totalRows}`;

      item.innerHTML = `
        <div class="project-info">
          <div class="project-name">${p.name}</div>
          <div class="project-details">
            <span style="font-size: 0.75rem; opacity: 0.85;">${typeLabel} • ${specsLabel}</span>
            
            <!-- 胶囊进度条 -->
            <div class="progress-pill-wrapper" style="display: flex; align-items: center; gap: 8px; margin: 0.2rem 0;">
              <div class="mini-progress-pill">
                <div class="mini-progress-fill" style="width: ${progressPct}%;"></div>
              </div>
              <span style="font-size: 0.75rem; font-weight: 500;">${progressPct}%</span>
            </div>
            
            <span style="font-size: 0.7rem; opacity: 0.8;">Row ${p.currentLoc}/${totalRows} • Time ${timeStr}</span>
          </div>
        </div>
        <div class="project-actions">
          <button class="btn icon-btn btn-rename-project" data-id="${p.id}" title="Rename" aria-label="Rename">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path></svg>
          </button>
          <button class="btn icon-btn btn-duplicate-project" data-id="${p.id}" title="Duplicate" aria-label="Duplicate">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="btn icon-btn danger-text btn-delete-project" data-id="${p.id}" title="Delete" aria-label="Delete">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      // 点击项目信息进入播放器
      item.querySelector('.project-info').addEventListener('click', () => {
        this.openProject(p.id);
      });

      // 重命名项目
      item.querySelector('.btn-rename-project').addEventListener('click', (e) => {
        e.stopPropagation();
        this.renameProject(p.id);
      });

      // 复制项目
      item.querySelector('.btn-duplicate-project').addEventListener('click', (e) => {
        e.stopPropagation();
        this.duplicateProject(p.id);
      });

      // 删除项目
      item.querySelector('.btn-delete-project').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${p.name}"? This action cannot be undone.`)) {
          this.deleteProject(p.id);
        }
      });

      // 拖拽排序交互与“咻”声音效
      item.setAttribute('draggable', 'true');
      item.dataset.index = idx;

      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', idx);
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.project-item').forEach(el => el.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const toIdx = idx;

        if (!isNaN(fromIdx) && fromIdx !== toIdx) {
          const [movedProject] = this.projects.splice(fromIdx, 1);
          this.projects.splice(toIdx, 0, movedProject);
          this.saveProjects();
          
          this.playSwooshSound();
          this.renderProjectList();
          this.showToast('已成功调整图解顺序 咻~');
        }
      });

      container.appendChild(item);
    });
  },

  // 播放“咻~” (Swoosh/Whoosh) 拖拽置换音效 (Web Audio API 极速合成)
  playSwooshSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const bufferSize = Math.floor(ctx.sampleRate * 0.24);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.1);
      filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.24);
      filter.Q.setValueAtTime(4, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 0.24);
    } catch (e) {
      console.log('Swoosh sound error:', e);
    }
  },

  deleteProject(id) {
    this.projects = this.projects.filter(p => p.id !== id);
    this.saveProjects();
    this.renderProjectList();
    this.showToast('Project deleted successfully');
  },

  duplicateProject(id) {
    const project = this.projects.find(p => p.id === id);
    if (!project) return;

    // 深拷贝数据
    const duplicatedData = JSON.parse(JSON.stringify(project.data));
    const duplicatedRefLinks = project.referenceLinks ? JSON.parse(JSON.stringify(project.referenceLinks)) : [];

    const newProj = {
      id: 'proj-' + Date.now(),
      name: project.name + ' - Copy',
      type: project.type,
      currentLoc: project.currentLoc,
      knitType: project.knitType || undefined,
      totalTime: 0, // 重置复本的用时
      referenceLinks: duplicatedRefLinks,
      updatedAt: new Date().toISOString(),
      data: duplicatedData
    };

    this.projects.unshift(newProj);
    this.saveProjects();
    this.renderProjectList();
    this.showToast('Project duplicated successfully!');
  },

  renameProject(id) {
    const project = this.projects.find(p => p.id === id);
    if (!project) return;

    const newName = prompt('Enter new project name:', project.name);
    if (newName === null) return;
    const cleanName = newName.trim();
    if (!cleanName) {
      alert('Name cannot be empty');
      return;
    }

    project.name = cleanName;
    project.updatedAt = new Date().toISOString();
    this.saveProjects();
    this.renderProjectList();
    this.showToast('Project renamed');
  },



  // ==========================================================================
  // 项目生命周期（打开、新建、重置、编辑）
  // ==========================================================================
  openProject(id) {
    const project = this.projects.find(p => p.id === id);
    if (!project) return;

    this.currentProject = project;
    this.sessionTime = 0; // 重置本轮会话时间
    this.isTimerPaused = false; // 重置暂停状态
    this.startTimer();
    
    // 更新暂停按钮初始状态
    const textToggle = document.getElementById('btn-text-timer-toggle');
    const gridToggle = document.getElementById('btn-grid-timer-toggle');
    if (textToggle) textToggle.textContent = '⏸️';
    if (gridToggle) gridToggle.textContent = '⏸️';

    if (project.type === 'text') {
      this.initTextPlayer();
      this.switchView('view-text-player');
    } else {
      this.initGridPlayer();
      this.switchView('view-grid-player');
    }
    
    // 打开时进行首行播报（如果开启了 TTS 并且不是第一行，或者用户需要）
    this.triggerSpeechForActiveRow();
  },

  // 1. 初始化文字模式 Player
  initTextPlayer() {
    const p = this.currentProject;
    document.getElementById('text-player-title').textContent = p.name;
    this.updateTextPlayerUI();
    this.renderTextRowsList();
    this.renderReferenceLinks();
    this.renderMotifs();

    const addBtn = document.getElementById('btn-add-motif');
    if (addBtn) {
      addBtn.onclick = () => this.addMotif();
    }
  },

  updateTextPlayerUI() {
    const p = this.currentProject;
    const activeIndex = p.currentLoc - 1;
    const total = p.data.length;

    const isOdd = p.currentLoc % 2 !== 0;
    const rowNumEl = document.getElementById('text-huge-row-num');
    const badgeText = isOdd ? 'Odd 单数行 (正面 RS)' : 'Even 双数行 (反面 WS)';
    const badgeClass = isOdd ? 'row-badge-odd' : 'row-badge-even';

    // 动态更新主指示牌左侧单双行粉/绿修饰线条
    const activeCard = document.querySelector('#view-text-player .active-row-card');
    if (activeCard) {
      if (isOdd) {
        activeCard.classList.add('card-odd');
        activeCard.classList.remove('card-even');
      } else {
        activeCard.classList.add('card-even');
        activeCard.classList.remove('card-odd');
      }
    }

    document.getElementById('text-row-progress').textContent = `${p.currentLoc} / ${total} Rows`;
    rowNumEl.innerHTML = `ROW  <span class="${isOdd ? 'num-highlight-odd' : 'num-highlight-even'}">${p.currentLoc}</span> <span class="active-row-type-badge ${badgeClass}">${badgeText}</span>`;
    
    const activeRowData = p.data[activeIndex];
    const descEl = document.getElementById('text-stitch-instructions');
    if (activeRowData) {
      descEl.textContent = activeRowData.text;
    } else {
      descEl.textContent = 'Undefined stitch instruction';
    }

    // 更新进度条
    const percent = total > 0 ? Math.round((p.currentLoc / total) * 100) : 0;
    document.getElementById('text-progress-percent').textContent = `${percent}%`;
    document.getElementById('text-progress-fill').style.width = `${percent}%`;

    // 更新列表激活状态
    document.querySelectorAll('#text-rows-list .row-item').forEach((item, idx) => {
      if (idx === activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        item.classList.remove('active');
      }
    });

    this.highlightActiveMotifs();
    this.renderMotifBreakdown(activeRowData ? activeRowData.text : '');
    this.updateTimerDisplay();
  },

  renderMotifBreakdown(text) {
    const breakdownArea = document.getElementById('text-motif-breakdown-area');
    if (!breakdownArea) return;

    const p = this.currentProject;
    if (!p || !p.motifs || p.motifs.length === 0 || !text) {
      breakdownArea.style.display = 'none';
      return;
    }

    const isExactCodeMatch = (code, fullText) => {
      if (!code || !fullText) return false;
      const cleanCode = code.replace(/[\[\]]/g, '').trim();
      if (!cleanCode) return false;
      const escaped = cleanCode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(\\[${escaped}\\]|\\b${escaped}\\b)(?!\\d)`, 'i');
      return regex.test(fullText);
    };

    const matchedItems = [];

    p.motifs.forEach(motif => {
      const lines = (motif.desc || '').split('\n').map(l => l.trim()).filter(Boolean);
      lines.forEach(line => {
        const subMatch = line.match(/^([A-Za-z0-9_]+|\[[A-Za-z0-9_]+\]|R\d+|Row\s*\d+|行\s*\d+)[:：\s]*\[?(.*?)\]?$/i);
        let subCode = '';
        let subText = line;
        if (subMatch && subMatch[2] !== undefined) {
          subCode = subMatch[1].replace(/[\[\]]/g, '').trim();
          subText = subMatch[2].trim();
        }

        if (subCode && isExactCodeMatch(subCode, text)) {
          matchedItems.push({ code: subCode, text: subText, group: motif.code });
        } else if (!subCode && isExactCodeMatch(motif.code, text)) {
          matchedItems.push({ code: motif.code, text: line, group: motif.code });
        }
      });
    });

    breakdownArea.style.display = 'block';

    if (matchedItems.length > 0) {
      breakdownArea.style.background = 'rgba(209, 142, 151, 0.12)';
      breakdownArea.style.borderLeft = '4px solid var(--primary)';
      breakdownArea.style.padding = '0.75rem 1rem';

      const itemsHTML = matchedItems.map(item => `
        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.95rem; color: var(--text-main); font-weight: 600; background: rgba(255,255,255,0.7); padding: 6px 12px; border-radius: 6px; border: 1px solid var(--card-border);">
          <span style="font-family: monospace; font-size: 0.85rem; background: var(--primary); color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${item.code}</span>
          <span style="flex: 1; word-break: break-word;">${item.text}</span>
        </div>
      `).join('');

      breakdownArea.innerHTML = `
        <div style="font-size: 0.82rem; font-weight: 700; color: var(--primary); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          <span>🌸 子图解针法展开 (Sub-Pattern Breakdown)</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${itemsHTML}
        </div>
      `;
    } else {
      // 当前行没有花样
      breakdownArea.style.background = 'rgba(0, 0, 0, 0.03)';
      breakdownArea.style.borderLeft = '4px solid var(--text-muted)';
      breakdownArea.style.padding = '0.55rem 0.85rem';
      breakdownArea.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; font-style: italic;">
          <span>💡 <strong>独立花样提示：</strong>【这行没有花样哦，请继续编织吧】</span>
        </div>
      `;
    }
  },

  renderTextRowsList() {
    const container = document.getElementById('text-rows-list');
    container.innerHTML = '';
    
    this.currentProject.data.forEach((row, idx) => {
      const item = document.createElement('div');
      const isOdd = row.rowNum % 2 !== 0;
      item.className = `row-item ${isOdd ? 'row-odd' : 'row-even'}`;
      if (row.rowNum === this.currentProject.currentLoc) {
        item.classList.add('active');
      }
      
      const tagText = isOdd ? 'Odd' : 'Even';
      const tagClass = isOdd ? 'tag-odd' : 'tag-even';
      
      item.innerHTML = `
        <div class="row-num-pill-group">
          <span class="num-badge ${isOdd ? 'num-badge-odd' : 'num-badge-even'}">Row ${row.rowNum}</span>
          <span class="row-type-tag ${tagClass}">${tagText}</span>
        </div>
        <span class="desc">${row.text}</span>
      `;
      
      item.addEventListener('click', () => {
        this.currentProject.currentLoc = row.rowNum;
        this.saveProjects();
        this.updateTextPlayerUI();
        this.triggerSpeechForActiveRow();
      });

      container.appendChild(item);
    });
  },

  // 子图解 / 花样对照表 (Sub-Patterns Glossary) 核心管理
  renderMotifs() {
    const p = this.currentProject;
    if (!p) return;

    const container = document.getElementById('text-motifs-list');
    if (!container) return;

    if (!p.motifs) {
      p.motifs = [];
    }

    // 如果未设置且图解文本中包含 [F1], [F2] 等，自动智能解析生成
    if (p.motifs.length === 0 && p.type === 'text' && p.data) {
      const detected = new Set();
      p.data.forEach(r => {
        const matches = r.text.match(/\[[A-Za-z0-9_]+\]/g);
        if (matches) {
          matches.forEach(m => detected.add(m));
        }
      });

      const defaultExpl = {
        '[F1]': 'F1 [1下, 1扭上, 1下]\nF2 [1上, 1扭下, 1上]',
        '[F2]': 'F1 [1扭下, 1上, 1扭下]\nF2 [1扭上, 1下, 1扭上]',
        '[F3]': 'F1 [2下, 1扭上, 2下]\nF2 [2上, 1扭下, 2上]'
      };

      detected.forEach(code => {
        p.motifs.push({
          code: code,
          desc: defaultExpl[code] || 'F1 [自定义独立花样 / 针法对照解说]'
        });
      });
      this.saveProjects();
    }

    container.innerHTML = '';

    if (p.motifs.length === 0) {
      container.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.8rem; font-style: italic; text-align: center; padding: 0.75rem 0;">
          暂无子花样对照，点击上方 "+ Add Motif" 批量输入或添加自定义花样解（如 [小野花] 或 [F16]）。
        </div>
      `;
      return;
    }

    p.motifs.forEach((motif, idx) => {
      const groupItem = document.createElement('div');
      groupItem.className = 'motif-group-card';
      groupItem.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 0.75rem 0.85rem;
        background-color: var(--bg-color);
        border-radius: var(--radius-sm);
        border: 1px solid var(--card-border);
        margin-bottom: 0.6rem;
        transition: var(--transition);
      `;

      // 组卡片顶部标头
      const headerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--card-border); padding-bottom: 6px;">
          <span class="motif-code-badge" style="font-family: monospace; font-weight: 700; color: var(--primary); background: var(--primary-light); padding: 2px 8px; border-radius: 4px; font-size: 0.88rem;">${motif.code}</span>
          <div style="display: flex; gap: 4px;">
            <button class="btn text-btn btn-edit-motif" data-index="${idx}" style="padding: 1px 6px; font-size: 0.75rem;">修改</button>
            <button class="btn text-btn danger-text btn-delete-motif" data-index="${idx}" style="padding: 1px 6px; font-size: 0.75rem;">删除</button>
          </div>
        </div>
      `;

      // 智能解析子行（如 F1 [...], F2 [...], R1: ..., 行1: ...）
      const lines = (motif.desc || '').split('\n').map(l => l.trim()).filter(Boolean);
      let subItemsHTML = '';

      if (lines.length > 0) {
        subItemsHTML = lines.map((line, lineIdx) => {
          // 正则解析：支持 F1 [...], F1: ..., [F1] ..., R1: ..., 行1: ...
          const subMatch = line.match(/^([A-Za-z0-9_]+|\[[A-Za-z0-9_]+\]|R\d+|Row\s*\d+|行\s*\d+)[:：\s]*\[?(.*?)\]?$/i);

          let subCode = '';
          let subText = line;

          if (subMatch && subMatch[2] !== undefined) {
            subCode = subMatch[1].replace(/[\[\]]/g, '').trim(); // 提取纯代码如 "F1"
            subText = subMatch[2].trim(); // 提取纯针法说明
          }

          const fullSubCode = subCode ? subCode : '';
          const subRowNum = lineIdx + 1; // 1-indexed

          return `
            <div class="motif-sub-row" data-code="${fullSubCode}" data-bracket-code="[${fullSubCode}]" data-sub-row-num="${subRowNum}" style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.85rem; padding: 6px 8px; border-radius: 6px; border: 1px solid transparent; background: rgba(0,0,0,0.02); transition: all 0.25s ease;">
              ${subCode ? `<span class="sub-code-chip" style="font-family: monospace; font-size: 0.78rem; font-weight: 700; background: var(--primary-light); color: var(--primary); padding: 2px 7px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;">${subCode}</span>` : ''}
              <span style="color: var(--text-main); flex: 1; word-break: break-word; line-height: 1.4;">${subText}</span>
            </div>
          `;
        }).join('');
      } else {
        subItemsHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">(未填写说明)</div>`;
      }

      groupItem.innerHTML = headerHTML + `<div class="motif-sub-rows-container" style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">${subItemsHTML}</div>`;

      // 绑定编辑与删除
      groupItem.querySelector('.btn-edit-motif').onclick = (e) => {
        e.stopPropagation();
        this.openMotifModal(idx);
      };
      groupItem.querySelector('.btn-delete-motif').onclick = (e) => {
        e.stopPropagation();
        if (confirm(`确定要删除子图解花样 “${motif.code}” 吗？`)) {
          p.motifs.splice(idx, 1);
          this.saveProjects();
          this.renderMotifs();
        }
      };

      container.appendChild(groupItem);
    });

    this.highlightActiveMotifs();
  },

  highlightActiveMotifs() {
    const p = this.currentProject;
    if (!p || p.type !== 'text') return;

    const activeIndex = p.currentLoc - 1;
    const activeRowData = p.data[activeIndex];
    if (!activeRowData) return;

    const text = activeRowData.text || ''; // 当前主图解行的文本说明

    // 辅助函数：精确单词/边界匹配，防止 F1 误匹配 F18
    const isExactCodeMatch = (code, fullText) => {
      if (!code || !fullText) return false;
      const cleanCode = code.replace(/[\[\]]/g, '').trim();
      if (!cleanCode) return false;
      const escaped = cleanCode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // 匹配 [F1] 或 独立的 F1（后面不能紧跟数字，如 F18）
      const regex = new RegExp(`(\\[${escaped}\\]|\\b${escaped}\\b)(?!\\d)`, 'i');
      return regex.test(fullText);
    };

    // 1. 重置所有独立子行卡片及外层组卡片的样式
    document.querySelectorAll('#text-motifs-list .motif-sub-row').forEach(row => {
      row.classList.remove('active-motif-pulse');
      row.style.borderColor = 'transparent';
      row.style.backgroundColor = 'rgba(0,0,0,0.02)';
      row.style.boxShadow = 'none';
    });

    document.querySelectorAll('#text-motifs-list .motif-group-card').forEach(card => {
      card.style.borderColor = 'var(--card-border)';
      card.style.boxShadow = 'none';
    });

    let firstMatchedEl = null;

    // 2. 检索当前行文本，精确匹配对应的独立花样子行（如 F18 或 [F18]）
    document.querySelectorAll('#text-motifs-list .motif-sub-row').forEach(row => {
      const code = row.dataset.code; // 如 "F18"
      const bracketCode = row.dataset.bracketCode; // 如 "[F18]"

      let isMatch = false;

      // 精确边界匹配（F1 不会匹配到 F18）
      if (isExactCodeMatch(code, text) || isExactCodeMatch(bracketCode, text)) {
        isMatch = true;
      }

      if (isMatch) {
        // 触发高亮呼吸闪烁动画！
        row.classList.add('active-motif-pulse');
        row.style.borderColor = 'var(--primary)';
        row.style.backgroundColor = 'var(--primary-light)';

        // 同时高亮所属的大组卡片
        const parentCard = row.closest('.motif-group-card');
        if (parentCard) {
          parentCard.style.borderColor = 'var(--primary)';
        }

        if (!firstMatchedEl) {
          firstMatchedEl = row;
        }
      }
    });

    // 3. 匹配花样大组名称（如 [小野花]）
    document.querySelectorAll('#text-motifs-list .motif-group-card').forEach(card => {
      const groupCodeBadge = card.querySelector('.motif-code-badge');
      if (groupCodeBadge) {
        const groupCode = groupCodeBadge.textContent.trim();
        if (isExactCodeMatch(groupCode, text)) {
          card.style.borderColor = 'var(--primary)';
          if (!firstMatchedEl) firstMatchedEl = card;
        }
      }
    });

    // 4. 精确置顶滚动：将高亮匹配的花样行（如 F17/F18）直接滚动定位至清单框最顶部！
    const listContainer = document.getElementById('text-motifs-list');
    if (listContainer && firstMatchedEl) {
      const containerRect = listContainer.getBoundingClientRect();
      const elementRect = firstMatchedEl.getBoundingClientRect();
      const targetScrollTop = listContainer.scrollTop + (elementRect.top - containerRect.top) - 8;

      listContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    }
  },

  addMotif() {
    this.openMotifModal(-1);
  },

  openMotifModal(editIdx = -1) {
    const p = this.currentProject;
    if (!p) return;
    if (!p.motifs) p.motifs = [];

    const modal = document.getElementById('motif-modal');
    if (!modal) return;

    const batchTab = document.getElementById('motif-tab-batch');
    const singleTab = document.getElementById('motif-tab-single');
    const tabBtnBatch = document.getElementById('tab-btn-motif-batch');
    const tabBtnSingle = document.getElementById('tab-btn-motif-single');

    if (editIdx >= 0) {
      // 切换至单个编辑模式
      batchTab.classList.add('hidden');
      singleTab.classList.remove('hidden');
      tabBtnBatch.style.opacity = '0.7';
      tabBtnBatch.style.borderBottom = 'none';
      tabBtnSingle.style.opacity = '1';
      tabBtnSingle.style.borderBottom = '2px solid var(--primary)';

      const current = p.motifs[editIdx];
      document.getElementById('motif-single-index').value = editIdx;
      document.getElementById('motif-single-code').value = current.code;
      document.getElementById('motif-single-desc').value = current.desc;
    } else {
      // 切换至批量写模式
      singleTab.classList.add('hidden');
      batchTab.classList.remove('hidden');
      tabBtnSingle.style.opacity = '0.7';
      tabBtnSingle.style.borderBottom = 'none';
      tabBtnBatch.style.opacity = '1';
      tabBtnBatch.style.borderBottom = '2px solid var(--primary)';

      // 预填充当前所有花样格式化文本
      let batchText = '';
      if (p.motifs.length > 0) {
        batchText = p.motifs.map(m => `${m.code}\n${m.desc}`).join('\n\n');
      }
      document.getElementById('motif-batch-input').value = batchText;
    }

    modal.classList.remove('hidden');
  },

  closeMotifModal() {
    const modal = document.getElementById('motif-modal');
    if (modal) modal.classList.add('hidden');
  },

  saveBatchMotifs() {
    const p = this.currentProject;
    if (!p) return;

    const text = document.getElementById('motif-batch-input').value;
    if (!text || !text.trim()) {
      p.motifs = [];
    } else {
      const lines = text.split('\n');
      const parsed = [];
      let curCode = null;
      let curLines = [];

      const flush = () => {
        if (curCode) {
          parsed.push({
            code: curCode,
            desc: curLines.join('\n').trim()
          });
        }
      };

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // 匹配 [F16] 或 [麻花A] 或 F16: 等开头的代号
        const tagMatch = trimmed.match(/^(\[[^\]]+\]|[A-Za-z0-9_]+:)$/);
        if (tagMatch) {
          flush();
          let tag = tagMatch[1];
          if (tag.endsWith(':')) tag = tag.slice(0, -1).trim();
          if (!tag.startsWith('[')) tag = `[${tag}]`;
          curCode = tag;
          curLines = [];
        } else {
          if (!curCode) {
            curCode = '[F1]';
          }
          curLines.push(trimmed);
        }
      });
      flush();

      p.motifs = parsed;
    }

    this.saveProjects();
    this.renderMotifs();
    this.closeMotifModal();
    this.showToast('已批量导入并更新子图解花样说明！');
  },

  saveSingleMotif() {
    const p = this.currentProject;
    if (!p) return;
    if (!p.motifs) p.motifs = [];

    const idx = parseInt(document.getElementById('motif-single-index').value);
    let code = document.getElementById('motif-single-code').value.trim();
    const desc = document.getElementById('motif-single-desc').value.trim();

    if (!code) {
      alert('请填写花样代号！');
      return;
    }

    if (!code.startsWith('[')) code = `[${code}]`;

    if (idx >= 0 && idx < p.motifs.length) {
      p.motifs[idx] = { code, desc };
    } else {
      p.motifs.push({ code, desc });
    }

    this.saveProjects();
    this.renderMotifs();
    this.closeMotifModal();
    this.showToast(`已保存独立花样: ${code}`);
  },

  bindMotifModalEvents() {
    const closeBtn = document.getElementById('btn-close-motif-modal');
    const cancelBatch = document.getElementById('btn-cancel-motif-batch');
    const cancelSingle = document.getElementById('btn-cancel-motif-single');
    const saveBatch = document.getElementById('btn-save-motif-batch');
    const saveSingle = document.getElementById('btn-save-motif-single');
    const tabBatch = document.getElementById('tab-btn-motif-batch');
    const tabSingle = document.getElementById('tab-btn-motif-single');

    if (closeBtn) closeBtn.onclick = () => this.closeMotifModal();
    if (cancelBatch) cancelBatch.onclick = () => this.closeMotifModal();
    if (cancelSingle) cancelSingle.onclick = () => this.closeMotifModal();

    if (saveBatch) saveBatch.onclick = () => this.saveBatchMotifs();
    if (saveSingle) saveSingle.onclick = () => this.saveSingleMotif();

    if (tabBatch && tabSingle) {
      tabBatch.onclick = () => {
        document.getElementById('motif-tab-single').classList.add('hidden');
        document.getElementById('motif-tab-batch').classList.remove('hidden');
        tabBatch.style.opacity = '1';
        tabBatch.style.borderBottom = '2px solid var(--primary)';
        tabSingle.style.opacity = '0.7';
        tabSingle.style.borderBottom = 'none';
      };

      tabSingle.onclick = () => {
        document.getElementById('motif-tab-batch').classList.add('hidden');
        document.getElementById('motif-tab-single').classList.remove('hidden');
        tabSingle.style.opacity = '1';
        tabSingle.style.borderBottom = '2px solid var(--primary)';
        tabBatch.style.opacity = '0.7';
        tabBatch.style.borderBottom = 'none';
      };
    }
  },

  // 顶栏快速教程徽章显示
  renderTutorialLink() {
    const p = this.currentProject;
    if (!p) return;
    
    const areaId = p.type === 'text' ? 'text-tutorial-link-area' : 'grid-tutorial-link-area';
    const container = document.getElementById(areaId);
    if (!container) return;

    container.innerHTML = '';
    
    const count = p.referenceLinks ? p.referenceLinks.length : 0;
    if (count > 0) {
      container.innerHTML = `
        <a href="#${p.type}-tutorials-card" class="badge time tutorial-badge-link" title="点击滚动到下方教程列表区" style="text-decoration: none; cursor: pointer;">
          📖 ${count} 个教程视频/网页
        </a>
      `;
      // 绑定平滑滚动
      container.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        const card = document.getElementById(`${p.type}-tutorials-card`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth' });
        }
      });
    } else {
      container.innerHTML = `
        <button class="badge add-link-badge-inline" id="btn-quick-add-link" style="border: 1px dashed var(--primary); background: none; color: var(--primary); cursor: pointer;" title="绑定参考教程">➕ 绑定教程</button>
      `;
      container.querySelector('#btn-quick-add-link').addEventListener('click', (e) => {
        e.preventDefault();
        this.addReferenceLink();
      });
    }
  },

  // 动态渲染教程与针法教学列表卡片
  renderReferenceLinks() {
    const p = this.currentProject;
    if (!p) return;

    const listId = p.type === 'text' ? 'text-tutorials-list' : 'grid-tutorials-list';
    const container = document.getElementById(listId);
    if (!container) return;

    container.innerHTML = '';

    if (!p.referenceLinks) {
      p.referenceLinks = [];
    }

    if (p.referenceLinks.length === 0) {
      container.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; text-align: center; padding: 1rem 0;">
          暂未添加针法或花样教程，点击下方按钮添加。
        </div>
      `;
      this.renderTutorialLink();
      return;
    }

    p.referenceLinks.forEach((link, idx) => {
      const item = document.createElement('div');
      item.className = 'tutorial-row-item';
      item.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 0.6rem 0.85rem;
        background-color: var(--bg-color);
        border-radius: var(--radius-sm);
        border: 1px solid var(--card-border);
        transition: var(--transition);
        margin-bottom: 0.25rem;
      `;

      const memoHtml = link.memo && link.memo.trim() 
        ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">📝 备注: ${link.memo}</div>` 
        : '';

      item.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px; flex: 1; padding-right: 8px;">
          <a href="${link.url}" target="_blank" style="text-decoration: none; color: var(--primary); font-weight: 600; display: inline-flex; align-items: center; gap: 6px; font-size: 0.9rem;" title="${link.url}">
            <svg viewBox="0 0 64 64" width="16" height="16" style="fill: none; stroke: var(--primary); stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; display: inline-block; vertical-align: middle;"><circle cx="32" cy="32" r="26" fill="rgba(208, 108, 84, 0.08)" stroke-width="5" /><path d="M14 24 C 24 16, 40 16, 50 24" /><path d="M8 32 C 22 22, 42 22, 56 32" /><path d="M14 40 C 24 32, 40 32, 50 40" /><path d="M24 14 C 16 24, 16 40, 24 50" /><path d="M32 8 C 22 22, 22 42, 32 56" /><path d="M40 14 C 32 24, 32 40, 40 50" /><path d="M32 58 C 28 60, 26 58, 24 60 C 22 62, 24 64, 20 64" /></svg>
            ${link.title}
          </a>
          ${memoHtml}
        </div>
        <button class="btn text-btn btn-delete-ref" data-index="${idx}" style="padding: 2px 6px; font-size: 0.8rem; color: var(--danger); margin: 0; font-weight: 500; align-self: center;">删除</button>
      `;

      // 绑定单个链接的删除事件
      item.querySelector('.btn-delete-ref').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`确认要删除教程链接 “${link.title}” 吗？`)) {
          p.referenceLinks.splice(idx, 1);
          this.saveProjects();
          this.renderReferenceLinks();
          this.showToast('链接已成功删除');
        }
      });

      container.appendChild(item);
    });

    // 刷新头部快速徽章显示
    this.renderTutorialLink();
  },

  // 弹出新增教程链接提示
  addReferenceLink() {
    const p = this.currentProject;
    if (!p) return;

    if (!p.referenceLinks) {
      p.referenceLinks = [];
    }

    const title = prompt('Enter tutorial title (e.g. Cable Stitch / Elastic Bind-off):');
    if (title === null) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      alert('Title cannot be empty');
      return;
    }

    const url = prompt(`Enter video or webpage URL for "${cleanTitle}":`);
    if (url === null) return;
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      alert('URL cannot be empty');
      return;
    }

    const memo = prompt(`Enter optional notes/tips (e.g. For Row 6, keep tension tight):`);
    const cleanMemo = memo ? memo.trim() : '';

    p.referenceLinks.push({
      title: cleanTitle,
      url: cleanUrl,
      memo: cleanMemo
    });

    this.saveProjects();
    this.renderReferenceLinks();
    this.showToast(`Added tutorial: ${cleanTitle}`);
  },

  // 2. 初始化网格模式 Player
  initGridPlayer() {
    const p = this.currentProject;
    document.getElementById('grid-player-title').textContent = p.name;
    document.getElementById('grid-meta-knit').textContent = p.knitType === 'flat' ? 'Flat' : 'Circular';
    
    // 加载项目保存的自定义线材调色盘
    Grid.loadProjectStitches(p.customStitches);

    // 初始化画笔调色盘与图例
    this.renderStitchPalette();
    this.renderStitchLegend();
    
    // 默认进入【逐行点击编织模式】(Row Tracker & Knitting Mode)
    Grid.isEditMode = false;
    this.updateGridPlayerUIState();
    
    // 渲染网格
    this.renderGridCanvas();
    this.renderReferenceLinks();
    this.updateGridPlayerUI();
  },

  updateGridPlayerUIState() {
    const toggleBtn = document.getElementById('btn-grid-toggle-mode');
    const palette = document.getElementById('paint-palette');
    const legend = document.getElementById('legend-display');
    const clearBtn = document.getElementById('btn-edit-clear');
    const editIndicator = document.getElementById('edit-indicator');
    const dimActions = document.querySelector('.grid-dim-actions');
    const activeRowCard = document.getElementById('grid-active-row-card');

    if (Grid.isEditMode) {
      if (toggleBtn) {
        toggleBtn.textContent = '✅ 完成编辑 & 返回逐行编织 / Done Editing';
        toggleBtn.classList.add('editing-active');
        toggleBtn.style.cssText = 'background: linear-gradient(135deg, #839958, #6d8244) !important; color: #ffffff !important; border: none !important; padding: 0.5rem 1rem !important; border-radius: 20px !important; font-weight: 700 !important; font-size: 0.88rem !important; box-shadow: 0 4px 12px rgba(131, 153, 88, 0.4) !important; cursor: pointer; transition: all 0.2s ease;';
      }
      if (palette) palette.classList.remove('hidden');
      if (legend) legend.classList.remove('hidden');
      if (clearBtn) clearBtn.classList.remove('hidden');
      if (dimActions) dimActions.classList.remove('hidden');
      if (activeRowCard) activeRowCard.classList.add('hidden');
      if (editIndicator) {
        editIndicator.textContent = 'Interactive Paint & Symbol Mode';
        editIndicator.classList.remove('hidden');
      }
    } else {
      if (toggleBtn) {
        toggleBtn.textContent = '🎨 编辑网格图解与颜料 / Edit Grid';
        toggleBtn.classList.remove('editing-active');
        toggleBtn.style.cssText = 'background: linear-gradient(135deg, #D18E97, #C06C76) !important; color: #ffffff !important; border: none !important; padding: 0.5rem 1rem !important; border-radius: 20px !important; font-weight: 700 !important; font-size: 0.88rem !important; box-shadow: 0 4px 14px rgba(209, 142, 151, 0.45) !important; cursor: pointer; transition: all 0.2s ease;';
      }
      if (palette) palette.classList.add('hidden');
      if (legend) legend.classList.add('hidden');
      if (clearBtn) clearBtn.classList.add('hidden');
      if (dimActions) dimActions.classList.add('hidden');
      if (activeRowCard) activeRowCard.classList.remove('hidden');
      if (editIndicator) {
        editIndicator.textContent = 'Row Tracker Mode';
        editIndicator.classList.add('hidden');
      }
    }
  },

  updateGridPlayerUI() {
    const p = this.currentProject;
    const total = p.data.length;

    const isOdd = p.currentLoc % 2 !== 0;
    const gridRowNumEl = document.getElementById('grid-huge-row-num');
    const badgeText = isOdd ? 'Odd 单数行 (正面 RS)' : 'Even 双数行 (反面 WS)';
    const badgeClass = isOdd ? 'row-badge-odd' : 'row-badge-even';

    document.getElementById('grid-row-progress').textContent = `${p.currentLoc} / ${total} Rows`;
    gridRowNumEl.innerHTML = `ROW  <span class="${isOdd ? 'num-highlight-odd' : 'num-highlight-even'}">${p.currentLoc}</span> <span class="active-row-type-badge ${badgeClass}">${badgeText}</span>`;
    
    // 自动计算当前行的阅图方向
    const isFlat = p.knitType === 'flat';
    const isEven = p.currentLoc % 2 === 0;
    const dirIndicator = document.getElementById('grid-direction-indicator');
    
    if (isFlat && isEven) {
      dirIndicator.innerHTML = '看图解方向：从左向右 <span class="arrow">←—</span> / Left to Right';
      dirIndicator.style.color = 'var(--secondary)';
    } else {
      dirIndicator.innerHTML = '看图解方向：从右向左 <span class="arrow">—→</span> / Right to Left';
      dirIndicator.style.color = 'var(--primary)';
    }

    // 更新进度条
    const percent = total > 0 ? Math.round((p.currentLoc / total) * 100) : 0;
    document.getElementById('grid-progress-percent').textContent = `${percent}%`;
    document.getElementById('grid-progress-fill').style.width = `${percent}%`;

    // 显示当前行针法的大纲简写
    const descPreview = document.getElementById('grid-row-stitch-preview');
    descPreview.textContent = Grid.getRowDescription(p.currentLoc);

    // 重绘网格以刷新高亮框，并自动平滑滚动当前活跃行居中显示
    this.renderGridCanvas();
    this.scrollToActiveRowInGrid();
    this.updateTimerDisplay();
  },

  scrollToActiveRowInGrid() {
    const p = this.currentProject;
    if (!p || p.type !== 'grid') return;

    const wrapper = document.querySelector('.grid-scroll-wrapper');
    const svg = document.querySelector('.knitting-grid-svg');
    if (!wrapper || !svg) return;

    const totalRows = p.data.length;
    const activeRowIndex = p.currentLoc - 1; // 0-indexed从最底部Row 1计算
    
    const cellSize = 30;
    const axisSize = 25;
    const svgHeight = totalRows * cellSize + axisSize * 2;
    
    // 活跃行中心Y坐标（从SVG顶部往下）
    const activeRowY = svgHeight - axisSize - (activeRowIndex * cellSize) - (cellSize / 2);
    
    // 计算居中 ScrollTop
    const targetScrollTop = activeRowY - (wrapper.clientHeight / 2);

    wrapper.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });
  },

  renderGridCanvas() {
    const p = this.currentProject;
    const container = document.getElementById('grid-canvas-container');
    
    // 加载网格全局变量
    Grid.width = p.data[0].length;
    Grid.height = p.data.length;
    Grid.data = p.data;
    Grid.knitType = p.knitType;

    Grid.render(container, p.currentLoc, (rowIndex, colIndex, event) => {
      // 格子点击/绘图回调
      if (!Grid.isEditMode) {
        // 如果是只读播放模式下点击某一行，直接跳转到该行
        const clickedRow = rowIndex + 1; // rowIndex是0-indexed底层往上
        p.currentLoc = clickedRow;
        this.saveProjects();
        this.updateGridPlayerUI();
        this.triggerSpeechForActiveRow();
        return;
      }

      // 编辑绘制模式
      const selectedKey = Grid.selectedStitch;
      p.data[rowIndex][colIndex] = selectedKey;
      this.saveProjects();
      this.renderGridCanvas();
    });
  },

  renderStitchPalette() {
    const container = document.getElementById('palette-colors');
    container.innerHTML = '';
    
    Object.entries(Grid.stitches).forEach(([key, st]) => {
      const item = document.createElement('div');
      item.className = 'palette-item';
      if (key === Grid.selectedStitch) {
        item.classList.add('active');
      }
      
      let textColor = '#3c3530';
      if (st.color) {
        let hex = st.color.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length === 6) {
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
          if (yiq < 128) textColor = 'rgba(255, 255, 255, 0.95)';
        }
      }

      item.innerHTML = `
        <div class="stitch-icon-box" style="background-color: ${st.color}">${Grid.getStitchSVGIcon(key, textColor, 18)}</div>
        <span>${st.text}</span>
      `;
      
      if (key.startsWith('c_')) {
        const delBtn = document.createElement('div');
        delBtn.className = 'delete-stitch-btn';
        delBtn.innerHTML = '×';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Delete custom yarn "${st.text}"?`)) {
            delete Grid.stitches[key];
            if (Grid.selectedStitch === key) {
              Grid.selectedStitch = 'k';
            }
            if (this.currentProject && this.currentProject.customStitches) {
               delete this.currentProject.customStitches[key];
            }
            this.saveProjects();
            this.renderStitchPalette();
            this.renderStitchLegend();
            this.renderGridCanvas();
          }
        });
        item.appendChild(delBtn);
      }
      
      item.addEventListener('click', () => {
        Grid.selectedStitch = key;
        document.querySelectorAll('.palette-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      });
      
      container.appendChild(item);
    });
  },

  renderStitchLegend() {
    const container = document.getElementById('stitch-legend-list');
    container.innerHTML = '';
    
    Object.entries(Grid.stitches).forEach(([key, st]) => {
      const item = document.createElement('div');
      item.className = 'legend-item';

      let textColor = '#3c3530';
      if (st.color) {
        let hex = st.color.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length === 6) {
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
          if (yiq < 128) textColor = 'rgba(255, 255, 255, 0.95)';
        }
      }

      item.innerHTML = `
        <div class="legend-color-box" style="background-color: ${st.color}">${Grid.getStitchSVGIcon(key, textColor, 15)}</div>
        <span>${st.name}</span>
      `;
      container.appendChild(item);
    });
  },

  // 机械行数计数器咔哒音效 (Web Audio API 纯合成)
  playClickSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // 1. 主振荡器：模拟机械结构跳档咔哒声
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.035);

      // 2. 带通高频噪声：模拟机械卡扣质感
      const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.015);
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 3200;

      const noiseGain = this.audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.audioCtx.destination);

      noise.start(now);
      noise.stop(now + 0.015);
    } catch (e) {
      console.warn('Audio click error:', e);
    }
  },

  // 步进控制：下一行 & 上一行
  nextRow() {
    if (!this.currentProject) return;
    const p = this.currentProject;
    const total = p.data.length;

    if (p.currentLoc < total) {
      this.playClickSound();
      p.currentLoc++;
      this.saveProjects();
      if (p.type === 'text') {
        this.updateTextPlayerUI();
      } else {
        this.updateGridPlayerUI();
      }
      this.triggerSpeechForActiveRow();
    } else {
      this.showToast('Congratulations! Completed all rows! 🎉');
    }
  },

  prevRow() {
    if (!this.currentProject) return;
    const p = this.currentProject;

    if (p.currentLoc > 1) {
      this.playClickSound();
      p.currentLoc--;
      this.saveProjects();
      if (p.type === 'text') {
        this.updateTextPlayerUI();
      } else {
        this.updateGridPlayerUI();
      }
      this.triggerSpeechForActiveRow();
    }
  },

  resetProgress() {
    if (!this.currentProject) return;
    if (confirm('确认要重置当前编织进度到第 1 行吗？')) {
      this.currentProject.currentLoc = 1;
      this.saveProjects();
      if (this.currentProject.type === 'text') {
        this.updateTextPlayerUI();
      } else {
        this.updateGridPlayerUI();
      }
      this.triggerSpeechForActiveRow();
      this.showToast('进度已重置');
    }
  },

  // ==========================================================================
  // 语音播报逻辑
  // ==========================================================================
  initTTSControls() {
    // 语音设置卡片已彻底移除
  },

  triggerSpeechForActiveRow() {
    // 语音辅助播报已彻底移除
  },

  // ==========================================================================
  // 定时器模块
  // ==========================================================================
  toggleTimer() {
    if (!this.currentProject) return;
    
    if (this.isTimerPaused) {
      // 恢复计时
      this.isTimerPaused = false;
      this.startTimer();
      this.showToast('已恢复计时');
    } else {
      // 暂停计时
      this.isTimerPaused = true;
      this.stopTimer();
      this.showToast('已暂停计时');
    }

    const playSymbol = this.isTimerPaused ? '▶️' : '⏸️';
    const textToggle = document.getElementById('btn-text-timer-toggle');
    const gridToggle = document.getElementById('btn-grid-timer-toggle');
    if (textToggle) textToggle.textContent = playSymbol;
    if (gridToggle) gridToggle.textContent = playSymbol;
  },

  startTimer() {
    if (this.isRecordingTime || this.isTimerPaused) return;
    this.isRecordingTime = true;
    
    // 初始化 sessionTime
    if (typeof this.sessionTime !== 'number') {
      this.sessionTime = 0;
    }

    this.timerInterval = setInterval(() => {
      if (this.currentProject && !this.isTimerPaused) {
        this.sessionTime++;
        this.currentProject.totalTime = (this.currentProject.totalTime || 0) + 1;
        this.updateTimerDisplay();
        
        // 间歇性保存时间，每10秒保存一次
        if (this.currentProject.totalTime % 10 === 0) {
          this.saveProjects();
        }
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isRecordingTime = false;
    this.saveProjects();
  },

  updateTimerDisplay() {
    if (!this.currentProject) return;
    
    // 格式化当前会话时间
    const sessionTimeStr = this.formatTime(this.sessionTime || 0);
    
    // 格式化历史累计时间
    const cumulativeTimeStr = 'Total Time: ' + this.formatCumulativeTime(this.currentProject.totalTime || 0);

    const isText = this.currentProject.type === 'text';
    const timeLabelId = isText ? 'text-meta-time' : 'grid-meta-time';
    const cumLabelId = isText ? 'text-meta-cumulative-time' : 'grid-meta-cumulative-time';

    const timeEl = document.getElementById(timeLabelId);
    if (timeEl) {
      timeEl.textContent = sessionTimeStr;
    }

    const cumEl = document.getElementById(cumLabelId);
    if (cumEl) {
      cumEl.textContent = cumulativeTimeStr;
    }
  },

  formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  },

  formatCumulativeTime(seconds) {
    if (!seconds) return '0m';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) {
      return `${mins}m`;
    }
    const hrs = (seconds / 3600).toFixed(1);
    return `${hrs}h`;
  },

  // ==========================================================================
  // 键盘快捷键监听
  // ==========================================================================
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // 避免当用户在输入框或文本域内打字时触发快捷键
      const targetTag = e.target.tagName.toUpperCase();
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault(); // 防止滚动页面
        this.nextRow();
      } else if (e.code === 'Backspace') {
        e.preventDefault();
        this.prevRow();
      }
    });
  },

  // ==========================================================================
  // 事件交互绑定
  // ==========================================================================
  bindEvents() {
    this.bindMotifModalEvents();
    // 仪表盘大厅跳转
    document.getElementById('btn-home').addEventListener('click', () => {
      this.switchView('view-dashboard');
      this.renderProjectList();
    });



    document.getElementById('btn-new-text').addEventListener('click', () => {
      document.getElementById('text-project-name').value = '';
      document.getElementById('text-pattern-input').value = '';
      this.switchView('view-create-text');
    });

    document.getElementById('btn-new-grid').addEventListener('click', () => {
      document.getElementById('grid-project-name').value = '';
      this.switchView('view-create-grid');
    });

    document.getElementById('btn-import-csv').addEventListener('click', () => {
      document.getElementById('csv-project-name').value = '';
      document.getElementById('csv-file-input').value = null;
      document.getElementById('csv-raw-input').value = '';
      this.switchView('view-import-csv');
    });

    // 返回按钮
    document.getElementById('btn-back-text-create').addEventListener('click', () => this.switchView('view-dashboard'));
    document.getElementById('btn-back-grid-create').addEventListener('click', () => this.switchView('view-dashboard'));
    document.getElementById('btn-back-csv-create').addEventListener('click', () => this.switchView('view-dashboard'));
    document.getElementById('btn-back-text-player').addEventListener('click', () => {
      this.switchView('view-dashboard');
      this.renderProjectList();
    });
    document.getElementById('btn-back-grid-player').addEventListener('click', () => {
      this.switchView('view-dashboard');
      this.renderProjectList();
    });

    // 主题切换
    document.getElementById('btn-toggle-theme').addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
    });

    // 文字图解保存与解析
    document.getElementById('btn-save-text-project').addEventListener('click', () => {
      const name = document.getElementById('text-project-name').value.trim();
      const rawText = document.getElementById('text-pattern-input').value;
      const tutorialUrl = document.getElementById('text-tutorial-url').value.trim();

      if (!name) {
        alert('请输入项目名称');
        return;
      }
      if (!rawText.trim()) {
        alert('请粘贴您的文字图解内容');
        return;
      }

      const parsedRows = Parser.parse(rawText);
      if (parsedRows.length === 0) {
        alert('未解析出有效的行描述，请检查格式');
        return;
      }

      const newProj = {
        id: 'proj-' + Date.now(),
        name: name,
        type: 'text',
        currentLoc: 1,
        totalTime: 0,
        referenceLinks: tutorialUrl ? [{ title: '项目主教程', url: tutorialUrl }] : [],
        updatedAt: new Date().toISOString(),
        data: parsedRows
      };

      this.projects.unshift(newProj);
      this.saveProjects();
      this.openProject(newProj.id);
      this.showToast('项目创建并解析成功！');
    });

    // 像素图解空网格创建
    const btnSaveGrid = document.getElementById('btn-save-grid-project');
    if (btnSaveGrid) {
      btnSaveGrid.addEventListener('click', (e) => {
        if (e && e.preventDefault) e.preventDefault();

        const nameInput = document.getElementById('grid-project-name');
        const name = nameInput ? nameInput.value.trim() : '';

        const widthInput = document.getElementById('grid-width');
        let w = widthInput ? parseInt(widthInput.value, 10) : 20;
        if (isNaN(w) || w < 1) w = 20;

        const heightInput = document.getElementById('grid-height');
        let h = heightInput ? parseInt(heightInput.value, 10) : 20;
        if (isNaN(h) || h < 1) h = 20;

        const checkedRadio = document.querySelector('input[name="grid-knit-type"]:checked');
        const type = checkedRadio ? checkedRadio.value : 'flat';

        const tutorialUrlInput = document.getElementById('grid-tutorial-url');
        const tutorialUrl = tutorialUrlInput ? tutorialUrlInput.value.trim() : '';

        if (!name) {
          alert('请输入项目名称');
          if (nameInput) nameInput.focus();
          return;
        }

        // 初始化空白网格
        Grid.initBlank(w, h, type);

        const newProj = {
          id: 'proj-' + Date.now(),
          name: name,
          type: 'grid',
          currentLoc: 1,
          knitType: type,
          totalTime: 0,
          referenceLinks: tutorialUrl ? [{ title: '项目主教程', url: tutorialUrl }] : [],
          updatedAt: new Date().toISOString(),
          data: JSON.parse(JSON.stringify(Grid.data))
        };

        this.projects.unshift(newProj);
        this.saveProjects();
        this.renderProjectList();
        this.openProject(newProj.id);
        this.showToast('空白像素网格创建成功！');
      });
    }

    // CSV 文件/文本解析创建
    document.getElementById('btn-save-csv-project').addEventListener('click', () => {
      const name = document.getElementById('csv-project-name').value.trim();
      const fileInput = document.getElementById('csv-file-input');
      const rawCSV = document.getElementById('csv-raw-input').value;
      const type = document.querySelector('input[name="csv-knit-type"]:checked').value;
      const tutorialUrl = document.getElementById('csv-tutorial-url').value.trim();

      if (!name) {
        alert('请输入项目名称');
        return;
      }

      const proceedWithText = (text) => {
        const success = Grid.parseCSV(text, type);
        if (!success) {
          alert('Failed to parse CSV. Please check the CSV text format.');
          return;
        }

        const newProj = {
          id: 'proj-' + Date.now(),
          name: name,
          type: 'grid',
          currentLoc: 1,
          knitType: type,
          totalTime: 0,
          referenceLinks: tutorialUrl ? [{ title: 'Main Tutorial Link', url: tutorialUrl }] : [],
          updatedAt: new Date().toISOString(),
          data: Grid.data
        };

        this.projects.unshift(newProj);
        this.saveProjects();
        this.openProject(newProj.id);
        this.showToast('CSV chart created successfully!');
      };

      // 优先读取文件
      if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          proceedWithText(e.target.result);
        };
        reader.readAsText(fileInput.files[0], 'UTF-8');
      } else if (rawCSV.trim()) {
        proceedWithText(rawCSV);
      } else {
        alert('Please select a CSV file or paste CSV text');
      }
    });

    // 绑定左侧模板库新建按钮与保存项目为模板按钮
    const btnDirectTpl = document.getElementById('btn-create-template-direct');
    if (btnDirectTpl) {
      btnDirectTpl.addEventListener('click', () => this.createTemplateDirect());
    }

    const btnSaveTplText = document.getElementById('btn-save-as-template-text');
    if (btnSaveTplText) {
      btnSaveTplText.addEventListener('click', () => this.saveCurrentProjectAsTemplate());
    }

    const btnSaveTplGrid = document.getElementById('btn-save-as-template-grid');
    if (btnSaveTplGrid) {
      btnSaveTplGrid.addEventListener('click', () => this.saveCurrentProjectAsTemplate());
    }

    // 文字播放控制
    document.getElementById('btn-text-prev').addEventListener('click', () => this.prevRow());
    document.getElementById('btn-text-next').addEventListener('click', () => this.nextRow());
    document.getElementById('btn-text-reset').addEventListener('click', () => this.resetProgress());
    document.getElementById('btn-text-edit').addEventListener('click', () => {
      // 允许修改文字图解，返回表单并将内容填充回去
      if (confirm('修改图解将会重置您的编织进度，确认修改吗？')) {
        const p = this.currentProject;
        document.getElementById('text-project-name').value = p.name;
        
        // 重新拼回文本
        const rawText = p.data.map(r => `第${r.rowNum}行：${r.text}`).join('\n');
        document.getElementById('text-pattern-input').value = rawText;
        
        // 删除原来的，因为保存会新建
        this.projects = this.projects.filter(proj => proj.id !== p.id);
        this.saveProjects();
        this.switchView('view-create-text');
      }
    });

    // 网格播放控制与画布缩放
    document.getElementById('btn-grid-prev').addEventListener('click', () => this.prevRow());
    document.getElementById('btn-grid-next').addEventListener('click', () => this.nextRow());
    document.getElementById('btn-grid-reset').addEventListener('click', () => this.resetProgress());
    
    document.getElementById('btn-grid-zoom-in').addEventListener('click', () => {
      Grid.zoom = Math.min((Grid.zoom || 1.0) + 0.15, 3.0);
      this.renderGridCanvas();
    });

    document.getElementById('btn-grid-zoom-out').addEventListener('click', () => {
      Grid.zoom = Math.max((Grid.zoom || 1.0) - 0.15, 0.4);
      this.renderGridCanvas();
    });

    // 网格编辑模式切换
    document.getElementById('btn-grid-toggle-mode').addEventListener('click', () => {
      Grid.isEditMode = !Grid.isEditMode;
      this.updateGridPlayerUIState();
      this.renderGridCanvas();
      this.saveProjects();
    });

    // 清空网格画布
    document.getElementById('btn-edit-clear').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all painted stitches on the grid canvas?')) {
        const p = this.currentProject;
        Grid.initBlank(p.data[0].length, p.data.length, p.knitType);
        p.data = Grid.data;
        this.saveProjects();
        this.renderGridCanvas();
        this.showToast('Canvas cleared');
      }
    });

    // 绑定添加自定义线材颜色按钮
    const addYarnBtn = document.getElementById('btn-add-custom-yarn');
    if (addYarnBtn) {
      addYarnBtn.addEventListener('click', () => {
        const hex = document.getElementById('input-custom-yarn-color').value;
        const nameInput = document.getElementById('input-custom-yarn-name');
        const name = nameInput.value.trim() || `Yarn ${hex.toUpperCase()}`;
        const symbolType = document.getElementById('input-custom-yarn-symbol').value;
        
        const key = 'c_' + Date.now().toString(36);
        let symbol = '';
        if (symbolType && symbolType !== 'plain' && Grid.stitches[symbolType]) {
          symbol = Grid.stitches[symbolType].symbol;
        }

        const stitchObj = {
          symbol: symbol,
          name: name,
          color: hex,
          text: name
        };

        Grid.stitches[key] = stitchObj;
        
        if (this.currentProject) {
          if (!this.currentProject.customStitches) {
            this.currentProject.customStitches = {};
          }
          this.currentProject.customStitches[key] = stitchObj;
          this.saveProjects();
        }

        Grid.selectedStitch = key;
        this.renderStitchPalette();
        this.renderStitchLegend();
        
        nameInput.value = '';
        this.showToast(`Added custom yarn color: ${name}`);
      });
    }

    // 绑定网格动态增减行与列按钮
    const addRowBtn = document.getElementById('btn-grid-add-row');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', () => {
        Grid.addRow();
        this.saveProjects();
        this.renderGridCanvas();
        this.updateGridPlayerUI();
      });
    }

    const removeRowBtn = document.getElementById('btn-grid-remove-row');
    if (removeRowBtn) {
      removeRowBtn.addEventListener('click', () => {
        Grid.removeRow();
        this.saveProjects();
        this.renderGridCanvas();
        this.updateGridPlayerUI();
      });
    }

    const addColBtn = document.getElementById('btn-grid-add-col');
    if (addColBtn) {
      addColBtn.addEventListener('click', () => {
        Grid.addCol();
        this.saveProjects();
        this.renderGridCanvas();
        this.updateGridPlayerUI();
      });
    }

    const removeColBtn = document.getElementById('btn-grid-remove-col');
    if (removeColBtn) {
      removeColBtn.addEventListener('click', () => {
        Grid.removeCol();
        this.saveProjects();
        this.renderGridCanvas();
        this.updateGridPlayerUI();
      });
    }

    // 绑定添加教程和针法链接按钮
    document.getElementById('btn-text-add-tutorial').addEventListener('click', () => this.addReferenceLink());
    document.getElementById('btn-grid-add-tutorial').addEventListener('click', () => this.addReferenceLink());

    // 绑定计时器切换按钮
    document.getElementById('btn-text-timer-toggle').addEventListener('click', () => this.toggleTimer());
    document.getElementById('btn-grid-timer-toggle').addEventListener('click', () => this.toggleTimer());

    // 绑定打印与导出按钮
    document.getElementById('btn-text-print').addEventListener('click', () => window.print());
    document.getElementById('btn-grid-print').addEventListener('click', () => window.print());
    
    const textCopyBtn = document.getElementById('btn-text-copy');
    if (textCopyBtn) textCopyBtn.addEventListener('click', () => this.copyTextPattern());

    const gridExportBtn = document.getElementById('btn-grid-export-png');
    if (gridExportBtn) gridExportBtn.addEventListener('click', () => this.exportGridPNG());
  },

  // ==========================================================================
  // 图解模板库管理 (Preset & Custom Template Library)
  // ==========================================================================
  getBuiltinTemplates() {
    return {
      'nordic-mittens': {
        name: 'Nordic Fair Isle Mittens',
        type: 'grid',
        knitType: 'flat',
        referenceLinks: [
          { title: '🎥 Stranded Colorwork Technique', url: 'https://www.youtube.com', memo: 'Fair isle float tension management guide' }
        ],
        data: [
          ['k','k','k','c1','c1','k','k','c1','c1','k','k','k'],
          ['k','k','c1','c3','c3','c1','c1','c3','c3','c1','k','k'],
          ['k','c1','c3','c1','c1','c3','c3','c1','c1','c3','c1','k'],
          ['c1','c3','c1','c2','c2','c1','c1','c2','c2','c1','c3','c1'],
          ['c1','c3','c1','c2','c2','c1','c1','c2','c2','c1','c3','c1'],
          ['k','c1','c3','c1','c1','c3','c3','c1','c1','c3','c1','k'],
          ['k','k','c1','c3','c3','c1','c1','c3','c3','c1','k','k'],
          ['k','k','k','c1','c1','k','k','c1','c1','k','k','k'],
          ['c2','c2','k','k','c2','c2','c2','c2','k','k','c2','c2'],
          ['c2','c2','k','k','c2','c2','c2','c2','k','k','c2','c2'],
          ['k','k','c3','c3','k','k','k','k','c3','c3','k','k'],
          ['k','k','c3','c3','k','k','k','k','c3','c3','k','k'],
          ['c1','c1','c1','c1','c1','c1','c1','c1','c1','c1','c1','c1'],
          ['c1','c1','c1','c1','c1','c1','c1','c1','c1','c1','c1','c1']
        ]
      },
      'cable-scarf': {
        name: 'Winter Cable Scarf',
        type: 'text',
        referenceLinks: [
          { title: '📖 6-Stitch Cable Twist Guide', url: 'https://www.google.com', memo: 'Hold cable needle in front on C6F' }
        ],
        data: [
          { rowNum: 1, text: 'R1 (RS): K2, P2, K6 (Cable Panel), P2, K2' },
          { rowNum: 2, text: 'R2 (WS): P2, K2, P6, K2, P2' },
          { rowNum: 3, text: 'R3 (RS): K2, P2, C6F (Cross 6 Front), P2, K2' },
          { rowNum: 4, text: 'R4 (WS): P2, K2, P6, K2, P2' },
          { rowNum: 5, text: 'R5 (RS): K2, P2, K6, P2, K2' },
          { rowNum: 6, text: 'R6 (WS): P2, K2, P6, K2, P2' },
          { rowNum: 7, text: 'R7 (RS): Repeat Row 3 (C6F Cable Twist)' },
          { rowNum: 8, text: 'R8 (WS): P2, K2, P6, K2, P2' }
        ]
      },
      'houndstooth-vest': {
        name: 'Houndstooth Check Vest',
        type: 'grid',
        knitType: 'flat',
        referenceLinks: [
          { title: '📖 Classic Houndstooth Chart Guide', url: 'https://www.google.com', memo: 'Alternate Color A and B every 2 stitches' }
        ],
        data: [
          ['c4','c4','k','k','c4','c4','k','k','c4','c4'],
          ['c4','k','c4','k','c4','k','c4','k','c4','k'],
          ['k','k','c4','c4','k','k','c4','c4','k','k'],
          ['k','c4','k','c4','k','c4','k','c4','k','c4'],
          ['c4','c4','k','k','c4','c4','k','k','c4','c4'],
          ['c4','k','c4','k','c4','k','c4','k','c4','k'],
          ['k','k','c4','c4','k','k','c4','c4','k','k'],
          ['k','c4','k','c4','k','c4','k','c4','k','c4'],
          ['c4','c4','k','k','c4','c4','k','k','c4','c4'],
          ['c4','k','c4','k','c4','k','c4','k','c4','k']
        ]
      },
      'ripple-blanket': {
        name: 'Boho Wave Blanket',
        type: 'text',
        referenceLinks: [
          { title: '🎥 Chevron Wave Stitch Guide', url: 'https://www.youtube.com', memo: 'YO increases and K2tog decreases' }
        ],
        data: [
          { rowNum: 1, text: 'R1 (RS): K1, *YO, K4, SSK, K2tog, K4, YO, K1; rep from * across' },
          { rowNum: 2, text: 'R2 (WS): Purl all stitches across' },
          { rowNum: 3, text: 'R3 (RS): K1, *YO, K4, SSK, K2tog, K4, YO, K1; rep from * across' },
          { rowNum: 4, text: 'R4 (WS): Purl all stitches across' },
          { rowNum: 5, text: 'R5 (RS): Switch Color B: K1, *YO, K4, SSK, K2tog, K4, YO, K1; rep from *' },
          { rowNum: 6, text: 'R6 (WS): Purl all stitches across' },
          { rowNum: 7, text: 'R7 (RS): Switch Color C: K1, *YO, K4, SSK, K2tog, K4, YO, K1; rep from *' },
          { rowNum: 8, text: 'R8 (WS): Purl all stitches across' }
        ]
      }
    };
  },

  renderPresetTemplates() {
    const container = document.getElementById('preset-chips-list');
    if (!container) return;

    container.innerHTML = '';
    const builtins = this.getBuiltinTemplates();
    let renderedCount = 0;

    // 统一的精致矢量毛线球 SVG 图标
    const unifiedIconSvg = `<span class="chip-icon" style="display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--primary);"><svg viewBox="0 0 64 64" width="18" height="18" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="24" fill="rgba(208, 108, 84, 0.08)" /><path d="M16 26 C 26 18, 42 18, 52 26" /><path d="M10 34 C 24 24, 44 24, 58 34" /><path d="M16 42 C 26 34, 42 34, 52 42" /></svg></span>`;

    // 1. 渲染内置预设模板（如果未被用户删除）
    Object.entries(builtins).forEach(([key, tpl]) => {
      if (this.deletedPresetKeys.includes(key)) return;
      renderedCount++;

      const typeLabel = tpl.type === 'grid' ? 'Grid' : 'Written';
      const wrapper = document.createElement('div');
      wrapper.className = 'btn-preset-chip-wrapper';
      wrapper.style.cssText = 'display: flex; gap: 4px; align-items: center; width: 100%;';
      wrapper.innerHTML = `
        <button class="btn-preset-chip" data-template="${key}" style="flex: 1;">
          ${unifiedIconSvg}
          <span class="chip-text">${tpl.name}</span>
          <span class="chip-badge">${typeLabel}</span>
        </button>
        <button class="btn icon-btn danger-text btn-delete-preset-tpl" data-template="${key}" title="删除模板" aria-label="Delete template" style="padding: 6px; flex-shrink: 0;">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      `;

      wrapper.querySelector('.btn-preset-chip').addEventListener('click', () => {
        this.loadPresetTemplate(key);
      });

      wrapper.querySelector('.btn-delete-preset-tpl').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deletePresetTemplate(key);
      });

      container.appendChild(wrapper);
    });

    // 2. 渲染用户自定义保存的图解模板
    if (this.customTemplates && this.customTemplates.length > 0) {
      this.customTemplates.forEach(tpl => {
        renderedCount++;
        const typeLabel = tpl.type === 'grid' ? 'Grid' : 'Written';
        const wrapper = document.createElement('div');
        wrapper.className = 'btn-preset-chip-wrapper';
        wrapper.style.cssText = 'display: flex; gap: 4px; align-items: center; width: 100%;';

        wrapper.innerHTML = `
          <button class="btn-preset-chip" data-custom-id="${tpl.id}" style="flex: 1;">
            ${unifiedIconSvg}
            <span class="chip-text">${tpl.name}</span>
            <span class="chip-badge" style="background: var(--primary-light); color: var(--primary); font-weight: 600;">Custom</span>
          </button>
          <button class="btn icon-btn danger-text btn-delete-custom-tpl" data-custom-id="${tpl.id}" title="删除模板" aria-label="Delete template" style="padding: 6px; flex-shrink: 0;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        `;

        wrapper.querySelector('.btn-preset-chip').addEventListener('click', () => {
          this.loadCustomTemplate(tpl.id);
        });

        wrapper.querySelector('.btn-delete-custom-tpl').addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteCustomTemplate(tpl.id);
        });

        container.appendChild(wrapper);
      });
    }

    if (renderedCount === 0) {
      container.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.8rem; font-style: italic; text-align: center; padding: 0.8rem 0;">
          暂无图解模板，点击右上角 "+ New Template" 即可创建新模板！
        </div>
      `;
    }
  },

  deletePresetTemplate(key) {
    const builtins = this.getBuiltinTemplates();
    const tpl = builtins[key];
    const name = tpl ? tpl.name : key;

    if (confirm(`确认要删除预设模板 “${name}” 吗？`)) {
      if (!this.deletedPresetKeys.includes(key)) {
        this.deletedPresetKeys.push(key);
        this.saveDeletedPresets();
      }
      this.renderPresetTemplates();
      this.showToast(`已成功删除模板 “${name}”`);
    }
  },

  loadPresetTemplate(key) {
    const templates = this.getBuiltinTemplates();
    const tpl = templates[key];
    if (!tpl) return;

    const newProj = {
      id: 'proj-preset-' + Date.now(),
      name: tpl.name,
      type: tpl.type,
      currentLoc: 1,
      knitType: tpl.knitType || 'flat',
      totalTime: 0,
      referenceLinks: tpl.referenceLinks ? JSON.parse(JSON.stringify(tpl.referenceLinks)) : [],
      updatedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(tpl.data))
    };

    this.projects.unshift(newProj);
    this.saveProjects();
    this.renderProjectList();
    this.openProject(newProj.id);
    this.showToast(`Loaded preset template: ${tpl.name}`);
  },

  loadCustomTemplate(id) {
    const tpl = this.customTemplates.find(t => t.id === id);
    if (!tpl) return;

    const newProj = {
      id: 'proj-custom-tpl-' + Date.now(),
      name: tpl.name,
      type: tpl.type,
      currentLoc: 1,
      knitType: tpl.knitType || 'flat',
      totalTime: 0,
      referenceLinks: tpl.referenceLinks ? JSON.parse(JSON.stringify(tpl.referenceLinks)) : [],
      updatedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(tpl.data))
    };

    this.projects.unshift(newProj);
    this.saveProjects();
    this.renderProjectList();
    this.openProject(newProj.id);
    this.showToast(`Loaded custom template: ${tpl.name}`);
  },

  deleteCustomTemplate(id) {
    const tpl = this.customTemplates.find(t => t.id === id);
    if (!tpl) return;

    if (confirm(`确认要从模板库中删除模板 “${tpl.name}” 吗？`)) {
      this.customTemplates = this.customTemplates.filter(t => t.id !== id);
      this.saveCustomTemplates();
      this.renderPresetTemplates();
      this.showToast('模板已成功删除');
    }
  },

  saveCurrentProjectAsTemplate() {
    const p = this.currentProject;
    if (!p) return;

    const defaultName = `${p.name} (模板)`;
    const nameInput = prompt('请输入保存到“模板库”的图解名称：', defaultName);
    if (nameInput === null) return;
    const cleanName = nameInput.trim();
    if (!cleanName) {
      alert('模板名称不能为空');
      return;
    }

    const newTpl = {
      id: 'tpl-custom-' + Date.now(),
      name: cleanName,
      icon: p.type === 'text' ? '📝' : '📊',
      type: p.type,
      knitType: p.knitType || 'flat',
      referenceLinks: p.referenceLinks ? JSON.parse(JSON.stringify(p.referenceLinks)) : [],
      data: JSON.parse(JSON.stringify(p.data))
    };

    this.customTemplates.unshift(newTpl);
    this.saveCustomTemplates();
    this.renderPresetTemplates();
    this.showToast(`⭐ 已将图解 “${cleanName}” 保存至左下角模板库！`);
  },

  createTemplateDirect() {
    const typeChoice = prompt('制作新图解模板：\n输入 1 制作【文字针法图解模板】\n输入 2 制作【像素网格图解模板】', '1');
    if (typeChoice === null) return;

    const choice = typeChoice.trim();
    if (choice !== '1' && choice !== '2') {
      alert('请输入数字 1 或 2 进行选择');
      return;
    }

    const isText = choice === '1';
    const nameInput = prompt('请输入新模板名称：', isText ? '自制文字花样模板' : '自制像素网格模板');
    if (nameInput === null) return;
    const cleanName = nameInput.trim();
    if (!cleanName) {
      alert('模板名称不能为空');
      return;
    }

    let tplData = [];
    let knitType = 'flat';

    if (isText) {
      const defaultInstructions = `第1行 (RS)：全下针\n第2行 (WS)：全上针\n第3行 (RS)：2下, 2上 循环\n第4行 (WS)：2上, 2下 循环`;
      const instructions = prompt('请输入各行编织说明（每行一条）：', defaultInstructions);
      if (instructions === null) return;
      const lines = instructions.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        alert('编织说明内容不能为空');
        return;
      }
      tplData = lines.map((text, idx) => ({
        rowNum: idx + 1,
        text: text
      }));
    } else {
      const wStr = prompt('请输入像素网格宽度（列数）：', '10');
      const hStr = prompt('请输入像素网格高度（行数）：', '10');
      if (wStr === null || hStr === null) return;
      const w = parseInt(wStr, 10) || 10;
      const h = parseInt(hStr, 10) || 10;
      
      Grid.initBlank(w, h, 'flat');
      tplData = Grid.data;
    }

    const newTpl = {
      id: 'tpl-custom-' + Date.now(),
      name: cleanName,
      icon: isText ? '📝' : '📊',
      type: isText ? 'text' : 'grid',
      knitType: knitType,
      referenceLinks: [],
      data: tplData
    };

    this.customTemplates.unshift(newTpl);
    this.saveCustomTemplates();
    this.renderPresetTemplates();
    this.showToast(`⭐ 已成功制作并保存模板 “${cleanName}”！`);
  },

  // 导出 PNG 图解图片
  exportGridPNG() {
    const p = this.currentProject;
    if (!p) return;

    const svg = document.querySelector('.knitting-grid-svg');
    if (!svg) {
      alert('Grid chart SVG element not found.');
      return;
    }

    try {
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      const svgWidth = parseFloat(svg.getAttribute('width')) || svg.clientWidth || 600;
      const svgHeight = parseFloat(svg.getAttribute('height')) || svg.clientHeight || 600;

      const svgData = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // 2x 高清
        canvas.width = svgWidth * scale;
        canvas.height = svgHeight * scale;

        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, svgWidth, svgHeight);
        ctx.drawImage(img, 0, 0, svgWidth, svgHeight);

        URL.revokeObjectURL(url);

        const a = document.createElement('a');
        const safeName = (p.name || 'knitting_chart').replace(/[^\w\s-]/gi, '_');
        a.download = `${safeName}_grid_chart.png`;
        a.href = canvas.toDataURL('image/png');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        this.showToast('Exported high-res PNG chart!');
      };

      img.onerror = (e) => {
        console.error('PNG export failed:', e);
        alert('Failed to generate PNG image.');
      };

      img.src = url;
    } catch (e) {
      console.error('Export PNG error:', e);
      alert('PNG export error: ' + e.message);
    }
  },

  copyTextPattern() {
    const p = this.currentProject;
    if (!p || !p.data) return;

    const header = `=== ${p.name} ===\nType: Written Pattern | Total Rows: ${p.data.length}\n\n`;
    const rowsText = p.data.map(r => `Row ${r.rowNum}: ${r.text}`).join('\n');
    const fullText = header + rowsText;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullText).then(() => {
        this.showToast('Pattern text copied to clipboard!');
      }).catch(() => {
        this.fallbackCopyText(fullText);
      });
    } else {
      this.fallbackCopyText(fullText);
    }
  },

  fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    this.showToast('Pattern text copied to clipboard!');
  },

  // ==========================================================================
  // Toast 浮动提示
  // ==========================================================================
  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 300);
    }, 2500);
  }
};

// 页面加载完成后启动
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
