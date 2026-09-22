// 반지 · 지팡이 · 던지기 · 저주 · 함정 · 비밀문.
//
// 이 파일이 지키는 것 중 제일 중요한 둘:
//
//   1. **저주받은 것은 벗을 수 없다.** 이 한 줄이 「좋아 보이는 것을 집는 일」에 값을
//      매긴다. 조용히 벗겨지면 저주는 그냥 −1 짜리 물건이 된다.
//   2. **반지는 배를 더 고프게 한다.** 이 대가가 없으면 두 손에 둘을 안 낄 이유가 없다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { glyphAt, newGame, perform } from "@/lib/rogue/game";
import { goldGain, heroArmor, heroDefense, heroStr, hungerRate, packItem, wornRings } from "@/lib/rogue/hero";
import { describe, itemPower, makeItem, randomItem } from "@/lib/rogue/items";
import { Rng } from "@/lib/rogue/rng";
import { T, idx, walkable, type GameState, type Item, type Tile } from "@/lib/rogue/types";

/**
 * 서 있는 자리에서 **뚫린 쪽** 하나 — 쏘거나 던질 방향.
 *
 * 예전에는 `dx: 1, dy: 0` 을 박아 뒀다. 새 판이 방 한가운데서 시작하던 동안에는
 * 오른쪽이 늘 바닥이라 티가 안 났는데, **시작 자리가 올라가는 계단 위로 바뀌자**
 * 오른쪽이 벽인 판이 나왔다. 재려던 것은 「지팡이가 횟수를 쓰는가」지 오른쪽이
 * 뚫렸는가가 아니다.
 */
function openWay(s: GameState): [number, number] {
    const dirs: [number, number][] = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ];
    const d = dirs.find(([dx, dy]) => walkable(s.level.tiles[idx(s.heroes[0].x + dx, s.heroes[0].y + dy)] as Tile));
    if (!d) throw new Error("사방이 막힌 자리에서 시작했다");
    return d;
}

/** 배낭에 물건 하나를 밀어 넣고 그 글자를 준다. */
function give(s: GameState, it: Item, letter: string): string {
    it.letter = letter;
    it.x = -1;
    it.y = -1;
    s.heroes[0].pack.push(it);
    return letter;
}

test("저주받은 갑옷은 못 벗고, 반지는 능력을 바꾼다", () => {
    // ── 저주받은 갑옷은 입으면 드러나고, 그 뒤로는 벗을 수 없다
    {
        const s0 = newGame(101);
        const bad = makeItem("armor", "leather", 900, -1, -1);
        bad.cursed = true;
        bad.plusArmor = -2;
        const good = makeItem("armor", "plate mail", 901, -1, -1);
        give(s0, bad, "y");
        give(s0, good, "z");

        assert.ok(!bad.curseKnown, "입기 전에는 저주를 알 수 없어야 한다");
        const s1 = perform(s0, { t: "wear", letter: "y" });
        assert.equal(s1.heroes[0].armorId, bad.id);
        assert.ok(bad.curseKnown, "입었는데 저주가 안 드러났다");

        // 다른 갑옷으로 못 바꾼다.
        const s2 = perform(s1, { t: "wear", letter: "z" });
        assert.equal(s2.heroes[0].armorId, bad.id, "저주받은 갑옷이 벗겨졌다");
        // 내려놓지도 못한다.
        const s3 = perform(s2, { t: "drop", letter: "y" });
        assert.ok(packItem(s3.heroes[0], "y"), "저주받은 갑옷을 내려놓았다");

        // 저주 해제 주문서를 읽으면 풀린다.
        give(s3, makeItem("scroll", "remove curse", 902, -1, -1), "x");
        const s4 = perform(s3, { t: "read", letter: "x" });
        assert.ok(!bad.cursed, "저주가 안 풀렸다");
        const s5 = perform(s4, { t: "wear", letter: "z" });
        assert.equal(s5.heroes[0].armorId, good.id, "풀린 뒤에도 못 바꾼다");
    }

    // ── **오래 견디면 저주가 풀린다** — 무기는 풀리면서 한 칸 벼려진다
    //
    // 저주를 떼는 길이 여태 둘뿐이었다(해제 주문서 · 강화하다 부서뜨리기). 둘 다 **손에
    // 다른 물건이 있어야** 하는 길이라, 초반에 하나 쥐면 그 판이 통째로 끌려다닌다.
    // 그래서 시간이 세 번째 길이다 — 벗을 수 없다는 대가를 이미 치르고 있으니.
    {
        const s0 = newGame(103);
        const sword = makeItem("weapon", "long sword", 920, -1, -1);
        sword.cursed = true;
        sword.plusHit = 0;
        sword.plusDam = 0;
        give(s0, sword, "y");

        let s = perform(s0, { t: "wield", letter: "y" });
        assert.ok(sword.curseKnown, "쥐었는데 저주가 안 드러났다");
        // 재려는 것은 **견딘 걸음 수**다 — 도중에 맞아 죽으면 그게 안 잡힌다.
        s.level.monsters = [];

        // **배낭에만 있는 것은 값을 안 치른다** — 같이 넣어 두고 안 풀리는지 본다.
        const spare = makeItem("armor", "leather", 921, -1, -1);
        spare.cursed = true;
        give(s, spare, "z");

        const step = (n: number) => {
            for (let i = 0; i < n; i++) {
                for (const h of s.heroes) h.hp = h.maxHp;
                s = perform(s, { t: "rest" });
            }
        };

        // 백 걸음으로는 안 풀린다 — 한두 걸음에 풀리면 그건 저주가 아니다.
        step(100);
        assert.ok(sword.cursed, "백 걸음 만에 저주가 풀렸다");

        step(400);
        assert.ok(!sword.cursed, "오백 걸음을 견뎠는데 저주가 안 풀렸다");
        assert.ok(!sword.curseKnown, "풀렸는데 화면에는 아직 (저주) 가 붙는다");
        assert.equal(sword.plusHit, 1, "풀린 무기가 안 벼려졌다");
        assert.equal(sword.plusDam, 1, "명중만 오르고 피해는 그대로다 — setEnchant 를 안 지났다");
        assert.ok(sword.blessed, "벼려진 무기에 축복이 안 붙었다");
        assert.ok(sword.plusKnown, "벼려졌는데 그 수치를 모른다");

        assert.ok(spare.cursed, "배낭에 넣어만 둔 저주가 저절로 풀렸다 — 아무 값도 안 치렀다");
    }

    // ── 보호 반지는 방어를 내리고, 힘 반지는 힘을 올린다
    {
        const s0 = newGame(102);
        const base = heroArmor(s0.heroes[0]);
        const prot = makeItem("ring", "protection", 910, -1, -1);
        prot.plusRing = 2;
        give(s0, prot, "y");

        const s1 = perform(s0, { t: "putOn", letter: "y" });
        assert.equal(heroArmor(s1.heroes[0]), base - 2, "보호 반지가 방어 등급을 **내려야** 한다");

        const str0 = heroStr(s1.heroes[0]);
        const might = makeItem("ring", "add strength", 911, -1, -1);
        might.plusRing = 3;
        give(s1, might, "z");
        const s2 = perform(s1, { t: "putOn", letter: "z" });
        assert.equal(heroStr(s2.heroes[0]), str0 + 3);
        assert.equal(wornRings(s2.heroes[0]).length, 2);

        // 세 번째는 낄 손이 없다.
        give(s2, makeItem("ring", "searching", 912, -1, -1), "w");
        const s3 = perform(s2, { t: "putOn", letter: "w" });
        assert.equal(wornRings(s3.heroes[0]).length, 2, "손이 셋이 되었다");
    }
});

test("반지는 배를 더 고프게 하고, 저주받은 것은 못 뺀다", () => {
    // ── 반지를 끼면 배가 더 고프다 — 이 대가가 없으면 반지는 공짜다
    {
        const s0 = newGame(103);
        assert.equal(hungerRate(s0.heroes[0]), 1);

        give(s0, makeItem("ring", "regeneration", 920, -1, -1), "y");
        const s1 = perform(s0, { t: "putOn", letter: "y" });
        assert.ok(hungerRate(s1.heroes[0]) > 1, "재생 반지가 공짜다");

        // 실제로 시계가 더 빨리 돈다.
        const before = s1.heroes[0].food;
        const s2 = perform(s1, { t: "rest" });
        assert.equal(before - s2.heroes[0].food, hungerRate(s2.heroes[0]));

        // 소화 억제는 반대로 간다.
        const s3 = perform(s2, { t: "removeRing", letter: "y" });
        give(s3, makeItem("ring", "slow digestion", 921, -1, -1), "z");
        const s4 = perform(s3, { t: "putOn", letter: "z" });
        assert.ok(hungerRate(s4.heroes[0]) < 1, "소화 억제가 안 듣는다");
    }

    // ── 저주받은 반지는 뺄 수 없다
    {
        const s0 = newGame(104);
        const bad = makeItem("ring", "adornment", 930, -1, -1);
        bad.cursed = true;
        give(s0, bad, "y");
        const s1 = perform(s0, { t: "putOn", letter: "y" });
        const s2 = perform(s1, { t: "removeRing", letter: "y" });
        assert.equal(wornRings(s2.heroes[0]).length, 1, "저주받은 반지가 빠졌다");
    }
});

test("금화 반지는 금화를 절반 더 주고, 반지 효과는 감정 뒤에 바로 읽힌다", () => {
    const s = newGame(105);
    const luck = makeItem("ring", "adornment", 931, -1, -1);
    give(s, luck, "y");
    const worn = perform(s, { t: "putOn", letter: "y" });

    assert.equal(goldGain(worn.heroes[0], 11), 17, "금화 반지가 금화를 늘리지 않는다");
    assert.equal(itemPower(luck, worn.known), "금화 획득 +50%", "금화 반지의 효과가 배낭에 안 보인다");
    const escape = makeItem("ring", "teleportation", 932, -1, -1);
    assert.equal(itemPower(escape, { "ring:teleportation": true }), "두 몬스터에게 포위되면 탈출");
});

test("지팡이는 횟수를 쓰고, 둔화는 상대를 늦춘다", () => {
    // ── 지팡이는 횟수를 쓰고, 다 쓰면 아무 일도 안 난다
    {
        const s0 = newGame(105);
        const wand = makeItem("wand", "magic missile", 940, -1, -1);
        wand.charges = 2;
        give(s0, wand, "y");

        // 옆에 몬스터를 세운다 — **뚫린 쪽**에.
        const [dx, dy] = openWay(s0);
        const m = s0.level.monsters[0];
        assert.ok(m, "이 층에 몬스터가 없다");
        m.x = s0.heroes[0].x + dx;
        m.y = s0.heroes[0].y + dy;
        m.hp = 60;
        m.maxHp = 60;

        const s1 = perform(s0, { t: "zap", letter: "y", dx, dy });
        assert.equal(wand.charges, 1);
        assert.ok(m.hp < 60, "맞았는데 체력이 그대로다");
        assert.ok(s1.known["wand:magic missile"], "맞혔는데 정체를 모른다");

        perform(s1, { t: "zap", letter: "y", dx, dy });
        assert.equal(wand.charges, 0);
        const hpBefore = m.hp;
        const s2 = perform(s1, { t: "zap", letter: "y", dx, dy });
        assert.equal(m.hp, hpBefore, "빈 지팡이가 피해를 줬다");

        // ── **이미 아는 빈 지팡이는 턴을 안 쓴다**
        //
        // 정체를 모르는 지팡이는 빈 것도 겨눠 봐야 아는 것이라 그 한 번은 턴을 쓴다.
        // 그 뒤로는 정말로 아무 일도 안 일어나는데, 그때도 턴을 쓰면 **허공에 난사하다
        // 굶어 죽는다** — 벽을 들이받는 것과 같은 자리다(못 박은 규칙 셋째).
        const used = s2.itemUsage["wand:magic missile"] ?? 0;
        const before = s2.turn;
        const s3 = perform(s2, { t: "zap", letter: "y", dx, dy });
        assert.equal(s3.turn, before, "아는 빈 지팡이를 쏘는 데 턴을 썼다");
        assert.equal(
            s3.itemUsage["wand:magic missile"] ?? 0,
            used,
            "아무 일도 안 일어났는데 사용 횟수가 늘었다 — 허공에 난사해서 도감을 올릴 수 있다",
        );
    }

    // ── **빈 지팡이의 첫 한 번은** 정체를 알려 주므로 턴을 쓴다
    {
        const s0 = newGame(107);
        const wand = makeItem("wand", "cold", 945, -1, -1);
        wand.charges = 0;
        give(s0, wand, "y");
        const [dx, dy] = openWay(s0);

        assert.ok(!s0.known["wand:cold"], "쏘기 전에 정체를 알고 있다");
        const before = s0.turn;
        const s1 = perform(s0, { t: "zap", letter: "y", dx, dy });
        assert.ok(s1.known["wand:cold"], "빈 지팡이를 쏴 봤는데 정체를 모른다");
        assert.ok(s1.turn > before, "알아낸 것이 있는데 턴을 안 썼다");
    }

    // ── 둔화 지팡이는 몬스터를 두 턴에 한 번만 움직이게 한다
    {
        const s0 = newGame(106);
        const wand = makeItem("wand", "slow monster", 950, -1, -1);
        wand.charges = 3;
        give(s0, wand, "y");
        const m = s0.level.monsters[0];
        m.x = s0.heroes[0].x + 1;
        m.y = s0.heroes[0].y;
        assert.equal(m.speed, 0);
        perform(s0, { t: "zap", letter: "y", dx: 1, dy: 0 });
        assert.equal(m.speed, -1, "둔화가 안 걸렸다");
    }

    // ── 바닥에 놓인 지팡이는 **한 자루도 0회일 수 없다**
    //
    // `makeItem` 은 지팡이에 `charges = 0` 을 박아 두므로, `rollCharges` 를 안 지나고
    // 놓는 자리가 생기면 **주워도 아무 반응이 없는 지팡이**가 바닥에 깔린다. 금고 열쇠가
    // 실제로 그랬다(바닥의 지팡이 열에 넷). 금고는 그 지팡이로만 여는 방이라 **여는 길이
    // 없는 방**이 됐는데, 지도 검사는 「지팡이가 놓여 있다」까지만 보므로 안 잡혔다.
    {
        let seen = 0;
        let keys = 0;
        for (let seed = 1; seed <= 40; seed++) {
            let s = newGame(seed);
            for (let d = 1; d <= 10; d++) {
                const vault = s.level.rooms.some((r) => r.vault);
                let dig = 0;
                for (const it of s.level.items) {
                    if (it.kind !== "wand") continue;
                    seen++;
                    if (it.type === "digging") dig++;
                    assert.ok(
                        (it.charges ?? 0) > 0,
                        `시드 ${seed} ${s.level.depth}층: 바닥의 ${it.type} 지팡이가 ${it.charges}회다`,
                    );
                }
                if (vault) {
                    keys += dig;
                    assert.ok(dig > 0, `시드 ${seed} ${s.level.depth}층: 금고가 있는데 굴착 지팡이가 없다`);
                }
                s.heroes[0].x = s.level.stairs.x;
                s.heroes[0].y = s.level.stairs.y;
                s = perform(s, { t: "descend" });
                if (s.level.depth !== d + 1) break;
            }
        }
        assert.ok(seen > 100, `지팡이를 ${seen}개밖에 못 봤다 — 자가 너무 성기다`);
        assert.ok(keys > 0, "금고가 한 번도 안 났다 — 열쇠를 못 센 자다");
    }
});

test("던진 무기는 남고 물약은 깨진다 — 제자리로는 못 던진다", () => {
    // ── 던진 무기는 떨어진 자리에 남고, 물약은 깨진다
    {
        const s0 = newGame(107);
        const dagger = makeItem("weapon", "dagger", 960, -1, -1);
        give(s0, dagger, "y");
        const before = s0.level.items.length;
        const s1 = perform(s0, { t: "throw", letter: "y", dx: 1, dy: 0 });
        assert.equal(packItem(s1.heroes[0], "y"), undefined, "던진 단검이 배낭에 남았다");
        assert.equal(s1.level.items.length, before + 1, "던진 단검이 사라졌다");
        assert.ok(s1.projectile?.cells.length, "던진 물건의 비행 경로가 남지 않았다");
        assert.ok(s1.projectile?.cells.every((cell) => cell.ch === ")"), "던진 무기가 원작 물건 문자로 날아가지 않았다");

        const potion = makeItem("potion", "healing", 961, -1, -1);
        give(s1, potion, "z");
        const mid = s1.level.items.length;
        const s2 = perform(s1, { t: "throw", letter: "z", dx: -1, dy: 0 });
        assert.equal(s2.level.items.length, mid, "깨진 물약이 바닥에 남았다");
    }

    // ── 던지려면 방향이 있어야 한다 — 제자리로는 못 던진다
    {
        const s0 = newGame(108);
        give(s0, makeItem("weapon", "dagger", 970, -1, -1), "y");
        const s1 = perform(s0, { t: "throw", letter: "y", dx: 0, dy: 0 });
        assert.ok(packItem(s1.heroes[0], "y"), "제자리로 던져서 물건이 사라졌다");
    }
});

test("공격 지팡이는 원작 문자로 비행 경로를 남긴다", () => {
    const s0 = newGame(109);
    const missile = makeItem("wand", "magic missile", 980, -1, -1);
    missile.charges = 2;
    give(s0, missile, "y");
    const [dx, dy] = openWay(s0);
    const s1 = perform(s0, { t: "zap", letter: "y", dx, dy });
    assert.ok(s1.projectile?.cells.length, "마법 화살의 비행 경로가 남지 않았다");
    assert.ok(s1.projectile?.cells.every((cell) => cell.ch === "*"), "마법 화살이 `*`로 날아가지 않았다");
});

test("비밀문은 뒤져야 열리고, 함정은 밟으면 터진다", () => {
    // ── 밝은 방에 보여도 비밀문은 주변 벽과 똑같은 방향으로 그린다
    {
        const s = newGame(107);
        const x = 20;
        const y = 10;
        s.level.tiles[idx(x, y)] = T.SECRET;
        s.level.tiles[idx(x, y - 1)] = T.WALL_V;
        s.level.tiles[idx(x, y + 1)] = T.WALL_V;
        s.level.flags[idx(x, y)] = 3;
        assert.deepEqual(glyphAt(s, x, y), { ch: "|", kind: "wall" }, "세로 벽의 비밀문 모양이 미리 드러난다");
    }

    // ── 비밀문은 찾기 전에는 벽이고, 뒤지면 문이 된다
    {
        // 비밀문이 있는 층을 찾는다 — 깊을수록 잦다.
        let s: GameState | null = null;
        for (let seed = 1; seed <= 300 && !s; seed++) {
            const g = newGame(seed);
            for (let d = 0; d < 12 && g.level.depth < 12; d++) {
                g.heroes[0].x = g.level.stairs.x;
                g.heroes[0].y = g.level.stairs.y;
                perform(g, { t: "descend" });
            }
            if (g.level.tiles.includes(T.SECRET)) s = g;
        }
        assert.ok(s, "깊은 층 삼백 판에 비밀문이 하나도 없다 — 확률이 0 이 되었다");

        const at = s!.level.tiles.indexOf(T.SECRET);
        const sx = at % 80;
        const sy = Math.floor(at / 80);
        // **옆에 설 수 있는 칸을 찾아서** 선다. 비밀문은 가로 벽에도 세로 벽에도 나므로
        // 「왼쪽 칸」이 언제나 바닥일 거라고 보면 안 된다 — 실제로 층 만들기를 고치자
        // 그 가정이 깨졌다.
        const side = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ].find(([dx, dy]) => walkable(s!.level.tiles[idx(sx + dx, sy + dy)] as Tile));
        assert.ok(side, "비밀문 옆에 설 자리가 없다");
        s!.heroes[0].x = sx + side![0];
        s!.heroes[0].y = sy + side![1];
        // 비밀문은 걸어 들어갈 수 있는 칸이 아니다.
        const blocked = perform(s!, { t: "move", dx: -side![0], dy: -side![1] });
        assert.ok(
            blocked.heroes[0].x !== sx || blocked.heroes[0].y !== sy,
            "찾지도 않은 비밀문을 지나갔다",
        );

        // 뒤지는 동안 맞아 죽으면 뒤지기를 못 재게 된다 — 이 테스트가 보는 것은 비밀문이다.
        s!.level.monsters.length = 0;
        s!.heroes[0].hp = s!.heroes[0].maxHp;

        // 옆에 서서 뒤지면 언젠가 찾는다.
        let found = false;
        for (let i = 0; i < 200 && !found; i++) {
            perform(s!, { t: "search" });
            found = s!.level.tiles[idx(sx, sy)] === T.DOOR;
        }
        assert.ok(found, "이백 번을 뒤져도 못 찾았다");
    }

    // ── 함정은 밟으면 터진다 — 곰덫은 발을 묶는다
    {
        const s0 = newGame(109);
        const tx = s0.heroes[0].x + 1;
        const ty = s0.heroes[0].y;
        // 오른쪽이 막혀 있으면 이 판으로는 못 잰다.
        s0.level.tiles[idx(tx, ty)] = T.FLOOR;
        s0.level.monsters = s0.level.monsters.filter((m) => !(m.x === tx && m.y === ty));
        s0.level.traps.push({ x: tx, y: ty, kind: "beartrap", found: false });

        const s1 = perform(s0, { t: "move", dx: 1, dy: 0 });
        assert.equal(s1.heroes[0].x, tx);
        assert.ok(s1.heroes[0].stuck > 0, "곰덫을 밟았는데 안 묶였다");
        assert.ok(s1.level.traps[s1.level.traps.length - 1].found, "밟은 함정이 안 드러났다");

        // 묶인 동안에는 못 걷는다.
        const x = s1.heroes[0].x;
        const s2 = perform(s1, { t: "move", dx: 1, dy: 0 });
        assert.equal(s2.heroes[0].x, x, "덫에 걸렸는데 걸어 나갔다");
    }
});

test("정체를 모르면 손질을 안 흘린다 — 배낭 숫자와 실제가 같다", () => {
    // ── 정체를 모르는 물건은 손질을 안 흘린다
    {
        const w = makeItem("weapon", "long sword", 6, -1, -1);
        w.plusDam = 3;
        assert.equal(itemPower(w, {}), "피해 3d4", "모르는 무기의 손질이 샜다");
        const a = makeItem("armor", "plate mail", 7, -1, -1);
        a.plusArmor = 3;
        assert.equal(itemPower(a, {}), "방어력 7", "모르는 갑옷의 손질이 샜다");
        // **같은 종류를 안다고 이 물건까지 알게 되지는 않는다** — 손질은 물건마다다.
        assert.equal(
            itemPower(a, { "armor:plate mail": true }),
            "방어력 7",
            "같은 종류를 알 뿐인데 이 갑옷의 손질이 드러났다 — 두 벌째를 공짜로 감정한다",
        );
        a.plusKnown = true;
        assert.equal(itemPower(a, {}), "방어력 10", "입어 본 갑옷인데 손질이 안 보인다");
    }

    // ── 배낭에 적는 숫자와 실제로 맞는 방어가 같다
    {
        // 갈리면 화면은 방어 3 이라 적고 몸은 2 로 맞는다.
        const s = newGame(920);
        const armor = makeItem("armor", "plate mail", 930, -1, -1);
        armor.plusArmor = 2;
        armor.letter = "z";
        s.heroes[0].pack.push(armor);
        s.heroes[0].armorId = armor.id;
        s.known["armor:plate mail"] = true;
        armor.plusKnown = true; // 입은 것이라 안다(`wear` 가 세우는 값)
        assert.equal(itemPower(armor, s.known), `방어력 ${heroDefense(s.heroes[0])}`);
    }
});

// 겹쳐 쌓는 규칙의 **뒷면**. 같은 것끼리는 쌓았는데 **다른 것이 놓인 자리**에
// 떨어지면 조용히 없어졌다 — 창을 던졌더니 거기 놓여 있던 갑옷만 남는 식이다.
// 시드가 하필 그런 자리를 안 골라서 오래 안 드러났다.
test("던진 것은 사라지지 않는다 — 같은 것도 다른 것도", () => {
    // ── 한 자리에 던진 것은 겹쳐 쌓인다 — 사라지지 않는다
    {
        let s = newGame(923);
        const darts = makeItem("weapon", "dart", 942, -1, -1, 6);
        darts.letter = "z";
        s.heroes[0].pack.push(darts);
        const [dx, dy] = openWay(s);
        for (let i = 0; i < 6; i++) s = perform(s, { t: "throw", letter: "z", dx, dy });
        assert.equal(packItem(s.heroes[0], "z"), undefined, "여섯 개를 다 안 던졌다");
        const onFloor = s.level.items
            .filter((i) => i.kind === "weapon" && i.type === "dart")
            .reduce((n, i) => n + i.count, 0);
        assert.equal(onFloor, 6, `던진 여섯 개 중 ${onFloor} 개만 바닥에 있다`);
    }

    // ── 다른 물건이 놓인 자리에 던져도 사라지지 않는다
    {
        const s = newGame(924);
        const [dx, dy] = openWay(s);
        // 날아가는 길 위에 **다른 것**을 하나 놓는다.
        const mace = makeItem("weapon", "mace", 970, s.heroes[0].x + dx, s.heroes[0].y + dy, 1);
        s.level.items.push(mace);
        s.level.monsters = [];

        const spear = makeItem("weapon", "spear", 971, -1, -1, 1);
        give(s, spear, "z");
        const after = perform(s, { t: "throw", letter: "z", dx, dy });

        assert.ok(
            after.level.items.some((i) => i.type === "spear"),
            "던진 창이 없어졌다 — 그 자리에 다른 물건이 있었을 뿐이다",
        );
        assert.ok(after.level.items.some((i) => i.id === mace.id), "원래 있던 철퇴가 없어졌다");
    }
});

// 무기·갑옷의 손질은 **물건마다** 안다 — 종류가 아니다.
//
// 예전에는 `known["weapon:long sword"]` 한 칸이 그 판의 **모든** 장검을 열었다. 그래서
// 장검 한 자루를 쥐어 본 사람은 배낭 속 **두 자루째**의 `+3` 을 쥐어 보지도 않고 알았다 —
// 「써 봐야 안다」가 반만 서 있었다. 이제 `Item.plusKnown` 이 그 물건 하나만 연다.
//
// 종류의 지식(`known`)은 그대로 남는다 — 도감이 그것을 쓰고, 이름은 늘 보인다.
// 숨기는 것은 `+N` 과 「축복받은」뿐이다.
test("손질 정도는 그 물건을 써 봐야 안다", async () => {
    const { addToPack } = await import("@/lib/rogue/hero");

    /** 같은 종류의 장검 둘을 배낭에 넣는다. 하나는 축복, 하나는 그냥. */
    const armed = (seed: number) => {
        const s = newGame(seed);
        const hero = s.heroes[0];
        const mk = (id: number, plus: number, blessed: boolean) => {
            const it = makeItem("weapon", "long sword", id, -1, -1);
            it.plusHit = plus;
            it.plusDam = plus;
            it.blessed = blessed;
            return addToPack(hero, it)!;
        };
        return { s, hero, a: mk(8801, 2, true), b: mk(8802, 3, false) };
    };
    const show = (s: ReturnType<typeof armed>["s"], it: Item) => describe(it, s.known, s.appearance);

    // ── 주웠을 뿐이면 **이름만** 보인다
    {
        const { s, a, b } = armed(8001);
        assert.equal(show(s, a), "장검", `주운 무기의 손질·축복이 샜다: ${show(s, a)}`);
        assert.equal(show(s, b), "장검");
    }

    // ── 쥐면 **그 자루만** 열린다
    {
        const { s, a, b } = armed(8002);
        perform(s, { t: "wield", letter: a.letter! });
        assert.equal(show(s, a), "축복받은 장검 +2", "쥔 무기의 손질이 안 보인다");
        assert.equal(
            show(s, b),
            "장검",
            `같은 종류라고 두 자루째까지 열렸다 — 쥐어 보지도 않고 +3 을 안다: ${show(s, b)}`,
        );
    }

    // ── 갑옷도 같다
    {
        const s = newGame(8003);
        const hero = s.heroes[0];
        const mk = (id: number, plus: number) => {
            const it = makeItem("armor", "plate mail", id, -1, -1);
            it.plusArmor = plus;
            return addToPack(hero, it)!;
        };
        const worn = mk(8811, 2);
        const spare = mk(8812, 4);
        assert.equal(describe(worn, s.known, s.appearance), "판금 갑옷", "주운 갑옷의 손질이 샜다");
        perform(s, { t: "wear", letter: worn.letter! });
        assert.equal(describe(worn, s.known, s.appearance), "판금 갑옷 +2", "입은 갑옷의 손질이 안 보인다");
        assert.equal(describe(spare, s.known, s.appearance), "판금 갑옷", "안 입은 두 벌째까지 열렸다");
    }

    // ── **감정 주문서가 배낭을 통째로 연다** — 그게 그 주문서의 본업이다
    {
        const { s, hero, a, b } = armed(8004);
        const scroll = addToPack(hero, makeItem("scroll", "identify", 8820, -1, -1))!;
        perform(s, { t: "read", letter: scroll.letter! });
        assert.equal(show(s, a), "축복받은 장검 +2", "감정했는데 손질이 안 보인다");
        assert.equal(show(s, b), "장검 +3", "감정했는데 두 자루째가 안 열렸다");
    }

    // ── **강화를 걸면 그 물건을 알게 된다** — 걸어 본 것의 속을 모른 채로 둘 수는 없다
    {
        const { s, hero, b } = armed(8005);
        const scroll = addToPack(hero, makeItem("scroll", "enchant weapon", 8830, -1, -1))!;
        s.known["scroll:enchant weapon"] = true; // 아는 주문서라야 대상을 고른다
        perform(s, { t: "read", letter: scroll.letter!, target: b.letter! });
        assert.ok(b.plusKnown, "강화를 걸었는데 그 물건을 여전히 모른다");
    }
});

// 「축복받은」은 **강화·재련 주문서에만** 붙는다.
//
// 예전에는 물약·무기·방어구·반지·지팡이도 10% 로 축복이 붙었는데, 거기서는 이름 앞에
// 「축복받은」이 붙는 것 말고는 아무 일도 안 일어났다 — 효과 없는 이름표였다. 강화·재련
// 주문서 쪽은 실제로 다르게 동작하니 그대로 두고, 장비류의 헛이름만 뗀다.
test("축복은 강화·재련 주문서에만 붙는다 — 장비류는 안 붙는다", () => {
    // ── 물약·무기·방어구·반지·지팡이는 천 번을 굴려도 축복이 없다
    {
        const cats: Array<"potion" | "weapon" | "armor" | "ring" | "wand"> = [
            "potion",
            "weapon",
            "armor",
            "ring",
            "wand",
        ];
        for (const cat of cats) {
            const rng = new Rng(4000 + cats.indexOf(cat));
            for (let i = 0; i < 1000; i++) {
                const it = randomItem(10, i, -1, -1, rng, cat);
                assert.ok(!it.blessed, `${cat} 이 축복을 달고 나왔다 — 장비류에는 안 붙어야 한다`);
            }
        }
    }

    // ── 강화 주문서(무기·갑옷)는 여전히 확률적으로 축복이 붙는다
    {
        const rng = new Rng(4100);
        let sawBlessed = false;
        for (let i = 0; i < 500; i++) {
            const it = randomItem(10, i, -1, -1, rng, "enchant");
            if (it.type !== "blessed enchant" && it.blessed) sawBlessed = true;
        }
        assert.ok(sawBlessed, "강화 주문서에서 축복이 한 번도 안 나왔다");
    }

    // ── 일반 주문서 통(재련 포함)도 여전히 확률적으로 축복이 붙는다
    {
        const rng = new Rng(4200);
        let sawBlessed = false;
        for (let i = 0; i < 500; i++) {
            const it = randomItem(10, i, -1, -1, rng, "scroll");
            if (it.blessed) sawBlessed = true;
        }
        assert.ok(sawBlessed, "주문서 통에서 축복이 한 번도 안 나왔다 — 재련 축복이 죽었다");
    }
});
