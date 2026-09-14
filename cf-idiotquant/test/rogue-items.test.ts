// 반지 · 지팡이 · 던지기 · 저주 · 함정 · 비밀문.
//
// 이 파일이 지키는 것 중 제일 중요한 둘:
//
//   1. **저주받은 것은 벗을 수 없다.** 이 한 줄이 「좋아 보이는 것을 집는 일」에 값을
//      매긴다. 조용히 벗겨지면 저주는 그냥 −1 짜리 물건이 된다.
//   2. **반지는 배를 더 고프게 한다.** 이 대가가 없으면 두 손에 둘을 안 낄 이유가 없다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, perform } from "@/lib/rogue/game";
import { heroArmor, heroDefense, heroStr, hungerRate, packItem, wornRings } from "@/lib/rogue/hero";
import { itemPower, makeItem } from "@/lib/rogue/items";
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
    const d = dirs.find(([dx, dy]) => walkable(s.level.tiles[idx(s.hero.x + dx, s.hero.y + dy)] as Tile));
    if (!d) throw new Error("사방이 막힌 자리에서 시작했다");
    return d;
}

/** 배낭에 물건 하나를 밀어 넣고 그 글자를 준다. */
function give(s: GameState, it: Item, letter: string): string {
    it.letter = letter;
    it.x = -1;
    it.y = -1;
    s.hero.pack.push(it);
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
        assert.equal(s1.hero.armorId, bad.id);
        assert.ok(bad.curseKnown, "입었는데 저주가 안 드러났다");

        // 다른 갑옷으로 못 바꾼다.
        const s2 = perform(s1, { t: "wear", letter: "z" });
        assert.equal(s2.hero.armorId, bad.id, "저주받은 갑옷이 벗겨졌다");
        // 내려놓지도 못한다.
        const s3 = perform(s2, { t: "drop", letter: "y" });
        assert.ok(packItem(s3.hero, "y"), "저주받은 갑옷을 내려놓았다");

        // 저주 해제 주문서를 읽으면 풀린다.
        give(s3, makeItem("scroll", "remove curse", 902, -1, -1), "x");
        const s4 = perform(s3, { t: "read", letter: "x" });
        assert.ok(!bad.cursed, "저주가 안 풀렸다");
        const s5 = perform(s4, { t: "wear", letter: "z" });
        assert.equal(s5.hero.armorId, good.id, "풀린 뒤에도 못 바꾼다");
    }

    // ── 보호 반지는 방어를 내리고, 힘 반지는 힘을 올린다
    {
        const s0 = newGame(102);
        const base = heroArmor(s0.hero);
        const prot = makeItem("ring", "protection", 910, -1, -1);
        prot.plusRing = 2;
        give(s0, prot, "y");

        const s1 = perform(s0, { t: "putOn", letter: "y" });
        assert.equal(heroArmor(s1.hero), base - 2, "보호 반지가 방어 등급을 **내려야** 한다");

        const str0 = heroStr(s1.hero);
        const might = makeItem("ring", "add strength", 911, -1, -1);
        might.plusRing = 3;
        give(s1, might, "z");
        const s2 = perform(s1, { t: "putOn", letter: "z" });
        assert.equal(heroStr(s2.hero), str0 + 3);
        assert.equal(wornRings(s2.hero).length, 2);

        // 세 번째는 낄 손이 없다.
        give(s2, makeItem("ring", "searching", 912, -1, -1), "w");
        const s3 = perform(s2, { t: "putOn", letter: "w" });
        assert.equal(wornRings(s3.hero).length, 2, "손이 셋이 되었다");
    }
});

test("반지는 배를 더 고프게 하고, 저주받은 것은 못 뺀다", () => {
    // ── 반지를 끼면 배가 더 고프다 — 이 대가가 없으면 반지는 공짜다
    {
        const s0 = newGame(103);
        assert.equal(hungerRate(s0.hero), 1);

        give(s0, makeItem("ring", "regeneration", 920, -1, -1), "y");
        const s1 = perform(s0, { t: "putOn", letter: "y" });
        assert.ok(hungerRate(s1.hero) > 1, "재생 반지가 공짜다");

        // 실제로 시계가 더 빨리 돈다.
        const before = s1.hero.food;
        const s2 = perform(s1, { t: "rest" });
        assert.equal(before - s2.hero.food, hungerRate(s2.hero));

        // 소화 억제는 반대로 간다.
        const s3 = perform(s2, { t: "removeRing", letter: "y" });
        give(s3, makeItem("ring", "slow digestion", 921, -1, -1), "z");
        const s4 = perform(s3, { t: "putOn", letter: "z" });
        assert.ok(hungerRate(s4.hero) < 1, "소화 억제가 안 듣는다");
    }

    // ── 저주받은 반지는 뺄 수 없다
    {
        const s0 = newGame(104);
        const bad = makeItem("ring", "adornment", 930, -1, -1);
        bad.cursed = true;
        give(s0, bad, "y");
        const s1 = perform(s0, { t: "putOn", letter: "y" });
        const s2 = perform(s1, { t: "removeRing", letter: "y" });
        assert.equal(wornRings(s2.hero).length, 1, "저주받은 반지가 빠졌다");
    }
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
        m.x = s0.hero.x + dx;
        m.y = s0.hero.y + dy;
        m.hp = 60;
        m.maxHp = 60;

        const s1 = perform(s0, { t: "zap", letter: "y", dx, dy });
        assert.equal(wand.charges, 1);
        assert.ok(m.hp < 60, "맞았는데 체력이 그대로다");
        assert.ok(s1.known["wand:magic missile"], "맞혔는데 정체를 모른다");

        perform(s1, { t: "zap", letter: "y", dx, dy });
        assert.equal(wand.charges, 0);
        const hpBefore = m.hp;
        perform(s1, { t: "zap", letter: "y", dx, dy });
        assert.equal(m.hp, hpBefore, "빈 지팡이가 피해를 줬다");
    }

    // ── 둔화 지팡이는 몬스터를 두 턴에 한 번만 움직이게 한다
    {
        const s0 = newGame(106);
        const wand = makeItem("wand", "slow monster", 950, -1, -1);
        wand.charges = 3;
        give(s0, wand, "y");
        const m = s0.level.monsters[0];
        m.x = s0.hero.x + 1;
        m.y = s0.hero.y;
        assert.equal(m.speed, 0);
        perform(s0, { t: "zap", letter: "y", dx: 1, dy: 0 });
        assert.equal(m.speed, -1, "둔화가 안 걸렸다");
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
        assert.equal(packItem(s1.hero, "y"), undefined, "던진 단검이 배낭에 남았다");
        assert.equal(s1.level.items.length, before + 1, "던진 단검이 사라졌다");

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
        assert.ok(packItem(s1.hero, "y"), "제자리로 던져서 물건이 사라졌다");
    }
});

test("비밀문은 뒤져야 열리고, 함정은 밟으면 터진다", () => {
    // ── 비밀문은 찾기 전에는 벽이고, 뒤지면 문이 된다
    {
        // 비밀문이 있는 층을 찾는다 — 깊을수록 잦다.
        let s: GameState | null = null;
        for (let seed = 1; seed <= 300 && !s; seed++) {
            const g = newGame(seed);
            for (let d = 0; d < 12 && g.level.depth < 12; d++) {
                g.hero.x = g.level.stairs.x;
                g.hero.y = g.level.stairs.y;
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
        s!.hero.x = sx + side![0];
        s!.hero.y = sy + side![1];
        // 비밀문은 걸어 들어갈 수 있는 칸이 아니다.
        const blocked = perform(s!, { t: "move", dx: -side![0], dy: -side![1] });
        assert.ok(
            blocked.hero.x !== sx || blocked.hero.y !== sy,
            "찾지도 않은 비밀문을 지나갔다",
        );

        // 뒤지는 동안 맞아 죽으면 뒤지기를 못 재게 된다 — 이 테스트가 보는 것은 비밀문이다.
        s!.level.monsters.length = 0;
        s!.hero.hp = s!.hero.maxHp;

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
        const tx = s0.hero.x + 1;
        const ty = s0.hero.y;
        // 오른쪽이 막혀 있으면 이 판으로는 못 잰다.
        s0.level.tiles[idx(tx, ty)] = T.FLOOR;
        s0.level.monsters = s0.level.monsters.filter((m) => !(m.x === tx && m.y === ty));
        s0.level.traps.push({ x: tx, y: ty, kind: "beartrap", found: false });

        const s1 = perform(s0, { t: "move", dx: 1, dy: 0 });
        assert.equal(s1.hero.x, tx);
        assert.ok(s1.hero.stuck > 0, "곰덫을 밟았는데 안 묶였다");
        assert.ok(s1.level.traps[s1.level.traps.length - 1].found, "밟은 함정이 안 드러났다");

        // 묶인 동안에는 못 걷는다.
        const x = s1.hero.x;
        const s2 = perform(s1, { t: "move", dx: 1, dy: 0 });
        assert.equal(s2.hero.x, x, "덫에 걸렸는데 걸어 나갔다");
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
        assert.equal(itemPower(a, { "armor:plate mail": true }), "방어력 10");
    }

    // ── 배낭에 적는 숫자와 실제로 맞는 방어가 같다
    {
        // 갈리면 화면은 방어 3 이라 적고 몸은 2 로 맞는다.
        const s = newGame(920);
        const armor = makeItem("armor", "plate mail", 930, -1, -1);
        armor.plusArmor = 2;
        armor.letter = "z";
        s.hero.pack.push(armor);
        s.hero.armorId = armor.id;
        s.known["armor:plate mail"] = true;
        assert.equal(itemPower(armor, s.known), `방어력 ${heroDefense(s.hero)}`);
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
        s.hero.pack.push(darts);
        const [dx, dy] = openWay(s);
        for (let i = 0; i < 6; i++) s = perform(s, { t: "throw", letter: "z", dx, dy });
        assert.equal(packItem(s.hero, "z"), undefined, "여섯 개를 다 안 던졌다");
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
        const mace = makeItem("weapon", "mace", 970, s.hero.x + dx, s.hero.y + dy, 1);
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
