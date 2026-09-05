// 판의 규칙. **Phaser 를 모른다** — 여기 있는 함수들은 값을 받아 값을 돌려줄 뿐이고,
// 그래서 화면 없이도 돌려 볼 수 있다.
//
// ── 이 판의 심장 하나: 국면 ──────────────────────────────────────
// 예전 주가는 순수 랜덤워크였다. 오른 턴 다음에 또 오를 확률이 51.6% — 사실상 동전
// 던지기라, 차트 12개 봉이 아무 정보도 담지 않았다. 지금은 시장에 **국면**이 있고,
// 그 국면은 이제 무작위가 아니라 **역사에서 온다**(`core/chapters.ts`).
//
// ── 이 판의 심장 둘: 국면은 하나, 베타는 종목마다 ────────────────
// 국면을 종목별로 흩으면 2000년이 "붕괴" 로 안 느껴진다. 그래서 국면은 시장에 하나이고
// 종목은 각자의 `beta` 로 반응한다. 같은 하락에서 무진홀딩스(0.4)와 거인닷컴(2.0)이
// 다섯 배로 갈린다 — **무엇을 권했는지가 그제야 결정이 된다.**
//
// ── 이 판의 심장 셋: 주가는 한 줄로 이어진다 ─────────────────────
// 1997~2000 전 구간(46봉)을 게임이 시작될 때 **한 번에** 만든다. 챕터는 그 타임라인을
// 가리키는 커서일 뿐이다. 그래서 **보유가 챕터를 넘어 유지되고**, 1999 에 산 것을 2000 까지
// 들고 가면 진짜로 죽는다. "1999 에 근거 없이 번 대가를 2000 에 낸다" 가 서사가 아니라
// 규칙이 되는 자리다.
//
// 경로를 미리 정해 두는 이유는 그대로다 — 예보 카드가 없던 미래를 만드는 것이 아니라
// **이미 정해진 것을 앞당겨 보는 것**이어야 정보에 값이 생긴다.

import type {
    Candle, MarketRead, PlayerState, Position, Regime, Stock, TickResult, TradeResult,
    TurnBuff, ChapterSummary,
} from "./types";
import { NO_BUFF } from "./types";
import {
    CHAPTERS, CONTEXT_BARS, TOTAL_TURNS, UNIVERSE, chapterAtTurn, regimeTimeline,
    type Chapter, type StockDef,
} from "./chapters";

/* ── 상수 ───────────────────────────────────────────────────── */

/** 1998 년 1월에 손에 쥔 돈. 회사가 없어지고 남은 것이다. */
export const SEED_CASH = 10_000_000;

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
 * 읽을 값어치가 있는 크기다. 챕터가 여기에 배수를 얹는다(1999 의 광기, 2000 의 붕괴).
 */
const REGIME: Record<Regime, { drift: number; vol: number; label: string }> = {
    bull: { drift: 0.035, vol: 0.9, label: "상승" },
    bear: { drift: -0.038, vol: 1.1, label: "하락" },
    chop: { drift: 0, vol: 1.5, label: "횡보" },
};

/** 사람이 읽을 국면 이름. */
export function regimeLabel(r: Regime): string { return REGIME[r].label; }

/** 저주에 막혀 아무것도 못 본 턴. */
function blindRead(): MarketRead {
    return { next: [], regime: null, regimeDrift: null, turnsLeft: null, nextRegime: null, nextDrift: null };
}

/**
 * 뉴스 — 국면 위에 얹히는 단발 충격. **시장 전체에 온다.**
 *
 * 읽어서 이기는 게임이 되려면 노이즈가 기울기보다 작아야 한다. 그리고 뉴스도 베타를
 * 타므로, 같은 악재에 고베타가 더 맞는다.
 */
const NEWS_CHANCE = 0.18;
const NEWS_MIN = 0.03;
const NEWS_MAX = 0.10;

/** 한 틱이 낼 수 있는 등락의 한계. */
const TICK_CAP = 0.45;

/**
 * 자본잠식선 — 맡은 돈이 이 아래로 떨어지면 그 자리에서 끝난다.
 *
 * 처음 자금의 20%. 이 아래로 가면 되돌리는 것이 사실상 불가능해지므로, 질질 끄는 대신
 * 그 자리에서 끊는다.
 */
export const RUIN_LINE = Math.round(SEED_CASH * 0.2);

/** 신뢰는 여기서 시작한다. 매 턴 저절로 줄기 때문에 가만히 있으면 못 버틴다. */
export const TRUST_START = 50;
export const TRUST_MAX = 100;

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

/* ── 미리 정해 두는 것 ───────────────────────────────────────── */

/** 시장 전체의 한 턴. 국면과 뉴스는 종목이 아니라 시장의 것이다. */
interface MarketTurn {
    regime: Regime;
    /** 이 턴 국면의 실제 기울기(챕터 배수까지 먹인 값). */
    drift: number;
    /** 이 턴 국면의 흔들림 배수. */
    vol: number;
    /** 이 국면이 몇 턴 더 가는가. */
    turnsLeft: number;
    /** 뉴스가 터졌으면 그 문구. */
    news: string | null;
    /** 뉴스가 시장에 준 충격(비율). 베타를 타고 종목에 퍼진다. */
    shock: number;
}

/** 종목 하나의 한 턴. */
interface PlannedTurn {
    /** 카드가 없을 때의 등락(비율). */
    base: number;
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

/**
 * 계획된 등락에 이번 턴의 카드를 얹는다.
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

/* ── 엔진 ───────────────────────────────────────────────────── */

export class StockEngine {
    readonly seed: number;
    /** 아홉 종목 전부. 아직 상장 안 한 것도 여기 있다(`listedAt` 으로 가린다). */
    readonly stocks: Stock[];
    player: PlayerState;

    /** 지금 보고 있는 종목의 id. 차트와 정보 카드가 이것을 본다. */
    focus: string;

    /** 지금이 전 구간의 몇 번째 턴인가(1부터 TOTAL_TURNS). */
    absTurn = 1;
    /** 지금 챕터. */
    chapter: Chapter;

    private rand: () => number;
    private market: MarketTurn[] = [];
    private plans: Record<string, PlannedTurn[]> = {};
    private byId: Record<string, Stock> = {};

    /** 이 챕터를 시작한 자산. 챕터 성적은 여기에 견준다. */
    private chapterStartEquity: number;
    /** 이 챕터에 한 번이라도 권했는가. 흘려보낸 챕터를 가려내는 데 쓴다. */
    private recommended = false;
    /** 이번 턴에 손절이 걸린 종목들. 화면이 그 사실을 말할 수 있게 남겨 둔다. */
    private stoppedIds: string[] = [];

    constructor(seed: number = (Math.random() * 0xffffffff) >>> 0, startCash: number = SEED_CASH) {
        this.seed = seed >>> 0;
        this.rand = mulberry32(this.seed);

        this.market = this.buildMarket();
        this.stocks = UNIVERSE.map(def => this.buildStock(def));
        for (const s of this.stocks) this.byId[s.id] = s;

        this.chapter = CHAPTERS[0]!;
        this.focus = this.stocks[0]!.id;

        const cash = Math.max(0, Math.floor(startCash));
        this.player = {
            cash,
            positions: {},
            currentTurn: 1,
            maxTurns: this.chapter.turns,
            trust: TRUST_START,
            debt: 0,
        };
        this.applyOpening(this.chapter);
        this.chapterStartEquity = this.equity;
    }

    /* ── 판을 짠다 ───────────────────────────────────────── */

    /**
     * 시장의 전 구간을 먼저 짠다. **국면은 역사에서 오고**(챕터 스크립트) 뉴스만 굴린다.
     *
     * 회차를 넘어도 이 뼈대는 같아야 한다 — 그래야 "1999 하반기에 거품이 온다" 는 기억이
     * 쓸모가 있다. 시드가 바꾸는 것은 뉴스와 개별 노이즈뿐이다.
     */
    private buildMarket(): MarketTurn[] {
        const out: MarketTurn[] = [];
        for (const ch of CHAPTERS) {
            const spans = regimeTimeline(ch);
            for (let i = 0; i < spans.length; i++) {
                const span = spans[i]!;
                const r = REGIME[span.kind];
                // 같은 구간이 몇 턴 남았는가 — 국면을 읽는 카드가 이 값을 판다.
                let left = 0;
                for (let j = i + 1; j < spans.length && spans[j] === span; j++) left++;

                let news: string | null = null;
                let shock = 0;
                if (this.rand() < NEWS_CHANCE) {
                    const good = this.rand() < 0.5;
                    const size = NEWS_MIN + this.rand() * (NEWS_MAX - NEWS_MIN);
                    shock = good ? size : -size;
                    const pool = good ? ch.news.good : ch.news.bad;
                    news = pool[Math.floor(this.rand() * pool.length)] ?? null;
                }

                out.push({
                    regime: span.kind,
                    drift: r.drift * (span.driftMult ?? 1),
                    vol: r.vol * (span.volMult ?? 1),
                    turnsLeft: left,
                    news,
                    shock,
                });
            }
        }
        return out;
    }

    /**
     * 종목 하나의 전 구간. **시장 국면 × 베타 + 저 혼자의 노이즈.**
     *
     * 상장 전 턴은 계획이 비어 있고 봉도 안 생긴다 — 없던 회사다.
     */
    private buildStock(def: StockDef): Stock {
        const plan: PlannedTurn[] = [];
        for (let t = 1; t <= TOTAL_TURNS; t++) {
            if (t < def.listedAt) { plan.push({ base: 0 }); continue; }
            const m = this.market[t - 1]!;
            const noise = (this.rand() - 0.5) * 2 * def.vol * m.vol;
            const base = m.drift * def.beta + m.shock * def.beta + noise;
            plan.push({ base: Math.max(-TICK_CAP, Math.min(TICK_CAP, base)) });
        }
        this.plans[def.id] = plan;

        // 처음부터 있던 종목만 컨텍스트 봉을 갖는다. 나중에 상장하는 것은 상장일이 첫 봉이다.
        const history: Candle[] = [];
        let price = def.price;
        if (def.listedAt === 1) {
            const m0 = this.market[0]!;
            for (let i = 0; i < CONTEXT_BARS; i++) {
                const base = m0.drift * def.beta + (this.rand() - 0.5) * 2 * def.vol * m0.vol;
                const next = Math.max(100, Math.round(price * (1 + base)));
                history.push(makeCandle(price, next, def.vol, this.rand));
                price = next;
            }
        }

        return {
            id: def.id, name: def.name, ticker: def.ticker,
            currentPrice: price, volatility: def.vol, history,
            beta: def.beta, listedAt: def.listedAt, blurb: def.blurb,
        };
    }

    /**
     * 프롤로그가 열릴 때 이미 물려 있는 자리를 깐다.
     *
     * **평단가가 지금 값보다 높다** — 판이 열리기 전에 이미 무너지기 시작했고 나는 그
     * 자리를 물려받은 채 앉아 있다. 첫 턴에 전부 팔아도 손실은 확정되고 수수료까지 나간다.
     * 프롤로그가 어떤 정책으로도 이길 수 없는 이유가 이 한 줄이다.
     */
    private applyOpening(ch: Chapter): void {
        if (!ch.opening) return;
        const budget = this.player.cash;
        for (const op of ch.opening) {
            const stock = this.byId[op.stockId];
            if (!stock) continue;
            const spend = Math.floor((budget * op.pctOfCash) / 100);
            const qty = Math.floor(spend / stock.currentPrice);
            if (qty < 1) continue;
            this.player.cash -= qty * stock.currentPrice;
            this.player.positions[stock.id] = {
                shares: qty,
                avgPrice: stock.currentPrice * op.avgOverCurrent,
            };
        }
    }

    /* ── 값 읽기 ─────────────────────────────────────────── */

    /** 이 턴에 상장해 있는 종목들. 시세판과 칩 줄이 이것만 그린다. */
    get listed(): Stock[] {
        return this.stocks.filter(s => s.listedAt <= this.absTurn);
    }

    /** 이번 턴에 새로 상장한 종목. 없으면 null. */
    get newlyListed(): Stock | null {
        return this.stocks.find(s => s.listedAt === this.absTurn) ?? null;
    }

    stockOf(id: string): Stock | undefined { return this.byId[id]; }
    priceOf(id: string): number { return this.byId[id]?.currentPrice ?? 0; }
    positionOf(id: string): Position { return this.player.positions[id] ?? { shares: 0, avgPrice: 0 }; }
    get focusStock(): Stock { return this.byId[this.focus] ?? this.stocks[0]!; }

    setFocus(id: string): void { if (this.byId[id]) this.focus = id; }

    /** 들고 있는 모든 자리의 평가액. */
    get positionValue(): number {
        let sum = 0;
        for (const [id, pos] of Object.entries(this.player.positions)) {
            sum += pos.shares * this.priceOf(id);
        }
        return sum;
    }

    get equity(): number { return this.player.cash + this.positionValue; }

    /** 한 종목의 평가손익(원). */
    unrealizedPnl(id: string): number {
        const pos = this.positionOf(id);
        if (pos.shares <= 0) return 0;
        return Math.round(pos.shares * this.priceOf(id) - pos.avgPrice * pos.shares);
    }

    /** 한 종목의 평가손익률(%). */
    unrealizedPct(id: string): number {
        const pos = this.positionOf(id);
        if (pos.shares <= 0 || pos.avgPrice <= 0) return 0;
        return ((this.priceOf(id) - pos.avgPrice) / pos.avgPrice) * 100;
    }

    /** 이번 챕터의 수익률(%). */
    get chapterReturnPct(): number {
        if (this.chapterStartEquity <= 0) return 0;
        return ((this.equity - this.chapterStartEquity) / this.chapterStartEquity) * 100;
    }

    get ruinLine(): number { return RUIN_LINE; }
    get isRuined(): boolean { return this.equity < RUIN_LINE; }
    get trustLost(): boolean { return this.player.trust <= 0; }

    /** 이 챕터가 끝났는가. 턴을 다 썼거나, 자본잠식이거나, 신뢰가 0 이거나. */
    get isOver(): boolean {
        return this.player.currentTurn > this.player.maxTurns || this.isRuined || this.trustLost;
    }

    /** 지난 턴에 손절이 걸린 종목들. */
    get stoppedOut(): readonly string[] { return this.stoppedIds; }

    /* ── 읽기 ────────────────────────────────────────────── */

    /**
     * **읽어 낸 것만** 돌려준다. 카드가 안 열어 준 것은 null 이다.
     *
     * 국면은 시장의 것이지만 **포커스 종목의 베타를 먹여서** 준다 — "상승 국면" 이라는
     * 말보다 "이 종목은 턴당 +6.8%" 가 쓸모 있고, 베타가 있어야 종목을 고를 수 있다.
     */
    read(buff: TurnBuff): MarketRead {
        if (buff.blind) return blindRead();
        const here = this.market[this.absTurn - 1];
        const depth = here ? Math.max(0, buff.regimeDepth) : 0;
        const after = depth >= 3 ? this.regimeAfter() : null;
        const beta = this.focusStock.beta;
        const plan = this.plans[this.focus] ?? [];

        return {
            next: plan
                .slice(this.absTurn - 1, this.absTurn - 1 + Math.max(0, buff.peekTurns))
                // **이번 턴 것에는 이번 턴의 카드가 얹힌다.** 계획을 날것으로 내주면
                // 방어를 든 채 −8% 예보를 보고 겁을 먹는데 실제로는 −4% 가 온다.
                .map((t, i) => moveWith(t.base, i === 0 ? buff : NO_BUFF) * 100),
            regime: depth >= 1 ? here!.regime : null,
            regimeDrift: depth >= 1 ? here!.drift * beta * 100 : null,
            turnsLeft: depth >= 2 ? here!.turnsLeft : null,
            nextRegime: depth >= 3 ? after : null,
            nextDrift: depth >= 4 && after ? this.driftAfter() * beta * 100 : null,
        };
    }

    /** 지금 국면 다음에 오는 것. 전 구간이 여기서 끝나면 null. */
    private regimeAfter(): Regime | null {
        const now = this.market[this.absTurn - 1]?.regime;
        if (!now) return null;
        for (let i = this.absTurn; i < this.market.length; i++) {
            const r = this.market[i]!.regime;
            if (r !== now) return r;
        }
        return null;
    }

    private driftAfter(): number {
        const now = this.market[this.absTurn - 1]?.regime;
        for (let i = this.absTurn; i < this.market.length; i++) {
            if (this.market[i]!.regime !== now) return this.market[i]!.drift;
        }
        return 0;
    }

    /* ── 한 턴 ───────────────────────────────────────────── */

    /**
     * 시장을 한 번 굴린다. **상장한 모든 종목이 움직인다** — 안 산 종목도 흐른다.
     * 그래야 시세판이 살아 있고, 안 고른 것의 값도 나중에 청구된다.
     *
     * 카드(buff)는 **포커스 종목에만** 얹힌다. 방어는 내가 보고 있는 자리를 지키는 것이지
     * 시장 전체를 눌러 주는 것이 아니다.
     */
    tick(buff: TurnBuff = NO_BUFF): TickResult[] {
        const m = this.market[this.absTurn - 1];
        this.stoppedIds = [];
        const out: TickResult[] = [];

        for (const stock of this.listed) {
            const planned = this.plans[stock.id]?.[this.absTurn - 1] ?? { base: 0 };
            const change = moveWith(planned.base, stock.id === this.focus ? buff : NO_BUFF);

            const open = stock.currentPrice;
            const close = Math.max(100, Math.round(open * (1 + change)));
            const candle = makeCandle(open, close, stock.volatility, this.rand);

            stock.history.push(candle);
            stock.currentPrice = close;

            const changePct = ((close - open) / open) * 100;
            out.push({ id: stock.id, candle, changePct, news: null });

            // 손절 예약 — 정해 둔 만큼 빠졌으면 그 자리에서 던진다. 포커스 종목만.
            if (buff.stopLoss > 0 && stock.id === this.focus
                && this.positionOf(stock.id).shares > 0
                && changePct <= -buff.stopLoss * 100) {
                this.sellAll(stock.id, buff);
                this.stoppedIds.push(stock.id);
            }
        }

        // 뉴스는 시장의 것이라 한 번만 붙인다.
        if (out.length > 0 && m?.news) out[0]!.news = m.news;

        // 이자 — 신용을 쓴 값이다. 현금이 없으면 뗄 것도 없다.
        if (buff.cashDrainPct > 0) {
            this.player.cash -= Math.floor(this.player.cash * buff.cashDrainPct);
        }
        return out;
    }

    /** 턴을 하나 넘긴다. 전 구간 커서와 챕터 안 커서가 함께 움직인다. */
    advanceTurn(): void {
        this.player.currentTurn += 1;
        this.absTurn = Math.min(TOTAL_TURNS, this.absTurn + 1);
    }

    /* ── 체결 ───────────────────────────────────────────── */

    /** 현금의 절반으로 산다. */
    buyHalf(id: string, buff?: TurnBuff): TradeResult {
        return this.buy(id, Math.floor(this.buyingPower(buff) / 2), buff);
    }

    /** 살 수 있는 만큼 전부 산다. */
    buyAll(id: string, buff?: TurnBuff): TradeResult {
        return this.buy(id, this.buyingPower(buff), buff);
    }

    /** 이번 턴에 동원할 수 있는 돈. 신용은 여기서만 커진다. */
    private buyingPower(buff?: TurnBuff): number {
        return Math.floor(this.player.cash * Math.max(1, buff?.buyingPowerMult ?? 1));
    }

    /**
     * 예산 안에서 최대한 산다. 수수료까지 예산 안에 들어와야 한다.
     *
     * 신용을 쓰면 예산이 현금보다 크다. 그때는 현금이 음수가 되는데, 그것이 곧 빚이고
     * 자본잠식선이 그만큼 가까워진다 — 신용의 값이다.
     */
    buy(id: string, budget: number, buff?: TurnBuff): TradeResult {
        const stock = this.byId[id];
        if (!stock) return { ok: false, error: "없는 종목입니다." };
        if (stock.listedAt > this.absTurn) return { ok: false, error: "아직 상장 전입니다." };

        const price = stock.currentPrice;
        if (price <= 0) return { ok: false, error: "가격을 읽지 못했습니다." };

        const feeMult = Math.max(0, buff?.feeMult ?? 1);
        // 한 주에 얹는 수수료는 **올려서** 잡는다. 내려서 잡으면 한 주마다 1원 미만이
        // 모자라고, 그 부스러기가 주수만큼 쌓여 실제 수수료가 예산을 넘는다.
        const perShare = price + Math.ceil((price * BUY_FEE_NUM * feeMult) / FEE_DENOM);
        const qty = Math.floor(Math.max(0, budget) / Math.max(1, perShare));
        if (qty < 1) return { ok: false, error: "현금이 한 주 값에 못 미칩니다." };

        const gross = price * qty;
        const fee = Math.floor(cut(gross, BUY_FEE_NUM) * feeMult);
        const total = gross + fee;

        const pos = this.positionOf(id);
        const prevCost = pos.avgPrice * pos.shares;
        const nextShares = pos.shares + qty;

        this.player.cash -= total;
        this.player.positions[id] = { shares: nextShares, avgPrice: (prevCost + total) / nextShares };
        this.recommended = true;

        return { ok: true, id, side: "buy", qty, price, fee, cash: this.player.cash };
    }

    /** 한 종목의 보유 전량을 판다. */
    sellAll(id: string, buff?: TurnBuff): TradeResult {
        const stock = this.byId[id];
        if (!stock) return { ok: false, error: "없는 종목입니다." };
        const pos = this.positionOf(id);
        const qty = pos.shares;
        if (qty < 1) return { ok: false, error: "팔 주식이 없습니다." };

        const price = stock.currentPrice;
        const gross = price * qty;
        const feeMult = Math.max(0, buff?.feeMult ?? 1);
        const fee = Math.floor((cut(gross, SELL_FEE_NUM) + cut(gross, SELL_TAX_NUM)) * feeMult);

        this.player.cash += gross - fee;
        delete this.player.positions[id];

        return { ok: true, id, side: "sell", qty, price, fee, cash: this.player.cash };
    }

    /** 들고 있는 것을 전부 판다. 공원으로 갈 때만 쓴다. */
    liquidateAll(): void {
        for (const id of Object.keys(this.player.positions)) this.sellAll(id);
    }

    /* ── 챕터를 넘긴다 ───────────────────────────────────── */

    /**
     * 이번 챕터의 성적. **자동 청산하지 않는다** — 들고 넘어가는 것이 이 게임의 요점이다.
     *
     * 남은 빚에는 이자가 붙는다. 1997 을 지나온 사람에게 시간은 비용이다.
     */
    endChapter(earned: readonly string[] = []): ChapterSummary {
        const finalEquity = this.equity;
        const returnPct = this.chapterReturnPct;
        this.player.debt = Math.round(this.player.debt * (1 + this.chapter.interest));
        if (this.chapter.debtOnEnd) this.player.debt += this.chapter.debtOnEnd;

        return {
            returnPct,
            startEquity: this.chapterStartEquity,
            finalEquity,
            trust: this.player.trust,
            debt: this.player.debt,
            idle: !this.recommended,
            ruined: this.isRuined,
            trustLost: this.trustLost,
            earned: [...earned],
        };
    }

    /** 다음 챕터를 연다. 보유도 현금도 신뢰도 **그대로 이어진다.** */
    startNextChapter(): boolean {
        const idx = CHAPTERS.indexOf(this.chapter);
        const next = CHAPTERS[idx + 1];
        if (!next) return false;
        this.chapter = next;
        this.absTurn = next.startTurn;
        this.player.currentTurn = 1;
        this.player.maxTurns = next.turns;
        this.chapterStartEquity = this.equity;
        this.recommended = false;
        this.stoppedIds = [];
        // 새 챕터의 첫 종목이 이미 상장해 있으면 그것을 본다.
        if (!this.listed.some(s => s.id === this.focus)) {
            this.focus = this.listed[0]?.id ?? this.focus;
        }
        return true;
    }

    /** 마지막 챕터인가. */
    get isFinalChapter(): boolean { return this.chapter === CHAPTERS[CHAPTERS.length - 1]; }
}

export { chapterAtTurn, TOTAL_TURNS };
