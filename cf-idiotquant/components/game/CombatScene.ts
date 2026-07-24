import Phaser from "phaser";

// 가치투자 덱빌더 — 전투 씬(프로토타입 비주얼). 몬스터는 진짜 픽셀 격자(Graphics로 정사각형을
// 하나하나 찍는 방식)로 그린 귀여운 블롭 캐릭터. 유니코드 글자 기반 ASCII 아트는 폰트마다
// 모양이 달라지고 못생겨 보인다는 피드백을 받아 폐기하고, 격자 좌표만으로 매번 매끈한 타원
// 실루엣을 계산해 그리는 방식으로 바꿨다 — 조합이 아무리 랜덤해도 항상 매끈한 블롭이 보장됨.
// 판정 로직은 전혀 없음 — combatEngine이 계산한 결과를 받아 재생만 한다.

// 슬라임 실루엣 — 위쪽은 돔(타원 상반부) + 정수리 뾰족점(고전 물방울형 슬라임 실루엣 관례
// 참고, 특정 캐릭터 디자인을 그대로 베끼지 않고 형태 관례만 차용), 적도(CY)부터 아래는
// 바닥으로 갈수록 폭이 점점 넓어지는 플레어(치마처럼 퍼짐)를 줘서 "바닥에 퍼져 앉은" 느낌을
// 낸다. 맨 아랫줄만 살짝 좁혀 모서리를 둥글게.
const GRID = 18;
const CX = GRID / 2;
const RX = 5;
const CY = 7; // 돔의 적도(가장 넓은 지점) — 여기부터 아래는 바닥까지 폭이 늘어남

// 대기 애니메이션용 두 프레임 — 위치를 옮기는 트윈 대신, 돔 높이/바닥 폭 몇 줄만 바꿔서
// "숨쉬듯" 눌렸다 펴지는 느낌을 픽셀 단위로 표현한다(값이 낮을수록 납작하게 눌린 프레임).
type ShapeParams = { ry: number; bodyBottom: number; flare: number };
const SHAPE_NORMAL: ShapeParams = { ry: 5.5, bodyBottom: 13, flare: 2.6 };
const SHAPE_SQUISH: ShapeParams = { ry: 4.6, bodyBottom: 12, flare: 3.6 };

const SPIKE_ROW_OFFSET = 1.5; // 정수리 뾰족점이 돔 타원보다 몇 줄 위까지 튀어나오는지
const SPIKE_HALF_WIDTH = 0.6; // 뾰족점의 중심 기준 반폭(칸)

function inBody(col: number, row: number, shape: ShapeParams): boolean {
  if (row > shape.bodyBottom) return false;
  const dx = col + 0.5 - CX;
  if (row <= CY) {
    const ny = (row + 0.5 - CY) / shape.ry;
    const nx = dx / RX;
    if (nx * nx + ny * ny <= 1) return true;
    // 정수리 뾰족점 — 돔 타원 바로 위 한 줄만, 중앙 두 칸 폭으로 살짝 튀어나오게
    const nyBelow = (row + SPIKE_ROW_OFFSET - CY) / shape.ry;
    return nyBelow * nyBelow <= 1 && Math.abs(dx) <= SPIKE_HALF_WIDTH;
  }
  const t = (row - CY) / (shape.bodyBottom - CY); // 0(적도) → 1(바닥)
  const flared = RX + t * shape.flare;
  const maxRx = row >= shape.bodyBottom ? flared - 1 : flared; // 맨 아랫줄만 살짝 좁혀 모서리를 둥글게
  return Math.abs(dx) <= maxRx;
}

// 초록 계열 팔레트로만 구성(슬라임다움을 위해 색상군을 고정, 색조는 다양화)
type Palette = { body: number; outline: number; shine: number };
function lighten(hex: number, amt: number): number {
  const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
  const mix = (c: number) => Math.min(255, Math.round(c + (255 - c) * amt));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}
const PALETTE_BASE = [
  { body: 0x4ade80, outline: 0x15803d }, // 에메랄드
  { body: 0x34d399, outline: 0x047857 }, // 민트
  { body: 0xa3e635, outline: 0x4d7c0f }, // 라임
  { body: 0x22c55e, outline: 0x14532d }, // 포레스트
  { body: 0x6ee7b7, outline: 0x0f766e }, // 시폼
  { body: 0x84cc16, outline: 0x3f6212 }, // 올리브
];
const PALETTES: Palette[] = PALETTE_BASE.map(p => ({ ...p, shine: lighten(p.body, 0.6) }));
const BLUSH_COLOR = 0xfda4af; // 초록 몸과 대비되도록 볼터치는 고정 분홍

type MouthKind = "smile" | "o" | "none";
type MonsterSpec = { palette: Palette; eyeGap: number; mouth: MouthKind; hasBlush: boolean };
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
function randomMonster(): MonsterSpec {
  return {
    palette: pick(PALETTES),
    eyeGap: pick([2, 3]),
    mouth: pick(["smile", "smile", "o", "none"]),
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
  private blinking = false;
  private squished = false;

  constructor() { super("combat"); }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.cameras.main.setBackgroundColor("#00000000");

    this.enemyLabel = this.add.text(w / 2, h * 0.1, "", { fontSize: "12px", color: "#ffffff", fontStyle: "bold", resolution: RES }).setOrigin(0.5);

    this.cell = Math.max(4, Math.floor(Math.min(w * 0.9, h * 0.62) / GRID));
    this.spec = randomMonster();
    this.enemyGfx = this.add.graphics({ x: w / 2, y: h * 0.48 });
    this.drawMonster();

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

  private drawMonster() {
    const g = this.enemyGfx;
    const s = this.spec;
    const shape = this.squished ? SHAPE_SQUISH : SHAPE_NORMAL;
    g.clear();

    // 몸통 판정을 칸마다 한 번만 계산해 캐시해두고(테두리 판정에서 이웃 4칸 재조회 시 재사용),
    // inBody() 중복 호출을 줄인다.
    const body: boolean[][] = [];
    for (let row = 0; row < GRID; row++) {
      body[row] = [];
      for (let col = 0; col < GRID; col++) body[row][col] = inBody(col, row, shape);
    }
    const isBody = (col: number, row: number) => body[row]?.[col] ?? false;

    // 몸통 — 칸마다 타원 안쪽인지 검사해 채우고, 바로 바깥 칸이 하나라도 비어 있으면 외곽선색으로.
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        if (!isBody(col, row)) continue;
        const edge = !isBody(col + 1, row) || !isBody(col - 1, row) || !isBody(col, row + 1) || !isBody(col, row - 1);
        const { x, y } = this.cellPx(col, row);
        g.fillStyle(edge ? s.palette.outline : s.palette.body, 1);
        g.fillRect(x, y, this.cell + 1, this.cell + 1); // +1로 인접 칸 사이 미세한 틈(seam) 방지
      }
    }

    // 광택 — 슬라임 특유의 물방울/젤리 느낌을 주는 밝은 하이라이트(왼쪽 위, 반투명)
    {
      const p = this.cellPx(CX - RX * 0.45, CY - shape.ry * 0.55);
      g.fillStyle(s.palette.shine, 0.7);
      g.fillEllipse(p.x, p.y, this.cell * 2.2, this.cell * 1.4);
    }

    // 볼터치
    if (s.hasBlush) {
      g.fillStyle(BLUSH_COLOR, 0.85);
      for (const dir of [-1, 1]) {
        const p = this.cellPx(CX + dir * (s.eyeGap + 1.8), CY + 1);
        g.fillCircle(p.x + this.cell / 2, p.y + this.cell / 2, this.cell * 0.75);
      }
    }

    // 눈 — 흰자 위에 중앙 정렬된 검은 눈동자 + 작은 반짝임 점(고전 슬라임 캐릭터의 눈 관례
    // 참고). 예전엔 흰자 없이 어두운 원만 써서 표정이 흐릿했고, 그 전엔 눈동자가 바깥쪽으로
    // 쏠려 있어 무섭다는 피드백을 받았음 — 이번엔 흰자를 넣되 눈동자는 계속 중앙에 고정.
    // 깜빡일 땐 얇은 곡선으로.
    for (const dir of [-1, 1]) {
      const ex = CX + dir * s.eyeGap;
      const p = this.cellPx(ex, CY - 0.5);
      const cxPx = p.x + this.cell / 2, cyPx = p.y + this.cell / 2;
      if (this.blinking) {
        g.fillStyle(s.palette.outline, 1);
        g.fillRoundedRect(cxPx - this.cell * 0.7, cyPx - this.cell * 0.12, this.cell * 1.4, this.cell * 0.24, this.cell * 0.12);
      } else {
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cxPx, cyPx, this.cell * 0.95);
        g.fillStyle(0x1f2937, 1);
        g.fillCircle(cxPx, cyPx + this.cell * 0.08, this.cell * 0.5);
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(cxPx - this.cell * 0.18, cyPx - this.cell * 0.2, this.cell * 0.17);
      }
    }

    // 입
    if (s.mouth !== "none") {
      const p = this.cellPx(CX, CY + 2);
      g.fillStyle(s.palette.outline, 1);
      if (s.mouth === "smile") g.fillRoundedRect(p.x - this.cell, p.y, this.cell * 2, this.cell * 0.4, this.cell * 0.2);
      else g.fillCircle(p.x + this.cell / 2, p.y, this.cell * 0.4);
    }
  }

  setEnemy(name: string, hp: number, maxHp: number) {
    this.enemyLabel.setText(name);
    this.spec = randomMonster();
    this.blinking = false;
    this.squished = false;
    this.drawMonster();
    this.setEnemyHp(hp, maxHp);
  }

  setEnemyHp(hp: number, maxHp: number) {
    this.enemyHpText.setText(asciiBar(hp, maxHp));
  }

  // 살아있는 느낌을 주는 대기 애니메이션 — 위치를 옮기는 트윈 대신 몇 개 픽셀(돔 높이·바닥
  // 폭 몇 줄)만 주기적으로 바꿔서 숨쉬듯 눌렸다 펴지는 느낌을 낸다 + 몇 초마다 눈을 잠깐
  // 감는 깜빡임. 둘 다 판정과 무관한 순수 장식 타이머.
  private startIdleAnim() {
    this.time.addEvent({
      delay: 550, loop: true,
      callback: () => { this.squished = !this.squished; this.drawMonster(); },
    });
    this.time.addEvent({
      delay: Phaser.Math.Between(2200, 3600), loop: true,
      callback: () => {
        this.blinking = true;
        this.drawMonster();
        this.time.delayedCall(120, () => { this.blinking = false; this.drawMonster(); });
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
