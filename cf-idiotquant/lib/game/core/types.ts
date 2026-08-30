// 판을 이루는 것들. **Phaser 를 모르는 자리다** — 여기 있는 것은 전부 순수한 값이고,
// 화면이 어떻게 생겼는지는 하나도 들어오지 않는다.
//
// 금액은 전부 정수 원이다. 평단가만은 나눗셈이라 소수를 허용한다.

/** 하루(한 턴) 봉 하나. */
export interface Candle {
    o: number;
    h: number;
    l: number;
    c: number;
}

export interface Stock {
    id: string;
    name: string;
    ticker: string;
    currentPrice: number;
    /** 한 턴 변동폭의 기준(0.02 = 2%). 종목마다 다르고 판 중에는 안 바뀐다. */
    volatility: number;
    /** 0번이 가장 오래된 봉. 화면은 뒤에서 12개만 그린다. */
    history: Candle[];
}

/**
 * 전략 카드의 종류. 무엇을 건드리는지로 갈라 둔다 —
 * `price` 는 다음 틱의 주가를, `trade` 는 체결 규칙을, `instant` 는 즉시 계좌를 건드린다.
 */
export type CardType = "price" | "trade" | "instant";

/**
 * 카드가 어디서 오는가.
 *
 *   starter  시작 덱에 들어 있는 것. 약하지만 안정적이다.
 *   reward   판 도중 보상으로 얻는 것. 세다.
 *   curse    센 카드에 딸려 오는 것. 덱을 더럽힌다.
 */
export type CardKind = "starter" | "reward" | "curse";

export interface StrategyCard {
    /**
     * 이 **장**의 번호. 같은 카드를 덱에 두 장 넣을 수 있으므로 id 로는 한 장을 못 짚는다.
     * 손패에서 무엇을 골랐는지, 어느 장을 버렸는지가 전부 이 값으로 갈린다.
     */
    uid: string;
    /** 카드의 **종류**. 효과는 이 값으로 찾는다. */
    id: string;
    name: string;
    type: CardType;
    kind: CardKind;
    effectDescription: string;
    isUsed: boolean;
    /**
     * 이 카드를 **얻으면** 덱에 함께 들어오는 저주의 이름. 보상 화면이 값을 미리 말하는
     * 자리라 여기 둔다 — 고르고 나서 알게 되면 그건 고른 것이 아니다.
     */
    curseName?: string;
}

/** 유물이 언제 터지는가. */
export type RelicTrigger = "onTurnStart" | "onTrade" | "onTurnEnd";

export interface Relic {
    id: string;
    name: string;
    description: string;
    triggerType: RelicTrigger;
}

export interface PlayerState {
    /** 현금(원). 시작은 1,000만. */
    cash: number;
    shares: number;
    /** 평단가. 안 들고 있으면 0. */
    avgPrice: number;
    /** 1부터 시작한다. maxTurns 를 넘기면 판이 끝난 것이다. */
    currentTurn: number;
    maxTurns: number;
    /** 판을 넘어 쌓이는 점수. 다음 런의 유물이 여기서 나온다. */
    insightPoints: number;
}

/**
 * 카드가 이번 턴에 열어 주는 것. 한 턴이 지나면 사라진다.
 *
 * 카드마다 필드를 따로 두지 않고 이 한 덩어리로 모은 이유: 카드를 하나 더 만들 때
 * 엔진의 함수 시그니처를 안 고치려는 것이다. 새 효과는 여기에 필드 하나만 는다.
 */
export interface TurnBuff {
    /** 다음 틱의 수익률에 그대로 더한다(0.1 = +10%p). 인사이더 호재. */
    priceBias: number;
    /** 변동폭 배수. 1 이면 그대로, 2 면 두 배로 흔들린다. */
    volatilityMult: number;
    /** 내렸을 때만 그 하락폭을 이만큼 되돌린다(0.5 = 절반 회복). 급반등 유도. */
    reboundRatio: number;
    /** 내리는 쪽 폭만 이만큼 줄인다(0.5 = 절반). 방어막. */
    downshieldRatio: number;
    /** 이번 턴 매도 수수료·세금을 면제한다. */
    feeWaived: boolean;
}

/** 아무 카드도 안 쓴 턴. */
export const NO_BUFF: TurnBuff = {
    priceBias: 0,
    volatilityMult: 1,
    reboundRatio: 0,
    downshieldRatio: 0,
    feeWaived: false,
};

/** 한 틱이 실제로 무엇을 했는가. 화면이 뉴스 티커에 그대로 쓴다. */
export interface TickResult {
    candle: Candle;
    /** 이 턴의 등락률(%) */
    changePct: number;
    /** 뉴스가 터졌으면 그 문구, 아니면 null */
    news: string | null;
}

/** 체결 하나의 결과. 실패하면 왜 안 됐는지를 준다. */
export type TradeResult =
    | { ok: true; side: "buy" | "sell"; qty: number; price: number; fee: number; cash: number }
    | { ok: false; error: string };

/** 덱이 지금 어떤 상태인가. HUD 한 줄이 이걸 읽는다. */
export interface DeckState {
    /** 아직 안 뽑은 장 수 */
    draw: number;
    /** 버린 더미 */
    discard: number;
    /** 덱 전체 */
    total: number;
    /** 그중 저주 — 덱이 얼마나 더러운가 */
    curses: number;
}

/** 판이 끝났을 때의 성적. */
export interface RunSummary {
    /** 시작 자산 대비 최종 자산(%) */
    returnPct: number;
    startEquity: number;
    finalEquity: number;
    /** 이 판에서 번 인사이트 포인트. 청산된 판은 0 이다. */
    earnedIP: number;
    /** 종목을 안 사고 12턴을 흘려보냈는가 */
    idle: boolean;
    /** 12턴을 못 채우고 청산선 아래로 떨어졌는가. 이 판은 **진 것**이다. */
    bankrupt: boolean;
}
