import assert from "node:assert/strict";
import test from "node:test";
import { selectGuestRecommendations } from "../lib/utils/guestRecommendations.ts";

test("guest recommendations filter the full scan before taking the top ten", () => {
    const excluded = Array.from({ length: 10 }, (_, index) => ({ ncav_ratio: 20 - index, pbr: 1.2, per: 5 }));
    const eligible = Array.from({ length: 12 }, (_, index) => ({ ncav_ratio: 10 - index * 0.1, pbr: 0.8, per: 5 }));
    const result = selectGuestRecommendations([...excluded, ...eligible]);

    assert.equal(result.length, 10);
    assert.deepEqual(result, eligible.slice(0, 10));
    assert.deepEqual(selectGuestRecommendations([
        { ncav_ratio: 2, pbr: 0, per: 5 },
        { ncav_ratio: 2, pbr: 0.8, per: 0 },
        { ncav_ratio: 0.9, pbr: 0.8, per: 5 },
    ]), []);
});
