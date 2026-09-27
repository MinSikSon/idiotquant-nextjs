import { test } from "node:test";
import assert from "node:assert/strict";

import { ORIGIN_LIST } from "@/lib/rogue/origins";
import { sharedRun, sharedRunUrl } from "@/lib/rogue/share";

test("시드 공유 링크는 시작 직업까지 읽고, 방 초대 같은 다른 쿼리는 안 싣는다", () => {
    assert.deepEqual(sharedRun("?seed=48291&origin=scholar"), { seed: 48291, origin: "scholar" });
    assert.equal(sharedRun("?seed=-1&origin=knight"), null);
    assert.equal(sharedRun("?seed=2147483648&origin=knight"), null);
    assert.equal(sharedRun("?seed=77&origin=unknown"), null);
    // 직업을 더하면 공유 링크도 받아야 한다 — 따로 적힌 목록이라 빠뜨리면 그 직업만 링크가 조용히 버려진다.
    for (const o of ORIGIN_LIST) {
        assert.deepEqual(sharedRun(`?seed=5&origin=${o.id}`), { seed: 5, origin: o.id }, `${o.name} 공유 링크가 안 읽힌다`);
    }

    assert.equal(
        sharedRunUrl("https://example.test/game?room=1234#old", { seed: 48291, origin: "scholar" }),
        "https://example.test/game?seed=48291&origin=scholar",
    );
});
