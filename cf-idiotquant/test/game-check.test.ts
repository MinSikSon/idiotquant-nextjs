// 판정 — **화면이 적는 확률이 실제로 굴렸을 때의 확률인가.**
//
// 이 파일이 지키는 것은 셋이다.
//
//   1. `odds` 가 낸 값이 진짜로 굴렸을 때 나오는 비율과 같다 — 1만 번 굴려 견준다
//   2. 네 사람의 문턱이 설계 노트의 표와 같다
//   3. **근거가 언제나 문턱을 안 올린다** — 근거를 대서 더 어려워지는 사람은 없다
//
// 셋째가 제일 중요하다. 이 게임의 논지가 「근거를 대는 쪽이 이긴다」인데, 표를
// 손으로 고치다 한 칸이 뒤집히면 그 논지가 조용히 무너진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { MAX_ROLL, MIN_ROLL, odds, roll } from "@/lib/game/core/check";
import { CLIENTS, needOf } from "@/lib/game/core/clients";

/** 재현 가능한 난수 — 테스트가 어쩌다 한 번 깨지는 일이 없게. */
function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ── 굴린다 ─────────────────────────────────────────────────── */
/* ── 화면이 적는 확률이 맞는가 ──────────────────────────────── */
test("odds 가 낸 값이 1만 번 굴린 비율과 같다 · 문턱이 범위를 벗어나면 0 아니면 1 이다", () => {
    // ── odds 가 낸 값이 1만 번 굴린 비율과 같다
    {
        // **이 판정이 이 파일의 이유다.** 화면은 「7+ · 58%」라고 적는데, 그 58% 가
        // 손으로 센 표에서 나온 값이면 표가 틀린 날 화면이 거짓말을 한다.
        const N = 10_000;
        for (let need = MIN_ROLL; need <= MAX_ROLL; need++) {
            const rand = seeded(need * 7919);
            let hit = 0;
            for (let i = 0; i < N; i++) if (roll(need, true, rand).ok) hit++;
            const got = hit / N;
            assert.ok(Math.abs(got - odds(need)) < 0.02,
                `${need}+ — 셈은 ${(odds(need) * 100).toFixed(1)}% 인데 굴리니 ${(got * 100).toFixed(1)}%`);
        }
    }

    // ── 문턱이 범위를 벗어나면 0 아니면 1 이다
    {
        assert.equal(odds(MIN_ROLL), 1, "2+ 는 반드시 통한다");
        assert.equal(odds(MIN_ROLL - 5), 1);
        assert.equal(odds(MAX_ROLL), 1 / 36, "12 는 1/36 이다");
        assert.equal(odds(MAX_ROLL + 1), 0, "13+ 은 나올 수 없다");
    }
});

/* ── 네 사람 ────────────────────────────────────────────────── */
test("근거가 문턱을 올리는 사람은 없다 — 이 게임의 논지다 · 어머니는 안 움직이고 박 대리는 통째로 움직인다", () => {
    // ── 근거가 문턱을 올리는 사람은 없다 — 이 게임의 논지다
    {
        // **표를 손으로 고치다 한 칸이 뒤집히면 조용히 무너지는 자리다.**
        for (const c of CLIENTS) {
            assert.ok(needOf(c, true) <= needOf(c, false),
                `${c.name}: 근거를 대면 ${needOf(c, true)}+ 인데 안 대면 ${needOf(c, false)}+ 다`);
        }
    }

    // ── 어머니는 안 움직이고 박 대리는 통째로 움직인다
    {
        const mother = CLIENTS.find(c => c.id === "mother")!;
        const park = CLIENTS.find(c => c.id === "park")!;
        assert.equal(needOf(mother, true), needOf(mother, false), "어머니는 원래 받아 준다");
        const moved = (c: typeof park) => needOf(c, false) - needOf(c, true);
        assert.ok(moved(park) > moved(mother), "박 대리가 근거에 제일 크게 움직여야 한다");
        for (const c of CLIENTS) {
            assert.ok(moved(c) <= moved(park), `${c.name} 이 박 대리보다 크게 움직인다`);
        }
    }
});

/* ── 사람이 읽을 말 ─────────────────────────────────────────── */
