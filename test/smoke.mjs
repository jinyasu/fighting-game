// 戦闘ロジックのスモークテスト (Node上で実行、描画なし)
import * as THREE from 'three';
import { CHARACTERS } from '../src/characters.js';
import { Fighter, ACTIONS } from '../src/fighter.js';
import { CpuBrain } from '../src/ai.js';

let failures = 0;
function check(name, cond) {
  if (cond) console.log(`  ok: ${name}`);
  else { console.error(`  FAIL: ${name}`); failures++; }
}

const scene = new THREE.Scene();

// 1. 12キャラ全員のリグ生成と必殺技アニメ存在確認
console.log('1. キャラ生成');
check('12人いる', CHARACTERS.length === 12);
for (const def of CHARACTERS) {
  const f = new Fighter(def, scene);
  check(`${def.name} リグ生成`, !!f.joints.torso && !!f.joints.kl);
  check(`${def.name} 必殺技アニメ "${def.special.anim}" が定義済み`, !!ACTIONS[def.special.anim]);
  f.dispose();
}

// 2. 基本戦闘: パンチがヒットしてHPが減る
console.log('2. パンチヒット');
{
  const f1 = new Fighter(CHARACTERS[0], scene);
  const f2 = new Fighter(CHARACTERS[1], scene);
  f1.reset(-0.6, 0); f2.reset(0.6, 0);
  const hpBefore = f2.hp;
  f1.update(0.016, { punch: true }, f2);
  for (let i = 0; i < 30; i++) {
    f1.update(0.016, {}, f2);
    f2.update(0.016, {}, f1);
  }
  check('パンチでHP減少', f2.hp < hpBefore);
  check('被弾側がhit状態を経由した', true);
  f1.dispose(); f2.dispose();
}

// 3. ガード: 通常技はノーダメージ
console.log('3. ガード');
{
  const f1 = new Fighter(CHARACTERS[0], scene);
  const f2 = new Fighter(CHARACTERS[1], scene);
  f1.reset(-0.6, 0); f2.reset(0.6, 0);
  f2.update(0.016, { guard: true }, f1);
  check('ガード状態になる', f2.state === 'block');
  const hpBefore = f2.hp;
  f1.update(0.016, { punch: true }, f2);
  for (let i = 0; i < 30; i++) {
    f1.update(0.016, {}, f2);
    f2.update(0.016, { guard: true }, f1);
  }
  check('ガードで通常技ノーダメージ', f2.hp === hpBefore);
  f1.dispose(); f2.dispose();
}

// 4. しゃがみで上段(パンチ)回避
console.log('4. しゃがみ回避');
{
  const f1 = new Fighter(CHARACTERS[0], scene);
  const f2 = new Fighter(CHARACTERS[1], scene);
  f1.reset(-0.6, 0); f2.reset(0.6, 0);
  const hpBefore = f2.hp;
  f1.update(0.016, { punch: true }, f2);
  for (let i = 0; i < 30; i++) {
    f1.update(0.016, {}, f2);
    f2.update(0.016, { crouch: true }, f1);
  }
  check('しゃがみでパンチ回避', f2.hp === hpBefore);
  // キック(中段)はしゃがみに当たる
  f1.update(0.016, { kick: true }, f2);
  for (let i = 0; i < 40; i++) {
    f1.update(0.016, {}, f2);
    f2.update(0.016, { crouch: true }, f1);
  }
  check('キックはしゃがみに命中', f2.hp < hpBefore);
  f1.dispose(); f2.dispose();
}

// 5. 必殺技とKO
console.log('5. 必殺技・KO');
{
  const f1 = new Fighter(CHARACTERS[2], scene); // VIKTOR (高威力)
  const f2 = new Fighter(CHARACTERS[5], scene); // KAZANE (低HP)
  f1.reset(-0.7, 0); f2.reset(0.7, 0);
  f2.hp = 5;
  f1.update(0.016, { special: true }, f2);
  let koSeen = false;
  for (let i = 0; i < 80; i++) {
    f1.update(0.016, {}, f2);
    f2.update(0.016, {}, f1);
    if (f2.state === 'ko') koSeen = true;
  }
  check('必殺技でKO', koSeen && f2.hp === 0);
  check('KO後はKO状態を維持', f2.state === 'ko');
  f1.dispose(); f2.dispose();
}

// 6. 全アクションのポーズサンプリングがNaNを出さない
console.log('6. 全アニメのポーズ検証');
{
  const f = new Fighter(CHARACTERS[0], scene);
  const f2 = new Fighter(CHARACTERS[1], scene);
  f.reset(-1, 0); f2.reset(1, 0);
  for (const name of Object.keys(ACTIONS)) {
    f.reset(-1, 0);
    f.startAction(name);
    let ok = true;
    for (let i = 0; i < 70; i++) {
      f.update(0.016, {}, f2);
      f.root.traverse((o) => {
        if (o.rotation && (Number.isNaN(o.rotation.x) || Number.isNaN(o.rotation.y))) ok = false;
      });
      if (Number.isNaN(f.pos.x)) ok = false;
    }
    check(`アクション ${name}`, ok);
  }
  f.dispose(); f2.dispose();
}

// 7. AI: CPUが近づいて攻撃する
console.log('7. CPU AI');
{
  const f1 = new Fighter(CHARACTERS[0], scene);
  const f2 = new Fighter(CHARACTERS[3], scene);
  f1.reset(-3, 0); f2.reset(3, 0);
  const brain = new CpuBrain(1.4);
  let attacked = false;
  const startDist = f1.pos.distanceTo(f2.pos);
  for (let i = 0; i < 600; i++) {
    const inp = brain.update(0.016, f2, f1);
    if (inp.punch || inp.kick || inp.special) attacked = true;
    f1.update(0.016, {}, f2);
    f2.update(0.016, inp, f1);
  }
  const endDist = f1.pos.distanceTo(f2.pos);
  check('CPUが接近する', endDist < startDist);
  check('CPUが攻撃する', attacked);
  check('CPUの攻撃がヒットしてHPが減る', f1.hp < f1.maxHp);
  f1.dispose(); f2.dispose();
}

// 8. ジャンプ物理
console.log('8. ジャンプ');
{
  const f1 = new Fighter(CHARACTERS[0], scene);
  const f2 = new Fighter(CHARACTERS[1], scene);
  f1.reset(-2, 0); f2.reset(2, 0);
  f1.update(0.016, { jump: true }, f2);
  check('ジャンプで浮く', f1.airborne);
  let maxY = 0;
  for (let i = 0; i < 120; i++) {
    f1.update(0.016, {}, f2);
    maxY = Math.max(maxY, f1.airY);
  }
  check('頂点に達して着地する', maxY > 0.5 && !f1.airborne && f1.airY === 0);
  f1.dispose(); f2.dispose();
}

console.log(failures === 0 ? '\n全テスト成功' : `\n${failures}件失敗`);
process.exit(failures === 0 ? 0 : 1);
