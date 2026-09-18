// 협동 — **한 던전에 둘.**
//
// 아직 화면도 전송도 없다. 여기서 거는 것은 **엔진이 둘을 갈라 보는가** 하나다.
//
//   ① **명령은 누가 하는지를 데리고 다닌다**(`Command.who`). 없으면 방장(`heroes[0]`)이라,
//      단독 플레이의 옛 명령이 한 글자도 안 바뀌고 그대로 돈다.
//   ② **값은 사람마다 따로, 시계는 하나다.** 배고픔·재생·상태이상을 **각자** 들지만
//      (반지도 제 것이 제 배를 곯린다) **누가 움직이든** 한 칸씩 돈다. 움직인 사람만
//      치르게 하면 **가만히 있는 사람이 공짜**가 된다 — 굶지도 불타지도 않는다.
//   ③ **세상에 붙은 것도 누가 움직이든 돈다** — 몬스터는 **누가 움직이든 한 칸** 따라
//      움직이고, `turn` 도 같이 간다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { joinGame, newGame, perform } from "@/lib/rogue/game";
import { Rng } from "@/lib/rogue/rng";
import { spawnMonster } from "@/lib/rogue/monsters";
import { isVisible } from "@/lib/rogue/fov";
import { addToPack } from "@/lib/rogue/hero";
import { makeItem } from "@/lib/rogue/items";
import { T, idx, walkable, type GameState, type Tile } from "@/lib/rogue/types";

/** 손님 하나를 들인 판. */
function withGuest(seed: number): GameState {
    return joinGame(newGame(seed));
}

test("손님은 방장 곁에 선다 — 턴을 안 쓰고, 아는 것은 같이 든다", () => {
    // ── 곁에 선다 (층 아무 데나가 아니다)
    {
        const s = withGuest(4201);
        const [host, guest] = s.heroes;
        assert.equal(s.heroes.length, 2, "손님이 안 들어왔다");
        assert.ok(
            Math.abs(guest.x - host.x) <= 1 && Math.abs(guest.y - host.y) <= 1,
            `손님이 방장에게서 멀리 섰다 (${host.x},${host.y}) vs (${guest.x},${guest.y})`,
        );
        assert.ok(
            walkable(s.level.tiles[idx(guest.x, guest.y)] as Tile),
            "손님이 바위 속에 박혔다",
        );
        assert.ok(!(guest.x === host.x && guest.y === host.y), "둘이 한 칸에 겹쳤다");
    }

    // ── 합류는 **턴을 안 쓴다** — 세상을 바꾸는 행동이 아니다
    {
        const solo = newGame(4202);
        const t0 = solo.turn;
        const foodBefore = solo.heroes[0].food;
        const s = joinGame(solo);
        assert.equal(s.turn, t0, "합류했다고 턴이 갔다");
        assert.equal(s.heroes[0].food, foodBefore, "합류했다고 방장이 굶었다");
    }

    // ── 아는 것은 **파티가 같이 든다** — 고서 연구자가 들어오면 둘 다 주문서를 안다
    {
        const s = newGame(4203, {}, {}, {}, {}, "knight");
        assert.ok(!s.known["scroll:teleport"], "기사가 시작부터 주문서를 안다");
        const both = joinGame(s, "scholar");
        assert.ok(both.known["scroll:teleport"], "고서 연구자가 왔는데 주문서를 여전히 모른다");
    }
});

test("명령은 누가 하는지를 데리고 다닌다 — 행동은 그 사람만, 시계는 같이 돈다", () => {
    // ── `who` 가 없으면 방장이 행동한다 (단독 플레이의 옛 명령이 그대로 돈다)
    {
        const s = withGuest(4001);
        const [host, guest] = s.heroes;
        // 「쉰다」는 기사에게 철벽 자세를 준다 — **행동한 사람에게만** 선다.
        perform(s, { t: "rest" });
        assert.equal(host.guarded, true, "who 를 안 줬는데 방장이 행동을 안 했다");
        assert.equal(guest.guarded, false, "who 를 안 줬는데 손님이 행동했다");
    }

    // ── `who: 1` 이면 손님이 행동한다
    {
        const s = withGuest(4002);
        const [host, guest] = s.heroes;
        perform(s, { t: "rest", who: 1 });
        assert.equal(guest.guarded, true, "who: 1 인데 손님이 행동을 안 했다");
        assert.equal(host.guarded, false, "who: 1 인데 방장이 행동했다");
    }

    // ── 배고픔은 **각자 들되 누가 움직이든** 돈다
    {
        const s = withGuest(4003);
        const [host, guest] = s.heroes;
        const hostFood = host.food;
        const guestFood = guest.food;
        perform(s, { t: "rest", who: 1 });
        assert.ok(guest.food < guestFood, "손님이 쉬었는데 배가 안 고파졌다");
        assert.ok(
            host.food < hostFood,
            "손님이 움직이는 동안 방장이 안 굶었다 — 가만히 있으면 공짜가 된다",
        );
        // 값은 **따로** 든다 — 한 사람 것이 둘의 배를 같이 곯리면 안 된다.
        assert.notEqual(host.food, guestFood, "두 사람의 배고픔이 한 값을 쓰고 있다");
    }

    // ── 움직이는 것도 **그 사람만** 움직인다
    {
        const s = withGuest(4006);
        const [host, guest] = s.heroes;
        const hostAt = { x: host.x, y: host.y };
        const dir = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ].find(
            ([dx, dy]) =>
                walkable(s.level.tiles[idx(guest.x + dx, guest.y + dy)] as Tile) &&
                !(guest.x + dx === host.x && guest.y + dy === host.y),
        );
        assert.ok(dir, "손님이 갈 곳이 없다");
        s.level.monsters = [];
        perform(s, { t: "move", dx: dir![0], dy: dir![1], who: 1 });
        assert.equal(host.x, hostAt.x, "손님이 걸었는데 방장이 움직였다");
        assert.equal(host.y, hostAt.y, "손님이 걸었는데 방장이 움직였다");
    }
});

test("시야는 합쳐서 본다 — 눈먼 사람이 파티를 눈멀게 하지 않는다", () => {
    // ── 손님이 선 자리도 보인다 — 방장이 움직여도
    {
        const s = withGuest(4101);
        const [host, guest] = s.heroes;
        // 손님을 방장에게서 멀리, 걸어 들어갈 수 있는 칸으로 옮긴다.
        const far = s.level.rooms
            .filter((r) => !r.gone)
            .map((r) => ({ x: r.x + 1, y: r.y + 1 }))
            .find((p) => Math.abs(p.x - host.x) + Math.abs(p.y - host.y) > 12);
        assert.ok(far, "멀찍이 세울 방이 없다");
        guest.x = far!.x;
        guest.y = far!.y;

        s.level.monsters = [];
        perform(s, { t: "rest" }); // **방장**이 움직인다
        assert.ok(
            isVisible(s.level, guest.x, guest.y),
            "방장이 움직였더니 손님이 선 자리가 안 보인다 — 시야가 합쳐지지 않았다",
        );
        assert.ok(isVisible(s.level, host.x, host.y), "방장이 선 자리가 안 보인다");
    }

    // ── 한 사람이 눈멀어도 **성한 사람이 보는 것은 그대로 보인다**
    {
        const s = withGuest(4102);
        const [host, guest] = s.heroes;
        s.level.monsters = [];

        perform(s, { t: "rest" });
        const litBefore = [...s.level.flags].filter((f) => f & 2).length;

        host.blind = 5; // 방장만 눈이 먼다
        perform(s, { t: "rest" });
        const litAfter = [...s.level.flags].filter((f) => f & 2).length;

        assert.ok(
            isVisible(s.level, guest.x, guest.y),
            "한 사람이 눈멀었다고 성한 사람 자리까지 안 보인다",
        );
        assert.ok(litAfter > 1, `눈먼 사람 하나가 판 전체를 껐다 (${litBefore} → ${litAfter})`);
    }

    // ── 눈이 멀면 **제 발밑은** 보인다 (그리고 탐지가 꺼진다)
    {
        const s = withGuest(4103);
        const host = s.heroes[0];
        s.level.monsters = [];
        host.blind = 5;
        host.detect = 5;
        perform(s, { t: "rest" });
        assert.ok(isVisible(s.level, host.x, host.y), "눈이 멀었는데 발밑도 안 보인다");
        assert.equal(host.detect, 0, "눈이 멀었는데 탐지가 살아 있다");
    }
});

/** 방장·손님 사이에 깨어 있는 놈 하나를 세운다 — 둘 다에게서 두 칸 밖. */
function withMonster(seed: number) {
    const s = withGuest(seed);
    const [host, guest] = s.heroes;
    // 둘을 한 줄에 나란히 놓고, 그 줄을 따라 몬스터가 걸어올 길을 낸다.
    guest.x = host.x;
    guest.y = host.y + 1;
    for (let n = 0; n <= 6; n++) {
        s.level.tiles[idx(host.x + n, host.y)] = T.FLOOR;
        s.level.tiles[idx(host.x + n, host.y + 1)] = T.FLOOR;
    }
    const m = spawnMonster("Z", host.x + 5, host.y, new Rng(seed));
    m.awake = true;
    m.hp = 60;
    m.maxHp = 60;
    s.level.monsters = [m];
    return { s, host, guest, m };
}

test("몬스터는 마지막에 때린 쪽을 쫓는다", () => {
    // ── 손님이 때리면 어그로가 손님에게 옮는다
    {
        const { s, guest, m } = withMonster(4301);
        assert.equal(m.target, undefined, "때리기 전부터 목표가 있다");

        // 손님이 닿을 수 있게 붙여 놓고 때린다.
        guest.x = m.x - 1;
        guest.y = m.y;
        perform(s, { t: "move", dx: 1, dy: 0, who: 1 });
        assert.equal(m.target, 1, "손님이 때렸는데 어그로가 안 옮았다");
    }

    // ── 지팡이로 때려도 옮는다 — 뒤에서 쏘는 사람이 무적이면 안 된다
    {
        const { s, guest, m } = withMonster(4302);
        const wand = makeItem("wand", "magic missile", 950, -1, -1);
        wand.charges = 5;
        // **글자는 `addToPack` 이 매긴다** — 손으로 박아 두면 덮인다.
        addToPack(guest, wand);
        guest.x = m.x - 3;
        guest.y = m.y;
        perform(s, { t: "zap", letter: wand.letter!, dx: 1, dy: 0, who: 1 });
        assert.equal(m.target, 1, "지팡이로 때렸는데 어그로가 안 옮았다");
    }

    // ── 쫓아가는 것도 목표 쪽으로 간다
    {
        const { s, host, guest, m } = withMonster(4303);
        m.target = 1; // 손님을 쫓는 중
        const before = Math.abs(m.y - guest.y) + Math.abs(m.x - guest.x);
        perform(s, { t: "rest" }); // **방장**이 움직여도
        const after = Math.abs(m.y - guest.y) + Math.abs(m.x - guest.x);
        assert.ok(after < before, `손님을 쫓기로 했는데 안 다가왔다 (${before} → ${after})`);
        assert.equal(m.target, 1, "쫓는 사이에 목표가 바뀌었다");
        assert.ok(host.hp === host.maxHp, "손님을 쫓는 놈이 방장을 때렸다");
    }

    // ── 목표가 쓰러지면 어그로를 풀고 성한 사람에게 간다
    {
        const { s, guest, m } = withMonster(4304);
        const host = s.heroes[0];
        // **몬스터 너머**에 눕힌다. 곁에 눕히면 어느 쪽을 쫓든 방장과의 거리가 줄어서
        // 테스트가 아무것도 안 가른다 — 되돌려 보고 알았다.
        guest.x = m.x + 1;
        guest.y = m.y;
        m.target = 1;
        guest.hp = 0; // 손님이 쓰러졌다
        const before = Math.abs(m.x - host.x) + Math.abs(m.y - host.y);
        perform(s, { t: "rest" });
        const after = Math.abs(m.x - host.x) + Math.abs(m.y - host.y);
        assert.ok(
            after < before,
            `쓰러진 사람을 계속 쫓는다 — 살아남은 쪽이 아무것도 못 한다 (${before} → ${after})`,
        );
    }
});

test("몬스터는 누가 움직이든 따라 움직인다", () => {
    // ── 손님이 움직여도 몬스터는 한 칸 다가온다 — 세상 시계는 하나다
    {
        const s = withGuest(4004);
        const guest = s.heroes[1];

        // 손님에게서 멀찍이, 걸어올 수 있는 칸에 한 마리를 세운다.
        const mx = guest.x + 3;
        const my = guest.y;
        for (let n = 1; n <= 3; n++) s.level.tiles[idx(guest.x + n, guest.y)] = T.FLOOR;
        const m = spawnMonster("Z", mx, my, new Rng(7));
        m.awake = true;
        m.hp = 20;
        s.level.monsters = [m];

        const before = Math.abs(m.x - guest.x);
        perform(s, { t: "rest", who: 1 });
        assert.ok(
            Math.abs(m.x - guest.x) < before,
            `손님이 움직였는데 몬스터가 안 따라왔다 (${before} → ${Math.abs(m.x - guest.x)})`,
        );
    }

    // ── 턴은 누가 움직이든 간다
    {
        const s = withGuest(4005);
        const t0 = s.turn;
        perform(s, { t: "rest", who: 1 });
        assert.equal(s.turn, t0 + 1, "손님이 움직였는데 턴이 안 갔다");
        perform(s, { t: "rest" });
        assert.equal(s.turn, t0 + 2, "방장이 움직였는데 턴이 안 갔다");
    }
});

test("쓰러져도 판은 안 끝난다 — 살아서 층을 넘으면 일어난다", () => {
    // ── 혼자면 그대로 끝이다 (단독 플레이의 규칙은 안 바뀐다)
    {
        const s = newGame(4401);
        s.heroes[0].hp = 1;
        s.heroes[0].burnTurns = 3; // 화상은 턴마다 정확히 2 — 굴림에 안 기댄다
        const after = perform(s, { t: "rest" });
        assert.equal(after.phase, "dead", "혼자 쓰러졌는데 판이 안 끝났다");
    }

    // ── 둘이면 **쓰러질 뿐**이고 판은 돈다
    {
        const s = withGuest(4402);
        const [, guest] = s.heroes;
        guest.hp = 1;
        guest.burnTurns = 3;
        perform(s, { t: "rest" }); // 방장이 움직인다
        assert.equal(s.phase, "playing", "한 명 쓰러졌다고 판이 끝났다");
        assert.equal(guest.hp, 0, "쓰러진 사람의 체력이 0 이 아니다");
        assert.ok(
            s.messages.some((m) => m.includes("동료가 쓰러졌다")),
            "쓰러진 것을 안 알려 준다",
        );
    }

    // ── 쓰러진 사람은 **못 움직이고 배도 안 고프다**
    {
        const s = withGuest(4403);
        const [host, guest] = s.heroes;
        guest.hp = 0;
        const at = { x: guest.x, y: guest.y };
        const food = guest.food;

        const blocked = perform(s, { t: "rest", who: 1 });
        assert.equal(blocked.turn, s.turn, "쓰러진 사람이 턴을 썼다");

        perform(s, { t: "rest" }); // 방장이 움직인다
        assert.equal(guest.x, at.x, "쓰러진 사람이 움직였다");
        assert.equal(guest.food, food, "누워 있는 사람이 굶는다 — 살릴 길이 없어진다");
        assert.ok(host.food < food, "방장은 굶어야 한다");
    }

    // ── 살아남은 사람이 **더 깊은 층에 닿으면** 최대 체력 1/4 로 일어난다
    {
        const s = withGuest(4404);
        const [host, guest] = s.heroes;
        guest.hp = 0;
        // 방장을 계단에 세우고 내려간다.
        host.x = s.level.stairs.x;
        host.y = s.level.stairs.y;
        const after = perform(s, { t: "descend" });
        assert.equal(after.level.depth, 2, "안 내려갔다");
        assert.equal(
            after.heroes[1].hp,
            Math.max(1, Math.floor(after.heroes[1].maxHp / 4)),
            "층을 넘었는데 동료가 안 일어났다",
        );
        // **업고 간다** — 두고 가면 살릴 길이 없다. 다만 한 칸에 겹치지 않고 **곁에** 선다.
        const [a, b] = after.heroes;
        assert.equal(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)), 1, "쓰러진 동료를 두고 갔거나 한 칸에 겹쳤다");
    }

    // ── **올라갈 때는 안 일어난다** — 오르내리기만으로 살리면 부활이 공짜가 된다
    {
        const s = withGuest(4415);
        const host = s.heroes[0];
        host.x = s.level.stairs.x;
        host.y = s.level.stairs.y;
        const down = perform(s, { t: "descend" }); // 둘 다 살아서 2층
        down.heroes[1].hp = 0;
        const up = down.level.upStairs!;
        down.heroes[0].x = up.x;
        down.heroes[0].y = up.y;
        const back = perform(down, { t: "ascend" });
        assert.equal(back.level.depth, 1, "안 올라갔다");
        assert.equal(back.heroes[1].hp, 0, "올라갔는데 일어났다");
    }

    // ── 둘 다 쓰러지면 끝이다
    {
        const s = withGuest(4405);
        const [host, guest] = s.heroes;
        guest.hp = 0;
        host.hp = 1;
        host.burnTurns = 3;
        const after = perform(s, { t: "rest" });
        assert.equal(after.phase, "dead", "둘 다 쓰러졌는데 판이 안 끝났다");
    }
});

test("온라인 — 직렬화해 넘긴 판에 같은 명령을 같은 순서로 주면 같은 판이 된다", async () => {
    const { serialize, deserialize } = await import("@/lib/rogue/storage");
    let host = withGuest(4242);
    let guest = deserialize(serialize(host))!;
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1]];
    for (let i = 0; i < 300; i++) {
        const [dx, dy] = dirs[(i * 7) % dirs.length];
        const cmd = i % 5 === 4 ? { t: "search" as const, who: i % 2 } : { t: "move" as const, dx, dy, who: i % 2 };
        host = perform(host, cmd);
        guest = perform(guest, cmd);
    }
    // 키 순서는 다를 수 있다(되읽은 판에 `v` 가 붙는다) — 내용을 본다.
    assert.deepEqual(JSON.parse(serialize(guest)), JSON.parse(serialize(host)));
});

test("영웅은 한 칸에 둘이 안 선다 — 걸어서 부딪히면 자리를 바꾼다", () => {
    const s = withGuest(4406);
    const [host, guest] = s.heroes;
    assert.ok(host.x !== guest.x || host.y !== guest.y, "합류하자마자 겹쳤다");
    const hx = host.x, hy = host.y, gx = guest.x, gy = guest.y;
    const after = perform(s, { t: "move", dx: gx - hx, dy: gy - hy, who: 0 });
    const [h, g] = after.heroes;
    // 대각선이 문턱에 막히는 자리면 안 움직인다 — 그때도 겹치지는 않는다.
    assert.ok(h.x !== g.x || h.y !== g.y, "걸어서 겹쳤다");
    if (h.x === gx && h.y === gy) assert.deepEqual([g.x, g.y], [hx, hy], "자리를 안 바꿨다");
});

test("동료가 읽는 강화 주문서는 동료의 배낭에서 찾는다", async () => {
    const { scrollTargetKinds, enchantScrollKind } = await import("@/lib/rogue/game");
    const s = withGuest(4407);
    const guest = s.heroes[1];
    const scroll = makeItem("scroll", "enchant weapon", s.nextItemId++, 0, 0);
    addToPack(guest, scroll);
    // **정체를 아는 주문서라야 고르기가 뜬다** — 여기서 가리려는 것은 「누구의 배낭에서
    // 찾느냐」지 감정이 아니다.
    s.known["scroll:enchant weapon"] = true;
    assert.ok(!s.heroes[0].pack.some((p) => p.letter === scroll.letter && p.kind === "scroll"), "방장 배낭에 같은 글자의 주문서가 있으면 이 테스트가 아무것도 못 가린다");
    assert.deepEqual(scrollTargetKinds(s, scroll.letter!, 1), ["weapon"]);
    assert.equal(enchantScrollKind(s, scroll.letter!, 1), "plain");
});

test("한 명만 계단을 눌러도 파티가 함께 옮긴다", () => {
    const s = withGuest(4408);
    const host = s.heroes[0];
    host.x = s.level.stairs.x;
    host.y = s.level.stairs.y;
    const after = perform(s, { t: "descend", who: 0 });
    assert.equal(after.level.depth, 2, "동료를 기다렸다");
    const [a, b] = after.heroes;
    assert.equal(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)), 1, "동료가 같이 안 왔다");
});

test("동료는 제 출신(직업)으로 합류한다", () => {
    const s = joinGame(newGame(4409), "rogue");
    assert.equal(s.heroes[1].origin, "rogue");
    assert.equal(s.heroes[0].origin, "knight", "방장의 직업이 바뀌었다");
});

test("동료를 보내면 다시 혼자다 — 몬스터의 어그로도 떠난 자리를 안 가리킨다", async () => {
    const { leaveGame } = await import("@/lib/rogue/game");
    const s = withGuest(4410);
    const m = spawnMonster("K", 1, 1, new Rng(1));
    m.target = 1;
    s.level.monsters.push(m);
    const solo = leaveGame(s);
    assert.equal(solo.heroes.length, 1);
    assert.equal(m.target, undefined, "떠난 동료를 계속 쫓는다");
    // 혼자 돌아온 판은 걸어도 안 터진다
    const walked = perform(solo, { t: "rest" });
    assert.equal(walked.phase, "playing");

    // ── 방장이 쓰러져 있으면 못 보낸다
    const t = withGuest(4411);
    t.heroes[0].hp = 0;
    assert.equal(leaveGame(t).heroes.length, 2);
});

test("보낸 동료는 그 판 안에서 직업·배낭 그대로 돌아온다 — 새 판에는 없다", async () => {
    const { leaveGame } = await import("@/lib/rogue/game");
    const { serialize, deserialize } = await import("@/lib/rogue/storage");
    const s = joinGame(newGame(4412), "alchemist");
    const mate = s.heroes[1];
    mate.level = 5;
    const packIds = mate.pack.map((p) => p.id);

    // 보낸 채로 저장했다 되읽어도 남는다
    const away = deserialize(serialize(leaveGame(s)))!;
    assert.equal(away.heroes.length, 1);
    assert.ok(away.benched, "보낸 동료를 저장이 잃었다");

    // 다시 부르면 고른 직업은 무시하고 그 사람이 온다
    const back = joinGame(away, "knight");
    const b = back.heroes[1];
    assert.equal(b.origin, "alchemist", "직업이 바뀌었다");
    assert.equal(b.level, 5, "레벨을 잃었다");
    assert.deepEqual(b.pack.map((p) => p.id), packIds, "배낭을 잃었다");
    assert.equal(back.benched, undefined, "돌아왔는데 대기석에도 남았다");
    const [h] = back.heroes;
    assert.ok(h.x !== b.x || h.y !== b.y, "돌아와서 방장과 겹쳤다");

    // 새 판에는 없다
    assert.equal(newGame(4413).benched, undefined);
});

test("쓰러진 사람은 지도에 † 로 그린다", async () => {
    const { glyphAt } = await import("@/lib/rogue/game");
    const s = withGuest(4414);
    const [host, guest] = s.heroes;
    assert.equal(glyphAt(s, guest.x, guest.y, 0)?.ch, "@");
    guest.hp = 0;
    assert.equal(glyphAt(s, guest.x, guest.y, 0)?.ch, "†", "동료 쪽에서 본 쓰러진 동료");
    assert.equal(glyphAt(s, guest.x, guest.y, 1)?.ch, "†", "제 자리에서 본 쓰러진 나");
    assert.equal(glyphAt(s, host.x, host.y, 1)?.ch, "@");
});

test("협동의 기록은 누가 한 일인지 앞머리를 단다 — 혼자면 안 단다", () => {
    const s = withGuest(4416);
    const before = s.messages.length;
    s.heroes[1].origin = "knight";
    const after = perform(s, { t: "rest", who: 1 });
    const mine = after.messages.slice(before);
    assert.ok(mine.some((m) => m.startsWith("2P▸ ")), `동료의 말에 앞머리가 없다: ${JSON.stringify(mine)}`);
    assert.ok(!mine.some((m) => m.startsWith("1P▸ ")), "동료가 한 일에 1P 가 붙었다");

    const solo = newGame(4417);
    solo.heroes[0].origin = "knight";
    const n = solo.messages.length;
    assert.ok(!perform(solo, { t: "rest" }).messages.slice(n).some((m) => /^[12]P▸ /.test(m)), "혼자인데 앞머리가 붙었다");
});

test("곁에 선 동료에게 물건을 건넨다 — 멀면 못 주고 턴도 안 쓴다", () => {
    const s = withGuest(4418);
    const [host, guest] = s.heroes;
    // 겹쳐 쌓이는 물건은 **이미 있던 칸에 합쳐진다** — 받은 칸의 글자를 써야 한다.
    const food = addToPack(host, makeItem("food", "food ration", s.nextItemId++, 0, 0))!;
    const letter = food.letter!;

    // ── 멀리 있으면 못 준다 (턴도 안 쓴다)
    guest.x = host.x + 5;
    guest.y = host.y + 5;
    const turn = s.turn;
    const far = perform(s, { t: "give", letter, who: 0 });
    assert.ok(far.heroes[0].pack.some((p) => p.letter === letter), "멀리 있는데 건네졌다");
    assert.equal(far.turn, turn, "못 건넸는데 턴을 썼다");

    // ── 곁에 서면 건넨다
    far.heroes[1].x = far.heroes[0].x + 1;
    far.heroes[1].y = far.heroes[0].y;
    const near = perform(far, { t: "give", letter, who: 0 });
    assert.ok(!near.heroes[0].pack.some((p) => p.letter === letter), "내 배낭에 남았다");
    assert.ok(near.heroes[1].pack.some((p) => p.kind === "food"), "동료가 못 받았다");
});

test("점수는 파티가 모은 금화를 센다", async () => {
    const { score } = await import("@/lib/rogue/game");
    const s = withGuest(4419);
    s.heroes[0].gold = 100;
    s.heroes[1].gold = 50;
    const both = score(s);
    s.heroes[1].gold = 0;
    assert.equal(both - score(s), 50, "동료의 금화가 점수에서 빠졌다");
});

// 특수 공격은 **맞은 사람**에게 들어간다.
//
// `specialEffect` 가 `state.heroes[0]` 를 들고 있었다 — 몬스터가 쫓는 쪽(`monsterTarget`)은
// 제대로 골라 놓고, 갑옷을 녹이고 금화를 채고 배낭을 터는 자리에서만 **늘 방장**을 봤다.
// 손님이 아쿠에이터에게 맞으면 **방장의 갑옷이 녹는** 판이었고, 두 화면 어디에도 왜 그런지가
// 안 적힌다.
test("갑옷을 녹이는 것도 금화를 채는 것도 맞은 사람 몫이다", async () => {
    const { equippedArmor } = await import("@/lib/rogue/hero");

    /** 손님 옆에 그 몬스터를 붙여 세우고 한 대 맞힌다. 방장은 멀리 둔다. */
    const struck = (seed: number, ch: string) => {
        const s = withGuest(seed);
        const [host, guest] = s.heroes;
        // 방장을 멀찍이 옮긴다 — 몬스터가 손님을 치는 것이 분명해야 한다.
        for (let y = 1; y < 20 && Math.abs(host.x - guest.x) + Math.abs(host.y - guest.y) < 12; y++) {
            for (let x = 1; x < 70; x++) {
                if (!walkable(s.level.tiles[idx(x, y)] as Tile)) continue;
                if (Math.abs(x - guest.x) + Math.abs(y - guest.y) < 12) continue;
                host.x = x;
                host.y = y;
                break;
            }
        }
        const mx = guest.x + 1;
        s.level.tiles[idx(mx, guest.y)] = T.FLOOR;
        const m = spawnMonster(ch, mx, guest.y, new Rng(seed));
        m.hp = 999;
        m.maxHp = 999;
        m.awake = true;
        s.level.monsters = [m];
        return { s, host, guest };
    };

    // ── 아쿠에이터 — 손님의 갑옷이 녹고 방장 것은 멀쩡하다
    {
        let found = false;
        for (let n = 0; n < 40 && !found; n++) {
            const { s, host, guest } = struck(4600 + n, "A");
            const hostArm = equippedArmor(host);
            const guestArm = equippedArmor(guest);
            if (!hostArm || !guestArm) continue;
            hostArm.plusArmor = 0;
            guestArm.plusArmor = 0;
            guest.hp = 999;
            guest.maxHp = 999;
            perform(s, { t: "rest", who: 1 });
            if ((guestArm.plusArmor ?? 0) < 0) {
                found = true;
                assert.equal(hostArm.plusArmor ?? 0, 0, "손님이 맞았는데 방장의 갑옷이 녹았다");
            } else {
                assert.equal(hostArm.plusArmor ?? 0, 0, "아무도 안 맞았는데 방장의 갑옷이 녹았다");
            }
        }
        assert.ok(found, "마흔 번을 붙였는데 아쿠에이터가 한 번도 안 맞혔다");
    }

    // ── 레프러콘 — 손님의 금화를 챈다
    {
        let found = false;
        for (let n = 0; n < 40 && !found; n++) {
            const { s, host, guest } = struck(4700 + n, "L");
            host.gold = 500;
            guest.gold = 500;
            guest.hp = 999;
            guest.maxHp = 999;
            perform(s, { t: "rest", who: 1 });
            if (guest.gold < 500) {
                found = true;
                assert.equal(host.gold, 500, "손님이 맞았는데 방장의 금화가 없어졌다");
            } else {
                assert.equal(host.gold, 500, "아무도 안 맞았는데 방장의 금화가 없어졌다");
            }
        }
        assert.ok(found, "마흔 번을 붙였는데 레프러콘이 한 번도 안 채 갔다");
    }
});
