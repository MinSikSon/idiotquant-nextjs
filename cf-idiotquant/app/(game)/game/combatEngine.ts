// 가치투자 덱빌더 — 전투 판정 순수 로직. React/Phaser 비의존, 결정적(주사위 요소는
// Math.random 직접 호출로 격리돼 있어 나머지는 항상 같은 입력 → 같은 출력).

import { computeValueScore } from "@/lib/utils/valueScore";
import type {
  CardStats, CombatCard, PassiveEffect, ActiveEffect, ItemDef, EnemyState, PlayerState,
  CharacterStats, AttackRollOptions, AttackRollResult, EnemyEncounter,
} from "./gameTypes";

export const HAND_SIZE = 5; // 전투 시작 시 뽑는 고정 기술셋 매수(포켓몬처럼 전투 내내 고정)
export const BASE_HP = 30;
export const MIN_DECK = 10;
const ENEMY_BASE_HP = 12;
const ENEMY_PER_FLOOR = 3;
const ENEMY_HP_PER_SHIELD = 2; // 뽑힌 카드 자체의 방어 스탯(등급과 상관관계가 있음)도 HP에 반영
const BOSS_MULT = 3;   // "보스는 그 층 몬스터가 스탯 3배로 강화되어 등장"
const ELITE_MULT = 1.5;

// 주사위 — D&D 스타일 20면체. 카드 공격/적 공격 모두 이 함수 하나로 처리(몬스터는 str/dex/luk/
// advantage를 안 넘기므로 자연 20 크리티컬만 적용됨).
export const CRIT_ROLL_FACE = 20;        // 자연 20 = 크리티컬
export const CRIT_MULTIPLIER = 2;        // 크리티컬 데미지 = base * 2(최대 데미지의 2배)
export const DEX_ROLL_DIVISOR = 20;      // 민첩 20당 굴림 눈 +1
export const STR_DAMAGE_DIVISOR = 10;    // 힘 10당 고정 데미지 +1
export const VIT_HP_MULTIPLIER = 2;      // 체력 1당 최대 HP +2
export const LUK_CRIT_PER_POINT = 0.003; // 행운 1당 추가 크리티컬 확률
export const LUK_CRIT_CAP = 0.35;
export const LUK_BOSS_EXTRA_PER_POINT = 0.005; // 행운 1당 보스 보상 4택 확률
export const LUK_BOSS_EXTRA_CAP = 0.40;

export function rollAttack(base: number, opts: AttackRollOptions = {}): AttackRollResult {
  const roll1 = 1 + Math.floor(Math.random() * 20);
  const roll2 = opts.advantage ? 1 + Math.floor(Math.random() * 20) : undefined;
  const faces = roll2 !== undefined ? [roll1, roll2] : [roll1];
  const rawFace = Math.max(...faces);
  const isNatural20 = faces.includes(CRIT_ROLL_FACE);
  const lukChance = opts.luk ? Math.min(LUK_CRIT_CAP, opts.luk * LUK_CRIT_PER_POINT) : 0;
  const isCrit = isNatural20 || (lukChance > 0 && Math.random() < lukChance);
  const dexBonus = opts.dex ? Math.floor(opts.dex / DEX_ROLL_DIVISOR) : 0;
  const effectiveFace = Math.min(20, rawFace + dexBonus);
  const diceDamage = isCrit ? base * CRIT_MULTIPLIER : Math.round(base * effectiveFace / 20);
  const strBonus = opts.str ? Math.floor(opts.str / STR_DAMAGE_DIVISOR) : 0;
  return { faces, rawFace, effectiveFace, isCrit, diceDamage, strBonus, totalDamage: diceDamage + strBonus };
}

// 행운 수치에 따라 보스 처치 보상을 3택 대신 4택으로 제공할 확률.
export function bossExtraChoiceChance(luk: number): number {
  return Math.min(LUK_BOSS_EXTRA_CAP, luk * LUK_BOSS_EXTRA_PER_POINT);
}

// 3개 재무 지표(sub, 0~1 clamp01된 정규화 점수 — computeValueScore가 이미 계산)를 3개 전투
// 스탯(1~10 양의 정수)으로 매핑. 데이터 없는 지표는 sub=0(최저값)으로 처리돼 NaN이 안 생김.
// PER(역방향)은 "환급" 계산식을 그대로 재사용해 포켓몬식 PP(maxUses)로 재해석한 것.
export function cardStats(item: any): CardStats {
  const parts = computeValueScore(item).parts;
  const sub = (key: string) => parts.find(p => p.key === key)?.sub ?? 0;
  return {
    attack: 1 + Math.round(sub("roe") * 9),
    shield: 1 + Math.round(sub("ncav") * 9),
    maxUses: 1 + Math.round(sub("per") * 9),
  };
}

const emptyPassive: Required<PassiveEffect> = {
  blockPerTurn: 0, drawBonus: 0, maxHpBonus: 0, damageReduce: 0,
  strBonus: 0, dexBonus: 0, lukBonus: 0, vitBonus: 0, extraDie: false,
};

// 보유 패시브 아이템 전체를 합산한 상시 보너스. 액티브 아이템은 포함하지 않음(발동 시점에만 효과).
export function aggregatePassive(ownedDefs: ItemDef[]): Required<PassiveEffect> {
  const out = { ...emptyPassive };
  for (const def of ownedDefs) {
    if (def.kind !== "passive") continue;
    const e = def.effect as PassiveEffect;
    out.blockPerTurn += e.blockPerTurn ?? 0;
    out.drawBonus += e.drawBonus ?? 0;
    out.maxHpBonus += e.maxHpBonus ?? 0;
    out.damageReduce += e.damageReduce ?? 0;
    out.strBonus += e.strBonus ?? 0;
    out.dexBonus += e.dexBonus ?? 0;
    out.lukBonus += e.lukBonus ?? 0;
    out.vitBonus += e.vitBonus ?? 0;
    out.extraDie = out.extraDie || !!e.extraDie;
  }
  return out;
}

let seq = 0;
const nextId = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;

// 보유 컬렉션(계정 덱) 전체를 전투 카드로 변환 + 셔플. MIN_DECK 미만이면 스타터 카드로 패딩.
export function buildRunDeck(deck: { ticker: string; name: string; count?: number;[k: string]: any }[], starterPool: Omit<CombatCard, "instanceId" | "usesLeft">[]): CombatCard[] {
  const cards: CombatCard[] = [];
  for (const d of deck) {
    const n = Math.max(1, d.count ?? 1);
    for (let i = 0; i < n; i++) {
      const stats = cardStats(d);
      cards.push({ instanceId: nextId(), ticker: d.ticker, name: d.name, item: d, stats, usesLeft: stats.maxUses, isStarter: false });
    }
  }
  while (cards.length < MIN_DECK) {
    const s = starterPool[cards.length % starterPool.length];
    cards.push({ ...s, instanceId: nextId(), usesLeft: s.stats.maxUses });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// 전투 시작 시 1회 호출 — 덱에서 고정 기술셋을 뽑음(드로우 파일이 부족하면 버림 더미를 섞어
// 합침, 슬레이더스파이어 표준 리셔플 규칙). 뽑힌 기술은 이전 전투에서 소진됐을 수 있으므로
// usesLeft를 전부 maxUses로 새로 채워 반환한다.
export function drawHand(drawPile: CombatCard[], discardPile: CombatCard[], handSize: number): { hand: CombatCard[]; drawPile: CombatCard[]; discardPile: CombatCard[] } {
  let draw = [...drawPile], discard = [...discardPile];
  const hand: CombatCard[] = [];
  for (let i = 0; i < handSize; i++) {
    if (draw.length === 0) {
      if (discard.length === 0) break; // 덱 전체가 손패에 나가 있으면 그냥 적은 수로 진행
      draw = discard;
      for (let k = draw.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1));[draw[k], draw[j]] = [draw[j], draw[k]]; }
      discard = [];
    }
    const card = draw.pop()!;
    hand.push({ ...card, usesLeft: card.stats.maxUses });
  }
  return { hand, drawPile: draw, discardPile: discard };
}

// 적 = 실제 종목 카드에서 뽑되, 보스/정예는 강한 등급 풀 우선. HP는 층수 비례 + 카드 자체의 등급
// 상관 스탯(shield) + 보스/정예 배율.
export function enemyForFloor(pool: any[], floor: number, encounter: EnemyEncounter): EnemyState {
  const strong = pool.filter(it => ["gold", "diamond", "treasure", "legend"].includes(computeValueScore(it).tone));
  const source = (encounter === "boss" || encounter === "elite") && strong.length > 0 ? strong : pool;
  const item = source[Math.floor(Math.random() * source.length)];
  const stats = cardStats(item);
  const mult = encounter === "boss" ? BOSS_MULT : encounter === "elite" ? ELITE_MULT : 1;
  const baseHp = ENEMY_BASE_HP + floor * ENEMY_PER_FLOOR + stats.shield * ENEMY_HP_PER_SHIELD;
  const maxHp = Math.round(baseHp * mult);
  const attack = stats.attack + Math.floor(floor / 3);
  return { item, stats, hp: maxHp, maxHp, nextAttack: attack, encounter };
}

// 기술(카드) 한 장 발동 — PP(usesLeft)가 없으면 그대로 반환(호출부에서 사전에 막아야 함, 여기선
// 방어적으로만 처리). 공격력은 고정 데미지가 아니라 rollAttack()으로 굴린 값 — charStats/passive의
// 힘/민첩/행운/어드밴티지가 그대로 반영된다. 1기술=1턴이라 사용 즉시 곧바로 적 턴으로 이어진다.
export function playCard(
  player: PlayerState, enemy: EnemyState, card: CombatCard,
  passive: Required<PassiveEffect>, charStats: CharacterStats,
): { player: PlayerState; enemy: EnemyState; roll: AttackRollResult } {
  if (card.usesLeft <= 0) return { player, enemy, roll: rollAttack(0) };
  const roll = rollAttack(card.stats.attack, {
    advantage: passive.extraDie,
    str: charStats.str + passive.strBonus,
    dex: charStats.dex + passive.dexBonus,
    luk: charStats.luk + passive.lukBonus,
  });
  const nextPlayer: PlayerState = { ...player, block: player.block + card.stats.shield };
  const nextEnemy: EnemyState = { ...enemy, hp: Math.max(0, enemy.hp - roll.totalDamage) };
  return { player: nextPlayer, enemy: nextEnemy, roll };
}

// 적 턴 — 적도 동일한 주사위 규칙으로 굴리되(자연 20 크리티컬만 적용, 힘/민첩/행운/어드밴티지
// 없음), 굴린 값에서 블록·데미지감소를 뺀 뒤(최소 0) 플레이어 HP 차감. 블록은 소멸하고 곧바로
// 다음 내 턴을 위한 패시브 기본 블록(blockPerTurn)으로 채워진다 — 1기술=1턴 구조라 별도
// "턴 시작" 단계 없이 이 함수가 턴 경계 역할을 겸한다.
export function resolveEnemyTurn(
  player: PlayerState, enemy: EnemyState, passive: Required<PassiveEffect>,
): { player: PlayerState; roll: AttackRollResult } {
  const roll = rollAttack(enemy.nextAttack);
  const dmg = Math.max(0, roll.totalDamage - player.block - passive.damageReduce);
  return { player: { ...player, hp: Math.max(0, player.hp - dmg), block: passive.blockPerTurn }, roll };
}

// 액티브 아이템 즉시 발동 — 기술과 동일하게 발동 즉시 턴을 소모(호출부에서 이어서 적 턴 진행).
export function useActiveItem(player: PlayerState, enemy: EnemyState, hand: CombatCard[], effect: ActiveEffect) {
  let nextPlayer = { ...player }, nextEnemy = { ...enemy };
  let nextHand = hand;
  if (effect.kind === "damage") nextEnemy.hp = Math.max(0, nextEnemy.hp - effect.amount);
  else if (effect.kind === "heal") nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + effect.amount);
  else if (effect.kind === "block") nextPlayer.block += effect.amount;
  else if (effect.kind === "restorePP") nextHand = hand.map(c => ({ ...c, usesLeft: c.stats.maxUses }));
  return { player: nextPlayer, enemy: nextEnemy, hand: nextHand };
}

export function checkOutcome(player: PlayerState, enemy: EnemyState): "win" | "lose" | null {
  if (enemy.hp <= 0) return "win";
  if (player.hp <= 0) return "lose";
  return null;
}
