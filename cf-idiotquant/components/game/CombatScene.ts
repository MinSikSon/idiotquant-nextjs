import Phaser from "phaser";

// 가치투자 덱빌더 — 전투 씬(프로토타입 비주얼). 몬스터는 진짜 픽셀 격자(Graphics로 정사각형을
// 하나하나 찍는 방식)로 그린 귀여운 블롭 캐릭터. 유니코드 글자 기반 ASCII 아트는 폰트마다
// 모양이 달라지고 못생겨 보인다는 피드백을 받아 폐기하고, 격자 좌표만으로 매번 매끈한 타원
// 실루엣을 계산해 그리는 방식으로 바꿨다 — 조합이 아무리 랜덤해도 항상 매끈한 블롭이 보장됨.
// 판정 로직은 전혀 없음 — combatEngine이 계산한 결과를 받아 재생만 한다.

const GRID = 14;
const CX = GRID / 2, CY = GRID / 2; // 블롭 중심(격자 좌표계)
const RX = 6, RY = 5.2; // 몸통 타원 반지름(칸 단위) — 살짝 눌린 타원이 통통한 슬라임 느낌을 줌

function inBody(col: number, row: number): boolean {
  const nx = (col + 0.5 - CX) / RX, ny = (row + 0.5 - CY) / RY;
  return nx * nx + ny * ny <= 1;
}

type Palette = { body: number; outline: number; blush: number };
const PALETTES: Palette[] = [
  { body: 0xf87171, outline: 0xb91c1c, blush: 0xfecaca },
  { body: 0xc084fc, outline: 0x7e22ce, blush: 0xf3e8ff },
  { body: 0xfb923c, outline: 0xc2410c, blush: 0xfed7aa },
  { body: 0x38bdf8, outline: 0x0369a1, blush: 0xdbeafe },
  { body: 0x4ade80, outline: 0x15803d, blush: 0xdcfce7 },
  { body: 0xfbbf24, outline: 0xb45309, blush: 0xfef3c7 },
  { body: 0xf472b6, outline: 0xbe185d, blush: 0xfce7f3 },
];

type MouthKind = "smile" | "o" | "none";
type MonsterSpec = { palette: Palette; eyeGap: number; mouth: MouthKind; hasAntenna: boolean; hasBlush: boolean };
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
function randomMonster(): MonsterSpec {
  return {
    palette: pick(PALETTES),
    eyeGap: pick([2, 3]),
    mouth: pick(["smile", "smile", "o", "none"]),
    hasAntenna: Math.random() < 0.4,
    hasBlush: Math.random() < 0.5,
  };
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
  private enemyGfx!: Phaser.GameObjects.Graphics;
  private enemyHpText!: Phaser.GameObjects.Text;
  private enemyLabel!: Phaser.GameObjects.Text;
  private introText!: Phaser.GameObjects.Text;
  private spec!: MonsterSpec;
  private cell = 8; // 격자 한 칸의 화면 픽셀 크기(씬 크기에 맞춰 create에서 재계산)
  private bobTween?: Phaser.Tweens.Tween;
  private artBaseY = 0; // bob 트윈 기준 y(고정) — 트윈 도중 값을 재사용하면 매번 살짝 밀려 누적 표류함

  constructor() { super("combat"); }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.cameras.main.setBackgroundColor("#00000000");

    this.enemyLabel = this.add.text(w / 2, h * 0.1, "", { fontSize: "12px", color: "#ffffff", fontStyle: "bold", resolution: RES }).setOrigin(0.5);

    this.cell = Math.max(4, Math.floor(Math.min(w * 0.9, h * 0.62) / GRID));
    this.artBaseY = h * 0.48;
    this.spec = randomMonster();
    this.enemyGfx = this.add.graphics({ x: w / 2, y: this.artBaseY });
    this.drawMonster(false);

    this.enemyHpText = this.add.text(w / 2, h * 0.88, asciiBar(0, 1), {
      fontFamily: "monospace", fontSize: "11px", color: "#4ade80", fontStyle: "bold", resolution: RES,
    }).setOrigin(0.5);

    this.introText = this.add.text(w / 2, h / 2, "", { fontSize: "20px", color: "#facc15", fontStyle: "bold", resolution: RES })
      .setOrigin(0.5).setAlpha(0).setDepth(10);

    this.startIdleAnim();
  }

  // 격자 좌표(col,row 기준, 원점은 그리드 중앙)를 그래픽스 로컬 좌표(px)로 변환
  private cellPx(col: number, row: number) {
    return { x: (col - CX) * this.cell, y: (row - CY) * this.cell };
  }

  private drawMonster(blink: boolean) {
    const g = this.enemyGfx;
    const s = this.spec;
    g.clear();

    // 몸통 — 칸마다 타원 안쪽인지 검사해 채우고, 바로 바깥 칸이 하나라도 비어 있으면 외곽선색으로.
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        if (!inBody(col, row)) continue;
        const edge = !inBody(col + 1, row) || !inBody(col - 1, row) || !inBody(col, row + 1) || !inBody(col, row - 1);
        const { x, y } = this.cellPx(col, row);
        g.fillStyle(edge ? s.palette.outline : s.palette.body, 1);
        g.fillRect(x, y, this.cell + 1, this.cell + 1); // +1로 인접 칸 사이 미세한 틈(seam) 방지
      }
    }

    // 더듬이(장식) — 정수리 위로 작은 줄기 + 동그란 끝
    if (s.hasAntenna) {
      const topRow = CY - RY;
      const stem = this.cellPx(CX, topRow - 2);
      g.fillStyle(s.palette.outline, 1);
      g.fillRect(stem.x, stem.y, this.cell, this.cell * 2.2);
      g.fillStyle(s.palette.body, 1);
      g.fillCircle(stem.x + this.cell / 2, stem.y, this.cell * 0.7);
    }

    // 볼터치
    if (s.hasBlush) {
      g.fillStyle(s.palette.blush, 0.9);
      for (const dir of [-1, 1]) {
        const p = this.cellPx(CX + dir * (s.eyeGap + 2), CY + 0.5);
        g.fillCircle(p.x + this.cell / 2, p.y + this.cell / 2, this.cell * 0.8);
      }
    }

    // 눈 — 흰자 + 눈동자(2칸), 깜빡일 땐 얇은 가로줄로 대체
    for (const dir of [-1, 1]) {
      const ex = CX + dir * s.eyeGap;
      const p = this.cellPx(ex, CY - 1.5);
      if (blink) {
        g.fillStyle(s.palette.outline, 1);
        g.fillRect(p.x - this.cell * 0.6, p.y + this.cell * 0.3, this.cell * 1.2, this.cell * 0.35);
      } else {
        g.fillStyle(0xffffff, 1);
        g.fillCircle(p.x + this.cell / 2, p.y + this.cell / 2, this.cell * 0.95);
        g.fillStyle(0x1f2937, 1);
        g.fillCircle(p.x + this.cell / 2 + dir * this.cell * 0.25, p.y + this.cell / 2 + this.cell * 0.15, this.cell * 0.45);
      }
    }

    // 입
    if (s.mouth !== "none") {
      const p = this.cellPx(CX, CY + 1.6);
      g.fillStyle(s.palette.outline, 1);
      if (s.mouth === "smile") g.fillRoundedRect(p.x - this.cell, p.y, this.cell * 2, this.cell * 0.4, this.cell * 0.2);
      else g.fillCircle(p.x + this.cell / 2, p.y, this.cell * 0.4);
    }
  }

  setEnemy(name: string, hp: number, maxHp: number) {
    this.enemyLabel.setText(name);
    this.spec = randomMonster();
    this.bobTween?.stop();
    this.enemyGfx.setPosition(this.enemyGfx.x, this.artBaseY);
    this.drawMonster(false);
    this.bobTween = this.tweens.add({ targets: this.enemyGfx, y: this.artBaseY - 4, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.setEnemyHp(hp, maxHp);
  }

  setEnemyHp(hp: number, maxHp: number) {
    this.enemyHpText.setText(asciiBar(hp, maxHp));
  }

  // 살아있는 느낌을 주는 대기 애니메이션 — 위아래로 살짝 흔들리는 움직임(bob) +
  // 몇 초마다 눈을 잠깐 감는 깜빡임. 둘 다 판정과 무관한 순수 장식 트윈/타이머.
  private startIdleAnim() {
    this.bobTween = this.tweens.add({ targets: this.enemyGfx, y: this.artBaseY - 4, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.time.addEvent({
      delay: Phaser.Math.Between(2200, 3600), loop: true,
      callback: () => {
        this.drawMonster(true);
        this.time.delayedCall(120, () => this.drawMonster(false));
      },
    });
  }

  flashEnemyHit(damage: number) {
    this.cameras.main.flash(120, 255, 60, 60);
    this.tweens.add({ targets: this.enemyGfx, scaleX: 0.92, scaleY: 0.92, duration: 80, yoyo: true });
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
