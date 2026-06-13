// WebAudioによる効果音 + BGM生成(音声ファイル不要、すべてプロシージャル合成)

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;       // BGM全体の音量
    this.bgm = null;           // 現在のBGM状態 {track, step, nextNoteTime}
    this.bgmTimer = null;      // スケジューラのsetInterval ID
    this.bgmMuted = false;
    this.bgmVol = 0.32;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        // BGM用の系統: bgmGain -> compressor -> destination
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 4;
        comp.connect(this.ctx.destination);
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.bgmMuted ? 0 : this.bgmVol;
        this.bgmGain.connect(comp);
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

  // ===========================================================================
  // BGM(プロシージャル生成・ループ)
  // 16分音符グリッドでベース/コード/メロディ/ドラムを先読みスケジュールする
  // ===========================================================================

  startBgm(name) {
    const ctx = this.ensure();
    if (!ctx) return;
    if (this.bgm && this.bgm.track === name) return; // 既に同じ曲なら継続
    const startStep = 0;
    this.bgm = { track: name, step: startStep, nextNoteTime: ctx.currentTime + 0.06 };
    if (!this.bgmTimer) {
      this.bgmTimer = setInterval(() => this._scheduler(), 25);
    }
  }

  stopBgm() {
    this.bgm = null;
    if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; }
  }

  toggleBgmMute() {
    this.bgmMuted = !this.bgmMuted;
    if (this.bgmGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(t);
      this.bgmGain.gain.linearRampToValueAtTime(this.bgmMuted ? 0 : this.bgmVol, t + 0.15);
    }
    return this.bgmMuted;
  }

  // ポーズ等で一時的に音量を下げる
  duckBgm(on) {
    if (!this.bgmGain || !this.ctx || this.bgmMuted) return;
    const t = this.ctx.currentTime;
    this.bgmGain.gain.cancelScheduledValues(t);
    this.bgmGain.gain.linearRampToValueAtTime(on ? this.bgmVol * 0.3 : this.bgmVol, t + 0.2);
  }

  _scheduler() {
    const ctx = this.ctx;
    if (!ctx || !this.bgm) return;
    const tr = BGM_TRACKS[this.bgm.track];
    if (!tr) return;
    const sec16 = 60 / tr.bpm / 4; // 16分音符の長さ(秒)
    // AudioContext再開直後などで時刻が大きくずれていたら再同期(音の暴発を防ぐ)
    if (this.bgm.nextNoteTime < ctx.currentTime - 0.1) {
      this.bgm.nextNoteTime = ctx.currentTime + 0.06;
    }
    // 0.2秒先まで先読みしてスケジュール
    while (this.bgm.nextNoteTime < ctx.currentTime + 0.2) {
      this._scheduleStep(tr, this.bgm.step, this.bgm.nextNoteTime, sec16);
      this.bgm.nextNoteTime += sec16;
      this.bgm.step++;
    }
  }

  _scheduleStep(tr, step, time, sec16) {
    const stepsPerBar = 16;
    const bar = Math.floor(step / stepsPerBar);
    const s = step % stepsPerBar;
    const rootMidi = tr.prog[bar % tr.prog.length];
    const dest = this.bgmGain;

    // --- ドラム ---
    if (tr.kick.includes(s)) this._drum('kick', time, dest);
    if (tr.snare.includes(s)) this._drum('snare', time, dest);
    if (s % tr.hatEvery === 0) this._drum('hat', time, dest, s % 8 === 0 ? 0.18 : 0.12);

    // --- ベース ---
    if (tr.bass.includes(s)) {
      const oct = (s === 0 || s === 8) ? 0 : tr.bassOctJump ? 12 : 0;
      this._tone(tr.bassWave, midiToFreq(rootMidi + oct), time, sec16 * tr.bassLen, 0.32, dest, 'lowpass', 900);
    }

    // --- コード(パッド) ---
    if (tr.chordSteps.includes(s)) {
      for (const iv of tr.chordVoicing) {
        this._tone('triangle', midiToFreq(rootMidi + 12 + iv), time, sec16 * 3.5, 0.07, dest);
      }
    }

    // --- メロディ ---
    const mel = tr.lead[s];
    if (mel !== null && mel !== undefined) {
      const note = rootMidi + 24 + mel;
      this._tone(tr.leadWave, midiToFreq(note), time, sec16 * tr.leadLen, 0.16, dest, 'lowpass', 4500);
    }
  }

  _tone(type, freq, time, dur, vol, dest, filterType, filterFreq) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    let node = o;
    if (filterType) {
      const f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = filterFreq;
      o.connect(f);
      node = f;
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.012);
    g.gain.setValueAtTime(vol, time + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    node.connect(g).connect(dest);
    o.start(time);
    o.stop(time + dur + 0.02);
  }

  _drum(kind, time, dest, vol = 0.5) {
    const ctx = this.ctx;
    if (kind === 'kick') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, time);
      o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.7, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      o.connect(g).connect(dest);
      o.start(time); o.stop(time + 0.17);
    } else if (kind === 'snare') {
      const src = ctx.createBufferSource();
      src.buffer = this._noise(0.18);
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 1400;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      src.connect(f).connect(g).connect(dest);
      src.start(time); src.stop(time + 0.18);
    } else if (kind === 'hat') {
      const src = ctx.createBufferSource();
      src.buffer = this._noise(0.05);
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      src.connect(f).connect(g).connect(dest);
      src.start(time); src.stop(time + 0.06);
    }
  }

  _noise(dur) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}

function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

// ---------------------------------------------------------------------------
// BGMトラック定義
//   prog: 各小節のルート音(MIDIノート番号)。chordVoicing/leadはこのルートからの相対半音
//   lead: 16分音符×1小節分(16ステップ)。数値=ルート+24からの半音、null=休符
// ---------------------------------------------------------------------------
const BGM_TRACKS = {
  // タイトル/キャラセレクト: 荘厳でゆったりした和風マイナー
  title: {
    bpm: 88,
    prog: [45, 41, 48, 43], // Am - F - C - G (低音オクターブ)
    bass: [0, 6, 8, 14],
    bassWave: 'triangle', bassLen: 3.0, bassOctJump: false,
    chordSteps: [0, 8], chordVoicing: [0, 3, 7], // マイナー三和音
    lead: [0, null, null, 3, null, null, 7, null, 10, null, 7, null, 5, null, 3, null],
    leadWave: 'triangle', leadLen: 1.8,
    kick: [0, 8], snare: [4, 12], hatEvery: 4,
  },
  // 戦闘: 疾走感のあるドライブ系マイナー
  fight: {
    bpm: 146,
    prog: [40, 36, 43, 38], // Em - C - G - D
    bass: [0, 2, 4, 6, 8, 10, 12, 14],
    bassWave: 'sawtooth', bassLen: 0.9, bassOctJump: true,
    chordSteps: [0, 4, 8, 12], chordVoicing: [0, 7, 12],
    lead: [0, null, 7, 10, null, 7, 12, null, 10, 7, null, 5, 7, null, 3, null],
    leadWave: 'square', leadLen: 0.9,
    kick: [0, 6, 8, 14], snare: [4, 12], hatEvery: 2,
  },
  // 勝利: 明るく短いファンファーレ調(ループ)
  victory: {
    bpm: 120,
    prog: [48, 53, 55, 60], // C - F - G - C
    bass: [0, 4, 8, 12],
    bassWave: 'triangle', bassLen: 2.0, bassOctJump: false,
    chordSteps: [0, 8], chordVoicing: [0, 4, 7], // メジャー三和音
    lead: [0, 4, 7, 12, null, 7, null, 4, 7, 12, 16, null, 12, null, 7, null],
    leadWave: 'square', leadLen: 1.2,
    kick: [0, 8], snare: [4, 12], hatEvery: 2,
  },
};
