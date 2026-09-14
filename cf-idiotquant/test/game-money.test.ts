// 금액 표기 — 자금이 판을 넘어 이어지므로 억에서 멈추면 안 된다.
//
// `theme.ts` 는 Phaser 를 **타입으로만** 받으므로 여기서 그냥 부를 수 있다. 화면 없이
// 규칙만 견주는 자리다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { money } from "@/lib/game/ui/theme";

test("만 아래는 그대로 적는다 · 만·억은 예전 그대로", () => {
    // ── 만 아래는 그대로 적는다
    {
        assert.equal(money(0), "0");
        assert.equal(money(9_999), "9,999");
        assert.equal(money(-1_234), "-1,234");
    }

    // ── 만·억은 예전 그대로
    {
        assert.equal(money(10_000), "1만");
        assert.equal(money(12_340_000), "1,234만");
        assert.equal(money(100_000_000), "1억");
        assert.equal(money(123_400_000), "1억 2,340만");
    }
});
