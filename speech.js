/**
 * KnitFlow TTS (Text-to-Speech) Controller
 * 使用 Web Speech API 实现棒针编织步骤的语音朗读
 */

const Speech = {
  enabled: false,
  synth: window.speechSynthesis,
  voices: [],
  selectedVoice: null,
  rate: 1.0,
  pitch: 1.0,

  init() {
    if (!this.synth) {
      console.warn('该浏览器不支持 Web Speech API（语音合成）');
      return false;
    }
    
    this.enabled = true;
    this.loadVoices();

    // 部分浏览器可能延迟加载声音列表，绑定变化事件
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    return true;
  },

  /**
   * 加载可用声音列表并进行初步筛选（优先中文）
   */
  loadVoices() {
    if (!this.enabled) return;
    
    // 获取系统的所有发音人
    let allVoices = this.synth.getVoices() || [];
    this.voices = allVoices;

    // 触发页面选择框更新的自定义事件
    const event = new CustomEvent('voicesLoaded', { detail: this.voices });
    window.dispatchEvent(event);
  },

  /**
   * 获取并设置默认声音（优先中文女声，如 Microsoft Xiaoxiao 或 Tingting）
   */
  getDefaultVoice() {
    if (!this.voices || this.voices.length === 0) return null;
    
    const preferredVoice = this.voices.find(v => 
      v.lang.includes('en-') || v.lang.includes('EN-') ||
      v.name.toLowerCase().includes('google') ||
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('xiaoxiao')
    );
    
    return preferredVoice || this.voices.find(v => v.default) || this.voices[0];
  },

  /**
   * 停止当前所有播放
   */
  stop() {
    if (this.enabled && this.synth.speaking) {
      this.synth.cancel();
    }
  },

  /**
   * 朗读文本
   * @param {string} text 朗读内容
   */
  speak(text) {
    if (!this.enabled || !text) return;

    // 立即停止上一句的播放，防止翻行太快导致语音积压
    this.stop();

    // 格式化文本以让发音更自然（比如把 “下3” 朗读成 “下针三针”，把英文 K3 读成 Knit 3）
    const formattedText = this.formatInstructionForSpeech(text);

    const utterance = new SpeechSynthesisUtterance(formattedText);
    
    // 配置发音参数
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    } else {
      utterance.voice = this.getDefaultVoice();
    }

    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    utterance.onerror = (e) => {
      console.error('SpeechSynthesisUtterance 发生错误:', e);
    };

    this.synth.speak(utterance);
  },

  /**
   * 将针法描述文本转义，使 TTS 朗读更贴合中文编织习惯
   * 例如将 "下3" 读作 "下针 3"，"上5" 读作 "上针 5"，"挂针"等
   */
  formatInstructionForSpeech(text) {
    let t = text;

    // 1. 中文缩写替换
    t = t.replace(/下(\d+)/g, '下针$1针');
    t = t.replace(/上(\d+)/g, '上针$1针');
    t = t.replace(/并(\d+)/g, '并针$1针');
    t = t.replace(/加(\d+)/g, '加针$1针');
    t = t.replace(/空针/g, '空针');
    t = t.replace(/麻花/g, '麻花针');

    // 2. 英文缩写替换（如果用户输入英文图解）
    t = t.replace(/\bK(\d+)\b/g, 'Knit $1');
    t = t.replace(/\bP(\d+)\b/g, 'Purl $1');
    t = t.replace(/\bYO\b/gi, 'Yarn Over');
    t = t.replace(/\bCO\b/gi, 'Cast On');
    t = t.replace(/\bBO\b/gi, 'Bind Off');
    t = t.replace(/\bPM\b/gi, 'Place Marker');

    return t;
  }
};

// 导出或挂载到 window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Speech;
} else {
  window.Speech = Speech;
}
