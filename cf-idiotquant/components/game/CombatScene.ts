import Phaser from "phaser";

// 가치투자 덱빌더 — 전투 씬(프로토타입 비주얼). 몬스터는 모노스페이스 ASCII 아트로 그린다.
// 판정 로직은 전혀 없음 — combatEngine이 계산한 결과를 받아 재생만 한다.

// 몬스터 아트는 부위별(장식/머리/눈/입/몸통/발) 조각을 랜덤 조합해 매 조우마다 다른 생김새를
// 만든다(로그라이크 ASCII 몬스터 관례 참고 — 뿔/촉수/유령형 등 다양한 실루엣을 부위 풀로 분리).
// Phaser Text의 align:"center"는 줄마다 독립적으로 가운데 정렬하므로 줄 길이가 달라도 괜찮다.
const DECOR_ROWS = ["", "  ◣       ◢  ", "    ╱   ╲    ", "   ⌒     ⌒   ", "  ╲╲     ╱╱  "]; // 뿔/촉수/더듬이(빈 문자열 = 없음)
const HEAD_ROWS = ["   ▄▄▄▄▄▄▄   ", "  ▄███████▄  ", " ▄▄▀▀▀▀▀▀▀▄▄ ", "   ◢▄▄▄▄▄◣   ", " ▄▄▄▄▄▄▄▄▄▄▄ ", "    ▄▄▄▄▄    "];
const EYES_ROWS = ["█  ●     ●  █", "█  ◉     ◉  █", "█  ✕     ✕  █", "█  ▲     ▲  █", "█ ◕     ◕ █", "█ ⊙       ⊙ █", "█    ◉◉◉    █"];
const BLINK_ROW = "█  ─     ─  █"; // 눈을 잠깐 감은 프레임(깜빡임 연출용)
const MOUTH_ROWS = ["█     ▼     █", "█    ▽▽▽    █", "█   ▔▔▔▔▔   █", "█  ▁▁▁▁▁▁▁  █", "█    ◇◇◇    █", "█   ︿︿︿   █", "█  ▷     ◁  █"];
const BODY_ROWS = [" █▄       ▄█ ", " ██▄     ▄██ ", "  █▄▄   ▄▄█  ", " ▐█       █▌ ", "  ▓▓▓▓▓▓▓▓▓  ", " ╱▔▔▔▔▔▔▔╲ "];
const FOOT_ROWS = ["   ▀▀▀▀▀▀▀   ", "  ▀▀▀▀▀▀▀▀▀  ", " ▀▀▀   ▀▀▀   ", "  ▘▘▘▘▘▘▘▘▘  ", "  ╲╱  ╲╱  ╲╱ "];
// 몸 색도 매번 바뀌어야 "다양화"가 체감되므로 몬스터풍 팔레트에서 랜덤 선택(가독성 위해 채도 높은 톤만 사용)
const COLORS = ["#f87171", "#c084fc", "#fb923c", "#38bdf8", "#4ade80", "#fbbf24", "#f472b6"];
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

type MonsterParts = { decor: string; head: string; eyes: string; mouth: string; body: string; foot: string; color: string };
function randomMonster(): MonsterParts {
  return { decor: pick(DECOR_ROWS), head: pick(HEAD_ROWS), eyes: pick(EYES_ROWS), mouth: pick(MOUTH_ROWS), body: pick(BODY_ROWS), foot: pick(FOOT_ROWS), color: pick(COLORS) };
}
function monsterText(p: MonsterParts, eyes = p.eyes): string {
  return [p.decor, p.head, eyes, p.mouth, p.body, p.foot].filter(Boolean).join("\n");
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
  private parts!: MonsterParts;
  private bobTween?: Phaser.Tweens.Tween;
  private artBaseY = 0; // bob 트윈 기준 y(고정) — 트윈 도중 값을 재사용하면 매번 살짝 밀려 누적 표류함

  constructor() { super("combat"); }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.cameras.main.setBackgroundColor("#00000000");

    this.enemyLabel = this.add.text(w / 2, h * 0.08, "", { fontSize: "12px", color: "#ffffff", fontStyle: "bold", resolution: RES }).setOrigin(0.5);
    this.parts = randomMonster();
    this.artBaseY = h * 0.48;
    this.enemyArt = this.add.text(w / 2, this.artBaseY, monsterText(this.parts), {
      fontFamily: "monospace", fontSize: "11px", color: this.parts.color, align: "center", lineSpacing: 1, resolution: RES,
    }).setOrigin(0.5);
    this.enemyHpText = this.add.text(w / 2, h * 0.88, asciiBar(0, 1), {
      fontFamily: "monospace", fontSize: "11px", color: "#4ade80", fontStyle: "bold", resolution: RES,
    }).setOrigin(0.5);

    this.introText = this.add.text(w / 2, h / 2, "", { fontSize: "20px", color: "#facc15", fontStyle: "bold", resolution: RES })
      .setOrigin(0.5).setAlpha(0).setDepth(10);

    this.startIdleAnim();
  }

  // 살아있는 느낌을 주는 대기 애니메이션 — 위아래로 살짝 흔들리는 픽셀 움직임(bob) +
  // 몇 초마다 눈을 잠깐 감는 깜빡임. 둘 다 판정과 무관한 순수 장식 트윈/타이머.
  private startIdleAnim() {
    this.bobTween = this.tweens.add({ targets: this.enemyArt, y: this.artBaseY - 4, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.time.addEvent({
      delay: Phaser.Math.Between(2200, 3600), loop: true,
      callback: () => {
        this.enemyArt.setText(monsterText(this.parts, BLINK_ROW));
        this.time.delayedCall(120, () => this.enemyArt.setText(monsterText(this.parts)));
      },
    });
  }

  setEnemy(name: string, hp: number, maxHp: number) {
    this.enemyLabel.setText(name);
    this.parts = randomMonster();
    this.bobTween?.stop();
    this.enemyArt.setPosition(this.enemyArt.x, this.artBaseY).setText(monsterText(this.parts)).setColor(this.parts.color);
    this.bobTween = this.tweens.add({ targets: this.enemyArt, y: this.artBaseY - 4, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
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
