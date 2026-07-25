// 가치투자 덱빌더 — 공유 타입. React/Phaser 비의존.

export type Phase = "loading" | "battling" | "resolved" | "over" | "event" | "shop";
export type EncounterType = "battle" | "boss" | "rest" | "elite";
export type EnemyEncounter = "battle" | "boss" | "elite"; // 실제로 적이 등장하는 조우만(휴식 제외)

// 적(실제 종목) 전투 스탯 — ROE→공격력, NCAV→방어력/HP(combatEngine.cardStats 참고). 플레이어
// 기술은 더 이상 종목 카드에서 오지 않고 직업별 고정 세트(SkillDef, 아래)를 씀.
export interface CardStats {
  attack: number; // ROE
  shield: number; // NCAV
}

export type PassiveEffect = {
  blockPerTurn?: number;     // 턴 시작 시 자동 블록
  maxHpBonus?: number;       // 최대 HP 증가
  damageReduce?: number;     // 적 공격 데미지 감소
  strBonus?: number;         // 이번 런 한정 힘(STR) 보너스
  dexBonus?: number;         // 이번 런 한정 민첩(DEX) 보너스
  lukBonus?: number;         // 이번 런 한정 행운(LUK) 보너스
  vitBonus?: number;         // 이번 런 한정 체력(VIT) 보너스
  extraDie?: boolean;        // 공격 기술 주사위 굴림에 어드밴티지(2개 굴려 높은 값) 적용
};

export type ActiveEffect =
  | { kind: "damage"; amount: number }
  | { kind: "heal"; amount: number }
  | { kind: "block"; amount: number }
  | { kind: "restorePP" }; // 보유한 모든 기술의 PP를 최대치로 회복

// 직업별 고정 기술 — 종목 카드가 아니라 미리 정의된 세트(전사: 주먹 휘두르기/강타/방어/
// 기력회복). power는 효과별 의미가 다름: attack=주사위 기본 데미지, shield=고정 블록량,
// heal=고정 회복량. PP(usesLeft에 대응하는 SkillState.pp)는 던전 진행 내내 유지되며(전투를
// 이겨도 자동 회복 안 됨) 상점의 PP 회복 물약으로만 채워진다.
export type SkillEffectKind = "attack" | "shield" | "heal";
export interface SkillDef {
  id: string;
  name: string;
  effect: SkillEffectKind;
  power: number;
  maxPP: number;
}
export interface SkillState { skillId: string; pp: number }

// 전투 중 하위 화면 — 매 내 턴마다 "action"(전투/아이템/도망치기/월드맵 선택)에서 시작해,
// "전투"를 고르면 "skills"(기술 목록)로, "아이템"을 고르면 "items"(보유 아이템 사용)로 전환.
export type BattleMenu = "action" | "skills" | "items";

export type ItemKind = "passive" | "active";
export interface ItemDef {
  id: string;
  kind: ItemKind;
  name: string;
  desc: string;
  icon: string;
  isLegend?: boolean;
  achievementId?: string; // 전설급 아이템 해금 조건(업적 id)
  tier?: 1 | 2 | 3; // 스탯 부스트 아이템 등급(lv2=lv1×2, lv3=lv1×4) — 없으면 티어 배지 미표시
  effect: PassiveEffect | ActiveEffect;
}

// 보유 아이템 인스턴스 — 액티브는 소모되면 목록에서 제거됨
export interface OwnedItem { instanceId: string; defId: string }

export interface EnemyState {
  item: any;
  stats: CardStats;
  hp: number;
  maxHp: number;
  nextAttack: number; // 주사위 굴림의 base — 실제 피해는 0~nextAttack 범위에서 결정됨
  encounter: EnemyEncounter; // 정예/보스 상시 표시용
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  block: number;
}

// 캐릭터(계정에 영구 저장) — 던전 런과 무관하게 유지되는 레벨/능력치.
export interface CharacterStats { str: number; dex: number; luk: number; vit: number }
export type CharClass = "warrior"; // 현재는 전사만 선택 가능 — 다른 직업 추가 시 유니온만 확장
export interface CharacterState {
  classId: CharClass;
  level: number; // 1~99
  xp: number;    // 다음 레벨까지 진행도(레벨업 시 초과분 이월, 누적 총량 아님)
  stats: CharacterStats;
}

// 주사위 굴림 — 카드 공격/적 공격 판정 결과.
export interface AttackRollOptions {
  advantage?: boolean; // 어드밴티지 아이템 보유 시(플레이어 전용) 2개 굴려 높은 값 채택
  str?: number; dex?: number; luk?: number; // 플레이어 전용 — 몬스터는 넘기지 않음
}
export interface AttackRollResult {
  faces: number[];        // 실제로 굴린 주사위 눈(어드밴티지면 2개)
  rawFace: number;        // 채택된 원본 눈(민첩 보정 전) — 크리티컬 판정 기준
  effectiveFace: number;  // 민첩 보정 적용 후(최대 20)
  isCrit: boolean;
  diceDamage: number;     // 크리티컬 배율까지 반영된 주사위 데미지(힘 보너스 제외)
  strBonus: number;
  totalDamage: number;    // diceDamage + strBonus — 실제 적용되는 최종 피해
}

// 전투 로그 한 줄 — D&D 전투기록처럼 실제 수치를 담아 쌓아가는 메시지.
export type LogKind = "player" | "enemy" | "item" | "system";
export interface LogEntry { id: string; kind: LogKind; text: string }
