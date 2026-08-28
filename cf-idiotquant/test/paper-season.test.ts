// 반기마다 다른 고객과 목표 — 워커(src/lib/season.js)와 같은 답을 내는가.
//
// 기대값은 워커 test/season.test.js 에서 그대로 가져왔다. 저장하지 않고 파생하는 규칙이라
// **같은 입력에 늘 같은 값**이 나오는 것이 전부다. 두 구현이 어긋나면 준비 화면이 말한
// 고객과 정산이 쓴 고객이 달라진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { seasonOf, missionMet, CLIENTS, MISSIONS, type MissionFacts } from "@/lib/paper/season";

test("같은 반기는 늘 같은 고객·목표", () => {
    const a = seasonOf("camp-1", 0)!;
    const b = seasonOf("camp-1", 0)!;
    assert.equal(a.client.id, b.client.id);
    assert.equal(a.mission.id, b.mission.id);
});

test("반기가 다르면 짝도 달라진다 — 여덟 반기가 같은 질문이면 안 붙인 것과 같다", () => {
    const pairs = new Set(
        Array.from({ length: 8 }, (_, i) => {
            const s = seasonOf("camp-1", i)!;
            return `${s.client.id}/${s.mission.id}`;
        }),
    );
    assert.ok(pairs.size >= 5, `여덟 반기에 짝이 ${pairs.size} 가지뿐이다`);
});

test("고객과 목표가 붙어 다니지 않는다 — 한 고객에 늘 같은 목표면 네 판이 전부다", () => {
    const byClient = new Map<string, Set<string>>();
    for (let i = 0; i < 40; i++) {
        const s = seasonOf("camp-x", i)!;
        if (!byClient.has(s.client.id)) byClient.set(s.client.id, new Set());
        byClient.get(s.client.id)!.add(s.mission.id);
    }
    for (const [client, missions] of byClient) {
        assert.ok(missions.size > 1, `${client} 에게는 늘 같은 목표만 온다`);
    }
});

test("캠페인이 없으면 고객도 목표도 없다 — 체험 운용은 예전 규칙 그대로", () => {
    assert.equal(seasonOf(null, 0), null);
    assert.equal(seasonOf(undefined, 3), null);
    assert.equal(seasonOf("", 0), null);
});

test("목록 안의 값만 나온다", () => {
    for (let i = 0; i < 30; i++) {
        const s = seasonOf("camp-9", i)!;
        assert.ok(CLIENTS.some(c => c.id === s.client.id));
        assert.ok(MISSIONS.some(m => m.id === s.mission.id));
    }
});

/* ── 목표 판정 ─────────────────────────────────────────────────── */

const facts = (over: Partial<MissionFacts> = {}): MissionFacts => ({
    excess: 0, finalReturn: 0, turnover: 1, maxExposure: 0, slotsUsed: 0, ...over,
});
const mission = (id: string) => MISSIONS.find(m => m.id === id)!;

test("벤치마크 초과 목표는 정해진 폭을 넘어야 한다", () => {
    assert.equal(missionMet(mission("edge"), facts({ excess: 2.9 })), false);
    assert.equal(missionMet(mission("edge"), facts({ excess: 3 })), true);
});

test("분산 목표는 이기고 + 세 자리 이상", () => {
    assert.equal(missionMet(mission("spread"), facts({ excess: 5, slotsUsed: 2 })), false);
    assert.equal(missionMet(mission("spread"), facts({ excess: 5, slotsUsed: 3 })), true);
    assert.equal(missionMet(mission("spread"), facts({ excess: -1, slotsUsed: 4 })), false, "지고서 담기만 한 건 아니다");
});

test("참을성 목표를 관망으로 통과할 수는 없다", () => {
    // 한 주도 안 산 반기는 회전율이 0 이다. 그걸 참을성으로 쳐 주면 목표가 곧 관망이 된다.
    assert.equal(missionMet(mission("patient"), facts({ excess: 10, turnover: 0 })), false);
    assert.equal(missionMet(mission("patient"), facts({ excess: 10, turnover: null })), false);
    assert.equal(missionMet(mission("patient"), facts({ excess: 10, turnover: 1.5 })), true);
    assert.equal(missionMet(mission("patient"), facts({ excess: 10, turnover: 1.6 })), false);
});

test("집중 목표는 한때 실었던 비중으로 본다", () => {
    assert.equal(missionMet(mission("focus"), facts({ excess: 1, maxExposure: 69 })), false);
    assert.equal(missionMet(mission("focus"), facts({ excess: 1, maxExposure: 70 })), true);
});

test("잃지 않고 이기기 — 벤치마크가 더 많이 잃은 것으로는 안 된다", () => {
    assert.equal(missionMet(mission("steady"), facts({ excess: 5, finalReturn: -1 })), false);
    assert.equal(missionMet(mission("steady"), facts({ excess: 5, finalReturn: 0 })), true);
});

test("목표가 없으면 달성도 없다", () => {
    assert.equal(missionMet(null, facts({ excess: 100 })), false);
});
