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
import { advisoryFee } from "./energy";
import {
    CHAPTERS, CONTEXT_BARS, TOTAL_TURNS, UNIVERSE, chapterAtTurn, regimeTimeline,
    type Chapter, type StockDef,
} from "./chapters";
import {
    LIVING_COST, PARTTIME_ENERGY, PARTTIME_PAY, SALARY_LEFT, WALLET_START,
    payLiving, repay, type LivingResult, type RepayResult,
} from "./wallet";

/** 되돌릴 수 있게 떠 둔 체결 상태. `markTrades()` 가 만들고 `restoreTrades()` 가 되돌린다. */
export interface TradeMark {
    cash: number;
    positions: Record<string, Position>;
    /** 이 챕터에 한 번이라도 권했는가. 챕터 결산의 `idle` 이 이 값을 본다. */
    recommended: boolean;
    /**
     * 이 챕터를 시작한 자산. **무를 때 이것까지 되돌려야 한다** — 권하는 순간 고객이
     * 맡긴 돈만큼 같이 올라가 있기 때문이다(`entrust`). 안 되돌리면 무른 뒤에도 기준이
     * 올라간 채로 남아, 실제로는 안 받은 돈이 「내가 못 불린 것」으로 세어진다.
     */
    chapterStart: number;
}

/* ── 상수 ───────────────────────────────────────────────────── */

/**
 * **프롤로그(1997)에 굴리고 있던 고객 돈.** 증권사 자리에서 이미 맡고 있던 것이다.
 *
 * ── 이 값은 이제 1998 로 넘어오지 않는다 ────────────────────
 * 예전에는 이 돈이 판 전체의 시작 자금이었다. 지금은 프롤로그가 끝날 때 회사와 함께
 * 없어진다(`chapters.ts` 의 `accountLost`) — 1998 은 **계좌 0원**으로 열리고, 굴릴 돈은
 * 고객이 새로 맡겨야 생긴다(`core/clients.ts` 의 `entrustAmount`). 그러니 아래의
 * 밸런스 셈은 **프롤로그의 규모**를 정하는 값으로만 남는다. 판 전체의 운용 규모를
 * 정하는 것은 이제 `ENTRUST_BASE` 와 에너지다.
 *
 * ── 왜 1천만이 아니라 2천5백만인가 ──────────────────────────
 * 이 값이 1천만이던 동안 **빚 완납은 도달할 수 없었다.** 규칙만 300판씩 굴려 재 본 값이다:
 *
 *   아무 근거 없이   에너지 0 으로 소진 100%          누적 보수 148만
 *   골라서 굴리면    빚 남음 91% · 자본잠식 9%        누적 보수 859만
 *   거의 완벽하게    빚 남음 100%                     누적 보수 1,206만
 *
 * 셋 다 빚 완납 **0%** 였다. 이유는 취향이 아니라 산수다. 보수는 맡은 돈에서 나온 수익에
 * 비례하는데(`advisoryFee`), 1천만짜리 판에서 나오는 보수를 다 합쳐도 3천만에 못 미친다.
 * 게다가 마지막 장(2000)은 국면이 처음부터 끝까지 하락이라 수익이 없고, 수익이 없으면
 * 보수도 0 이라 **빚이 15% 불어난 채로 판이 끝난다.** 실제로 갚을 수 있는 장은 1999
 * 하나뿐이었고, 그 한 장으로는 모자랐다.
 *
 * 고칠 수 있는 자리는 셋이었다 — 빚을 줄이거나, 이자를 낮추거나, 맡은 돈을 늘리거나.
 * **맡은 돈을 골랐다. 셋 중 이야기가 정해 두지 않은 유일한 값이라서다** — 「빚 3천만원」은
 * 이야기의 전제이고 이자는 그 시절의 사실인데, 명동 사무실에 얼마가 맡겨졌는지는
 * 아무도 말한 적이 없다. 2천5백만으로 올리면 이렇게 된다.
 *
 *   아무 근거 없이   소진 100% · 완납 0%      벌 자격을 못 얻으면 여전히 못 갚는다
 *   골라서 굴리면    완납 13%
 *   거의 완벽하게    완납 37%
 *
 * **이 값을 내리려면 `test/game-engine.test.ts` 의 「빚은 1999년까지 갚을 수 있어야
 * 한다」를 먼저 볼 것.** 그 셈이 여기서 막혔던 것을 붙잡는다.
 */
export const SEED_CASH = 25_000_000;

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
 * 자본잠식 — 맡은 돈이 **이 판의 최고치 대비** 이 비율 아래로 떨어지면 그 자리에서 끝난다.
 *
 * ── 왜 고정값이 아니라 최고치 기준인가 ─────────────────────
 * 예전에는 `SEED_CASH × 0.2` 라는 **고정 금액**이었다. 판이 언제나 2,500만원으로
 * 열렸으니 그래도 됐다. 이제 1998 은 **0원으로 열린다**(`accountLost`) — 고정선을 두면
 * 첫 턴에 이미 그 아래라 판이 열리자마자 끝난다.
 *
 * 그래서 「처음의 20%」를 「가장 컸을 때의 20%」로 옮긴다. 뜻은 오히려 더 맞는다 —
 * 자본잠식은 *얼마를 들고 시작했나* 가 아니라 **불린 것을 얼마나 날렸나** 의 이야기다.
 * 아직 아무것도 안 맡은 계좌(최고치 0)는 잠식될 것도 없으므로 발동하지 않는다.
 */
export const RUIN_RATIO = 0.2;

/**
 * 자본잠식이 발동하기 시작하는 최고치. 이보다 작게 굴려 본 판은 잠식으로 안 끝난다.
 *
 * 없으면 첫 턴에 160만을 맡아 32만까지 흔들린 것만으로 판이 끝난다 — 그건 잠식이
 * 아니라 그냥 작은 판이다.
 */
export const RUIN_FLOOR = 5_000_000;

/** 에너지는 여기서 시작한다. 매 턴 저절로 줄기 때문에 가만히 있으면 못 버틴다. */
export const ENERGY_START = 50;
export const ENERGY_MAX = 100;

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
    /**
     * 이 **판**에서 맡은 돈이 가장 컸을 때. 챕터를 넘어도 안 지워진다 — 회귀할 때
     * 엔진이 새로 뜨면서 같이 사라진다.
     *
     * **턴이 넘어갈 때만 잰다.** 턴 안에서 재면 무른 매매(`restoreTrades`)가 만든 값이
     * 최고 기록으로 남는다 — 무른 것은 일어나지 않은 일이다.
     */
    private peak: number;
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
            energy: ENERGY_START,
            debt: 0,
            // 프롤로그의 나는 아직 월급쟁이다. 지갑이 비는 것은 회사가 없어지는
            // 1998 부터이고, 그 자리는 `startNextChapter` 의 `accountLost` 가 만든다.
            wallet: SALARY_LEFT,
        };
        this.applyOpening(this.chapter);
        this.chapterStartEquity = this.equity;
        this.peak = this.equity;
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

    /** 이 챕터를 시작한 자산. 장부가 「챕터 시작」 줄에 적는다. */
    get chapterStart(): number { return this.chapterStartEquity; }

    /**
     * 지금 턴의 국면. **화면에 그대로 내보내지 말 것** — 국면을 읽는 값은
     * `read(buff)` 하나뿐이고, 그건 알아본 만큼만 열린다.
     *
     * 이 자리는 **연대기에 적기 위한 것**이다(`core/chronicle.ts`). 턴이 끝날 때
     * 씬이 이 값을 기억에 넣고, 다음 회차에 그 턴에 오면 기억 쪽에서 읽는다.
     * 여기서 바로 화면에 쓰면 알아보기가 공짜가 되어 규칙이 통째로 무너진다.
     */
    get regimeNow(): Regime | null {
        return this.market[this.absTurn - 1]?.regime ?? null;
    }
    /** 이 판에서 맡은 돈이 가장 컸을 때. 턴이 넘어갈 때마다 갱신된다. */
    get peakEquity(): number { return this.peak; }

    /** 지금 자본잠식선. 최고치를 못 넘긴 판은 0 이라 발동하지 않는다. */
    get ruinLine(): number {
        return this.peak < RUIN_FLOOR ? 0 : Math.round(this.peak * RUIN_RATIO);
    }
    get isRuined(): boolean {
        const line = this.ruinLine;
        return line > 0 && this.equity < line;
    }
    get burnedOut(): boolean { return this.player.energy <= 0; }

    /** 이 챕터가 끝났는가. 턴을 다 썼거나, 자본잠식이거나, 에너지가 0 이거나. */
    get isOver(): boolean {
        return this.player.currentTurn > this.player.maxTurns || this.isRuined || this.burnedOut;
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
        // 최고 기록은 **넘어간 턴의 것**이다. 턴 안에서 재면 무른 매매가 만든 값이
        // 남는데, 무른 것은 일어나지 않은 일이다.
        this.peak = Math.max(this.peak, this.equity);
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

    /* ── 무름 ────────────────────────────────────────────
       체결은 **턴 안에서 되돌릴 수 있다.** 주가는 `tick()` 에서만 움직이므로, 턴이
       넘어가기 전이라면 현금과 보유를 그대로 되돌려 놓는 것으로 충분하다 — 되돌린 뒤에
       다시 사면 값도 수수료도 똑같다. 그래서 무름에 이득이 없고, 오직 잘못 누른 것을
       고치는 데만 쓰인다.

       **엔진이 자기 상태를 떠 둔다.** 씬이 `player.cash` 와 `positions` 를 직접 베껴
       두면 `recommended`(챕터에 한 번이라도 권했는가) 같은 안쪽 값이 빠지고, 그러면
       무른 판인데도 챕터 결산이 「한 번도 권하지 않았다」를 안 적는다. */

    /** 지금 체결 상태를 떠 둔다. */
    markTrades(): TradeMark {
        const positions: Record<string, Position> = {};
        for (const [id, p] of Object.entries(this.player.positions)) positions[id] = { ...p };
        return {
            cash: this.player.cash, positions, recommended: this.recommended,
            chapterStart: this.chapterStartEquity,
        };
    }

    /**
     * 떠 둔 자리로 되돌린다. **주가는 안 건드린다** — 무름은 턴 안에서만 일어나고,
     * 그 사이에 주가는 움직이지 않았다.
     */
    restoreTrades(m: TradeMark): void {
        const positions: Record<string, Position> = {};
        for (const [id, p] of Object.entries(m.positions)) positions[id] = { ...p };
        this.player.cash = m.cash;
        this.player.positions = positions;
        this.recommended = m.recommended;
        this.chapterStartEquity = m.chapterStart;
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

    /* ── 내 돈 ───────────────────────────────────────────── */

    /**
     * 고객이 돈을 맡긴다. **맡은 돈이 늘어나는 자리는 여기 하나뿐이다.**
     *
     * 액수는 `core/clients.ts` 의 `entrustAmount` 가 낸다 — 에너지와 그 사람의 형편이
     * 정한다. 여기서는 받아 넣기만 한다.
     *
     * `chapterStartEquity` 를 **같이 올린다.** 안 그러면 새로 맡은 돈이 「내가 불린 것」으로
     * 세어져, 아무것도 안 하고 맡기만 해도 보수가 나온다. 보수는 **굴려서 늘린 만큼**이다.
     */
    entrust(amount: number): number {
        const got = Math.max(0, Math.floor(amount));
        if (got <= 0) return 0;
        this.player.cash += got;
        this.chapterStartEquity += got;
        return got;
    }

    /** 한 턴의 생활비를 낸다. 못 내면 급전을 당겨 빚이 는다. */
    payLivingCost(cost: number = LIVING_COST): LivingResult {
        const r = payLiving(this.player.wallet, this.player.debt, cost);
        this.player.wallet = r.wallet;
        this.player.debt = r.debt;
        return r;
    }

    /**
     * 하루를 판다. 에너지를 내주고 일당을 받는다.
     *
     * **에너지가 모자라도 한다.** 굶는 것보다는 나으므로 막지 않는다 — 대신 에너지가
     * 0 으로 바닥나 그 자리에서 판이 끝날 수 있다(`burnout`). 그 선택까지가 플레이어 것이다.
     */
    workShift(pay: number = PARTTIME_PAY, energy: number = PARTTIME_ENERGY): number {
        this.player.wallet += pay;
        this.player.energy = Math.max(0, this.player.energy - energy);
        return pay;
    }

    /** 지갑에서 빚으로. 액수는 부르는 쪽이 정한다. */
    repayDebt(amount: number): RepayResult {
        const r = repay(this.player.wallet, this.player.debt, amount);
        this.player.wallet = r.wallet;
        this.player.debt = r.debt;
        return r;
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

        // **보수는 지갑으로 들어온다.** 예전에는 이 값이 곧장 빚에서 깎였다 — 편했지만
        // 결정이 없었다. 이제 받은 돈을 갚을지 쥐고 있을지는 집에서 내가 고른다
        // (`core/wallet.ts` 의 `repay`). 갚는 것은 여전히 맡은 돈이 아니라 내가 받은 보수다.
        const fee = advisoryFee(finalEquity - this.chapterStartEquity, this.player.energy);
        this.player.wallet += fee;
        // **이자는 지금 남아 있는 빚에 붙는다.** 그래서 이 챕터가 끝나기 **전에** 갚아 둔
        // 돈이 가장 값어치가 크다 — 상환을 손에 쥐여 준 대가로 생긴 선택이 이것이다.
        this.player.debt = Math.round(this.player.debt * (1 + this.chapter.interest));
        if (this.chapter.debtOnEnd) this.player.debt += this.chapter.debtOnEnd;

        return {
            returnPct,
            fee,
            startEquity: this.chapterStartEquity,
            finalEquity,
            energy: this.player.energy,
            debt: this.player.debt,
            wallet: this.player.wallet,
            idle: !this.recommended,
            ruined: this.isRuined,
            burnedOut: this.burnedOut,
            earned: [...earned],
        };
    }

    /**
     * 다음 챕터를 연다. 보유도 현금도 에너지도 **그대로 이어진다** — 단 하나,
     * `accountLost` 가 붙은 챕터를 지나올 때만 계좌가 통째로 없어진다.
     */
    startNextChapter(): boolean {
        const idx = CHAPTERS.indexOf(this.chapter);
        const next = CHAPTERS[idx + 1];
        if (!next) return false;
        // **회사가 없어진다.** 1998 의 내레이션이 처음부터 말하던 것을 규칙이 이제야
        // 따라간다 — 맡긴 사람들은 그 돈을 잃었고, 나는 빈손으로 명동 3층에 앉는다.
        if (this.chapter.accountLost) {
            this.player.positions = {};
            this.player.cash = 0;
            this.player.wallet = WALLET_START;
            this.peak = 0;
        }
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
