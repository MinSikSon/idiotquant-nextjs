// 띠 배치 — **화면비를 지키는 불변식.**
//
// 이 파일이 없어서 사고가 났다. `bandsOf` 를 네 띠에서 여섯 띠로 늘리면서 고정 크롬이
// 174px 이 됐는데, 세로 격자는 `STACK_MIN`(398) 까지 짧아질 수 있다는 것을 안 봤다.
// 짧은 격자에서 차트 높이가 **음수**가 되어 띠가 서로 겹쳤다.
//
// 설계 격자는 390×844 고정이 **아니다.** `designSize` 가 짧은 쪽만 390 으로 고정하고
// 긴 쪽은 기기 비율 그대로 받는다(그래야 FIT 여백이 0 이 된다). 그래서 여기서는
// **한 벌의 크기가 아니라 범위 전체**를 훑는다.
//
// `bandsOf` 는 Phaser 를 안 부르는 순수 함수라 브라우저 없이 돈다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { bandsOf, designSize, isStacked, W, type Bands } from "@/lib/game/ui/theme";

/** 세로 격자가 실제로 가질 수 있는 범위. 아래는 `STACK_MIN`, 위는 아주 긴 폰. */
const PORTRAIT_H: number[] = [];
for (let h = 398; h <= 1200; h++) PORTRAIT_H.push(h);

/** 눕혔을 때의 범위. `designSize` 가 세로를 300~560 으로 가둔다. */
const LANDSCAPE: Array<[number, number]> = [];
for (let h = 300; h <= 560; h += 4) {
    for (const ratio of [1.6, 1.9, 2.2, 2.6]) LANDSCAPE.push([Math.round(h * ratio), h]);
}

/** 세로로 쌓이는 순서. 이 순서대로 맞물려야 한다. */
function stack(b: Bands) {
    return [b.strip, b.place, b.chips, b.chart, b.firm, b.action];
}

/* ── 세로 ───────────────────────────────────────────────────── */

test("세로 — 어떤 격자에서도 띠 높이가 음수가 아니다", () => {
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        for (const [name, band] of Object.entries(b)) {
            if (name === "portrait") continue;
            const v = band as { x: number; y: number; w: number; h: number };
            assert.ok(v.h >= 0, `h=${h} · ${name}.h = ${v.h}`);
            assert.ok(v.w >= 0, `h=${h} · ${name}.w = ${v.w}`);
        }
    }
});

test("세로 — 쌓인 띠의 합이 정확히 격자 세로다", () => {
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        const sum = stack(b).reduce((n, band) => n + band.h, 0);
        assert.equal(sum, h, `h=${h}: 합이 ${sum}`);
    }
});

test("세로 — 띠끼리 겹치지 않고 틈도 없다", () => {
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        let y = 0;
        for (const band of stack(b)) {
            assert.equal(band.y, y, `h=${h}: 띠가 ${y} 가 아니라 ${band.y} 에서 시작한다`);
            y += band.h;
        }
        assert.equal(y, h);
    }
});

test("세로 — 판을 굴리는 셋은 최소치를 지킨다", () => {
    // 버튼·상황·차트가 없으면 판이 안 굴러간다. 이 셋은 마지막까지 안 줄어든다.
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        assert.ok(b.action.h >= 64, `h=${h}: 버튼 ${b.action.h}`);
        assert.ok(b.firm.h >= 168, `h=${h}: 상황 ${b.firm.h}`);
        assert.ok(b.chart.h >= 110, `h=${h}: 차트 ${b.chart.h}`);
    }
});

test("세로 — 짧은 격자에서는 칩 줄이 먼저 양보한다", () => {
    // 칩은 바로가기일 뿐이라 제일 먼저 포기한다 — 전체 목록은 시세판에 있다.
    const short = bandsOf(W, 398);
    const roomy = bandsOf(W, 844);
    assert.ok(short.chips.h < roomy.chips.h, "짧으면 칩이 줄어야 한다");
    assert.ok(short.chart.h >= 110, "그 대신 차트는 살아 있어야 한다");
});

test("세로 — 넉넉해지면 차트가 남는 세로를 받는다", () => {
    let prev = -1;
    for (const h of [560, 700, 844, 1000, 1200]) {
        const chart = bandsOf(W, h).chart.h;
        assert.ok(chart > prev, `h=${h}: 차트가 안 늘었다(${prev} → ${chart})`);
        prev = chart;
    }
});

test("세로 — 띠는 격자 폭 안에 있다", () => {
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        for (const band of [...stack(b), b.log]) {
            assert.ok(band.x >= 0 && band.x + band.w <= W, `h=${h}: x=${band.x} w=${band.w}`);
        }
    }
});

/* ── 장소 정사각 ────────────────────────────────────────────── */

test("장소 자리는 언제나 정사각이다 — 나중에 들어올 그림의 자리다", () => {
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        assert.equal(b.place.w, b.place.h, `세로 h=${h}: ${b.place.w}×${b.place.h}`);
    }
    for (const [w, h] of LANDSCAPE) {
        const b = bandsOf(w, h);
        assert.equal(b.place.w, b.place.h, `가로 ${w}×${h}: ${b.place.w}×${b.place.h}`);
    }
});

test("장소와 로그는 한 줄에 나란히 서고 폭을 나눠 갖는다", () => {
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        assert.equal(b.log.y, b.place.y);
        assert.equal(b.log.h, b.place.h);
        assert.equal(b.place.w + b.log.w, W, `h=${h}: 장소+로그가 폭을 다 안 채운다`);
    }
});

/* ── 가로 ───────────────────────────────────────────────────── */

test("가로 — 읽는 것은 왼쪽, 만지는 것은 오른쪽", () => {
    for (const [w, h] of LANDSCAPE) {
        const b = bandsOf(w, h);
        if (b.portrait) continue;   // 폭이 모자라면 쌓기로 떨어진다
        assert.equal(b.chart.x, 0, `${w}×${h}: 차트가 왼쪽이 아니다`);
        assert.equal(b.firm.x, b.action.x, `${w}×${h}: 상황과 버튼이 다른 칸에 있다`);
        assert.ok(b.firm.x > 0, `${w}×${h}: 상황이 오른쪽 칸이 아니다`);
        assert.equal(b.firm.x + b.firm.w, w, `${w}×${h}: 오른쪽 칸이 폭을 다 안 채운다`);
        assert.equal(b.chart.x + b.chart.w, b.firm.x, `${w}×${h}: 두 칸 사이에 틈이 있다`);
    }
});

test("가로 — 모든 띠가 격자 안에 있고 높이가 음수가 아니다", () => {
    for (const [w, h] of LANDSCAPE) {
        const b = bandsOf(w, h);
        for (const [name, band] of Object.entries(b)) {
            if (name === "portrait") continue;
            const v = band as { x: number; y: number; w: number; h: number };
            assert.ok(v.h >= 0, `${w}×${h} · ${name}.h = ${v.h}`);
            assert.ok(v.x >= 0 && v.x + v.w <= w, `${w}×${h} · ${name} 이 폭을 넘는다`);
            assert.ok(v.y >= 0 && v.y + v.h <= h, `${w}×${h} · ${name} 이 세로를 넘는다`);
        }
    }
});

test("가로 — 왼쪽 칸의 띠가 세로를 정확히 채운다", () => {
    for (const [w, h] of LANDSCAPE) {
        const b = bandsOf(w, h);
        if (b.portrait) continue;
        assert.equal(b.strip.h + b.place.h + b.chips.h + b.chart.h, h,
            `${w}×${h}: 왼쪽 칸이 ${b.strip.h}+${b.place.h}+${b.chips.h}+${b.chart.h}`);
        assert.equal(b.firm.h + b.action.h + b.strip.h, h, `${w}×${h}: 오른쪽 칸이 안 맞는다`);
    }
});

/* ── designSize 와 어긋나지 않는다 ──────────────────────────── */

test("designSize 와 bandsOf 의 portrait 판단이 언제나 같다", () => {
    // 둘이 갈리면 격자는 두 칸인데 그림은 여섯으로 쌓여 화면이 통째로 어긋난다.
    for (let hostW = 280; hostW <= 1400; hostW += 7) {
        for (const hostH of [500, 640, 720, 844, 900, 1180, 390, 320]) {
            const d = designSize(hostW, hostH);
            const b = bandsOf(d.width, d.height);
            assert.equal(b.portrait, d.portrait,
                `호스트 ${hostW}×${hostH} → 격자 ${d.width}×${d.height}: designSize=${d.portrait} bandsOf=${b.portrait}`);
            assert.equal(b.portrait, isStacked(d.width, d.height));
        }
    }
});

test("designSize 가 낸 격자는 전부 그릴 수 있다", () => {
    for (let hostW = 280; hostW <= 1400; hostW += 11) {
        for (const hostH of [480, 568, 640, 740, 844, 926, 1180]) {
            const d = designSize(hostW, hostH);
            const b = bandsOf(d.width, d.height);
            for (const [name, band] of Object.entries(b)) {
                if (name === "portrait") continue;
                const v = band as { x: number; y: number; w: number; h: number };
                assert.ok(v.h >= 0 && v.w >= 0,
                    `호스트 ${hostW}×${hostH} → ${name} ${v.w}×${v.h}`);
            }
        }
    }
});
