import Phaser from "phaser";
import { biomeForFloor, biomeIndexForFloor, type BiomeDef } from "./biomes";

// 가치투자 덱빌더 — 전투 씬. 포켓로그류 배틀 화면을 목표로 한 풀 렌더링:
//  · 바이옴 배경(5층마다 초원→숲→사막→설원→동굴→화산 순환, biomes.ts) + 환경 파티클
//  · 포켓몬식 전투 플랫폼(타원 받침) 위 대각선 구도(적=우상단, 나=좌하단)
//  · 크림색 정보 패널(이름/Lv/HP바/상태이상 배지) — 어떤 바이옴 위에서도 항상 읽힘
//  · HP바는 실제 값으로 즉시 꺾이지 않고 트윈으로 부드럽게 감소(포켓몬 특유의 "쭉 빠지는" 바)
//  · 등장 슬라이드/공격 돌진+투사체/피격 플래시/기절 낙하 애니메이션, 타격 파티클
// 몬스터는 절차 생성 픽셀 격자 아트(격자 좌표 판정 함수로 실루엣 계산 — 어떤 조합이든 매끈함).
// 판정 로직은 전혀 없음 — combatEngine이 계산한 결과를 받아 재생만 한다.
const GRID = 18;
const CX = GRID / 2;
const CY = 7; // 그래픽스 좌표계 원점 기준 행(캔버스 세로 중앙에 맞추는 용도, 특정 종과 무관)

// 슬라임 — 돔(타원 상반부) + 정수리 뾰족점, 적도 아래는 바닥으로 갈수록 퍼지는 플레어.
const SLIME_RX = 5, SLIME_RY = 5.5, SLIME_EQ = 7, SLIME_BOTTOM = 13, SLIME_FLARE = 2.6;
const SLIME_SPIKE_ROW_OFFSET = 1.5, SLIME_SPIKE_HALF_WIDTH = 0.6;
function slimeBody(col: number, row: number): boolean {
  if (row > SLIME_BOTTOM) return false;
  const dx = col + 0.5 - CX;
  if (row <= SLIME_EQ) {
    const ny = (row + 0.5 - SLIME_EQ) / SLIME_RY;
    const nx = dx / SLIME_RX;
    if (nx * nx + ny * ny <= 1) return true;
    const nyBelow = (row + SLIME_SPIKE_ROW_OFFSET - SLIME_EQ) / SLIME_RY;
    return nyBelow * nyBelow <= 1 && Math.abs(dx) <= SLIME_SPIKE_HALF_WIDTH;
  }
  const t = (row - SLIME_EQ) / (SLIME_BOTTOM - SLIME_EQ);
  const flared = SLIME_RX + t * SLIME_FLARE;
  const maxRx = row >= SLIME_BOTTOM ? flared - 1 : flared;
  return Math.abs(dx) <= maxRx;
}

// 유령 — 둥근 정수리 돔 + 곧은 몸통 옆선 + 바닥의 물결치는 다리 3갈래.
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
  const t = (row - GHOST_LEGTOP) / (GHOST_BOTTOM - GHOST_LEGTOP);
  const legHalf = 1.4 - t * 1.1;
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
    const t = (row - BAT_EAR_TOP) / (BAT_EAR_BOTTOM - BAT_EAR_TOP);
    for (const earDx of [-1.6, 1.6]) {
      if (Math.abs(dx - earDx) <= 0.3 + t * 0.9) return true;
    }
  }
  if (row >= BAT_WING_TOP && row <= BAT_WING_BOTTOM) {
    const t = 1 - Math.abs(row - BAT_WING_MID) / (BAT_WING_MID - BAT_WING_TOP);
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

// 골렘 — 위아래 모서리가 좁아지는 바위 몸통 + 양옆 팔 덩어리(동굴/화산 바이옴에 어울리는 종).
const GOLEM_TOP = 3, GOLEM_BOTTOM = 14, GOLEM_WIDE = 5.2, GOLEM_NARROW = 4;
function golemBody(col: number, row: number): boolean {
  const dx = col + 0.5 - CX;
  if (row >= GOLEM_TOP && row <= GOLEM_BOTTOM) {
    const half = (row < GOLEM_TOP + 2 || row > GOLEM_BOTTOM - 2) ? GOLEM_NARROW : GOLEM_WIDE;
    if (Math.abs(dx) <= half) return true;
  }
  if (row >= 7 && row <= 11 && Math.abs(dx) >= GOLEM_WIDE && Math.abs(dx) <= GOLEM_WIDE + 1.8) return true;
  return false;
}

// 새 — 작은 머리 + 부리 + 통통한 몸통 + 좌우 날개(부리가 있어 입은 안 그림 — mouthNone).
function birdBody(col: number, row: number): boolean {
  const dx = col + 0.5 - CX;
  { const nx = dx / 3, ny = (row - 4) / 2.8; if (nx * nx + ny * ny <= 1) return true; }
  if (row >= 6 && row <= 7 && Math.abs(dx) <= 1.4 - (row - 6) * 0.8) return true;
  { const nx = dx / 4.6, ny = (row - 11) / 3.6; if (nx * nx + ny * ny <= 1) return true; }
  if (row >= 9 && row <= 13) {
    const t = 1 - Math.abs(row - 11) / 2.5;
    const reach = Math.max(0, t) * 2.2;
    if (Math.abs(dx) >= 4.4 && Math.abs(dx) <= 4.4 + reach) return true;
  }
  return false;
}

// 대기 애니메이션(숨쉬듯 눌렸다 펴지는 효과)용 공용 변형.
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
const BLUSH_COLOR = 0xfda4af;

// 종마다 색상군 고정 — 같은 종끼리는 늘 닮아 보이면서 색조는 다양하게.
const SLIME_PALETTES: Palette[] = [
  makePalette(0x4ade80, 0x15803d), makePalette(0x34d399, 0x047857), makePalette(0xa3e635, 0x4d7c0f),
  makePalette(0x22c55e, 0x14532d), makePalette(0x6ee7b7, 0x0f766e), makePalette(0x84cc16, 0x3f6212),
];
const GHOST_PALETTES: Palette[] = [
  makePalette(0xcbd5e1, 0x64748b), makePalette(0xa5b4fc, 0x6366f1),
  makePalette(0x93c5fd, 0x3b82f6), makePalette(0xe9d5ff, 0xc084fc),
];
const BAT_PALETTES: Palette[] = [
  makePalette(0x6d28d9, 0x3b0764), makePalette(0x4c1d95, 0x2e1065),
  makePalette(0x581c87, 0x3b0764), makePalette(0x312e81, 0x1e1b4b),
];
const MUSHROOM_PALETTES: Palette[] = [
  makePalette(0xef4444, 0x991b1b), makePalette(0xf97316, 0xc2410c),
  makePalette(0xa16207, 0x713f12), makePalette(0xeab308, 0x854d0e),
];
const GOLEM_PALETTES: Palette[] = [
  makePalette(0x9ca3af, 0x4b5563), makePalette(0xa8a29e, 0x57534e),
  makePalette(0x94a3b8, 0x475569), makePalette(0xa3a3a3, 0x525252),
];
const BIRD_PALETTES: Palette[] = [
  makePalette(0xf87171, 0x991b1b), makePalette(0x60a5fa, 0x1d4ed8),
  makePalette(0xfacc15, 0xa16207), makePalette(0x5eead4, 0x0f766e),
];

type SpeciesDef = {
  inBody: (col: number, row: number) => boolean;
  eyeRow: number;
  mouthRow: number;
  eyeGapOptions: number[];
  palettes: Palette[];
  mouthNone?: boolean; // 부리처럼 실루엣에 입이 포함된 종은 입을 따로 안 그림
};
const SPECIES: SpeciesDef[] = [
  { inBody: slimeBody, eyeRow: SLIME_EQ - 0.5, mouthRow: SLIME_EQ + 2, eyeGapOptions: [2, 3], palettes: SLIME_PALETTES },
  { inBody: ghostBody, eyeRow: 8, mouthRow: 10, eyeGapOptions: [2], palettes: GHOST_PALETTES },
  { inBody: batBody, eyeRow: 7, mouthRow: 9, eyeGapOptions: [1], palettes: BAT_PALETTES },
  { inBody: mushroomBody, eyeRow: 8, mouthRow: 9, eyeGapOptions: [2, 3], palettes: MUSHROOM_PALETTES },
  { inBody: golemBody, eyeRow: 7, mouthRow: 10, eyeGapOptions: [2, 3], palettes: GOLEM_PALETTES },
  { inBody: birdBody, eyeRow: 3.5, mouthRow: 6, eyeGapOptions: [1, 2], palettes: BIRD_PALETTES, mouthNone: true },
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
    mouth: species.mouthNone ? "none" : pick(["smile", "smile", "o", "none"]),
    hasBlush: Math.random() < 0.5,
  };
}

// 내 캐릭터 뒷모습 실루엣 — 둥근 머리 + 사다리꼴 등판 + 다리 두 갈래(가죽 갑옷 톤).
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
const PLAYER_PALETTE = makePalette(0xb45309, 0x431407);
// 육성(레벨)에 따른 실루엣 배율 — Lv1 0.72에서 시작해 레벨마다 커지고 상한에서 멈춤.
const LEVEL_SCALE_BASE = 0.72;
const LEVEL_SCALE_PER_LEVEL = 0.07;
const LEVEL_SCALE_MAX = 1.6;
function levelToScale(level: number): number {
  return Math.min(LEVEL_SCALE_MAX, LEVEL_SCALE_BASE + (level - 1) * LEVEL_SCALE_PER_LEVEL);
}

// Phaser Text의 텍스처 해상도 — 레티나 대응(최대 3배).
const RES = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;

const HP_BAR_H = 8;
const PANEL_H = 40;
export type SceneStatusKind = "burn" | "poison" | "paralysis";
const STATUS_CHIP: Record<SceneStatusKind, { label: string; bg: string }> = {
  burn: { label: "화상", bg: "#f97316" },
  poison: { label: "독", bg: "#a855f7" },
  paralysis: { label: "마비", bg: "#eab308" },
};

export default class CombatScene extends Phaser.Scene {
  // 배경/환경
  private bgGfx!: Phaser.GameObjects.Graphics;
  private ambient: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private biomeIdx = -1;

  // 적 — 우상단 스프라이트 + 좌상단 정보 패널
  private enemyGfx!: Phaser.GameObjects.Graphics;
  private enemyLabel!: Phaser.GameObjects.Text;
  private enemyLvText!: Phaser.GameObjects.Text;
  private enemyHpGfx!: Phaser.GameObjects.Graphics;
  private enemyHpNumText!: Phaser.GameObjects.Text;
  private enemyStatusChip!: Phaser.GameObjects.Text;
  private enemyPanelGfx!: Phaser.GameObjects.Graphics;
  private enemyInfoBox!: Phaser.GameObjects.Container;
  private enemyCenterX = 0; private enemyCenterY = 0;
  private enemyHpBarX = 0; private enemyHpBarY = 0; private enemyHpBarW = 0;
  private shownEnemyHp = { v: 0 }; private enemyMaxHpShown = 1;

  // 나 — 좌하단 스프라이트 + 우하단 정보 패널
  private playerGfx!: Phaser.GameObjects.Graphics;
  private playerLabel!: Phaser.GameObjects.Text;
  private playerLvText!: Phaser.GameObjects.Text;
  private playerHpGfx!: Phaser.GameObjects.Graphics;
  private playerHpNumText!: Phaser.GameObjects.Text;
  private playerStatusChip!: Phaser.GameObjects.Text;
  private playerCenterX = 0; private playerCenterY = 0;
  private playerHpBarX = 0; private playerHpBarY = 0; private playerHpBarW = 0;
  private shownPlayerHp = { v: 0 }; private playerMaxHpShown = 1;
  private playerLevel: number | null = null;

  private introText!: Phaser.GameObjects.Text;
  private spec!: MonsterSpec;
  private cell = 8;
  private blinking = false;
  private squished = false;

  constructor() { super("combat"); }

  create() {
    const w = this.scale.width, h = this.scale.height;
    this.cell = Math.max(3, Math.floor(Math.min(w * 0.36, h * 0.34) / GRID));

    // 파티클용 흰 원 텍스처(런타임 생성 — 외부 에셋 없음). tint로 색을 입혀 재사용.
    if (!this.textures.exists("dot")) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(3, 3, 3);
      g.generateTexture("dot", 6, 6);
      g.destroy();
    }

    this.bgGfx = this.add.graphics().setDepth(-10);
    this.enemyCenterX = w * 0.72; this.enemyCenterY = h * 0.34;
    this.playerCenterX = w * 0.26; this.playerCenterY = h * 0.66;
    this.drawBackground(biomeForFloor(0));
    this.biomeIdx = 0;
    this.startAmbient(biomeForFloor(0));

    // ---- 적 정보 패널(좌상단) — 크림 박스 위 이름/Lv/HP바/상태 배지 ----
    const panelX = w * 0.03, panelY = h * 0.03, panelW = w * 0.46;
    this.enemyPanelGfx = this.add.graphics().setDepth(5);
    this.drawPanel(this.enemyPanelGfx, panelX, panelY, panelW, PANEL_H);
    this.enemyLabel = this.add.text(panelX + 8, panelY + 5, "", { fontSize: "11px", color: "#1f2937", fontStyle: "bold", resolution: RES }).setOrigin(0, 0).setDepth(6);
    this.enemyLvText = this.add.text(panelX + panelW - 8, panelY + 5, "", { fontSize: "9px", color: "#78716c", fontStyle: "bold", resolution: RES }).setOrigin(1, 0).setDepth(6);
    this.enemyHpBarX = panelX + 8; this.enemyHpBarY = panelY + PANEL_H - 14; this.enemyHpBarW = panelW - 46;
    this.enemyHpGfx = this.add.graphics().setDepth(6);
    this.enemyHpNumText = this.add.text(panelX + panelW - 8, this.enemyHpBarY + HP_BAR_H / 2, "", { fontFamily: "monospace", fontSize: "9px", color: "#44403c", fontStyle: "bold", resolution: RES }).setOrigin(1, 0.5).setDepth(6);
    this.enemyStatusChip = this.add.text(panelX + panelW - 8, panelY + 5, "", { fontSize: "8px", color: "#ffffff", fontStyle: "bold", resolution: RES, padding: { x: 4, y: 2 } }).setOrigin(1, 0).setDepth(7).setVisible(false);
    this.enemyInfoBox = this.add.container(0, 0, [this.enemyPanelGfx, this.enemyLabel, this.enemyLvText, this.enemyHpGfx, this.enemyHpNumText, this.enemyStatusChip]).setDepth(5);

    this.spec = randomMonster();
    this.enemyGfx = this.add.graphics({ x: this.enemyCenterX, y: this.enemyCenterY }).setDepth(2);
    this.drawMonster();
    this.shownEnemyHp.v = 0; this.enemyMaxHpShown = 1;
    this.redrawEnemyHpBar();

    // ---- 내 정보 패널(우하단) ----
    const pPanelW = w * 0.46, pPanelX = w * 0.97 - pPanelW, pPanelY = h * 0.97 - PANEL_H;
    const playerPanelGfx = this.add.graphics().setDepth(5);
    this.drawPanel(playerPanelGfx, pPanelX, pPanelY, pPanelW, PANEL_H);
    this.playerLabel = this.add.text(pPanelX + 8, pPanelY + 5, "", { fontSize: "11px", color: "#1f2937", fontStyle: "bold", resolution: RES }).setOrigin(0, 0).setDepth(6);
    this.playerLvText = this.add.text(pPanelX + pPanelW - 8, pPanelY + 5, "", { fontSize: "9px", color: "#78716c", fontStyle: "bold", resolution: RES }).setOrigin(1, 0).setDepth(6);
    this.playerHpBarX = pPanelX + 8; this.playerHpBarY = pPanelY + PANEL_H - 14; this.playerHpBarW = pPanelW - 46;
    this.playerHpGfx = this.add.graphics().setDepth(6);
    this.playerHpNumText = this.add.text(pPanelX + pPanelW - 8, this.playerHpBarY + HP_BAR_H / 2, "", { fontFamily: "monospace", fontSize: "9px", color: "#44403c", fontStyle: "bold", resolution: RES }).setOrigin(1, 0.5).setDepth(6);
    this.playerStatusChip = this.add.text(pPanelX + 8, pPanelY + 5, "", { fontSize: "8px", color: "#ffffff", fontStyle: "bold", resolution: RES, padding: { x: 4, y: 2 } }).setOrigin(0, 0).setDepth(7).setVisible(false);
    // 이름이 상태 배지와 겹치지 않게, 배지가 켜지면 이름을 오른쪽으로 살짝 밀어준다(setPlayerStatus).

    this.playerGfx = this.add.graphics({ x: this.playerCenterX, y: this.playerCenterY }).setDepth(2);
    this.drawPlayer();
    this.shownPlayerHp.v = 0; this.playerMaxHpShown = 1;
    this.redrawPlayerHpBar();

    this.introText = this.add.text(w / 2, h * 0.46, "", {
      fontSize: "15px", color: "#ffffff", fontStyle: "bold", resolution: RES,
      backgroundColor: "rgba(15,23,42,0.78)", padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this.startIdleAnim();
  }

  // ---------- 배경(바이옴) ----------

  // 층수 → 바이옴. 바이옴이 실제로 바뀔 때만 배경을 다시 그리고 환경 파티클을 갈아끼운다.
  setFloor(floor: number) {
    const idx = biomeIndexForFloor(floor);
    if (idx === this.biomeIdx) return;
    this.biomeIdx = idx;
    const biome = biomeForFloor(floor);
    this.drawBackground(biome);
    this.startAmbient(biome);
    this.cameras.main.flash(260, 255, 255, 255); // 장면 전환 플래시 — 바이옴이 바뀌었음을 알림
  }

  private drawBackground(biome: BiomeDef) {
    const w = this.scale.width, h = this.scale.height;
    const horizonY = h * 0.42;
    const g = this.bgGfx;
    g.clear();

    // 하늘 — 위→아래 그라데이션
    g.fillGradientStyle(biome.skyTop, biome.skyTop, biome.skyBottom, biome.skyBottom, 1);
    g.fillRect(0, 0, w, horizonY + 6);
    // 지면
    g.fillGradientStyle(biome.ground, biome.ground, biome.groundDark, biome.groundDark, 1);
    g.fillRect(0, horizonY, w, h - horizonY);

    // 바이옴별 원경 장식 — 전부 단순 도형의 절차 드로잉(외부 에셋 없음)
    const deco = biome.id;
    if (deco === "grassland") {
      g.fillStyle(biome.groundDark, 0.55);
      g.fillEllipse(w * 0.2, horizonY, w * 0.5, h * 0.12);
      g.fillEllipse(w * 0.75, horizonY, w * 0.6, h * 0.16);
      g.fillStyle(0x16a34a, 0.5);
      for (let i = 0; i < 7; i++) {
        const x = (i + 0.5) * (w / 7), y = horizonY + 10 + (i % 3) * 8;
        g.fillTriangle(x - 3, y + 6, x + 3, y + 6, x, y - 4);
      }
    } else if (deco === "forest") {
      for (let i = 0; i < 6; i++) {
        const x = (i + 0.5) * (w / 6), th = h * (0.14 + (i % 2) * 0.05);
        g.fillStyle(0x14532d, 0.85);
        g.fillTriangle(x - w * 0.07, horizonY + 4, x + w * 0.07, horizonY + 4, x, horizonY - th);
        g.fillStyle(0x451a03, 0.8);
        g.fillRect(x - 2, horizonY, 4, 8);
      }
    } else if (deco === "desert") {
      g.fillStyle(0xf59e0b, 0.5);
      g.fillEllipse(w * 0.3, horizonY, w * 0.7, h * 0.14);
      g.fillEllipse(w * 0.85, horizonY, w * 0.5, h * 0.1);
      // 선인장 한 그루
      const cx2 = w * 0.12, cy2 = horizonY + h * 0.1;
      g.fillStyle(0x15803d, 0.9);
      g.fillRoundedRect(cx2 - 3, cy2 - 22, 6, 24, 3);
      g.fillRoundedRect(cx2 - 12, cy2 - 16, 8, 5, 2.5);
      g.fillRoundedRect(cx2 + 4, cy2 - 12, 8, 5, 2.5);
    } else if (deco === "snow") {
      g.fillStyle(0xf8fafc, 0.8);
      g.fillEllipse(w * 0.25, horizonY, w * 0.6, h * 0.13);
      g.fillEllipse(w * 0.8, horizonY, w * 0.55, h * 0.17);
      for (const [tx, th] of [[0.1, 0.1], [0.55, 0.08], [0.92, 0.12]] as const) {
        const x = w * tx;
        g.fillStyle(0x0f766e, 0.75);
        g.fillTriangle(x - 9, horizonY + 2, x + 9, horizonY + 2, x, horizonY - h * th);
      }
    } else if (deco === "cave") {
      // 천장 종유석 + 빛나는 수정
      g.fillStyle(0x1e293b, 0.9);
      for (let i = 0; i < 6; i++) {
        const x = (i + 0.5) * (w / 6), len = h * (0.06 + (i % 3) * 0.04);
        g.fillTriangle(x - 7, 0, x + 7, 0, x, len);
      }
      for (const [tx, s] of [[0.12, 1], [0.45, 0.7], [0.9, 1.2]] as const) {
        const x = w * tx, y = horizonY + h * 0.12, size = 8 * s;
        g.fillStyle(0x67e8f9, 0.9);
        g.fillTriangle(x - size, y, x + size, y, x, y - size * 2.2);
        g.fillStyle(0xcffafe, 0.8);
        g.fillTriangle(x - size * 0.4, y, x + size * 0.4, y, x, y - size * 1.4);
      }
    } else if (deco === "volcano") {
      g.fillStyle(0x1c1917, 0.9);
      g.fillTriangle(w * 0.05, horizonY + 4, w * 0.55, horizonY + 4, w * 0.3, horizonY - h * 0.2);
      g.fillStyle(0xf97316, 0.95);
      g.fillTriangle(w * 0.27, horizonY - h * 0.14, w * 0.33, horizonY - h * 0.14, w * 0.3, horizonY - h * 0.2);
      // 지면 용암 균열
      g.lineStyle(2, 0xfb923c, 0.8);
      for (const [x1, y1, x2, y2] of [[0.1, 0.6, 0.22, 0.72], [0.6, 0.55, 0.75, 0.6], [0.82, 0.75, 0.95, 0.85]] as const) {
        g.lineBetween(w * x1, h * y1, w * x2, h * y2);
      }
    }

    // 전투 플랫폼(타원 받침) — 적/내 스프라이트 발밑. 포켓몬 배틀 화면의 시그니처 요소.
    const spriteBottom = (GRID - 1 - CY) * this.cell;
    g.fillStyle(biome.platform, 0.9);
    g.fillEllipse(this.enemyCenterX, this.enemyCenterY + spriteBottom + this.cell * 0.8, this.cell * 15, this.cell * 3.6);
    g.fillEllipse(this.playerCenterX, this.playerCenterY + spriteBottom + this.cell * 0.8, this.cell * 16, this.cell * 4);
    g.lineStyle(2, biome.platformEdge, 0.55);
    g.strokeEllipse(this.enemyCenterX, this.enemyCenterY + spriteBottom + this.cell * 0.8, this.cell * 15, this.cell * 3.6);
    g.strokeEllipse(this.playerCenterX, this.playerCenterY + spriteBottom + this.cell * 0.8, this.cell * 16, this.cell * 4);
  }

  // 환경 파티클(낙엽/모래/눈/수정 반딧불/불씨) — 바이옴 분위기용 잔잔한 배경 입자.
  private startAmbient(biome: BiomeDef) {
    const w = this.scale.width, h = this.scale.height;
    this.ambient?.destroy();
    this.ambient = null;
    if (!biome.particle) return;
    const p = biome.particle;
    const falling = p.dir === "fall";
    this.ambient = this.add.particles(0, 0, "dot", {
      x: { min: 0, max: w },
      y: falling ? -6 : h + 6,
      lifespan: 7000,
      speedY: falling ? { min: 10, max: 26 } : { min: -22, max: -8 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.55, end: 0.15 },
      alpha: { start: 0.85, end: 0 },
      frequency: Math.round(1000 / p.countPerSec),
      tint: p.color,
    }).setDepth(1);
  }

  // ---------- 공용 드로잉 ----------

  private cellPx(col: number, row: number) {
    return { x: (col - CX) * this.cell, y: (row - CY) * this.cell };
  }

  // 크림색 정보 패널 — 어떤 바이옴 배경 위에서도 텍스트가 항상 읽히게 하는 받침 박스.
  private drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
    g.fillStyle(0x1c1917, 0.25);
    g.fillRoundedRect(x + 2, y + 3, w, h, 9); // 떨어진 그림자
    g.fillStyle(0xfffbeb, 0.96);
    g.fillRoundedRect(x, y, w, h, 9);
    g.lineStyle(2, 0x78716c, 1);
    g.strokeRoundedRect(x, y, w, h, 9);
  }

  private drawMonster() {
    const g = this.enemyGfx;
    const s = this.spec;
    const species = s.species;
    const basePred = species.inBody;
    const pred = this.squished ? (c: number, r: number) => squish(c, r, basePred) : basePred;
    g.clear();

    const body: boolean[][] = [];
    for (let row = 0; row < GRID; row++) {
      body[row] = [];
      for (let col = 0; col < GRID; col++) body[row][col] = pred(col, row);
    }
    const isBody = (col: number, row: number) => body[row]?.[col] ?? false;

    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        if (!isBody(col, row)) continue;
        const edge = !isBody(col + 1, row) || !isBody(col - 1, row) || !isBody(col, row + 1) || !isBody(col, row - 1);
        const { x, y } = this.cellPx(col, row);
        g.fillStyle(edge ? s.palette.outline : s.palette.body, 1);
        g.fillRect(x, y, this.cell + 1, this.cell + 1);
      }
    }

    { // 광택
      const p = this.cellPx(CX - 3, species.eyeRow - 2);
      g.fillStyle(s.palette.shine, 0.7);
      g.fillEllipse(p.x, p.y, this.cell * 2.2, this.cell * 1.4);
    }

    if (s.hasBlush) {
      g.fillStyle(BLUSH_COLOR, 0.85);
      for (const dir of [-1, 1]) {
        const p = this.cellPx(CX + dir * (s.eyeGap + 1.8), species.eyeRow + 1.5);
        g.fillCircle(p.x + this.cell / 2, p.y + this.cell / 2, this.cell * 0.75);
      }
    }

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

    if (s.mouth !== "none") {
      const p = this.cellPx(CX, species.mouthRow);
      g.fillStyle(s.palette.outline, 1);
      if (s.mouth === "smile") g.fillRoundedRect(p.x - this.cell, p.y, this.cell * 2, this.cell * 0.4, this.cell * 0.2);
      else g.fillCircle(p.x + this.cell / 2, p.y, this.cell * 0.4);
    }
  }

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
    gfx.fillStyle(0x44403c, 0.3);
    gfx.fillRoundedRect(x, y, w, HP_BAR_H, HP_BAR_H / 2);
    const fillW = Math.min(w, Math.max(pct > 0 ? HP_BAR_H : 0, w * pct));
    if (fillW > 0) {
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(x, y, fillW, HP_BAR_H, HP_BAR_H / 2);
    }
    numText.setText(`${Math.max(0, Math.round(hp))}/${Math.round(maxHp)}`);
  }

  private redrawEnemyHpBar() {
    this.drawHpBar(this.enemyHpGfx, this.enemyHpNumText, this.enemyHpBarX, this.enemyHpBarY, this.enemyHpBarW, this.shownEnemyHp.v, this.enemyMaxHpShown);
  }
  private redrawPlayerHpBar() {
    this.drawHpBar(this.playerHpGfx, this.playerHpNumText, this.playerHpBarX, this.playerHpBarY, this.playerHpBarW, this.shownPlayerHp.v, this.playerMaxHpShown);
  }

  // ---------- 상태 반영 API (React 래퍼가 호출) ----------

  // 새 적 등장 — 스프라이트는 오른쪽 화면 밖에서 미끄러져 들어오고, 정보 패널은 왼쪽에서 슬라이드 인.
  setEnemy(name: string, hp: number, maxHp: number, encounter: "battle" | "boss" | "elite" = "battle", level?: number) {
    const prefix = encounter === "boss" ? "👑 " : encounter === "elite" ? "🗡️ " : "";
    const color = encounter === "boss" ? "#d97706" : encounter === "elite" ? "#9333ea" : "#1f2937";
    this.enemyLabel.setText(prefix + name).setColor(color);
    this.enemyLvText.setText(level ? `Lv.${level}` : "");
    this.setEnemyStatus(null);
    this.spec = randomMonster();
    this.blinking = false;
    this.squished = false;
    this.drawMonster();
    this.enemyMaxHpShown = maxHp;
    this.tweens.killTweensOf(this.shownEnemyHp);
    this.shownEnemyHp.v = hp;
    this.redrawEnemyHpBar();

    this.tweens.killTweensOf(this.enemyGfx);
    this.enemyGfx.setPosition(this.enemyCenterX + this.scale.width * 0.35, this.enemyCenterY).setAlpha(0).setScale(1).setAngle(0);
    this.tweens.add({ targets: this.enemyGfx, x: this.enemyCenterX, alpha: 1, duration: 420, ease: "Back.easeOut" });
    if (encounter === "boss") this.cameras.main.shake(260, 0.008);

    this.tweens.killTweensOf(this.enemyInfoBox);
    this.enemyInfoBox.setX(-40).setAlpha(0);
    this.tweens.add({ targets: this.enemyInfoBox, x: 0, alpha: 1, duration: 320, ease: "Cubic.easeOut" });
  }

  // HP는 즉시 꺾지 않고 현재 표시값에서 목표값까지 트윈 — 포켓몬식 "쭉 흘러내리는" HP바.
  setEnemyHp(hp: number, maxHp: number) {
    this.enemyMaxHpShown = maxHp;
    this.tweens.killTweensOf(this.shownEnemyHp);
    this.tweens.add({
      targets: this.shownEnemyHp, v: hp, duration: 450, ease: "Cubic.easeOut",
      onUpdate: () => this.redrawEnemyHpBar(),
    });
  }

  setPlayerName(name: string) {
    this.playerLabel.setText(name);
  }

  setPlayerHp(hp: number, maxHp: number) {
    this.playerMaxHpShown = maxHp;
    this.tweens.killTweensOf(this.shownPlayerHp);
    this.tweens.add({
      targets: this.shownPlayerHp, v: hp, duration: 450, ease: "Cubic.easeOut",
      onUpdate: () => this.redrawPlayerHpBar(),
    });
  }

  setPlayerLevel(level: number) {
    if (this.playerLevel === level) return;
    const first = this.playerLevel === null;
    this.playerLevel = level;
    this.playerLvText.setText(`Lv.${level}`);
    const scale = levelToScale(level);
    this.tweens.killTweensOf(this.playerGfx);
    this.playerGfx.setPosition(this.playerCenterX, this.playerCenterY).setAlpha(1);
    if (first) { this.playerGfx.setScale(scale); return; }
    this.tweens.add({ targets: this.playerGfx, scale, duration: 380, ease: "Back.easeOut" });
    this.cameras.main.flash(220, 253, 224, 71);
    this.burst(this.playerCenterX, this.playerCenterY, 0xfacc15, 18);
  }

  // 상태이상 배지 — 정보 패널 위 색깔 칩(화상=주황/독=보라/마비=노랑). null이면 숨김.
  setEnemyStatus(kind: SceneStatusKind | null) {
    if (!kind) { this.enemyStatusChip.setVisible(false); return; }
    const c = STATUS_CHIP[kind];
    this.enemyStatusChip.setText(c.label).setBackgroundColor(c.bg).setVisible(true);
    // Lv 표기와 겹치므로 배지가 켜지면 Lv는 잠시 숨긴다(패널이 좁아 우선순위는 상태이상).
    this.enemyLvText.setVisible(false);
  }
  setPlayerStatus(kind: SceneStatusKind | null) {
    if (!kind) {
      this.playerStatusChip.setVisible(false);
      this.playerLabel.setX(this.playerStatusChip.x);
      return;
    }
    const c = STATUS_CHIP[kind];
    this.playerStatusChip.setText(c.label).setBackgroundColor(c.bg).setVisible(true);
    this.playerLabel.setX(this.playerStatusChip.x + this.playerStatusChip.width + 4);
  }

  // ---------- 연출 ----------

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

  // 한 점에서 사방으로 터지는 입자 — 타격/회복/레벨업 등 모든 임팩트의 공용 이펙트.
  private burst(x: number, y: number, color: number, count = 14) {
    const e = this.add.particles(x, y, "dot", {
      speed: { min: 60, max: 170 }, lifespan: 420,
      scale: { start: 0.9, end: 0 }, tint: color, emitting: false,
    }).setDepth(7);
    e.explode(count);
    this.time.delayedCall(520, () => e.destroy());
  }

  // 투사체 — 발사 지점에서 목표까지 빛나는 구체가 날아가고 도착 시 콜백(임팩트) 실행.
  private shoot(fromX: number, fromY: number, toX: number, toY: number, color: number, onHit?: () => void) {
    const g = this.add.graphics({ x: fromX, y: fromY }).setDepth(7);
    g.fillStyle(color, 0.35); g.fillCircle(0, 0, 9);
    g.fillStyle(color, 1); g.fillCircle(0, 0, 5);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(-1.5, -1.5, 2);
    this.tweens.add({
      targets: g, x: toX, y: toY, duration: 230, ease: "Quad.easeIn",
      onComplete: () => { g.destroy(); onHit?.(); },
    });
  }

  flashEnemyHit(damage: number) {
    this.tweens.add({ targets: this.enemyGfx, scaleX: 0.9, scaleY: 0.9, duration: 80, yoyo: true });
    this.burst(this.enemyCenterX, this.enemyCenterY, 0xf87171, 12);
    this.cameras.main.shake(110, 0.004);
    this.popText(this.enemyCenterX, this.enemyCenterY - this.cell * CY * 0.6, `-${damage}`, "#ef4444");
  }

  flashPlayerBlock(amount: number) {
    // 육각 방패 팝 — 파란 링 + 파티클
    this.playPulseRing(0x60a5fa);
    this.burst(this.playerCenterX, this.playerCenterY - this.cell * 2, 0x93c5fd, 8);
    this.popText(this.playerCenterX, this.playerCenterY - this.cell * CY * 0.6, `+${amount} 🛡️`, "#2563eb");
  }

  // 적의 공격 — 적이 앞으로 훅 들어왔다 빠지며 투사체를 날리고, 도착하는 순간 피해 숫자/흔들림.
  flashPlayerHit(damage: number) {
    if (damage <= 0) return;
    const dx = (this.playerCenterX - this.enemyCenterX) * 0.14;
    const dy = (this.playerCenterY - this.enemyCenterY) * 0.14;
    this.tweens.killTweensOf(this.enemyGfx);
    this.enemyGfx.setPosition(this.enemyCenterX, this.enemyCenterY);
    this.tweens.add({ targets: this.enemyGfx, x: this.enemyCenterX + dx, y: this.enemyCenterY + dy, duration: 110, yoyo: true, ease: "Quad.easeOut" });
    this.shoot(this.enemyCenterX + dx, this.enemyCenterY + dy, this.playerCenterX, this.playerCenterY, 0x818cf8, () => {
      this.cameras.main.shake(160, 0.007);
      this.burst(this.playerCenterX, this.playerCenterY, 0xf87171, 12);
      this.popText(this.playerCenterX, this.playerCenterY - this.cell * CY * 0.6, `-${damage}`, "#ef4444");
    });
  }

  playHeal(amount: number) {
    // 초록 반짝임이 아래에서 위로 솟는 회복 연출
    const e = this.add.particles(this.playerCenterX, this.playerCenterY + this.cell * 3, "dot", {
      x: { min: -this.cell * 4, max: this.cell * 4 },
      speedY: { min: -70, max: -30 }, speedX: { min: -8, max: 8 },
      lifespan: 700, scale: { start: 0.7, end: 0 }, tint: 0x4ade80, emitting: false,
    }).setDepth(7);
    e.explode(14);
    this.time.delayedCall(800, () => e.destroy());
    this.popText(this.playerCenterX, this.playerCenterY - this.cell * CY * 0.6, `+${amount} ❤️`, "#16a34a");
  }

  // 기절 — 스프라이트가 옆으로 기울며 가라앉고 사라진다(포켓몬의 "쓰러짐" 모먼트).
  playEnemyFaint() {
    this.tweens.killTweensOf(this.enemyGfx);
    this.tweens.add({
      targets: this.enemyGfx, y: this.enemyCenterY + this.cell * 5, angle: 24, alpha: 0,
      duration: 480, ease: "Quad.easeIn",
    });
    this.burst(this.enemyCenterX, this.enemyCenterY, 0x94a3b8, 10);
  }
  playPlayerFaint() {
    this.tweens.killTweensOf(this.playerGfx);
    this.tweens.add({
      targets: this.playerGfx, y: this.playerCenterY + this.cell * 5, angle: -24, alpha: 0,
      duration: 480, ease: "Quad.easeIn",
    });
  }
  // 교체 투입 — 왼쪽 화면 밖에서 미끄러져 들어옴(기절 후 다음 몬스터/자발적 교체 공용).
  playPlayerEnter() {
    this.tweens.killTweensOf(this.playerGfx);
    this.playerGfx.setPosition(this.playerCenterX - this.scale.width * 0.3, this.playerCenterY).setAlpha(0).setAngle(0);
    this.tweens.add({ targets: this.playerGfx, x: this.playerCenterX, alpha: 1, duration: 380, ease: "Back.easeOut" });
  }

  showIntro(label: string) {
    this.introText.setText(label).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.introText, scale: 1, duration: 200, ease: "Back.easeOut" });
    this.time.delayedCall(800, () => this.tweens.add({ targets: this.introText, alpha: 0, duration: 250 }));
  }

  // 기술 시전 — attack은 돌진+투사체+임팩트, shield는 방패 링, heal은 자체 회복 연출과 별개로
  // 시전 링(HP 변화 감지로 뜨는 playHeal과 겹치지 않게 가볍게만).
  playSkillCast(kind: "attack" | "shield" | "heal") {
    if (kind === "attack") {
      const dx = (this.enemyCenterX - this.playerCenterX) * 0.14;
      const dy = (this.enemyCenterY - this.playerCenterY) * 0.14;
      this.tweens.killTweensOf(this.playerGfx);
      const baseScale = this.playerGfx.scaleX;
      this.playerGfx.setPosition(this.playerCenterX, this.playerCenterY);
      this.tweens.add({
        targets: this.playerGfx, x: this.playerCenterX + dx, y: this.playerCenterY + dy,
        scaleX: baseScale * 1.08, scaleY: baseScale * 1.08, duration: 100, yoyo: true, ease: "Quad.easeOut",
      });
      this.shoot(this.playerCenterX + dx, this.playerCenterY + dy, this.enemyCenterX, this.enemyCenterY, 0xf97316, () => {
        this.burst(this.enemyCenterX, this.enemyCenterY, 0xfb923c, 10);
      });
      return;
    }
    this.playPulseRing(kind === "shield" ? 0x60a5fa : 0x4ade80);
  }

  private playPulseRing(color: number) {
    const g = this.add.graphics({ x: this.playerCenterX, y: this.playerCenterY }).setDepth(7);
    g.lineStyle(3, color, 1);
    g.strokeCircle(0, 0, this.cell * 2.5);
    g.setScale(0.4).setAlpha(1);
    this.tweens.add({ targets: g, scale: 1.8, alpha: 0, duration: 450, ease: "Quad.easeOut", onComplete: () => g.destroy() });
  }

  private popText(x: number, y: number, text: string, color: string) {
    const t = this.add.text(x, y, text, {
      fontSize: "16px", color, fontStyle: "bold", resolution: RES,
      stroke: "#ffffff", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(8);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 650, ease: "Quad.easeOut", onComplete: () => t.destroy() });
  }
}
