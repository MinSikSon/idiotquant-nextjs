// 던전 바이옴 — 5층마다 배경 테마가 통째로 바뀐다(포켓로그의 바이옴 순환 참고). 이 모듈은
// Phaser 비의존 순수 데이터라 page.tsx(HUD 바이옴 칩)와 CombatScene.ts(캔버스 렌더링) 양쪽에서
// 안전하게 임포트할 수 있다 — CombatScene을 직접 임포트하면 Phaser가 페이지 번들에 끌려온다.

export type BiomeDecoKind = "grassland" | "forest" | "desert" | "snow" | "cave" | "volcano";

export interface BiomeDef {
  id: BiomeDecoKind;
  name: string;
  emoji: string;
  skyTop: number;    // 하늘 그라데이션 위쪽 색
  skyBottom: number; // 하늘 그라데이션 아래쪽 색
  ground: number;    // 지면 색
  groundDark: number; // 지면 하단(그늘) 색
  platform: number;  // 전투 플랫폼(타원 받침) 색
  platformEdge: number;
  // 환경 파티클 — 바이옴 분위기를 살리는 잔잔한 입자(낙엽/눈/불씨 등). null이면 없음.
  particle: { color: number; dir: "fall" | "rise"; countPerSec: number } | null;
}

// 진행 순서: 초원 → 숲 → 사막 → 설원 → 동굴 → 화산, 이후 다시 순환. 뒤로 갈수록 험지 느낌.
export const BIOMES: BiomeDef[] = [
  {
    id: "grassland", name: "초원 지대", emoji: "🌿",
    skyTop: 0x7dd3fc, skyBottom: 0xe0f2fe, ground: 0x4ade80, groundDark: 0x22c55e,
    platform: 0x86efac, platformEdge: 0x16a34a,
    particle: { color: 0xa3e635, dir: "fall", countPerSec: 1 },
  },
  {
    id: "forest", name: "깊은 숲", emoji: "🌲",
    skyTop: 0x65a30d, skyBottom: 0xd9f99d, ground: 0x3f6212, groundDark: 0x1a2e05,
    platform: 0x84cc16, platformEdge: 0x365314,
    particle: { color: 0x65a30d, dir: "fall", countPerSec: 2 },
  },
  {
    id: "desert", name: "모래 사막", emoji: "🏜️",
    skyTop: 0xfbbf24, skyBottom: 0xfef3c7, ground: 0xfcd34d, groundDark: 0xd97706,
    platform: 0xfde68a, platformEdge: 0xb45309,
    particle: { color: 0xfcd34d, dir: "rise", countPerSec: 1 },
  },
  {
    id: "snow", name: "눈보라 설원", emoji: "❄️",
    skyTop: 0x93c5fd, skyBottom: 0xeff6ff, ground: 0xe2e8f0, groundDark: 0x94a3b8,
    platform: 0xf8fafc, platformEdge: 0x64748b,
    particle: { color: 0xffffff, dir: "fall", countPerSec: 4 },
  },
  {
    id: "cave", name: "수정 동굴", emoji: "💎",
    skyTop: 0x334155, skyBottom: 0x64748b, ground: 0x475569, groundDark: 0x1e293b,
    platform: 0x64748b, platformEdge: 0x0f172a,
    particle: { color: 0x67e8f9, dir: "rise", countPerSec: 1.5 },
  },
  {
    id: "volcano", name: "용암 화산", emoji: "🌋",
    skyTop: 0x7f1d1d, skyBottom: 0xf97316, ground: 0x44403c, groundDark: 0x1c1917,
    platform: 0x57534e, platformEdge: 0x292524,
    particle: { color: 0xfb923c, dir: "rise", countPerSec: 3 },
  },
];

export const BIOME_FLOORS = 5; // 한 바이옴이 이어지는 층수

export function biomeIndexForFloor(floor: number): number {
  return Math.floor(Math.max(0, floor) / BIOME_FLOORS) % BIOMES.length;
}
export function biomeForFloor(floor: number): BiomeDef {
  return BIOMES[biomeIndexForFloor(floor)];
}
