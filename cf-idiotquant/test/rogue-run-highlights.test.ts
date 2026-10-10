import { test } from "node:test";
import assert from "node:assert/strict";

import { runHighlights } from "@/lib/rogue/runHighlights";

test("결산은 위험한 순간과 값진 획득을 골라내고 계산 줄은 접는다", () => {
    const highlights = runHighlights([
        "T:1 a) 식량 2개",
        "· 명중 굴림: 적 d20 19",
        "T:4 오크 → 기사: 맞았다. 피해 3",
        "T:8 b) +2 장검",
        "T:12 독이 퍼진다! 체력 8 피해, 힘이 1 줄었다.",
        "T:16 c) 옌더의 증표",
        "T:20 생명 구명 목걸이가 산산이 부서지며 죽음을 막았다!",
        "T:24 d) 금화 50을(를) 주웠다.",
    ]);

    assert.deepEqual(highlights.dangers.map(({ log }) => log), [
        "T:4 오크 → 기사: 맞았다. 피해 3",
        "T:12 독이 퍼진다! 체력 8 피해, 힘이 1 줄었다.",
        "T:20 생명 구명 목걸이가 산산이 부서지며 죽음을 막았다!",
    ]);
    assert.deepEqual(highlights.finds.map(({ log }) => log), [
        "T:8 b) +2 장검",
        "T:16 c) 옌더의 증표",
    ]);
});

test("각 강조 목록은 최대 세 사건으로 제한한다", () => {
    const highlights = runHighlights([
        "T:1 적 → 기사: 맞았다. 피해 1",
        "T:2 적 → 기사: 맞았다. 피해 2",
        "T:3 적 → 기사: 맞았다. 피해 3",
        "T:4 적 → 기사: 맞았다. 피해 4",
    ]);
    assert.equal(highlights.dangers.length, 3);
    assert.deepEqual(highlights.dangers.map(({ log }) => log), [
        "T:2 적 → 기사: 맞았다. 피해 2",
        "T:3 적 → 기사: 맞았다. 피해 3",
        "T:4 적 → 기사: 맞았다. 피해 4",
    ]);
});
