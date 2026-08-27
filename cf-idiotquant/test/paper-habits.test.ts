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

test("한 번 사서 한 번 팔면 보유일이 그대로", () => {
    const c = makeCandles();
    const h = run([buy(20, 10, c[20].c), sell(27, 10, c[27].c)]);

    assert.equal(h.trades, 2);
    assert.equal(h.buys, 1);
    assert.equal(h.closedLots, 1);
    assert.equal(h.holdDays, 7, "20일에 사서 27일에 팔면 7일");
});

test("FIFO — 나눠 팔면 조각마다 보유일이 다르다", () => {
    const c = makeCandles();
    // 20일에 10주 매수 → 24일에 4주, 30일에 6주 매도
    const h = run([buy(20, 10, c[20].c), sell(24, 4, c[24].c), sell(30, 6, c[30].c)]);

    assert.equal(h.closedLots, 2);
    // 수량 가중: (4×4 + 6×10) / 10 = 7.6
    assert.equal(h.holdDays, 7.6);
});

test("FIFO — 매도 하나가 여러 매수에 걸치면 쪼개진다", () => {
    const c = makeCandles();
    // 20일 5주, 25일 5주 매수 → 30일에 8주 한 번에 매도
    const h = run([buy(20, 5, c[20].c), buy(25, 5, c[25].c), sell(30, 8, c[30].c)]);

    assert.equal(h.closedLots, 2, "먼저 산 5주와 나중에 산 3주로 갈라져야 한다");
    // (5주 × 10일 + 3주 × 5일) / 8 = 8.1
    assert.equal(h.holdDays, 8.1);
});

test("자동 청산은 습관에서 뺀다 — 플레이어의 선택이 아니다", () => {
    const c = makeCandles();
    const manualOnly = run([buy(20, 10, c[20].c)]);
    const withAuto = run([buy(20, 10, c[20].c), sell(TOTAL - 1, 10, c[TOTAL - 1].c, { auto: 1 })]);

    assert.deepEqual(withAuto, manualOnly, "강제 청산이 값을 바꾸면 안 된다");
    assert.equal(withAuto.trades, 1);
    assert.equal(withAuto.closedLots, 0, "청산으로 닫힌 건 보유일 통계에 들어가면 안 된다");
    assert.equal(withAuto.holdDays, null, "판 매도가 없으니 보유일은 말할 수 없다");
});

test("진입 타이밍 — 오르는 구간에서만 사면 추격 100%", () => {
    const h = run([buy(25, 5, 12500), buy(30, 5, 13000)], { candles: makeCandles(i => 10000 + i * 100) });
    assert.equal(h.chaseRatio, 100);
    assert.ok((h.entryTrend ?? 0) > 0, "직전 5일이 오르는 중이어야 한다");
});

test("진입 타이밍 — 내리는 구간에서만 사면 추격 0%", () => {
    const falling = makeCandles(i => 20000 - i * 100);
    const h = run([buy(25, 5, 17500), buy(30, 5, 17000)], { candles: falling });
    assert.equal(h.chaseRatio, 0, "떨어질 때 샀으면 추격이 아니다");
    assert.ok((h.entryTrend ?? 0) < 0);
});

test("진입 타이밍 — 섞이면 수량으로 가중된다", () => {
    // 앞 30일 상승, 뒤 30일 하락
    const hill = makeCandles(i => (i < 30 ? 10000 + i * 100 : 13000 - (i - 30) * 100));
    // 오를 때 9주, 내릴 때 1주 → 추격 90%
    const h = run([buy(25, 9, hill[25].c), buy(40, 1, hill[40].c)], { candles: hill });
    assert.equal(h.chaseRatio, 90);
});

test("처분효과 — 이익은 빨리 손실은 오래 팔면 드러난다", () => {
    const c = makeCandles(() => 10000);
    const h = run([
        buy(20, 10, 10000), sell(22, 10, 11000),   // 이익, 2일 만에
        buy(25, 10, 10000), sell(40, 10, 9000),    // 손실, 15일 들고
    ], { candles: c });

    assert.equal(h.gainHoldDays, 2);
    assert.equal(h.lossHoldDays, 15);
    assert.equal(h.disposition, 13, "손실을 13일 더 오래 들고 있었다");
});

test("처분효과 — 한쪽만 있으면 말하지 않는다", () => {
    const c = makeCandles(() => 10000);
    const gainOnly = run([buy(20, 10, 10000), sell(22, 10, 11000)], { candles: c });
    assert.equal(gainOnly.gainHoldDays, 2);
    assert.equal(gainOnly.lossHoldDays, null);
    assert.equal(gainOnly.disposition, null, "손실 매도가 없는데 처분효과를 말하면 안 된다");

    const lossOnly = run([buy(20, 10, 10000), sell(22, 10, 9000)], { candles: c });
    assert.equal(lossOnly.gainHoldDays, null);
    assert.equal(lossOnly.disposition, null);
});

test("투입 강도 — 한 번에 넣은 비중과 관망 비율", () => {
    const c = makeCandles(() => 10000);
    // 시드 1,000만 / 주당 1만 → 500주면 절반
    const h = run([buy(20, 500, 10000)], { candles: c });

    assert.equal(h.biteShare, 50, "총자산의 절반을 한 번에 넣었다");
    assert.equal(h.tradableDays, TOTAL - CONTEXT + 1);
    // 41일 중 하루만 거래 → 40/41
    assert.equal(h.watchRatio, 97.6);
});

test("한 주도 안 사고 관망만 한 판", () => {
    const h = run([]);
    assert.equal(h.trades, 0);
    assert.equal(h.turnover, 0);
    assert.equal(h.maxExposure, 0);
    assert.equal(h.watchRatio, 100);
    // 말할 수 없는 것들은 전부 null — 0 으로 채우면 "0일 보유"처럼 읽힌다
    assert.equal(h.holdDays, null);
    assert.equal(h.entryTrend, null);
    assert.equal(h.chaseRatio, null);
    assert.equal(h.disposition, null);
    assert.equal(h.biteShare, null);
});

test("회전율 — 시드 대비 총 매수대금", () => {
    const c = makeCandles(() => 10000);
    const h = run([buy(20, 500, 10000), sell(25, 500, 10000), buy(30, 500, 10000)], { candles: c });
    assert.equal(h.turnover, 1, "500만 × 2회 = 1,000만 = 시드 1배");
});

test("중도 포기한 판은 그날까지만 거래 가능일로 센다", () => {
    const h = run([], { cursor: 30 });
    assert.equal(h.tradableDays, 30 - CONTEXT + 1);
});
