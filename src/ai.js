// CPU対戦用の簡易AI。一定間隔で状況を判断して行動を選ぶ。

export class CpuBrain {
  constructor(difficulty = 1.0) {
    this.difficulty = difficulty; // 0.6=弱い 1.0=普通 1.4=強い
    this.thinkTimer = 0;
    this.current = this.neutral();
    this.sideTimer = 0;
    this.sideDir = 0;
  }

  neutral() {
    return { fwd: 0, side: 0, jump: false, crouch: false, punch: false, kick: false, special: false, throw: false, guard: false };
  }

  update(dt, self, opponent) {
    this.thinkTimer -= dt;
    this.sideTimer -= dt;

    // 単発入力(押した瞬間扱い)は毎フレームリセット
    this.current.punch = false;
    this.current.kick = false;
    this.current.special = false;
    this.current.throw = false;
    this.current.jump = false;

    if (this.thinkTimer > 0) return this.current;
    this.thinkTimer = 0.13 + Math.random() * 0.12 / this.difficulty;

    const dx = opponent.pos.x - self.pos.x;
    const dz = opponent.pos.z - self.pos.z;
    const dist = Math.hypot(dx, dz);
    const r = Math.random();
    const d = this.difficulty;

    const c = this.neutral();

    // 攻撃が当たった後はコンボを継続する
    if (self.state === 'attack' && self.action && self.action.chains && self.hasHit && r < 0.6 * d) {
      if (self.action.chains.punch) c.punch = true;
      else if (self.action.chains.kick) c.kick = true;
      this.current = c;
      return c;
    }

    // 相手の攻撃に反応してガード/回避
    const oppAttacking = opponent.state === 'attack' && opponent.attackHit;
    if (oppAttacking && dist < 2.6) {
      if (r < 0.45 * d) {
        c.guard = true;
        // 下段攻撃にはしゃがみガード
        if (opponent.attackHit.height === 'low') c.crouch = true;
        this.current = c;
        return c;
      }
      if (r < 0.6 * d) {
        // サイドステップ回避
        this.sideDir = Math.random() < 0.5 ? 1 : -1;
        this.sideTimer = 0.3;
      }
    }

    // 相手ダウン/被弾中は追撃チャンス
    const oppVulnerable = opponent.state === 'hit';

    if (dist > 2.2) {
      // 接近。たまにサイドステップやジャンプを混ぜる
      c.fwd = 1;
      if (this.sideTimer > 0) c.side = this.sideDir;
      else if (r < 0.12) {
        this.sideDir = Math.random() < 0.5 ? 1 : -1;
        this.sideTimer = 0.35;
        c.side = this.sideDir;
      }
      if (dist > 3.2 && r > 0.92) c.special = true; // 突進技
    } else if (dist > 1.6) {
      // 中間距離: キックや必殺技、または踏み込み
      if (r < 0.28 * d) c.kick = true;
      else if (r < 0.36 * d) c.special = true;
      else if (r < 0.7) c.fwd = 1;
      else if (r < 0.8) { c.fwd = -1; }
      else if (this.sideTimer > 0) c.side = this.sideDir;
    } else {
      // 近距離: ラッシュ(コンボ始動・下段・投げを織り交ぜる)
      if (oppVulnerable && r < 0.5 * d) {
        c.punch = true;
      } else if (opponent.state === 'block' && r < 0.35 * d) {
        // ガードを固める相手には投げか下段
        if (r < 0.18 * d) c.throw = true;
        else { c.crouch = true; c.kick = true; } // 足払い
      } else if (r < 0.28 * d) c.punch = true;
      else if (r < 0.42 * d) c.kick = true;
      else if (r < 0.48 * d) { c.crouch = true; c.punch = true; } // しゃがみパンチ
      else if (r < 0.54 * d) c.special = true;
      else if (r < 0.58 * d) c.throw = true;
      else if (r < 0.7) c.guard = true;
      else if (r < 0.8) c.fwd = -1; // 距離を取る
      else c.crouch = true;
    }

    // リングアウトしそうなら中央へ寄る
    const selfR = Math.hypot(self.pos.x, self.pos.z);
    if (selfR > 6.2) {
      const toCenterX = -self.pos.x, toCenterZ = -self.pos.z;
      // 相手方向と中央方向の内積で前進/後退を決める
      const dot = toCenterX * dx + toCenterZ * dz;
      c.fwd = dot > 0 ? 1 : -1;
      c.guard = false;
      c.crouch = false;
    }

    this.current = c;
    return c;
  }
}
