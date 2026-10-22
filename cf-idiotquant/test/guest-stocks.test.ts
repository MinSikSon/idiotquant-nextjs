import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesGuestPer } from "@/lib/utils/guestStocks";

test("비로그인 발굴은 PER 0 초과·20 이하만 포함하고 누락·비정상 값은 제외한다", () => {
    for (const per of [0.01, 10, 20]) assert.equal(matchesGuestPer({ per }), true);
    for (const per of [null, undefined, NaN, Infinity, -Infinity, -1, 0, 20.01]) {
        assert.equal(matchesGuestPer({ per }), false, String(per));
    }
    assert.equal(matchesGuestPer({}), false);
});
