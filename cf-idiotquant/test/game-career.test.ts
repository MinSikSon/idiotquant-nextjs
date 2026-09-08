// 이력 — **회귀가 지워서는 안 되는 것.**
//
// `regress()` 는 `facts` 를 통째로 비운다. 이력이 거기 섞이면 그 순간 같이 사라지고,
// 그러면 상태 페이지는 늘 0 만 보여 준다. 이 파일이 잠그는 것은 그 한 가지다 —
// **비워지는 쪽과 남는 쪽이 갈려 있는가.**

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    EMPTY_CAREER, END_REASONS, normalizeCareer, recordChapter, recordRun, hitRate,
} from "@/lib/game/core/career";
import { EMPTY, regress, remember } from "@/lib/game/core/progress";
import { EMPTY_FACTS, type SituationFacts } from "@/lib/game/core/situations";
import type { ChapterSummary } from "@/lib/game/core/types";

const facts = (over: Partial<SituationFacts> = {}): SituationFacts => ({ ...EMPTY_FACTS, ...over });

function summary(over: Partial<ChapterSummary> = {}): ChapterSummary {
    return {
        returnPct: 0, fee: 0, startEquity: 10_000_000, finalEquity: 10_000_000,
        energy: 50, debt: 30_000_000, idle: false, ruined: false, burnedOut: false,
        earned: [], ...over,
    };
}

/* ── 회귀가 못 지운다 ───────────────────────────────────────── */

test("회귀해도 이력은 그대로 남는다", () => {
    // 이 판정이 이 파일의 전부다. 여기가 깨지면 상태 페이지가 늘 비어 보인다.
    const played = {
        ...EMPTY,
        facts: facts({ thesisPlays: 5, stopHits: 2 }),
        career: recordChapter(EMPTY_CAREER, summary({ fee: 1_000_000, energy: 71 })),
    };
    const after = regress(played, "burnout");

    assert.deepEqual(after.career, played.career);
    // 반대로 `facts` 는 비워져야 한다 — 둘이 같은 자리에 있으면 안 된다.
    assert.equal(after.facts.thesisPlays, 0);
    assert.equal(after.facts.stopHits, 0);
});

test("챕터 결산을 기억에 넣어도 이력은 안 건드린다", () => {
    // `remember` 는 카드만 본다. 이력을 접는 것은 씬이 따로 부르는 일이다.
    const m = { ...EMPTY, career: recordChapter(EMPTY_CAREER, summary({ fee: 500_000 })) };
    assert.deepEqual(remember(m, summary({ earned: ["stoploss"] }), 1).career, m.career);
});

/* ── 챕터가 끝났다 ─────────────────────────────────────────── */

test("보수가 쌓이고 최고 기록이 갱신된다", () => {
    let c = recordChapter(EMPTY_CAREER, summary({ fee: 1_200_000, energy: 62, finalEquity: 14_000_000 }));
    c = recordChapter(c, summary({ fee: 800_000, energy: 40, finalEquity: 9_000_000 }));

    assert.equal(c.chapters, 2);
    assert.equal(c.feePaid, 2_000_000);
    // 나중 챕터가 나빴다고 최고 기록이 내려가면 그건 기록이 아니다.
    assert.equal(c.bestEnergy, 62);
    assert.equal(c.bestEquity, 14_000_000);
});

test("손해 본 챕터는 보수를 안 더한다", () => {
    // `advisoryFee` 가 이미 0 을 내지만, 음수가 흘러들어도 합이 줄면 안 된다.
    const c = recordChapter(recordChapter(EMPTY_CAREER, summary({ fee: 0 })), summary({ fee: -5 }));
    assert.equal(c.feePaid, 0);
});

/* ── 판이 끝났다 ───────────────────────────────────────────── */

test("판이 끝나면 그 판의 사실이 이력에 접힌다", () => {
    const f = facts({ thesisPlays: 7, thesisLosses: 2, blindGains: 3, blindLosses: 4, stopHits: 1 });
    let c = recordRun(EMPTY_CAREER, "burnout", f, 28_000_000);
    c = recordRun(c, "ruined", f, 31_000_000);

    assert.equal(c.runs, 2);
    assert.equal(c.thesisPlays, 14);
    assert.equal(c.blindLosses, 8);
    assert.equal(c.stopHits, 2);
    assert.equal(c.endings.burnout, 1);
    assert.equal(c.endings.ruined, 1);
    assert.equal(c.endings.debtCleared, 0);
});

test("가장 적게 남긴 빚은 내려가기만 한다", () => {
    let c = recordRun(EMPTY_CAREER, "debtRemains", EMPTY_FACTS, 28_000_000);
    assert.equal(c.leastDebt, 28_000_000);
    c = recordRun(c, "ruined", EMPTY_FACTS, 40_000_000);
    assert.equal(c.leastDebt, 28_000_000);
    c = recordRun(c, "debtCleared", EMPTY_FACTS, 0);
    assert.equal(c.leastDebt, 0);
});

test("아직 한 판도 안 끝냈으면 남긴 빚은 숫자가 아니다", () => {
    // 0 으로 두면 「빚을 다 갚은 적 있다」로 읽힌다. null 이라야 「아직 없다」가 된다.
    assert.equal(EMPTY_CAREER.leastDebt, null);
});

test("엔딩 넷을 빠짐없이 센다", () => {
    for (const r of END_REASONS) {
        assert.equal(recordRun(EMPTY_CAREER, r, EMPTY_FACTS, 1).endings[r], 1);
    }
    assert.deepEqual(Object.keys(EMPTY_CAREER.endings).sort(), [...END_REASONS].sort());
});

/* ── 저장된 것을 믿지 않는다 ────────────────────────────────── */

test("옛 저장에 이력이 없어도 빈 이력으로 뜬다", () => {
    // v1 키는 이미 쓰이고 있다. 이력이 없던 시절의 저장을 열어도 게임이 죽으면 안 된다.
    assert.deepEqual(normalizeCareer(undefined), EMPTY_CAREER);
    assert.deepEqual(normalizeCareer({}), EMPTY_CAREER);
});

test("망가진 값은 0 으로 떨어진다", () => {
    const c = normalizeCareer({ runs: "셋", feePaid: -9, bestEnergy: 1.7, endings: { ruined: 2 }, leastDebt: "x" });
    assert.equal(c.runs, 0);
    assert.equal(c.feePaid, 0);
    assert.equal(c.bestEnergy, 1);
    assert.equal(c.endings.ruined, 2);
    assert.equal(c.endings.burnout, 0);
    assert.equal(c.leastDebt, null);
});

test("빈 이력은 매번 새 객체다", () => {
    // 하나를 공유하면 어느 날 한 판의 값이 다음 판에 새어 들어간다.
    const a = normalizeCareer(null);
    const b = normalizeCareer(null);
    assert.notEqual(a.endings, b.endings);
});

/* ── 비율 ─────────────────────────────────────────────────── */

test("표본이 없으면 비율은 숫자가 아니다", () => {
    assert.equal(hitRate(0, 0), null);
    assert.equal(hitRate(3, 1), 0.75);
});
