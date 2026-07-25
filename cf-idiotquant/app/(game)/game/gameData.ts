// 가치투자 덱빌더 — 상수/데이터 테이블. 프로토타입 범위: 아이템은 소수만(패시브 4 + 액티브 4 +
// 스탯 부스트 12 + 전설급 3), 콘텐츠 확장은 나중에.

import { computeValueScore } from "@/lib/utils/valueScore";
import type { ItemDef, CardStats, MerchantOfferDef } from "./gameTypes";

// 파티 규모 — 던전 입장 전 파티 설정 화면에서 유저가 계정 덱 중 최대 이 수만큼 직접 고른다.
export const PARTY_SIZE = 6;

// 덱에 카드가 PARTY_SIZE보다 적을 때 채워 넣는 기본 몬스터(계정 덱엔 저장되지 않는 합성 스탯).
// 실제 수집 카드보다 확실히 약하게 잡아 수집 동기를 유지한다.
export const STARTER_MONSTERS: { name: string; stats: CardStats }[] = [
  { name: "들풀 정령", stats: { attack: 3, shield: 3 } },
  { name: "돌멩이 정령", stats: { attack: 2, shield: 5 } },
  { name: "불씨 정령", stats: { attack: 5, shield: 2 } },
];

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

export const PP_POTION_ITEM_ID = "buyMore"; // 3층마다 뜨는 일반 아이템 선택지의 "기력 회복"용 id(상점과 무관)
export const START_GOLD = 1000; // 던전 입장 시 시작 골드

// 떠돌이 상인(매 층 상점) — 무료 3종 + 유료 3종, 총 6종 중 딱 하나만 골라서 가져갈 수 있다.
// heal/ppFill은 즉시 대상(+ppFill은 대상 기술)을 골라 적용, buffAtk/buffDef/buffXp는 대상 없이
// 즉시 활성화돼 다음 전투부터 파티 전체에 적용된다.
export const MERCHANT_FREE_POOL: MerchantOfferDef[] = [
  { id: "merchant_heal30", name: "응급 처치", desc: "종목 하나의 HP를 30% 회복", icon: "❤️", cost: 0, effect: { kind: "heal", pct: 0.3 } },
  { id: "merchant_ppfill", name: "PP 충전", desc: "종목 하나의 기술 하나를 PP 최대치로 충전", icon: "💊", cost: 0, effect: { kind: "ppFill" } },
  { id: "merchant_atk_small", name: "기합", desc: "다음 전투부터 3턴 동안 공격력 +20%", icon: "💢", cost: 0, effect: { kind: "buffAtk", turns: 3, mult: 1.2 } },
];
export const MERCHANT_PAID_POOL: MerchantOfferDef[] = [
  { id: "merchant_heal100", name: "완전 회복", desc: "종목 하나의 HP를 100% 회복", icon: "💗", cost: 150, effect: { kind: "heal", pct: 1 } },
  { id: "merchant_def", name: "철벽 태세", desc: "다음 전투부터 5턴 동안 방어력 +30%", icon: "🛡️", cost: 200, effect: { kind: "buffDef", turns: 5, mult: 1.3 } },
  { id: "merchant_xp2x", name: "집중 훈련", desc: "다음 전투부터 5턴 동안 경험치 2배", icon: "📈", cost: 250, effect: { kind: "buffXp", turns: 5, mult: 2 } },
];

export const ITEM_POOL: ItemDef[] = [
  { id: "buffer", kind: "passive", name: "여유 자금", desc: "매 턴 시작 시 블록 +2", icon: "🧱", effect: { blockPerTurn: 2 } },
  { id: "stoploss", kind: "active", name: "손절매", desc: "즉시 적에게 5 데미지", icon: "✂️", effect: { kind: "damage", amount: 5 } },
  { id: "loan", kind: "active", name: "긴급 대출", desc: "즉시 블록 +5", icon: "🏦", effect: { kind: "block", amount: 5 } },
  { id: "compound", kind: "active", name: "복리의 마법", desc: "즉시 HP +8 회복", icon: "🔄", effect: { kind: "heal", amount: 8 } },
  { id: PP_POTION_ITEM_ID, kind: "active", name: "기력 회복", desc: "보유한 모든 기술의 PP를 최대치로 회복", icon: "💊", effect: { kind: "restorePP" } },
];

// 체력 스탯 부스트 — 3단계(lv2=lv1×2, lv3=lv1×4). 다른 패시브 아이템과 동일하게 이번 런에서만
// 적용되고 던전을 나가면 사라짐. 힘/민첩/행운(주사위 굴림에 직접 관여하는 스탯)은 이제 일반
// 풀이 아니라 RELIC_POOL(유물, 보스 처치 전용)로 옮겨졌다.
export const STAT_ITEM_POOL: ItemDef[] = [
  { id: "vit_ring_1", kind: "passive", name: "체력의 반지 I", desc: "체력(VIT) +10", icon: "🫀", tier: 1, effect: { vitBonus: 10 } },
  { id: "vit_ring_2", kind: "passive", name: "체력의 반지 II", desc: "체력(VIT) +20", icon: "🫀", tier: 2, effect: { vitBonus: 20 } },
  { id: "vit_ring_3", kind: "passive", name: "체력의 반지 III", desc: "체력(VIT) +40", icon: "🫀", tier: 3, effect: { vitBonus: 40 } },
];

// 전설급 아이템 — 업적 해금 시에만 파밍 풀에 추가(기존 전설 장비 자리를 대체, 세트 개념 없음)
export const LEGEND_ITEMS: ItemDef[] = [
  { id: "legend_buffett", kind: "passive", name: "워런 버핏의 서한", desc: "최대 HP +10", icon: "📜", isLegend: true, achievementId: "collector", effect: { maxHpBonus: 10 } },
  { id: "legend_blackswan", kind: "active", name: "블랙스완 헤지", desc: "즉시 적에게 15 데미지", icon: "🦢", isLegend: true, achievementId: "legend3", effect: { kind: "damage", amount: 15 } },
];

export const ALL_ITEMS: ItemDef[] = [...ITEM_POOL, ...STAT_ITEM_POOL, ...LEGEND_ITEMS];

// 유물 — 주사위 굴림 자체를 커스텀하는 효과(힘/민첩/행운 보너스, 어드밴티지)만 모아둔 별도 풀.
// 3층마다 뜨는 일반 아이템 선택지엔 절대 안 섞이고, 보스를 처치했을 때만 이 중 하나가 랜덤으로
// 자동 지급된다(플레이어가 고르지 않음 — pickItemChoices(RELIC_POOL, 1)).
export const RELIC_POOL: ItemDef[] = [
  { id: "relic_str_1", kind: "passive", name: "괴력의 유물", desc: "힘(STR) +3 — 공격 시 고정 데미지 보너스 증가", icon: "💪", isRelic: true, effect: { strBonus: 3 } },
  { id: "relic_str_2", kind: "passive", name: "거인의 유물", desc: "힘(STR) +6 — 공격 시 고정 데미지 보너스 증가", icon: "💪", isRelic: true, effect: { strBonus: 6 } },
  { id: "relic_dex_1", kind: "passive", name: "재빠름의 유물", desc: "민첩(DEX) +30 — 주사위 눈에 보정치 추가", icon: "🐇", isRelic: true, effect: { dexBonus: 30 } },
  { id: "relic_dex_2", kind: "passive", name: "질풍의 유물", desc: "민첩(DEX) +60 — 주사위 눈에 보정치 추가", icon: "🐇", isRelic: true, effect: { dexBonus: 60 } },
  { id: "relic_luk_1", kind: "passive", name: "행운의 유물", desc: "행운(LUK) +30 — 크리티컬 확률 상승", icon: "🍀", isRelic: true, effect: { lukBonus: 30 } },
  { id: "relic_luk_2", kind: "passive", name: "여신의 유물", desc: "행운(LUK) +60 — 크리티컬 확률 상승", icon: "🍀", isRelic: true, effect: { lukBonus: 60 } },
  { id: "relic_advantage", kind: "passive", name: "야수의 감각", desc: "카드 공격 시 주사위를 2번 굴려 더 높은 눈 사용(어드밴티지)", icon: "🎲", isRelic: true, effect: { extraDie: true } },
];

// 아이템 선택지 3택1(보스는 행운 수치에 따라 4택) — 슬롯 개념이 없어 이미 보유한 아이템도 후보에서
// 제외하지 않음(패시브는 중복 보유 시 효과가 합산되고, 액티브는 충전 개념이 없어 여러 장 들고 있으면
// 그만큼 더 쓸 수 있음).
export function pickItemChoices(pool: ItemDef[], count: number = ITEM_OFFER_COUNT): ItemDef[] {
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}
