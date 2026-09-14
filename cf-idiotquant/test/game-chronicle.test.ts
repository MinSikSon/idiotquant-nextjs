// 연대기 — **회귀가 헛돌지 않게 하는 자리.**
//
// 이 파일이 지키는 것은 둘이다.
//
//   ① 회귀가 연대기를 지우지 않는다 — 지우면 이 기능이 통째로 없는 것과 같다
//   ② 아는 것이 근거가 되지 않는다 — `core/energy.ts` 가 정해 둔 선이다
//
// 두 파일 다 Phaser 를 안 부르는 순수 함수라 브라우저 없이 돈다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { EMPTY_CHRONICLE, noteTurn, normalizeChronicle, recallAt } from "@/lib/game/core/chronicle";
import { EMPTY, regress } from "@/lib/game/core/progress";
import { StockEngine } from "@/lib/game/core/StockEngine";

/* ── 적는다 ─────────────────────────────────────────────────── */
/* ── 저장된 것을 믿지 않는다 ────────────────────────────────── */

/* ── ① 회귀가 지우지 않는다 ─────────────────────────────────── */
test("손으로 고친 값은 걸러진다 · 회귀해도 연대기는 남는다 — 이 줄이 이 기능의 전부다", () => {
    // ── 손으로 고친 값은 걸러진다
    {
        const c = normalizeChronicle({
            y1998: { "1": "bull", "2": "무지개", "0": "bear", x: "chop" },
            y1999: "이건 객체가 아니다",
            y2000: {},
        });
        assert.deepEqual(c, { y1998: { "1": "bull" } });
        assert.deepEqual(normalizeChronicle(null), {});
        assert.deepEqual(normalizeChronicle("문자열"), {});
    }

    // ── 회귀해도 연대기는 남는다 — 이 줄이 이 기능의 전부다
    {
        const before = {
            ...EMPTY,
            chronicle: noteTurn(EMPTY_CHRONICLE, "y1998", 5, "bull"),
        };
        for (const reason of ["debtRemains", "burnout", "ruined", "debtCleared"] as const) {
            const after = regress(before, reason);
            assert.equal(recallAt(after.chronicle, "y1998", 5), "bull", `${reason} 에서 지워졌다`);
        }
    }
});

/* ── ② 아는 것은 근거가 아니다 ──────────────────────────────── */
/* ── 엔진이 내는 국면과 같은 것을 적는가 ────────────────────── */
