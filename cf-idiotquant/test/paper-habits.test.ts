// 매매 습관 계산 — 워커(src/lib/habits.js)와 같은 답을 내는가.
//
// 기대값은 워커 test/habits.test.js 에서 그대로 가져왔다(여러 판을 합치는 summarizeHabits
// 는 워커에만 있어 뺐다). 이 값들은 사용자에게 "당신은 이렇게 했다"고 말하는 숫자라
// 틀리면 없느니만 못하므로, 손으로 계산할 수 있는 작은 판으로 하나하나 못박는다.
//
// 특히 "말할 수 없을 때 말하지 않는지"(null)를 함께 고정한다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { computeHabits } from "@/lib/paper/habits";
import type { Candle, ReplayOrder } from "@/lib/paper/round";

const CONTEXT = 20;
const TOTAL = 60;
const SEED = 10_000_000;

/** 종가를 마음대로 정하는 캔들. 기본은 하루 100원씩 오른다. */
const makeCandles = (priceAt: (i: number) => number = i => 10000 + i * 100): Candle[] =>
    Array.from({ length: TOTAL }, (_, i) => {
        const c = priceAt(i);
        return {
            d: `2024${String(1 + Math.floor(i / 28)).padStart(2, "0")}${String((i % 28) + 1).padStart(2, "0")}`,
            o: c, h: c, l: c, c,
        };
    });

const run = (orders: ReplayOrder[], opts: { candles?: Candle[]; cursor?: number } = {}) =>
    computeHabits({
        candles: opts.candles ?? makeCandles(),
        orders,
        cursor: opts.cursor ?? TOTAL,
        seed: SEED,
        contextDays: CONTEXT,
    });

const buy = (day: number, qty: number, price: number): ReplayOrder =>
    ({ day_index: day, side: "buy", qty, price });
const sell = (day: number, qty: number, price: number, extra: Partial<ReplayOrder> = {}): ReplayOrder =>
    ({ day_index: day, side: "sell", qty, price, ...extra });

test("한 번 사서 한 번 팔면 보유일이 그대로 · FIFO — 나눠 팔면 조각마다 보유일이 다르다", () => {
    // ── 한 번 사서 한 번 팔면 보유일이 그대로
    {
        const c = makeCandles();
        const h = run([buy(20, 10, c[20].c), sell(27, 10, c[27].c)]);

        assert.equal(h.trades, 2);
        assert.equal(h.buys, 1);
        assert.equal(h.closedLots, 1);
        assert.equal(h.holdDays, 7, "20일에 사서 27일에 팔면 7일");
    }

    // ── FIFO — 나눠 팔면 조각마다 보유일이 다르다
    {
        const c = makeCandles();
        // 20일에 10주 매수 → 24일에 4주, 30일에 6주 매도
        const h = run([buy(20, 10, c[20].c), sell(24, 4, c[24].c), sell(30, 6, c[30].c)]);

        assert.equal(h.closedLots, 2);
        // 수량 가중: (4×4 + 6×10) / 10 = 7.6
        assert.equal(h.holdDays, 7.6);
    }
});

test("FIFO — 매도 하나가 여러 매수에 걸치면 쪼개진다 · 자동 청산은 습관에서 뺀다 — 플레이어의 선택이 아니다", () => {
    // ── FIFO — 매도 하나가 여러 매수에 걸치면 쪼개진다
    {
        const c = makeCandles();
        // 20일 5주, 25일 5주 매수 → 30일에 8주 한 번에 매도
        const h = run([buy(20, 5, c[20].c), buy(25, 5, c[25].c), sell(30, 8, c[30].c)]);

        assert.equal(h.closedLots, 2, "먼저 산 5주와 나중에 산 3주로 갈라져야 한다");
        // (5주 × 10일 + 3주 × 5일) / 8 = 8.1
        assert.equal(h.holdDays, 8.1);
    }

    // ── 자동 청산은 습관에서 뺀다 — 플레이어의 선택이 아니다
    {
        const c = makeCandles();
        const manualOnly = run([buy(20, 10, c[20].c)]);
        const withAuto = run([buy(20, 10, c[20].c), sell(TOTAL - 1, 10, c[TOTAL - 1].c, { auto: 1 })]);

        assert.deepEqual(withAuto, manualOnly, "강제 청산이 값을 바꾸면 안 된다");
        assert.equal(withAuto.trades, 1);
        assert.equal(withAuto.closedLots, 0, "청산으로 닫힌 건 보유일 통계에 들어가면 안 된다");
        assert.equal(withAuto.holdDays, null, "판 매도가 없으니 보유일은 말할 수 없다");
    }
});

test("진입 타이밍 — 오르는 구간에서만 사면 추격 100% · 진입 타이밍 — 내리는 구간에서만 사면 추격 0%", () => {
    // ── 진입 타이밍 — 오르는 구간에서만 사면 추격 100%
    {
        const h = run([buy(25, 5, 12500), buy(30, 5, 13000)], { candles: makeCandles(i => 10000 + i * 100) });
        assert.equal(h.chaseRatio, 100);
        assert.ok((h.entryTrend ?? 0) > 0, "직전 5일이 오르는 중이어야 한다");
    }

    // ── 진입 타이밍 — 내리는 구간에서만 사면 추격 0%
    {
        const falling = makeCandles(i => 20000 - i * 100);
        const h = run([buy(25, 5, 17500), buy(30, 5, 17000)], { candles: falling });
        assert.equal(h.chaseRatio, 0, "떨어질 때 샀으면 추격이 아니다");
        assert.ok((h.entryTrend ?? 0) < 0);
    }
});
