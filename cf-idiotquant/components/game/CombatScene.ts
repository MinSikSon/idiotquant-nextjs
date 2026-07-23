import Phaser from "phaser";

// 가치투자 덱빌더 — 전투 씬(프로토타입 비주얼). 사각형/텍스트 placeholder + 단순 트윈만 사용.
// 판정 로직은 전혀 없음 — combatEngine이 계산한 결과를 받아 재생만 한다.
export default class CombatScene extends Phaser.Scene {
  private enemyBox!: Phaser.GameObjects.Rectangle;
  private enemyHpBar!: Phaser.GameObjects.Rectangle;
  private enemyHpBarBg!: Phaser.GameObjects.Rectangle;
  private enemyLabel!: Phaser.GameObjects.Text;
  private introText!: Phaser.GameObjects.Text;

  constructor() { super("combat"); }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.cameras.main.setBackgroundColor("#00000000");

    this.enemyBox = this.add.rectangle(w / 2, h * 0.42, w * 0.4, h * 0.42, 0xdc2626, 0.85).setStrokeStyle(2, 0xffffff, 0.3);
    this.enemyLabel = this.add.text(w / 2, h * 0.42, "", { fontSize: "14px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);

    this.enemyHpBarBg = this.add.rectangle(w / 2, h * 0.7, w * 0.5, 10, 0x000000, 0.4);
    this.enemyHpBar = this.add.rectangle(w / 2 - (w * 0.5) / 2, h * 0.7, w * 0.5, 10, 0x22c55e).setOrigin(0, 0.5);

    this.introText = this.add.text(w / 2, h / 2, "", { fontSize: "20px", color: "#facc15", fontStyle: "bold" })
      .setOrigin(0.5).setAlpha(0).setDepth(10);
  }

  setEnemy(name: string, hp: number, maxHp: number) {
    this.enemyLabel.setText(name);
    this.setEnemyHp(hp, maxHp);
  }

  setEnemyHp(hp: number, maxHp: number) {
    const w = this.scale.width;
    const pct = maxHp > 0 ? Math.max(0, hp / maxHp) : 0;
    this.tweens.add({ targets: this.enemyHpBar, scaleX: pct, duration: 250, ease: "Quad.easeOut" });
    this.enemyHpBar.width = w * 0.5; // scaleX 기준(원 width 고정)
  }

  flashEnemyHit(damage: number) {
    this.cameras.main.flash(120, 255, 60, 60);
    this.tweens.add({ targets: this.enemyBox, scaleX: 0.92, scaleY: 0.92, duration: 80, yoyo: true });
    this.popText(this.scale.width / 2, this.scale.height * 0.3, `-${damage}`, "#f87171");
  }

  flashPlayerBlock(amount: number) {
    this.popText(this.scale.width / 2, this.scale.height * 0.85, `+${amount} 🛡️`, "#60a5fa");
  }

  flashPlayerHit(damage: number) {
    if (damage <= 0) return;
    this.cameras.main.shake(150, 0.006);
    this.popText(this.scale.width / 2, this.scale.height * 0.9, `-${damage}`, "#f87171");
  }

  playHeal(amount: number) {
    this.popText(this.scale.width / 2, this.scale.height * 0.85, `+${amount} ❤️`, "#4ade80");
  }

  showIntro(label: string) {
    this.introText.setText(label).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.introText, scale: 1, alpha: { from: 1, to: 1 }, duration: 200, ease: "Back.easeOut" });
    this.time.delayedCall(700, () => this.tweens.add({ targets: this.introText, alpha: 0, duration: 250 }));
  }

  private popText(x: number, y: number, text: string, color: string) {
    const t = this.add.text(x, y, text, { fontSize: "16px", color, fontStyle: "bold" }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 600, ease: "Quad.easeOut", onComplete: () => t.destroy() });
  }
}
