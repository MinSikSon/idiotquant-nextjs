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

import {
    EMPTY_CHRONICLE, chapterStrip, noteTurn, normalizeChronicle, notedCount,
    recallAt, recallSay, worthResearching, type Chronicle,
} from "@/lib/game/core/chronicle";
import { EMPTY, regress } from "@/lib/game/core/progress";
import { StockEngine } from "@/lib/game/core/StockEngine";
import { CHAPTERS } from "@/lib/game/core/chapters";

/* ── 적는다 ─────────────────────────────────────────────────── */

test("겪은 턴이 적히고, 안 겪은 턴은 null 이다", () => {
    let c: Chronicle = EMPTY_CHRONICLE;
    c = noteTurn(c, "y1998", 3, "bear");
    assert.equal(recallAt(c, "y1998", 3), "bear");
    assert.equal(recallAt(c, "y1998", 4), null);
    assert.equal(recallAt(c, "y1999", 3), null, "챕터가 다르면 다른 턴이다");
});

test("이미 적힌 것을 다시 적으면 **그대로 돌려준다** — 저장을 안 하려고", () => {
    // 뼈대가 회차를 넘어 같으므로 두 번째로 겪는 턴은 값이 같다. 그때마다 새 객체를
    // 만들면 씬이 매 턴 localStorage 에 쓴다.
    const c = noteTurn(EMPTY_CHRONICLE, "y1998", 3, "bear");
    assert.equal(noteTurn(c, "y1998", 3, "bear"), c);
    assert.notEqual(noteTurn(c, "y1998", 3, "bull"), c, "값이 바뀌면 새로 적는다");
});

test("0턴 이하는 안 적는다", () => {
    assert.equal(notedCount(noteTurn(EMPTY_CHRONICLE, "y1998", 0, "bull")), 0);
});

test("띠는 턴 순서대로 나오고 길이가 챕터 턴 수다", () => {
    let c: Chronicle = EMPTY_CHRONICLE;
    c = noteTurn(c, "y1998", 1, "bear");
    c = noteTurn(c, "y1998", 3, "bull");
    assert.deepEqual(chapterStrip(c, "y1998", 4), ["bear", null, "bull", null]);
});

/* ── 저장된 것을 믿지 않는다 ────────────────────────────────── */

test("손으로 고친 값은 걸러진다", () => {
    const c = normalizeChronicle({
        y1998: { "1": "bull", "2": "무지개", "0": "bear", x: "chop" },
        y1999: "이건 객체가 아니다",
        y2000: {},
    });
    assert.deepEqual(c, { y1998: { "1": "bull" } });
    assert.deepEqual(normalizeChronicle(null), {});
    assert.deepEqual(normalizeChronicle("문자열"), {});
});

/* ── ① 회귀가 지우지 않는다 ─────────────────────────────────── */

test("회귀해도 연대기는 남는다 — 이 줄이 이 기능의 전부다", () => {
    const before = {
        ...EMPTY,
        chronicle: noteTurn(EMPTY_CHRONICLE, "y1998", 5, "bull"),
    };
    for (const reason of ["debtRemains", "burnout", "ruined", "debtCleared"] as const) {
        const after = regress(before, reason);
        assert.equal(recallAt(after.chronicle, "y1998", 5), "bull", `${reason} 에서 지워졌다`);
    }
});

test("회귀는 다른 것은 그대로 지운다 — 남는 것이 연대기뿐이라는 확인", () => {
    const before = { ...EMPTY, facts: { ...EMPTY.facts, thesisPlays: 7 } };
    assert.equal(regress(before, "burnout").facts.thesisPlays, 0);
});

/* ── ② 아는 것은 근거가 아니다 ──────────────────────────────── */

test("기억은 판정과 **다른 말**을 쓴다", () => {
    // 같은 말로 적으면 「알아봤다」와 「겪어서 안다」가 화면에서 구별이 안 된다.
    // 그 둘이 구별되는 것이 이 게임이라, 문구가 겹치면 여기서 걸린다.
    const heads = (["bull", "bear", "chop"] as const).map(r => recallSay(r)!.head);
    for (const h of heads) {
        assert.ok(h.includes("이 턴은"), `「${h}」 는 겪은 것을 말하는 투가 아니다`);
    }
    assert.equal(recallSay(null), null);
});

test("떨어졌던·흐렸던 턴은 알아볼 값어치가 없고, 모르는 턴은 알아봐야 한다", () => {
    assert.equal(worthResearching("bear"), false);
    assert.equal(worthResearching("chop"), false);
    assert.equal(worthResearching("bull"), true);
    // **모르면 true 다.** 처음 가는 턴에 「넘겨라」라고 말하면 판이 안 굴러간다.
    assert.equal(worthResearching(null), true);
});

/* ── 엔진이 내는 국면과 같은 것을 적는가 ────────────────────── */

test("연대기에 적히는 것은 엔진이 그 턴에 실제로 돌린 국면이다", () => {
    // 씬이 `engine.regimeNow` 를 적는다. 그 값이 실제 국면과 다르면 다음 회차의
    // 기억이 통째로 거짓말이 된다.
    const e = new StockEngine(4242);
    const ch = e.chapter;
    let c: Chronicle = EMPTY_CHRONICLE;
    const seen: string[] = [];
    for (let t = 0; t < ch.turns; t++) {
        const r = e.regimeNow!;
        seen.push(r);
        c = noteTurn(c, ch.id, e.player.currentTurn, r);
        e.advanceTurn();
    }
    assert.deepEqual(chapterStrip(c, ch.id, ch.turns), seen);
});

test("뼈대는 회차를 넘어 같다 — 그래서 기억이 쓸모가 있다", () => {
    // 시드가 다른 두 판이 같은 턴에 같은 국면을 내야 한다. 안 그러면 연대기는
    // 지난 판에만 맞는 값이라 다음 판을 오히려 망친다.
    const walk = (seed: number) => {
        const e = new StockEngine(seed);
        const out: string[] = [];
        for (let t = 0; t < e.chapter.turns; t++) { out.push(e.regimeNow!); e.advanceTurn(); }
        return out;
    };
    assert.deepEqual(walk(1), walk(999_999));
});

test("모든 챕터의 국면 뼈대가 시드와 무관하다", () => {
    const walkAll = (seed: number) => {
        const e = new StockEngine(seed);
        const out: Record<string, string[]> = {};
        for (const ch of CHAPTERS) {
            const turns: string[] = [];
            for (let t = 0; t < ch.turns; t++) { turns.push(e.regimeNow!); e.advanceTurn(); }
            out[ch.id] = turns;
            if (!e.startNextChapter()) break;
        }
        return out;
    };
    assert.deepEqual(walkAll(7), walkAll(123_456));
});
