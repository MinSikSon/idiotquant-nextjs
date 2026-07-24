// 가치투자 덱빌더 — 캐릭터(계정 영구) 레벨/경험치 순수 로직. React/localStorage 비의존.

import { computeValueScore } from "@/lib/utils/valueScore";
import type { CharacterState, CharacterStats, CharClass } from "./gameTypes";

export const CHAR_STAT_CAP = 99;
export const MAX_LEVEL = 99;
export const XP_PER_ATTACK = 1;
export const LEVEL_XP_BASE = 100;
export const LEVEL_XP_GROWTH = 1.1;

export function xpToNextLevel(level: number): number {
  return Math.round(LEVEL_XP_BASE * Math.pow(LEVEL_XP_GROWTH, level - 1));
}

// 몬스터 처치 시 등급별 지급 경험치 — 최하등급부터 10, 20, 40... 두 배씩.
export const KILL_XP_BY_GRADE: Record<string, number> = {
  H: 10, G: 20, F: 40, E: 80, D: 160, C: 320, B: 640, A: 1280, S: 2560, SS: 5120,
};
export function killXpFor(item: any): number {
  return KILL_XP_BY_GRADE[computeValueScore(item).grade] ?? 0;
}

export interface ClassDef {
  id: CharClass;
  name: string;
  desc: string; // 상태창에서 직업 라벨 탭 시 보여줄 특성 설명
  baseStats: CharacterStats;
  growthPerLevel: CharacterStats; // 레벨업마다 자동으로 오르는 스탯(직업색)
  selectable: boolean;
}
// 전사 — 힘/체력 위주로 성장. 다른 직업 추가 시 이 표에 항목만 늘리면 됨.
export const CLASS_DEFS: Record<CharClass, ClassDef> = {
  warrior: {
    id: "warrior", name: "전사",
    desc: "힘과 체력 위주로 성장하는 근접 전투 특화 직업. 레벨업마다 힘+1·체력+1이 자동으로 오릅니다.",
    baseStats: { str: 1, dex: 0, luk: 0, vit: 10 },
    growthPerLevel: { str: 1, dex: 0, luk: 0, vit: 1 },
    selectable: true,
  },
};

export function newCharacter(classId: CharClass = "warrior"): CharacterState {
  return { classId, level: 1, xp: 0, stats: { ...CLASS_DEFS[classId].baseStats } };
}

const clampStat = (n: number) => Math.min(CHAR_STAT_CAP, n);

export function grantXp(character: CharacterState, amount: number): CharacterState {
  if (amount <= 0 || character.level >= MAX_LEVEL) return character;
  let level = character.level;
  let xp = character.xp + amount;
  let stats = { ...character.stats };
  const growth = CLASS_DEFS[character.classId].growthPerLevel;
  while (level < MAX_LEVEL) {
    const need = xpToNextLevel(level);
    if (xp < need) break;
    xp -= need;
    level += 1;
    stats = {
      str: clampStat(stats.str + growth.str),
      dex: clampStat(stats.dex + growth.dex),
      luk: clampStat(stats.luk + growth.luk),
      vit: clampStat(stats.vit + growth.vit),
    };
  }
  if (level >= MAX_LEVEL) xp = 0;
  return { ...character, level, xp, stats };
}
