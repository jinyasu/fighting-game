// キーボード入力管理
// P1: WASD移動(W=ジャンプ, S=しゃがみ), Q/E=サイドステップ, F=パンチ, G=キック, H=必殺技, T=投げ, Space=ガード
// P2: 矢印キー移動, ,/.=サイドステップ, K=パンチ, L=キック, O=必殺技, I=投げ, M=ガード

export class InputManager {
  constructor() {
    this.down = new Set();
    this.pressed = new Set(); // このフレームで押された
    window.addEventListener('keydown', (e) => {
      // スクロール等のブラウザ既定動作を抑止
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  endFrame() { this.pressed.clear(); }

  isDown(code) { return this.down.has(code); }
  wasPressed(code) { return this.pressed.has(code); }

  // ファイター向け入力を生成。
  // fwd: +1=相手に向かう / -1=離れる。画面上の左右と一致させるため
  // 「自分が相手より左にいるなら右キー=前進」とする。
  getFighterInput(player, fighter, opponent) {
    const left = opponent ? fighter.pos.x <= opponent.pos.x : true;
    if (player === 1) {
      const right = this.isDown('KeyD') ? 1 : 0;
      const lft = this.isDown('KeyA') ? 1 : 0;
      const fwd = left ? right - lft : lft - right;
      return {
        fwd,
        side: (this.isDown('KeyQ') ? 1 : 0) - (this.isDown('KeyE') ? 1 : 0),
        jump: this.wasPressed('KeyW'),
        crouch: this.isDown('KeyS'),
        punch: this.wasPressed('KeyF'),
        kick: this.wasPressed('KeyG'),
        special: this.wasPressed('KeyH'),
        throw: this.wasPressed('KeyT'),
        guard: this.isDown('Space'),
      };
    } else {
      const right = this.isDown('ArrowRight') ? 1 : 0;
      const lft = this.isDown('ArrowLeft') ? 1 : 0;
      const fwd = left ? right - lft : lft - right;
      return {
        fwd,
        side: (this.isDown('Comma') ? 1 : 0) - (this.isDown('Period') ? 1 : 0),
        jump: this.wasPressed('ArrowUp'),
        crouch: this.isDown('ArrowDown'),
        punch: this.wasPressed('KeyK'),
        kick: this.wasPressed('KeyL'),
        special: this.wasPressed('KeyO'),
        throw: this.wasPressed('KeyI'),
        guard: this.isDown('KeyM'),
      };
    }
  }
}
