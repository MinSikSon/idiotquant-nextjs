// 가치투자 덱빌더 — 상수/데이터 테이블. 프로토타입 범위: 아이템은 소수만(패시브 4 + 액티브 4 +
// 스탯 부스트 12 + 전설급 3), 콘텐츠 확장은 나중에.

import { computeValueScore } from "@/lib/utils/valueScore";
import type { ItemDef, CombatCard } from "./gameTypes";

// 카드 수집: 승리(층 클리어)마다 판정. 등급별 기본 확률 + 클리어한 층수 보너스(옛 "연승" 보너스를
// 대체 — 다중 턴 전투 구조에선 "판마다 승패"가 사라지고 "층 클리어"만 있어 streak==totalWins).
export const TIER_BASE: Record<string, number> = {
  explore: 0.35, clay: 0.29, raw: 0.24, iron: 0.19, bronze: 0.15, silver: 0.11, gold: 0.08, diamond: 0.055, treasure: 0.035, legend: 0.02,
};
export function acquireChance(item: any, floorsCleared: number): number {
  const tone = computeValueScore(item).tone;
  const base = TIER_BASE[tone] ?? 0.2;
  return Math.min(0.9, base + Math.max(0, floorsCleared - 1) * 0.07);
}

// 3층마다 뜨는 아이템 선택지 개수, 보스 처치 시 전설급 등장 확률
export const ITEM_OFFER_COUNT = 3;

export const PP_POTION_ITEM_ID = "buyMore";
export const PP_POTION_COST = 10; // 매 층 상점에서 판매하는 PP 회복 물약 가격(골드)

export const ITEM_POOL: ItemDef[] = [
  { id: "buffer", kind: "passive", name: "여유 자금", desc: "매 턴 시작 시 블록 +2", icon: "🧱", effect: { blockPerTurn: 2 } },
  { id: "network", kind: "passive", name: "정보망", desc: "전투 시작 시 뽑는 기술 +1", icon: "📡", effect: { drawBonus: 1 } },
  { id: "stoploss", kind: "active", name: "손절매", desc: "즉시 적에게 5 데미지", icon: "✂️", effect: { kind: "damage", amount: 5 } },
  { id: "loan", kind: "active", name: "긴급 대출", desc: "즉시 블록 +5", icon: "🏦", effect: { kind: "block", amount: 5 } },
  { id: "compound", kind: "active", name: "복리의 마법", desc: "즉시 HP +8 회복", icon: "🔄", effect: { kind: "heal", amount: 8 } },
  { id: PP_POTION_ITEM_ID, kind: "active", name: "기력 회복", desc: "보유한 모든 기술의 PP를 최대치로 회복", icon: "💊", effect: { kind: "restorePP" } },
];

// 힘/민첩/행운/체력 스탯 부스트 — 각 3단계(lv2=lv1×2, lv3=lv1×4). 다른 패시브 아이템과 동일하게
// 이번 런에서만 적용되고 던전을 나가면 사라짐(계정에 영구 저장되는 캐릭터 레벨과는 별개).
export const STAT_ITEM_POOL: ItemDef[] = [
  { id: "str_ring_1", kind: "passive", name: "힘의 반지 I", desc: "힘(STR) +1", icon: "💪", tier: 1, effect: { strBonus: 1 } },
  { id: "str_ring_2", kind: "passive", name: "힘의 반지 II", desc: "힘(STR) +2", icon: "💪", tier: 2, effect: { strBonus: 2 } },
  { id: "str_ring_3", kind: "passive", name: "힘의 반지 III", desc: "힘(STR) +4", icon: "💪", tier: 3, effect: { strBonus: 4 } },
  { id: "dex_ring_1", kind: "passive", name: "민첩의 반지 I", desc: "민첩(DEX) +1", icon: "🐇", tier: 1, effect: { dexBonus: 1 } },
  { id: "dex_ring_2", kind: "passive", name: "민첩의 반지 II", desc: "민첩(DEX) +2", icon: "🐇", tier: 2, effect: { dexBonus: 2 } },
  { id: "dex_ring_3", kind: "passive", name: "민첩의 반지 III", desc: "민첩(DEX) +4", icon: "🐇", tier: 3, effect: { dexBonus: 4 } },
  { id: "luk_ring_1", kind: "passive", name: "행운의 반지 I", desc: "행운(LUK) +1", icon: "🍀", tier: 1, effect: { lukBonus: 1 } },
  { id: "luk_ring_2", kind: "passive", name: "행운의 반지 II", desc: "행운(LUK) +2", icon: "🍀", tier: 2, effect: { lukBonus: 2 } },
  { id: "luk_ring_3", kind: "passive", name: "행운의 반지 III", desc: "행운(LUK) +4", icon: "🍀", tier: 3, effect: { lukBonus: 4 } },
  { id: "vit_ring_1", kind: "passive", name: "체력의 반지 I", desc: "체력(VIT) +10", icon: "🫀", tier: 1, effect: { vitBonus: 10 } },
  { id: "vit_ring_2", kind: "passive", name: "체력의 반지 II", desc: "체력(VIT) +20", icon: "🫀", tier: 2, effect: { vitBonus: 20 } },
  { id: "vit_ring_3", kind: "passive", name: "체력의 반지 III", desc: "체력(VIT) +40", icon: "🫀", tier: 3, effect: { vitBonus: 40 } },
];

// 전설급 아이템 — 업적 해금 시에만 파밍 풀에 추가(기존 전설 장비 자리를 대체, 세트 개념 없음)
export const LEGEND_ITEMS: ItemDef[] = [
  { id: "legend_buffett", kind: "passive", name: "워런 버핏의 서한", desc: "최대 HP +10", icon: "📜", isLegend: true, achievementId: "collector", effect: { maxHpBonus: 10 } },
  { id: "legend_blackswan", kind: "active", name: "블랙스완 헤지", desc: "즉시 적에게 15 데미지", icon: "🦢", isLegend: true, achievementId: "legend3", effect: { kind: "damage", amount: 15 } },
  { id: "legend_advantage", kind: "passive", name: "야수의 감각", desc: "카드 공격 시 주사위를 2번 굴려 더 높은 눈 사용(어드밴티지)", icon: "🎲", isLegend: true, achievementId: "captain", effect: { extraDie: true } },
];

export const ALL_ITEMS: ItemDef[] = [...ITEM_POOL, ...STAT_ITEM_POOL, ...LEGEND_ITEMS];

// 컬렉션이 MIN_DECK(combatEngine) 미만일 때 채우는 스타터 카드 — 계정 덱에는 저장되지 않는 합성
// 카드. 실제 컬렉션보다 확실히 약하게 잡아 수집 동기를 유지한다(공격/방어는 낮게, PP도 낮게).
export const STARTER_DECK: Omit<CombatCard, "instanceId" | "usesLeft">[] = [
  ...Array.from({ length: 6 }, (_, i) => ({
    ticker: `STARTER-A${i}`, name: "가치 원석", isStarter: true,
    item: { ticker: `STARTER-A${i}`, name: "가치 원석" },
    stats: { attack: 6, shield: 1, maxUses: 3 },
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    ticker: `STARTER-B${i}`, name: "안전 마진", isStarter: true,
    item: { ticker: `STARTER-B${i}`, name: "안전 마진" },
    stats: { attack: 4, shield: 3, maxUses: 3 },
  })),
];

// 아이템 선택지 3택1(보스는 행운 수치에 따라 4택) — 슬롯 개념이 없어 이미 보유한 아이템도 후보에서
// 제외하지 않음(패시브는 중복 보유 시 효과가 합산되고, 액티브는 충전 개념이 없어 여러 장 들고 있으면
// 그만큼 더 쓸 수 있음).
export function pickItemChoices(pool: ItemDef[], count: number = ITEM_OFFER_COUNT): ItemDef[] {
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}
