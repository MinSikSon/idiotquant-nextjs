import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, perform } from "@/lib/rogue/game";
import type { GameState } from "@/lib/rogue/types";

/** 테스트용 선택 제단 — 실제 제단처럼 방 안 모루 위에 선다. */
function altar(seed: number): GameState {
    const s = newGame(seed);
    const room = s.level.rooms.findIndex((r) => !r.gone && !r.maze);
    const r = s.level.rooms[room];
    const hero = s.heroes[0];
    hero.x = r.x + 1;
    hero.y = r.y + 1;
    s.level.anvil = { x: hero.x, y: hero.y };
    s.level.special = { room, kind: "altar" };
    return s;
}

test("선택 제단은 하나만 고르고, 피의 서약은 현재 체력만 낸다", () => {
    const s = altar(901);
    s.heroes[0].hp = 24;
    s.heroes[0].maxHp = 30;

    const after = perform(s, { t: "altar", choice: "blood" });
    assert.equal(after.heroes[0].hp, 16);
    assert.equal(after.heroes[0].maxHp, 30, "피의 서약이 최대 체력을 깎았다");
    assert.ok(after.heroes[0].pack.some((it) => it.type === "blessed enchant" && it.blessed));
    assert.ok(after.level.altarUsed, "쓴 제단이 다시 열려 있다");

    const again = perform(after, { t: "altar", choice: "hunger" });
    assert.equal(again.heroes[0].food, after.heroes[0].food, "이미 쓴 제단을 다시 썼다");
});

test("수호자의 서약은 챔피언을 부르고, 수호자는 보석 보상을 표시한다", () => {
    const s = altar(902);
    const after = perform(s, { t: "altar", choice: "guardian" });
    assert.ok(after.level.monsters.some((m) => m.altarGuardian && m.champion), "제단 수호자가 나타나지 않았다");
    assert.ok(after.messages.some((m) => /수호자.*보석/.test(m)), "수호자 보상을 알리지 않는다");
});
