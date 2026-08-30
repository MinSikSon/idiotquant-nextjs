// 판의 규칙. **Phaser 를 모른다** — 여기 있는 함수들은 값을 받아 값을 돌려줄 뿐이고,
// 그래서 화면 없이도 돌려 볼 수 있다.
//
// ── 왜 시드를 쓰나 ──────────────────────────────────────────────
// 로그라이크는 "그 판이 어땠는지" 를 말할 수 있어야 한다. Math.random 을 그대로 쓰면
// 같은 판을 두 번 볼 수 없고, 무엇이 이상했는지 되짚을 수도 없다. 시드 하나로 판 전체가
// 결정되게 해 두면 같은 시드가 늘 같은 판을 준다.

import type {
    Candle, PlayerState, Stock, TickResult, TradeResult, TurnBuff, RunSummary,
} from "./types";

/* ── 상수 ───────────────────────────────────────────────────── */

export const START_CASH = 10_000_000;
export const MAX_TURNS = 12;

/**
 * 청산선 — 시작 자금의 이 비율 아래로 떨어지면 12턴을 못 채우고 그 자리에서 끝난다.
 * 맡긴 돈이 회수되는 것이지 빚을 지는 것은 아니라, 코드에서는 `bust` 로 부른다.
 *
 * 이 게임에는 **지는 방법**이 있어야 한다. 지금까지는 얼마를 잃든 12턴을 채웠고, 그래서
 * 올인이 언제나 옳았다. 잃을 것이 생겨야 카드 한 장, 매수 한 번이 무거워진다.
 *
 * 0.75 는 눈대중이 아니라 재서 고른 값이다(600판 x 4가지 방식):
 *
 *     선      맨몸 올인   맨몸 절반   강화2   강화4
 *     0.70      5%         0%        0%      0%
 *     0.75      8%         0%        1%      1%     ← 여기
 *     0.85     19%         5%        7%      5%
 *
 * 아무것도 못 쌓은 채 올인하면 열두 판에 한 번쯤 잘리고, 절반만 사거나 시작 덱을
 * 강화해 두면 거의 안 잘린다. **쌓은 것이 곧 안전**이 되는 자리를 만드는 값이다.
 */
export const BUST_RATIO = 0.75;

// 수수료는 분수로 두고 정수 연산으로 계산한다. 0.00015 를 곱하면
// 700000 * 0.00015 === 104.99999999999999 라 floor 가 105 대신 104 를 준다.
const FEE_DENOM = 100_000;
export const BUY_FEE_NUM = 15;    // 0.015%
export const SELL_FEE_NUM = 15;   // 0.015%
export const SELL_TAX_NUM = 180;  // 0.18% 거래세 (매도만)

const cut = (gross: number, num: number) => Math.floor((gross * num) / FEE_DENOM);

/** 뉴스가 터질 확률과 그 충격의 크기(±5%~25%). */
const NEWS_CHANCE = 0.28;
const NEWS_MIN = 0.05;
const NEWS_MAX = 0.25;

/** 한 틱이 낼 수 있는 등락의 한계. 이게 없으면 카드 둘이 겹쳐 주가가 두 배가 된다. */
const TICK_CAP = 0.45;

const GOOD_NEWS = [
    "깜짝 실적 — 시장 예상 크게 상회",
    "대형 수주 공시",
    "신제품 흥행, 증권가 목표가 상향",
    "자사주 매입 발표",
    "규제 완화 소식",
];
const BAD_NEWS = [
    "실적 쇼크 — 컨센서스 하회",
    "핵심 고객사 이탈설",
    "유상증자 공시",
    "규제 당국 조사 착수",
    "대주주 지분 매각",
];

/* ── 난수 ───────────────────────────────────────────────────── */

/** mulberry32 — 짧고, 32비트 시드 하나로 충분히 고르게 흩어진다. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ── 종목 ───────────────────────────────────────────────────── */

interface StockSeed {
    name: string;
    ticker: string;
    price: number;
    vol: number;
}

/** 이름은 지어낸 것이다 — 실제 회사의 성적을 흉내 내는 게임이 아니다. */
const UNIVERSE: StockSeed[] = [
    { name: "한빛반도체", ticker: "011000", price: 62_000, vol: 0.035 },
    { name: "대성중공업", ticker: "004150", price: 18_500, vol: 0.028 },
    { name: "미래바이오", ticker: "092300", price: 84_000, vol: 0.052 },
    { name: "동방해운", ticker: "001680", price: 9_400, vol: 0.041 },
    { name: "청우식품", ticker: "005180", price: 31_200, vol: 0.019 },
    { name: "누리소프트", ticker: "078340", price: 47_700, vol: 0.046 },
];

/**
 * 판을 만든다. 컨텍스트 봉 몇 개를 미리 그려 두는 이유는, 첫 턴에 차트가 점 하나면
 * 무엇을 보고 사야 할지 알 수 없기 때문이다.
 */
export function createStock(rand: () => number, contextBars = 6): Stock {
    const pick = UNIVERSE[Math.floor(rand() * UNIVERSE.length)] ?? UNIVERSE[0]!;

    let price = pick.price;
    const history: Candle[] = [];
    for (let i = 0; i < contextBars; i++) {
        const drift = (rand() - 0.5) * 2 * pick.vol;
        const next = Math.max(100, Math.round(price * (1 + drift)));
        history.push(makeCandle(price, next, pick.vol, rand));
        price = next;
    }

    return {
        id: `stk-${pick.ticker}`,
        name: pick.name,
        ticker: pick.ticker,
        currentPrice: price,
        volatility: pick.vol,
        history,
    };
}

/** 시가·종가에 그럴듯한 고가·저가를 씌운다. 꼬리는 몸통 밖으로만 자란다. */
function makeCandle(open: number, close: number, vol: number, rand: () => number): Candle {
    const hi = Math.max(open, close);
    const lo = Math.min(open, close);
    const wick = Math.max(1, Math.round(hi * vol * 0.5));
    return {
        o: Math.round(open),
        h: hi + Math.round(rand() * wick),
        l: Math.max(1, lo - Math.round(rand() * wick)),
        c: Math.round(close),
    };
}

/* ── 엔진 ───────────────────────────────────────────────────── */

export class StockEngine {
    readonly seed: number;
    stock: Stock;
    player: PlayerState;

    private rand: () => number;
    /** 판을 시작할 때의 총자산. 수익률의 기준이다. */
    private readonly startEquity: number;
    /** 한 번이라도 샀는가. 12턴을 그냥 흘려보낸 판을 가려내는 데 쓴다. */
    private traded = false;

    constructor(seed: number = (Math.random() * 0xffffffff) >>> 0) {
        this.seed = seed >>> 0;
        this.rand = mulberry32(this.seed);
        this.stock = createStock(this.rand);
        this.player = {
            cash: START_CASH,
            shares: 0,
            avgPrice: 0,
            currentTurn: 1,
            maxTurns: MAX_TURNS,
            insightPoints: 0,
        };
        this.startEquity = START_CASH;
    }

    /* ── 값 읽기 ─────────────────────────────────────────── */

    /** 주식 평가금액. */
    get positionValue(): number {
        return this.player.shares * this.stock.currentPrice;
    }

    /** 총자산 = 현금 + 주식 평가금액. */
    get equity(): number {
        return this.player.cash + this.positionValue;
    }

    /** 미실현 손익(원). 안 들고 있으면 0. */
    get unrealizedPnl(): number {
        if (this.player.shares <= 0) return 0;
        return Math.round(this.positionValue - this.player.avgPrice * this.player.shares);
    }

    /** 미실현 손익률(%). */
    get unrealizedPct(): number {
        if (this.player.shares <= 0 || this.player.avgPrice <= 0) return 0;
        return ((this.stock.currentPrice - this.player.avgPrice) / this.player.avgPrice) * 100;
    }

    /** 시작 자산 대비 누적 수익률(%). */
    get totalReturnPct(): number {
        return ((this.equity - this.startEquity) / this.startEquity) * 100;
    }

    /** 이 아래로 떨어지면 청산이다. 화면이 경고를 띄우는 근거이기도 하다. */
    get bustLine(): number {
        return Math.round(this.startEquity * BUST_RATIO);
    }

    /** 지금 청산 상태인가. */
    get isBust(): boolean {
        return this.equity < this.bustLine;
    }

    /** 판이 끝났는가. 12턴을 채웠거나, **청산됐거나**. */
    get isOver(): boolean {
        return this.player.currentTurn > this.player.maxTurns || this.isBust;
    }

    /* ── 한 턴 ───────────────────────────────────────────── */

    /**
     * 주가를 한 번 굴린다. 랜덤워크 + 뉴스 충격 + 카드 버프가 이 순서로 겹친다.
     *
     * 카드가 뒤에 오는 것이 중요하다 — 뉴스로 크게 빠진 턴을 급반등 카드가 되돌릴 수
     * 있어야 "카드로 판을 뒤집는다" 가 성립한다.
     */
    tick(buff: TurnBuff): TickResult {
        const vol = this.stock.volatility * Math.max(0, buff.volatilityMult);

        // ① 랜덤워크 — 평균 0. 위로 기울여 두면 그냥 들고만 있어도 이기는 판이 된다.
        let change = (this.rand() - 0.5) * 2 * vol;

        // ② 뉴스 충격
        let news: string | null = null;
        if (this.rand() < NEWS_CHANCE) {
            const good = this.rand() < 0.5;
            const size = NEWS_MIN + this.rand() * (NEWS_MAX - NEWS_MIN);
            change += good ? size : -size;
            const pool = good ? GOOD_NEWS : BAD_NEWS;
            news = pool[Math.floor(this.rand() * pool.length)] ?? null;
        }

        // ③ 카드 — 방어막은 내린 폭만, 반등은 내린 만큼을 되돌린다
        if (change < 0 && buff.downshieldRatio > 0) {
            change *= 1 - Math.min(1, buff.downshieldRatio);
        }
        // 반등은 내린 만큼을 **되돌릴 뿐** 그 위로 밀어 올리지 않는다. 2배로 얹으면 내린
        // 턴이 오른 턴이 되어, 이 카드 한 장이 판을 이기는 버튼이 된다.
        if (change < 0 && buff.reboundRatio > 0) {
            change += -change * Math.min(1, buff.reboundRatio);
        }
        change += buff.priceBias;

        // ④ 한계. 카드 둘이 겹쳐도 하루에 주가가 두 배가 되지는 않는다.
        change = Math.max(-TICK_CAP, Math.min(TICK_CAP, change));

        const open = this.stock.currentPrice;
        const close = Math.max(100, Math.round(open * (1 + change)));
        const candle = makeCandle(open, close, this.stock.volatility, this.rand);

        this.stock.history.push(candle);
        this.stock.currentPrice = close;

        return { candle, changePct: ((close - open) / open) * 100, news };
    }

    /** 턴을 하나 넘긴다. 12턴을 넘기면 판이 끝난 것이다(isOver). */
    advanceTurn(): void {
        this.player.currentTurn += 1;
    }

    /* ── 체결 ───────────────────────────────────────────── */

    /** 현금의 50% 로 산다. */
    buyHalf(buff?: TurnBuff): TradeResult {
        return this.buy(Math.floor(this.player.cash / 2), buff);
    }

    /** 현금 전부로 산다. */
    buyAll(buff?: TurnBuff): TradeResult {
        return this.buy(this.player.cash, buff);
    }

    /**
     * 예산 안에서 최대한 산다. 수수료까지 예산 안에 들어와야 한다 —
     * 수수료를 뺀 뒤 계산하면 마지막 한 주에서 현금이 음수가 된다.
     */
    private buy(budget: number, _buff?: TurnBuff): TradeResult {
        const price = this.stock.currentPrice;
        if (price <= 0) return { ok: false, error: "가격을 읽지 못했습니다." };

        const perShare = price + cut(price, BUY_FEE_NUM);
        const qty = Math.floor(Math.max(0, budget) / Math.max(1, perShare));
        if (qty < 1) return { ok: false, error: "현금이 한 주 값에 못 미칩니다." };

        const gross = price * qty;
        const fee = cut(gross, BUY_FEE_NUM);
        const total = gross + fee;
        if (total > this.player.cash) return { ok: false, error: "현금이 부족합니다." };

        // 평단가는 수수료까지 담은 실제 원가로 잡는다. 그래야 "본전" 이 진짜 본전이다.
        const prevCost = this.player.avgPrice * this.player.shares;
        const nextShares = this.player.shares + qty;

        this.player.cash -= total;
        this.player.shares = nextShares;
        this.player.avgPrice = (prevCost + total) / nextShares;
        this.traded = true;

        return { ok: true, side: "buy", qty, price, fee, cash: this.player.cash };
    }

    /** 보유 전량을 판다. 카드로 수수료가 면제되면 세금까지 안 뗀다. */
    sellAll(buff?: TurnBuff): TradeResult {
        const qty = this.player.shares;
        if (qty < 1) return { ok: false, error: "팔 주식이 없습니다." };

        const price = this.stock.currentPrice;
        const gross = price * qty;
        const fee = buff?.feeWaived ? 0 : cut(gross, SELL_FEE_NUM) + cut(gross, SELL_TAX_NUM);
        const net = gross - fee;

        this.player.cash += net;
        this.player.shares = 0;
        this.player.avgPrice = 0;
        this.traded = true;

        return { ok: true, side: "sell", qty, price, fee, cash: this.player.cash };
    }

    /** 판이 끝날 때 남은 주식을 그날 종가로 정리한다. 수수료는 그대로 낸다. */
    liquidate(): void {
        if (this.player.shares > 0) this.sellAll();
    }

    /* ── 정산 ───────────────────────────────────────────── */

    /**
     * 인사이트 포인트 — 다음 런으로 넘어가는 유일한 것.
     *
     * 수익률에 비례하되 바닥이 0 이 아니다(1). 한 판을 끝까지 굴린 것 자체에 값을 준다.
     * 다만 **한 주도 안 산 판은 0** 이다. 아무것도 안 하는 것이 쌓이면 게임이 멈춘다.
     */
    summarize(): RunSummary {
        const finalEquity = this.equity;
        const returnPct = ((finalEquity - this.startEquity) / this.startEquity) * 100;
        const idle = !this.traded;
        // 청산된 판은 한 점도 안 준다. 그래야 "어차피 12턴 채우면 되니 올인" 이 안 된다.
        const bankrupt = this.isBust;
        const earnedIP = idle || bankrupt ? 0 : Math.max(1, Math.round(returnPct / 2) + 1);

        this.player.insightPoints += earnedIP;
        return { returnPct, startEquity: this.startEquity, finalEquity, earnedIP, idle, bankrupt };
    }
}
