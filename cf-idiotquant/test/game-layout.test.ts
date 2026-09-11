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

import {
    ACTION_FRAMED_MIN, STACK, WIN_CHROME, bandsOf, blockH, cells, designSize, isStacked, stackGaps, stackH,
    stackPlan, wrapCells, W, type Bands,
} from "@/lib/game/ui/theme";

/**
 * 고른 종목 판이 반드시 세우는 높이. `components/StockSheet.ts` 가 같은 이름으로 내보내는데,
 * 저 파일은 Phaser 를 부르므로 브라우저 없이 못 읽는다 — 여기서 다시 적는다.
 * 머리 22 + 4 + 판정 40 + 6 + 알아본다 26 + 6 + 체결 44 + 7.
 */
const SHEET_MIN = 155;

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
    return [b.strip, b.log, b.market, b.action];
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

test("세로 — 버튼과 고른 종목 판은 최소치를 지킨다", () => {
    // 이 둘이 없으면 판이 안 굴러간다. 판이 좁으면 체결 버튼이 아래로 잘린다.
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        assert.ok(b.action.h >= 64, `h=${h}: 버튼 ${b.action.h}`);
        assert.ok(b.market.h >= 190, `h=${h}: 고른 종목 판 ${b.market.h}`);
    }
});

test("흔한 폰에서는 버튼 띠에 제목 표시줄이 선다", () => {
    // **이 띠도 창이다** — 다른 판이 전부 제 이름을 다는데 버튼만 이름 없는 회색 판이면
    // 그 자리가 무엇을 하는 곳인지 화면이 말하지 않는다. 다만 껍데기가 29px 을 먹으므로
    // 짧은 격자에서는 접는다. 여기서 보는 것은 **어디서 접히는가**다.
    for (const h of [700, 844, 900, 1000]) {
        const b = bandsOf(W, h);
        assert.ok(b.action.h >= ACTION_FRAMED_MIN,
            `h=${h}: 버튼 띠 ${b.action.h} 이라 제목이 접힌다`);
    }
    // 눕힌 폰도 선다 — 여기가 제일 아슬아슬한 자리다.
    for (const [w, h] of [[844, 390], [740, 360]] as const) {
        const g = designSize(w, h);
        const b = bandsOf(g.width, g.height);
        assert.ok(b.action.h >= ACTION_FRAMED_MIN,
            `${w}×${h}: 버튼 띠 ${b.action.h} 이라 제목이 접힌다`);
    }
});

test("제목을 접는 자리에서도 버튼은 누를 수 있는 크기다", () => {
    // 접는 쪽으로 떨어졌으면 옛 모습 그대로여야 한다 — 껍데기 없이 버튼 48.
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        if (b.action.h >= ACTION_FRAMED_MIN) continue;
        assert.ok(b.action.h >= 64, `h=${h}: 접었는데도 ${b.action.h} 뿐이다`);
    }
});

test("어느 배치에서도 고른 종목 판이 창 안에 온전히 선다", () => {
    // **한 픽셀 차이로 깨질 뻔한 자리다.** 이 띠가 창이 되면서 껍데기가 29px 을 먹는데,
    // 그만큼을 띠 예산이 안 세면 체결 버튼이 아래로 잘린다. 화면에서는 제일 짧은
    // 격자에서만 나타나서 눈으로는 거의 안 걸린다.
    //
    // **차트는 안 센다** — 남는 것을 쓰고, 자리가 모자라면 아예 안 선다.
    const need = WIN_CHROME + SHEET_MIN;
    for (const h of PORTRAIT_H) {
        assert.ok(bandsOf(W, h).market.h >= need,
            `h=${h}: 판의 속살이 ${bandsOf(W, h).market.h - WIN_CHROME}, ${SHEET_MIN} 필요`);
    }
    for (const [w, h] of LANDSCAPE) {
        const b = bandsOf(w, h);
        if (b.portrait) continue;
        assert.ok(b.market.h >= need, `${w}×${h}: 판 ${b.market.h}, ${need} 필요`);
    }
});

test("세로 — 뉴스 창은 껍데기를 쓰고도 고객 한 줄이 남는다", () => {
    // 이 띠의 머리는 「누가 앞에 앉았나」가 든다. 창 껍데기에 다 먹히면 그 줄조차 안 보인다.
    for (const h of PORTRAIT_H) {
        const b = bandsOf(W, h);
        assert.ok(b.log.h - WIN_CHROME >= 24, `h=${h}: 뉴스 속살 ${b.log.h - WIN_CHROME}`);
    }
});

test("세로 — 남는 세로는 목록이 받는다", () => {
    // **목록이 화면의 본체다.** 로그가 남는 것을 다 먹으면 긴 폰에서도 목록이 세 줄에
    // 머문다 — 무엇을 고를지가 화면의 일인데.
    let prev = -1;
    for (const h of [560, 700, 844, 1000, 1200]) {
        const market = bandsOf(W, h).market.h;
        assert.ok(market > prev, `h=${h}: 목록이 안 늘었다(${prev} → ${market})`);
        prev = market;
    }
    // 로그는 어느 지점에서 멈춘다.
    assert.equal(bandsOf(W, 1000).log.h, bandsOf(W, 1200).log.h, "뉴스 창이 끝없이 자란다");
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
        // **왼쪽이 목록이다** — 화면의 본체가 넓은 쪽을 가져간다.
        assert.equal(b.market.x, 0, `${w}×${h}: 목록이 왼쪽이 아니다`);
        assert.equal(b.log.x, b.action.x, `${w}×${h}: 로그와 버튼이 다른 칸에 있다`);
        assert.ok(b.log.x > 0, `${w}×${h}: 로그가 오른쪽 칸이 아니다`);
        assert.equal(b.log.x + b.log.w, w, `${w}×${h}: 오른쪽 칸이 폭을 다 안 채운다`);
        assert.equal(b.market.x + b.market.w, b.log.x, `${w}×${h}: 두 칸 사이에 틈이 있다`);
        assert.ok(b.market.w > b.log.w, `${w}×${h}: 목록 ${b.market.w} ≤ 로그 ${b.log.w}`);
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
        assert.equal(b.strip.h + b.market.h, h, `${w}×${h}: 왼쪽 칸이 안 맞는다`);
        assert.equal(b.strip.h + b.log.h + b.action.h, h, `${w}×${h}: 오른쪽 칸이 안 맞는다`);
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

/* ── 로그 한 줄을 접는다 ─────────────────────────────────────── */
//
// 로그는 한때 칸을 넘는 글자를 「…」로 잘랐고, 잘리는 쪽이 대개 값이었다 —
// 「근거는 「반도체…」 처럼 무엇을 근거로 권했는지가 통째로 사라진다.
// 이제 접는다. `GameLog` 는 Phaser 를 부르므로 접는 셈만 여기서 지킨다.

test("한글은 두 칸, 라틴은 한 칸으로 센다", () => {
    assert.equal(cells("abc"), 3);
    assert.equal(cells("가나다"), 6);
    assert.equal(cells("240주"), 5);
    assert.equal(cells(""), 0);
});

test("접은 줄은 어느 것도 칸을 안 넘는다", () => {
    const say = "현대전자에게 240주를 권했다. 근거는 「반도체 수출이 늘고 있다」.";
    for (const room of [10, 16, 24, 40, 60]) {
        for (const line of wrapCells(say, room)) {
            assert.ok(cells(line) <= room, `칸 ${room}: "${line}" 이 ${cells(line)} 칸`);
        }
    }
});

test("접어도 글자는 하나도 안 사라진다", () => {
    const say = "3턴 김영수에게 1,240주를 권했다. 근거는 「환율이 잡히고 있다」.";
    const joined = wrapCells(say, 20).join("").replace(/\s/g, "");
    assert.equal(joined, say.replace(/\s/g, ""));
    // 「…」는 이제 어디에도 안 붙는다.
    assert.ok(!wrapCells(say, 20).some(l => l.includes("…")));
});

test("한 낱말이 한 줄보다 길면 거기서 끊는다", () => {
    // 안 끊으면 그 줄만 칸을 넘어 창 밖으로 삐져나간다.
    const lines = wrapCells("가나다라마바사아자차카타파하", 6);
    assert.ok(lines.length > 1);
    for (const l of lines) assert.ok(cells(l) <= 6);
});

test("칸에 들어가는 글은 접지 않는다", () => {
    assert.deepEqual(wrapCells("수수료 1,240원.", 40), ["수수료 1,240원."]);
    assert.deepEqual(wrapCells("", 40), [""]);
});

/* ── 세로로 쌓는 덩이 — 장부가 넘치지 않는가 ────────────────────── */

test("사이의 개수는 덩이 사이 + 머리 뒤 하나다", () => {
    // **이 한 줄을 잘못 세어 마지막 덩이가 버튼 띠 밑으로 밀렸다.**
    assert.equal(stackGaps(4, 0), 3, "머리가 없으면 덩이 사이만");
    assert.equal(stackGaps(4, 40), 4, "머리 뒤에도 하나 붙는다");
    assert.equal(stackGaps(1, 40), 1);
    assert.equal(stackGaps(1, 0), 0);
    assert.equal(stackGaps(0, 0), 0);
});

test("쌓은 높이는 덩이 + 사이 + 머리의 합이다", () => {
    assert.equal(stackH([5], 0), blockH(5));
    assert.equal(stackH([5, 3], 0), blockH(5) + blockH(3) + STACK.GAP);
    assert.equal(stackH([5, 3], 40), blockH(5) + blockH(3) + STACK.GAP * 2 + 40);
});

test("남는 세로를 나눠 가져도 칸을 절대 안 넘는다", () => {
    // 장부의 실제 모양(맡은 돈 5 · 얻은 돈 3 · 지갑 2~3 · 갚을 돈 3~5)을 폭넓게 훑는다.
    // 하나라도 `used > room` 이면 그 배치에서 마지막 덩이가 화면 밖으로 밀린다.
    const chron = [0, 40];
    let checked = 0;
    for (const headH of chron) {
        for (const a of [5, 4, 3]) {
            for (const b of [3, 2]) {
                for (const c of [3, 2, 1]) {
                    for (const d of [5, 4, 3, 2]) {
                        const rows = [a, b, c, d];
                        // 눕힌 폰(창 245)부터 큰 화면까지.
                        for (let room = 120; room <= 900; room += 7) {
                            const plan = stackPlan(rows, headH, room);
                            checked++;
                            if (stackH(rows, headH) > room) continue;  // 줄을 버려야 하는 자리
                            assert.ok(plan.used <= room,
                                `줄 ${rows} 머리 ${headH} 칸 ${room}: ${plan.used} 가 넘는다`);
                            assert.ok(plan.top + plan.used <= room,
                                `줄 ${rows} 머리 ${headH} 칸 ${room}: 가운데로 내리다 넘쳤다`);
                        }
                    }
                }
            }
        }
    }
    assert.ok(checked > 1000, "훑은 자리가 너무 적다");
});

test("사이는 기본 폭보다 좁아지지 않고, 상한을 넘지도 않는다", () => {
    const tight = stackPlan([5, 3, 3, 5], 40, 100);
    assert.equal(tight.gap, STACK.GAP, "칸이 모자라도 사이를 음수로 만들지 않는다");
    const roomy = stackPlan([1, 1], 0, 5_000);
    assert.equal(roomy.gap, STACK.GAP + STACK.GAP_MAX, "너무 벌어지면 덩이들이 남남이 된다");
});
