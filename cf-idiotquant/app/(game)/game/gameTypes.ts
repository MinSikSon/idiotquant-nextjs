// 가치투자 덱빌더 — 공유 타입. React/Phaser 비의존.

export type Phase = "loading" | "battling" | "resolved" | "over" | "event";
export type EncounterType = "battle" | "boss" | "merchant" | "rest" | "elite";

// 4개 재무 지표 → 4개 전투 스탯, 전부 1~10 양의 정수(combatEngine.cardStats 참고).
export interface CardStats {
  attack: number; // ROE
  shield: number; // NCAV
  cost: number;   // PBR(역방향, 낮을수록 저평가)
  refund: number; // PER(역방향) — 다음 턴 시작 시 미리 충전되는 예약 에너지
}

// 손패/전장에 올라가는 카드 한 장(실제 종목 데이터 + 계산된 전투 스탯).
export interface CombatCard {
  instanceId: string; // 같은 종목 중복 보유분을 구분하기 위한 고유 id
  ticker: string;
  name: string;
  item: any;           // 원본 종목 데이터(카드 아트/등급 표시용)
  stats: CardStats;
  isStarter: boolean;  // 스타터 카드는 계정 덱(D1)에 저장되지 않음
}

export type PassiveEffect = {
  blockPerTurn?: number;     // 턴 시작 시 자동 블록
  drawBonus?: number;        // 손패 드로우 매수 증가
  energyBonus?: number;      // 턴 시작 에너지 증가
  maxHpBonus?: number;       // 최대 HP 증가
  damageReduce?: number;     // 적 공격 데미지 감소
  freeCostThreshold?: number; // 이 값 이하 코스트인 카드는 무료
};

export type ActiveEffect =
  | { kind: "damage"; amount: number }
  | { kind: "heal"; amount: number }
  | { kind: "block"; amount: number }
  | { kind: "draw"; amount: number };

export type ItemKind = "passive" | "active";
export interface ItemDef {
  id: string;
  kind: ItemKind;
  name: string;
  desc: string;
  icon: string;
  isLegend?: boolean;
  achievementId?: string; // 전설급 아이템 해금 조건(업적 id)
  effect: PassiveEffect | ActiveEffect;
}

// 보유 아이템 인스턴스 — 액티브는 소모되면 목록에서 제거됨
export interface OwnedItem { instanceId: string; defId: string }

export interface EnemyState {
  item: any;
  stats: CardStats;
  hp: number;
  maxHp: number;
  nextAttack: number; // 텔레그래프에 표시되는, 다음 적 턴에 실제로 들어올 공격력
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  block: number;
  energy: number;
  energyMax: number;
}

// 전투 로그 한 줄 — D&D 전투기록처럼 실제 수치를 담아 쌓아가는 메시지.
export type LogKind = "player" | "enemy" | "item" | "system";
export interface LogEntry { id: string; kind: LogKind; text: string }
