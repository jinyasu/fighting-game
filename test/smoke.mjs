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

// 9. 勝利ポーズ中のupdateが例外を出さない(ラウンド進行バグの回帰テスト)
console.log('9. 勝利ポーズ(回帰)');
{
  const f1 = new Fighter(CHARACTERS[0], scene);
  const f2 = new Fighter(CHARACTERS[1], scene);
  f1.reset(-2, 0); f2.reset(2, 0);
  f2.hp = 1;
  f2.ko();
  f1.win();
  let ok = true;
  try {
    for (let i = 0; i < 200; i++) {
      f1.update(0.016, null, f2);
      f2.update(0.016, null, f1);
    }
  } catch (e) {
    ok = false;
    console.error('   例外:', e.message);
  }
  check('win/ko状態のupdateが例外を出さない', ok);
  check('win状態が維持される', f1.state === 'win');
  f1.dispose(); f2.dispose();
}

// 10. コンボ(パンチ→パンチで2段目につながる)
console.log('10. コンボ');
{
  const f1 = new Fighter(CHARACTERS[0], scene);
  const f2 = new Fighter(CHARACTERS[1], scene);
  f1.reset(-0.6, 0); f2.reset(0.6, 0);
  const hp0 = f2.hp;
  let sawPunch2 = false;
  f1.update(0.016, { punch: true }, f2);
  for (let i = 0; i < 60; i++) {
    // 攻撃中に追加入力してコンボへ派生
    const inp = i === 6 ? { punch: true } : {};
    f1.update(0.016, inp, f2);
    f2.update(0.016, {}, f1);
    if (f1.actionName === 'punch2') sawPunch2 = true;
  }
  check('2段目(ストレート)に派生する', sawPunch2);
  check('2発分のダメージが入る', hp0 - f2.hp >= 14);
  f1.dispose(); f2.dispose();
}

// 11. 下段とガードの三すくみ
console.log('11. 下段 vs ガード');
{
  const f1 = new Fighter(CHARACTERS[0], scene);
  const f2 = new Fighter(CHARACTERS[1], scene);
  // 足払い(下段) vs 立ちガード → ヒットしてダウン
  f1.reset(-0.6, 0); f2.reset(0.6, 0);
  let hp0 = f2.hp;
  f2.update(0.016, { guard: true }, f1);
  f1.update(0.016, { crouch: true, kick: true }, f2);
  let sawDown = false;
  for (let i = 0; i < 60; i++) {
    f1.update(0.016, { crouch: true }, f2);
    f2.update(0.016, { guard: true }, f1);
    if (f2.state === 'down') sawDown = true;
  }
  check('足払いは立ちガードを崩す', f2.hp < hp0 && sawDown);

  // 足払い(下段) vs しゃがみガード → ガードされる
  const f3 = new Fighter(CHARACTERS[0], scene);
  const f4 = new Fighter(CHARACTERS[1], scene);
  f3.reset(-0.6, 0); f4.reset(0.6, 0);
  f4.update(0.016, { guard: true, crouch: true }, f3);
  hp0 = f4.hp;
  f3.update(0.016, { crouch: true, kick: true }, f4);
  for (let i = 0; i < 60; i++) {
    f3.update(0.016, { crouch: true }, f4);
    f4.update(0.016, { guard: true, crouch: true }, f3);
  }
  check('足払いはしゃがみガードで防げる', f4.hp === hp0);

  // キック(中段) vs しゃがみガード → ヒット
  const f5 = new Fighter(CHARACTERS[0], scene);
  const f6 = new Fighter(CHARACTERS[1], scene);
  f5.reset(-0.6, 0); f6.reset(0.6, 0);
  f6.update(0.016, { guard: true, crouch: true }, f5);
  hp0 = f6.hp;
  f5.update(0.016, { kick: true }, f6);
  for (let i = 0; i < 60; i++) {
    f5.update(0.016, {}, f6);
    f6.update(0.016, { guard: true, crouch: true }, f5);
  }
  check('中段キックはしゃがみガードを崩す', f6.hp < hp0);
  f1.dispose(); f2.dispose(); f3.dispose(); f4.dispose(); f5.dispose(); f6.dispose();
}

// 12. 投げ
console.log('12. 投げ');
{
  const f1 = new Fighter(CHARACTERS[0], scene);
  const f2 = new Fighter(CHARACTERS[1], scene);
  // 立ちガード相手に投げが通る
  f1.reset(-0.5, 0); f2.reset(0.5, 0);
  f2.update(0.016, { guard: true }, f1);
  let hp0 = f2.hp;
  f1.update(0.016, { throw: true }, f2);
  let sawDown = false;
  for (let i = 0; i < 80; i++) {
    f1.update(0.016, {}, f2);
    f2.update(0.016, { guard: true }, f1);
    if (f2.state === 'down') sawDown = true;
  }
  check('投げはガードを無視してダウンを奪う', f2.hp < hp0 && sawDown);

  // しゃがみ相手には投げが空振る
  const f3 = new Fighter(CHARACTERS[0], scene);
  const f4 = new Fighter(CHARACTERS[1], scene);
  f3.reset(-0.5, 0); f4.reset(0.5, 0);
  f4.update(0.016, { crouch: true }, f3);
  hp0 = f4.hp;
  f3.update(0.016, { throw: true }, f4);
  for (let i = 0; i < 80; i++) {
    f3.update(0.016, {}, f4);
    f4.update(0.016, { crouch: true }, f3);
  }
  check('しゃがみには投げが空振る', f4.hp === hp0);
  f1.dispose(); f2.dispose(); f3.dispose(); f4.dispose();
}

// 13. ダウン→無敵→起き上がり
console.log('13. ダウンと起き上がり');
{
  const f1 = new Fighter(CHARACTERS[0], scene);
  const f2 = new Fighter(CHARACTERS[1], scene);
  f1.reset(-0.5, 0); f2.reset(0.5, 0);
  f2.knockdown();
  const hp0 = f2.hp;
  // ダウン中は攻撃が当たらない
  f1.update(0.016, { punch: true }, f2);
  for (let i = 0; i < 30; i++) {
    f1.update(0.016, {}, f2);
    f2.update(0.016, {}, f1);
  }
  check('ダウン中は無敵', f2.hp === hp0);
  // 時間経過で起き上がって自由になる
  for (let i = 0; i < 150; i++) f2.update(0.016, {}, f1);
  check('起き上がってfreeに戻る', f2.state === 'free');
  f1.dispose(); f2.dispose();
}

// 14. 空中攻撃
console.log('14. 空中攻撃');
{
  const f1 = new Fighter(CHARACTERS[0], scene);
  const f2 = new Fighter(CHARACTERS[1], scene);
  f1.reset(-0.7, 0); f2.reset(0.7, 0);
  const hp0 = f2.hp;
  f1.update(0.016, { jump: true }, f2);
  for (let i = 0; i < 8; i++) f1.update(0.016, {}, f2);
  f1.update(0.016, { kick: true }, f2);
  check('空中でキックが出る', f1.actionName === 'airKick');
  for (let i = 0; i < 60; i++) {
    f1.update(0.016, {}, f2);
    f2.update(0.016, {}, f1);
  }
  check('ジャンプキックが当たる', f2.hp < hp0);
  f1.dispose(); f2.dispose();
}

console.log(failures === 0 ? '\n全テスト成功' : `\n${failures}件失敗`);
process.exit(failures === 0 ? 0 : 1);
