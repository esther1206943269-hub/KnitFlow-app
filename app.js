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
  currentUser: null,
  registeredUsers: [],

  // 页面加载入口
  CLOUD_USERS_BIN_ID: 'ff8081819f7e10ae019f893c3adf1162',
  CLOUD_API_BASE: 'https://api.restful-api.dev/objects',

  async init() {
    this.loadUserAuth();
    
    // 初始化时双向同步云端账号，将本地现有账号推上云端
    await this.syncCloudUsers();
    if (this.registeredUsers && this.registeredUsers.length > 0) {
      this.pushCloudUsers();
    }

    this.loadProjects();
    this.loadCustomTemplates();
    this.loadDeletedPresets();
    this.bindEvents();
    this.initTTSControls();
    this.renderUserAuthUI();
    this.renderProjectList();
    this.renderPresetTemplates();
    this.setupKeyboardShortcuts();

    // 全球访问量 / PV 浏览量统计
    this.trackPageview();
  },

  async trackPageview() {
    const el = document.getElementById('pageview-count-number');
    let count = parseInt(localStorage.getItem('knitflow_pageview_count') || '108', 10);

    const hasVisitedSession = sessionStorage.getItem('knitflow_visited_session');
    if (!hasVisitedSession) {
      count++;
      sessionStorage.setItem('knitflow_visited_session', 'true');
      localStorage.setItem('knitflow_pageview_count', count.toString());
    }

    if (el) {
      el.textContent = `${count.toLocaleString()} 次访问`;
    }

    try {
      const endpoint = hasVisitedSession 
        ? 'https://api.counterapi.dev/v1/knitflow_app_official_views/pageviews'
        : 'https://api.counterapi.dev/v1/knitflow_app_official_views/pageviews/up';

      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        if (json && typeof json.count === 'number') {
          const cloudCount = json.count;
          if (el) {
            el.textContent = `${cloudCount.toLocaleString()} 次访问`;
          }
          localStorage.setItem('knitflow_pageview_count', cloudCount.toString());
        }
      }
    } catch (e) {
      console.warn('云端浏览量统计连线跳过：', e);
    }
  },

  // ==========================================================================
  // 用户账户与登录管理 (User Authentication & Multi-Device Cloud Sync)
  // ==========================================================================
  loadUserAuth() {
    try {
      const usersStr = localStorage.getItem('knitflow_registered_users');
      this.registeredUsers = usersStr ? JSON.parse(usersStr) : [];

      const currentStr = localStorage.getItem('knitflow_current_user');
      this.currentUser = currentStr ? JSON.parse(currentStr) : null;
    } catch (e) {
      console.error('加载用户账号失败：', e);
      this.registeredUsers = [];
      this.currentUser = null;
    }
  },

  async syncCloudUsers() {
    try {
      const res = await fetch(`${this.CLOUD_API_BASE}/${this.CLOUD_USERS_BIN_ID}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.data && Array.isArray(json.data.users)) {
          const remoteUsers = json.data.users;
          const mergedMap = new Map();

          // 先将远端写入 map
          remoteUsers.forEach(u => {
            if (u && (u.account || u.username)) {
              const key = (u.account || u.username).toLowerCase();
              mergedMap.set(key, u);
            }
          });

          // 再用本地数据做字段级智能合并：
          // 对于每个用户，以本地版本为基准（本地密码最新），
          // 但如果本地缺少某个资料字段（如 avatar），则保留远端的值。
          this.registeredUsers.forEach(u => {
            if (u && (u.account || u.username)) {
              const key = (u.account || u.username).toLowerCase();
              if (mergedMap.has(key)) {
                const remote = mergedMap.get(key);
                // 字段级合并：本地优先，但缺失的字段从远端补充
                const merged = Object.assign({}, remote, u);
                // 特别处理：若本地 avatar 为空而远端有值，用远端的
                if (!merged.avatar && remote.avatar) merged.avatar = remote.avatar;
                mergedMap.set(key, merged);
              } else {
                mergedMap.set(key, u);
              }
            }
          });
          
          this.registeredUsers = Array.from(mergedMap.values());
          localStorage.setItem('knitflow_registered_users', JSON.stringify(this.registeredUsers));

          // 如果当前已登录用户在合并后的列表里有 avatar，同步回 currentUser
          if (this.currentUser) {
            const updated = this.registeredUsers.find(u => u.id === this.currentUser.id);
            if (updated && updated.avatar && !this.currentUser.avatar) {
              this.currentUser.avatar = updated.avatar;
              localStorage.setItem('knitflow_current_user', JSON.stringify(this.currentUser));
            }
          }
        }
      }
    } catch (e) {
      console.warn('云端用户库同步跳过：', e);
    }
  },

  async pushCloudUsers() {
    try {
      await fetch(`${this.CLOUD_API_BASE}/${this.CLOUD_USERS_BIN_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'knitflow_global_users_v1',
          data: { users: this.registeredUsers }
        })
      });
    } catch (e) {
      console.warn('推送云端用户库失败：', e);
    }
  },

  renderUserAuthUI() {
    const container = document.getElementById('user-auth-entry');
    if (!container) return;

    if (this.currentUser) {
      const initial = (this.currentUser.username || 'U').substring(0, 1).toUpperCase();
      let avatarContent = `<span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary); color: var(--bg-color); display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; overflow: hidden; flex-shrink: 0;">${initial}</span>`;
      
      if (this.currentUser.avatar) {
        if (this.currentUser.avatar.includes('/') || this.currentUser.avatar.startsWith('data:image') || this.currentUser.avatar.startsWith('http') || this.currentUser.avatar.endsWith('.png')) {
          avatarContent = `<img src="${this.currentUser.avatar}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: contain; flex-shrink: 0; background: #fff;">`;
        } else {
          avatarContent = `<span style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary-light); display: inline-flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0;">${this.currentUser.avatar}</span>`;
        }
      }

      container.innerHTML = `
        <div class="user-profile-badge" style="display: flex; align-items: center; gap: 0.4rem; background: var(--primary-light); padding: 0.2rem 0.65rem 0.2rem 0.3rem; border-radius: 20px; font-size: 0.82rem; font-weight: 600; border: 1px solid var(--card-border);" title="已登录为 ${this.currentUser.username} (${this.currentUser.account})">
          <div id="btn-avatar-circle" style="display: flex; align-items: center; cursor: pointer; position: relative;" title="点击更换/设置头像">
            ${avatarContent}
          </div>
          <span id="btn-username-text" style="color: var(--text-main); font-weight: 600; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer;" title="点击更换/设置头像">${this.currentUser.username}</span>
          <button id="btn-open-pwd-modal" style="background: none; border: none; font-size: 0.75rem; color: var(--primary); cursor: pointer; padding: 0 2px; margin-left: 2px;" title="修改密码">🔑 改密</button>
          <button id="btn-logout-inline" style="background: none; border: none; font-size: 0.75rem; color: var(--danger); cursor: pointer; padding: 0 2px;" title="退出登录">退出</button>
        </div>
      `;

      const avatarCircle = container.querySelector('#btn-avatar-circle');
      if (avatarCircle) {
        avatarCircle.onclick = (e) => {
          e.stopPropagation();
          this.openAvatarModal();
        };
      }

      const usernameText = container.querySelector('#btn-username-text');
      if (usernameText) {
        usernameText.onclick = (e) => {
          e.stopPropagation();
          this.openAvatarModal();
        };
      }

      const pwdBtn = container.querySelector('#btn-open-pwd-modal');
      if (pwdBtn) {
        pwdBtn.onclick = (e) => {
          e.stopPropagation();
          this.openChangePwdModal();
        };
      }

      const logoutBtn = container.querySelector('#btn-logout-inline');
      if (logoutBtn) {
        logoutBtn.onclick = (e) => {
          e.stopPropagation();
          this.logoutUser();
        };
      }
    } else {
      container.innerHTML = `
        <button id="btn-open-auth-modal" class="btn text-btn" style="padding: 0.3rem 0.75rem; font-size: 0.82rem; font-weight: 600; border: 1px solid var(--primary); border-radius: 18px; color: var(--primary); display: flex; align-items: center; gap: 4px; cursor: pointer;">
          <span>👤 登录 / 注册</span>
        </button>
      `;
      const loginBtn = container.querySelector('#btn-open-auth-modal');
      if (loginBtn) {
        loginBtn.onclick = () => this.openAuthModal();
      }
    }
  },

  openAvatarModal() {
    if (!this.currentUser) return;
    const modal = document.getElementById('avatar-modal');
    this.tempSelectedAvatar = this.currentUser.avatar || 'avatar_preset_1.png';
    this.updateAvatarPreviewUI(this.tempSelectedAvatar);

    document.querySelectorAll('.avatar-preset-item').forEach(btn => {
      if (btn.getAttribute('data-avatar') === this.tempSelectedAvatar) {
        btn.style.borderColor = 'var(--primary)';
      } else {
        btn.style.borderColor = 'transparent';
      }
    });

    const fileInput = document.getElementById('input-avatar-file');
    if (fileInput) fileInput.value = null;

    if (modal) modal.classList.remove('hidden');
  },

  closeAvatarModal() {
    const modal = document.getElementById('avatar-modal');
    if (modal) modal.classList.add('hidden');
  },

  updateAvatarPreviewUI(avatarValue) {
    const previewEl = document.getElementById('avatar-current-preview');
    if (!previewEl) return;

    if (avatarValue && (avatarValue.includes('/') || avatarValue.startsWith('data:image') || avatarValue.startsWith('http') || avatarValue.endsWith('.png') || avatarValue.endsWith('.jpg'))) {
      previewEl.innerHTML = `<img src="${avatarValue}" style="width: 100%; height: 100%; object-fit: contain; padding: 4px; background: #fff;">`;
    } else {
      previewEl.innerHTML = avatarValue ? `<span style="font-size: 2rem;">${avatarValue}</span>` : `<img src="avatar_preset_1.png" style="width: 100%; height: 100%; object-fit: contain; padding: 4px; background: #fff;">`;
    }
  },

  saveAvatar() {
    if (!this.currentUser) return;

    this.currentUser.avatar = this.tempSelectedAvatar;
    localStorage.setItem('knitflow_current_user', JSON.stringify(this.currentUser));

    const user = this.registeredUsers.find(u => u.id === this.currentUser.id);
    if (user) {
      user.avatar = this.tempSelectedAvatar;
      localStorage.setItem('knitflow_registered_users', JSON.stringify(this.registeredUsers));
    }

    this.renderUserAuthUI();
    this.closeAvatarModal();
    this.showToast('🎉 头像设置成功！');
  },

  openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
  },

  async forceCloudSync() {
    this.showToast('☁️ 正在为您同步电脑与平板端账号...');
    await this.pushCloudUsers();
    await this.syncCloudUsers();
    alert(`🎉 账号云端同步完成！\n\n已为您同步包含 ${this.registeredUsers.length} 个账号\n平板电脑与手机端现已可无缝登录！`);
    this.showToast('🎉 云端账号同步完成！');
  },

  async openForgotPwdModal() {
    this.closeAuthModal();
    await this.syncCloudUsers();
    const modal = document.getElementById('forgot-pwd-modal');
    const accInput = document.getElementById('forgot-account');
    const codeInput = document.getElementById('forgot-code');
    const pwdInput = document.getElementById('forgot-new-pwd');

    if (accInput) accInput.value = '';
    if (codeInput) codeInput.value = '';
    if (pwdInput) pwdInput.value = '';

    if (modal) modal.classList.remove('hidden');
  },

  closeForgotPwdModal() {
    const modal = document.getElementById('forgot-pwd-modal');
    if (modal) modal.classList.add('hidden');
  },

  async sendResetCode() {
    const accInput = document.getElementById('forgot-account');
    const account = accInput ? accInput.value.trim() : '';

    if (!account) {
      alert('请先输入注册时的邮箱或手机号！');
      return;
    }

    // 搜索注册用户前先连接云端检索
    await this.syncCloudUsers();

    const cleanAcc = account.toLowerCase();
    const user = this.registeredUsers.find(u => (u.account && u.account.toLowerCase() === cleanAcc) || (u.username && u.username.toLowerCase() === cleanAcc));
    if (!user) {
      alert(`未找到账号 “${account}”，请确认输入是否正确，或在电脑端打开网页点击【一键同步电脑与平板账号】！`);
      return;
    }

    // 生成随机 6 位验证码
    this.generatedResetCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.resetCodeTargetAccount = user.account;

    const sendBtn = document.getElementById('btn-send-forgot-code');
    if (sendBtn) {
      let countdown = 60;
      sendBtn.disabled = true;
      sendBtn.textContent = `重发 (${countdown}s)`;
      const timer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(timer);
          sendBtn.disabled = false;
          sendBtn.textContent = '获取验证码';
        } else {
          sendBtn.textContent = `重发 (${countdown}s)`;
        }
      }, 1000);
    }

    alert(`📩 【邮箱验证码已模拟发送】\n\n您的验证码为：${this.generatedResetCode}\n（已成功模拟发送至注册邮箱 ${user.account}）`);
    this.showToast(`📩 验证码：${this.generatedResetCode} (已模拟发送)`);
  },

  resetPasswordWithCode(account, code, newPwd) {
    const cleanAcc = account.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanAcc) {
      alert('请输入注册时的邮箱或手机号！');
      return;
    }
    if (!cleanCode) {
      alert('请输入收到的验证码！');
      return;
    }
    if (cleanCode !== this.generatedResetCode) {
      alert('验证码输入不正确，请核对后再试！');
      return;
    }
    if (!newPwd || newPwd.length < 6) {
      alert('新密码长度不能少于 6 位字符！');
      return;
    }

    const user = this.registeredUsers.find(u => u.account.toLowerCase() === cleanAcc || u.username.toLowerCase() === cleanAcc || (this.resetCodeTargetAccount && u.account.toLowerCase() === this.resetCodeTargetAccount.toLowerCase()));
    if (!user) {
      alert('未找到对应账号，重置失败！');
      return;
    }

    user.password = newPwd;
    localStorage.setItem('knitflow_registered_users', JSON.stringify(this.registeredUsers));

    this.generatedResetCode = null;
    this.resetCodeTargetAccount = null;

    this.closeForgotPwdModal();
    this.openAuthModal();
    this.showToast(`🎉 账号 [${user.username}] 密码重置成功！请输入新密码登录。`);
  },

  openChangePwdModal() {
    if (!this.currentUser) return;
    const modal = document.getElementById('change-pwd-modal');
    const hint = document.getElementById('pwd-user-hint');
    if (hint) hint.textContent = `为您当前账号 [${this.currentUser.username}] 修改密码`;

    const oldInput = document.getElementById('pwd-old');
    const newInput = document.getElementById('pwd-new');
    const confirmInput = document.getElementById('pwd-confirm');

    if (oldInput) oldInput.value = '';
    if (newInput) newInput.value = '';
    if (confirmInput) confirmInput.value = '';

    if (modal) modal.classList.remove('hidden');
  },

  closeChangePwdModal() {
    const modal = document.getElementById('change-pwd-modal');
    if (modal) modal.classList.add('hidden');
  },

  changePassword(oldPwd, newPwd, confirmPwd) {
    if (!this.currentUser) return;

    if (newPwd !== confirmPwd) {
      alert('两次输入的‘新密码’不一致，请核对后重新输入！');
      return;
    }

    if (newPwd.length < 6) {
      alert('新密码长度不能少于 6 位字符！');
      return;
    }

    const user = this.registeredUsers.find(u => u.id === this.currentUser.id);
    if (!user) {
      alert('未找到账号信息，请重新登录！');
      return;
    }

    if (user.password !== oldPwd) {
      alert('‘原密码’输入错误，修改失败！');
      return;
    }

    user.password = newPwd;
    localStorage.setItem('knitflow_registered_users', JSON.stringify(this.registeredUsers));

    this.closeChangePwdModal();
    this.showToast('🎉 密码修改成功！请牢记您的新密码。');
  },

  switchAuthTab(tab) {
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');
    const loginTabBtn = document.getElementById('auth-tab-login');
    const regTabBtn = document.getElementById('auth-tab-register');

    if (tab === 'login') {
      loginForm.classList.remove('hidden');
      regForm.classList.add('hidden');
      loginTabBtn.classList.add('active');
      loginTabBtn.style.opacity = '1';
      loginTabBtn.style.borderBottom = '2px solid var(--primary)';
      regTabBtn.classList.remove('active');
      regTabBtn.style.opacity = '0.7';
      regTabBtn.style.borderBottom = 'none';
    } else {
      regForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
      regTabBtn.classList.add('active');
      regTabBtn.style.opacity = '1';
      regTabBtn.style.borderBottom = '2px solid var(--primary)';
      loginTabBtn.classList.remove('active');
      loginTabBtn.style.opacity = '0.7';
      loginTabBtn.style.borderBottom = 'none';
    }
  },

  async registerUser(username, account, password) {
    const cleanUser = username.trim();
    const cleanAcc = account.trim();

    // 先拉取云端，防止与其他设备注册账号冲突
    await this.syncCloudUsers();

    const exists = this.registeredUsers.find(u => u.username.toLowerCase() === cleanUser.toLowerCase() || u.account.toLowerCase() === cleanAcc.toLowerCase());
    if (exists) {
      alert('该用户名、邮箱或手机号已被注册，请直接登录！');
      this.switchAuthTab('login');
      document.getElementById('login-account').value = cleanAcc;
      return;
    }

    const newUser = {
      id: 'u_' + Date.now(),
      username: cleanUser,
      account: cleanAcc,
      password: password,
      createdAt: new Date().toISOString()
    };

    this.registeredUsers.push(newUser);
    localStorage.setItem('knitflow_registered_users', JSON.stringify(this.registeredUsers));

    // 即刻同步到云端数据库，方便平板端和其他设备登录！
    this.pushCloudUsers();

    this.loginUserObject(newUser, true);
    this.showToast(`🎉 注册成功！欢迎您，${cleanUser}`);
  },

  async loginUser(account, password) {
    const cleanAcc = (account || '').trim().toLowerCase();
    const cleanPwd = (password || '').trim();

    // 每次登录前先同步云端最新的账号列表
    await this.syncCloudUsers();

    let user = this.registeredUsers.find(u => {
      if (!u) return false;
      const uAcc = (u.account || '').trim().toLowerCase();
      const uName = (u.username || '').trim().toLowerCase();
      const uPwd = (u.password || '').trim();
      return (uAcc === cleanAcc || uName === cleanAcc) && uPwd === cleanPwd;
    });

    if (!user) {
      alert(`账号或密码不正确！\n\n核对信息：[${account}]\n若平板端尚未同步，请确认电脑端已刷新网页上架云端，或点击“忘记密码？”重置新密码。`);
      return;
    }

    this.loginUserObject(user, false);
    this.showToast(`🎉 欢迎回来，${user.username}！多端同步已开启。`);
  },

  loginUserObject(userObj, isNewReg = false) {
    // 保留用户所有资料字段（含 avatar），避免重新登录后头像丢失
    this.currentUser = {
      id: userObj.id,
      username: userObj.username,
      account: userObj.account,
      avatar: userObj.avatar || null
    };

    localStorage.setItem('knitflow_current_user', JSON.stringify(this.currentUser));
    this.closeAuthModal();
    this.renderUserAuthUI();

    this.loadProjects();
    this.loadCustomTemplates();
    this.renderProjectList();
    this.renderPresetTemplates();
  },

  logoutUser() {
    if (confirm('确认要退出登录吗？退出后项目将保存在云端账号中。')) {
      this.currentUser = null;
      localStorage.removeItem('knitflow_current_user');
      this.renderUserAuthUI();
      this.loadProjects();
      this.loadCustomTemplates();
      this.renderProjectList();
      this.renderPresetTemplates();
      this.showToast('已安全退出登录');
    }
  },

  getProjectsStorageKey() {
    return this.currentUser ? `knitflow_projects_user_${this.currentUser.id}` : 'knitflow_projects_guest';
  },

  getCustomTemplatesStorageKey() {
    return this.currentUser ? `knitflow_custom_templates_user_${this.currentUser.id}` : 'knitflow_custom_templates_guest';
  },

  // ==========================================================================
  // 本地/云端账户项目存储管理
  // ==========================================================================
  loadProjects() {
    try {
      const key = this.getProjectsStorageKey();
      const stored = localStorage.getItem(key);
      const parsed = stored ? JSON.parse(stored) : null;

      const uniqueProjects = [];
      const seenSignatures = new Set();

      if (parsed && Array.isArray(parsed)) {
        parsed.forEach(p => {
          if (!p || p.id === 'sample-text' || p.id === 'sample-grid') return;
          // 根据 ID 或 (类型+名称+时间差) 防重
          const sig = p.id ? p.id : `${p.type}_${p.name}`;
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            if (!p.referenceLinks) {
              p.referenceLinks = [];
              if (p.tutorialUrl && p.tutorialUrl.trim()) {
                p.referenceLinks.push({ title: '项目主教程', url: p.tutorialUrl });
              }
            }
            uniqueProjects.push(p);
          }
        });
      }

      this.projects = uniqueProjects;
      // 保存去重后的数据
      if (parsed && parsed.length !== this.projects.length) {
        this.saveProjects();
      }
    } catch (e) {
      console.error('加载项目失败：', e);
      this.projects = [];
    }
  },

  saveProjects() {
    try {
      const key = this.getProjectsStorageKey();
      localStorage.setItem(key, JSON.stringify(this.projects));
    } catch (e) {
      console.error('保存项目失败：', e);
    }
  },

  loadCustomTemplates() {
    try {
      const key = this.getCustomTemplatesStorageKey();
      const stored = localStorage.getItem(key);
      this.customTemplates = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('加载自定义模板库失败：', e);
      this.customTemplates = [];
    }
  },

  saveCustomTemplates() {
    try {
      const key = this.getCustomTemplatesStorageKey();
      localStorage.setItem(key, JSON.stringify(this.customTemplates));
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
    return [];
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
      
      const totalRows = (p.data && Array.isArray(p.data)) ? p.data.length : 0;
      const colCount = (p.data && p.data[0] && Array.isArray(p.data[0])) ? p.data[0].length : 0;
      const currentLoc = p.currentLoc || 1;
      const progressPct = totalRows > 0 ? Math.round((currentLoc / totalRows) * 100) : 0;
      const timeStr = this.formatCumulativeTime(p.totalTime || 0);

      const typeLabel = p.type === 'text' ? 'Written' : 'Grid';
      const specsLabel = p.type === 'text' ? `${totalRows} Rows` : `Size ${colCount}×${totalRows}`;

      const coverSrc = (p.thumbnail && p.thumbnail.trim()) ? p.thumbnail : 'default_project_cover.png';

      item.innerHTML = `
        <!-- 左上角完成标记勾选按钮 -->
        <button class="btn icon-btn btn-toggle-complete-project ${p.isCompleted ? 'completed' : ''}" data-id="${p.id}" title="${p.isCompleted ? '取消完成标记' : '标记项目为已完成'}" style="position: absolute; top: 10px; left: 10px; z-index: 10; width: 26px; height: 26px; border-radius: 6px; border: 1.5px solid ${p.isCompleted ? '#839958' : 'rgba(0,0,0,0.18)'}; background: ${p.isCompleted ? '#839958' : 'rgba(255,255,255,0.85)'}; color: ${p.isCompleted ? '#ffffff' : 'var(--text-muted)'}; display: flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
          ${p.isCompleted ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '<div style="width: 13px; height: 13px; border: 1.5px solid rgba(0,0,0,0.25); border-radius: 3px;"></div>'}
        </button>

        <div class="project-info" title="点击开始编织此项目">
          <div class="project-thumbnail-wrapper" style="width: 72px; height: 72px; border-radius: 12px; overflow: hidden; margin-bottom: 0.5rem; border: 2px solid rgba(255,255,255,0.7); box-shadow: 0 4px 10px rgba(0,0,0,0.06); flex-shrink: 0; background: #fff; position: relative;">
            <img src="${coverSrc}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.5;" alt="${p.name} Cover" onerror="this.src='default_project_cover.png'">
          </div>
          <div class="project-name" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
            <span>${p.name}</span>
            ${p.isCompleted ? '<span style="font-size: 0.65rem; font-weight: 700; color: #839958; background: rgba(131,153,88,0.18); padding: 1px 5px; border-radius: 4px; display: inline-flex; align-items: center;">✓ 已完成</span>' : ''}
          </div>
          <div class="project-details">
            <span style="font-size: 0.75rem; opacity: 0.85;">${typeLabel} • ${specsLabel}</span>
            
            <!-- 胶囊进度条 -->
            <div class="progress-pill-wrapper" style="display: flex; align-items: center; gap: 8px; margin: 0.2rem 0;">
              <div class="mini-progress-pill">
                <div class="mini-progress-fill" style="width: ${progressPct}%;"></div>
              </div>
              <span style="font-size: 0.75rem; font-weight: 500;">${progressPct}%</span>
            </div>
            
            <span style="font-size: 0.7rem; opacity: 0.8;">Row ${currentLoc}/${totalRows} • Time ${timeStr}</span>
          </div>
        </div>
        <div class="project-actions">
          <button class="btn icon-btn btn-change-cover-project" data-id="${p.id}" title="更换项目封面" aria-label="Change Cover">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          </button>
          <button class="btn icon-btn btn-rename-project" data-id="${p.id}" title="重命名项目" aria-label="Rename">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path></svg>
          </button>
          <button class="btn icon-btn btn-duplicate-project" data-id="${p.id}" title="复制项目" aria-label="Duplicate">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="btn icon-btn danger-text btn-delete-project" data-id="${p.id}" title="删除项目" aria-label="Delete">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      // 点击整张卡片任意区域（除右侧操作按钮与左上角完成勾选按钮外）均可响应打开项目
      item.style.cursor = 'pointer';
      item.addEventListener('click', (e) => {
        if (e.target.closest('.project-actions') || e.target.closest('.btn-toggle-complete-project')) return;
        this.openProject(p.id);
      });

      // 切换项目完成状态
      item.querySelector('.btn-toggle-complete-project').addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleProjectCompletion(p.id);
      });

      // 更换封面
      item.querySelector('.btn-change-cover-project').addEventListener('click', (e) => {
        e.stopPropagation();
        this.changeProjectCover(p.id);
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

  // 播放清脆利落的机械键轴“咔哒咔哒”点击音效 (Web Audio API 双脉冲机械构型)
  playClickClackSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // 第一声“咔” (High Crisp Snap)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(2400, now);
      osc1.frequency.exponentialRampToValueAtTime(350, now + 0.015);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.02);

      // 第二声“哒” (Clack Spring Return, 延迟 30ms)
      const clackTime = now + 0.030;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1100, clackTime);
      osc2.frequency.exponentialRampToValueAtTime(180, clackTime + 0.022);
      gain2.gain.setValueAtTime(0.35, clackTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, clackTime + 0.026);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(clackTime);
      osc2.stop(clackTime + 0.028);
    } catch (e) {
      // 忽略声音播放异常
    }
  },

  toggleProjectCompletion(id) {
    const p = this.projects.find(proj => proj.id === id);
    if (!p) return;

    p.isCompleted = !p.isCompleted;
    this.saveProjects();
    this.renderProjectList();
    this.playClickClackSound();
    this.showToast(p.isCompleted ? `🎉 已将 “${p.name}” 标记为已完成！` : `已取消 “${p.name}” 的完成标记`);
  },



  deleteProject(id) {
    this.projects = this.projects.filter(p => p.id !== id);
    this.saveProjects();
    this.renderProjectList();
    this.showToast('Project deleted successfully');
  },

  changeProjectCover(id) {
    const p = this.projects.find(proj => proj.id === id);
    if (!p) return;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 3 * 1024 * 1024) {
          alert('图片文件大小不能超过 3MB，请选择较小的图片！');
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          p.thumbnail = evt.target.result;
          this.saveProjects();
          this.renderProjectList();
          this.showToast(`🖼️ 已成功更新项目“${p.name}”的封面缩略图！`);
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
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
    try {
      console.log('Attempting to open project:', id);
      const project = this.projects.find(p => p && (String(p.id) === String(id) || p.name === id));
      if (!project) {
        console.warn('Project not found for id:', id, 'Available projects:', this.projects);
        alert('未找到该项目，请刷新页面重试！');
        return;
      }

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
      
      this.triggerSpeechForActiveRow();
    } catch (err) {
      console.error('打开项目时发生错误：', err);
      alert(`打开项目失败: ${err.message}`);
    }
  },

  // 1. 初始化文字模式 Player
  initTextPlayer() {
    const p = this.currentProject;
    document.getElementById('text-player-title').textContent = p.name;
    this.updateTextPlayerUI();
    this.renderTextRowsList();
    this.renderReferenceLinks();
    this.renderProjectNotes();
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

    // 清理此前自动生成的默认示例花样，确保在使用者主动导入前是完全干净的
    if (p.motifs && p.motifs.length > 0) {
      const isAutoGenerated = p.motifs.every(m => 
        !m.desc || 
        m.desc.includes('1下, 1扭上, 1下') || 
        m.desc.includes('1扭下, 1上, 1扭下') ||
        m.desc.includes('2下, 1扭上, 2下') ||
        m.desc.includes('自定义独立花样')
      );
      if (isAutoGenerated) {
        p.motifs = [];
        this.saveProjects();
      }
    }

    container.innerHTML = '';

    if (p.motifs.length === 0) {
      container.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.8rem; font-style: italic; text-align: center; padding: 1.2rem 0; background: rgba(0,0,0,0.02); border-radius: var(--radius-sm); border: 1px dashed var(--card-border);">
          暂无独立花样/针法对照说明。<br>点击上方 "+ Add Motif" 可批量粘贴或添加自定义独立花样。
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
    if (!p) return;

    if (p.data && p.data.length > 0 && p.data[0]) {
      Grid.width = p.data[0].length;
      Grid.height = p.data.length;
      Grid.data = p.data;
      Grid.knitType = p.knitType || 'flat';
    }

    p.currentLoc = p.currentLoc || 1;
    if (p.currentLoc > (p.data ? p.data.length : 1)) p.currentLoc = p.data ? p.data.length : 1;
    if (p.currentLoc < 1) p.currentLoc = 1;

    const titleEl = document.getElementById('grid-player-title');
    if (titleEl) titleEl.textContent = p.name || 'Grid Knitting Project';
    
    const typeEl = document.getElementById('grid-meta-knit');
    if (typeEl) typeEl.textContent = p.knitType === 'flat' ? 'Flat' : 'Circular';
    
    // 加载项目保存的自定义线材调色盘与顶部收针点设置
    Grid.loadProjectStitches(p.customStitches);
    if (typeof p.showBindOffDots === 'boolean') {
      Grid.showBindOffDots = p.showBindOffDots;
    } else {
      Grid.showBindOffDots = true;
    }
    this.updateBindOffDotsUI();

    // 初始化画笔调色盘与图例及针法选择下拉框
    this.renderStitchPalette();
    this.renderStitchLegend();
    this.renderColorSelect();
    
    // 默认进入【逐行点击编织模式】(Row Tracker & Knitting Mode)
    Grid.isEditMode = false;
    this.updateGridPlayerUIState();
    
    // 渲染网格
    this.renderGridCanvas();
    this.renderReferenceLinks();
    this.renderProjectNotes();
    this.updateGridPlayerUI();
  },

  renderProjectNotes() {
    const p = this.currentProject;
    if (!p) return;
    if (!p.notes) {
      p.notes = { needle: '', yarn: '', gauge: '', memo: '' };
    }

    const textNeedle = document.getElementById('text-notes-needle');
    const textYarn = document.getElementById('text-notes-yarn');
    const textGauge = document.getElementById('text-notes-gauge');
    const textMemo = document.getElementById('text-notes-memo');

    const gridNeedle = document.getElementById('grid-notes-needle');
    const gridYarn = document.getElementById('grid-notes-yarn');
    const gridGauge = document.getElementById('grid-notes-gauge');
    const gridMemo = document.getElementById('grid-notes-memo');

    if (textNeedle) textNeedle.value = p.notes.needle || '';
    if (textYarn) textYarn.value = p.notes.yarn || '';
    if (textGauge) textGauge.value = p.notes.gauge || '';
    if (textMemo) textMemo.value = p.notes.memo || '';

    if (gridNeedle) gridNeedle.value = p.notes.needle || '';
    if (gridYarn) gridYarn.value = p.notes.yarn || '';
    if (gridGauge) gridGauge.value = p.notes.gauge || '';
    if (gridMemo) gridMemo.value = p.notes.memo || '';
  },

  updateBindOffDotsUI() {
    const statusEl = document.getElementById('bindoff-dots-status');
    if (statusEl) {
      const info = (typeof Grid.getBindOffInfo === 'function') 
        ? Grid.getBindOffInfo() 
        : { rowNum: (Grid.height || 20) + 1, isRS: true, label: '正面行收针', shortLabel: '收针(正面)', color: '#D18E97', directionText: '【从右向左 ←】' };
      statusEl.textContent = Grid.showBindOffDots ? `⚫ 收针点: 显 (${info.shortLabel})` : '⚪ 收针点: 隐';
      if (statusEl.parentElement) {
        statusEl.parentElement.title = `收针行：第 ${info.rowNum} 行 - ${info.label} ${info.directionText}`;
      }
    }
  },

  toggleBindOffDots() {
    Grid.showBindOffDots = !Grid.showBindOffDots;
    if (this.currentProject) {
      this.currentProject.showBindOffDots = Grid.showBindOffDots;
      this.saveProjects();
    }
    this.updateBindOffDotsUI();
    this.renderGridCanvas();
    const info = (typeof Grid.getBindOffInfo === 'function') 
      ? Grid.getBindOffInfo() 
      : { label: '收针' };
    this.showToast(Grid.showBindOffDots ? `已显示顶层 ${info.label} 指示点` : '已隐藏顶层收针指示点');
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
      if (Grid.multiCellConfig && Grid.multiCellConfig[selectedKey]) {
        const span = Grid.multiCellConfig[selectedKey].span;
        for (let offset = 0; offset < span; offset++) {
          if (colIndex + offset < Grid.width) {
            p.data[rowIndex][colIndex + offset] = selectedKey;
          }
        }
      } else {
        p.data[rowIndex][colIndex] = selectedKey;
      }
      this.saveProjects();
      this.renderGridCanvas();
    });
  },

  renderColorSelect() {
    const select = document.getElementById('input-custom-yarn-symbol');
    if (!select) return;
    const prevVal = select.value;
    select.innerHTML = '<option value="plain">Color Block (No Symbol) / 纯色无符号</option>';
    
    Object.entries(Grid.getDefaultStitches()).forEach(([key, st]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = st.name;
      select.appendChild(option);
    });

    if (prevVal && Array.from(select.options).some(o => o.value === prevVal)) {
      select.value = prevVal;
    }
  },

  hexToRgba(hex, alpha = 0.65) {
    if (!hex) return `rgba(255, 255, 255, ${alpha})`;
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
      return hex;
    }
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
    if (c.length === 6) {
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
  },

  parseRgba(colorStr) {
    let hex = '#D18E97';
    let alpha = 65;
    if (!colorStr) return { hex, alpha };

    if (colorStr.startsWith('rgb')) {
      const parts = colorStr.match(/[\d.]+/g);
      if (parts && parts.length >= 3) {
        const r = parseInt(parts[0]);
        const g = parseInt(parts[1]);
        const b = parseInt(parts[2]);
        const rHex = r.toString(16).padStart(2, '0');
        const gHex = g.toString(16).padStart(2, '0');
        const bHex = b.toString(16).padStart(2, '0');
        hex = `#${rHex}${gHex}${bHex}`;
        if (parts.length >= 4) {
          alpha = Math.round(parseFloat(parts[3]) * 100);
        }
      }
    } else if (colorStr.startsWith('#')) {
      let c = colorStr.replace('#', '');
      if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
      if (c.length >= 6) {
        hex = `#${c.substring(0, 6)}`;
      }
    }
    return { hex, alpha };
  },

  openStitchColorPopover(key, st, targetElement) {
    const existing = document.getElementById('stitch-color-popover');
    if (existing) existing.remove();

    const { hex: initialHex, alpha: initialAlpha } = this.parseRgba(st.color);

    const isDark = document.body.classList.contains('dark-mode');
    const popover = document.createElement('div');
    popover.id = 'stitch-color-popover';
    popover.className = 'color-popover-card';
    popover.style.cssText = `
      position: absolute;
      z-index: 10000;
      background: ${isDark ? '#262626' : '#ffffff'} !important;
      opacity: 1 !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      border: 1px solid ${isDark ? '#444444' : '#d8d8d8'} !important;
      border-radius: 12px;
      padding: 0.85rem 1rem;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
      width: 240px;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      font-family: var(--font-sans);
    `;

    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let top = rect.bottom + scrollTop + 6;
    let left = rect.left + scrollLeft;

    if (left + 250 > window.innerWidth) {
      left = Math.max(10, window.innerWidth - 260);
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;

    let textColor = Grid.getStrokeColor(st.color);

    popover.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--card-border); padding-bottom: 0.4rem;">
        <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-main);">🎨 修改颜料与透明度</span>
        <button class="popover-close-btn" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; color: var(--text-muted); line-height: 1;">&times;</button>
      </div>
      <div style="font-size: 0.8rem; color: var(--primary); font-weight: 600; text-align: center; word-break: break-word;">${st.text || st.name}</div>
      
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <label style="font-size: 0.78rem; color: var(--text-muted); flex-shrink: 0;">选色 Color:</label>
        <input type="color" class="popover-hex-input" value="${initialHex}" style="width: 38px; height: 32px; border: 1px solid var(--card-border); border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;">
        <div class="popover-color-preview" style="flex: 1; height: 32px; border-radius: 6px; border: 1px solid var(--card-border); background-color: ${st.color}; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: ${textColor};">
          预览 / Preview
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.25rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted);">
          <span>透明度 Opacity:</span>
          <span class="popover-opacity-val" style="font-weight: 700; color: var(--text-main);">${initialAlpha}%</span>
        </div>
        <input type="range" class="popover-opacity-input" min="10" max="100" value="${initialAlpha}" style="width: 100%; cursor: pointer;">
      </div>

      <!-- 如果是下针，提供 竖线 | 与 空白格 □ 符号表达形式切换 -->
      ${(key === 'k' || (st && st.baseStitch === 'k')) ? `
        <div style="border-top: 1px dashed var(--card-border); padding-top: 0.45rem; margin-top: 0.1rem; display: flex; flex-direction: column; gap: 0.35rem;">
          <label style="font-size: 0.76rem; font-weight: 700; color: var(--primary); display: block;">下针符号表达 / Symbol Style:</label>
          <div style="display: flex; gap: 0.8rem; font-size: 0.78rem;">
            <label style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text-main); font-weight: 500;">
              <input type="radio" name="popover-k-symbol-mode" value="line" ${(st.symbolMode !== 'blank') ? 'checked' : ''} style="cursor: pointer;">
              <span>竖线 ( | )</span>
            </label>
            <label style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text-main); font-weight: 500;">
              <input type="radio" name="popover-k-symbol-mode" value="blank" ${(st.symbolMode === 'blank') ? 'checked' : ''} style="cursor: pointer;">
              <span>空白格 (□)</span>
            </label>
          </div>
        </div>
      ` : ''}

      <div style="display: flex; justify-content: space-between; gap: 0.5rem; margin-top: 0.2rem;">
        <button class="btn text-btn popover-reset-btn" title="恢复默认颜色" style="padding: 0.35rem 0.7rem; font-size: 0.78rem; background: transparent; color: var(--text-muted); border: 1px solid var(--card-border); border-radius: 6px; cursor: pointer;">🔄 重置</button>
        <button class="btn text-btn popover-save-btn" style="padding: 0.35rem 0.85rem; font-size: 0.82rem; background: var(--primary); color: #fff; border-radius: 6px; font-weight: 600; border: none; cursor: pointer;">✅ 完成 / Done</button>
      </div>
    `;

    document.body.appendChild(popover);

    const hexInput = popover.querySelector('.popover-hex-input');
    const opacityInput = popover.querySelector('.popover-opacity-input');
    const opacityValText = popover.querySelector('.popover-opacity-val');
    const previewBox = popover.querySelector('.popover-color-preview');
    const closeBtn = popover.querySelector('.popover-close-btn');
    const saveBtn = popover.querySelector('.popover-save-btn');
    const resetBtn = popover.querySelector('.popover-reset-btn');

    const symbolRadios = popover.querySelectorAll('input[name="popover-k-symbol-mode"]');
    if (symbolRadios.length > 0) {
      symbolRadios.forEach(r => {
        r.addEventListener('change', () => {
          const selectedMode = r.value;
          st.symbolMode = selectedMode;
          st.symbol = (selectedMode === 'blank') ? '' : '|';

          if (this.currentProject) {
            if (!this.currentProject.customStitches) {
              this.currentProject.customStitches = {};
            }
            this.currentProject.customStitches[key] = { ...st, symbolMode: selectedMode, symbol: st.symbol };
            this.saveProjects();
          }

          this.renderStitchPalette();
          this.renderStitchLegend();
          this.renderGridCanvas();
        });
      });
    }

    const updateColor = () => {
      const hex = hexInput.value;
      const alpha = parseInt(opacityInput.value) / 100;
      opacityValText.textContent = `${opacityInput.value}%`;

      const newRgba = this.hexToRgba(hex, alpha);
      st.color = newRgba;

      const newStrokeColor = Grid.getStrokeColor(newRgba);
      previewBox.style.backgroundColor = newRgba;
      previewBox.style.color = newStrokeColor;

      if (this.currentProject) {
        if (!this.currentProject.customStitches) {
          this.currentProject.customStitches = {};
        }
        this.currentProject.customStitches[key] = { ...st, color: newRgba };
        this.saveProjects();
      }

      this.renderStitchPalette();
      this.renderStitchLegend();
      this.renderGridCanvas();
    };

    hexInput.addEventListener('input', updateColor);
    opacityInput.addEventListener('input', updateColor);

    const closePopover = (e) => {
      if (e) e.stopPropagation();
      popover.remove();
      document.removeEventListener('click', outsideClick);
    };

    const outsideClick = (e) => {
      if (!popover.contains(e.target) && !targetElement.contains(e.target)) {
        closePopover();
      }
    };

    closeBtn.addEventListener('click', closePopover);
    saveBtn.addEventListener('click', closePopover);

    // 重置默认颜色
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const defaults = Grid.getDefaultStitches();
        const def = defaults[key];
        if (!def) return;

        // 应用默认颜色到当前针法对象
        st.color = def.color;
        if (def.symbolMode !== undefined) {
          st.symbolMode = def.symbolMode;
          st.symbol = def.symbol;
        }

        // 同步到项目的 customStitches（删除该针法的自定义覆盖）
        if (this.currentProject && this.currentProject.customStitches) {
          delete this.currentProject.customStitches[key];
          this.saveProjects();
        }

        // 更新弹窗中的预览 UI
        const { hex: defHex, alpha: defAlpha } = this.parseRgba(def.color);
        hexInput.value = defHex;
        opacityInput.value = defAlpha;
        opacityValText.textContent = `${defAlpha}%`;
        previewBox.style.backgroundColor = def.color;
        previewBox.style.color = Grid.getStrokeColor(def.color);

        // 如果是下针，同步重置 radio
        const radios = popover.querySelectorAll('input[name="popover-k-symbol-mode"]');
        radios.forEach(r => { r.checked = (r.value === (def.symbolMode || 'line')); });

        // 重新渲染画布、调色盘、图例
        this.renderStitchPalette();
        this.renderStitchLegend();
        this.renderGridCanvas();

        this.showToast('✅ 已重置为默认颜色！');
      });
    }

    setTimeout(() => {
      document.addEventListener('click', outsideClick);
    }, 100);
  },

  renderStitchPalette() {
    const container = document.getElementById('palette-colors');
    if (!container) return;
    container.innerHTML = '';
    
    Object.entries(Grid.stitches).forEach(([key, st]) => {
      const item = document.createElement('div');
      item.className = 'palette-item';
      if (key === Grid.selectedStitch) {
        item.classList.add('active');
      }
      
      let textColor = '#3c3530';
      if (st.color) {
        textColor = Grid.getStrokeColor(st.color);
      }

      item.innerHTML = `
        <div class="stitch-icon-box" style="background-color: ${st.color}; position: relative; cursor: pointer;" title="点击修改颜料与透明度 / Edit Color & Opacity">
          ${Grid.getStitchSVGIcon(key, textColor, 18)}
        </div>
        <span>${st.text}</span>
      `;

      const iconBox = item.querySelector('.stitch-icon-box');
      if (iconBox) {
        iconBox.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openStitchColorPopover(key, st, iconBox);
        });
      }
      
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

  openCreateText(e) {
    if (e && e.preventDefault) e.preventDefault();
    this.playClickClackSound();
    const nameEl = document.getElementById('text-project-name');
    const inputEl = document.getElementById('text-pattern-input');
    if (nameEl) nameEl.value = '';
    if (inputEl) inputEl.value = '';
    this.switchView('view-create-text');
  },

  openCreateGrid(e) {
    if (e && e.preventDefault) e.preventDefault();
    this.playClickClackSound();
    const nameEl = document.getElementById('grid-project-name');
    if (nameEl) nameEl.value = '';
    this.switchView('view-create-grid');
  },

  createTextProject(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nameInput = document.getElementById('text-project-name');
    const patternInput = document.getElementById('text-pattern-input');
    const tutorialInput = document.getElementById('text-tutorial-url');

    const name = nameInput ? nameInput.value.trim() : '';
    const rawPattern = patternInput ? patternInput.value.trim() : '';
    const tutorialUrl = tutorialInput ? tutorialInput.value.trim() : '';

    if (!name) {
      alert('请填写项目名称 / Please enter project name');
      if (nameInput) nameInput.focus();
      return;
    }
    if (!rawPattern) {
      alert('请填写文字图解内容 / Please enter pattern instructions');
      if (patternInput) patternInput.focus();
      return;
    }

    const rawLines = rawPattern.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsedData = [];

    rawLines.forEach((line) => {
      const rangeMatch = line.match(/^(?:R|row|第)?\s*(\d+)\s*[-~到]\s*(\d+)\s*(?:行|row)?[:：\s]*(.*)$/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        const text = rangeMatch[3].trim() || line;
        for (let r = start; r <= end; r++) {
          parsedData.push({ rowNum: r, text: text });
        }
      } else {
        const textOnly = line.replace(/^(?:R|row|第)?\s*\d+\s*(?:行|row)?[:：\s]*/i, '').trim();
        parsedData.push({
          rowNum: parsedData.length + 1,
          text: textOnly || line
        });
      }
    });

    if (parsedData.length === 0) {
      alert('无法解析文字说明，请检查输入格式。');
      return;
    }

    const referenceLinks = [];
    if (tutorialUrl) {
      referenceLinks.push({ title: '参考教程', url: tutorialUrl });
    }

    const newProj = {
      id: 'proj-text-' + Date.now(),
      name: name,
      type: 'text',
      currentLoc: 1,
      totalTime: 0,
      referenceLinks: referenceLinks,
      updatedAt: new Date().toISOString(),
      data: parsedData
    };

    this.projects.unshift(newProj);
    this.saveProjects();
    this.renderProjectList();
    this.openProject(newProj.id);
    this.showToast(`成功创建文字图解项目 “${name}”！`);
  },

  createGridProject(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nameInput = document.getElementById('grid-project-name');
    const widthInput = document.getElementById('grid-width');
    const heightInput = document.getElementById('grid-height');
    const tutorialInput = document.getElementById('grid-tutorial-url');

    const knitTypeEl = document.querySelector('input[name="grid-knit-type"]:checked');
    const knitType = knitTypeEl ? knitTypeEl.value : 'flat';

    const name = nameInput ? nameInput.value.trim() : '';
    const width = widthInput ? (parseInt(widthInput.value, 10) || 20) : 20;
    const height = heightInput ? (parseInt(heightInput.value, 10) || 20) : 20;
    const tutorialUrl = tutorialInput ? tutorialInput.value.trim() : '';

    if (!name) {
      alert('请填写项目名称 / Please enter project name');
      if (nameInput) nameInput.focus();
      return;
    }

    Grid.initBlank(width, height, knitType);

    const referenceLinks = [];
    if (tutorialUrl) {
      referenceLinks.push({ title: '参考教程', url: tutorialUrl });
    }

    const newProj = {
      id: 'proj-grid-' + Date.now(),
      name: name,
      type: 'grid',
      currentLoc: 1,
      knitType: knitType,
      totalTime: 0,
      referenceLinks: referenceLinks,
      updatedAt: new Date().toISOString(),
      data: Grid.data
    };

    this.projects.unshift(newProj);
    this.saveProjects();
    this.renderProjectList();
    this.openProject(newProj.id);
    this.showToast(`成功创建网格图解项目 “${name}”！`);
  },

  // ==========================================================================
  // 事件交互绑定 (全防御性包装，避免任一元素缺失影响页面功能)
  // ==========================================================================
  bindEvents() {
    this.bindMotifModalEvents();

    const addClick = (id, fn) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', fn);
      }
    };

    // 绑定用户注册与登录 Tab 切换与提交
    addClick('auth-tab-login', () => this.switchAuthTab('login'));
    addClick('auth-tab-register', () => this.switchAuthTab('register'));
    addClick('btn-close-auth-modal', () => this.closeAuthModal());

    const loginForm = document.getElementById('form-login');
    if (loginForm) {
      loginForm.onsubmit = (e) => {
        e.preventDefault();
        const acc = document.getElementById('login-account').value;
        const pwd = document.getElementById('login-password').value;
        this.loginUser(acc, pwd);
      };
    }

    const regForm = document.getElementById('form-register');
    if (regForm) {
      regForm.onsubmit = (e) => {
        e.preventDefault();
        const user = document.getElementById('reg-username').value;
        const acc = document.getElementById('reg-account').value;
        const pwd = document.getElementById('reg-password').value;
        this.registerUser(user, acc, pwd);
      };
    }

    addClick('btn-open-forgot-pwd', () => this.openForgotPwdModal());
    addClick('btn-close-forgot-pwd-modal', () => this.closeForgotPwdModal());
    addClick('btn-send-forgot-code', () => this.sendResetCode());
    addClick('btn-force-cloud-sync', () => this.forceCloudSync());

    const forgotForm = document.getElementById('form-forgot-pwd');
    if (forgotForm) {
      forgotForm.onsubmit = (e) => {
        e.preventDefault();
        const acc = document.getElementById('forgot-account').value;
        const code = document.getElementById('forgot-code').value;
        const newPwd = document.getElementById('forgot-new-pwd').value;
        this.resetPasswordWithCode(acc, code, newPwd);
      };
    }

    addClick('btn-close-pwd-modal', () => this.closeChangePwdModal());

    const pwdForm = document.getElementById('form-change-pwd');
    if (pwdForm) {
      pwdForm.onsubmit = (e) => {
        e.preventDefault();
        const oldP = document.getElementById('pwd-old').value;
        const newP = document.getElementById('pwd-new').value;
        const confirmP = document.getElementById('pwd-confirm').value;
        this.changePassword(oldP, newP, confirmP);
      };
    }

    addClick('btn-close-avatar-modal', () => this.closeAvatarModal());
    addClick('btn-cancel-avatar', () => this.closeAvatarModal());
    addClick('btn-save-avatar', () => this.saveAvatar());

    document.querySelectorAll('.avatar-preset-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-avatar');
        this.tempSelectedAvatar = val;
        this.updateAvatarPreviewUI(val);
        document.querySelectorAll('.avatar-preset-item').forEach(b => b.style.borderColor = 'transparent');
        btn.style.borderColor = 'var(--primary)';
      });
    });

    const avatarFileInput = document.getElementById('input-avatar-file');
    if (avatarFileInput) {
      avatarFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          if (file.size > 2 * 1024 * 1024) {
            alert('图片文件大小不能超过 2MB，请重新选择较小的图片！');
            return;
          }
          const reader = new FileReader();
          reader.onload = (evt) => {
            this.tempSelectedAvatar = evt.target.result;
            this.updateAvatarPreviewUI(this.tempSelectedAvatar);
            document.querySelectorAll('.avatar-preset-item').forEach(b => b.style.borderColor = 'transparent');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // 仪表盘大厅跳转
    addClick('btn-home', () => {
      this.switchView('view-dashboard');
      this.renderProjectList();
    });

    // 页面跳转
    addClick('btn-new-text', (e) => this.openCreateText(e));
    addClick('btn-new-grid', (e) => this.openCreateGrid(e));
    addClick('btn-import-csv', (e) => this.openImportCSV(e));

    // 返回按钮
    addClick('btn-back-text-create', () => this.switchView('view-dashboard'));
    addClick('btn-back-grid-create', () => this.switchView('view-dashboard'));
    addClick('btn-back-csv-create', () => this.switchView('view-dashboard'));
    addClick('btn-back-text-player', () => {
      this.switchView('view-dashboard');
      this.renderProjectList();
    });
    addClick('btn-back-grid-player', () => {
      this.switchView('view-dashboard');
      this.renderProjectList();
    });

    // 项目备注与编织参数实时同步保存
    const syncNotes = () => {
      const p = this.currentProject;
      if (!p) return;
      if (!p.notes) {
        p.notes = { needle: '', yarn: '', gauge: '', memo: '' };
      }

      const activeView = this.currentView;
      let needleVal = '', yarnVal = '', gaugeVal = '', memoVal = '';
      
      if (activeView === 'view-text-player') {
        needleVal = document.getElementById('text-notes-needle')?.value || '';
        yarnVal = document.getElementById('text-notes-yarn')?.value || '';
        gaugeVal = document.getElementById('text-notes-gauge')?.value || '';
        memoVal = document.getElementById('text-notes-memo')?.value || '';
      } else {
        needleVal = document.getElementById('grid-notes-needle')?.value || '';
        yarnVal = document.getElementById('grid-notes-yarn')?.value || '';
        gaugeVal = document.getElementById('grid-notes-gauge')?.value || '';
        memoVal = document.getElementById('grid-notes-memo')?.value || '';
      }

      p.notes.needle = needleVal;
      p.notes.yarn = yarnVal;
      p.notes.gauge = gaugeVal;
      p.notes.memo = memoVal;

      this.saveProjects();
    };

    document.querySelectorAll('.input-project-needle, .input-project-yarn, .input-project-gauge, .textarea-project-memo').forEach(el => {
      el.addEventListener('input', () => syncNotes());
    });

    // 主题切换
    addClick('btn-toggle-theme', () => {
      document.body.classList.toggle('dark-mode');
    });

    // 表单提交事件
    addClick('btn-save-grid-project', (e) => this.createGridProject(e));
    addClick('btn-save-text-project', (e) => this.createTextProject(e));
    addClick('btn-save-csv-project', (e) => this.createCSVProject(e));

    // 绑定左侧模板库新建按钮与保存项目为模板按钮
    addClick('btn-create-template-direct', () => this.createTemplateDirect());
    addClick('btn-save-as-template-text', () => this.saveCurrentProjectAsTemplate());
    addClick('btn-save-as-template-grid', () => this.saveCurrentProjectAsTemplate());

    // 文字播放控制
    addClick('btn-text-prev', () => this.prevRow());
    addClick('btn-text-next', () => this.nextRow());
    addClick('btn-text-reset', () => this.resetProgress());
    addClick('btn-text-edit', () => {
      if (confirm('修改图解将会重置您的编织进度，确认修改吗？')) {
        const p = this.currentProject;
        if (!p) return;
        const nameEl = document.getElementById('text-project-name');
        if (nameEl) nameEl.value = p.name;
        
        const rawText = p.data.map(r => `第${r.rowNum}行：${r.text}`).join('\n');
        const inputEl = document.getElementById('text-pattern-input');
        if (inputEl) inputEl.value = rawText;
        
        this.projects = this.projects.filter(proj => proj.id !== p.id);
        this.saveProjects();
        this.switchView('view-create-text');
      }
    });

    // 网格播放控制与画布缩放
    addClick('btn-grid-prev', () => this.prevRow());
    addClick('btn-grid-next', () => this.nextRow());
    addClick('btn-grid-reset', () => this.resetProgress());
    
    addClick('btn-grid-zoom-in', () => {
      Grid.zoom = Math.min((Grid.zoom || 1.0) + 0.15, 3.0);
      this.renderGridCanvas();
    });

    addClick('btn-grid-zoom-out', () => {
      Grid.zoom = Math.max((Grid.zoom || 1.0) - 0.15, 0.4);
      this.renderGridCanvas();
    });

    addClick('btn-grid-toggle-bindoff', () => this.toggleBindOffDots());

    // 绑定针法图例表折叠与展开切换
    addClick('btn-toggle-legend', () => {
      const listEl = document.getElementById('stitch-legend-list');
      const arrowEl = document.getElementById('legend-toggle-arrow');
      if (!listEl) return;

      const isHidden = listEl.classList.contains('hidden');
      if (isHidden) {
        listEl.classList.remove('hidden');
        if (arrowEl) {
          arrowEl.innerHTML = '▼ 折叠';
          arrowEl.style.background = 'var(--primary-light)';
          arrowEl.style.color = 'var(--primary)';
        }
      } else {
        listEl.classList.add('hidden');
        if (arrowEl) {
          arrowEl.innerHTML = '▲ 展开';
          arrowEl.style.background = 'var(--card-border)';
          arrowEl.style.color = 'var(--text-muted)';
        }
      }
    });

    // 网格编辑模式切换
    addClick('btn-grid-toggle-mode', () => {
      Grid.isEditMode = !Grid.isEditMode;
      this.updateGridPlayerUIState();
      this.renderGridCanvas();
      this.saveProjects();
    });

    // 清空网格画布
    addClick('btn-edit-clear', () => {
      if (confirm('Are you sure you want to clear all painted stitches on the grid canvas?')) {
        const p = this.currentProject;
        if (!p) return;
        Grid.initBlank(p.data[0].length, p.data.length, p.knitType);
        p.data = Grid.data;
        this.saveProjects();
        this.renderGridCanvas();
        this.showToast('Canvas cleared');
      }
    });
    const opacityInput = document.getElementById('input-custom-yarn-opacity');
    const opacityValText = document.getElementById('text-custom-yarn-opacity-val');
    if (opacityInput && opacityValText) {
      opacityInput.addEventListener('input', (e) => {
        opacityValText.textContent = `${e.target.value}%`;
      });
    }

    // 绑定添加自定义线材颜色与针法按钮
    addClick('btn-add-custom-yarn', () => {
      const hexInput = document.getElementById('input-custom-yarn-color');
      const hex = hexInput ? hexInput.value : '#D18E97';
      const opacityEl = document.getElementById('input-custom-yarn-opacity');
      const opacity = opacityEl ? (parseInt(opacityEl.value) / 100) : 0.6;
      const color = this.hexToRgba(hex, opacity);

      const nameInput = document.getElementById('input-custom-yarn-name');
      const symbolInput = document.getElementById('input-custom-yarn-symbol');
      const symbolType = symbolInput ? symbolInput.value : '';
      
      let baseStitch = null;
      let symbol = '';
      let defaultName = `Yarn ${hex.toUpperCase()}`;

      if (symbolType && symbolType !== 'plain' && Grid.stitches[symbolType]) {
        baseStitch = symbolType;
        symbol = Grid.stitches[symbolType].symbol || '';
        defaultName = `${Grid.stitches[symbolType].name} (自定义颜料)`;
      }

      const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : defaultName;
      const key = 'c_' + Date.now().toString(36);

      const stitchObj = {
        baseStitch: baseStitch,
        symbol: symbol,
        name: name,
        color: color,
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
      this.renderGridCanvas();
      
      if (nameInput) nameInput.value = '';
      this.showToast(`Added custom yarn & stitch: ${name}`);
    });

    // 绑定网格动态增减行与列按钮
    addClick('btn-grid-add-row', () => {
      Grid.addRow();
      this.saveProjects();
      this.renderGridCanvas();
      this.updateGridPlayerUI();
    });

    addClick('btn-grid-remove-row', () => {
      Grid.removeRow();
      this.saveProjects();
      this.renderGridCanvas();
      this.updateGridPlayerUI();
    });

    addClick('btn-grid-add-col', () => {
      Grid.addCol();
      this.saveProjects();
      this.renderGridCanvas();
      this.updateGridPlayerUI();
    });

    addClick('btn-grid-remove-col', () => {
      Grid.removeCol();
      this.saveProjects();
      this.renderGridCanvas();
      this.updateGridPlayerUI();
    });

    // 绑定添加教程和针法链接按钮
    addClick('btn-text-add-tutorial', () => this.addReferenceLink());
    addClick('btn-grid-add-tutorial', () => this.addReferenceLink());

    // 绑定计时器切换按钮
    addClick('btn-text-timer-toggle', () => this.toggleTimer());
    addClick('btn-grid-timer-toggle', () => this.toggleTimer());

    // 绑定打印与导出按钮
    addClick('btn-text-print', () => window.print());
    addClick('btn-grid-print', () => window.print());
    addClick('btn-text-copy', () => this.copyTextPattern());
    addClick('btn-grid-export-png', () => this.exportGridPNG());
  },

  // ==========================================================================
  // 图解模板库管理 (Preset & Custom Template Library)
  // ==========================================================================
  getBuiltinTemplates() {
    return {};
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
        wrapper.className = 'template-card-item';
        wrapper.style.cssText = 'display: flex; flex-direction: column; justify-content: space-between; padding: 1rem; border-radius: var(--radius-lg); min-height: 160px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); box-sizing: border-box;';

        wrapper.innerHTML = `
          <!-- 顶部：类型 Badge 标牌与重命名/删除按钮 -->
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span class="chip-badge" style="background: var(--primary-light); color: var(--primary); font-weight: 700; font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 6px; text-transform: uppercase;">CUSTOM (${typeLabel})</span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button class="btn icon-btn primary-text btn-rename-custom-tpl" data-custom-id="${tpl.id}" title="重命名模板" aria-label="Rename template" style="padding: 4px; border-radius: 50%; opacity: 0.75; cursor: pointer; color: var(--primary);">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
              </button>
              <button class="btn icon-btn danger-text btn-delete-custom-tpl" data-custom-id="${tpl.id}" title="删除模板" aria-label="Delete template" style="padding: 4px; border-radius: 50%; opacity: 0.7; cursor: pointer;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>

          <!-- 中间主体：点击直接开启编织 -->
          <div class="tpl-card-body" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0.7rem 0; cursor: pointer; text-align: center;" title="点击使用此模板开始编织">
            ${unifiedIconSvg}
            <h4 style="margin: 0.4rem 0 0 0; font-size: 0.95rem; font-weight: 700; color: var(--text-main); line-height: 1.35; word-break: break-word;">${tpl.name}</h4>
          </div>

          <!-- 底部：导入我的项目/My Projects 按钮 -->
          <button class="btn text-btn btn-add-tpl-to-project" data-custom-id="${tpl.id}" title="将此模板加入【我的项目】列表" style="width: 100%; padding: 0.45rem 0; font-size: 0.75rem; font-weight: 700; border: 1px solid var(--card-border); background: var(--primary-light); color: var(--primary); border-radius: var(--radius-sm); cursor: pointer; text-align: center; transition: var(--transition);">
            ➕ 导入我的项目/My Projects
          </button>
        `;

        wrapper.querySelector('.tpl-card-body').addEventListener('click', () => {
          this.loadCustomTemplate(tpl.id, true);
        });

        wrapper.querySelector('.btn-add-tpl-to-project').addEventListener('click', (e) => {
          e.stopPropagation();
          this.loadCustomTemplate(tpl.id, false);
        });

        wrapper.querySelector('.btn-rename-custom-tpl').addEventListener('click', (e) => {
          e.stopPropagation();
          this.renameCustomTemplate(tpl.id);
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
        <div style="color: var(--text-muted); font-size: 0.82rem; font-style: italic; text-align: center; padding: 0.8rem 0; width: 100%; grid-column: 1 / -1;">
          暂无图解模板，点击右上角 “新建模板 / NEW TEMPLATE” 即可设计并保存属于您自己的图解模板！
        </div>
      `;
    }
  },

  renameCustomTemplate(id) {
    const tpl = this.customTemplates.find(t => t.id === id);
    if (!tpl) return;

    const newName = prompt('修改图解模板名称 / Rename Template:', tpl.name);
    if (newName === null) return;
    const cleanName = newName.trim();
    if (!cleanName) {
      alert('模板名称不能为空！');
      return;
    }

    tpl.name = cleanName;
    this.saveCustomTemplates();
    this.renderPresetTemplates();
    this.showToast(`✏️ 模板已成功重命名为 “${cleanName}”！`);
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

  loadCustomTemplate(id, openImmediately = true) {
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

    if (openImmediately) {
      this.openProject(newProj.id);
      this.showToast(`已成功将模板“${tpl.name}”添加到项目并开始编织！`);
    } else {
      this.showToast(`已成功将模板“${tpl.name}”放置到【我的项目】区域！`);
    }
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
    this.playClickClackSound();
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

    // 同步在【我的项目】区域中生成对应的新项目
    const newProj = {
      id: 'proj-custom-tpl-' + Date.now(),
      name: cleanName,
      type: isText ? 'text' : 'grid',
      currentLoc: 1,
      knitType: knitType,
      totalTime: 0,
      referenceLinks: [],
      updatedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(tplData))
    };

    this.projects.unshift(newProj);
    this.saveProjects();
    this.renderProjectList();
    this.renderPresetTemplates();

    this.showToast(`⭐ 已成功保存模板 “${cleanName}” 并同步放置到【我的项目】！`);
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

      // 移除活跃行追查虚线框、半透明遮罩与箭头线，确保导出的图解 PNG 纯净高精，无黑色阴影遮挡
      const activeElements = clone.querySelectorAll('.active-row-overlay, .active-row-mask, .direction-arrow-path');
      activeElements.forEach(el => el.remove());
      
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
