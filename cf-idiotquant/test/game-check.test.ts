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

import {
    DICE, MAX_ROLL, MIN_ROLL, checkSay, diceSay, odds, oddsPct, roll,
} from "@/lib/game/core/check";
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

test("주사위는 둘, 눈은 1~6, 합은 그 둘의 합이다", () => {
    const rand = seeded(1);
    for (let i = 0; i < 2000; i++) {
        const c = roll(7, true, rand);
        assert.equal(c.dice.length, DICE);
        for (const d of c.dice) assert.ok(d >= 1 && d <= 6, `눈이 ${d}`);
        assert.equal(c.total, c.dice.reduce((a, n) => a + n, 0));
        assert.ok(c.total >= MIN_ROLL && c.total <= MAX_ROLL);
        assert.equal(c.ok, c.total >= 7);
    }
});

test("모든 눈이 실제로 나온다 — 한쪽으로 치우치지 않는다", () => {
    const rand = seeded(99);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) for (const d of roll(7, true, rand).dice) seen.add(d);
    assert.equal(seen.size, 6, `나온 눈이 ${[...seen].sort().join(",")} 뿐이다`);
});

/* ── 화면이 적는 확률이 맞는가 ──────────────────────────────── */

test("odds 가 낸 값이 1만 번 굴린 비율과 같다", () => {
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
});

test("문턱이 범위를 벗어나면 0 아니면 1 이다", () => {
    assert.equal(odds(MIN_ROLL), 1, "2+ 는 반드시 통한다");
    assert.equal(odds(MIN_ROLL - 5), 1);
    assert.equal(odds(MAX_ROLL), 1 / 36, "12 는 1/36 이다");
    assert.equal(odds(MAX_ROLL + 1), 0, "13+ 은 나올 수 없다");
});

test("문턱이 높을수록 확률이 낮다 — 단조 감소", () => {
    let prev = 2;
    for (let need = MIN_ROLL; need <= MAX_ROLL + 1; need++) {
        const o = odds(need);
        assert.ok(o < prev, `${need}+ 에서 확률이 안 줄었다`);
        prev = o;
    }
});

/* ── 네 사람 ────────────────────────────────────────────────── */

test("문턱은 설계 노트의 표 그대로다", () => {
    // **한 번 내렸다.** 판정이 들어가면서 근거를 대고도 거절당하는 턴이 생겼고,
    // 400판을 굴려 보니 소진으로 끝나는 판이 7% 에서 39% 로 뛰었다. 어머니만 빼고
    // (그녀는 원래 안 움직인다) 한 칸씩 내려 83/83/72/58% 로 맞췄다.
    const table: Record<string, [number, number]> = {
        mother: [5, 5],
        park: [5, 12],
        kim: [6, 11],
        choi: [7, 9],
    };
    for (const c of CLIENTS) {
        const want = table[c.id];
        assert.ok(want, `${c.name} 이 표에 없다`);
        assert.equal(needOf(c, true), want[0], `${c.name} 근거 있음`);
        assert.equal(needOf(c, false), want[1], `${c.name} 근거 없이`);
    }
});

test("근거가 문턱을 올리는 사람은 없다 — 이 게임의 논지다", () => {
    // **표를 손으로 고치다 한 칸이 뒤집히면 조용히 무너지는 자리다.**
    for (const c of CLIENTS) {
        assert.ok(needOf(c, true) <= needOf(c, false),
            `${c.name}: 근거를 대면 ${needOf(c, true)}+ 인데 안 대면 ${needOf(c, false)}+ 다`);
    }
});

test("어머니는 안 움직이고 박 대리는 통째로 움직인다", () => {
    const mother = CLIENTS.find(c => c.id === "mother")!;
    const park = CLIENTS.find(c => c.id === "park")!;
    assert.equal(needOf(mother, true), needOf(mother, false), "어머니는 원래 받아 준다");
    const moved = (c: typeof park) => needOf(c, false) - needOf(c, true);
    assert.ok(moved(park) > moved(mother), "박 대리가 근거에 제일 크게 움직여야 한다");
    for (const c of CLIENTS) {
        assert.ok(moved(c) <= moved(park), `${c.name} 이 박 대리보다 크게 움직인다`);
    }
});

test("근거를 대도 통과가 보장되지는 않는다 — 최 사장이 그 증거다", () => {
    // 근거가 주사위를 굽히지 **없애지는 않는다.** 전부 5 이하가 되면 판정이 장식이 된다.
    for (const c of CLIENTS) {
        assert.ok(needOf(c, true) > MIN_ROLL, `${c.name} 은 근거만 대면 무조건 통한다`);
    }
    // **최 사장이 넷 중 제일 어렵다.** 숫자를 조정할 때 이 순서가 뒤집히면
    // 「사채는 사람을 안 본다」가 규칙에서 사라진다.
    const choi = CLIENTS.find(c => c.id === "choi")!;
    for (const c of CLIENTS) {
        assert.ok(oddsPct(needOf(choi, true)) <= oddsPct(needOf(c, true)),
            `${c.name} 이 최 사장보다 설득하기 어렵다`);
    }
    assert.ok(oddsPct(needOf(choi, true)) < 70, "사채는 사람을 안 본다");
});

/* ── 사람이 읽을 말 ─────────────────────────────────────────── */

test("주사위 눈과 결과가 문구에 그대로 실린다", () => {
    const c = roll(7, true, seeded(5));
    assert.ok(diceSay(c).includes(`${c.total}`));
    for (const d of c.dice) assert.ok(diceSay(c).includes(`${d}`));

    const say = checkSay(c, "김 부장");
    assert.ok(say.includes("김 부장"));
    assert.ok(say.includes("7+"));
    assert.ok(say.includes(c.ok ? "받아들였다" : "고개를 저었다"));
});
