// 반기마다 다른 고객과 목표 — 워커(src/lib/season.js)와 같은 답을 내는가.
//
// 기대값은 워커 test/season.test.js 에서 그대로 가져왔다. 저장하지 않고 파생하는 규칙이라
// **같은 입력에 늘 같은 값**이 나오는 것이 전부다. 두 구현이 어긋나면 준비 화면이 말한
// 고객과 정산이 쓴 고객이 달라진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { seasonOf, missionMet, MISSIONS, type MissionFacts } from "@/lib/paper/season";

test("같은 반기는 늘 같은 고객·목표 · 반기가 다르면 짝도 달라진다 — 여덟 반기가 같은 질문이면 안 붙인 것과 같다", () => {
    // ── 같은 반기는 늘 같은 고객·목표
    {
        const a = seasonOf("camp-1", 0)!;
        const b = seasonOf("camp-1", 0)!;
        assert.equal(a.client.id, b.client.id);
        assert.equal(a.mission.id, b.mission.id);
    }

    // ── 반기가 다르면 짝도 달라진다 — 여덟 반기가 같은 질문이면 안 붙인 것과 같다
    {
        const pairs = new Set(
            Array.from({ length: 8 }, (_, i) => {
                const s = seasonOf("camp-1", i)!;
                return `${s.client.id}/${s.mission.id}`;
            }),
        );
        assert.ok(pairs.size >= 5, `여덟 반기에 짝이 ${pairs.size} 가지뿐이다`);
    }
});

/* ── 목표 판정 ─────────────────────────────────────────────────── */

const facts = (over: Partial<MissionFacts> = {}): MissionFacts => ({
    excess: 0, finalReturn: 0, turnover: 1, maxExposure: 0, slotsUsed: 0, ...over,
});
const mission = (id: string) => MISSIONS.find(m => m.id === id)!;

test("집중 목표는 한때 실었던 비중으로 본다 · 잃지 않고 이기기 — 벤치마크가 더 많이 잃은 것으로는 안 된다", () => {
    // ── 집중 목표는 한때 실었던 비중으로 본다
    {
        assert.equal(missionMet(mission("focus"), facts({ excess: 1, maxExposure: 69 })), false);
        assert.equal(missionMet(mission("focus"), facts({ excess: 1, maxExposure: 70 })), true);
    }

    // ── 잃지 않고 이기기 — 벤치마크가 더 많이 잃은 것으로는 안 된다
    {
        assert.equal(missionMet(mission("steady"), facts({ excess: 5, finalReturn: -1 })), false);
        assert.equal(missionMet(mission("steady"), facts({ excess: 5, finalReturn: 0 })), true);
    }
});
