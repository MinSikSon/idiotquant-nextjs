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
 * 카드가 어느 갈래인가. **화면의 색과 표식이 여기서 나온다.**
 *
 *   info   정보 — 앞으로 무엇이 올지 본다
 *   act    집행 — 이번 턴 무엇을 할 수 있는가
 *   guard  방어 — 맞을 것을 덜 맞는다
 *   curse  저주 — 그 턴을 버리게 만든다
 *
 * 카드가 열두 장인데 전부 같은 회색 상자면 무엇이 무엇인지 볼 수 없다. 갈래가 색이면
 * 손패 셋을 읽기 전에 이미 "읽을 것 / 할 것 / 막을 것" 이 갈린다.
 */
export type CardLane = "info" | "act" | "guard" | "curse";

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
    lane: CardLane;
    kind: CardKind;
    /** 손패에 늘 보이는 한 줄. 셋을 한눈에 훑을 수 있어야 한다. */
    shortDescription: string;
    /** 눌러서 펼쳤을 때 나오는 것. */
    effectDescription: string;
    /** 언제 쓰는 카드인가. 자세히 펼쳤을 때 함께 나온다. 강화해도 안 바뀐다. */
    when: string;
    /**
     * 강화 단계(0~3). **`name` 에 이미 `+N` 이 붙어 있지만** 화면이 뱃지를 따로 그린다 —
     * 이름 끝의 두 글자는 세 장이 나란히 선 자리에서 눈에 안 들어온다.
     */
    level: number;
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
    /**
     * 몇 턴 동안 수수료·거래세를 안 내는가. 0 이면 이 카드로는 면제가 없다.
     *
     * `feeMult` 와 나뉘어 있는 이유: 저 값은 **이번 턴의 배수**이고 이것은 **남는 턴 수**다.
     * 매니저가 세다가 남아 있는 동안 `feeMult` 를 0 으로 만든다 — 예보와 같은 구조다.
     */
    feeFreeTurns: number;
    /** 손절 예약이 몇 턴 걸려 있는가. 위와 같은 이유로 `stopLoss` 와 나뉜다. */
    stopLossTurns: number;
    /**
     * 국면을 **몇 겹까지** 읽는가. 0 이면 아무것도 못 본다.
     *
     *   1  지금 국면 + 턴당 평균 등락
     *   2  + 이 국면이 몇 턴 남았는가
     *   3  + 다음에 올 국면
     *   4  + 다음 국면의 턴당 평균 등락
     *
     * 예전에는 `revealRegime` · `revealClock` 두 불리언이었다. 카드가 강화되며 정보가 한
     * 겹씩 벗겨지는 지금은 **깊이 하나**가 그 순서를 그대로 말한다 — 불리언 넷을 늘어놓으면
     * "무엇이 무엇보다 센가" 가 타입에서 안 보인다.
     */
    regimeDepth: number;
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
    feeFreeTurns: 0,
    stopLossTurns: 0,
    regimeDepth: 0,
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
    /**
     * 이 국면의 **턴당 평균 등락(%)**. 못 읽었으면 null.
     *
     * "상승" 이라는 단어 하나로는 얼마나 오르는지를 모른다. 국면을 읽는 카드가 값어치를
     * 가지려면 그 단어가 숫자로 바뀌어야 한다 — 그래야 얼마나 걸지를 정할 수 있다.
     */
    regimeDrift: number | null;
    /** 이 국면이 몇 턴 더 가는가. 못 읽었으면 null. */
    turnsLeft: number | null;
    /** 이 국면 다음에 올 것. 못 읽었거나 판이 끝나면 null. */
    nextRegime: Regime | null;
    /** 다음 국면의 턴당 평균 등락(%). 못 읽었으면 null. */
    nextDrift: number | null;
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
    /** 자본잠식선 아래로 떨어졌는가. **게임이 끝난다** — 자금도 덱도 처음으로 돌아간다. */
    ruined: boolean;
    /** 판이 끝났을 때의 덱. 다음 판이 이것으로 시작한다. */
    deck: string[];
}
