import { test } from "node:test";
import assert from "node:assert/strict";

import { sharedRun, sharedRunUrl } from "@/lib/rogue/share";

test("시드 공유 링크는 시작 직업까지 읽고, 방 초대 같은 다른 쿼리는 안 싣는다", () => {
    assert.deepEqual(sharedRun("?seed=48291&origin=scholar"), { seed: 48291, origin: "scholar" });
    assert.equal(sharedRun("?seed=-1&origin=knight"), null);
    assert.equal(sharedRun("?seed=2147483648&origin=knight"), null);
    assert.equal(sharedRun("?seed=77&origin=unknown"), null);

    assert.equal(
        sharedRunUrl("https://example.test/game?room=1234#old", { seed: 48291, origin: "scholar" }),
        "https://example.test/game?seed=48291&origin=scholar",
    );
});
