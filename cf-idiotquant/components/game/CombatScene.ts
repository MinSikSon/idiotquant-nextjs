import Phaser from "phaser";

// 가치투자 덱빌더 — 전투 씬(프로토타입 비주얼). 몬스터는 진짜 픽셀 격자(Graphics로 정사각형을
// 하나하나 찍는 방식)로 그린 귀여운 블롭 캐릭터. 유니코드 글자 기반 ASCII 아트는 폰트마다
// 모양이 달라지고 못생겨 보인다는 피드백을 받아 폐기하고, 격자 좌표만으로 매번 매끈한 타원
// 실루엣을 계산해 그리는 방식으로 바꿨다 — 조합이 아무리 랜덤해도 항상 매끈한 블롭이 보장됨.
// 판정 로직은 전혀 없음 — combatEngine이 계산한 결과를 받아 재생만 한다.

// 슬라임 실루엣 — 위쪽은 돔(타원 상반부), 적도(CY)부터 아래는 바닥으로 갈수록 폭이 점점
// 넓어지는 플레어(치마처럼 퍼짐)를 줘서 "바닥에 퍼져 앉은" 물웅덩이 느낌을 낸다. 맨 아랫줄만
// 살짝 좁혀 모서리를 둥글게.
const GRID = 18;
const CX = GRID / 2;
const RX = 5, RY = 5.5;
const CY = 7;            // 돔의 적도(가장 넓은 지점) — 여기부터 아래는 바닥까지 폭이 늘어남
const BODY_BOTTOM = 13;  // 바닥 줄(이 줄 아래는 없음)
const FLARE = 2.6;       // 적도 대비 바닥에서 추가로 퍼지는 폭(칸)

function inBody(col: number, row: number): boolean {
  if (row > BODY_BOTTOM) return false;
  const dx = col + 0.5 - CX;
  if (row <= CY) {
    const nx = dx / RX, ny = (row + 0.5 - CY) / RY;
    return nx * nx + ny * ny <= 1;
  }
  const t = (row - CY) / (BODY_BOTTOM - CY); // 0(적도) → 1(바닥)
  const flared = RX + t * FLARE;
  const maxRx = row >= BODY_BOTTOM ? flared - 1 : flared; // 맨 아랫줄만 살짝 좁혀 모서리를 둥글게
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

    // 광택 — 슬라임 특유의 물방울/젤리 느낌을 주는 밝은 하이라이트(왼쪽 위, 반투명)
    {
      const p = this.cellPx(CX - RX * 0.45, CY - RY * 0.55);
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

    // 눈 — 동그란 눈동자(가운데 정렬, 바깥쪽으로 안 쏠리게)에 작은 흰색 반짝임 점 하나만 —
    // 예전엔 흰자+동공이 바깥쪽으로 쏠려 있어 무섭다는 피드백을 받았음. 깜빡일 땐 얇은 곡선으로.
    for (const dir of [-1, 1]) {
      const ex = CX + dir * s.eyeGap;
      const p = this.cellPx(ex, CY - 0.5);
      const cxPx = p.x + this.cell / 2, cyPx = p.y + this.cell / 2;
      if (blink) {
        g.fillStyle(s.palette.outline, 1);
        g.fillRoundedRect(cxPx - this.cell * 0.65, cyPx - this.cell * 0.12, this.cell * 1.3, this.cell * 0.24, this.cell * 0.12);
      } else {
        g.fillStyle(0x1f2937, 1);
        g.fillCircle(cxPx, cyPx, this.cell * 0.85);
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(cxPx - this.cell * 0.28, cyPx - this.cell * 0.28, this.cell * 0.28);
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
