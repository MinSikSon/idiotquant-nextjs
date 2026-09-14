// 반기 한 판을 브라우저에서 굴리는 규칙.
//
// 이 파일이 지키는 것은 "화면이 보여 준 판"과 "서버에 저장될 결과"가 같은 규칙에서
// 나온다는 것이다. 워커(tradeReplayRoundD1 · _fillReservations · _finish)와 같은 순서·
// 같은 값이어야 한다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { halfTrade, halfAdvance } from "@/lib/paper/half";
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
test("매수하면 그 자리 보유가 늘고 현금이 준다 — 날짜는 그대로 · 원본 판은 고쳐지지 않는다 — React 상태로 그대로 쓴다", () => {
    // ── 매수하면 그 자리 보유가 늘고 현금이 준다 — 날짜는 그대로
    {
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
    }

    // ── 원본 판은 고쳐지지 않는다 — React 상태로 그대로 쓴다
    {
        const r0 = makeRound();
        halfTrade(r0, { side: "buy", qty: 10, slot: 1 });
        assert.equal(r0.cash, SEED);
        assert.equal(r0.holdings![1].qty, 0);
        assert.equal(r0.orders.length, 0);
    }
});

test("전량 매도하면 그 자리 원가가 0 이 된다 — 남으면 가짜 손익이 생긴다 · 현금보다 많이 사거나 없는 자리를 만지면 거절한다", () => {
    // ── 전량 매도하면 그 자리 원가가 0 이 된다 — 남으면 가짜 손익이 생긴다
    {
        let r = makeRound();
        r = ok(halfTrade(r, { side: "buy", qty: 10, slot: 0 }));
        r = ok(halfTrade(r, { side: "sell", qty: 10, slot: 0 }));

        assert.equal(r.holdings![0].qty, 0);
        assert.equal(r.holdings![0].cost_basis, 0);
        assert.equal(r.qty, 0);
        assert.equal(r.cost_basis, 0);
        assert.ok(r.realized < 0, "값이 그대로면 수수료만큼 손해다");
    }

    // ── 현금보다 많이 사거나 없는 자리를 만지면 거절한다
    {
        const r = makeRound();
        assert.equal(halfTrade(r, { side: "buy", qty: 10_000, slot: 0 }).ok, false);
        assert.equal(halfTrade(r, { side: "sell", qty: 1, slot: 0 }).ok, false);
        assert.equal(halfTrade(r, { side: "buy", qty: 1, slot: 9 }).ok, false);
        const done = { ...r, status: "done" as const };
        assert.equal(halfTrade(done, { side: "buy", qty: 1, slot: 0 }).ok, false);
    }
});

/* ── 하루 넘기기 ─────────────────────────────────────────────── */
/* ── 반기 마감 ───────────────────────────────────────────────── */
test("마지막 날에 닿으면 판이 닫히고 남은 것은 강제 청산된다 · 강제 청산은 습관에서 빠진다", () => {
    // ── 마지막 날에 닿으면 판이 닫히고 남은 것은 강제 청산된다
    {
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
    }

    // ── 강제 청산은 습관에서 빠진다
    {
        let r = makeRound({ cursor: TOTAL });
        r = ok(halfTrade(r, { side: "buy", qty: 10, slot: 0 }));
        const fin = ok(halfAdvance(r));

        assert.equal(fin.habits!.trades, 1, "플레이어가 누른 건 매수 한 번뿐이다");
        assert.equal(fin.habits!.closedLots, 0, "청산으로 닫힌 건 보유일 통계에 안 들어간다");
    }
});

/* ── 제출 ────────────────────────────────────────────────────── */
/* ── 반기 목표 ───────────────────────────────────────────────── */
/* ── 공매도 ─────────────────────────────────────────────────── */
test("담보가 못 버티면 그날 강제로 갚는다 · 버틸 만하면 강제로 갚지 않는다", () => {
    // ── 담보가 못 버티면 그날 강제로 갚는다
    {
        // 0번 자리가 컨텍스트 뒤에 두 배가 된다 — 담보의 80% 를 넘는 손실
        const spike = makeRound({
            holdings: [
                holding(0, i => (i < CONTEXT ? 10_000 : 20_000)),
                holding(1, () => 20_000), holding(2, () => 5_000), holding(3, () => 1_000),
            ],
        });
        const shorted = ok(halfTrade(spike, { side: "short", qty: 100, slot: 0 }));
        const res = halfAdvance(shorted);
        assert.equal(res.ok, true);
        if (!res.ok) return;

        assert.equal(res.called, 1, "담보가 못 버티는데 안 잡혔다");
        assert.equal(res.round.holdings![0].short_qty, 0);
        const forced = res.round.orders.filter(o => o.side === "cover" && o.auto);
        assert.equal(forced.length, 1, "강제 청산은 auto 라 습관에서 빠져야 한다");
        assert.ok(res.round.cash < SEED, "두 배가 됐으면 크게 잃는다");
    }

    // ── 버틸 만하면 강제로 갚지 않는다
    {
        const mild = makeRound({
            holdings: [
                holding(0, i => (i < CONTEXT ? 10_000 : 15_000)),   // 손실 50만 < 담보의 80%
                holding(1, () => 20_000), holding(2, () => 5_000), holding(3, () => 1_000),
            ],
        });
        const shorted = ok(halfTrade(mild, { side: "short", qty: 100, slot: 0 }));
        const res = halfAdvance(shorted);
        if (!res.ok) return;
        assert.equal(res.called, 0);
        assert.equal(res.round.holdings![0].short_qty, 100);
    }
});
