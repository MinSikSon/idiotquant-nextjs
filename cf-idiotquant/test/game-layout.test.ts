// 띠 배치 — **화면비를 지키는 불변식.**
//
// 이 파일이 없어서 사고가 났다. `bandsOf` 를 네 띠에서 여섯 띠로 늘리면서 고정 크롬이
// 174px 이 됐는데, 세로 격자는 `STACK_MIN`(398) 까지 짧아질 수 있다는 것을 안 봤다.
// 짧은 격자에서 차트 높이가 **음수**가 되어 띠가 서로 겹쳤다.
//
// 띠는 다시 넷이 됐다(장소 정사각·칩 줄·차트를 뺐다). 판이 줄어도 이 불변식들은
// 그대로다 — 합이 정확히 격자 세로이고, 겹치지 않고, 음수가 없어야 한다.
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
    return [b.strip, b.log, b.now, b.action];
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

test("세로 — 버튼과 이번 턴 줄은 최소치를 지킨다", () => {
    // 이 둘이 없으면 판이 안 굴러간다. 로그는 한 줄까지 양보하지만 이 둘은 안 준다.
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        assert.ok(b.action.h >= 64, `h=${h}: 버튼 ${b.action.h}`);
        assert.ok(b.now.h >= 30, `h=${h}: 이번 턴 줄 ${b.now.h}`);
    }
});

test("세로 — 로그는 고객 한 줄을 얹고도 한 줄이 남는다", () => {
    // 로그 띠의 머리는 「누가 앞에 앉았나」가 든다. 그 줄에 다 먹히면 기록이 안 보인다.
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        assert.ok(b.log.h >= 26 + 34, `h=${h}: 로그 ${b.log.h}`);
    }
});

test("세로 — 남는 세로는 전부 로그가 받는다", () => {
    // 고정 크롬이 셋(띠·이번 턴 줄·버튼)뿐이라 겨룰 것이 없다. 안 그러면 긴 폰에서
    // 어딘가에 빈 자리가 생긴다.
    let prev = -1;
    for (const h of [560, 700, 844, 1000, 1200]) {
        const log = bandsOf(W, h).log.h;
        assert.ok(log > prev, `h=${h}: 로그가 안 늘었다(${prev} → ${log})`);
        prev = log;
    }
    // 이번 턴 줄은 한 줄이라 자라지 않는다.
    assert.equal(bandsOf(W, 1000).now.h, bandsOf(W, 1200).now.h, "이번 턴 줄이 자란다");
});

test("세로 — 띠는 격자 폭을 다 쓴다", () => {
    // 판이 넷으로 줄면서 좌우로 나뉜 띠가 없어졌다 — 전부 전폭이다.
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        for (const band of stack(b)) {
            assert.equal(band.x, 0, `h=${h}: x=${band.x}`);
            assert.equal(band.w, W, `h=${h}: w=${band.w}`);
        }
    }
});

/* ── 가로 ───────────────────────────────────────────────────── */

test("가로 — 읽는 것은 왼쪽, 만지는 것은 오른쪽", () => {
    for (const [w, h] of LANDSCAPE) {
        const b = bandsOf(w, h);
        if (b.portrait) continue;   // 폭이 모자라면 쌓기로 떨어진다
        assert.equal(b.log.x, 0, `${w}×${h}: 로그가 왼쪽이 아니다`);
        assert.equal(b.now.x, b.action.x, `${w}×${h}: 이번 턴 줄과 버튼이 다른 칸에 있다`);
        assert.ok(b.now.x > 0, `${w}×${h}: 이번 턴 줄이 오른쪽 칸이 아니다`);
        assert.equal(b.now.x + b.now.w, w, `${w}×${h}: 오른쪽 칸이 폭을 다 안 채운다`);
        assert.equal(b.log.x + b.log.w, b.now.x, `${w}×${h}: 두 칸 사이에 틈이 있다`);
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

test("가로 — 두 칸이 저마다 세로를 정확히 채운다", () => {
    for (const [w, h] of LANDSCAPE) {
        const b = bandsOf(w, h);
        if (b.portrait) continue;
        assert.equal(b.strip.h + b.log.h, h, `${w}×${h}: 왼쪽 칸이 안 맞는다`);
        assert.equal(b.strip.h + b.now.h + b.action.h, h, `${w}×${h}: 오른쪽 칸이 안 맞는다`);
    }
});

/* ── designSize 와 어긋나지 않는다 ──────────────────────────── */

test("designSize 와 bandsOf 의 portrait 판단이 언제나 같다", () => {
    // 둘이 갈리면 격자는 두 칸인데 그림은 넷으로 쌓여 화면이 통째로 어긋난다.
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
