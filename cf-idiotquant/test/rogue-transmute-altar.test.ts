// 변환 제단 — 넷핵의 제단을 빌린 **도박 자리.**
//
// 거는 것:
//
//   ① **2층부터 가끔 선다.** 1층에는 없다(그래야 1층은 섞기 전과 같은 판이다). 계단·모루·
//      함정 위, 특수 방·금고 안에는 안 선다.
//   ② **올리면 같은 분류의 다른 물건이 되거나, 제단이 삼킨다**(`TRANSMUTE_SWALLOW_CHANCE`).
//      강화 주문서는 강화 주문서끼리만 바뀐다 — 안 그러면 지도 주문서가 강화 주문서를 뽑는
//      뒷문이 된다.
//   ③ **제단마다 `TRANSMUTE_ALTAR_USES` 번.** 삼켜도 한 번이다. 다 쓰면 그냥 바닥이다.
//   ④ **안 받는 물건은 그냥 내려놓은 것이다** — 식량·증표·금화·유물·보석. 증표가 삼켜지면
//      이기는 조건이 사라진다.
//   ⑤ **저장을 오가도 남은 횟수가 그대로다.** 되읽으며 채워지면 제단이 무한이 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { TRANSMUTE_SWALLOW_CHANCE, newGame, perform, transmuteCategory } from "@/lib/rogue/game";
import { addToPack } from "@/lib/rogue/hero";
import { makeItem } from "@/lib/rogue/items";
import { TRANSMUTE_ALTAR_CHANCE, TRANSMUTE_ALTAR_USES, buildLevel } from "@/lib/rogue/dungeon";
import { deserialize, serialize } from "@/lib/rogue/storage";
import { Rng } from "@/lib/rogue/rng";
import { walkable, idx, type GameState, type Item, type ItemKind, type Tile } from "@/lib/rogue/types";

/** 제단 위에 세우고 발밑·주변 몬스터를 비운 판. */
function atAltar(seed: number, uses = TRANSMUTE_ALTAR_USES): GameState {
    const s = newGame(seed);
    const h = s.heroes[0];
    s.level.transmuteAltar = { x: h.x, y: h.y, uses };
    s.level.items = s.level.items.filter((it) => it.x !== h.x || it.y !== h.y);
    s.level.monsters = [];
    return s;
}

function give(s: GameState, kind: ItemKind, type: string, id = 9000): Item {
    return addToPack(s.heroes[0], makeItem(kind, type, id, -1, -1))!;
}

function underfoot(s: GameState): Item | undefined {
    const h = s.heroes[0];
    return s.level.items.find((it) => it.x === h.x && it.y === h.y);
}

test("변환 제단은 2층부터 가끔, 안전한 자리에 선다", () => {
    const rng = new Rng(20260928);
    let deep = 0;
    let placed = 0;
    for (let round = 0; round < 40; round++) {
        for (let depth = 1; depth <= 26; depth++) {
            const level = buildLevel(depth, rng);
            const a = level.transmuteAltar;
            if (depth === 1) {
                assert.ok(!a, "1층에 변환 제단이 섰다");
                continue;
            }
            deep++;
            if (!a) continue;
            placed++;
            const at = `${depth}층 (${a.x},${a.y})`;
            assert.equal(a.uses, TRANSMUTE_ALTAR_USES, `${at}: 횟수가 다르다`);
            assert.ok(walkable(level.tiles[idx(a.x, a.y)] as Tile), `${at}: 바위 속이다`);
            for (const p of [level.stairs, level.upStairs, level.anvil, ...level.traps]) {
                assert.ok(!p || p.x !== a.x || p.y !== a.y, `${at}: 계단·모루·함정과 겹친다`);
            }
            const ri = level.roomAt[idx(a.x, a.y)];
            assert.ok(ri >= 0, `${at}: 방 안이 아니다`);
            assert.notEqual(ri, level.special?.room, `${at}: 특수 방 안이다`);
            assert.ok(!level.rooms[ri].vault, `${at}: 금고 안이다`);
        }
    }
    const rate = (placed / deep) * 100;
    assert.ok(Math.abs(rate - TRANSMUTE_ALTAR_CHANCE) < 8, `서는 비율이 ${rate.toFixed(1)}% — ${TRANSMUTE_ALTAR_CHANCE}% 근처여야 한다`);
});

test("올리면 같은 분류로 바뀌거나 삼켜진다", () => {
    // ── 분류마다: 배낭에서 빠지고, 남은 것은 같은 분류이고, 횟수가 하나 줄고, 턴을 쓴다
    const cases: [ItemKind, string][] = [
        ["potion", "healing"],
        ["scroll", "identify"],
        ["scroll", "enchant weapon"],
        ["weapon", "long sword"],
        ["armor", "leather"],
        ["ring", "protection"],
        ["wand", "magic missile"],
    ];
    let swallowed = 0;
    let offered = 0;
    for (const [kind, type] of cases) {
        for (let seed = 1; seed <= 60; seed++) {
            const s = atAltar(seed * 7 + kind.length);
            const it = give(s, kind, type);
            const turn = s.turn;
            const after = perform(s, { t: "drop", letter: it.letter! });
            const tag = `${kind}/${type} 시드 ${seed}`;
            assert.ok(!after.heroes[0].pack.some((p) => p.id === it.id), `${tag}: 배낭에 남았다`);
            assert.equal(after.level.transmuteAltar!.uses, TRANSMUTE_ALTAR_USES - 1, `${tag}: 횟수가 안 줄었다`);
            assert.equal(after.turn, turn + 1, `${tag}: 턴을 안 썼다`);
            const made = underfoot(after);
            offered++;
            if (!made) {
                swallowed++;
                continue;
            }
            assert.notEqual(made.id, it.id, `${tag}: 올린 물건이 그대로 놓여 있다`);
            assert.equal(transmuteCategory(made), transmuteCategory(it), `${tag}: ${made.kind}/${made.type} 로 분류가 바뀌었다`);
        }
    }
    const rate = (swallowed / offered) * 100;
    assert.ok(Math.abs(rate - TRANSMUTE_SWALLOW_CHANCE) < 8, `삼키는 비율이 ${rate.toFixed(1)}% — ${TRANSMUTE_SWALLOW_CHANCE}% 근처여야 한다`);
});

test("안 받는 물건 · 다 쓴 제단 · 제단 밖은 그냥 내려놓는다", () => {
    // ── 식량과 증표는 제단에 올려도 그대로 놓인다 — 횟수도 안 준다
    for (const [kind, type] of [["food", "food ration"], ["amulet", "amulet"]] as [ItemKind, string][]) {
        const s = atAltar(3);
        const it = give(s, kind, type);
        const after = perform(s, { t: "drop", letter: it.letter! });
        assert.equal(underfoot(after)?.id, it.id, `${kind}: 제단이 받았다`);
        assert.equal(after.level.transmuteAltar!.uses, TRANSMUTE_ALTAR_USES, `${kind}: 횟수가 줄었다`);
    }

    // ── 횟수를 다 쓰면 불이 꺼지고 그다음부터는 그냥 바닥이다
    {
        const s = atAltar(5, 1);
        const first = give(s, "potion", "healing", 9001);
        let after = perform(s, { t: "drop", letter: first.letter! });
        assert.equal(after.level.transmuteAltar!.uses, 0);
        assert.ok(after.messages.some((m) => m.includes("불빛이 꺼졌다")), "꺼졌다는 말이 없다");
        after.level.items = after.level.items.filter((it) => it.x !== after.heroes[0].x || it.y !== after.heroes[0].y);
        const second = give(after, "potion", "healing", 9002);
        after = perform(after, { t: "drop", letter: second.letter! });
        assert.equal(underfoot(after)?.id, second.id, "꺼진 제단이 또 바꿨다");
        assert.equal(after.level.transmuteAltar!.uses, 0);
    }

    // ── 제단 칸이 아니면 보통 내려놓기다
    {
        const s = atAltar(7);
        s.level.transmuteAltar!.x += 1;
        const it = give(s, "weapon", "long sword");
        const after = perform(s, { t: "drop", letter: it.letter! });
        assert.equal(underfoot(after)?.id, it.id, "제단 밖에서 바뀌었다");
        assert.equal(after.level.transmuteAltar!.uses, TRANSMUTE_ALTAR_USES);
    }
});

test("저장을 오가도 제단의 남은 횟수가 그대로다", () => {
    const s = atAltar(9, 2);
    const back = deserialize(serialize(s))!;
    assert.deepEqual(back.level.transmuteAltar, s.level.transmuteAltar, "되읽으며 제단이 달라졌다");

    // 옛 저장(칸 없음)·모양이 틀린 것은 없는 것으로, 넘치는 횟수는 잘라서 읽는다
    const raw = JSON.parse(serialize(s));
    delete raw.level.transmuteAltar;
    assert.equal(deserialize(JSON.stringify(raw))!.level.transmuteAltar, null, "옛 저장에 제단이 생겼다");
    raw.level.transmuteAltar = { x: "a", y: 1, uses: 3 };
    assert.equal(deserialize(JSON.stringify(raw))!.level.transmuteAltar, null, "틀린 모양을 살렸다");
    raw.level.transmuteAltar = { x: 5, y: 5, uses: 99 };
    assert.equal(deserialize(JSON.stringify(raw))!.level.transmuteAltar!.uses, TRANSMUTE_ALTAR_USES, "횟수가 안 잘렸다");
});
