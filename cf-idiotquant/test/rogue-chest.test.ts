// 캠프 상자 — **판을 넘어 남는 넷째 것.**
//
// 이 저장소는 오래 「판을 넘는 메타 성장은 안 한다」를 못 박고 있었고, 판을 넘어 남는
// 것은 도감·수법·지난 판 셋뿐이었다. 상자는 주인이 그 규칙을 바꿔 더한 넷째다.
//
// 규칙을 하나 늘린 만큼 **뚫릴 자리도 같이 늘었다.** 이 파일이 거는 것은 그 자리들이다:
//
//   1. **증표는 못 맡긴다.** 맡겨 두고 다음 판에 꺼내면 26층을 안 내려가고 이긴다 —
//      이 게임의 이기는 조건이 통째로 사라진다. 제일 크게 뚫리는 자리라 맨 앞에 건다.
//   2. **캠프에서만.** 아무 데서나 되면 상자가 아니라 배낭 한 칸이 더 생기는 것이다.
//   3. **칸은 셋.** 겹쳐 쌓인 것을 뭉텅이째 넣어 상한을 뚫으면 안 된다.
//   4. **번호를 다시 매긴다.** 지난 판의 `id` 를 그대로 들고 오면 이 판이 빚는 물건과
//      겹치고, `takeFromPack` 이 `id` 로 찾으므로 **엉뚱한 것이 사라진다.**
//   5. **사람마다 따로.** 둘이서 할 때 한 상자를 나눠 쓰면 「각자 유지」가 거짓이 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { joinGame, leaveGame, newGame, perform, setChest, type Command } from "@/lib/rogue/game";
import { CHEST_SLOTS, makeItem } from "@/lib/rogue/items";
import { deserialize, serialize } from "@/lib/rogue/storage";
import type { GameState, Item } from "@/lib/rogue/types";

/** 그 사람을 캠프(모루 칸) 위에 세운다. */
function standAtCamp(s: GameState, who = 0): void {
    const anvil = s.level.anvil!;
    assert.ok(anvil, "이 층에 모루가 없다 — 모루는 층마다 하나여야 한다");
    s.heroes[who].x = anvil.x;
    s.heroes[who].y = anvil.y;
}

/** 배낭에 물건 하나를 밀어 넣고 그 글자를 준다. */
function give(s: GameState, it: Item, letter: string, who = 0): string {
    it.letter = letter;
    it.x = -1;
    it.y = -1;
    s.heroes[who].pack.push(it);
    return letter;
}

const run = (s: GameState, cmd: Command) => perform(s, cmd);

test("캠프 상자 — 캠프에서만 · 셋까지 · 증표는 못 맡긴다", () => {
    // ── 캠프 밖에서는 안 맡겨진다 (아무 일도 안 일어나므로 턴도 안 쓴다)
    {
        const s0 = newGame(301);
        const sword = makeItem("weapon", "long sword", 900, -1, -1);
        give(s0, sword, "y");
        const anvil = s0.level.anvil!;
        // 모루가 아닌 칸으로 옮긴다 — 시작 자리가 하필 모루일 수 있다.
        if (s0.heroes[0].x === anvil.x && s0.heroes[0].y === anvil.y) s0.heroes[0].x += 1;

        const before = s0.turn;
        const s1 = run(s0, { t: "stash", letter: "y" });
        assert.equal(s1.heroes[0].chest.length, 0, "캠프 밖인데 상자에 들어갔다");
        assert.ok(s1.heroes[0].pack.some((p) => p.id === sword.id), "캠프 밖인데 배낭에서 빠졌다");
        assert.equal(s1.turn, before, "아무 일도 안 일어났는데 턴을 썼다");
    }

    // ── 캠프에서는 맡겨지고, 배낭에서 빠진다
    {
        const s0 = newGame(302);
        standAtCamp(s0);
        const sword = makeItem("weapon", "long sword", 910, -1, -1);
        give(s0, sword, "y");

        const s1 = run(s0, { t: "stash", letter: "y" });
        assert.equal(s1.heroes[0].chest.length, 1, "캠프인데 안 맡겨졌다");
        assert.equal(s1.heroes[0].chest[0].type, "long sword");
        assert.ok(!s1.heroes[0].pack.some((p) => p.id === sword.id), "맡겼는데 배낭에 그대로 있다");
        // 자리는 칸 번호가 진다 — 배낭의 글자를 들고 있으면 꺼낼 때 두 물건이 같은 글자를 쓴다.
        assert.equal(s1.heroes[0].chest[0].letter, undefined, "상자에 든 것이 배낭 글자를 들고 있다");

        // 꺼내면 배낭으로 돌아오고 글자를 새로 받는다
        const s2 = run(s1, { t: "unstash", slot: 0 });
        assert.equal(s2.heroes[0].chest.length, 0, "꺼냈는데 상자에 남아 있다");
        const back = s2.heroes[0].pack.find((p) => p.type === "long sword");
        assert.ok(back, "꺼냈는데 배낭에 없다");
        assert.ok(back!.letter, "꺼낸 물건이 배낭 글자를 못 받았다");
    }

    // ── **증표는 못 맡긴다** — 이기는 조건이 통째로 사라지는 자리다
    {
        const s0 = newGame(303);
        standAtCamp(s0);
        give(s0, makeItem("amulet", "amulet", 920, -1, -1), "y");

        const s1 = run(s0, { t: "stash", letter: "y" });
        assert.equal(s1.heroes[0].chest.length, 0, "증표가 상자에 들어갔다 — 다음 판에 꺼내면 곧바로 이긴다");
        assert.ok(s1.heroes[0].pack.some((p) => p.kind === "amulet"), "증표가 배낭에서도 사라졌다");
    }

    // ── 칸은 셋. 꽉 차면 안 들어간다
    {
        const s0 = newGame(304);
        standAtCamp(s0);
        let s = s0;
        for (let i = 0; i < CHEST_SLOTS + 1; i++) {
            give(s, makeItem("potion", "healing", 930 + i, -1, -1), String.fromCharCode(112 + i));
            s = run(s, { t: "stash", letter: String.fromCharCode(112 + i) });
        }
        assert.equal(s.heroes[0].chest.length, CHEST_SLOTS, `상자가 ${CHEST_SLOTS}칸을 넘었다`);
    }

    // ── **겹쳐 쌓인 것은 하나만** — 뭉텅이째 넣으면 세 칸이라는 상한이 다트 30개로 뚫린다
    {
        const s0 = newGame(305);
        standAtCamp(s0);
        const darts = makeItem("weapon", "dart", 940, -1, -1, 10);
        give(s0, darts, "y");

        const s1 = run(s0, { t: "stash", letter: "y" });
        assert.equal(s1.heroes[0].chest[0].count, 1, "겹쳐 쌓인 것을 뭉텅이째 맡겼다");
        const left = s1.heroes[0].pack.find((p) => p.type === "dart");
        assert.equal(left?.count, 9, "하나를 맡겼는데 배낭의 개수가 안 맞는다");
    }

    // ── 저주받아 몸에 붙은 것은 못 맡긴다 — 상자가 저주를 떼는 뒷문이면 안 된다
    {
        const s0 = newGame(306);
        standAtCamp(s0);
        const bad = makeItem("armor", "leather", 950, -1, -1);
        bad.cursed = true;
        give(s0, bad, "y");

        const s1 = run(s0, { t: "wear", letter: "y" });
        standAtCamp(s1);
        const s2 = run(s1, { t: "stash", letter: "y" });
        assert.equal(s2.heroes[0].chest.length, 0, "저주받아 입고 있는 갑옷이 상자로 들어갔다");
    }
});

test("캠프 상자는 판을 넘어 남고, 번호를 다시 받는다", () => {
    // ── 지난 판의 상자를 들고 새 판을 연다
    {
        const chest: Item[] = [
            { ...makeItem("weapon", "long sword", 7, -1, -1), plusHit: 5, plusDam: 5 },
            makeItem("potion", "extra healing", 8, -1, -1),
        ];
        const s = newGame(310, {}, {}, {}, {}, undefined, chest);

        assert.equal(s.heroes[0].chest.length, 2, "새 판이 상자를 안 이어받았다");
        assert.equal(s.heroes[0].chest[0].plusHit, 5, "맡긴 물건의 강화가 안 따라왔다");

        // **번호를 다시 받는다** — 지난 판의 `id` 를 그대로 쓰면 이 판의 물건과 겹치고,
        // `takeFromPack` 이 `id` 로 찾으므로 엉뚱한 것이 사라진다.
        const ids = new Set(s.heroes[0].chest.map((it) => it.id));
        assert.ok(!ids.has(7) && !ids.has(8), "지난 판의 번호를 그대로 들고 왔다");
        for (const it of s.heroes[0].chest) {
            assert.ok(it.id < s.nextItemId, "상자의 번호가 이 판의 번호표 밖이다 — 곧 겹친다");
        }
        // 이 판이 이미 빚어 놓은 것들과도 안 겹쳐야 한다
        const floor = s.level.items.map((it) => it.id);
        for (const it of s.heroes[0].chest) {
            assert.ok(!floor.includes(it.id), "상자의 번호가 바닥의 물건과 겹친다");
        }
    }

    // ── 칸 수 상한은 **받는 쪽에서도** 자른다 (저장소는 남이 고칠 수 있는 파일이다)
    {
        const many = Array.from({ length: CHEST_SLOTS + 4 }, (_, i) =>
            makeItem("potion", "healing", 100 + i, -1, -1),
        );
        const s = newGame(311, {}, {}, {}, {}, undefined, many);
        assert.equal(s.heroes[0].chest.length, CHEST_SLOTS, "저장소가 넘겨준 만큼 다 받았다");
    }

    // ── 저장했다 되읽어도 상자가 그대로다 (온라인의 `init` 이 이 길로 간다)
    {
        const s0 = newGame(312);
        standAtCamp(s0);
        give(s0, makeItem("wand", "digging", 960, -1, -1), "y");
        const s1 = run(s0, { t: "stash", letter: "y" });

        const back = deserialize(serialize(s1));
        assert.ok(back, "되읽기가 실패했다");
        assert.equal(back!.heroes[0].chest.length, 1, "되읽으니 상자가 비었다");
        assert.equal(back!.heroes[0].chest[0].type, "digging");
    }

    // ── **옛 저장에는 상자 칸이 없다** — 안 채우면 모루에 서는 순간 터진다
    {
        const s0 = newGame(313);
        const raw = JSON.parse(serialize(s0));
        for (const h of raw.heroes) delete h.chest;
        const back = deserialize(JSON.stringify(raw));
        assert.ok(back, "상자 칸이 없는 옛 저장을 못 읽었다");
        assert.deepEqual(back!.heroes[0].chest, [], "빈 칸을 안 채웠다 — 캠프에 서는 순간 undefined 를 읽는다");

        // 실제로 캠프까지 걸어가 본다 — 「불러와지긴 하는데 서면 터진다」가 없어야 한다.
        standAtCamp(back!);
        give(back!, makeItem("potion", "healing", 970, -1, -1), "y");
        const played = run(back!, { t: "stash", letter: "y" });
        assert.equal(played.heroes[0].chest.length, 1);
    }
});

test("상자는 사람마다 따로다 — 둘이서 해도 섞이지 않는다", () => {
    // ── 동료는 **제 상자**를 들고 온다
    {
        const mine: Item[] = [makeItem("weapon", "two handed sword", 20, -1, -1)];
        const theirs: Item[] = [makeItem("armor", "plate mail", 21, -1, -1)];
        const s0 = newGame(320, {}, {}, {}, {}, undefined, mine);
        const s1 = joinGame(s0, "rogue", "동료", theirs);

        assert.equal(s1.heroes[0].chest.length, 1);
        assert.equal(s1.heroes[1].chest.length, 1);
        assert.equal(s1.heroes[0].chest[0].type, "two handed sword", "방장의 상자가 동료 것으로 덮였다");
        assert.equal(s1.heroes[1].chest[0].type, "plate mail", "동료가 제 상자를 못 들고 왔다");
        // 번호는 둘 다 이 판의 것이어야 한다 — 겹치면 한쪽을 버릴 때 다른 쪽이 사라진다
        assert.notEqual(s1.heroes[0].chest[0].id, s1.heroes[1].chest[0].id, "두 사람의 상자가 같은 번호를 쓴다");
    }

    // ── 동료가 맡긴 것은 **동료의 상자**로 간다 (`who` 를 안 보면 방장 것으로 들어간다)
    {
        const s0 = joinGame(newGame(321), "rogue", "동료");
        standAtCamp(s0, 1);
        give(s0, makeItem("potion", "healing", 980, -1, -1), "y", 1);

        const s1 = run(s0, { t: "stash", letter: "y", who: 1 });
        assert.equal(s1.heroes[1].chest.length, 1, "동료가 맡긴 것이 동료 상자에 없다");
        assert.equal(s1.heroes[0].chest.length, 0, "동료가 맡겼는데 방장 상자로 들어갔다");
    }

    // ── 돌아온 동료의 상자는 **이 판에서 굴러간 것**이라 지난 판 값으로 안 덮는다
    {
        const s0 = joinGame(newGame(322), "rogue", "동료");
        standAtCamp(s0, 1);
        give(s0, makeItem("potion", "healing", 990, -1, -1), "y", 1);
        const s1 = run(s0, { t: "stash", letter: "y", who: 1 });
        // 동료를 내보냈다 부른다 — `leaveGame` 은 그 사람을 `benched` 에 둔다.
        const s2 = joinGame(leaveGame(s1), "rogue", "동료", [makeItem("food", "food ration", 991, -1, -1)]);
        assert.equal(s2.heroes[1].chest.length, 1);
        assert.equal(s2.heroes[1].chest[0].kind, "potion", "돌아온 동료의 상자가 지난 판 값으로 덮였다");
    }
});

test("setChest — 저장소가 참이다", () => {
    // 한 사람이 판을 둘 들고 있을 수 있다(제 판을 세워 두고 남의 방에 손님으로). 되읽을 때
    // 저장소 쪽에 맞추지 않으면, 손님으로 노는 동안 맡긴 것이 조용히 사라진다.
    const s0 = newGame(330);
    const later: Item[] = [makeItem("scroll", "identify", 40, -1, -1)];
    const s1 = setChest(s0, 0, later);

    assert.equal(s1.heroes[0].chest.length, 1);
    assert.equal(s1.heroes[0].chest[0].type, "identify");
    assert.notEqual(s1.heroes[0].chest[0].id, 40, "맞출 때도 번호를 다시 매겨야 한다");
    // 없는 사람에게 부르면 아무 일도 안 난다
    assert.equal(setChest(s1, 5, later).heroes.length, 1);
});
