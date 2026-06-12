import * as THREE from 'three';
import { CHARACTERS } from './characters.js';
import { Fighter } from './fighter.js';
import { buildStage, STAGE_RADIUS } from './stage.js';
import { InputManager } from './input.js';
import { CpuBrain } from './ai.js';
import { SoundManager } from './audio.js';

const ROUND_TIME = 60;
const WINS_NEEDED = 2;

const $ = (id) => document.getElementById(id);

class Game {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: $('game-canvas') });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 3, 9);

    buildStage(this.scene);

    this.input = new InputManager();
    this.sound = new SoundManager();
    this.clock = new THREE.Clock();

    this.state = 'title';
    this.titleCursor = 0;
    this.titleItems = [
      { label: '1P vs CPU (よわい)', mode: 'cpu', difficulty: 0.6 },
      { label: '1P vs CPU (ふつう)', mode: 'cpu', difficulty: 1.0 },
      { label: '1P vs CPU (つよい)', mode: 'cpu', difficulty: 1.4 },
      { label: '2P 対戦', mode: '2p', difficulty: 0 },
    ];

    this.fighters = [null, null];
    this.previews = [null, null];
    this.effects = [];
    this.shake = 0;
    this.camPos = new THREE.Vector3(0, 3, 9);
    this.camTarget = new THREE.Vector3(0, 1, 0);
    this.paused = false;

    this.buildSelectGrid();
    this.showTitle();

    requestAnimationFrame(() => this.loop());
  }

  // ===========================================================================
  // 画面遷移
  // ===========================================================================

  showTitle() {
    this.state = 'title';
    $('title-screen').classList.remove('hidden');
    $('select-screen').classList.add('hidden');
    $('hud').classList.add('hidden');
    $('result-screen').classList.add('hidden');
    $('controls-help').classList.add('hidden');
    this.clearPreviews();
    this.clearFighters();
    this.renderTitleMenu();
  }

  renderTitleMenu() {
    const menu = $('title-menu');
    menu.innerHTML = '';
    this.titleItems.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'menu-item' + (i === this.titleCursor ? ' active' : '');
      div.textContent = (i === this.titleCursor ? '▶ ' : '') + item.label;
      div.onclick = () => { this.titleCursor = i; this.confirmTitle(); };
      menu.appendChild(div);
    });
  }

  confirmTitle() {
    const item = this.titleItems[this.titleCursor];
    this.mode = item.mode;
    this.difficulty = item.difficulty;
    this.sound.play('confirm');
    this.showSelect();
  }

  showSelect() {
    this.state = 'select';
    $('title-screen').classList.add('hidden');
    $('select-screen').classList.remove('hidden');
    $('hud').classList.add('hidden');
    $('result-screen').classList.add('hidden');
    this.clearFighters();
    this.selCursor = [0, 1];
    this.selDone = [false, false];
    this.selPhase = 0; // 0=P1選択中, 1=P2/CPU選択中
    this.cpuPickTimer = 0;
    this.updateSelectUI();
    this.updatePreview(0);
    this.updatePreview(1);
  }

  buildSelectGrid() {
    const grid = $('char-grid');
    grid.innerHTML = '';
    CHARACTERS.forEach((c, i) => {
      const cell = document.createElement('div');
      cell.className = 'char-cell';
      cell.id = `cell-${i}`;
      const sw = document.createElement('div');
      sw.className = 'char-swatch';
      sw.style.background = `linear-gradient(135deg, #${c.colors.gi.toString(16).padStart(6, '0')} 55%, #${c.colors.gi2.toString(16).padStart(6, '0')} 55%)`;
      cell.appendChild(sw);
      const nm = document.createElement('div');
      nm.className = 'char-name';
      nm.textContent = c.name;
      cell.appendChild(nm);
      cell.onclick = () => {
        const p = this.selPhase;
        if (this.state === 'select' && !this.selDone[p] && !(p === 1 && this.mode === 'cpu')) {
          this.selCursor[p] = i;
          this.updateSelectUI();
          this.updatePreview(p);
          this.confirmSelect(p);
        }
      };
      grid.appendChild(cell);
    });
  }

  updateSelectUI() {
    CHARACTERS.forEach((c, i) => {
      const cell = $(`cell-${i}`);
      cell.classList.toggle('p1-cursor', this.selCursor[0] === i && (this.selPhase === 0 || this.selDone[0]));
      cell.classList.toggle('p2-cursor', this.selPhase >= 1 && this.selCursor[1] === i);
    });
    for (const p of [0, 1]) {
      const c = CHARACTERS[this.selCursor[p]];
      const panel = $(`select-info-p${p + 1}`);
      const label = p === 1 && this.mode === 'cpu' ? 'CPU' : `${p + 1}P`;
      const status = this.selDone[p] ? ' ✔' : (this.selPhase === p ? ' 選択中...' : '');
      panel.innerHTML = `
        <div class="sel-player">${label}${status}</div>
        <div class="sel-name">${c.name} <span class="sel-ja">${c.nameJa}</span></div>
        <div class="sel-style">${c.style} / ${c.country}</div>
        <div class="sel-special">必殺技: ${c.special.name}</div>
        <div class="sel-stats">体力 ${this.statBar(c.stats.hp / 125)} 速さ ${this.statBar((c.stats.speed - 0.6) / 0.8)}<br>威力 ${this.statBar((c.stats.power - 0.7) / 0.7)} 範囲 ${this.statBar((c.stats.reach - 0.85) / 0.4)}</div>
      `;
    }
  }

  statBar(f) {
    const n = Math.max(1, Math.min(5, Math.round(f * 5)));
    return '<span class="stat-bar">' + '■'.repeat(n) + '<span class="stat-dim">' + '■'.repeat(5 - n) + '</span></span>';
  }

  updatePreview(p) {
    if (this.previews[p]) { this.previews[p].dispose(); this.previews[p] = null; }
    const def = CHARACTERS[this.selCursor[p]];
    const f = new Fighter(def, this.scene);
    f.reset(p === 0 ? -1.7 : 1.7, 2.2);
    this.previews[p] = f;
  }

  clearPreviews() {
    for (const p of [0, 1]) {
      if (this.previews[p]) { this.previews[p].dispose(); this.previews[p] = null; }
    }
  }

  clearFighters() {
    for (const i of [0, 1]) {
      if (this.fighters[i]) { this.fighters[i].dispose(); this.fighters[i] = null; }
    }
  }

  confirmSelect(p) {
    this.selDone[p] = true;
    this.sound.play('confirm');
    if (p === 0) {
      this.selPhase = 1;
      if (this.mode === 'cpu') {
        this.cpuPickTimer = 0.7;
      }
      this.updateSelectUI();
      this.updatePreview(1);
    } else {
      this.startMatch();
    }
  }

  startMatch() {
    this.clearPreviews();
    this.clearFighters();
    const def1 = CHARACTERS[this.selCursor[0]];
    const def2 = CHARACTERS[this.selCursor[1]];
    const onEvent = (type, fighter, ...args) => this.onFightEvent(type, fighter, ...args);
    this.fighters[0] = new Fighter(def1, this.scene, { onEvent });
    this.fighters[1] = new Fighter(def2, this.scene, { onEvent });
    this.cpuBrain = this.mode === 'cpu' ? new CpuBrain(this.difficulty) : null;
    this.wins = [0, 0];
    this.round = 0;

    $('select-screen').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('controls-help').classList.remove('hidden');
    $('p1-name').textContent = `${def1.name}（${def1.style}）`;
    $('p2-name').textContent = (this.mode === 'cpu' ? 'CPU ' : '') + `${def2.name}（${def2.style}）`;

    this.state = 'fight';
    this.startRound();
  }

  startRound() {
    this.round++;
    this.fightPhase = 'intro';
    this.phaseTimer = 0;
    this.roundTimer = ROUND_TIME;
    this.ringOutLoser = -1;
    this.fighters[0].reset(-2.2, 0);
    this.fighters[1].reset(2.2, 0);
    this.fighters[0].root.rotation.y = Math.atan2(1, 0);
    this.fighters[1].root.rotation.y = Math.atan2(-1, 0);
    this.updateHud();
    this.showMessage(`ROUND ${this.round}`, 0);
    this.sound.play('round');
  }

  showMessage(text, fadeAfter = 1.2) {
    const el = $('center-message');
    el.textContent = text;
    el.classList.remove('pop');
    void el.offsetWidth; // アニメーション再トリガ
    el.classList.add('pop');
    el.style.opacity = '1';
    clearTimeout(this.msgTimeout);
    if (fadeAfter > 0) {
      this.msgTimeout = setTimeout(() => { el.style.opacity = '0'; }, fadeAfter * 1000);
    }
  }

  hideMessage() {
    $('center-message').style.opacity = '0';
  }

  // ===========================================================================
  // 戦闘イベント(効果音・エフェクト・画面揺れ)
  // ===========================================================================

  onFightEvent(type, fighter, ...args) {
    if (type === 'swing') this.sound.play('swing');
    else if (type === 'jump') this.sound.play('jump');
    else if (type === 'block') {
      this.sound.play('block');
      this.spawnSpark(fighter, 0x88bbff, 0.25);
    } else if (type === 'hit') {
      const [dmg, attacker] = args;
      this.sound.play(attacker.isSpecial ? 'special' : 'hit');
      this.shake = Math.min(0.5, 0.15 + dmg * 0.012);
      this.spawnSpark(fighter, attacker.isSpecial ? 0xffe14d : 0xff7b4d, 0.4 + dmg * 0.012);
      this.updateHud();
    } else if (type === 'ko') {
      this.sound.play('ko');
      this.shake = 0.6;
    }
  }

  spawnSpark(fighter, color, size) {
    const geo = new THREE.SphereGeometry(0.18, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(fighter.pos);
    m.position.y = fighter.hipY + 0.4 + (Math.random() - 0.5) * 0.4;
    this.scene.add(m);
    this.effects.push({ mesh: m, life: 0.3, maxLife: 0.3, size });
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt;
      const f = 1 - e.life / e.maxLife;
      e.mesh.scale.setScalar(1 + f * e.size * 10);
      e.mesh.material.opacity = 0.95 * (1 - f);
      if (e.life <= 0) {
        this.scene.remove(e.mesh);
        e.mesh.geometry.dispose();
        e.mesh.material.dispose();
        this.effects.splice(i, 1);
      }
    }
  }

  // ===========================================================================
  // HUD
  // ===========================================================================

  updateHud() {
    for (const i of [0, 1]) {
      const f = this.fighters[i];
      if (!f) continue;
      const pct = Math.max(0, (f.hp / f.maxHp) * 100);
      $(`p${i + 1}-health`).style.width = pct + '%';
      $(`p${i + 1}-health`).style.background = pct > 50 ? 'linear-gradient(#ffe14d,#f3a712)' : pct > 25 ? 'linear-gradient(#ffae42,#e8740c)' : 'linear-gradient(#ff5042,#c0150c)';
      const pips = $(`p${i + 1}-pips`);
      pips.innerHTML = '';
      for (let w = 0; w < WINS_NEEDED; w++) {
        const pip = document.createElement('span');
        pip.className = 'pip' + (this.wins[i] > w ? ' won' : '');
        pips.appendChild(pip);
      }
    }
  }

  // ===========================================================================
  // メインループ
  // ===========================================================================

  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.state === 'title') this.updateTitle();
    else if (this.state === 'select') this.updateSelect(dt);
    else if (this.state === 'fight') this.updateFight(dt);
    else if (this.state === 'result') this.updateResult();

    this.updateEffects(dt);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  updateTitle() {
    const inp = this.input;
    if (inp.wasPressed('KeyW') || inp.wasPressed('ArrowUp')) {
      this.titleCursor = (this.titleCursor + this.titleItems.length - 1) % this.titleItems.length;
      this.sound.play('select');
      this.renderTitleMenu();
    }
    if (inp.wasPressed('KeyS') || inp.wasPressed('ArrowDown')) {
      this.titleCursor = (this.titleCursor + 1) % this.titleItems.length;
      this.sound.play('select');
      this.renderTitleMenu();
    }
    if (inp.wasPressed('Enter') || inp.wasPressed('KeyF') || inp.wasPressed('Space')) {
      this.confirmTitle();
    }
  }

  moveCursor(p, delta) {
    const n = CHARACTERS.length;
    this.selCursor[p] = (this.selCursor[p] + delta + n) % n;
    this.sound.play('select');
    this.updateSelectUI();
    this.updatePreview(p);
  }

  updateSelect(dt) {
    const inp = this.input;
    const cols = 6;

    if (inp.wasPressed('Escape')) { this.showTitle(); return; }

    if (!this.selDone[0]) {
      if (inp.wasPressed('KeyA')) this.moveCursor(0, -1);
      if (inp.wasPressed('KeyD')) this.moveCursor(0, 1);
      if (inp.wasPressed('KeyW')) this.moveCursor(0, -cols);
      if (inp.wasPressed('KeyS')) this.moveCursor(0, cols);
      if (inp.wasPressed('KeyF') || inp.wasPressed('Enter')) this.confirmSelect(0);
    } else if (this.mode === 'cpu' && !this.selDone[1]) {
      this.cpuPickTimer -= dt;
      if (this.cpuPickTimer > 0 && Math.random() < dt * 12) {
        this.selCursor[1] = Math.floor(Math.random() * CHARACTERS.length);
        this.updateSelectUI();
      }
      if (this.cpuPickTimer <= 0) {
        this.selCursor[1] = Math.floor(Math.random() * CHARACTERS.length);
        this.updateSelectUI();
        this.updatePreview(1);
        this.confirmSelect(1);
      }
    } else if (!this.selDone[1]) {
      if (inp.wasPressed('ArrowLeft')) this.moveCursor(1, -1);
      if (inp.wasPressed('ArrowRight')) this.moveCursor(1, 1);
      if (inp.wasPressed('ArrowUp')) this.moveCursor(1, -cols);
      if (inp.wasPressed('ArrowDown')) this.moveCursor(1, cols);
      if (inp.wasPressed('KeyK') || inp.wasPressed('Enter')) this.confirmSelect(1);
    }

    // プレビューモデルをゆっくり回す
    for (const p of [0, 1]) {
      const f = this.previews[p];
      if (f) {
        f.update(dt, null, null);
        f.root.rotation.y = Math.sin(performance.now() * 0.0006 + p * 2) * 0.5 + (p === 0 ? 0.4 : -0.4);
      }
    }
  }

  updateFight(dt) {
    const [f1, f2] = this.fighters;
    this.phaseTimer += dt;

    if (this.input.wasPressed('Escape')) {
      this.paused = !this.paused;
      $('pause-overlay').classList.toggle('hidden', !this.paused);
    }
    if (this.paused) {
      if (this.input.wasPressed('KeyQ') && this.paused) {
        this.paused = false;
        $('pause-overlay').classList.add('hidden');
        this.showTitle();
      }
      return;
    }

    if (this.fightPhase === 'intro') {
      f1.update(dt, null, f2);
      f2.update(dt, null, f1);
      if (this.phaseTimer > 1.3 && this.fightSubMsg !== this.round) {
        this.fightSubMsg = this.round;
        this.showMessage('FIGHT!', 0.7);
      }
      if (this.phaseTimer > 1.9) {
        this.fightPhase = 'active';
        this.phaseTimer = 0;
      }
      return;
    }

    if (this.fightPhase === 'active') {
      this.roundTimer -= dt;
      $('round-timer').textContent = Math.max(0, Math.ceil(this.roundTimer));

      const in1 = this.input.getFighterInput(1, f1, f2);
      const in2 = this.cpuBrain
        ? this.cpuBrain.update(dt, f2, f1)
        : this.input.getFighterInput(2, f2, f1);
      f1.update(dt, in1, f2);
      f2.update(dt, in2, f1);

      // リングアウト判定
      for (const i of [0, 1]) {
        const f = this.fighters[i];
        if (Math.hypot(f.pos.x, f.pos.z) > STAGE_RADIUS + 0.2 && f.state !== 'ko') {
          this.ringOutLoser = i;
          f.state = 'ko';
          f.action = null;
          this.sound.play('ko');
          this.endRound(1 - i, 'RING OUT!');
          return;
        }
      }

      // KO判定
      if (f1.state === 'ko') { this.endRound(1, 'K.O.'); return; }
      if (f2.state === 'ko') { this.endRound(0, 'K.O.'); return; }

      // タイムアップ
      if (this.roundTimer <= 0) {
        const p1f = f1.hp / f1.maxHp, p2f = f2.hp / f2.maxHp;
        if (Math.abs(p1f - p2f) < 0.001) {
          this.endRound(-1, 'TIME UP  DRAW');
        } else {
          this.endRound(p1f > p2f ? 0 : 1, 'TIME UP');
        }
        return;
      }
      return;
    }

    if (this.fightPhase === 'end') {
      // リングアウトした側は落下させる
      if (this.ringOutLoser >= 0) {
        const f = this.fighters[this.ringOutLoser];
        if (f.root.position.y > -1.9) f.root.position.y -= dt * 3.5;
      }
      f1.update(dt, null, f2);
      f2.update(dt, null, f1);
      if (this.phaseTimer > 2.4) {
        const winner = this.roundWinner;
        if (winner >= 0 && this.wins[winner] >= WINS_NEEDED) {
          this.showResult(winner);
        } else {
          this.startRound();
        }
      }
    }
  }

  endRound(winner, msg) {
    this.fightPhase = 'end';
    this.phaseTimer = 0;
    this.roundWinner = winner;
    if (winner >= 0) {
      this.wins[winner]++;
      this.fighters[winner].win();
      const name = this.fighters[winner].def.name;
      this.showMessage(`${msg}\n${name} WIN!`, 2.0);
    } else {
      this.showMessage(msg, 2.0);
    }
    this.updateHud();
  }

  showResult(winner) {
    this.state = 'result';
    const def = this.fighters[winner].def;
    const label = this.mode === 'cpu' && winner === 1 ? 'CPU' : `${winner + 1}P`;
    $('result-text').innerHTML = `<div class="result-win">${def.name} WINS!</div>
      <div class="result-sub">${label} の勝利 — ${def.style}の${def.nameJa}</div>
      <div class="result-hint">Enter: もう一度 / Escape: タイトルへ</div>`;
    $('result-screen').classList.remove('hidden');
    $('controls-help').classList.add('hidden');
  }

  updateResult() {
    const [f1, f2] = this.fighters;
    if (f1 && f2) {
      f1.update(0.016, null, f2);
      f2.update(0.016, null, f1);
    }
    if (this.input.wasPressed('Enter')) {
      $('result-screen').classList.add('hidden');
      this.showSelect();
    }
    if (this.input.wasPressed('Escape')) this.showTitle();
  }

  // ===========================================================================
  // カメラ
  // ===========================================================================

  updateCamera(dt) {
    const t = performance.now() * 0.001;
    let targetPos, targetLook;

    if (this.state === 'title') {
      targetPos = new THREE.Vector3(Math.cos(t * 0.15) * 11, 4.5, Math.sin(t * 0.15) * 11);
      targetLook = new THREE.Vector3(0, 1.2, 0);
    } else if (this.state === 'select') {
      targetPos = new THREE.Vector3(Math.sin(t * 0.1) * 1.5, 1.8, 7.0);
      targetLook = new THREE.Vector3(0, 1.1, 2.0);
    } else {
      // 対戦カメラ: 2人を結ぶ線に垂直な位置から追う
      const [f1, f2] = this.fighters;
      if (!f1 || !f2) return;
      const mid = new THREE.Vector3().addVectors(f1.pos, f2.pos).multiplyScalar(0.5);
      mid.y = 1.0 + (f1.airY + f2.airY) * 0.25;
      const axis = new THREE.Vector3().subVectors(f2.pos, f1.pos);
      axis.y = 0;
      const sep = Math.max(axis.length(), 1.5);
      if (axis.lengthSq() < 0.001) axis.set(1, 0, 0);
      axis.normalize();
      let normal = new THREE.Vector3(-axis.z, 0, axis.x);
      // カメラが反対側に飛ばないよう、現在位置に近い側を選ぶ
      const camDir = new THREE.Vector3().subVectors(this.camPos, mid);
      if (camDir.dot(normal) < 0) normal.negate();
      const dist = THREE.MathUtils.clamp(sep * 0.85 + 3.2, 4.5, 10);
      targetPos = mid.clone().addScaledVector(normal, dist);
      targetPos.y = 1.7 + sep * 0.18;
      targetLook = mid;

      if (this.state === 'result') {
        // 勝者に寄る
        const w = this.fighters[this.roundWinner >= 0 ? this.roundWinner : 0];
        targetPos = w.pos.clone().add(new THREE.Vector3(Math.sin(t * 0.4) * 3, 1.6, Math.cos(t * 0.4) * 3));
        targetLook = w.pos.clone().setY(1.2);
      }
    }

    const lp = 1 - Math.pow(0.001, dt);
    this.camPos.lerp(targetPos, lp);
    this.camTarget.lerp(targetLook, lp);

    // 画面揺れ
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.2);
      const s = this.shake * 0.18;
      this.camera.position.copy(this.camPos).add(
        new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s)
      );
    } else {
      this.camera.position.copy(this.camPos);
    }
    this.camera.lookAt(this.camTarget);
  }
}

new Game();
