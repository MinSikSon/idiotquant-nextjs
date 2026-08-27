// 반기 한 판을 브라우저에서 굴리는 규칙.
//
// 이 파일이 지키는 것은 "화면이 보여 준 판"과 "서버에 저장될 결과"가 같은 규칙에서
// 나온다는 것이다. 워커(tradeReplayRoundD1 · _fillReservations · _finish)와 같은 순서·
// 같은 값이어야 한다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    halfTrade, halfAdvance, halfGiveUp, halfReserve, halfCancel, finishHalf, halfSubmission,
} from "@/lib/paper/half";
import { SEED } from "@/lib/paper/engine";
import type { Candle, ReplayHolding, ReplayRound } from "@/lib/paper/round";

const TOTAL = 60;
const CONTEXT = 20;

/** 값이 정해진 캔들. 기본은 내내 같은 값이라 수수료 말고는 움직이지 않는다. */
const candles = (priceAt: (i: number) => number, len = TOTAL): Candle[] =>
    Array.from({ length: len }, (_, i) => {
        const c = priceAt(i);
        return { d: `2024${String(1 + Math.floor(i / 28)).padStart(2, "0")}${String((i % 28) + 1).padStart(2, "0")}`, o: c, h: c, l: c, c };
    });

const holding = (slot: number, priceAt: (i: number) => number): ReplayHolding => ({
    slot, qty: 0, cost_basis: 0, realized: 0, carried: false,
    sector: null, scenario: null, candles: candles(priceAt),
    ticker: null, name: null, orders: [],
});

/** 자리 넷짜리 판. 값은 자리마다 다르게 둔다 — 지수로 체결하면 바로 드러나게. */
function makeRound(over: Partial<ReplayRound> = {}): ReplayRound {
    return {
        id: "r1", cursor: CONTEXT, total_days: TOTAL, context_days: CONTEXT,
        cash: SEED, seed: SEED, qty: 0, cost_basis: 0, realized: 0, fees_paid: 0,
        status: "playing", orders: [], pending: [], sector: null, scenario: null,
        half_index: 0, campaign_id: "c1", ticker: null, name: null,
        start_date: null, end_date: null, final_return: null, bh_return: null,
        aum_before: null, aum_after: null, fee_base: null, fee_perf: null, habits: null,
        candles: candles(() => 10_000),                       // 판의 지수
        holdings: [
            holding(0, () => 10_000),
            holding(1, () => 20_000),
            holding(2, () => 5_000),
            holding(3, () => 1_000),
        ],
        ...over,
    };
}

const ok = (r: ReturnType<typeof halfTrade>): ReplayRound => {
    assert.equal(r.ok, true, r.ok ? "" : r.error);
    return (r as { ok: true; round: ReplayRound }).round;
};

/* ── 사고팔기 ─────────────────────────────────────────────────── */

test("매수하면 그 자리 보유가 늘고 현금이 준다 — 날짜는 그대로", () => {
    const r0 = makeRound();
    const r = ok(halfTrade(r0, { side: "buy", qty: 10, slot: 1 }));

    assert.equal(r.cursor, CONTEXT, "매매로 하루가 넘어가면 안 된다");
    assert.equal(r.holdings![1].qty, 10);
    assert.equal(r.holdings![0].qty, 0, "다른 자리는 그대로");
    // 20,000 × 10 = 200,000 + 수수료 30원
    assert.equal(r.cash, SEED - 200_030);
    assert.equal(r.qty, 10, "판 전체 수량에도 더해진다");
    assert.equal(r.fees_paid, 30);
    assert.equal(r.orders.length, 1);
    assert.equal(r.orders[0].slot, 1);
    assert.equal(r.orders[0].price, 20_000, "체결가는 그 자리 종목의 종가다 — 지수가 아니다");
    assert.equal(r.holdings![1].orders.length, 1, "자리별 체결 기록에도 남는다");
});

test("원본 판은 고쳐지지 않는다 — React 상태로 그대로 쓴다", () => {
    const r0 = makeRound();
    halfTrade(r0, { side: "buy", qty: 10, slot: 1 });
    assert.equal(r0.cash, SEED);
    assert.equal(r0.holdings![1].qty, 0);
    assert.equal(r0.orders.length, 0);
});

test("전량 매도하면 그 자리 원가가 0 이 된다 — 남으면 가짜 손익이 생긴다", () => {
    let r = makeRound();
    r = ok(halfTrade(r, { side: "buy", qty: 10, slot: 0 }));
    r = ok(halfTrade(r, { side: "sell", qty: 10, slot: 0 }));

    assert.equal(r.holdings![0].qty, 0);
    assert.equal(r.holdings![0].cost_basis, 0);
    assert.equal(r.qty, 0);
    assert.equal(r.cost_basis, 0);
    assert.ok(r.realized < 0, "값이 그대로면 수수료만큼 손해다");
});

test("현금보다 많이 사거나 없는 자리를 만지면 거절한다", () => {
    const r = makeRound();
    assert.equal(halfTrade(r, { side: "buy", qty: 10_000, slot: 0 }).ok, false);
    assert.equal(halfTrade(r, { side: "sell", qty: 1, slot: 0 }).ok, false);
    assert.equal(halfTrade(r, { side: "buy", qty: 1, slot: 9 }).ok, false);
    const done = { ...r, status: "done" as const };
    assert.equal(halfTrade(done, { side: "buy", qty: 1, slot: 0 }).ok, false);
});

/* ── 하루 넘기기 ─────────────────────────────────────────────── */

test("하루 넘기면 커서가 하나 는다", () => {
    const r = ok(halfAdvance(makeRound()));
    assert.equal(r.cursor, CONTEXT + 1);
    assert.equal(r.status, "playing");
});

test("예약은 커서를 민 뒤 새로 열린 날에 본다", () => {
    // 0번 자리만 그날 5,000 까지 떨어진다
    const dip = makeRound({
        holdings: [
            { ...holding(0, i => (i === CONTEXT ? 5_000 : 10_000)) },
            holding(1, () => 20_000), holding(2, () => 5_000), holding(3, () => 1_000),
        ],
    });
    const withRes = ok(halfReserve(dip, { kind: "buy_limit", price: 6_000, qty: 10, slot: 0 }));
    assert.equal(withRes.pending.length, 1);

    const r = ok(halfAdvance(withRes));
    assert.equal(r.cursor, CONTEXT + 1);
    assert.equal(r.holdings![0].qty, 10, "새로 열린 날에 체결돼야 한다");
    assert.equal(r.orders[0].price, 5_000, "갭으로 더 싸게 시작했으면 시가에 산다");
    assert.equal(r.orders[0].day_index, CONTEXT, "새로 열린 날에 찍힌다");
    assert.equal(r.pending.length, 0, "체결된 예약은 지워진다");
    assert.ok(!r.orders[0].auto, "예약도 플레이어의 결정이다 — 습관에 들어간다");
});

test("현금이 모자라 못 채운 예약은 지우지 않는다", () => {
    const dip = makeRound({
        cash: 1_000,   // 10주는 못 산다
        holdings: [
            { ...holding(0, i => (i === CONTEXT ? 5_000 : 10_000)) },
            holding(1, () => 20_000), holding(2, () => 5_000), holding(3, () => 1_000),
        ],
    });
    const withRes = ok(halfReserve(dip, { kind: "buy_limit", price: 6_000, qty: 10, slot: 0 }));
    const r = ok(halfAdvance(withRes));

    assert.equal(r.holdings![0].qty, 0);
    assert.equal(r.pending.length, 1, "조건이 다시 걸리면 그때 체결될 수 있다");
});

test("예약은 건 자리의 캔들로만 판정한다", () => {
    // 1번 자리가 떨어지는 날. 예약은 0번 자리에 걸려 있으니 안 걸려야 한다.
    const r0 = makeRound({
        holdings: [
            holding(0, () => 10_000),
            { ...holding(1, i => (i === CONTEXT ? 100 : 20_000)) },
            holding(2, () => 5_000), holding(3, () => 1_000),
        ],
    });
    const withRes = ok(halfReserve(r0, { kind: "buy_limit", price: 200, qty: 1, slot: 0 }));
    const r = ok(halfAdvance(withRes));
    assert.equal(r.pending.length, 1, "0번 자리는 10,000 그대로다");
    assert.equal(r.holdings![0].qty, 0);
});

test("예약 지우기는 자리로 — 같은 조건을 두 번 걸 수도 있다", () => {
    let r = makeRound();
    r = ok(halfReserve(r, { kind: "stop_loss", price: 9_000, qty: 1, slot: 0 }));
    r = ok(halfReserve(r, { kind: "stop_loss", price: 9_000, qty: 1, slot: 0 }));
    assert.equal(r.pending.length, 2);
    r = ok(halfCancel(r, 0));
    assert.equal(r.pending.length, 1);
    assert.equal(halfCancel(r, 5).ok, false);
});

/* ── 반기 마감 ───────────────────────────────────────────────── */

test("마지막 날에 닿으면 판이 닫히고 남은 것은 강제 청산된다", () => {
    let r = makeRound({ cursor: TOTAL });
    r = ok(halfTrade(r, { side: "buy", qty: 10, slot: 0 }));

    const res = halfAdvance(r);
    assert.equal(res.ok, true);
    assert.equal((res as { done?: boolean }).done, true);
    const fin = ok(res);

    assert.equal(fin.status, "done");
    assert.equal(fin.holdings![0].qty, 0, "이월을 안 골랐으면 다 판다");
    assert.equal(fin.qty, 0);
    const auto = fin.orders.filter(o => o.auto);
    assert.equal(auto.length, 1);
    assert.equal(auto[0].side, "sell");
    assert.equal(auto[0].day_index, TOTAL - 1);
});

test("강제 청산은 습관에서 빠진다", () => {
    let r = makeRound({ cursor: TOTAL });
    r = ok(halfTrade(r, { side: "buy", qty: 10, slot: 0 }));
    const fin = ok(halfAdvance(r));

    assert.equal(fin.habits!.trades, 1, "플레이어가 누른 건 매수 한 번뿐이다");
    assert.equal(fin.habits!.closedLots, 0, "청산으로 닫힌 건 보유일 통계에 안 들어간다");
});

test("아무것도 안 사고 끝나면 수익률 0", () => {
    const fin = finishHalf({ ...makeRound(), cursor: TOTAL });
    assert.equal(fin.final_return, 0);
    assert.equal(fin.cash, SEED);
    assert.equal(fin.status, "done");
});

test("값이 오른 만큼 수익률이 나온다 (수수료·세금만큼 덜)", () => {
    // 0번 자리만 컨텍스트 마지막 날 10,000 → 이후 20,000
    const rise = makeRound({
        holdings: [
            holding(0, i => (i < CONTEXT ? 10_000 : 20_000)),
            holding(1, () => 20_000), holding(2, () => 5_000), holding(3, () => 1_000),
        ],
    });
    // 컨텍스트 마지막 날(cursor-1 = 19)에 10,000 으로 500주 = 500만
    let r = ok(halfTrade(rise, { side: "buy", qty: 500, slot: 0 }));
    r = { ...r, cursor: TOTAL };
    const fin = finishHalf(r);

    // 500주가 20,000 이 되어 1,000만. 시드 1,000만 중 500만을 넣었으니 대략 +50%
    assert.ok(fin.final_return! > 48 && fin.final_return! < 50, `${fin.final_return}`);
});

test("이월하면 넘길 만큼은 팔지 않고 종가로 다시 산 셈이 된다", () => {
    let r = makeRound({ cursor: TOTAL });
    r = ok(halfTrade(r, { side: "buy", qty: 10, slot: 0 }));
    const fin = ok(halfAdvance(r, { carry: true }));

    assert.equal(fin.holdings![0].qty, 10, "안 팔고 넘긴다");
    assert.equal(fin.holdings![0].carried, true);
    assert.equal(fin.holdings![0].cost_basis, 10 * 10_000, "넘길 때의 종가로 다시 산 셈");
    assert.equal(fin.carried, true);
    assert.equal(fin.qty, 10);
    assert.equal(fin.orders.filter(o => o.auto).length, 0, "청산할 게 없다");
});

test("이월 한도 — 자리 하나가 넘길 수 있는 몫은 시드를 자리 수로 나눈 만큼", () => {
    // 자리 넷, 시드 1,000만 → 자리마다 250만. 1,000원짜리는 2,500주까지.
    let r = makeRound({ cursor: TOTAL });
    r = ok(halfTrade(r, { side: "buy", qty: 3_000, slot: 3 }));   // 300만어치
    const fin = ok(halfAdvance(r, { carry: true }));

    assert.equal(fin.holdings![3].qty, 2_500, "한도를 넘는 500주는 팔린다");
    assert.equal(fin.orders.filter(o => o.auto).length, 1);
    assert.equal(fin.orders.filter(o => o.auto)[0].qty, 500);
});

test("중도 포기하면 그날까지로 닫힌다", () => {
    let r = makeRound();
    r = ok(halfTrade(r, { side: "buy", qty: 10, slot: 0 }));
    const fin = ok(halfGiveUp(r));

    assert.equal(fin.status, "done");
    assert.equal(fin.holdings![0].qty, 0, "그날 종가로 청산된다");
    assert.equal(fin.orders.filter(o => o.auto)[0].day_index, CONTEXT - 1);
    assert.equal(fin.habits!.tradableDays, 1, "거래 가능일은 하루뿐이었다");
});

/* ── 제출 ────────────────────────────────────────────────────── */

test("제출에는 캔들이 없다 — 서버가 이미 갖고 있다", () => {
    const fin = finishHalf({ ...makeRound(), cursor: TOTAL });
    const s = halfSubmission(fin);

    assert.equal(s.round_id, "r1");
    assert.equal(s.holdings.length, 4);
    assert.ok(!JSON.stringify(s).includes('"candles"'), "캔들을 실어 보내면 안 된다");
    assert.ok(!JSON.stringify(s).includes('"ticker"'), "정답은 서버가 쥐고 있다");
    assert.equal(typeof s.final_return, "number");
});
