// 협동 — **한 던전에 둘.**
//
// 아직 화면도 전송도 없다. 여기서 거는 것은 **엔진이 둘을 갈라 보는가** 하나다.
//
//   ① **명령은 누가 하는지를 데리고 다닌다**(`Command.who`). 없으면 방장(`heroes[0]`)이라,
//      단독 플레이의 옛 명령이 한 글자도 안 바뀌고 그대로 돈다.
//   ② **값은 사람마다 따로, 시계는 하나다.** 배고픔·재생·상태이상을 **각자** 들지만
//      (반지도 제 것이 제 배를 곯린다) **누가 움직이든** 한 칸씩 돈다. 움직인 사람만
//      치르게 하면 **가만히 있는 사람이 공짜**가 된다 — 굶지도 불타지도 않는다.
//   ③ **세상에 붙은 것도 누가 움직이든 돈다** — `turn` 은 누가 움직이든 간다. 다만
//      **적은 파티의 걸음에 맞춘다**: 서 있는 사람 수만큼 걸음이 모여야 한 번 움직인다.
//      걸음마다 따라오게 두면 둘일 때 적이 두 배로 빨라져, 동료를 부르는 것이 곧
//      세상을 두 배로 빠르게 만드는 일이 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { joinGame, newGame, perform } from "@/lib/rogue/game";
import { Rng } from "@/lib/rogue/rng";
import { spawnMonster } from "@/lib/rogue/monsters";
import { isVisible } from "@/lib/rogue/fov";
import { addToPack, packItem } from "@/lib/rogue/hero";
import { makeItem } from "@/lib/rogue/items";
import { T, idx, walkable, type GameState, type Hero, type Tile } from "@/lib/rogue/types";

/** 손님 하나를 들인 판. */
function withGuest(seed: number): GameState {
    return joinGame(newGame(seed));
}

/**
 * 파티가 **한 바퀴** 돈다 — 둘이 한 걸음씩.
 *
 * 적은 서 있는 사람 수만큼 걸음이 모여야 한 번 움직이므로, 「적이 한 번 움직였다」를
 * 보려면 한 사람만 굴려서는 안 된다.
 */
function partyRound(s: GameState) {
    for (let i = 0; i < s.heroes.length; i++) perform(s, { t: "rest", who: i });
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
        assert.equal(host.turns, 0, "방장이 안 한 행동까지 개인 턴에 셌다");
        assert.equal(guest.turns, 1, "손님이 쓴 행동이 개인 턴에 안 셌다");
        assert.equal(s.turn, 1, "개인 턴과 파티 전체 턴이 같은 행동을 안 셌다");
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

    // ── 허기 기록도 **누구의 배인가**를 적는다 — 방장(1P)을 빼면 같은 턴의 두 줄을 못 가른다.
    {
        const s = withGuest(4004);
        s.heroes[0].food = 301;
        s.heroes[1].food = 301;
        const after = perform(s, { t: "rest", who: 1 });
        assert.ok(after.messages.some((line) => /1P 시장해지기 시작했다/.test(line)), "방장(1P)의 허기 기록에 1P 표기가 없다");
        assert.ok(after.messages.some((line) => /2P 시장해지기 시작했다/.test(line)), "동료(2P)의 허기 기록에 2P 표기가 없다");
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
        partyRound(s); // **방장**이 움직여도 손님 쪽으로 간다
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
    // ── 한 바퀴가 돌면 몬스터가 한 칸 다가온다 — 손님이 움직인 걸음도 센다
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
        // **손님이 먼저 움직인다** — 그 한 걸음만으로는 아직 적의 차례가 아니다.
        perform(s, { t: "rest", who: 1 });
        assert.equal(
            Math.abs(m.x - guest.x),
            before,
            "한 사람만 움직였는데 적이 벌써 움직였다 — 둘이면 적이 두 배로 빨라진다",
        );
        perform(s, { t: "rest", who: 0 });
        assert.ok(
            Math.abs(m.x - guest.x) < before,
            `한 바퀴가 돌았는데 몬스터가 안 따라왔다 (${before} → ${Math.abs(m.x - guest.x)})`,
        );
    }

    // ── 혼자면 걸음마다 그대로 따라온다 — 단독 플레이의 박자는 안 바뀐다
    {
        const s = newGame(4006);
        const hero = s.heroes[0];
        for (let n = 1; n <= 3; n++) s.level.tiles[idx(hero.x + n, hero.y)] = T.FLOOR;
        const m = spawnMonster("Z", hero.x + 3, hero.y, new Rng(7));
        m.awake = true;
        m.hp = 20;
        s.level.monsters = [m];

        const before = Math.abs(m.x - hero.x);
        perform(s, { t: "rest" });
        assert.ok(
            Math.abs(m.x - hero.x) < before,
            `혼자인데 한 걸음에 몬스터가 안 따라왔다 (${before} → ${Math.abs(m.x - hero.x)})`,
        );
    }

    // ── 느린 놈도 결국 다가온다 — 격턴 판단이 **적이 움직인 횟수**를 본다
    //
    // `turn` 을 보면 둘일 때 「적이 도는 턴」이 늘 짝수라 격턴 놈은 **영영 한 칸도**
    // 못 움직인다. 둔화 지팡이를 맞은 놈이 그대로 굳어 버리는 자리다.
    {
        const s = withGuest(4008);
        const host = s.heroes[0];
        for (let n = 1; n <= 6; n++) s.level.tiles[idx(host.x + n, host.y)] = T.FLOOR;
        const m = spawnMonster("Z", host.x + 6, host.y, new Rng(7));
        m.awake = true;
        m.hp = 40;
        m.speed = -1; // 둔화
        s.level.monsters = [m];

        const before = Math.abs(m.x - host.x);
        for (let n = 0; n < 6; n++) partyRound(s);
        assert.ok(
            Math.abs(m.x - host.x) < before,
            `느린 놈이 여섯 바퀴 동안 한 칸도 못 움직였다 (${before} → ${Math.abs(m.x - host.x)})`,
        );
    }

    // ── 동료가 쓰러지면 남은 한 사람의 걸음마다 돈다 — 쓰러뜨려서 세상을 늦출 수는 없다
    {
        const s = withGuest(4007);
        const [host, guest] = s.heroes;
        guest.hp = 0;
        for (let n = 1; n <= 3; n++) s.level.tiles[idx(host.x + n, host.y)] = T.FLOOR;
        const m = spawnMonster("Z", host.x + 3, host.y, new Rng(7));
        m.awake = true;
        m.hp = 20;
        s.level.monsters = [m];

        const before = Math.abs(m.x - host.x);
        perform(s, { t: "rest" });
        assert.ok(
            Math.abs(m.x - host.x) < before,
            `혼자 남았는데 적이 반 박자로 움직인다 (${before} → ${Math.abs(m.x - host.x)})`,
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

    // ── **굶어 쓰러진 사람도 층을 넘으면 일어난다** — 그리고 다음 걸음에 도로 안 쓰러진다
    //
    // 체력만 채워 주면 `food` 가 죽음선(`-200`) 아래 그대로라 `tickHunger` 가 그 자리에서
    // 도로 눕힌다. 화면에는 「숨을 되찾았다」가 뜨고 한 걸음 뒤에 다시 쓰러지므로,
    // 살린 것이 아니라 **한 턴을 빌려준 것**이 된다.
    {
        const s = withGuest(4406);
        const [host, guest] = s.heroes;
        // **굶겨서 눕힌다** — 손으로 `hp = 0` 을 박으면 비문(`epitaph`)이 안 서서,
        // 아래의 「비문이 남아 있다」가 아무것도 안 가린다(되돌려 보고 알았다).
        guest.food = -199;
        const fell = perform(s, { t: "rest" }); // 방장이 움직인다 — 배는 둘 다 돈다
        assert.equal(guest.hp, 0, "죽음선을 넘겼는데 안 쓰러졌다");
        assert.equal(fell.epitaph, "굶어 죽었다.", "굶어 쓰러졌는데 까닭이 안 적혔다");

        host.x = fell.level.stairs.x;
        host.y = fell.level.stairs.y;
        const after = perform(fell, { t: "descend" });
        const up = after.heroes[1];
        assert.ok(up.hp > 0, "굶어 쓰러진 동료가 층을 넘고도 안 일어났다");
        assert.ok(up.food > -200, `일으켰는데 배가 죽음선 아래 그대로다 (${up.food})`);

        // **다음 걸음**에도 서 있어야 한다 — 여기가 「빌려준 한 턴」이 드러나는 자리다.
        const next = perform(after, { t: "rest" });
        assert.ok(next.heroes[1].hp > 0, "일어난 동료가 한 걸음 만에 도로 굶어 쓰러졌다");
        assert.equal(next.phase, "playing", "일어나자마자 판이 끝났다");

        // 「굶어 죽었다」는 일어난 사람의 비문이 아니다.
        assert.equal(after.epitaph, "", "일어났는데 굶어 죽었다는 비문이 남아 있다");

        // 그래도 **먹은 것은 아니다** — 여전히 굶주린 채로 선다.
        assert.ok(up.food < 150, `일으키면서 배까지 채워 줬다 (${up.food})`);
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

// 입이 둘이면 배도 두 배로 곯는다(`finishTurn` 이 사람마다 `tickHunger` 를 돌린다).
// 그런데 떨어지는 식량이 그대로면 **굶어 죽는 까닭이 판단이 아니라 인원수**가 된다.
// 식량 가중치를 키우는 대신, 추가 입의 몫은 일반 드롭과 별도로 둔다. 그래야 무기·방어구
// 같은 기존 분류가 식량에 밀려나지 않는다.
test("입이 늘면 식량도 는다", async () => {
    /** 그 판으로 `floors` 층을 내려가며 바닥에 놓인 식량을 센다. */
    const foods = (seed: number, duo: boolean, floors: number): number => {
        let s: GameState = duo ? joinGame(newGame(seed)) : newGame(seed);
        let n = 0;
        for (let d = 0; d < floors; d++) {
            n += s.level.items.filter((it) => it.kind === "food").length;
            // 재려는 것은 **뿌려지는 양**이다 — 도중에 맞아 죽거나 굶으면 그게 안 잡힌다.
            s.level.monsters = [];
            for (const h of s.heroes) {
                h.x = s.level.stairs.x;
                h.y = s.level.stairs.y;
                h.hp = h.maxHp;
                h.food = 2000;
            }
            s = perform(s, { t: "descend" });
        }
        return n;
    };

    let solo = 0;
    let duo = 0;
    for (let seed = 1; seed <= 120; seed++) {
        solo += foods(seed, false, 8);
        duo += foods(seed, true, 8);
    }
    assert.ok(solo > 0 && duo > 0, "아무 층에도 식량이 안 떨어졌다 — 자가 고장 났다");
    // **필요한 것은 2배다** — 사람마다 배고픔 시계가 따로 돈다. 1.9배는 그 밑으로
    // 떨어졌는지만 거른다(정확히 2.0을 걸면 반올림 오차로 깨질 자리를 만든다).
    assert.ok(
        duo >= solo * 1.9,
        `둘인데 필요한 만큼(2배) 안 떨어진다 (혼자 ${solo} · 둘 ${duo} = ${(duo / solo).toFixed(2)}배)`,
    );
    // 일반 드롭 통은 파티 인원과 무관하다. 식량을 늘리려고 여기의 분류 확률을 바꾸면
    // 무기·방어구도 같이 깎인다.
    const source = await import("node:fs/promises");
    const game = await source.readFile(new URL("../lib/rogue/game.ts", import.meta.url), "utf8");
    assert.match(game, /pickCategory\(level\.depth, rng, scale, bias\)/, "식량이 일반 아이템 분류 확률을 밀어낸다");
    assert.match(game, /itemSpots\(level, extraFood, rng, avoid, sp \? sp\.room : null\)[\s\S]*?makeItem\("food", "food ration"/, "추가 입의 식량을 별도로 놓지 않는다");
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

// 이름은 **온라인에서 남이 보내 오는 값**이고, 받는 쪽은 그것을 지도 한 칸에 그대로 그린다.
// 그래서 다듬는 자리(`cleanNick`)가 **하나여야** 하고, 보내는 쪽이 아니라 **받는 쪽**에 있어야
// 한다 — 보내는 쪽에만 두면 고친 화면이 안 고친 화면에게 아무 문자열이나 먹일 수 있다.
test("지도에 적는 이름은 넉 칸 한글·영문·기호로 다듬는다", async () => {
    const { cleanNick, setNick, NICK_MAX } = await import("@/lib/rogue/game");

    // ── 길이·글자
    {
        assert.equal(NICK_MAX, 4, "2×2 로 그리는 자리라 넉 자다");
        assert.equal(cleanNick("mson"), "MSON", "소문자를 대문자로 안 올린다 — 지도에서 글자가 안 갈린다");
        assert.equal(cleanNick("MinSikSon"), "MINS", "넉 칸을 넘겨 받는다 — 한 칸에 그릴 데가 없다");
        assert.equal(cleanNick("m s"), "MS", "빈칸이 남았다");
        assert.equal(cleanNick("김민식"), "김민", "한글은 두 칸씩만 받아야 지도에서 읽힌다");
        assert.equal(cleanNick("★!"), "★!", "특수문자를 버린다");
        assert.equal(cleanNick("a\nb"), "AB", "줄바꿈이 남았다 — 한 칸이 두 줄이 된다");
        assert.equal(cleanNick("!!!"), "!!!", "기호를 받지 않는다");
        assert.equal(cleanNick(""), undefined, "빈 문자열이 이름이 되었다");
        assert.equal(cleanNick(undefined), undefined, "없는 값이 이름이 되었다");
        assert.equal(cleanNick(42), undefined, "문자열이 아닌 것이 이름이 되었다");
        for (const s of ["MSON", "A1", "9999"]) assert.equal(cleanNick(s), s, `${s} 가 바뀌었다`);
    }

    // ── 놓는 자리도 같은 자를 쓴다 — 그리고 **판을 안 굴린다**
    {
        const s = withGuest(4501);
        const t0 = s.turn;
        const rng0 = s.rngState;
        const after = setNick(s, 1, "minsikson");
        assert.equal(after.heroes[1].nick, "MINS", "놓을 때는 안 다듬는다 — 자가 두 벌이 됐다");
        assert.equal(after.turn, t0, "이름을 놓았다고 턴이 갔다");
        assert.equal(after.rngState, rng0, "이름을 놓았다고 난수가 굴렀다");

        // 쓸 수 없는 이름은 **칸째 지운다** — 빈 칸도 칸이라 저장이 달라진다.
        const gone = setNick(after, 1, "\n\t");
        assert.ok(!("nick" in gone.heroes[1]), "쓸 수 없는 이름이 빈 칸으로 남았다");
    }

    // ── 합류할 때 받는 이름도 같은 자를 지난다
    {
        const s = joinGame(newGame(4502), "rogue", "kim c");
        assert.equal(s.heroes[1].nick, "KIMC", "합류하면서 받은 이름이 안 다듬어졌다");
    }

    // ── **되읽을 때도 다시 다듬는다** — 온라인은 남의 판이 이 길로 들어온다
    {
        const { serialize, deserialize } = await import("@/lib/rogue/storage");
        const s = joinGame(newGame(4503), "rogue");
        // 남이 보낸 판인 셈 치고 규칙 밖의 값을 박아 둔다.
        s.heroes[1].nick = "\n\t";
        const back = deserialize(serialize(s))!;
        assert.ok(!back.heroes[1].nick, "남이 보낸 아무 문자열이 그대로 지도에 그려진다");
    }
});

// **경험치는 잡은 사람의 것이되, 곁에 선 동료와 나눈다.**
//
// `killMonster` 가 `state.heroes[0]` 를 들고 있었다 — 어그로도 수법도 사람마다 갈라 놓고,
// 정작 **경험치·무기 통달·미다스 건틀릿**은 늘 방장을 봤다. 손님이 혼자 스무 마리를 잡아도
// 레벨이 안 올랐고, 그 까닭이 판 어디에도 안 적힌다.
//
// 나누는 자리는 `monsterSees` 하나를 본다 — 「같은 방인가」를 따로 세지 않는다.
// **총량은 안 늘어난다**: 같이 있다고 판이 두 배로 후해지면 동료를 부르는 것이 곧
// 경험치 두 배가 된다.
test("경험치는 잡은 사람의 것이되 곁에 선 동료와 나눈다", async () => {
    const { equippedWeapon } = await import("@/lib/rogue/hero");

    /**
     * 손님 옆에 한 대면 죽을 놈을 붙여 세운다.
     *
     * `far` 면 방장을 **멀찍이** 보낸다 — 「잡은 사람만 받는가」를 재려면 방장이 그 자리를
     * 알아보면 안 된다(`monsterSees`). 아니면 바로 곁에 세운다(나눠 갖는 쪽).
     */
    const beside = (seed: number, far: boolean, ch = "E") => {
        const s = withGuest(seed);
        const [host, guest] = s.heroes;
        // 배수는 안 걸리게 — 재려는 것은 나누기지 곱하기가 아니다.
        s.level.mutator = null;
        if (far) {
            for (let y = 1; y < 20 && Math.abs(host.x - guest.x) + Math.abs(host.y - guest.y) < 14; y++) {
                for (let x = 1; x < 70; x++) {
                    if (!walkable(s.level.tiles[idx(x, y)] as Tile)) continue;
                    if (Math.abs(x - guest.x) + Math.abs(y - guest.y) < 14) continue;
                    host.x = x;
                    host.y = y;
                    break;
                }
            }
        } else {
            host.x = guest.x;
            host.y = guest.y + 1;
            s.level.tiles[idx(guest.x, guest.y + 1)] = T.FLOOR;
        }
        const mx = guest.x + 1;
        s.level.tiles[idx(mx, guest.y)] = T.FLOOR;
        const m = spawnMonster(ch, mx, guest.y, new Rng(seed));
        m.hp = 1;
        m.awake = true;
        m.champion = undefined;
        s.level.monsters = [m];
        return { s, host, guest, m };
    };

    // ── **멀리 있는 방장은 못 받는다** — 잡은 사람이 통째로 갖는다
    {
        let killed = false;
        for (let n = 0; n < 60 && !killed; n++) {
            const { s, host, guest, m } = beside(4801 + n, true);
            const exp = m.def.exp;
            const hostExp = host.exp;
            const guestExp = guest.exp;
            perform(s, { t: "move", dx: 1, dy: 0, who: 1 });
            if (s.level.monsters.length > 0) continue; // 빗나갔다 — 다음 씨앗
            killed = true;
            assert.equal(guest.exp - guestExp, exp, "멀리 떨어진 동료가 있는데 몫이 깎였다");
            assert.equal(host.exp, hostExp, "그 자리를 보지도 못한 방장이 경험치를 받았다");
        }
        assert.ok(killed, "예순 번을 붙였는데 손님이 한 마리도 못 잡았다");
    }

    // ── **곁에 서 있으면 나눠 갖는다** — 총량은 그대로, 나머지는 잡은 사람 몫
    {
        let killed = false;
        for (let n = 0; n < 60 && !killed; n++) {
            // 홉고블린은 경험치가 **3** 이라 홀수다 — 짝수면 「나머지는 잡은 사람에게」가
            // 아무것도 안 가린다(되돌려 보고 알았다).
            const { s, host, guest, m } = beside(4701 + n, false, "H");
            const exp = m.def.exp;
            assert.equal(exp % 2, 1, "나머지를 재려면 홀수여야 한다 — 표가 바뀌었다");
            const hostExp = host.exp;
            const guestExp = guest.exp;
            perform(s, { t: "move", dx: 1, dy: 0, who: 1 });
            if (s.level.monsters.length > 0) continue;
            killed = true;
            const toGuest = guest.exp - guestExp;
            const toHost = host.exp - hostExp;
            assert.ok(toHost > 0, `곁에 선 방장이 한 톨도 못 받았다 (${exp} 중 손님 ${toGuest} · 방장 ${toHost})`);
            assert.ok(toGuest > 0, "잡은 손님이 한 톨도 못 받았다");
            assert.equal(toGuest + toHost, exp, "나눠 준 합이 그 놈의 경험치와 다르다 — 총량이 늘거나 샜다");
            assert.equal(toGuest, Math.ceil(exp / 2), "나머지가 잡은 사람에게 안 갔다");
        }
        assert.ok(killed, "예순 번을 붙였는데 손님이 한 마리도 못 잡았다");
    }

    // ── **쓰러진 동료는 못 받는다** — 누워서 크면 「층을 넘어야 일어난다」가 무게를 잃는다
    {
        let killed = false;
        for (let n = 0; n < 60 && !killed; n++) {
            const { s, host, guest, m } = beside(4751 + n, false);
            const exp = m.def.exp;
            host.hp = 0;
            const hostExp = host.exp;
            const guestExp = guest.exp;
            perform(s, { t: "move", dx: 1, dy: 0, who: 1 });
            if (s.level.monsters.length > 0) continue;
            killed = true;
            assert.equal(host.exp, hostExp, "쓰러진 동료가 누운 채로 경험치를 받았다");
            assert.equal(guest.exp - guestExp, exp, "동료가 쓰러졌는데 그 몫이 사라졌다");
        }
        assert.ok(killed, "예순 번을 붙였는데 손님이 한 마리도 못 잡았다");
    }

    // ── 방장이 잡으면 **방장의** 것이다 (단독 플레이의 규칙은 안 바뀐다)
    {
        const s = newGame(4901);
        const hero = s.heroes[0];
        const before = hero.exp;
        const mx = hero.x + 1;
        s.level.tiles[idx(mx, hero.y)] = T.FLOOR;
        const m = spawnMonster("E", mx, hero.y, new Rng(7));
        m.hp = 1;
        m.awake = true;
        s.level.monsters = [m];
        let hit = false;
        for (let n = 0; n < 40 && !hit; n++) {
            perform(s, { t: "move", dx: 1, dy: 0 });
            hit = s.level.monsters.length === 0;
        }
        assert.ok(hit, "마흔 번을 때렸는데 한 마리도 못 잡았다");
        assert.ok(hero.exp > before, "혼자 잡았는데 경험치가 안 올랐다");
    }

    // ── **무기 통달도 잡은 사람이 쥔 칼**을 센다
    //
    // 손님에게 **방장이 안 쥔 종류**를 들려야 한다 — 둘이 같은 칼이면 누구 것을 세든
    // 숫자가 같아서 이 주장이 아무것도 안 가린다(되돌려 보고 알았다).
    {
        let killed = false;
        for (let n = 0; n < 60 && !killed; n++) {
            const { s, host, guest } = beside(4851 + n, true);
            const mine = makeItem("weapon", "knight sword", 990, -1, -1);
            addToPack(guest, mine);
            guest.weaponId = mine.id;
            const hostWep = equippedWeapon(host);
            if (!hostWep || hostWep.type === mine.type) continue;
            const k = `weapon:${mine.type}`;
            const hostKey = `weapon:${hostWep.type}`;
            const before = s.itemUsage[k] ?? 0;
            const hostBefore = s.itemUsage[hostKey] ?? 0;

            perform(s, { t: "move", dx: 1, dy: 0, who: 1 });
            if (s.level.monsters.length > 0) continue;
            killed = true;
            assert.equal(s.itemUsage[k] ?? 0, before + 1, "손님이 잡았는데 손님이 쥔 칼의 처치 수가 안 늘었다");
            assert.equal(s.itemUsage[hostKey] ?? 0, hostBefore, "손님이 잡았는데 방장이 쥔 칼의 처치 수가 늘었다");
        }
        assert.ok(killed, "예순 번을 붙였는데 손님이 한 마리도 못 잡았다");
    }

    // ── **화상으로 죽으면 불을 붙인 사람**의 몫이다 — 그 턴에 움직인 사람이 아니다
    //
    // 방장을 멀찍이 보낸다 — 곁에 두면 나눠 갖는 규칙에 걸려 「누구의 몫인가」가 안 갈린다.
    {
        const s = withGuest(4950);
        const [host, guest] = s.heroes;
        s.level.mutator = null;
        for (let y = 1; y < 20 && Math.abs(host.x - guest.x) + Math.abs(host.y - guest.y) < 14; y++) {
            for (let x = 1; x < 70; x++) {
                if (!walkable(s.level.tiles[idx(x, y)] as Tile)) continue;
                if (Math.abs(x - guest.x) + Math.abs(y - guest.y) < 14) continue;
                host.x = x;
                host.y = y;
                break;
            }
        }
        const mx = guest.x + 2;
        s.level.tiles[idx(mx, guest.y)] = T.FLOOR;
        const m = spawnMonster("E", mx, guest.y, new Rng(7));
        m.hp = 1;
        m.awake = true;
        m.burnTurns = 3;
        m.burnBy = 1; // 손님이 붙인 불
        s.level.monsters = [m];

        const hostExp = host.exp;
        const guestExp = guest.exp;
        perform(s, { t: "rest" }); // **방장**이 움직인다
        assert.equal(s.level.monsters.length, 0, "화상으로 안 죽었다");
        assert.ok(guest.exp > guestExp, "불을 붙인 손님이 경험치를 못 받았다");
        assert.equal(host.exp, hostExp, "동료가 붙인 불로 방장이 경험치를 받았다");
    }
});

// 쓰러진 사람을 되살리는 길이 여태 둘뿐이었다 — **층을 넘거나**(살아남은 사람이 계단까지
// 가야 한다), 불사조의 깃털(제 몸에만 듣는다). 둘 다 **곁에 가서 살리는** 길이 아니라,
// 동료가 눈앞에 누워 있는데 할 수 있는 것이 없었다. 소생 물약이 그 자리다.
test("소생 물약은 곁의 쓰러진 동료를 일으킨다 — 혼자면 제 몸을 채운다", () => {
    /** 손님을 눕히고, 방장에게 소생 물약을 쥐여 준다. */
    const ready = (seed: number, apart: boolean) => {
        const s = withGuest(seed);
        const [host, guest] = s.heroes;
        s.level.monsters = [];
        guest.hp = 0;
        if (apart) {
            // 멀찍이 — 곁이 아니면 안 듣는다.
            guest.x = host.x + 5;
            guest.y = host.y + 5;
        }
        const pot = makeItem("potion", "revival", 970, -1, -1);
        addToPack(host, pot);
        return { s, host, guest, letter: pot.letter! };
    };

    // ── 곁에 있으면 **최대 체력의 절반**으로 일어난다
    {
        const { s, host, guest, letter } = ready(4601, false);
        assert.ok(Math.max(Math.abs(guest.x - host.x), Math.abs(guest.y - host.y)) <= 1, "손님이 곁에 안 섰다");
        const after = perform(s, { t: "quaff", letter });
        assert.equal(after.heroes[1].hp, Math.max(1, Math.floor(guest.maxHp / 2)), "곁의 동료가 안 일어났다");
        assert.equal(after.phase, "playing", "일으켰는데 판이 끝났다");
        assert.ok(!packItem(after.heroes[0], letter), "물약이 배낭에 남았다");
    }

    // ── 멀면 **안 듣는다** — 대신 제 몸이 가득 찬다(빈 칸이 되지 않게)
    {
        const { s, host, letter } = ready(4602, true);
        host.hp = 3;
        const after = perform(s, { t: "quaff", letter });
        assert.equal(after.heroes[1].hp, 0, "멀리 누운 동료가 일어났다 — 다가갈 까닭이 사라진다");
        assert.equal(after.heroes[0].hp, after.heroes[0].maxHp, "곁에 아무도 없는데 제 몸도 안 찼다");
    }

    // ── **혼자 하는 판**에서도 쓸모가 있다
    {
        const s = newGame(4603);
        s.heroes[0].hp = 2;
        const pot = makeItem("potion", "revival", 971, -1, -1);
        addToPack(s.heroes[0], pot);
        const after = perform(s, { t: "quaff", letter: pot.letter! });
        assert.equal(after.heroes[0].hp, after.heroes[0].maxHp, "혼자인데 아무 일도 안 났다 — 빈 칸짜리 물약이다");
    }

    // ── 굶어 쓰러진 사람도 일으킨다 — 배와 비문까지 같이(`enterLevel` 과 같은 자리)
    {
        const { s, guest, letter } = ready(4604, false);
        guest.food = -400;
        s.epitaph = "굶어 죽었다.";
        const after = perform(s, { t: "quaff", letter });
        assert.ok(after.heroes[1].hp > 0, "굶어 쓰러진 동료가 안 일어났다");
        assert.ok(after.heroes[1].food > -200, "일으켰는데 배가 죽음선 아래 그대로다");
        assert.equal(after.epitaph, "", "일어났는데 굶어 죽었다는 비문이 남아 있다");
        const next = perform(after, { t: "rest" });
        assert.ok(next.heroes[1].hp > 0, "일어난 동료가 한 걸음 만에 도로 쓰러졌다");
    }
});

// 다시 들어온 손님은 **그 사람 그대로**여야 한다.
//
// 온라인에서 손님의 영웅은 **방장의 판 안에** 산다. 끊겼다 다시 붙으면 방장이 판을 통째로
// 돌려주는데(`init`), 그때 `joinGame` 을 또 부르면 **새 영웅이 서서** 모은 물건·레벨·
// 손질이 통째로 날아간다. 방장 쪽 갈림은 `heroes.length > 1` 하나다.
test("다시 들어온 손님의 배낭과 수치가 그대로다", async () => {
    const { serialize, deserialize } = await import("@/lib/rogue/storage");
    const { setNick } = await import("@/lib/rogue/game");

    /** 손님에게 물건과 수치를 얹어 둔다 — 잃어버리면 표가 나게. */
    const loaded = (seed: number) => {
        const s = joinGame(newGame(seed), "rogue", "kimc");
        const guest = s.heroes[1];
        guest.level = 5;
        guest.exp = 210;
        guest.maxHp = 40;
        guest.hp = 31;
        guest.gold = 777;
        const sword = makeItem("weapon", "silver sword", 980, -1, -1);
        sword.plusHit = 3;
        sword.plusDam = 3;
        sword.plusKnown = true;
        addToPack(guest, sword);
        guest.weaponId = sword.id;
        return s;
    };

    /** 그 사람이 그대로인가 — 한 자리에서 본다. */
    const same = (g: Hero, why: string) => {
        assert.equal(g.level, 5, `${why}: 레벨이 날아갔다`);
        assert.equal(g.exp, 210, `${why}: 경험치가 날아갔다`);
        assert.equal(g.gold, 777, `${why}: 금화가 날아갔다`);
        assert.equal(g.maxHp, 40, `${why}: 최대 체력이 날아갔다`);
        assert.equal(g.origin, "rogue", `${why}: 직업이 바뀌었다`);
        assert.equal(g.nick, "KIMC", `${why}: 이름이 날아갔다`);
        const wep = g.pack.find((p) => p.id === g.weaponId);
        assert.ok(wep, `${why}: 쥐고 있던 칼이 사라졌다`);
        assert.equal(wep!.type, "silver sword", `${why}: 다른 칼을 쥐고 있다`);
        assert.equal(wep!.plusHit, 3, `${why}: 손질이 날아갔다`);
    };

    // ── **끊겼다 다시 붙는 길** — 방장은 `joinGame` 을 다시 안 부르고 이름만 고친다
    {
        const s = loaded(4701);
        // 방장이 하는 일과 같다(`Rogue.tsx` 의 `hello` 갈래): 이미 앉아 있으면 이름만.
        const back = s.heroes.length > 1 ? setNick(s, 1, "kimc") : joinGame(s, "rogue", "kimc");
        same(back.heroes[1], "다시 붙었을 때");
        assert.equal(back.heroes.length, 2, "다시 붙었는데 영웅이 늘었다");
    }

    // ── 그 판을 **직렬화해 건너보내도** 그대로다(`init` 이 지나는 길)
    {
        const s = loaded(4702);
        const sent = deserialize(serialize(s))!;
        same(sent.heroes[1], "판을 통째로 받았을 때");
    }

    // ── **나갔다 다시 들어오는 길** — 보낸 동료가 그 판 안에서 돌아온다
    {
        const { leaveGame } = await import("@/lib/rogue/game");
        const s = loaded(4703);
        const alone = leaveGame(s);
        assert.equal(alone.heroes.length, 1, "동료가 안 나갔다");
        const rejoined = joinGame(alone, "knight", "kimc"); // 딴 직업을 줘도 그 사람이 돌아온다
        same(rejoined.heroes[1], "나갔다 다시 들어왔을 때");
    }
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

test("협동의 기록은 턴 뒤에 누가 한 일인지 적고, 혼자면 플레이어 표식이 없다", () => {
    const s = withGuest(4416);
    const before = s.messages.length;
    s.heroes[1].origin = "knight";
    const after = perform(s, { t: "rest", who: 1 });
    const mine = after.messages.slice(before);
    assert.ok(mine.some((m) => /^T:\d+ 2P▸ /.test(m)), `동료의 턴·플레이어 표식이 없다: ${JSON.stringify(mine)}`);
    assert.ok(!mine.some((m) => /^T:\d+ 1P▸ /.test(m)), "동료가 한 일에 1P 가 붙었다");

    const solo = newGame(4417);
    solo.heroes[0].origin = "knight";
    const n = solo.messages.length;
    assert.ok(!perform(solo, { t: "rest" }).messages.slice(n).some((m) => /^T:\d+ [12]P▸ /.test(m)), "혼자인데 플레이어 표식이 붙었다");
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
            // **녹을 것을 남겨 둔다** — 손질이 `0` 이면 아쿠에이터가 더 못 녹이므로
            // (`combat` 의 바닥), 맞았는지 안 맞았는지가 갑옷으로는 안 갈린다.
            hostArm.plusArmor = 3;
            guestArm.plusArmor = 3;
            guest.hp = 999;
            guest.maxHp = 999;
            partyRound(s);
            if ((guestArm.plusArmor ?? 0) < 3) {
                found = true;
                assert.equal(hostArm.plusArmor ?? 0, 3, "손님이 맞았는데 방장의 갑옷이 녹았다");
            } else {
                assert.equal(hostArm.plusArmor ?? 0, 3, "아무도 안 맞았는데 방장의 갑옷이 녹았다");
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
            partyRound(s);
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
