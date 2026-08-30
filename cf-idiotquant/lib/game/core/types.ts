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
 * 시장의 **숨은 국면**. 3~5턴 이어지다 다른 것으로 바뀐다.
 *
 * 이것이 이 게임의 심장이다. 예전 주가는 순수 랜덤워크라 오른 턴 다음에 또 오를 확률이
 * 51.6% — 사실상 동전 던지기였고, 그래서 차트가 장식이었다. 추세를 읽는 정책과 아무렇게나
 * 누르는 정책의 성적이 구분되지 않았다.
 *
 * 국면이 이어지면 **과거 봉이 미래를 말하기 시작한다.** 초록이 몇 개 이어지면 상승
 * 국면일 확률이 높고, 그러면 탈 값어치가 있다. 하락 국면에 들고 있으면 진짜로 죽는다 —
 * 그래서 비로소 **현금이 정답인 순간**이 생긴다.
 */
export type Regime = "bull" | "bear" | "chop";

/**
 * 카드가 이번 턴에 열어 주는 것. 한 턴이 지나면 사라진다.
 *
 * ── 카드는 주가를 밀지 않는다 ─────────────────────────────────
 * 예전에는 "이번 턴 +7%p" 같은 카드가 있었다. 트레이더가 시세를 조종하는 셈이라
 * 앞뒤가 안 맞았고, 고를 때 "큰 숫자" 말고 기준이 없었다.
 *
 * 지금 카드가 바꾸는 것은 **시장이 아니라 나**다. 세 갈래뿐이다.
 *
 *   정보  앞으로 무엇이 올지 본다      (peekTurns · revealRegime · revealClock)
 *   집행  이번 턴 무엇을 할 수 있는가   (feeMult · buyingPowerMult · stopLoss)
 *   방어  맞을 것을 덜 맞는다          (moveMult · downshieldRatio)
 *
 * 한 덩어리로 모아 두는 이유는 그대로다 — 카드를 하나 더 만들 때 엔진의 함수 모양을
 * 안 고치려는 것이다.
 */
export interface TurnBuff {
    /** 이번 턴 등락을 이만큼 곱한다(0.5 = 절반, 2 = 두 배). 헤지·증폭. */
    moveMult: number;
    /** 내리는 쪽 폭만 이만큼 줄인다(0.9 = 90% 막음). 벙커·방탄 조끼. */
    downshieldRatio: number;
    /** 이번 턴 수수료·거래세 배수. 0 이면 면제, 3 이면 세 배. */
    feeMult: number;
    /** 이번 턴 매수 한도 배수. 2 면 현금의 두 배까지 살 수 있다(신용). */
    buyingPowerMult: number;
    /** 하락이 이 값을 넘으면 그 턴에 자동으로 전량 매도(0.08 = −8%). 0 이면 없음. */
    stopLoss: number;
    /** 앞으로 몇 턴의 등락을 미리 보는가. 0 이면 못 본다. */
    peekTurns: number;
    /** 지금 국면을 알려 주는가. */
    revealRegime: boolean;
    /** 지금 국면이 몇 턴 남았는지 알려 주는가. */
    revealClock: boolean;
    /** 이번 턴 현금에서 이 비율만큼 빠져나간다(0.05 = 5%). 이자. */
    cashDrainPct: number;
    /** 저주 — 이번 턴은 무엇을 써도 안 보인다. */
    blind: boolean;
}

/** 아무 카드도 안 쓴 턴. */
export const NO_BUFF: TurnBuff = {
    moveMult: 1,
    downshieldRatio: 0,
    feeMult: 1,
    buyingPowerMult: 1,
    stopLoss: 0,
    peekTurns: 0,
    revealRegime: false,
    revealClock: false,
    cashDrainPct: 0,
    blind: false,
};

/**
 * 지금 **읽어 낸 것**. 화면은 이것만 그린다 — 엔진이 아는 전부를 그리면 게임이 없다.
 *
 * 판의 주가는 시드에서 통째로 미리 정해져 있다. 그래서 예보는 없던 미래를 만드는 것이
 * 아니라 **이미 정해진 것을 앞당겨 보는 것**이다. 정보가 곧 값어치가 되는 자리다.
 */
export interface MarketRead {
    /** 앞으로의 등락률(%). 본 만큼만 채워진다. 방어 카드를 쓰면 실제로는 달라진다. */
    next: number[];
    /** 지금 국면. 못 읽었으면 null. */
    regime: Regime | null;
    /** 이 국면이 몇 턴 더 가는가. 못 읽었으면 null. */
    turnsLeft: number | null;
}

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
