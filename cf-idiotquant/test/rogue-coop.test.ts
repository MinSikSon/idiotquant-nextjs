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
