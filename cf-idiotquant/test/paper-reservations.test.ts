// 예약 체결 규칙 — 워커(src/lib/reservations.js)와 같은 답을 내는가.
//
// 기대값은 워커 test/reservations.test.js 에서 그대로 가져왔다. 규칙이 두 언어로 두 벌
// 있는 동안 이 파일이 둘을 붙들고 있는 유일한 끈이다 — 한쪽을 고치면 여기서 깨져야 한다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    fillPrice, triggered, validateReservation, MAX_RESERVATIONS,
} from "@/lib/paper/reservations";
import type { Candle, Reservation } from "@/lib/paper/round";

const candle = (o: number, h: number, l: number, c: number): Candle => ({ d: "20240101", o, h, l, c });
const res = (kind: string, price: number, qty = 10, slot?: number) =>
    ({ kind, price, qty, ...(slot === undefined ? {} : { slot }) }) as Reservation;

/* ── 체결가 ───────────────────────────────────────────────────────
   규칙: 조건 가격 그대로. 단 갭으로 그 값을 건너뛰고 시작한 날은 시가. */

test("지정가 매수 — 저가가 조건까지 내려오면 그 가격에 산다", () => {
    assert.equal(fillPrice(res("buy_limit", 10000), candle(10500, 10600, 9800, 10200)), 10000);
});

test("지정가 매수 — 조건까지 안 내려온 날은 안 걸린다", () => {
    assert.equal(fillPrice(res("buy_limit", 10000), candle(10500, 10600, 10100, 10200)), null);
});

test("지정가 매수 — 갭 하락으로 더 싸게 시작했으면 시가에 산다", () => {
    // 9,000 에 열렸는데 10,000 에 샀다고 하면 있지도 않았던 비싼 가격에 산 셈이다
    assert.equal(fillPrice(res("buy_limit", 10000), candle(9000, 9400, 8800, 9200)), 9000);
});

test("손절 — 갭 하락이면 시가에 팔린다(불리한 쪽). 이게 손절의 현실이다", () => {
    assert.equal(fillPrice(res("stop_loss", 10000), candle(9000, 9400, 8800, 9200)), 9000);
});

test("손절 — 장중에 조건을 건드렸으면 조건 가격에 팔린다", () => {
    assert.equal(fillPrice(res("stop_loss", 10000), candle(10500, 10600, 9900, 10100)), 10000);
});

test("익절 — 고가가 조건을 넘으면 그 가격에 팔린다", () => {
    assert.equal(fillPrice(res("take_profit", 12000), candle(11000, 12500, 10900, 11800)), 12000);
});

test("익절 — 갭 상승으로 더 비싸게 시작했으면 시가에 팔린다(유리한 쪽)", () => {
    assert.equal(fillPrice(res("take_profit", 12000), candle(13000, 13500, 12800, 13200)), 13000);
});

test("값이 없거나 깨진 캔들에서는 아무것도 걸리지 않는다", () => {
    assert.equal(fillPrice(res("buy_limit", 0), candle(100, 100, 100, 100)), null);
    assert.equal(fillPrice(res("buy_limit", 100), candle(0, 0, 0, 0)), null);
    assert.equal(fillPrice(res("몰라", 100), candle(100, 100, 100, 100)), null);
    assert.equal(fillPrice(res("buy_limit", 100), undefined), null, "없는 날은 안 걸린다");
});

/* ── 같은 날 여러 건 ─────────────────────────────────────────── */

test("같은 날 여럿이 걸리면 손절부터 본다 — 하루 안의 순서를 모르니 보수적으로", () => {
    const day = candle(11000, 13000, 9000, 12000);   // 손절·익절·지정가가 다 걸리는 날
    const pending = [res("buy_limit", 9500), res("take_profit", 12500), res("stop_loss", 9800)];
    assert.deepEqual(triggered(pending, day).map(t => t.res.kind), ["stop_loss", "take_profit", "buy_limit"]);
});

test("안 걸린 예약은 목록에 남지 않는다", () => {
    const day = candle(10000, 10100, 9900, 10050);
    const pending = [
        res("buy_limit", 9000),      // 안 내려옴
        res("take_profit", 10050),   // 걸림
    ];
    const hits = triggered(pending, day);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].res.kind, "take_profit");
    assert.equal(hits[0].index, 1, "원래 자리를 알아야 지울 수 있다");
});

/* ── 걸 때 검사 ──────────────────────────────────────────────── */

test("종류·가격·수량이 성치 않으면 못 건다", () => {
    assert.equal(validateReservation(res("몰라", 100, 1), 0).ok, false);
    assert.equal(validateReservation(res("buy_limit", 0, 1), 0).ok, false);
    assert.equal(validateReservation(res("buy_limit", 100, 0), 0).ok, false);
});

test("가격·수량은 내림해서 정수로 들어간다", () => {
    const v = validateReservation({ kind: "buy_limit", price: 10500.9, qty: 3.7 }, 0);
    assert.equal(v.ok, true);
    assert.deepEqual(v.ok && v.res, { kind: "buy_limit", price: 10500, qty: 3, slot: 0 });
});

test("건 자리가 그대로 남는다", () => {
    const v = validateReservation(res("stop_loss", 100, 1, 2), 0, 4);
    assert.equal(v.ok, true);
    assert.equal(v.ok && v.res.slot, 2);
});

test("자리를 안 적으면 0번 — 종목이 하나뿐이던 시절 예약과 같다", () => {
    const a = validateReservation(res("stop_loss", 100, 1), 0, 4);
    assert.equal(a.ok && a.res.slot, 0);
    const b = validateReservation({ kind: "stop_loss", price: 100, qty: 1, slot: null as any }, 0, 4);
    assert.equal(b.ok && b.res.slot, 0);
});

test("없는 자리에는 못 건다", () => {
    // 자리가 넷이면 0~3 이다. 판에 없는 자리에 걸어 두면 영영 체결되지 않는다 —
    // 걸어 둔 사람은 기다리는데 아무 일도 일어나지 않는 것이 제일 나쁘다.
    for (const slot of [4, -1, "둘"]) {
        assert.equal(
            validateReservation({ kind: "stop_loss", price: 100, qty: 1, slot: slot as any }, 0, 4).ok,
            false, `${slot} 이 통과했다`,
        );
    }
    // 소수는 가격·수량과 같이 내림한다 — 1.5 는 1번 자리다
    const half = validateReservation(res("stop_loss", 100, 1, 1.5), 0, 4);
    assert.equal(half.ok && half.res.slot, 1);
    // 자리 수를 안 알려 주면 옛 판(하나짜리)으로 보고 0번만 받는다
    assert.equal(validateReservation(res("stop_loss", 100, 1, 1), 0).ok, false);
    assert.equal(validateReservation(res("stop_loss", 100, 1, 0), 0).ok, true);
});

test(`예약은 ${MAX_RESERVATIONS}건까지`, () => {
    assert.equal(validateReservation(res("stop_loss", 100, 1), MAX_RESERVATIONS - 1).ok, true);
    const over = validateReservation(res("stop_loss", 100, 1), MAX_RESERVATIONS);
    assert.equal(over.ok, false);
    assert.match(over.ok ? "" : over.error, /3건/);
});
