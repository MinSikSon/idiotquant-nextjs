import Phaser from "phaser";

// 가치투자 덱빌더 — 전투 씬(프로토타입 비주얼). 몬스터는 모노스페이스 ASCII 아트로 그린다.
// 판정 로직은 전혀 없음 — combatEngine이 계산한 결과를 받아 재생만 한다.

// 몬스터 아트는 부위별(머리/눈/입/몸통) 조각을 랜덤 조합해 매 조우마다 다른 생김새를 만든다.
// Phaser Text의 align:"center"는 줄마다 독립적으로 가운데 정렬하므로 줄 길이가 달라도 괜찮다.
const HEAD_ROWS = ["   ▄▄▄▄▄▄▄   ", "  ▄███████▄  ", " ▄▄▀▀▀▀▀▀▀▄▄ ", "   ◢▄▄▄▄▄◣   "];
const EYES_ROWS = ["█  ●     ●  █", "█  ◉     ◉  █", "█  ✕     ✕  █", "█  ▲     ▲  █", "█ ◕     ◕ █"];
const MOUTH_ROWS = ["█     ▼     █", "█    ▽▽▽    █", "█   ▔▔▔▔▔   █", "█  ▁▁▁▁▁▁▁  █", "█    ◇◇◇    █"];
const BODY_ROWS = [" █▄       ▄█ ", " ██▄     ▄██ ", "  █▄▄   ▄▄█  ", " ▐█       █▌ "];
const FOOT_ROWS = ["   ▀▀▀▀▀▀▀   ", "  ▀▀▀▀▀▀▀▀▀  ", " ▀▀▀   ▀▀▀   ", "  ▘▘▘▘▘▘▘▘▘  "];
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
function randomMonster(): string {
  return [pick(HEAD_ROWS), pick(EYES_ROWS), pick(MOUTH_ROWS), pick(BODY_ROWS), pick(FOOT_ROWS)].join("\n");
}

const BAR_LEN = 14;
function asciiBar(hp: number, maxHp: number): string {
  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const filled = Math.round(pct * BAR_LEN);
  return `[${"█".repeat(filled)}${"░".repeat(BAR_LEN - filled)}] ${Math.max(0, hp)}/${maxHp}`;
}

// Phaser의 Text는 자체 해상도(resolution)로 텍스처를 굽는데 기본값 1이라 고밀도(레티나)
// 모바일 화면에서 흐릿하게 보임 — devicePixelRatio만큼 올려서 선명하게 그린다(과도한 메모리
// 사용 방지로 최대 3배로 제한).
const RES = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;

export default class CombatScene extends Phaser.Scene {
  private enemyArt!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  private enemyLabel!: Phaser.GameObjects.Text;
  private introText!: Phaser.GameObjects.Text;

  constructor() { super("combat"); }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.cameras.main.setBackgroundColor("#00000000");

    this.enemyLabel = this.add.text(w / 2, h * 0.08, "", { fontSize: "12px", color: "#ffffff", fontStyle: "bold", resolution: RES }).setOrigin(0.5);
    this.enemyArt = this.add.text(w / 2, h * 0.48, randomMonster(), {
      fontFamily: "monospace", fontSize: "11px", color: "#f87171", align: "center", lineSpacing: 1, resolution: RES,
    }).setOrigin(0.5);
    this.enemyHpText = this.add.text(w / 2, h * 0.88, asciiBar(0, 1), {
      fontFamily: "monospace", fontSize: "11px", color: "#4ade80", fontStyle: "bold", resolution: RES,
    }).setOrigin(0.5);

    this.introText = this.add.text(w / 2, h / 2, "", { fontSize: "20px", color: "#facc15", fontStyle: "bold", resolution: RES })
      .setOrigin(0.5).setAlpha(0).setDepth(10);
  }

  setEnemy(name: string, hp: number, maxHp: number) {
    this.enemyLabel.setText(name);
    this.enemyArt.setText(randomMonster());
    this.setEnemyHp(hp, maxHp);
  }

  setEnemyHp(hp: number, maxHp: number) {
    this.enemyHpText.setText(asciiBar(hp, maxHp));
  }

  flashEnemyHit(damage: number) {
    this.cameras.main.flash(120, 255, 60, 60);
    this.tweens.add({ targets: this.enemyArt, scaleX: 0.92, scaleY: 0.92, duration: 80, yoyo: true });
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
    const t = this.add.text(x, y, text, { fontSize: "16px", color, fontStyle: "bold", resolution: RES }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 600, ease: "Quad.easeOut", onComplete: () => t.destroy() });
  }
}
