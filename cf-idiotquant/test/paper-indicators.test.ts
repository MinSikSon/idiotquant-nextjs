// 리서치 도구가 그리는 선.
//
// 값을 손으로 적는 대신 정의대로 다시 계산해 견준다. 이 선들은 사용자가 매매 판단에
// 쓰는 것이라, 한 칸 밀리면(오늘을 포함하느냐 마느냐) 다른 그림이 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { movingAverage, donchian, atrBand, bollinger } from "@/lib/paper/indicators";

const near = (got: number, want: number, tol = 0.5) =>
    assert.ok(Math.abs(got - want) <= tol, `${got} ≉ ${want}`);

const seq = <T,>(n: number, f: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(i));

/* ── 이동평균 ────────────────────────────────────────────────── */

test("앞쪽 period-1 개는 null — 0 을 넣으면 차트가 바닥까지 떨어진다", () => {
    const ma = movingAverage([1, 2, 3, 4, 5], 3);
    assert.deepEqual(ma.slice(0, 2), [null, null]);
    assert.equal(ma.length, 5);
});

test("이동평균은 최근 period 개의 평균", () => {
    const closes = [10, 20, 30, 40, 50];
    const ma = movingAverage(closes, 3);
    assert.equal(ma[2], 20);   // (10+20+30)/3
    assert.equal(ma[3], 30);   // (20+30+40)/3
    assert.equal(ma[4], 40);   // (30+40+50)/3
});

test("창이 굴러가도 값이 누적되지 않는다 (긴 배열)", () => {
    const closes = seq(200, i => 1000 + i * 7);
    const ma = movingAverage(closes, 20);
    for (const i of [19, 50, 199]) {
        const want = closes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20;
        near(ma[i]!, want);
    }
});

test("period 가 길이보다 크면 전부 null", () => {
    assert.deepEqual(movingAverage([1, 2], 5), [null, null]);
});

/* ── 돌파선 ──────────────────────────────────────────────────── */

test("돌파선은 오늘을 포함한다 — 오늘 신고가면 오늘 값이 상단", () => {
    const highs = [10, 20, 30];
    const lows = [1, 2, 3];
    const { upper, lower } = donchian(highs, lows, 3);
    assert.equal(upper[2], 30, "오늘 고가가 상단이어야 한다");
    assert.equal(lower[2], 1);
});

test("돌파선 창이 굴러간다", () => {
    const highs = [10, 20, 30, 5];
    const lows = [1, 2, 3, 0];
    const { upper, lower } = donchian(highs, lows, 3);
    assert.equal(upper[3], 30);  // 20,30,5 → 30
    assert.equal(lower[3], 0);   // 2,3,0 → 0
});

/* ── 변동폭(ATR) ─────────────────────────────────────────────── */

test("True Range 는 전날 종가를 셈에 넣는다 — 갭은 고가−저가로 안 잡힌다", () => {
    // 2일차가 갭 상승: 전날 종가 100, 오늘 저가 150
    const candles = [
        { o: 100, h: 100, l: 100, c: 100 },
        { o: 150, h: 160, l: 150, c: 155 },
    ];
    const { upper, lower } = atrBand(candles, 2);

    // TR1 = 0 (h−l=0, 전날 종가 없음), TR2 = max(10, |160−100|, |150−100|) = 60
    const atr = (0 + 60) / 2;
    assert.equal(upper[1], Math.round(155 + atr));
    assert.equal(lower[1], Math.round(155 - atr));

    // 고가−저가만 봤다면 TR2 가 10 이라 ATR 이 5 였을 것이다 — 갭을 놓친다
    assert.notEqual(upper[1], Math.round(155 + 5));
});

test("변동폭 밴드는 종가를 가운데 두고 위아래 대칭", () => {
    const candles = seq(30, i => ({ o: 100 + i, h: 105 + i, l: 95 + i, c: 100 + i }));
    const { upper, lower } = atrBand(candles, 14);
    const i = 29;
    near((upper[i]! + lower[i]!) / 2, candles[i].c);
});

/* ── 볼린저 ──────────────────────────────────────────────────── */

test("볼린저는 이동평균 ± 표준편차 × mult", () => {
    const closes = [2, 4, 4, 4, 5, 5, 7, 9];   // 평균 5, 모표준편차 2
    const { upper, lower } = bollinger(closes, 8, 2);
    assert.equal(upper[7], 5 + 2 * 2);
    assert.equal(lower[7], 5 - 2 * 2);
});

test("값이 하나도 안 움직이면 밴드가 평균에 붙는다", () => {
    const closes = seq(25, () => 1000);
    const { upper, lower } = bollinger(closes, 20, 2);
    assert.equal(upper[24], 1000);
    assert.equal(lower[24], 1000);
});

test("mult 를 키우면 밴드가 넓어진다", () => {
    const closes = seq(25, i => 1000 + (i % 5) * 30);
    const a = bollinger(closes, 20, 1);
    const b = bollinger(closes, 20, 3);
    assert.ok(b.upper[24]! > a.upper[24]!);
    assert.ok(b.lower[24]! < a.lower[24]!);
});

test("앞쪽 구간은 세 도구 모두 null 로 비워 둔다", () => {
    const closes = seq(10, i => 100 + i);
    const candles = seq(10, i => ({ o: 100 + i, h: 101 + i, l: 99 + i, c: 100 + i }));

    assert.equal(bollinger(closes, 5).upper[3], null);
    assert.equal(donchian(closes, closes, 5).upper[3], null);
    assert.equal(atrBand(candles, 5).upper[3], null);
});
