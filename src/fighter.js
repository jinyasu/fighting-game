import * as THREE from 'three';

// ---------------------------------------------------------------------------
// ポーズ定義
// 各キーは関節の回転(ラジアン)やオフセット。
//   by/bx/sy : 胴体全体の上下/前後倒れ/スピン
//   ts/tt/tz : 上半身の前傾/ひねり/横倒し
//   hx/hy    : 頭
//   slx/slz/el : 左肩(前後/開き)・左肘   srx/srz/er : 右
//   hlx/hlz/kl : 左股関節・左膝          hrx/hrz/kr : 右
// ---------------------------------------------------------------------------

export const STANCE = {
  by: -0.06, bx: 0, sy: 0,
  ts: 0.10, tt: 0.45, tz: 0,
  hx: 0.05, hy: -0.35,
  slx: -0.7, slz: 0.3, el: -1.5,
  srx: -0.45, srz: -0.25, er: -1.7,
  hlx: -0.18, hlz: 0.1, kl: 0.3,
  hrx: 0.12, hrz: -0.1, kr: 0.25,
};

const BLOCK_POSE = {
  ...STANCE,
  slx: -1.15, slz: 0.1, el: -1.95,
  srx: -1.15, srz: -0.1, er: -1.95,
  ts: 0.18, by: -0.12, tt: 0.2,
};

const CROUCH_POSE = {
  ...STANCE,
  by: -0.52, ts: 0.35,
  hlx: -1.25, kl: 1.95, hrx: -1.1, kr: 1.9,
  slx: -0.9, el: -1.7, srx: -0.7, er: -1.8,
};

const WIN_POSE = {
  ...STANCE,
  slx: -2.9, slz: 0.25, el: -0.25,
  srx: -2.9, srz: -0.25, er: -0.25,
  ts: -0.1, hx: -0.3,
};

function kf(t, p) { return { t, p: { ...STANCE, ...p } }; }

// 攻撃/リアクションのキーフレームアニメ定義。
// hit: {start,end,range,dmg,height,kb} / moves: [{start,end,speed}] 前進速度
function buildActions() {
  return {
    punch: {
      dur: 0.34,
      keys: [
        kf(0, {}),
        kf(0.07, { srx: -1.55, srz: 0, er: -0.12, tt: -0.3, hy: 0.2 }),
        kf(0.17, { srx: -1.5, srz: 0, er: -0.15, tt: -0.25, hy: 0.2 }),
        kf(0.34, {}),
      ],
      hit: { start: 0.06, end: 0.18, range: 1.45, dmg: 8, height: 'high', kb: 2.5 },
    },
    kick: {
      dur: 0.52,
      keys: [
        kf(0, {}),
        kf(0.12, { hrx: -0.7, hrz: 0, kr: 1.7, ts: -0.08, tz: 0.12, by: -0.1 }),
        kf(0.21, { hrx: -1.5, hrz: 0, kr: 0.12, tt: -0.5, tz: 0.18, ts: -0.15, by: -0.12 }),
        kf(0.32, { hrx: -1.4, hrz: 0, kr: 0.2, tt: -0.45, tz: 0.18, ts: -0.12, by: -0.12 }),
        kf(0.52, {}),
      ],
      hit: { start: 0.18, end: 0.32, range: 1.72, dmg: 12, height: 'mid', kb: 3.5 },
    },
    lungePunch: {
      dur: 0.72,
      keys: [
        kf(0, {}),
        kf(0.16, { srx: 0.5, srz: -0.1, er: -2.3, ts: 0.28, by: -0.18 }),
        kf(0.3, { srx: -1.62, srz: 0, er: -0.05, tt: -0.6, ts: -0.08, by: -0.1 }),
        kf(0.46, { srx: -1.55, srz: 0, er: -0.1, tt: -0.55, ts: -0.05, by: -0.1 }),
        kf(0.72, {}),
      ],
      moves: [{ start: 0.15, end: 0.33, speed: 4.5 }],
      hit: { start: 0.27, end: 0.44, range: 1.6, dmg: 22, height: 'mid', kb: 6.5 },
    },
    overheadSmash: {
      dur: 0.92,
      keys: [
        kf(0, {}),
        kf(0.26, { slx: -2.7, srx: -2.7, slz: 0.15, srz: -0.15, el: -0.3, er: -0.3, ts: -0.3, by: -0.04 }),
        kf(0.42, { slx: -0.85, srx: -0.85, slz: 0.1, srz: -0.1, el: -0.45, er: -0.45, ts: 0.55, by: -0.2, hx: 0.4 }),
        kf(0.6, { slx: -0.9, srx: -0.9, el: -0.5, er: -0.5, ts: 0.5, by: -0.2, hx: 0.4 }),
        kf(0.92, {}),
      ],
      moves: [{ start: 0.2, end: 0.42, speed: 2.2 }],
      hit: { start: 0.4, end: 0.55, range: 1.5, dmg: 28, height: 'mid', kb: 7.5 },
    },
    spinKick: {
      dur: 0.8,
      keys: [
        kf(0, {}),
        kf(0.12, { hrx: -0.6, kr: 1.4, by: -0.14, tz: 0.1 }),
        kf(0.3, { sy: -3.4, hrx: -1.55, hrz: 0, kr: 0.1, tz: 0.28, ts: -0.1, by: -0.1 }),
        kf(0.48, { sy: -6.28, hrx: -1.45, hrz: 0, kr: 0.15, tz: 0.22, by: -0.1 }),
        kf(0.8, { sy: -6.28 }),
      ],
      moves: [{ start: 0.1, end: 0.4, speed: 1.6 }],
      hit: { start: 0.18, end: 0.48, range: 1.85, dmg: 21, height: 'mid', kb: 6.0 },
      spinReset: true,
    },
    shoulderBash: {
      dur: 0.62,
      keys: [
        kf(0, {}),
        kf(0.13, { tt: 0.95, ts: 0.18, slx: -0.3, el: -1.0, by: -0.16 }),
        kf(0.26, { tt: 1.35, ts: 0.4, slx: -0.5, slz: 0.05, el: -0.6, by: -0.2 }),
        kf(0.4, { tt: 1.25, ts: 0.35, slx: -0.5, el: -0.7, by: -0.18 }),
        kf(0.62, {}),
      ],
      moves: [{ start: 0.12, end: 0.32, speed: 5.2 }],
      hit: { start: 0.2, end: 0.36, range: 1.25, dmg: 20, height: 'mid', kb: 7.0 },
    },
    dashStrike: {
      dur: 0.52,
      keys: [
        kf(0, {}),
        kf(0.08, { ts: 0.3, srx: 0.3, er: -2.0, by: -0.2 }),
        kf(0.2, { srx: -1.55, srz: 0, er: 0, tt: -0.55, ts: 0.1, by: -0.22 }),
        kf(0.34, { srx: -1.5, srz: 0, er: -0.05, tt: -0.5, ts: 0.1, by: -0.2 }),
        kf(0.52, {}),
      ],
      moves: [{ start: 0.05, end: 0.26, speed: 7.5 }],
      hit: { start: 0.12, end: 0.32, range: 1.55, dmg: 18, height: 'mid', kb: 4.5 },
    },
    flyingStrike: {
      dur: 0.78,
      keys: [
        kf(0, {}),
        kf(0.1, { by: -0.25, kl: 1.0, kr: 1.0, hlx: -0.5, hrx: -0.5 }),
        kf(0.28, { by: 0.75, hlx: -1.25, kl: 1.3, hrx: -1.3, kr: 1.2, srx: -1.4, srz: 0, er: -0.5, ts: 0.15 }),
        kf(0.48, { by: 0.1, hlx: -0.4, kl: 0.6, hrx: -0.9, kr: 0.5, srx: -1.5, srz: 0, er: -0.2, tt: -0.4, ts: 0.2 }),
        kf(0.78, {}),
      ],
      moves: [{ start: 0.12, end: 0.5, speed: 4.0 }],
      hit: { start: 0.26, end: 0.5, range: 1.55, dmg: 24, height: 'mid', kb: 6.5 },
    },
    hitReact: {
      dur: 0.38,
      keys: [
        kf(0, {}),
        kf(0.07, { ts: -0.38, hx: -0.55, slx: -0.25, srx: -0.25, el: -0.5, er: -0.5, by: -0.02 }),
        kf(0.2, { ts: -0.3, hx: -0.4, slx: -0.35, srx: -0.35, el: -0.7, er: -0.7 }),
        kf(0.38, {}),
      ],
    },
    blockReact: {
      dur: 0.22,
      keys: [
        kf(0, BLOCK_POSE),
        kf(0.08, { ...BLOCK_POSE, ts: 0.3, by: -0.16 }),
        kf(0.22, BLOCK_POSE),
      ],
    },
    koFall: {
      dur: 0.9,
      keys: [
        kf(0, { ts: -0.3, hx: -0.5 }),
        kf(0.5, { bx: -1.42, by: -0.05, ts: 0.05, hx: -0.2, slx: -0.7, srx: -0.7, slz: 0.7, srz: -0.7, el: -0.3, er: -0.3, hlx: -0.15, hrx: -0.1, kl: 0.4, kr: 0.3 }),
        kf(0.7, { bx: -1.52, by: -0.02, ts: 0, hx: 0, slx: -0.5, srx: -0.5, slz: 0.9, srz: -0.9, el: -0.2, er: -0.2, hlx: -0.1, hrx: -0.05, kl: 0.25, kr: 0.2 }),
        kf(0.9, { bx: -1.52, by: -0.02, ts: 0, hx: 0, slx: -0.5, srx: -0.5, slz: 0.9, srz: -0.9, el: -0.2, er: -0.2, hlx: -0.1, hrx: -0.05, kl: 0.25, kr: 0.2 }),
      ],
      holdEnd: true,
    },
  };
}

export const ACTIONS = buildActions();

function lerp(a, b, t) { return a + (b - a) * t; }
function ease(t) { return t * t * (3 - 2 * t); }

function samplePose(action, t) {
  const keys = action.keys;
  if (t <= keys[0].t) return keys[0].p;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a.t && t <= b.t) {
      const f = ease((t - a.t) / (b.t - a.t));
      const out = {};
      for (const k in STANCE) out[k] = lerp(a.p[k] ?? STANCE[k], b.p[k] ?? STANCE[k], f);
      return out;
    }
  }
  return keys[keys.length - 1].p;
}

// ---------------------------------------------------------------------------
// ファイター本体
// ---------------------------------------------------------------------------

const WALK_SPEED = 2.3;
const SIDE_SPEED = 1.9;
const BACK_MUL = 0.72;
const JUMP_VY = 5.4;
const GRAVITY = 15.0;
const HIT_STUN = 0.38;
const BLOCK_STUN = 0.22;

export class Fighter {
  constructor(def, scene, opts = {}) {
    this.def = def;
    this.scene = scene;
    this.maxHp = def.stats.hp;
    this.hp = this.maxHp;
    this.facingSign = 1;

    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.joints = {};
    this.materials = [];
    this.buildRig();
    scene.add(this.root);

    this.pos = this.root.position;
    this.vel = new THREE.Vector3();
    this.airY = 0; // ジャンプによる高さ(byとは別管理)
    this.vy = 0;
    this.airborne = false;

    this.state = 'free'; // free | attack | hit | block | ko | win
    this.crouching = false;
    this.action = null;
    this.actionTime = 0;
    this.actionName = '';
    this.hasHit = false;
    this.walkPhase = 0;
    this.flashTime = 0;
    this.time = Math.random() * 10;
    this.onEvent = opts.onEvent || (() => {});
  }

  // -------------------------------------------------------------------------
  buildRig() {
    const c = this.def.colors;
    const h = this.def.body.height;
    const b = this.def.body.bulk;

    const mat = (color) => {
      const m = new THREE.MeshLambertMaterial({ color });
      this.materials.push(m);
      return m;
    };
    const giM = mat(c.gi), gi2M = mat(c.gi2), skinM = mat(c.skin), hairM = mat(c.hair);
    const accM = mat(this.def.accessoryColor ?? c.gi2);

    const box = (w, hh, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m);
    const sph = (r, m) => new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m);

    const hipY = 0.95 * h;
    const thighL = 0.5 * h, shinL = 0.45 * h;
    const torsoH = 0.6 * h, torsoW = 0.44 * b, torsoD = 0.26 * b;
    const upperL = 0.32 * h, foreL = 0.3 * h;
    const limbW = 0.11 * b;
    this.hipY = hipY;
    this.bodyRadius = 0.35 * b;
    this.height = (hipY + torsoH + 0.3) * 1.0;

    const body = this.body;

    // 腰
    const pelvis = box(torsoW * 0.92, 0.2 * h, torsoD, gi2M);
    pelvis.position.y = hipY;
    body.add(pelvis);

    // 脚
    const makeLeg = (side) => {
      const hip = new THREE.Group();
      hip.position.set(side * torsoW * 0.27, hipY, 0);
      const thigh = box(limbW * 1.2, thighL, limbW * 1.3, giM);
      thigh.position.y = -thighL / 2;
      hip.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -thighL;
      hip.add(knee);
      const shin = box(limbW, shinL, limbW * 1.1, giM);
      shin.position.y = -shinL / 2;
      knee.add(shin);
      const foot = box(limbW * 1.2, 0.09 * h, 0.3 * h, gi2M);
      foot.position.set(0, -shinL - 0.03 * h, 0.07 * h);
      knee.add(foot);
      body.add(hip);
      return { hip, knee };
    };
    const legL = makeLeg(1), legR = makeLeg(-1);
    this.joints.hl = legL.hip; this.joints.kl = legL.knee;
    this.joints.hr = legR.hip; this.joints.kr = legR.knee;

    // 胴体
    const torsoG = new THREE.Group();
    torsoG.position.y = hipY + 0.08 * h;
    body.add(torsoG);
    this.joints.torso = torsoG;
    const chest = box(torsoW, torsoH, torsoD, giM);
    chest.position.y = torsoH / 2;
    torsoG.add(chest);
    const belt = box(torsoW * 1.02, 0.08 * h, torsoD * 1.02, gi2M);
    belt.position.y = 0.1 * h;
    torsoG.add(belt);

    // 頭
    const headG = new THREE.Group();
    headG.position.y = torsoH + 0.02 * h;
    torsoG.add(headG);
    this.joints.head = headG;
    const headR = 0.145 * h;
    const head = sph(headR, skinM);
    head.position.y = headR * 1.05;
    headG.add(head);
    const neck = box(0.1 * b, 0.08 * h, 0.1 * b, skinM);
    neck.position.y = 0.02;
    headG.add(neck);

    // 髪・アクセサリ
    this.buildHeadgear(headG, headR, h, hairM, accM, skinM, box, sph);

    // 腕
    const makeArm = (side) => {
      const sh = new THREE.Group();
      sh.position.set(side * (torsoW / 2 + 0.05 * b), torsoH - 0.06 * h, 0);
      torsoG.add(sh);
      const upper = box(limbW, upperL, limbW, giM);
      upper.position.y = -upperL / 2;
      sh.add(upper);
      const el = new THREE.Group();
      el.position.y = -upperL;
      sh.add(el);
      const fore = box(limbW * 0.9, foreL, limbW * 0.9, skinM);
      fore.position.y = -foreL / 2;
      el.add(fore);
      const fist = sph(limbW * 0.62, gi2M);
      fist.position.y = -foreL - 0.02;
      el.add(fist);
      return { sh, el };
    };
    const armL = makeArm(1), armR = makeArm(-1);
    this.joints.sl = armL.sh; this.joints.el = armL.el;
    this.joints.sr = armR.sh; this.joints.er = armR.el;

    // 影(簡易)
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42 * b, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.root.add(shadow);
    this.shadow = shadow;
  }

  buildHeadgear(headG, r, h, hairM, accM, skinM, box, sph) {
    const acc = this.def.accessory;
    if (acc !== 'luchamask') {
      // ベースの髪
      const hair = sph(r * 1.04, hairM);
      hair.position.y = r * 1.18;
      hair.position.z = -r * 0.18;
      hair.scale.y = 0.72;
      headG.add(hair);
    }
    switch (acc) {
      case 'headband': {
        const band = box(r * 2.3, r * 0.36, r * 2.3, accM);
        band.position.y = r * 1.45;
        headG.add(band);
        break;
      }
      case 'bun': {
        const b1 = sph(r * 0.36, accM); b1.position.set(r * 0.8, r * 1.8, -r * 0.3); headG.add(b1);
        const b2 = sph(r * 0.36, accM); b2.position.set(-r * 0.8, r * 1.8, -r * 0.3); headG.add(b2);
        break;
      }
      case 'beard': {
        const bd = box(r * 1.5, r * 0.9, r * 0.7, accM);
        bd.position.set(0, r * 0.45, r * 0.65);
        headG.add(bd);
        break;
      }
      case 'longhair': {
        const back = box(r * 1.6, r * 2.4, r * 0.6, accM);
        back.position.set(0, r * 0.4, -r * 0.95);
        headG.add(back);
        break;
      }
      case 'cap': {
        const cap = box(r * 1.9, r * 0.6, r * 1.9, accM);
        cap.position.y = r * 1.95;
        headG.add(cap);
        const brim = box(r * 1.6, r * 0.18, r * 1.1, accM);
        brim.position.set(0, r * 1.7, r * 1.3);
        headG.add(brim);
        break;
      }
      case 'mask': {
        const mk = box(r * 1.9, r * 0.8, r * 1.0, accM);
        mk.position.set(0, r * 0.6, r * 0.55);
        headG.add(mk);
        break;
      }
      case 'luchamask': {
        const mk = sph(r * 1.08, accM);
        mk.position.y = r * 1.05;
        headG.add(mk);
        const eye = box(r * 1.4, r * 0.4, r * 0.4, skinM);
        eye.position.set(0, r * 1.15, r * 0.85);
        headG.add(eye);
        const fin = box(r * 0.2, r * 1.0, r * 1.4, accM);
        fin.position.set(0, r * 2.0, -r * 0.2);
        headG.add(fin);
        break;
      }
      case 'ponytail': {
        const tail = box(r * 0.5, r * 1.8, r * 0.5, accM);
        tail.position.set(0, r * 1.0, -r * 1.1);
        tail.rotation.x = 0.4;
        headG.add(tail);
        break;
      }
      case 'topknot': {
        const knot = sph(r * 0.4, accM);
        knot.position.set(0, r * 2.1, -r * 0.2);
        headG.add(knot);
        break;
      }
      case 'mohawk': {
        const mh = box(r * 0.35, r * 0.9, r * 1.9, accM);
        mh.position.y = r * 2.0;
        headG.add(mh);
        break;
      }
      case 'shorthair':
      default:
        break;
    }
  }

  // -------------------------------------------------------------------------
  reset(x, z, hp = true) {
    this.pos.set(x, 0, z);
    this.vel.set(0, 0, 0);
    this.airY = 0; this.vy = 0; this.airborne = false;
    if (hp) this.hp = this.maxHp;
    this.state = 'free';
    this.crouching = false;
    this.action = null;
    this.actionName = '';
    this.flashTime = 0;
    this.applyPose(STANCE);
  }

  startAction(name) {
    const a = ACTIONS[name];
    if (!a) return;
    this.action = a;
    this.actionName = name;
    this.actionTime = 0;
    this.hasHit = false;
    if (a.hit) {
      this.state = 'attack';
      this.onEvent('swing', this);
    }
  }

  startSpecial() {
    const sp = this.def.special;
    const a = ACTIONS[sp.anim];
    this.startAction(sp.anim);
    // キャラ固有のダメージで上書きするため、攻撃データを複製して保持
    this.currentHit = { ...a.hit, dmg: sp.damage };
    this.isSpecial = true;
  }

  get attackHit() {
    if (!this.action || !this.action.hit) return null;
    if (this.isSpecial && this.currentHit) return this.currentHit;
    return this.action.hit;
  }

  // input: {fwd, side, jump, crouch, punch, kick, special, guard}
  update(dt, input, opponent) {
    this.time += dt;

    // 向き: 常に相手の方を向く(KO中除く)
    if (opponent && this.state !== 'ko') {
      const dx = opponent.pos.x - this.pos.x;
      const dz = opponent.pos.z - this.pos.z;
      const target = Math.atan2(dx, dz);
      let diff = target - this.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.root.rotation.y += diff * Math.min(1, dt * 10);
    }

    // ジャンプ物理
    if (this.airborne) {
      this.vy -= GRAVITY * dt;
      this.airY += this.vy * dt;
      if (this.airY <= 0) {
        this.airY = 0; this.airborne = false; this.vy = 0;
        this.onEvent('land', this);
      }
    }

    // ノックバック減衰
    this.vel.multiplyScalar(Math.max(0, 1 - dt * 6));
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    // 被弾フラッシュ
    if (this.flashTime > 0) {
      this.flashTime -= dt;
      const on = this.flashTime > 0 && Math.floor(this.flashTime * 30) % 2 === 0;
      for (const m of this.materials) m.emissive.setHex(on ? 0x882222 : 0x000000);
    }

    // 状態ごとの処理
    if (this.state === 'ko' || this.state === 'win') {
      this.updateAction(dt, opponent);
      this.updatePoseFromState(dt, input);
      this.syncTransforms();
      return;
    }

    if (this.action) {
      this.updateAction(dt, opponent);
    }

    if (this.state === 'free' && input) {
      this.crouching = !!input.crouch && !this.airborne;
      const guarding = !!input.guard && !this.airborne && !this.crouching;
      if (guarding) {
        this.state = 'block';
      } else if (!this.crouching) {
        // 移動
        if (opponent) {
          const fdir = new THREE.Vector3(opponent.pos.x - this.pos.x, 0, opponent.pos.z - this.pos.z);
          if (fdir.lengthSq() > 0.0001) fdir.normalize();
          const sdir = new THREE.Vector3(-fdir.z, 0, fdir.x);
          const spd = WALK_SPEED * this.def.stats.speed;
          let mx = 0, mz = 0;
          if (input.fwd) {
            const mul = input.fwd > 0 ? 1 : BACK_MUL;
            mx += fdir.x * input.fwd * spd * mul;
            mz += fdir.z * input.fwd * spd * mul;
          }
          if (input.side) {
            mx += sdir.x * input.side * SIDE_SPEED * this.def.stats.speed;
            mz += sdir.z * input.side * SIDE_SPEED * this.def.stats.speed;
          }
          this.pos.x += mx * dt;
          this.pos.z += mz * dt;
          this.moving = !!(input.fwd || input.side);
          if (this.moving) this.walkPhase += dt * 9 * this.def.stats.speed;
        }
        if (input.jump && !this.airborne) {
          this.airborne = true;
          this.vy = JUMP_VY;
          this.onEvent('jump', this);
        }
        // 攻撃
        if (!this.airborne) {
          if (input.punch) { this.isSpecial = false; this.startAction('punch'); }
          else if (input.kick) { this.isSpecial = false; this.startAction('kick'); }
          else if (input.special) this.startSpecial();
        }
      } else {
        this.moving = false;
      }
    } else if (this.state === 'block') {
      if (!input || !input.guard || input.crouch) this.state = 'free';
      this.moving = false;
    } else if (this.state === 'hit') {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0 && !this.action) this.state = 'free';
    }

    // 相手との衝突(押し合い)
    if (opponent && this.state !== 'ko' && opponent.state !== 'ko') {
      const dx = opponent.pos.x - this.pos.x;
      const dz = opponent.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      const minD = this.bodyRadius + opponent.bodyRadius;
      if (d < minD && d > 0.001) {
        const push = (minD - d) / 2;
        this.pos.x -= (dx / d) * push;
        this.pos.z -= (dz / d) * push;
      }
    }

    this.updatePoseFromState(dt, input);
    this.syncTransforms();
  }

  updateAction(dt, opponent) {
    this.actionTime += dt;
    const a = this.action;

    // 前進移動ウィンドウ
    if (a.moves && opponent) {
      for (const mv of a.moves) {
        if (this.actionTime >= mv.start && this.actionTime <= mv.end) {
          const fdir = new THREE.Vector3(opponent.pos.x - this.pos.x, 0, opponent.pos.z - this.pos.z);
          const dist = fdir.length();
          if (dist > 0.6) {
            fdir.normalize();
            this.pos.x += fdir.x * mv.speed * dt;
            this.pos.z += fdir.z * mv.speed * dt;
          }
        }
      }
    }

    // 攻撃判定
    const hit = this.attackHit;
    if (hit && !this.hasHit && opponent &&
        this.actionTime >= hit.start && this.actionTime <= hit.end) {
      const dx = opponent.pos.x - this.pos.x;
      const dz = opponent.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      const range = hit.range * this.def.stats.reach * this.def.body.height;
      if (d <= range && opponent.canBeHit(hit)) {
        this.hasHit = true;
        const dir = new THREE.Vector3(dx, 0, dz).normalize();
        opponent.receiveHit(hit, dir, this);
      }
    }

    if (this.actionTime >= a.dur) {
      if (a.holdEnd) {
        this.actionTime = a.dur;
      } else {
        this.action = null;
        this.actionName = '';
        this.isSpecial = false;
        if (this.state === 'attack' || this.state === 'hit') this.state = 'free';
      }
    }
  }

  canBeHit(hit) {
    if (this.state === 'ko') return false;
    if (this.airY > 0.55) return false; // 空中は地上攻撃を回避
    if (this.crouching && hit.height === 'high') return false; // しゃがみは上段回避
    return true;
  }

  receiveHit(hit, dir, attacker) {
    const dmg = Math.round(hit.dmg * attacker.def.stats.power);
    if (this.state === 'block') {
      // ガード: 必殺技のみ削りダメージ
      const chip = attacker.isSpecial ? Math.max(1, Math.round(dmg * 0.15)) : 0;
      this.hp = Math.max(0, this.hp - chip);
      this.vel.add(dir.clone().multiplyScalar(hit.kb * 0.55));
      this.startAction('blockReact');
      this.stunTimer = BLOCK_STUN;
      this.onEvent('block', this, chip);
      return;
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.vel.add(dir.clone().multiplyScalar(hit.kb));
    this.flashTime = 0.3;
    if (this.hp <= 0) {
      this.ko();
    } else {
      this.state = 'hit';
      this.stunTimer = HIT_STUN;
      this.startAction('hitReact');
      this.state = 'hit'; // startActionでattackにならないようhitを維持
    }
    this.onEvent('hit', this, dmg, attacker);
  }

  ko() {
    this.state = 'ko';
    this.crouching = false;
    this.startAction('koFall');
    this.state = 'ko';
    this.onEvent('ko', this);
  }

  win() {
    if (this.state === 'ko') return;
    this.state = 'win';
    this.action = null;
  }

  // -------------------------------------------------------------------------
  updatePoseFromState(dt, input) {
    let pose;
    if (this.action) {
      pose = samplePose(this.action, this.actionTime);
    } else if (this.state === 'win') {
      pose = { ...WIN_POSE };
      pose.by = WIN_POSE.by + Math.abs(Math.sin(this.time * 6)) * 0.12;
      pose.slx = WIN_POSE.slx + Math.sin(this.time * 6) * 0.15;
      pose.srx = WIN_POSE.srx - Math.sin(this.time * 6) * 0.15;
    } else if (this.state === 'block') {
      pose = BLOCK_POSE;
    } else if (this.crouching) {
      pose = CROUCH_POSE;
    } else if (this.moving) {
      const ph = this.walkPhase;
      pose = { ...STANCE };
      pose.hlx = Math.sin(ph) * 0.55 - 0.05;
      pose.hrx = Math.sin(ph + Math.PI) * 0.55 - 0.05;
      pose.kl = Math.max(0, Math.sin(ph + Math.PI / 2)) * 0.8 + 0.1;
      pose.kr = Math.max(0, Math.sin(ph + Math.PI * 1.5)) * 0.8 + 0.1;
      pose.by = STANCE.by + Math.abs(Math.sin(ph)) * 0.04;
    } else {
      // アイドル: 軽い屈伸と腕の揺れ
      pose = { ...STANCE };
      const s = Math.sin(this.time * 3.2);
      pose.by = STANCE.by + s * 0.018;
      pose.slx = STANCE.slx + s * 0.05;
      pose.srx = STANCE.srx - s * 0.05;
    }
    if (this.airborne || this.airY > 0) {
      pose = { ...pose };
      pose.kl = 1.1; pose.kr = 1.0; pose.hlx = -0.5; pose.hrx = -0.4;
    }
    this.applyPose(pose);
  }

  applyPose(p) {
    const j = this.joints;
    this.body.position.y = (p.by ?? 0) + this.airY;
    this.body.rotation.x = p.bx ?? 0;
    this.body.rotation.y = p.sy ?? 0;
    j.torso.rotation.set(p.ts ?? 0, p.tt ?? 0, p.tz ?? 0);
    j.head.rotation.set(p.hx ?? 0, p.hy ?? 0, 0);
    j.sl.rotation.set(p.slx ?? 0, 0, p.slz ?? 0);
    j.el.rotation.x = p.el ?? 0;
    j.sr.rotation.set(p.srx ?? 0, 0, p.srz ?? 0);
    j.er.rotation.x = p.er ?? 0;
    j.hl.rotation.set(p.hlx ?? 0, 0, p.hlz ?? 0);
    j.kl.rotation.x = p.kl ?? 0;
    j.hr.rotation.set(p.hrx ?? 0, 0, p.hrz ?? 0);
    j.kr.rotation.x = p.kr ?? 0;
  }

  syncTransforms() {
    this.shadow.position.x = 0;
    this.shadow.position.z = 0;
    const sc = 1 / (1 + this.airY * 0.6);
    this.shadow.scale.setScalar(sc);
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
