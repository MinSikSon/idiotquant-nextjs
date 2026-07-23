// 가치투자 덱빌더 — 전투 판정 순수 로직. React/Phaser 비의존, 결정적(주사위 요소는
// Math.random 직접 호출로 격리돼 있어 나머지는 항상 같은 입력 → 같은 출력).

import { computeValueScore } from "@/lib/utils/valueScore";
import type {
  CardStats, CombatCard, PassiveEffect, ActiveEffect, ItemDef, EnemyState, PlayerState,
} from "./gameTypes";

export const ENERGY_MAX = 4;
export const HAND_SIZE = 5;
export const BASE_HP = 30;
export const MIN_DECK = 10;
const ENEMY_BASE_HP = 12;
const ENEMY_PER_FLOOR = 3;
const BOSS_MULT = 2.2;
const ELITE_MULT = 1.5;

// 4개 재무 지표(sub, 0~1 clamp01된 정규화 점수 — computeValueScore가 이미 계산)를 4개 전투
// 스탯(1~10 양의 정수)으로 매핑. 데이터 없는 지표는 sub=0(최저값)으로 처리돼 NaN이 안 생김.
export function cardStats(item: any): CardStats {
  const parts = computeValueScore(item).parts;
  const sub = (key: string) => parts.find(p => p.key === key)?.sub ?? 0;
  return {
    attack: 1 + Math.round(sub("roe") * 9),
    shield: 1 + Math.round(sub("ncav") * 9),
    cost: 1 + Math.round((1 - sub("pbr")) * 9),
    refund: 1 + Math.round(sub("per") * 9),
  };
}

const emptyPassive: Required<PassiveEffect> = {
  blockPerTurn: 0, drawBonus: 0, energyBonus: 0, maxHpBonus: 0, damageReduce: 0, freeCostThreshold: 0,
};

// 보유 패시브 아이템 전체를 합산한 상시 보너스. 액티브 아이템은 포함하지 않음(발동 시점에만 효과).
export function aggregatePassive(ownedDefs: ItemDef[]): Required<PassiveEffect> {
  const out = { ...emptyPassive };
  for (const def of ownedDefs) {
    if (def.kind !== "passive") continue;
    const e = def.effect as PassiveEffect;
    out.blockPerTurn += e.blockPerTurn ?? 0;
    out.drawBonus += e.drawBonus ?? 0;
    out.energyBonus += e.energyBonus ?? 0;
    out.maxHpBonus += e.maxHpBonus ?? 0;
    out.damageReduce += e.damageReduce ?? 0;
    out.freeCostThreshold = Math.max(out.freeCostThreshold, e.freeCostThreshold ?? 0);
  }
  return out;
}

let seq = 0;
const nextId = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;

// 보유 컬렉션(계정 덱) 전체를 전투 카드로 변환 + 셔플. MIN_DECK 미만이면 스타터 카드로 패딩.
export function buildRunDeck(deck: { ticker: string; name: string; count?: number;[k: string]: any }[], starterPool: Omit<CombatCard, "instanceId">[]): CombatCard[] {
  const cards: CombatCard[] = [];
  for (const d of deck) {
    const n = Math.max(1, d.count ?? 1);
    for (let i = 0; i < n; i++) {
      cards.push({ instanceId: nextId(), ticker: d.ticker, name: d.name, item: d, stats: cardStats(d), isStarter: false });
    }
  }
  while (cards.length < MIN_DECK) {
    const s = starterPool[cards.length % starterPool.length];
    cards.push({ ...s, instanceId: nextId() });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// 드로우 파일이 부족하면 버림 더미를 섞어 합침(슬레이더스파이어 표준 리셔플 규칙)
export function drawHand(drawPile: CombatCard[], discardPile: CombatCard[], handSize: number): { hand: CombatCard[]; drawPile: CombatCard[]; discardPile: CombatCard[] } {
  let draw = [...drawPile], discard = [...discardPile];
  const hand: CombatCard[] = [];
  for (let i = 0; i < handSize; i++) {
    if (draw.length === 0) {
      if (discard.length === 0) break; // 덱 전체가 손패+전장에 나가 있으면 그냥 적은 수로 진행
      draw = discard;
      for (let k = draw.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1));[draw[k], draw[j]] = [draw[j], draw[k]]; }
      discard = [];
    }
    hand.push(draw.pop()!);
  }
  return { hand, drawPile: draw, discardPile: discard };
}

// 적 = 실제 종목 카드에서 뽑되, 보스/정예는 강한 등급 풀 우선. HP는 층수 비례 + 보스/정예 배율.
export function enemyForFloor(pool: any[], floor: number, encounter: EnemyEncounter): EnemyState {
  const strong = pool.filter(it => ["gold", "diamond", "treasure", "legend"].includes(computeValueScore(it).tone));
  const source = (encounter === "boss" || encounter === "elite") && strong.length > 0 ? strong : pool;
  const item = source[Math.floor(Math.random() * source.length)];
  const stats = cardStats(item);
  const mult = encounter === "boss" ? BOSS_MULT : encounter === "elite" ? ELITE_MULT : 1;
  const maxHp = Math.round((ENEMY_BASE_HP + floor * ENEMY_PER_FLOOR) * mult);
  const attack = stats.attack + Math.floor(floor / 3);
  return { item, stats, hp: maxHp, maxHp, nextAttack: attack };
}
type EnemyEncounter = "battle" | "boss" | "elite";

// 카드 한 장 발동 — 코스트를 낼 수 없으면 그대로 반환(호출부에서 사전에 막아야 함, 여기선 방어적으로만 처리).
export function playCard(player: PlayerState, enemy: EnemyState, card: CombatCard, passive: Required<PassiveEffect>): { player: PlayerState; enemy: EnemyState } {
  const cost = card.stats.cost <= passive.freeCostThreshold ? 0 : card.stats.cost;
  if (player.energy < cost) return { player, enemy };
  const nextPlayer: PlayerState = { ...player, energy: player.energy - cost, block: player.block + card.stats.shield };
  const nextEnemy: EnemyState = { ...enemy, hp: Math.max(0, enemy.hp - card.stats.attack) };
  return { player: nextPlayer, enemy: nextEnemy };
}

// 예약된 환급 에너지(직전 턴에 낸 카드들의 refund 합)를 다음 턴 시작 에너지에 더해준다.
export function startTurn(player: PlayerState, passive: Required<PassiveEffect>, reservedRefund: number): PlayerState {
  return {
    ...player,
    energy: player.energyMax + passive.energyBonus + reservedRefund,
    block: passive.blockPerTurn, // 블록은 매 턴 리셋 후 패시브만큼만 기본 지급
  };
}

// 적 턴 — 공격력에서 블록·데미지감소를 뺀 뒤(최소 0) 플레이어 HP 차감, 블록은 소멸.
export function resolveEnemyTurn(player: PlayerState, enemy: EnemyState, passive: Required<PassiveEffect>): PlayerState {
  const dmg = Math.max(0, enemy.nextAttack - player.block - passive.damageReduce);
  return { ...player, hp: Math.max(0, player.hp - dmg), block: 0 };
}

// 액티브 아이템 즉시 발동(에너지 소모 없음, 1회 소모는 호출부의 보유 목록에서 제거)
export function useActiveItem(player: PlayerState, enemy: EnemyState, hand: CombatCard[], drawPile: CombatCard[], discardPile: CombatCard[], effect: ActiveEffect) {
  let nextPlayer = { ...player }, nextEnemy = { ...enemy };
  let nextHand = hand, nextDraw = drawPile, nextDiscard = discardPile;
  if (effect.kind === "damage") nextEnemy.hp = Math.max(0, nextEnemy.hp - effect.amount);
  else if (effect.kind === "heal") nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + effect.amount);
  else if (effect.kind === "block") nextPlayer.block += effect.amount;
  else if (effect.kind === "draw") {
    const r = drawHand(drawPile, discardPile, effect.amount);
    nextHand = [...hand, ...r.hand]; nextDraw = r.drawPile; nextDiscard = r.discardPile;
  }
  return { player: nextPlayer, enemy: nextEnemy, hand: nextHand, drawPile: nextDraw, discardPile: nextDiscard };
}

export function checkOutcome(player: PlayerState, enemy: EnemyState): "win" | "lose" | null {
  if (enemy.hp <= 0) return "win";
  if (player.hp <= 0) return "lose";
  return null;
}
