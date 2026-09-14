// 이력 — **회귀가 지워서는 안 되는 것.**
//
// `regress()` 는 `facts` 를 통째로 비운다. 이력이 거기 섞이면 그 순간 같이 사라지고,
// 그러면 상태 페이지는 늘 0 만 보여 준다. 이 파일이 잠그는 것은 그 한 가지다 —
// **비워지는 쪽과 남는 쪽이 갈려 있는가.**

import { test } from "node:test";
import assert from "node:assert/strict";

import { EMPTY_CAREER, recordChapter } from "@/lib/game/core/career";
import { EMPTY, regress, remember } from "@/lib/game/core/progress";
import { EMPTY_FACTS, type SituationFacts } from "@/lib/game/core/situations";
import type { ChapterSummary } from "@/lib/game/core/types";

const facts = (over: Partial<SituationFacts> = {}): SituationFacts => ({ ...EMPTY_FACTS, ...over });

function summary(over: Partial<ChapterSummary> = {}): ChapterSummary {
    return {
        returnPct: 0, fee: 0, startEquity: 10_000_000, finalEquity: 10_000_000,
        energy: 50, debt: 30_000_000, wallet: 0, idle: false, ruined: false, burnedOut: false,
        earned: [], ...over,
    };
}

/* ── 회귀가 못 지운다 ───────────────────────────────────────── */
test("회귀해도 이력은 그대로 남는다 · 챕터 결산을 기억에 넣어도 이력은 안 건드린다", () => {
    // ── 회귀해도 이력은 그대로 남는다
    {
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
    }

    // ── 챕터 결산을 기억에 넣어도 이력은 안 건드린다
    {
        // `remember` 는 카드만 본다. 이력을 접는 것은 씬이 따로 부르는 일이다.
        const m = { ...EMPTY, career: recordChapter(EMPTY_CAREER, summary({ fee: 500_000 })) };
        assert.deepEqual(remember(m, summary({ earned: ["stoploss"] }), 1).career, m.career);
    }
});

/* ── 챕터가 끝났다 ─────────────────────────────────────────── */
test("보수가 쌓이고 최고 기록이 갱신된다 · 손해 본 챕터는 보수를 안 더한다", () => {
    // ── 보수가 쌓이고 최고 기록이 갱신된다
    {
        let c = recordChapter(EMPTY_CAREER, summary({ fee: 1_200_000, energy: 62, finalEquity: 14_000_000 }));
        c = recordChapter(c, summary({ fee: 800_000, energy: 40, finalEquity: 9_000_000 }));

        assert.equal(c.chapters, 2);
        assert.equal(c.feePaid, 2_000_000);
        // 나중 챕터가 나빴다고 최고 기록이 내려가면 그건 기록이 아니다.
        assert.equal(c.bestEnergy, 62);
        assert.equal(c.bestEquity, 14_000_000);
    }

    // ── 손해 본 챕터는 보수를 안 더한다
    {
        // `advisoryFee` 가 이미 0 을 내지만, 음수가 흘러들어도 합이 줄면 안 된다.
        const c = recordChapter(recordChapter(EMPTY_CAREER, summary({ fee: 0 })), summary({ fee: -5 }));
        assert.equal(c.feePaid, 0);
    }
});

/* ── 판이 끝났다 ───────────────────────────────────────────── */
/* ── 저장된 것을 믿지 않는다 ────────────────────────────────── */
/* ── 비율 ─────────────────────────────────────────────────── */
