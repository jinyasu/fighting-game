// WebAudioによる効果音生成(音声ファイル不要)

export class SoundManager {
  constructor() {
    this.ctx = null;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  noiseBuffer(dur) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  play(type) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const out = ctx.destination;

    const env = (node, vol, dur, attack = 0.005) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      node.connect(g).connect(out);
      return g;
    };

    switch (type) {
      case 'swing': { // 素振り(ヒュッ)
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer(0.15);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(900, t);
        f.frequency.exponentialRampToValueAtTime(2600, t + 0.12);
        f.Q.value = 2;
        src.connect(f);
        env(f, 0.25, 0.15);
        src.start(t); src.stop(t + 0.15);
        break;
      }
      case 'hit': { // 打撃(ドスッ)
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(160, t);
        o.frequency.exponentialRampToValueAtTime(50, t + 0.18);
        env(o, 0.7, 0.2);
        o.start(t); o.stop(t + 0.2);
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer(0.1);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 1200;
        src.connect(f);
        env(f, 0.4, 0.1);
        src.start(t); src.stop(t + 0.1);
        break;
      }
      case 'special': { // 必殺技ヒット(重い)
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(120, t);
        o.frequency.exponentialRampToValueAtTime(35, t + 0.35);
        env(o, 0.55, 0.38);
        o.start(t); o.stop(t + 0.4);
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer(0.25);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 900;
        src.connect(f);
        env(f, 0.5, 0.25);
        src.start(t); src.stop(t + 0.25);
        break;
      }
      case 'block': { // ガード(カッ)
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(620, t);
        o.frequency.exponentialRampToValueAtTime(240, t + 0.07);
        env(o, 0.3, 0.09);
        o.start(t); o.stop(t + 0.1);
        break;
      }
      case 'ko': { // KO
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(28, t + 0.7);
        env(o, 0.6, 0.75);
        o.start(t); o.stop(t + 0.8);
        break;
      }
      case 'jump': {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(240, t);
        o.frequency.exponentialRampToValueAtTime(480, t + 0.12);
        env(o, 0.12, 0.14);
        o.start(t); o.stop(t + 0.15);
        break;
      }
      case 'select': {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(660, t);
        env(o, 0.12, 0.08);
        o.start(t); o.stop(t + 0.09);
        break;
      }
      case 'confirm': {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(523, t);
        o.frequency.setValueAtTime(784, t + 0.08);
        env(o, 0.15, 0.2);
        o.start(t); o.stop(t + 0.22);
        break;
      }
      case 'round': { // ラウンド開始ゴング
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(880, t);
        o.frequency.exponentialRampToValueAtTime(840, t + 0.8);
        env(o, 0.4, 1.0, 0.002);
        o.start(t); o.stop(t + 1.0);
        break;
      }
    }
  }
}
