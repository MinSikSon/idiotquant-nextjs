// 예약 체결 규칙 — 워커(src/lib/reservations.js)와 같은 답을 내는가.
//
// 기대값은 워커 test/reservations.test.js 에서 그대로 가져왔다. 규칙이 두 언어로 두 벌
// 있는 동안 이 파일이 둘을 붙들고 있는 유일한 끈이다 — 한쪽을 고치면 여기서 깨져야 한다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { fillPrice, triggered } from "@/lib/paper/reservations";
import type { Candle, Reservation } from "@/lib/paper/round";

const candle = (o: number, h: number, l: number, c: number): Candle => ({ d: "20240101", o, h, l, c });
const res = (kind: string, price: number, qty = 10, slot?: number) =>
    ({ kind, price, qty, ...(slot === undefined ? {} : { slot }) }) as Reservation;

/* ── 체결가 ───────────────────────────────────────────────────────
   규칙: 조건 가격 그대로. 단 갭으로 그 값을 건너뛰고 시작한 날은 시가. */

test("지정가 매수 — 저가가 조건까지 내려오면 그 가격에 산다 · 지정가 매수 — 조건까지 안 내려온 날은 안 걸린다", () => {
    // ── 지정가 매수 — 저가가 조건까지 내려오면 그 가격에 산다
    {
        assert.equal(fillPrice(res("buy_limit", 10000), candle(10500, 10600, 9800, 10200)), 10000);
    }

    // ── 지정가 매수 — 조건까지 안 내려온 날은 안 걸린다
    {
        assert.equal(fillPrice(res("buy_limit", 10000), candle(10500, 10600, 10100, 10200)), null);
    }
});

test("손절 — 장중에 조건을 건드렸으면 조건 가격에 팔린다 · 익절 — 고가가 조건을 넘으면 그 가격에 팔린다", () => {
    // ── 손절 — 장중에 조건을 건드렸으면 조건 가격에 팔린다
    {
        assert.equal(fillPrice(res("stop_loss", 10000), candle(10500, 10600, 9900, 10100)), 10000);
    }

    // ── 익절 — 고가가 조건을 넘으면 그 가격에 팔린다
    {
        assert.equal(fillPrice(res("take_profit", 12000), candle(11000, 12500, 10900, 11800)), 12000);
    }
});

/* ── 같은 날 여러 건 ─────────────────────────────────────────── */
test("같은 날 여럿이 걸리면 손절부터 본다 — 하루 안의 순서를 모르니 보수적으로 · 안 걸린 예약은 목록에 남지 않는다", () => {
    // ── 같은 날 여럿이 걸리면 손절부터 본다 — 하루 안의 순서를 모르니 보수적으로
    {
        const day = candle(11000, 13000, 9000, 12000);   // 손절·익절·지정가가 다 걸리는 날
        const pending = [res("buy_limit", 9500), res("take_profit", 12500), res("stop_loss", 9800)];
        assert.deepEqual(triggered(pending, day).map(t => t.res.kind), ["stop_loss", "take_profit", "buy_limit"]);
    }

    // ── 안 걸린 예약은 목록에 남지 않는다
    {
        const day = candle(10000, 10100, 9900, 10050);
        const pending = [
            res("buy_limit", 9000),      // 안 내려옴
            res("take_profit", 10050),   // 걸림
        ];
        const hits = triggered(pending, day);
        assert.equal(hits.length, 1);
        assert.equal(hits[0].res.kind, "take_profit");
        assert.equal(hits[0].index, 1, "원래 자리를 알아야 지울 수 있다");
    }
});

/* ── 걸 때 검사 ──────────────────────────────────────────────── */
