// 파티 — **셋 이상.**
//
// 손님이 하나뿐이던 시절에는 `heroes[1]` 이 곧 「그 손님」이었다. 온라인 정원이 늘며
// (`Rogue.tsx` 의 `MAX_PARTY`) 그 가정이 깨진다 — 여기서 거는 것은 **엔진이 몇 명이든
// 같은 규칙으로 도는가** 하나다.
//
//   ① **가운데 자리가 빠지면 뒤엣사람들의 칸 번호가 하나씩 당겨진다**(`leaveGame`).
//      몬스터의 어그로(`target`)는 사람의 칸 번호라, 그대로 두면 엉뚱한 사람을 쫓는다.
//   ② **돌아온 손님은 자리표(`guestKey`)로 고른다** — 대기석에 여럿이 있어도 A 가
//      나간 자리에 B 가 들어와 A 의 캐릭터를 가로채면 안 된다.
//   ③ 방장(`heroes[0]`)은 못 내보낸다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { joinGame, leaveGame, newGame, partyAmulet, partyGold } from "@/lib/rogue/game";
import { Rng } from "@/lib/rogue/rng";
import { spawnMonster } from "@/lib/rogue/monsters";
import { deserialize, serialize } from "@/lib/rogue/storage";
import type { GameState } from "@/lib/rogue/types";

/** 방장 + 손님 셋 — guestKey 는 "a" · "b" · "c". */
function partyOfFour(seed: number): GameState {
    let s = newGame(seed);
    s = joinGame(s, "rogue", "A", undefined, "a");
    s = joinGame(s, "alchemist", "B", undefined, "b");
    s = joinGame(s, "scholar", "C", undefined, "c");
    return s;
}

test("가운데 자리가 빠지면 뒤가 당겨지고, 몬스터의 어그로도 같이 맞는다", () => {
    const s = partyOfFour(9001);
    assert.equal(s.heroes.length, 4, "손님 셋이 다 안 앉았다");
    assert.deepEqual(s.heroes.map((h) => h.guestKey), [undefined, "a", "b", "c"], "자리표가 순서대로 안 붙었다");

    // ── 몬스터 셋 — 빠지는 자리(1번) · 그 뒤(2·3번) · 그 앞(0번)을 각각 쫓는다
    const rng = new Rng(1);
    const chasesGone = spawnMonster("K", 1, 1, rng);
    chasesGone.target = 1;
    const chasesAfter1 = spawnMonster("K", 2, 1, rng);
    chasesAfter1.target = 2;
    const chasesAfter2 = spawnMonster("K", 3, 1, rng);
    chasesAfter2.target = 3;
    const chasesBefore = spawnMonster("K", 4, 1, rng);
    chasesBefore.target = 0;
    s.level.monsters.push(chasesGone, chasesAfter1, chasesAfter2, chasesBefore);

    const next = leaveGame(s, 1); // "a" (2번, rogue) 를 보낸다

    assert.equal(next.heroes.length, 3, "한 자리만 빠져야 하는데 다르게 줄었다");
    assert.deepEqual(next.heroes.map((h) => h.guestKey), [undefined, "b", "c"], "빠진 자리 뒤가 안 당겨졌다");

    assert.equal(chasesGone.target, undefined, "떠난 사람을 계속 쫓는다");
    assert.equal(chasesAfter1.target, 1, "빠진 자리 바로 뒤가 안 당겨졌다 — 엉뚱한 사람을 쫓는다");
    assert.equal(chasesAfter2.target, 2, "빠진 자리보다 뒤가 안 당겨졌다 — 엉뚱한 사람을 쫓는다");
    assert.equal(chasesBefore.target, 0, "빠진 자리보다 앞은 그대로여야 하는데 밀렸다");
});

test("방장은 못 내보낸다", () => {
    const s = partyOfFour(9002);
    const next = leaveGame(s, 0);
    assert.equal(next, s, "방장을 내보내는 명령이 판을 바꿨다");
    assert.equal(next.heroes.length, 4);
});

test("돌아온 손님은 자리표로 고른다 — 대기석에 여럿이 있어도 안 섞인다", () => {
    let s = partyOfFour(9003);
    s.heroes.find((h) => h.guestKey === "a")!.level = 7;
    s.heroes.find((h) => h.guestKey === "b")!.level = 3;

    // A 와 B 가 차례로 나간다 — 대기석에 둘이 쌓인다. (A 가 빠지면 B·C 의 칸 번호가
    // 하나씩 당겨지므로, 지울 때는 **그때그때 다시 찾는다** — 안 그러면 엉뚱한 사람이 나간다.)
    s = leaveGame(s, s.heroes.findIndex((h) => h.guestKey === "a"));
    s = leaveGame(s, s.heroes.findIndex((h) => h.guestKey === "b"));
    assert.equal(s.heroes.length, 2, "방장과 C만 남아야 하는데 다르다");
    assert.ok(s.heroes.some((h) => h.guestKey === "c"), "안 나간 C 가 사라졌다");
    assert.equal(s.benched?.length, 2, "대기석에 둘이 안 쌓였다");

    // B 가 먼저 돌아온다 — 자리표가 맞는 사람만 돌아와야 한다.
    const withB = joinGame(s, "knight", "누구든", undefined, "b");
    const backB = withB.heroes.find((h) => h.guestKey === "b");
    assert.equal(backB?.level, 3, "B 의 자리표로 불렀는데 다른 사람(또는 새 사람)이 돌아왔다");
    assert.equal(withB.benched?.length, 1, "B 만 대기석에서 빠져야 하는데 다르다");
    assert.equal(withB.benched?.[0].guestKey, "a", "남은 대기석이 A 가 아니다");

    // A 도 돌아온다.
    const withBoth = joinGame(withB, "knight", "누구든", undefined, "a");
    assert.equal(withBoth.heroes.length, 4);
    assert.ok(withBoth.heroes.some((h) => h.guestKey === "a" && h.level === 7), "A 가 레벨을 잃고 돌아왔다");
    assert.equal(withBoth.benched, undefined, "다 돌아왔는데 대기석이 안 비었다");

    // ── 자리표가 다른 새 손님은 대기석을 가로채지 않고 새로 앉는다.
    let s2 = partyOfFour(9004);
    s2 = leaveGame(s2, s2.heroes.findIndex((h) => h.guestKey === "a")); // A 만 대기석에
    const stranger = joinGame(s2, "knight", "생판 남", undefined, "z");
    assert.equal(stranger.heroes.length, 4, "새 손님이 안 앉았다");
    const z = stranger.heroes.find((h) => h.guestKey === "z");
    assert.equal(z?.origin, "knight", "대기석의 A(rogue) 를 가로챘다 — 고른 직업이 안 먹혔다");
    assert.ok(stranger.benched?.some((h) => h.guestKey === "a"), "A 의 대기석 자리가 남의 접속에 지워졌다");
});

test("파티 금화·증표는 대기석에 있는 사람 몫까지 센다 — 여럿이어도", () => {
    let s = partyOfFour(9005);
    s.heroes[1].gold = 100;
    s.heroes[2].gold = 50;
    s.heroes[3].hasAmulet = true;
    s = leaveGame(s, 3); // 증표를 든 C 를 보낸다
    s = leaveGame(s, 1); // A 도 보낸다(지금 1번)
    assert.equal(s.benched?.length, 2);
    assert.equal(partyGold(s), s.heroes[0].gold + 100 + 50, "대기석 여럿의 금화를 다 못 센다");
    assert.ok(partyAmulet(s), "대기석으로 나간 증표를 잃었다고 센다");
});

test("저장은 대기석 여럿을 그대로 되읽는다 — 옛 저장(대기석 하나)도 채운다", () => {
    let s = partyOfFour(9006);
    s = leaveGame(s, 2);
    s = leaveGame(s, 1);
    const back = deserialize(serialize(s))!;
    assert.equal(back.benched?.length, 2, "대기석 여럿이 저장·되읽기에서 줄었다");
    assert.deepEqual(
        back.benched?.map((h) => h.guestKey).sort(),
        ["a", "b"],
        "되읽은 대기석의 자리표가 바뀌었다",
    );

    // v10 이하 저장 — `benched` 가 영웅 하나였다.
    const legacy = JSON.parse(serialize(newGame(1)));
    legacy.v = 10;
    legacy.benched = { ...s.heroes[0], id: 999 };
    delete legacy.benched.guestKey;
    const migrated = deserialize(JSON.stringify(legacy));
    assert.ok(Array.isArray(migrated?.benched), "옛 저장(영웅 하나)의 대기석을 배열로 못 감쌌다");
    assert.equal(migrated?.benched?.length, 1);
});
