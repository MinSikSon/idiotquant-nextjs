// 가치투자 덱빌더 — 전투 판정 순수 로직. React/Phaser 비의존, 결정적(주사위 요소는
// Math.random 직접 호출로 격리돼 있어 나머지는 항상 같은 입력 → 같은 출력).

import { computeValueScore } from "@/lib/utils/valueScore";
import { sectorType, typeMultiplier } from "./sectorTypes";
import { PARTY_SIZE, STARTER_MONSTERS } from "./gameData";
import type {
  CardStats, PassiveEffect, ActiveEffect, ItemDef, EnemyState, PlayerState, SkillDef, SkillState,
  CharacterStats, AttackRollOptions, AttackRollResult, EnemyEncounter, PartyMember,
} from "./gameTypes";

const PARTY_BASE_HP = 16;
const HP_PER_SHIELD_PLAYER = 3; // 카드 자체 방어 스탯(등급과 상관관계)이 파티 몬스터 HP에 미치는 비중
const ENEMY_BASE_HP = 12;
const ENEMY_PER_FLOOR = 3;
const ENEMY_HP_PER_SHIELD = 2; // 뽑힌 카드 자체의 방어 스탯(등급과 상관관계가 있음)도 HP에 반영
const BOSS_MULT = 3;   // "보스는 그 층 몬스터가 스탯 3배로 강화되어 등장"
const ELITE_MULT = 1.5;

export type Effectiveness = "super" | "weak" | "normal";
function effectivenessOf(mult: number): Effectiveness {
  return mult > 1 ? "super" : mult < 1 ? "weak" : "normal";
}

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

// 2개 재무 지표(sub, 0~1 clamp01된 정규화 점수 — computeValueScore가 이미 계산)를 전투 스탯
// (1~10 양의 정수)으로 매핑. 데이터 없는 지표는 sub=0(최저값)으로 처리돼 NaN이 안 생김. 적과
// 파티 몬스터(종목 카드) 양쪽에 공용으로 쓰인다.
export function cardStats(item: any): CardStats {
  const parts = computeValueScore(item).parts;
  const sub = (key: string) => parts.find(p => p.key === key)?.sub ?? 0;
  return {
    attack: 1 + Math.round(sub("roe") * 9),
    shield: 1 + Math.round(sub("ncav") * 9),
  };
}

const emptyPassive: Required<PassiveEffect> = {
  blockPerTurn: 0, maxHpBonus: 0, damageReduce: 0,
  strBonus: 0, dexBonus: 0, lukBonus: 0, vitBonus: 0, extraDie: false,
};

// 보유 패시브 아이템 전체를 합산한 상시 보너스. 액티브 아이템은 포함하지 않음(발동 시점에만 효과).
export function aggregatePassive(ownedDefs: ItemDef[]): Required<PassiveEffect> {
  const out = { ...emptyPassive };
  for (const def of ownedDefs) {
    if (def.kind !== "passive") continue;
    const e = def.effect as PassiveEffect;
    out.blockPerTurn += e.blockPerTurn ?? 0;
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
  return { item, stats, sectorType: sectorType(item), hp: maxHp, maxHp, nextAttack: attack, encounter };
}

// 육성(진화) — 파티 몬스터는 이번 런에서 전투로 얻는 경험치(xp)만큼 유아기→청년기→성인으로
// 성장한다(런 종료 시 리셋, 계정에 영구 저장되지 않음). xp는 PartyMember에 그대로 저장하고
// 단계/보정 스탯은 항상 이 파생 함수들로만 계산 — 저장된 값과 어긋나는 걸 원천 차단하기 위함
// (파티 HP 표시 버그 때와 같은 이유).
export type GrowthStage = 0 | 1 | 2;
export const STAGE_LABELS = ["유아기", "청년기", "성인"] as const;
const STAGE_XP_THRESHOLDS: [number, number, number] = [0, 50, 150];
const STAGE_STAT_MULT = [1, 1.25, 1.5];
export const XP_PER_MONSTER_ATTACK = 3; // 공격 기술 사용마다
export const WIN_XP_BONUS = 15; // 층 클리어(승리) 시 추가

export function stageForXp(xp: number): GrowthStage {
  if (xp >= STAGE_XP_THRESHOLDS[2]) return 2;
  if (xp >= STAGE_XP_THRESHOLDS[1]) return 1;
  return 0;
}
// 성장 단계만큼 보정된 실전투 스탯 — monsterSkills/HP 계산 전부 이 값을 쓴다(원본 stats는
// 카드 자체 base로 절대 안 건드림).
export function growthStats(stats: CardStats, xp: number): CardStats {
  const mult = STAGE_STAT_MULT[stageForXp(xp)];
  return { attack: Math.max(1, Math.round(stats.attack * mult)), shield: Math.max(1, Math.round(stats.shield * mult)) };
}
export function growthMaxHp(stats: CardStats, xp: number): number {
  return PARTY_BASE_HP + growthStats(stats, xp).shield * HP_PER_SHIELD_PLAYER;
}

// 파티 몬스터 공통 기술 템플릿 — 각 몬스터 자기 카드 스탯(attack/shield, 성장 보정 반영)으로
// 스케일된 4기술을 갖는다(공격 약/강·방어·회복). 성인(stage 2)이 되면 "약공격"이 훨씬 강한
// "필살기"로 바뀐다(해금) — 그리드가 정확히 4칸이라 5번째를 늘리는 대신 교체하는 방식.
// PP는 기술마다 다른 예산을 둬 사용 판단에 무게를 준다.
export function monsterSkills(stats: CardStats, stage: GrowthStage = 0): SkillDef[] {
  const atk1: SkillDef = stage >= 2
    ? { id: "ultimate", name: "필살기", effect: "attack", power: Math.round(stats.attack * 2.5), maxPP: 5 }
    : { id: "atk1", name: "약공격", effect: "attack", power: stats.attack, maxPP: 20 };
  return [
    atk1,
    { id: "atk2", name: "강공격", effect: "attack", power: Math.round(stats.attack * 1.8), maxPP: 10 },
    { id: "def1", name: "방어", effect: "shield", power: stats.shield, maxPP: 20 },
    { id: "heal1", name: "회복", effect: "heal", power: Math.max(1, Math.round((stats.attack + stats.shield) / 2)), maxPP: 8 },
  ];
}

// 던전 입장 시 파티 구성 — 파티 설정 화면에서 유저가 고른 카드(최대 PARTY_SIZE장, 순서 무관)를
// 그대로 쓰고, 부족하면 STARTER_MONSTERS로 채운다. 런 내내 고정(중간 합류/이탈 없음), xp는 0부터.
export function buildParty(chosenCards: any[]): PartyMember[] {
  const members: PartyMember[] = chosenCards.slice(0, PARTY_SIZE).map(card => {
    const stats = cardStats(card);
    const maxHp = PARTY_BASE_HP + stats.shield * HP_PER_SHIELD_PLAYER;
    return {
      instanceId: `p_${card.ticker}`, ticker: String(card.ticker), name: String(card.name),
      tone: computeValueScore(card).tone, sectorType: sectorType(card),
      stats, hp: maxHp, maxHp, xp: 0,
    };
  });
  let i = 0;
  while (members.length < PARTY_SIZE) {
    const starter = STARTER_MONSTERS[i % STARTER_MONSTERS.length];
    const maxHp = PARTY_BASE_HP + starter.stats.shield * HP_PER_SHIELD_PLAYER;
    members.push({
      instanceId: `starter_${i}`, ticker: `STARTER${i}`, name: starter.name,
      tone: "explore", sectorType: null, stats: starter.stats, hp: maxHp, maxHp, xp: 0,
    });
    i++;
  }
  return members;
}

// 기술 한 장 발동(PP 체크는 호출부 책임 — 이 함수는 PP 상태를 모름, useGameRun의 SkillState가
// 별도로 관리). 효과별로 분기: attack=rollAttack()으로 굴린 데미지(charStats/passive의 힘/민첩/
// 행운/어드밴티지 + 업종 상성 배율까지 반영), shield=고정 블록 추가, heal=고정 HP 회복. 1기술=1턴
// 이라 사용 즉시 곧바로 적 턴으로 이어진다(roll은 attack일 때만 존재).
export function useSkillEffect(
  player: PlayerState, enemy: EnemyState, def: SkillDef,
  passive: Required<PassiveEffect>, charStats: CharacterStats,
  atkType: string | null, defType: string | null,
): { player: PlayerState; enemy: EnemyState; roll: AttackRollResult | null; effectiveness: Effectiveness } {
  if (def.effect === "attack") {
    const roll = rollAttack(def.power, {
      advantage: passive.extraDie,
      str: charStats.str + passive.strBonus,
      dex: charStats.dex + passive.dexBonus,
      luk: charStats.luk + passive.lukBonus,
    });
    const mult = typeMultiplier(atkType, defType);
    const totalDamage = Math.max(1, Math.round(roll.totalDamage * mult));
    return {
      player, enemy: { ...enemy, hp: Math.max(0, enemy.hp - totalDamage) },
      roll: { ...roll, totalDamage }, effectiveness: effectivenessOf(mult),
    };
  }
  if (def.effect === "shield") {
    return { player: { ...player, block: player.block + def.power }, enemy, roll: null, effectiveness: "normal" };
  }
  return { player: { ...player, hp: Math.min(player.maxHp, player.hp + def.power) }, enemy, roll: null, effectiveness: "normal" };
}

// 적 턴 — 적도 동일한 주사위 규칙으로 굴리되(자연 20 크리티컬만 적용, 힘/민첩/행운/어드밴티지
// 없음), 업종 상성 배율을 적용한 뒤 블록·데미지감소를 뺀 값(최소 0)을 플레이어 HP에서 차감한다.
// 블록은 소멸하고 곧바로 다음 내 턴을 위한 패시브 기본 블록(blockPerTurn)으로 채워진다 — 1기술=
// 1턴 구조라 별도 "턴 시작" 단계 없이 이 함수가 턴 경계 역할을 겸한다.
export function resolveEnemyTurn(
  player: PlayerState, enemy: EnemyState, passive: Required<PassiveEffect>,
  atkType: string | null, defType: string | null,
): { player: PlayerState; roll: AttackRollResult; effectiveness: Effectiveness } {
  const roll = rollAttack(enemy.nextAttack);
  const mult = typeMultiplier(atkType, defType);
  const totalDamage = Math.max(1, Math.round(roll.totalDamage * mult));
  const dmg = Math.max(0, totalDamage - player.block - passive.damageReduce);
  return {
    player: { ...player, hp: Math.max(0, player.hp - dmg), block: passive.blockPerTurn },
    roll: { ...roll, totalDamage }, effectiveness: effectivenessOf(mult),
  };
}

// 액티브 아이템 즉시 발동 — 기술과 동일하게 발동 즉시 턴을 소모(호출부에서 이어서 적 턴 진행).
// restorePP는 파티 전원의 기술을 각자의 maxPP로 되돌림(skillDefsByOwner: PartyMember.instanceId →
// 그 몬스터의 monsterSkills() 결과, PP 상한 조회용).
export function useActiveItem(
  player: PlayerState, enemy: EnemyState, skills: SkillState[],
  skillDefsByOwner: Map<string, SkillDef[]>, effect: ActiveEffect,
) {
  let nextPlayer = { ...player }, nextEnemy = { ...enemy };
  let nextSkills = skills;
  if (effect.kind === "damage") nextEnemy.hp = Math.max(0, nextEnemy.hp - effect.amount);
  else if (effect.kind === "heal") nextPlayer.hp = Math.min(nextPlayer.maxHp, nextPlayer.hp + effect.amount);
  else if (effect.kind === "block") nextPlayer.block += effect.amount;
  else if (effect.kind === "restorePP") nextSkills = skills.map(s => {
    const def = skillDefsByOwner.get(s.ownerId)?.find(d => d.id === s.skillId);
    return def ? { ...s, pp: def.maxPP } : s;
  });
  return { player: nextPlayer, enemy: nextEnemy, skills: nextSkills };
}

export function checkOutcome(player: PlayerState, enemy: EnemyState): "win" | "lose" | null {
  if (enemy.hp <= 0) return "win";
  if (player.hp <= 0) return "lose";
  return null;
}
