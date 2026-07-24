import Phaser from "phaser";

// 가치투자 덱빌더 — 전투 씬(프로토타입 비주얼). 몬스터는 진짜 픽셀 격자(Graphics로 정사각형을
// 하나하나 찍는 방식)로 그린 귀여운 블롭 캐릭터. 유니코드 글자 기반 ASCII 아트는 폰트마다
// 모양이 달라지고 못생겨 보인다는 피드백을 받아 폐기하고, 격자 좌표만으로 매번 매끈한 실루엣을
// 계산해 그리는 방식으로 바꿨다 — 조합이 아무리 랜덤해도 항상 매끈한 실루엣이 보장됨.
// 판정 로직은 전혀 없음 — combatEngine이 계산한 결과를 받아 재생만 한다.
const GRID = 18;
const CX = GRID / 2;
const CY = 7; // 그래픽스 좌표계 원점 기준 행(캔버스 세로 중앙에 맞추는 용도, 특정 종과 무관)

// 슬라임 — 돔(타원 상반부) + 정수리 뾰족점(고전 물방울형 슬라임 실루엣 관례 참고, 특정
// 캐릭터 디자인을 그대로 베끼지 않고 형태 관례만 차용), 적도부터 아래는 바닥으로 갈수록
// 폭이 점점 넓어지는 플레어(치마처럼 퍼짐)를 줘서 "바닥에 퍼져 앉은" 느낌을 낸다.
const SLIME_RX = 5, SLIME_RY = 5.5, SLIME_EQ = 7, SLIME_BOTTOM = 13, SLIME_FLARE = 2.6;
const SLIME_SPIKE_ROW_OFFSET = 1.5, SLIME_SPIKE_HALF_WIDTH = 0.6;
function slimeBody(col: number, row: number): boolean {
  if (row > SLIME_BOTTOM) return false;
  const dx = col + 0.5 - CX;
  if (row <= SLIME_EQ) {
    const ny = (row + 0.5 - SLIME_EQ) / SLIME_RY;
    const nx = dx / SLIME_RX;
    if (nx * nx + ny * ny <= 1) return true;
    // 정수리 뾰족점 — 돔 타원 바로 위 한 줄만, 중앙 두 칸 폭으로 살짝 튀어나오게
    const nyBelow = (row + SLIME_SPIKE_ROW_OFFSET - SLIME_EQ) / SLIME_RY;
    return nyBelow * nyBelow <= 1 && Math.abs(dx) <= SLIME_SPIKE_HALF_WIDTH;
  }
  const t = (row - SLIME_EQ) / (SLIME_BOTTOM - SLIME_EQ); // 0(적도) → 1(바닥)
  const flared = SLIME_RX + t * SLIME_FLARE;
  const maxRx = row >= SLIME_BOTTOM ? flared - 1 : flared; // 맨 아랫줄만 살짝 좁혀 모서리를 둥글게
  return Math.abs(dx) <= maxRx;
}

// 유령 — 둥근 정수리 돔 + 곧은 몸통 옆선 + 바닥의 물결치는 다리 3갈래(고전 유령 실루엣 관례).
const GHOST_TOP = 2, GHOST_EQ = 6, GHOST_RX = 4.5, GHOST_RY = 4, GHOST_LEGTOP = 13, GHOST_BOTTOM = 16;
const GHOST_LEG_OFFSETS = [-3, 0, 3];
function ghostBody(col: number, row: number): boolean {
  if (row < GHOST_TOP || row > GHOST_BOTTOM) return false;
  const dx = col + 0.5 - CX;
  if (row <= GHOST_EQ) {
    const nx = dx / GHOST_RX, ny = (row - GHOST_EQ) / GHOST_RY;
    return nx * nx + ny * ny <= 1;
  }
  if (row <= GHOST_LEGTOP) return Math.abs(dx) <= GHOST_RX;
  const t = (row - GHOST_LEGTOP) / (GHOST_BOTTOM - GHOST_LEGTOP); // 0(다리 시작) → 1(다리 끝)
  const legHalf = 1.4 - t * 1.1; // 갈래마다 아래로 갈수록 뾰족하게 좁아짐
  return GHOST_LEG_OFFSETS.some(off => Math.abs(dx - off) <= legHalf);
}

// 박쥐 — 작은 타원 머리 + 삼각형 귀 한 쌍 + 몸통 옆으로 퍼지는 삼각형 날개 한 쌍.
const BAT_HEAD_RX = 3, BAT_HEAD_RY = 3.2, BAT_HEAD_ROW = 8;
const BAT_EAR_TOP = 2, BAT_EAR_BOTTOM = 5;
const BAT_WING_TOP = 6, BAT_WING_MID = 9, BAT_WING_BOTTOM = 12, BAT_WING_REACH = 5, BAT_WING_ATTACH = 3;
function batBody(col: number, row: number): boolean {
  const dx = col + 0.5 - CX;
  const nx = dx / BAT_HEAD_RX, ny = (row - BAT_HEAD_ROW) / BAT_HEAD_RY;
  if (row >= BAT_EAR_TOP && nx * nx + ny * ny <= 1) return true;
  if (row >= BAT_EAR_TOP && row <= BAT_EAR_BOTTOM) {
    const t = (row - BAT_EAR_TOP) / (BAT_EAR_BOTTOM - BAT_EAR_TOP); // 0(귀 끝) → 1(머리와 만나는 지점)
    for (const earDx of [-1.6, 1.6]) {
      if (Math.abs(dx - earDx) <= 0.3 + t * 0.9) return true;
    }
  }
  if (row >= BAT_WING_TOP && row <= BAT_WING_BOTTOM) {
    const t = 1 - Math.abs(row - BAT_WING_MID) / (BAT_WING_MID - BAT_WING_TOP); // 중간 행에서 가장 넓게 퍼짐
    const reach = Math.max(0, t) * BAT_WING_REACH;
    if (dx <= -BAT_WING_ATTACH && dx >= -BAT_WING_ATTACH - reach) return true;
    if (dx >= BAT_WING_ATTACH && dx <= BAT_WING_ATTACH + reach) return true;
  }
  return false;
}

// 버섯 — 넓적한 갓(타원) + 그 아래로 뻗은 얇은 기둥.
const CAP_RX = 6.5, CAP_RY = 4, CAP_ROW = 6, CAP_TOP = 1, CAP_BOTTOM = 9;
const STEM_HALF = 1.5, STEM_TOP = 9, STEM_BOTTOM = 15;
function mushroomBody(col: number, row: number): boolean {
  const dx = col + 0.5 - CX;
  if (row >= CAP_TOP && row <= CAP_BOTTOM) {
    const nx = dx / CAP_RX, ny = (row - CAP_ROW) / CAP_RY;
    if (nx * nx + ny * ny <= 1) return true;
  }
  if (row > STEM_TOP && row <= STEM_BOTTOM) return Math.abs(dx) <= STEM_HALF;
  return false;
}

// 대기 애니메이션(숨쉬듯 눌렸다 펴지는 효과)용 공용 변형 — 아래 칸에서 당겨와 위쪽이 눌린
// 것처럼 보이게 하고(수직 압축), 좌우 이웃 칸과 합쳐서 눌린 만큼 옆으로 퍼지게(수평 팽창)
// 만든다. 종마다 따로 눌린 모양을 튜닝하지 않아도 어떤 실루엣이든 동일하게 적용됨.
function squish(col: number, row: number, base: (c: number, r: number) => boolean): boolean {
  const r = row + 1;
  return base(col, r) || base(col - 1, r) || base(col + 1, r);
}

type Palette = { body: number; outline: number; shine: number };
function lighten(hex: number, amt: number): number {
  const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
  const mix = (c: number) => Math.min(255, Math.round(c + (255 - c) * amt));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}
function makePalette(body: number, outline: number): Palette {
  return { body, outline, shine: lighten(body, 0.6) };
}
const BLUSH_COLOR = 0xfda4af; // 볼터치는 종과 무관하게 고정 분홍(몸 색과는 항상 대비됨)

// 종마다 색상군을 고정해서(슬라임=초록, 유령=창백한 한색, 박쥐=어두운 보라, 버섯=따뜻한
// 원색) 같은 종끼리는 늘 닮아 보이면서도 색조는 다양하게 섞이도록 함.
const SLIME_PALETTES: Palette[] = [
  makePalette(0x4ade80, 0x15803d), // 에메랄드
  makePalette(0x34d399, 0x047857), // 민트
  makePalette(0xa3e635, 0x4d7c0f), // 라임
  makePalette(0x22c55e, 0x14532d), // 포레스트
  makePalette(0x6ee7b7, 0x0f766e), // 시폼
  makePalette(0x84cc16, 0x3f6212), // 올리브
];
const GHOST_PALETTES: Palette[] = [
  makePalette(0xf1f5f9, 0x94a3b8), // 슬레이트 화이트
  makePalette(0xe0e7ff, 0x818cf8), // 라벤더
  makePalette(0xdbeafe, 0x60a5fa), // 스카이 화이트
  makePalette(0xfae8ff, 0xd8b4fe), // 연보라
];
const BAT_PALETTES: Palette[] = [
  makePalette(0x6d28d9, 0x3b0764), // 퍼플
  makePalette(0x4c1d95, 0x2e1065), // 인디고
  makePalette(0x581c87, 0x3b0764), // 플럼
  makePalette(0x312e81, 0x1e1b4b), // 미드나잇
];
const MUSHROOM_PALETTES: Palette[] = [
  makePalette(0xef4444, 0x991b1b), // 레드캡
  makePalette(0xf97316, 0xc2410c), // 오렌지캡
  makePalette(0xa16207, 0x713f12), // 브라운캡
  makePalette(0xeab308, 0x854d0e), // 옐로캡
];

type SpeciesDef = {
  inBody: (col: number, row: number) => boolean;
  eyeRow: number; // 눈 중심 행(종마다 실루엣이 달라 얼굴 위치도 따로 지정)
  mouthRow: number;
  eyeGapOptions: number[]; // 종 너비에 맞는 눈 사이 간격 후보
  palettes: Palette[];
};
const SPECIES: SpeciesDef[] = [
  { inBody: slimeBody, eyeRow: SLIME_EQ - 0.5, mouthRow: SLIME_EQ + 2, eyeGapOptions: [2, 3], palettes: SLIME_PALETTES },
  { inBody: ghostBody, eyeRow: 8, mouthRow: 10, eyeGapOptions: [2], palettes: GHOST_PALETTES },
  { inBody: batBody, eyeRow: 7, mouthRow: 9, eyeGapOptions: [1], palettes: BAT_PALETTES },
  { inBody: mushroomBody, eyeRow: 8, mouthRow: 9, eyeGapOptions: [2, 3], palettes: MUSHROOM_PALETTES },
];

type MouthKind = "smile" | "o" | "none";
type MonsterSpec = { species: SpeciesDef; palette: Palette; eyeGap: number; mouth: MouthKind; hasBlush: boolean };
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
function randomMonster(): MonsterSpec {
  const species = pick(SPECIES);
  return {
    species,
    palette: pick(species.palettes),
    eyeGap: pick(species.eyeGapOptions),
    mouth: pick(["smile", "smile", "o", "none"]),
    hasBlush: Math.random() < 0.5,
  };
}

// 내 캐릭터 뒷모습 실루엣 — 몬스터와 같은 절차적 픽셀 그리드 방식(둥근 머리 + 사다리꼴 등판 +
// 다리 두 갈래), 얼굴이 안 보이는 뒷모습이라 눈/입/볼터치 없이 형태만. "전사" 톤(가죽 갑옷 톤).
const PLAYER_HEAD_RX = 2.3, PLAYER_HEAD_RY = 2.1, PLAYER_HEAD_ROW = 3;
const PLAYER_TORSO_TOP = 5, PLAYER_TORSO_BOTTOM = 12, PLAYER_TORSO_TOP_HALF = 3.2, PLAYER_TORSO_BOTTOM_HALF = 4.4;
const PLAYER_LEG_BOTTOM = 17, PLAYER_LEG_HALF = 1.5, PLAYER_LEG_OFFSET = 2.1;
function playerBody(col: number, row: number): boolean {
  const dx = col + 0.5 - CX;
  if (row <= PLAYER_HEAD_ROW + PLAYER_HEAD_RY) {
    const nx = dx / PLAYER_HEAD_RX, ny = (row - PLAYER_HEAD_ROW) / PLAYER_HEAD_RY;
    if (nx * nx + ny * ny <= 1) return true;
  }
  if (row >= PLAYER_TORSO_TOP && row <= PLAYER_TORSO_BOTTOM) {
    const t = (row - PLAYER_TORSO_TOP) / (PLAYER_TORSO_BOTTOM - PLAYER_TORSO_TOP);
    const half = PLAYER_TORSO_TOP_HALF + t * (PLAYER_TORSO_BOTTOM_HALF - PLAYER_TORSO_TOP_HALF);
    if (Math.abs(dx) <= half) return true;
  }
  if (row > PLAYER_TORSO_BOTTOM && row <= PLAYER_LEG_BOTTOM) {
    if (Math.abs(dx - PLAYER_LEG_OFFSET) <= PLAYER_LEG_HALF || Math.abs(dx + PLAYER_LEG_OFFSET) <= PLAYER_LEG_HALF) return true;
  }
  return false;
}
const PLAYER_PALETTE = makePalette(0xb45309, 0x431407); // 가죽 갑옷 톤(호박빛 브라운)

// Phaser의 Text는 자체 해상도(resolution)로 텍스처를 굽는데 기본값 1이라 고밀도(레티나)
// 모바일 화면에서 흐릿하게 보임 — devicePixelRatio만큼 올려서 선명하게 그린다(과도한 메모리
// 사용 방지로 최대 3배로 제한).
const RES = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;

const HP_BAR_H = 8;

// 포켓몬 클래식 대각선 배치 — 적(정면)은 우상단 스프라이트 + 좌상단 정보(이름+HP바), 내
// 캐릭터(뒷모습)는 좌하단 스프라이트 + 우상단이 아닌 우하단 정보. 서로 반대편 코너에 정보를
// 둬서 시선이 대각선으로 교차하게 배치하는 포켓몬 시리즈의 전통적인 배틀 화면 구도.
export default class CombatScene extends Phaser.Scene {
  private enemyGfx!: Phaser.GameObjects.Graphics;
  private enemyLabel!: Phaser.GameObjects.Text;
  private enemyHpGfx!: Phaser.GameObjects.Graphics;
  private enemyHpNumText!: Phaser.GameObjects.Text;
  private enemyCenterX = 0; private enemyCenterY = 0;
  private enemyHpBarX = 0; private enemyHpBarY = 0; private enemyHpBarW = 0;

  private playerGfx!: Phaser.GameObjects.Graphics;
  private playerLabel!: Phaser.GameObjects.Text;
  private playerHpGfx!: Phaser.GameObjects.Graphics;
  private playerHpNumText!: Phaser.GameObjects.Text;
  private playerCenterX = 0; private playerCenterY = 0;
  private playerHpBarX = 0; private playerHpBarY = 0; private playerHpBarW = 0;

  private introText!: Phaser.GameObjects.Text;
  private spec!: MonsterSpec;
  private cell = 8; // 격자 한 칸의 화면 픽셀 크기(씬 크기에 맞춰 create에서 재계산)
  private blinking = false;
  private squished = false;

  constructor() { super("combat"); }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.cameras.main.setBackgroundColor("#00000000");
    this.cell = Math.max(3, Math.floor(Math.min(w * 0.36, h * 0.34) / GRID));

    // 적 — 우상단 스프라이트 + 좌상단 정보
    this.enemyCenterX = w * 0.74; this.enemyCenterY = h * 0.30;
    this.enemyLabel = this.add.text(w * 0.05, h * 0.04, "", { fontSize: "12px", color: "#ffffff", fontStyle: "bold", resolution: RES }).setOrigin(0, 0);
    this.enemyHpBarX = w * 0.05; this.enemyHpBarY = h * 0.12; this.enemyHpBarW = w * 0.36;
    this.enemyHpGfx = this.add.graphics();
    this.enemyHpNumText = this.add.text(this.enemyHpBarX + this.enemyHpBarW / 2, this.enemyHpBarY + HP_BAR_H / 2, "", { fontFamily: "monospace", fontSize: "9px", color: "#ffffff", fontStyle: "bold", resolution: RES }).setOrigin(0.5);
    this.spec = randomMonster();
    this.enemyGfx = this.add.graphics({ x: this.enemyCenterX, y: this.enemyCenterY });
    this.drawMonster();
    this.setEnemyHp(0, 1);

    // 나 — 좌하단 스프라이트(전투 내내 고정, 몬스터처럼 매 전투 재생성하지 않음) + 우하단 정보
    this.playerCenterX = w * 0.26; this.playerCenterY = h * 0.72;
    this.playerGfx = this.add.graphics({ x: this.playerCenterX, y: this.playerCenterY });
    this.drawPlayer();
    this.playerHpBarW = w * 0.36; this.playerHpBarX = w * 0.95 - this.playerHpBarW; this.playerHpBarY = h * 0.86;
    this.playerLabel = this.add.text(w * 0.95, this.playerHpBarY - 4, "", { fontSize: "12px", color: "#ffffff", fontStyle: "bold", resolution: RES }).setOrigin(1, 1);
    this.playerHpGfx = this.add.graphics();
    this.playerHpNumText = this.add.text(this.playerHpBarX + this.playerHpBarW / 2, this.playerHpBarY + HP_BAR_H / 2, "", { fontFamily: "monospace", fontSize: "9px", color: "#ffffff", fontStyle: "bold", resolution: RES }).setOrigin(0.5);
    this.setPlayerHp(0, 1);

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
    const species = s.species;
    const basePred = species.inBody;
    const pred = this.squished ? (c: number, r: number) => squish(c, r, basePred) : basePred;
    g.clear();

    // 몸통 판정을 칸마다 한 번만 계산해 캐시해두고(테두리 판정에서 이웃 4칸 재조회 시 재사용),
    // inBody() 중복 호출을 줄인다.
    const body: boolean[][] = [];
    for (let row = 0; row < GRID; row++) {
      body[row] = [];
      for (let col = 0; col < GRID; col++) body[row][col] = pred(col, row);
    }
    const isBody = (col: number, row: number) => body[row]?.[col] ?? false;

    // 몸통 — 칸마다 실루엣 안쪽인지 검사해 채우고, 바로 바깥 칸이 하나라도 비어 있으면 외곽선색으로.
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        if (!isBody(col, row)) continue;
        const edge = !isBody(col + 1, row) || !isBody(col - 1, row) || !isBody(col, row + 1) || !isBody(col, row - 1);
        const { x, y } = this.cellPx(col, row);
        g.fillStyle(edge ? s.palette.outline : s.palette.body, 1);
        g.fillRect(x, y, this.cell + 1, this.cell + 1); // +1로 인접 칸 사이 미세한 틈(seam) 방지
      }
    }

    // 광택 — 젤리/매끈한 표면 느낌을 주는 밝은 하이라이트(눈 위쪽, 반투명)
    {
      const p = this.cellPx(CX - 3, species.eyeRow - 2);
      g.fillStyle(s.palette.shine, 0.7);
      g.fillEllipse(p.x, p.y, this.cell * 2.2, this.cell * 1.4);
    }

    // 볼터치
    if (s.hasBlush) {
      g.fillStyle(BLUSH_COLOR, 0.85);
      for (const dir of [-1, 1]) {
        const p = this.cellPx(CX + dir * (s.eyeGap + 1.8), species.eyeRow + 1.5);
        g.fillCircle(p.x + this.cell / 2, p.y + this.cell / 2, this.cell * 0.75);
      }
    }

    // 눈 — 흰자 없이 동그란 눈동자 하나만 콕 찍어서 "하찮고 멍한" 인상을 줌. 눈동자는 좌우
    // 대칭 중앙에 고정 — 예전에 바깥쪽으로 쏠려 무섭다는 피드백을 받았던 것과 같은 실수를
    // 반복하지 않기 위함. 깜빡일 땐 얇은 곡선으로.
    for (const dir of [-1, 1]) {
      const ex = CX + dir * s.eyeGap;
      const p = this.cellPx(ex, species.eyeRow);
      const cxPx = p.x + this.cell / 2, cyPx = p.y + this.cell / 2;
      if (this.blinking) {
        g.fillStyle(s.palette.outline, 1);
        g.fillRoundedRect(cxPx - this.cell * 0.7, cyPx - this.cell * 0.12, this.cell * 1.4, this.cell * 0.24, this.cell * 0.12);
      } else {
        g.fillStyle(0x1f2937, 1);
        g.fillCircle(cxPx, cyPx + this.cell * 0.15, this.cell * 0.42);
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(cxPx - this.cell * 0.12, cyPx - this.cell * 0.02, this.cell * 0.12);
      }
    }

    // 입
    if (s.mouth !== "none") {
      const p = this.cellPx(CX, species.mouthRow);
      g.fillStyle(s.palette.outline, 1);
      if (s.mouth === "smile") g.fillRoundedRect(p.x - this.cell, p.y, this.cell * 2, this.cell * 0.4, this.cell * 0.2);
      else g.fillCircle(p.x + this.cell / 2, p.y, this.cell * 0.4);
    }
  }

  // 등판 갑옷 광택 하이라이트만 있을 뿐 눈/입은 없음(뒷모습이라 얼굴이 안 보임). 몬스터와 달리
  // 전투 내내 같은 모양을 유지하므로 idle 애니메이션(숨쉬기/깜빡임) 대상에서도 제외.
  private drawPlayer() {
    const g = this.playerGfx;
    g.clear();
    const body: boolean[][] = [];
    for (let row = 0; row < GRID; row++) {
      body[row] = [];
      for (let col = 0; col < GRID; col++) body[row][col] = playerBody(col, row);
    }
    const isBody = (col: number, row: number) => body[row]?.[col] ?? false;
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        if (!isBody(col, row)) continue;
        const edge = !isBody(col + 1, row) || !isBody(col - 1, row) || !isBody(col, row + 1) || !isBody(col, row - 1);
        const { x, y } = this.cellPx(col, row);
        g.fillStyle(edge ? PLAYER_PALETTE.outline : PLAYER_PALETTE.body, 1);
        g.fillRect(x, y, this.cell + 1, this.cell + 1);
      }
    }
    const p = this.cellPx(CX, PLAYER_TORSO_TOP + 1);
    g.fillStyle(PLAYER_PALETTE.shine, 0.5);
    g.fillEllipse(p.x, p.y, this.cell * 3.4, this.cell * 1.3);
  }

  private drawHpBar(gfx: Phaser.GameObjects.Graphics, numText: Phaser.GameObjects.Text, x: number, y: number, w: number, hp: number, maxHp: number) {
    const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    const color = pct > 0.5 ? 0x16a34a : pct > 0.2 ? 0xf59e0b : 0xf43f5e;
    gfx.clear();
    gfx.fillStyle(0x000000, 0.35);
    gfx.fillRoundedRect(x, y, w, HP_BAR_H, HP_BAR_H / 2);
    const fillW = Math.min(w, Math.max(pct > 0 ? HP_BAR_H : 0, w * pct));
    if (fillW > 0) {
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(x, y, fillW, HP_BAR_H, HP_BAR_H / 2);
    }
    numText.setText(`${Math.max(0, Math.round(hp))}/${Math.round(maxHp)}`);
  }

  // 정예/보스는 상시 배지를 라벨에 붙여 등장 인트로가 사라진 뒤에도 계속 구분되게 함.
  setEnemy(name: string, hp: number, maxHp: number, encounter: "battle" | "boss" | "elite" = "battle") {
    const prefix = encounter === "boss" ? "👑 보스 · " : encounter === "elite" ? "🗡️ 정예 · " : "";
    const color = encounter === "boss" ? "#facc15" : encounter === "elite" ? "#c084fc" : "#ffffff";
    this.enemyLabel.setText(prefix + name).setColor(color);
    this.spec = randomMonster();
    this.blinking = false;
    this.squished = false;
    this.drawMonster();
    this.setEnemyHp(hp, maxHp);
  }

  setEnemyHp(hp: number, maxHp: number) {
    this.drawHpBar(this.enemyHpGfx, this.enemyHpNumText, this.enemyHpBarX, this.enemyHpBarY, this.enemyHpBarW, hp, maxHp);
  }

  setPlayerName(name: string) {
    this.playerLabel.setText(name);
  }

  setPlayerHp(hp: number, maxHp: number) {
    this.drawHpBar(this.playerHpGfx, this.playerHpNumText, this.playerHpBarX, this.playerHpBarY, this.playerHpBarW, hp, maxHp);
  }

  // 살아있는 느낌을 주는 대기 애니메이션 — 위치를 옮기는 트윈 대신 몇 개 픽셀만 주기적으로
  // 바꿔서 숨쉬듯 눌렸다 펴지는 느낌을 낸다 + 몇 초마다 눈을 잠깐 감는 깜빡임. 둘 다 판정과
  // 무관한 순수 장식 타이머.
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
    this.popText(this.enemyCenterX, this.enemyCenterY - this.cell * CY * 0.6, `-${damage}`, "#f87171");
  }

  flashPlayerBlock(amount: number) {
    this.popText(this.playerCenterX, this.playerCenterY - this.cell * CY * 0.6, `+${amount} 🛡️`, "#60a5fa");
  }

  flashPlayerHit(damage: number) {
    if (damage <= 0) return;
    this.cameras.main.shake(150, 0.006);
    this.popText(this.playerCenterX, this.playerCenterY - this.cell * CY * 0.6, `-${damage}`, "#f87171");
  }

  playHeal(amount: number) {
    this.popText(this.playerCenterX, this.playerCenterY - this.cell * CY * 0.6, `+${amount} ❤️`, "#4ade80");
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
