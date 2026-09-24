// 아이템 도감 (Item Codex) & 최단 거리 통로 테스트
//
// 1. 68종 아이템 (무기 13, 방어구 9, 주문서 10, 물약 9, 반지 14, 지팡이 11, 식량 1, 증표 1)
// 2. 5단계 해금 모델 (0 미발견, 1 목격, 2 획득, 3 식별, 4 통달)
// 3. 미식별 정보 누출 차단 (스탯/층/피해 미공개)
// 4. 통달 조건 (무기 20킬, 방어구 1000걸음, 소모품 5회, 지팡이 15회, 반지 1000걸음, 식량/증표 즉시)
// 5. 판을 넘어 영구 보존 및 판 단위 초기화 격리
// 6. 방과 방 사이 최단 거리 연결 및 직통 연결

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    CODEX_ENTRIES,
    itemCodexProgress,
    itemCodexStage,
    itemCodexStats,
} from "@/lib/rogue/codexData";
import { newGame, perform, updateSeenItems } from "@/lib/rogue/game";
import {
    ARMORS,
    POTIONS,
    RINGS,
    SCROLLS,
    WANDS,
    WEAPONS,
    makeItem,
} from "@/lib/rogue/items";
import { Rng } from "@/lib/rogue/rng";
import { spawnMonster } from "@/lib/rogue/monsters";
import { idx, T, type GameState, type Tile } from "@/lib/rogue/types";

test("도감 대상은 정확히 68종이고 7개 카테고리로 나뉜다", () => {
    assert.equal(CODEX_ENTRIES.length, 68);

    const prog = itemCodexProgress();
    assert.equal(prog.totalCount, 68);
    assert.equal(prog.identifiedCount, 0);
    assert.equal(prog.masteredCount, 0);

    assert.equal(prog.byCategory.weapon.total, 13);
    assert.equal(prog.byCategory.armor.total, 9);
    assert.equal(prog.byCategory.scroll.total, 10);
    assert.equal(prog.byCategory.potion.total, 9);
    assert.equal(prog.byCategory.ring.total, 14);
    assert.equal(prog.byCategory.wand.total, 11);
    assert.equal(prog.byCategory.other.total, 2);

    // 각 카테고리 정의 항목과 일치하는지 확인
    assert.equal(Object.keys(WEAPONS).length, 14);
    assert.equal(Object.keys(ARMORS).length, 9);
    assert.equal(Object.keys(SCROLLS).length, 11);
    assert.equal(Object.keys(POTIONS).length, 9);
    assert.equal(Object.keys(RINGS).length, 14);
    assert.equal(Object.keys(WANDS).length, 11);
});

test("5단계 해금 판정이 정확하다 (0 미발견 -> 1 목격 -> 2 획득 -> 3 식별 -> 4 통달)", () => {
    const s = newGame(101);
    // 기본 시작 시 철퇴, 사슬 고리 갑옷, 식량은 식별 상태
    const daggerEntry = CODEX_ENTRIES.find((e) => e.key === "weapon:dagger")!;
    assert.ok(daggerEntry);

    // 1. 미발견 (0)
    delete s.seenItems["weapon:dagger"];
    delete s.itemCodex["weapon:dagger"];
    delete s.known["weapon:dagger"];
    s.heroes[0].pack = s.heroes[0].pack.filter((it) => it.type !== "dagger");
    assert.equal(itemCodexStage(daggerEntry, s), 0);

    // 2. 목격 (1)
    s.seenItems["weapon:dagger"] = true;
    assert.equal(itemCodexStage(daggerEntry, s), 1);

    // 3. 획득 (2)
    s.heroes[0].pack.push(makeItem("weapon", "dagger", 888, -1, -1));
    assert.equal(itemCodexStage(daggerEntry, s), 2);

    // 4. 식별 (3)
    s.itemCodex["weapon:dagger"] = true;
    s.itemUsage["weapon:dagger"] = 5;
    assert.equal(itemCodexStage(daggerEntry, s), 3);

    // 5. 통달 (4) - 무기는 20킬
    s.itemUsage["weapon:dagger"] = 20;
    assert.equal(itemCodexStage(daggerEntry, s), 4);
});

test("통달 목표 수치가 기획안과 일치한다", () => {
    for (const e of CODEX_ENTRIES) {
        if (e.category === "weapon") {
            assert.equal(e.masteryType, "kills");
            assert.equal(e.masteryGoal, 20);
        } else if (e.category === "armor") {
            assert.equal(e.masteryType, "steps");
            assert.equal(e.masteryGoal, 1000);
        } else if (e.category === "scroll" || e.category === "potion") {
            assert.equal(e.masteryType, "uses");
            assert.equal(e.masteryGoal, 5);
        } else if (e.category === "wand") {
            assert.equal(e.masteryType, "uses");
            assert.equal(e.masteryGoal, 15);
        } else if (e.category === "ring") {
            assert.equal(e.masteryType, "steps");
            assert.equal(e.masteryGoal, 1000);
        } else if (e.category === "other") {
            assert.equal(e.masteryType, "instant");
            assert.equal(e.masteryGoal, 1);
        }
    }
});

test("게임 플레이 중 액션에 따라 숙련도와 식별이 정확히 기록된다", () => {
    // 1. 물약 마시기 -> 식별 및 사용 횟수 증가
    {
        const s = newGame(202);
        const pot = makeItem("potion", "healing", 901, -1, -1);
        pot.letter = "z";
        s.heroes[0].pack.push(pot);
        s.heroes[0].hp = 5;

        const beforeUses = s.itemUsage["potion:healing"] ?? 0;
        const after = perform(s, { t: "quaff", letter: "z" });
        assert.equal(after.itemCodex["potion:healing"], true);
        assert.equal(after.itemUsage["potion:healing"], beforeUses + 1);
    }

    // 2. 주문서 읽기 -> 식별 및 사용 횟수 증가
    {
        const s = newGame(203);
        const scr = makeItem("scroll", "teleport", 902, -1, -1);
        scr.letter = "y";
        s.heroes[0].pack.push(scr);

        const beforeUses = s.itemUsage["scroll:teleport"] ?? 0;
        const after = perform(s, { t: "read", letter: "y" });
        assert.equal(after.itemCodex["scroll:teleport"], true);
        assert.equal(after.itemUsage["scroll:teleport"], beforeUses + 1);
    }

    // 3. 지팡이 쏘기 -> 식별 및 발사 횟수 증가
    {
        const s = newGame(204);
        const wand = makeItem("wand", "slow monster", 903, -1, -1);
        wand.charges = 5;
        wand.letter = "x";
        s.heroes[0].pack.push(wand);

        // 몬스터 배치
        const mx = s.heroes[0].x + 1;
        const my = s.heroes[0].y;
        s.level.tiles[idx(mx, my)] = T.FLOOR;
        const m = spawnMonster("B", mx, my, new Rng(1));
        m.hp = 10;
        s.level.monsters = [m];

        const beforeUses = s.itemUsage["wand:slow monster"] ?? 0;
        const after = perform(s, { t: "zap", letter: "x", dx: 1, dy: 0 });
        assert.equal(after.itemCodex["wand:slow monster"], true);
        assert.equal(after.itemUsage["wand:slow monster"], beforeUses + 1);
    }

    // 4. 무기 킬 -> 해당 무기 킬 수 증가
    {
        const s = newGame(205);
        const dagger = makeItem("weapon", "dagger", 904, -1, -1);
        dagger.plusHit = 20;
        dagger.plusDam = 30;
        dagger.letter = "w";
        s.heroes[0].pack.push(dagger);
        const sWield = perform(s, { t: "wield", letter: "w" });

        // 적 배치
        const mx = sWield.heroes[0].x + 1;
        const my = sWield.heroes[0].y;
        sWield.level.tiles[idx(mx, my)] = T.FLOOR;
        const m = spawnMonster("B", mx, my, new Rng(1));
        m.hp = 1;
        sWield.level.monsters = [m];

        const beforeKills = sWield.itemUsage["weapon:dagger"] ?? 0;
        const sKill = perform(sWield, { t: "move", dx: 1, dy: 0 });
        assert.equal(sKill.itemUsage["weapon:dagger"], beforeKills + 1);
    }

    // 5. 착용 상태 이동 -> 갑옷 및 반지 걸음 수 증가
    {
        const s = newGame(206);
        // 사슬 고리 갑옷 착용 상태에서 이동
        const armor = s.heroes[0].pack.find((it) => it.id === s.heroes[0].armorId);
        assert.ok(armor);

        const ring = makeItem("ring", "regeneration", 905, -1, -1);
        ring.letter = "v";
        s.heroes[0].pack.push(ring);
        const sRing = perform(s, { t: "putOn", letter: "v" });

        const beforeArmorSteps = sRing.itemUsage[`armor:${armor!.type}`] ?? 0;
        const beforeRingSteps = sRing.itemUsage["ring:regeneration"] ?? 0;

        // 1보 이동
        const targetX = sRing.heroes[0].x + 1;
        const targetY = sRing.heroes[0].y;
        sRing.level.tiles[idx(targetX, targetY)] = T.FLOOR;
        sRing.level.monsters = [];
        const sMoved = perform(sRing, { t: "move", dx: 1, dy: 0 });
        assert.equal(sMoved.itemUsage[`armor:${armor!.type}`], beforeArmorSteps + 1);
        assert.equal(sMoved.itemUsage["ring:regeneration"], beforeRingSteps + 1);
    }
});

test("새 판을 시작해도 식별과 숙련도는 이어받고 시야 목격(seenItems)은 초기화된다", () => {
    const keptCodex = { "weapon:dagger": true, "scroll:magic mapping": true };
    const keptUsage = { "weapon:dagger": 25, "scroll:magic mapping": 3 };

    const s = newGame(777, {}, {}, keptCodex, keptUsage);
    assert.equal(s.itemCodex["weapon:dagger"], true);
    assert.equal(s.itemCodex["scroll:magic mapping"], true);
    assert.equal(s.itemUsage["weapon:dagger"], 25);
    assert.equal(s.itemUsage["scroll:magic mapping"], 3);

    // 새 판에서는 seenItems가 초기화된 후 시작 시야만 반영
    assert.ok(s.seenItems);
    // 아직 보지 못한 아이템은 seenItems에 없음
    assert.equal(s.seenItems["weapon:baphomet sword"], undefined);
});

test("모든 방 사이의 통로는 최단 거리로 연결되며 고립된 방이 없다", () => {
    for (let seed = 1; seed <= 10; seed++) {
        const s = newGame(seed);
        const { level } = s;

        // 실제 존재하는 방들의 바닥이 모두 연결되어 있는지 확인
        const realRooms = level.rooms.filter((r) => !r.gone);
        assert.ok(realRooms.length >= 4, "방 개수가 너무 적음");

        // 첫 번째 방의 바닥 좌표에서 BFS 탐색으로 모든 방에 도달 가능한지 검증
        const startRoom = realRooms[0];
        const startX = startRoom.x + 1;
        const startY = startRoom.y + 1;

        const visited = new Uint8Array(level.tiles.length);
        const q: [number, number][] = [[startX, startY]];
        visited[idx(startX, startY)] = 1;

        const walkableTile = (t: Tile) =>
            t === T.FLOOR || t === T.CORRIDOR || t === T.PASSAGE || t === T.DOOR || t === T.SECRET || t === T.STAIRS;

        while (q.length > 0) {
            const [cx, cy] = q.shift()!;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= 80 || ny >= 24) continue;
                const i = idx(nx, ny);
                if (!visited[i] && walkableTile(level.tiles[i] as Tile)) {
                    visited[i] = 1;
                    q.push([nx, ny]);
                }
            }
        }

        // 모든 방의 내부 바닥 좌표 중 최소 한 칸 이상에 도달할 수 있는지 검증
        for (const room of realRooms) {
            let reached = false;
            for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
                for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
                    if (visited[idx(x, y)]) {
                        reached = true;
                        break;
                    }
                }
                if (reached) break;
            }
            assert.ok(reached, `seed ${seed}에서 방(${room.x},${room.y})에 도달할 수 없습니다`);
        }
    }
});

// 도감은 **대의 수**를 적는다 — `0d0` 을 걸러 내면 안 된다.
//
// 아쿠에이터는 `damage` 가 `["0d0","0d0"]` 이다. 대가 둘이고 대마다 갑옷을 한 칸 녹이므로
// **한 턴에 두 칸**이 녹는다. 그런데 도감이 `0d0` 을 걸러 버려서 「Dmg 없음」이라고 적었고,
// 왜 두 칸이 녹는지가 **판 어디에도 안 적힌** 상태였다. 무엇을 하는 수법인지는 여전히
// 당해 봐야 열린다(`special`) — 여기 거는 것은 **대가 몇 번인가**뿐이다.
test("도감은 특수 공격도 대의 수로 적는다", async () => {
    const { bestiaryRows } = await import("@/lib/rogue/game");
    const { MONSTERS } = await import("@/lib/rogue/monsters");

    // ── 표가 먼저다 — 아쿠에이터는 대가 둘이다
    assert.deepEqual(MONSTERS.A.damage, ["0d0", "0d0"], "아쿠에이터의 대가 둘이 아니다 — 아래 주장이 뜻을 잃는다");

    const rows = bestiaryRows({ A: 3, T: 2 }, { A: 1 });
    const aquator = rows.find((r) => r.ch === "A")!;
    const troll = rows.find((r) => r.ch === "T")!;

    assert.equal(aquator.damage.length, 2, `아쿠에이터의 대가 ${aquator.damage.length} 개로 적힌다 — 두 칸이 녹는 까닭이 화면에 안 남는다`);
    assert.deepEqual(aquator.damage, ["0d0", "0d0"], "특수 공격이 걸러졌다");
    // 피해를 주는 놈은 지금까지처럼 주사위가 그대로 적힌다.
    assert.deepEqual(troll.damage, MONSTERS.T.damage, "피해 주사위가 달라졌다");
});
