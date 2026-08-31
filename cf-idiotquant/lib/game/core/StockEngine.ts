// 판의 규칙. **Phaser 를 모른다** — 여기 있는 함수들은 값을 받아 값을 돌려줄 뿐이고,
// 그래서 화면 없이도 돌려 볼 수 있다.
//
// ── 이 판의 심장: 국면(regime) ──────────────────────────────────
// 예전 주가는 순수 랜덤워크였다. 오른 턴 다음에 또 오를 확률이 51.6% — 사실상 동전
// 던지기라, 차트 12개 봉이 아무 정보도 담지 않았다. 800판을 돌려 재 보니 추세를 읽는
// 정책(평균 +0.2%)과 동전 던지기(−0.4%)가 구분되지 않았다. 실력이 0인 게임이었다.
//
// 지금은 시장에 **숨은 국면**이 있다. 상승·하락·횡보가 3~5턴씩 이어지다 다른 것으로
// 바뀐다. 그래서 과거 봉이 미래를 말하기 시작하고, 차트를 읽을 값어치가 생긴다.
// 하락 국면에 들고 있으면 진짜로 죽으므로 **현금이 정답인 순간**도 그제야 생긴다.
//
// ── 경로를 미리 정해 둔다 ───────────────────────────────────────
// 12턴의 등락은 판이 만들어질 때 통째로 정해진다. 그래야 "예보" 카드가 없던 미래를
// 만드는 것이 아니라 **이미 정해진 것을 앞당겨 보는 것**이 된다. 정보가 값어치를 갖는
// 유일한 방법이고, 같은 시드가 같은 판을 준다는 성질도 여기서 나온다.
//
// 방어 카드는 그 정해진 값을 **줄인다**. 그래서 "예보가 −9% 였는데 벙커로 −1% 로
// 막았다" 가 성립한다 — 읽고, 크기를 정하고, 막는다. 그것이 한 턴의 전부다.

import type {
    Candle, MarketRead, PlayerState, Regime, Stock, TickResult, TradeResult, TurnBuff, RunSummary,
} from "./types";
import { NO_BUFF } from "./types";

/* ── 상수 ───────────────────────────────────────────────────── */

/**
 * 게임을 처음 켤 때, 그리고 자본잠식으로 다시 시작할 때의 돈.
 *
 * 판마다 여기로 되돌아가지 **않는다** — 자금은 판을 넘어 이어진다(progress.bankroll).
 * 이 값은 오직 "맨 처음" 을 뜻한다.
 */
export const SEED_CASH = 10_000_000;
export const MAX_TURNS = 12;

// 수수료는 분수로 두고 정수 연산으로 계산한다. 0.00015 를 곱하면
// 700000 * 0.00015 === 104.99999999999999 라 floor 가 105 대신 104 를 준다.
const FEE_DENOM = 100_000;
export const BUY_FEE_NUM = 15;    // 0.015%
export const SELL_FEE_NUM = 15;   // 0.015%
export const SELL_TAX_NUM = 180;  // 0.18% 거래세 (매도만)

const cut = (gross: number, num: number) => Math.floor((gross * num) / FEE_DENOM);

/**
 * 국면별 기울기와 흔들림.
 *
 * drift 는 종목 변동폭과 견줄 만큼 커야 읽힌다. 종목 변동폭이 2~5% 인데 기울기가 1% 면
 * 세 턴을 봐도 노이즈에 묻힌다. 3.5% 면 세 턴에 약 1.2σ — 확신은 못 하되 근거는 되는,
 * 읽을 값어치가 있는 크기다.
 */
const REGIME: Record<Regime, { drift: number; vol: number; label: string }> = {
    bull: { drift: 0.035, vol: 0.9, label: "상승" },
    bear: { drift: -0.038, vol: 1.1, label: "하락" },
    chop: { drift: 0, vol: 1.5, label: "횡보" },
};

/** 국면 하나가 몇 턴 가는가(차수 0 기준). */
const REGIME_MIN = 3;
const REGIME_MAX = 5;

/**
 * 차수가 오르면 **읽기 자체가 어려워진다.**
 *
 * 청산선만 올리면 잘 읽는 사람에게는 차수가 아무 의미가 없다(700판을 돌려 보니 읽고
 * 굴리는 정책의 청산률이 차수 0 에서도 4 에서도 0% 였다). 그래서 차수는 국면을 짧게
 * 만들고 뉴스를 잦게 만든다 — 신호가 짧아지고 잡음이 커져, 같은 눈으로는 덜 읽힌다.
 */
function marketFor(tier: number) {
    return {
        min: Math.max(2, REGIME_MIN - Math.floor(tier / 3)),
        max: Math.max(2, REGIME_MAX - Math.floor(tier / 2)),
        newsChance: NEWS_CHANCE + tier * 0.02,
    };
}

/** 사람이 읽을 국면 이름. */
export function regimeLabel(r: Regime): string {
    return REGIME[r].label;
}

/** 저주에 막혀 아무것도 못 본 턴. */
function blindRead(): MarketRead {
    return { next: [], regime: null, regimeDrift: null, turnsLeft: null, nextRegime: null, nextDrift: null };
}

/**
 * 뉴스 — 국면 위에 얹히는 단발 충격.
 *
 * 예전에는 28% 확률에 ±5~25% 라, 국면을 넣어도 뉴스가 신호를 통째로 덮어 버린다.
 * 읽어서 이기는 게임이 되려면 노이즈가 기울기보다 작아야 한다.
 */
const NEWS_CHANCE = 0.16;
const NEWS_MIN = 0.04;
const NEWS_MAX = 0.13;

/** 한 틱이 낼 수 있는 등락의 한계. */
const TICK_CAP = 0.45;

/**
 * 계획된 등락에 이번 턴의 카드·유물을 얹는다.
 *
 * **`tick` 과 `read` 가 같은 식을 쓴다.** 예전에는 `tick` 만 이 계산을 했고 `read` 는
 * 계획을 날것으로 내줬다. 그래서 헤지를 든 채 예보를 보면 −8% 라 적혀 있는데 실제로는
 * −4% 가 왔다 — 차트가 거짓말을 한 것이다. 식을 하나로 두면 그 어긋남이 다시 생길 수 없다.
 */
function moveWith(base: number, buff: TurnBuff): number {
    let change = base;
    // 하락 방어가 먼저다. 뒤에 오면 방어가 배율에 눌려 값이 달라진다.
    if (change < 0 && buff.downshieldRatio > 0) {
        change *= 1 - Math.min(1, buff.downshieldRatio);
    }
    change *= Math.max(0, buff.moveMult);
    return Math.max(-TICK_CAP, Math.min(TICK_CAP, change));
}

/**
 * 차수 — 판을 넘어 오르내리는 난이도. 완주하면 오르고 자본잠식이면 0 으로 돌아간다.
 *
 * 오를수록 국면이 짧아지고 뉴스가 잦아진다(`marketFor`) — 청산선만 올리던 시절에는
 * 잘 읽는 사람에게 차수가 아무 의미가 없었다(측정: 차수 0에서도 4에서도 청산 0%).
 */
export const MAX_TIER = 7;
export const TIER_IP_STEP = 0.15;

/**
 * 자본잠식선 — 자금이 이 아래로 떨어지면 게임이 끝난다.
 *
 * 처음 자금의 20%. 이 아래로 가면 한 판으로 되돌리는 것이 사실상 불가능해지므로,
 * 질질 끄는 대신 그 자리에서 끊고 다시 시작하게 한다.
 */
export const RUIN_LINE = Math.round(SEED_CASH * 0.2);

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

/** 미리 정해 둔 한 턴. 예보는 이 값을 앞당겨 보는 것이다. */
interface PlannedTurn {
    /** 카드가 없을 때의 등락(비율). */
    base: number;
    regime: Regime;
    /** 이 턴이 지나면 지금 국면이 몇 턴 남는가. */
    turnsLeft: number;
    news: string | null;
}

/* ── 엔진 ───────────────────────────────────────────────────── */

export class StockEngine {
    readonly seed: number;
    readonly tier: number;
    stock: Stock;
    player: PlayerState;

    private rand: () => number;
    private readonly startEquity: number;
    /** 한 번이라도 샀는가. 12턴을 그냥 흘려보낸 판을 가려내는 데 쓴다. */
    private traded = false;

    /**
     * 이 판의 등락이 통째로 여기 들어 있다. 컨텍스트 봉을 포함해 앞에서부터 소비한다.
     * **화면은 이걸 볼 수 없다** — 읽으려면 카드를 써야 한다(`read`).
     */
    private plan: PlannedTurn[] = [];
    /** 다음에 소비할 plan 의 자리. */
    private cursor = 0;
    /** 이번 턴에 손절이 걸렸는가. 화면이 그 사실을 말할 수 있게 남겨 둔다. */
    private lastStopLoss = false;

    /**
     * @param startCash 이 판을 시작하는 돈. 판을 넘어 이어진 자금이 그대로 들어온다.
     */
    constructor(
        seed: number = (Math.random() * 0xffffffff) >>> 0,
        tier = 0,
        startCash: number = SEED_CASH,
    ) {
        this.seed = seed >>> 0;
        this.tier = Math.max(0, Math.min(MAX_TIER, Math.floor(tier)));
        this.rand = mulberry32(this.seed);

        const pick = UNIVERSE[Math.floor(this.rand() * UNIVERSE.length)] ?? UNIVERSE[0]!;
        const contextBars = 6;
        this.plan = this.buildPlan(pick.vol, contextBars + MAX_TURNS);

        // 컨텍스트 봉 — 첫 턴에 차트가 점 하나면 읽을 것이 없다. 이 봉들도 같은 국면
        // 과정에서 나오므로, 판을 열자마자 이미 **읽을 거리**가 놓여 있다.
        let price = pick.price;
        const history: Candle[] = [];
        for (let i = 0; i < contextBars; i++) {
            const next = Math.max(100, Math.round(price * (1 + this.plan[this.cursor++]!.base)));
            history.push(makeCandle(price, next, pick.vol, this.rand));
            price = next;
        }

        this.stock = {
            id: `stk-${pick.ticker}`,
            name: pick.name,
            ticker: pick.ticker,
            currentPrice: price,
            volatility: pick.vol,
            history,
        };
        const cash = Math.max(0, Math.floor(startCash));
        this.player = {
            cash, shares: 0, avgPrice: 0,
            currentTurn: 1, maxTurns: MAX_TURNS, insightPoints: 0,
        };
        this.startEquity = cash;
    }

    /** 국면을 이어 붙여 판 전체의 등락을 미리 짠다. */
    private buildPlan(vol: number, turns: number): PlannedTurn[] {
        const out: PlannedTurn[] = [];
        const kinds: Regime[] = ["bull", "bear", "chop"];
        const m = marketFor(this.tier);
        const span = () => m.min + Math.floor(this.rand() * (m.max - m.min + 1));

        let regime: Regime = kinds[Math.floor(this.rand() * 3)]!;
        let left = span();

        for (let i = 0; i < turns; i++) {
            if (left === 0) {
                // 같은 국면이 두 번 이어지면 "바뀌었다" 를 읽을 수 없다. 반드시 다른 것으로.
                const others = kinds.filter(k => k !== regime);
                regime = others[Math.floor(this.rand() * others.length)]!;
                left = span();
            }
            const r = REGIME[regime];

            let base = r.drift + (this.rand() - 0.5) * 2 * vol * r.vol;
            let news: string | null = null;
            if (this.rand() < m.newsChance) {
                const good = this.rand() < 0.5;
                const size = NEWS_MIN + this.rand() * (NEWS_MAX - NEWS_MIN);
                base += good ? size : -size;
                const pool = good ? GOOD_NEWS : BAD_NEWS;
                news = pool[Math.floor(this.rand() * pool.length)] ?? null;
            }

            left -= 1;
            out.push({ base: Math.max(-TICK_CAP, Math.min(TICK_CAP, base)), regime, turnsLeft: left, news });
        }
        return out;
    }

    /* ── 값 읽기 ─────────────────────────────────────────── */

    get positionValue(): number { return this.player.shares * this.stock.currentPrice; }
    get equity(): number { return this.player.cash + this.positionValue; }

    get unrealizedPnl(): number {
        if (this.player.shares <= 0) return 0;
        return Math.round(this.positionValue - this.player.avgPrice * this.player.shares);
    }

    get unrealizedPct(): number {
        if (this.player.shares <= 0 || this.player.avgPrice <= 0) return 0;
        return ((this.stock.currentPrice - this.player.avgPrice) / this.player.avgPrice) * 100;
    }

    get totalReturnPct(): number {
        return ((this.equity - this.startEquity) / this.startEquity) * 100;
    }

    /**
     * 자본잠식선 — 자산이 이 아래면 게임이 끝난다.
     *
     * 판마다 다시 그어지는 선이 아니라 **게임 전체에 하나뿐인 바닥**이다. 자금이
     * 이어지므로, 이번 판을 잘 굴려 불려 두면 그만큼 이 선에서 멀어진다.
     */
    get ruinLine(): number { return RUIN_LINE; }

    /** 지금 자본잠식인가. */
    get isRuined(): boolean { return this.equity < RUIN_LINE; }

    /** 판이 끝났는가. 12턴을 채웠거나, **자본잠식이거나**. */
    get isOver(): boolean {
        return this.player.currentTurn > this.player.maxTurns || this.isRuined;
    }

    /** 지난 턴에 손절이 걸렸는가. */
    get stoppedOut(): boolean { return this.lastStopLoss; }

    /**
     * **읽어 낸 것만** 돌려준다. 카드가 안 열어 준 것은 null 이다.
     *
     * 엔진은 판 전체를 알지만 화면에 그걸 다 주면 게임이 없다. 무엇을 볼 수 있는지는
     * 오직 이번 턴의 buff 가 정한다 — 그게 정보 카드에 값어치를 주는 유일한 방법이다.
     */
    read(buff: TurnBuff): MarketRead {
        if (buff.blind) return blindRead();
        const here = this.plan[this.cursor];
        // 국면은 **한 겹씩** 벗겨진다. 카드가 강화될수록 깊이가 는다(TurnBuff.regimeDepth).
        const depth = here ? Math.max(0, buff.regimeDepth) : 0;
        const after = depth >= 3 ? this.regimeAfter() : null;

        return {
            next: this.plan
                .slice(this.cursor, this.cursor + Math.max(0, buff.peekTurns))
                // **이번 턴 것에는 이번 턴의 카드가 얹힌다.** 계획된 등락을 날것으로
                // 내주면 헤지를 든 채 −8% 예보를 보고 겁을 먹는데 실제로는 −4% 가 온다 —
                // 화면이 거짓말을 하는 셈이다. 둘째 턴부터는 지금 든 카드가 이미 만료라
                // 계획 그대로다(다만 tick 과 같은 한계는 씌운다).
                .map((t, i) => moveWith(t.base, i === 0 ? buff : NO_BUFF) * 100),
            regime: depth >= 1 ? here!.regime : null,
            regimeDrift: depth >= 1 ? REGIME[here!.regime].drift * 100 : null,
            turnsLeft: depth >= 2 ? here!.turnsLeft : null,
            nextRegime: depth >= 3 ? after : null,
            nextDrift: depth >= 4 && after ? REGIME[after].drift * 100 : null,
        };
    }

    /** 지금 국면 다음에 오는 것. 판이 여기서 끝나면 null. */
    private regimeAfter(): Regime | null {
        const now = this.plan[this.cursor]?.regime;
        if (!now) return null;
        for (let i = this.cursor + 1; i < this.plan.length; i++) {
            const r = this.plan[i]!.regime;
            if (r !== now) return r;
        }
        return null;
    }

    /* ── 한 턴 ───────────────────────────────────────────── */

    /**
     * 주가를 한 번 굴린다. 등락은 이미 정해져 있고, 카드는 그것을 **줄이거나 키울** 뿐이다.
     *
     * 손절이 걸리면 주가가 움직인 **뒤** 그 자리에서 전량 매도한다 — 방어 카드는 맞고
     * 나서 수습하는 것이지 맞기 전에 피하는 것이 아니다.
     */
    tick(buff: TurnBuff = NO_BUFF): TickResult {
        const planned = this.plan[this.cursor] ?? { base: 0, regime: "chop" as Regime, turnsLeft: 0, news: null };
        this.cursor += 1;
        this.lastStopLoss = false;

        const change = moveWith(planned.base, buff);

        const open = this.stock.currentPrice;
        const close = Math.max(100, Math.round(open * (1 + change)));
        const candle = makeCandle(open, close, this.stock.volatility, this.rand);

        this.stock.history.push(candle);
        this.stock.currentPrice = close;

        const changePct = ((close - open) / open) * 100;

        // 이자 — 신용을 쓴 값이다. 현금이 없으면 뗄 것도 없다.
        if (buff.cashDrainPct > 0) {
            this.player.cash -= Math.floor(this.player.cash * buff.cashDrainPct);
        }

        // 손절 예약 — 이 턴에 정해 둔 만큼 빠졌으면 자동으로 던진다.
        if (buff.stopLoss > 0 && this.player.shares > 0 && changePct <= -buff.stopLoss * 100) {
            this.sellAll(buff);
            this.lastStopLoss = true;
        }

        return { candle, changePct, news: planned.news };
    }

    /** 턴을 하나 넘긴다. 12턴을 넘기면 판이 끝난 것이다(isOver). */
    advanceTurn(): void {
        this.player.currentTurn += 1;
    }

    /* ── 체결 ───────────────────────────────────────────── */

    /** 현금의 절반으로 산다. */
    buyHalf(buff?: TurnBuff): TradeResult {
        return this.buy(Math.floor(this.buyingPower(buff) / 2), buff);
    }

    /** 살 수 있는 만큼 전부 산다. 신용 카드를 썼으면 현금보다 많이 살 수 있다. */
    buyAll(buff?: TurnBuff): TradeResult {
        return this.buy(this.buyingPower(buff), buff);
    }

    /** 이번 턴에 동원할 수 있는 돈. 신용은 여기서만 커진다. */
    private buyingPower(buff?: TurnBuff): number {
        return Math.floor(this.player.cash * Math.max(1, buff?.buyingPowerMult ?? 1));
    }

    /**
     * 예산 안에서 최대한 산다. 수수료까지 예산 안에 들어와야 한다.
     *
     * 신용을 쓰면 예산이 현금보다 크다. 그때는 현금이 음수가 되는데, 그것이 곧 빚이고
     * 청산선이 그만큼 가까워진다 — 신용의 값이다.
     */
    private buy(budget: number, buff?: TurnBuff): TradeResult {
        const price = this.stock.currentPrice;
        if (price <= 0) return { ok: false, error: "가격을 읽지 못했습니다." };

        const feeMult = Math.max(0, buff?.feeMult ?? 1);
        const perShare = price + Math.floor(cut(price, BUY_FEE_NUM) * feeMult);
        const qty = Math.floor(Math.max(0, budget) / Math.max(1, perShare));
        if (qty < 1) return { ok: false, error: "현금이 한 주 값에 못 미칩니다." };

        const gross = price * qty;
        const fee = Math.floor(cut(gross, BUY_FEE_NUM) * feeMult);
        const total = gross + fee;

        const prevCost = this.player.avgPrice * this.player.shares;
        const nextShares = this.player.shares + qty;

        this.player.cash -= total;
        this.player.shares = nextShares;
        this.player.avgPrice = (prevCost + total) / nextShares;
        this.traded = true;

        return { ok: true, side: "buy", qty, price, fee, cash: this.player.cash };
    }

    /** 보유 전량을 판다. 수수료 배수는 카드가 정한다(0 이면 면제, 3 이면 세 배). */
    sellAll(buff?: TurnBuff): TradeResult {
        const qty = this.player.shares;
        if (qty < 1) return { ok: false, error: "팔 주식이 없습니다." };

        const price = this.stock.currentPrice;
        const gross = price * qty;
        const feeMult = Math.max(0, buff?.feeMult ?? 1);
        const fee = Math.floor((cut(gross, SELL_FEE_NUM) + cut(gross, SELL_TAX_NUM)) * feeMult);

        this.player.cash += gross - fee;
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

    summarize(deck: readonly string[] = []): RunSummary {
        const finalEquity = this.equity;
        const returnPct = ((finalEquity - this.startEquity) / this.startEquity) * 100;
        const idle = !this.traded;
        const ruined = this.isRuined;
        const base = idle || ruined ? 0 : Math.max(1, Math.round(returnPct / 2) + 1);
        const earnedIP = Math.round(base * (1 + this.tier * TIER_IP_STEP));

        this.player.insightPoints += earnedIP;
        return {
            returnPct, startEquity: this.startEquity, finalEquity, earnedIP, idle, ruined,
            deck: [...deck],
        };
    }
}
