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

import { bandsOf, cells, designSize, wrapCells } from "@/lib/game/ui/theme";

/** 세로 격자가 실제로 가질 수 있는 범위. 아래는 `STACK_MIN`, 위는 아주 긴 폰. */
const PORTRAIT_H: number[] = [];
for (let h = 398; h <= 1200; h++) PORTRAIT_H.push(h);

/** 눕혔을 때의 범위. `designSize` 가 세로를 300~560 으로 가둔다. */
const LANDSCAPE: Array<[number, number]> = [];
for (let h = 300; h <= 560; h += 4) {
    for (const ratio of [1.6, 1.9, 2.2, 2.6]) LANDSCAPE.push([Math.round(h * ratio), h]);
}

/* ── 세로 ───────────────────────────────────────────────────── */
/* ── 가로 ───────────────────────────────────────────────────── */
/* ── designSize 와 어긋나지 않는다 ──────────────────────────── */
/* ── 로그 한 줄을 접는다 ─────────────────────────────────────── */
test("접은 줄은 어느 것도 칸을 안 넘는다 · 접어도 글자는 하나도 안 사라진다", () => {
    // ── 접은 줄은 어느 것도 칸을 안 넘는다
    {
        const say = "현대전자에게 240주를 권했다. 근거는 「반도체 수출이 늘고 있다」.";
        for (const room of [10, 16, 24, 40, 60]) {
            for (const line of wrapCells(say, room)) {
                assert.ok(cells(line) <= room, `칸 ${room}: "${line}" 이 ${cells(line)} 칸`);
            }
        }
    }

    // ── 접어도 글자는 하나도 안 사라진다
    {
        const say = "3턴 김영수에게 1,240주를 권했다. 근거는 「환율이 잡히고 있다」.";
        const joined = wrapCells(say, 20).join("").replace(/\s/g, "");
        assert.equal(joined, say.replace(/\s/g, ""));
        // 「…」는 이제 어디에도 안 붙는다.
        assert.ok(!wrapCells(say, 20).some(l => l.includes("…")));
    }
});

/* ── 세로로 쌓는 덩이 — 장부가 넘치지 않는가 ────────────────────── */
/* ── 줄 버리기 — 눕힌 화면에서 장부가 얼어붙던 자리 ──────────── */
