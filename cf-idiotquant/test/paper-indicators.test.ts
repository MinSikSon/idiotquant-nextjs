// 리서치 도구가 그리는 선.
//
// 값을 손으로 적는 대신 정의대로 다시 계산해 견준다. 이 선들은 사용자가 매매 판단에
// 쓰는 것이라, 한 칸 밀리면(오늘을 포함하느냐 마느냐) 다른 그림이 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { movingAverage, bollinger } from "@/lib/paper/indicators";

const seq = <T,>(n: number, f: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(i));

/* ── 이동평균 ────────────────────────────────────────────────── */
test("앞쪽 period-1 개는 null — 0 을 넣으면 차트가 바닥까지 떨어진다 · 이동평균은 최근 period 개의 평균", () => {
    // ── 앞쪽 period-1 개는 null — 0 을 넣으면 차트가 바닥까지 떨어진다
    {
        const ma = movingAverage([1, 2, 3, 4, 5], 3);
        assert.deepEqual(ma.slice(0, 2), [null, null]);
        assert.equal(ma.length, 5);
    }

    // ── 이동평균은 최근 period 개의 평균
    {
        const closes = [10, 20, 30, 40, 50];
        const ma = movingAverage(closes, 3);
        assert.equal(ma[2], 20);   // (10+20+30)/3
        assert.equal(ma[3], 30);   // (20+30+40)/3
        assert.equal(ma[4], 40);   // (30+40+50)/3
    }
});

/* ── 돌파선 ──────────────────────────────────────────────────── */
/* ── 변동폭(ATR) ─────────────────────────────────────────────── */
/* ── 볼린저 ──────────────────────────────────────────────────── */
test("볼린저는 이동평균 ± 표준편차 × mult · 값이 하나도 안 움직이면 밴드가 평균에 붙는다", () => {
    // ── 볼린저는 이동평균 ± 표준편차 × mult
    {
        const closes = [2, 4, 4, 4, 5, 5, 7, 9];   // 평균 5, 모표준편차 2
        const { upper, lower } = bollinger(closes, 8, 2);
        assert.equal(upper[7], 5 + 2 * 2);
        assert.equal(lower[7], 5 - 2 * 2);
    }

    // ── 값이 하나도 안 움직이면 밴드가 평균에 붙는다
    {
        const closes = seq(25, () => 1000);
        const { upper, lower } = bollinger(closes, 20, 2);
        assert.equal(upper[24], 1000);
        assert.equal(lower[24], 1000);
    }
});
