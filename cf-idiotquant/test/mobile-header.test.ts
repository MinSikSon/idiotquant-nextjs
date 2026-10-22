import { test } from "node:test";
import assert from "node:assert/strict";
import { nextMobileHeaderCompact } from "@/lib/utils/mobileHeader";

test("모바일 헤더는 128px 이후 요약하고 상단 근처에서 복원한다", () => {
    assert.equal(nextMobileHeaderCompact(false, 127, true), false);
    assert.equal(nextMobileHeaderCompact(false, 128, true), true);
    assert.equal(nextMobileHeaderCompact(true, 25, true), true);
    assert.equal(nextMobileHeaderCompact(true, 24, true), false);
    assert.equal(nextMobileHeaderCompact(true, -10, true), false);
});

test("헤더 높이 변화로 위치가 조금 되돌아가도 접힘과 펼침을 반복하지 않는다", () => {
    let compact = false;
    for (const position of [130, 90, 91, 80, 110, 129]) {
        compact = nextMobileHeaderCompact(compact, position, true);
        assert.equal(compact, true);
    }
    assert.equal(nextMobileHeaderCompact(compact, 0, true), false);
});

test("데스크톱으로 바꾸면 스크롤 위치와 관계없이 요약을 해제한다", () => {
    assert.equal(nextMobileHeaderCompact(true, 500, false), false);
    assert.equal(nextMobileHeaderCompact(false, 500, false), false);
});
