// 이도류 — **직업마다 정해진 종류만.**
//
// 「가벼운 무기」라는 특성을 안 뒀다. 지금 사다리에 가벼운 날붙이가 단검 하나뿐이라,
// 특성으로 열면 이도류가 **4층에서 끝나는** 기능이 된다. 직업마다 한 종류를 못 박으면
// 새 무기 없이도 끝까지 살고, 무엇보다 **값이 저절로 붙는다** — 근위대가 장검 둘을
// 들면 12층의 진은검(4d5)을 포기하는 셈이다.
//
// 거는 것:
//
//   ① **직업이 정한 종류만.** 도적은 단검, 근위대는 단검·철퇴·창·장검. 연금술사·연구자는 없다.
//   ② **주손에 같은 종류를 쥐고 있어야** 한다 — 한 손에만 들면 그냥 한 자루다.
//   ③ **두 번 굴린다.** 보조손은 명중이 불리하고 피해에 **힘 보정이 안 얹힌다** —
//      그게 없으면 이도류가 그냥 피해 두 배라 한 자루를 쥘 까닭이 사라진다.
//   ④ **화면이 적는 것과 굴리는 것이 같다** — 상태 줄에 두 자루가 다 뜬다.
//   ⑤ 주손을 바꿔서 짝이 안 맞게 되면 **보조손이 저절로 내려간다.**

import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, perform } from "@/lib/rogue/game";
import { addToPack, canOffHand, heroAttackText, offHandWeapon } from "@/lib/rogue/hero";
import { makeItem } from "@/lib/rogue/items";
import { isDetail } from "@/lib/rogue/combat";
import { Rng } from "@/lib/rogue/rng";
import { spawnMonster } from "@/lib/rogue/monsters";
import { DUAL_WIELD } from "@/lib/rogue/origins";
import { T, idx, type GameState, type HeroOrigin } from "@/lib/rogue/types";

/** 그 직업으로 판을 열고, 같은 종류의 무기 둘을 배낭에 넣어 주손에 하나를 쥔다. */
function armed(seed: number, origin: HeroOrigin, type: string) {
    const s = newGame(seed, {}, {}, {}, {}, origin);
    const hero = s.heroes[0];
    const mk = (id: number) => {
        const it = makeItem("weapon", type, id, -1, -1);
        it.plusHit = 0;
        it.plusDam = 0;
        return addToPack(hero, it)!;
    };
    const main = mk(970);
    const off = mk(971);
    perform(s, { t: "wield", letter: main.letter! });
    return { s, hero, main, off };
}

test("직업이 정한 그 종류만 보조손에 쥔다", () => {
    // ── 도적은 단검, 근위대는 단검·철퇴·창·장검
    {
        for (const [origin, types] of Object.entries(DUAL_WIELD) as [HeroOrigin, string[]][]) {
            for (const type of types) {
                const { s, hero, off } = armed(5001, origin, type);
                assert.ok(canOffHand(hero, off), `${origin} 이 ${type} 을 보조손에 못 쥔다`);
                perform(s, { t: "offHand", letter: off.letter! });
                assert.equal(offHandWeapon(hero)?.id, off.id, `${origin} 의 보조손이 안 채워졌다`);
            }
        }
    }

    // ── 제 종류가 아니면 못 쥔다 — 도적에게 장검은 안 된다
    {
        const { s, hero } = armed(5002, "rogue", "long sword");
        const extra = hero.pack.filter((it) => it.type === "long sword")[1];
        assert.ok(!canOffHand(hero, extra), "도적이 장검을 보조손에 쥔다");
        const before = hero.offWeaponId;
        perform(s, { t: "offHand", letter: extra.letter! });
        assert.equal(hero.offWeaponId, before, "거절했는데 보조손이 채워졌다");
    }

    // ── 근위대도 허용 목록 밖의 무기를 보조손에 못 든다
    {
        const { hero, off } = armed(50021, "knight", "two-handed sword");
        assert.ok(!canOffHand(hero, off), "근위대가 양손검을 보조손에 쥔다");
    }

    // ── 이도류가 없는 직업은 아무것도 못 쥔다
    {
        for (const origin of ["alchemist", "scholar"] as HeroOrigin[]) {
            const { hero, off } = armed(5003, origin, "dagger");
            assert.ok(!canOffHand(hero, off), `${origin} 이 이도류를 쓴다`);
        }
    }

    // ── 주손에 같은 종류를 안 쥐고 있으면 못 쥔다
    {
        const { hero, off } = armed(5004, "rogue", "dagger");
        hero.weaponId = null; // 맨손
        assert.ok(!canOffHand(hero, off), "맨손인데 보조손만 채운다");
    }

    // ── 한 자루를 두 손에 들 수는 없다
    {
        const { hero, main } = armed(5005, "rogue", "dagger");
        assert.ok(!canOffHand(hero, main), "쥐고 있는 그 칼을 보조손에도 든다");
    }
});

test("이도류는 두 번 굴리고, 보조손은 불리하다", () => {
    /** 도적에게 단검 둘을 들리고 몬스터 하나를 붙여 세운다. */
    const duel = (seed: number, dual: boolean) => {
        const { s, hero, off } = armed(seed, "rogue", "dagger");
        if (dual) perform(s, { t: "offHand", letter: off.letter! });
        const mx = hero.x + 1;
        s.level.tiles[idx(mx, hero.y)] = T.FLOOR;
        const m = spawnMonster("Z", mx, hero.y, new Rng(seed));
        m.hp = 400;
        m.maxHp = 400;
        s.level.monsters = [m];
        return { s, hero, m };
    };

    // ── 한 자루면 굴림 줄이 하나, 두 자루면 둘이다
    {
        const one = duel(5101, false);
        perform(one.s, { t: "move", dx: 1, dy: 0 });
        const two = duel(5101, true);
        perform(two.s, { t: "move", dx: 1, dy: 0 });

        // **내가 휘두른 줄만** 센다 — 몬스터의 반격도 같은 모양의 굴림 줄을 남긴다.
        const swings = (st: GameState) =>
            st.messages
                .filter(isDetail)
                .filter((l) => l.startsWith("· 명중 나 ") || l.startsWith("· 명중 주손 ") || l.startsWith("· 명중 보조손 ")).length;
        assert.equal(swings(one.s), 1, "한 자루인데 굴림 줄이 하나가 아니다");
        assert.equal(swings(two.s), 2, "두 자루인데 굴림 줄이 둘이 아니다");
        assert.ok(
            two.s.messages.some((l) => l.startsWith("· 명중 주손 ")) && two.s.messages.some((l) => l.startsWith("· 명중 보조손 ")),
            "이도류 기록에서 주손과 보조손이 함께 구분되지 않는다",
        );
    }

    // ── **굴림 줄이 두 페널티를 그대로 보여 준다** — 화면이 아니라 엔진이 굴린 값이다
    {
        // 잡아 본 종이라야 산수를 펼친다(`seenBefore`). 안 그러면 피해 줄이 숫자 하나로 접힌다.
        const s = newGame(5150, { Z: 1 }, {}, {}, {}, "rogue");
        const hero = s.heroes[0];
        const mk = (id: number) => addToPack(hero, makeItem("weapon", "dagger", id, -1, -1))!;
        const main = mk(970);
        const off = mk(971);
        perform(s, { t: "wield", letter: main.letter! });
        perform(s, { t: "offHand", letter: off.letter! });

        // 명중은 굴림이라, **두 손이 다 맞은 턴**이 나올 때까지 여러 번 친다.
        let hitLine: string | undefined;
        let damLines: string[] = [];
        for (let n = 0; n < 200 && !hitLine; n++) {
            // **매번 다시 세운다** — 빗나간 턴에 영웅이 걸어가 버리면 자리가 어긋난다.
            hero.hp = hero.maxHp;
            const mx = hero.x + 1;
            s.level.tiles[idx(mx, hero.y)] = T.FLOOR;
            const m = spawnMonster("Z", mx, hero.y, new Rng(n));
            m.hp = 900;
            m.maxHp = 900;
            s.level.monsters = [m];
            const before = s.messages.length;
            perform(s, { t: "move", dx: 1, dy: 0 });
            const fresh = s.messages.slice(before).filter(isDetail);
            const off명중 = fresh.find((l) => l.startsWith("· 명중 보조손 "));
            // **몬스터의 반격도 `· 공격력` 줄을 남긴다** — 그 앞까지만 내 것이다.
            const stop = fresh.findIndex((l) => l.startsWith("· 명중 좀비"));
            const mine = stop >= 0 ? fresh.slice(0, stop) : fresh;
            const dam = mine.filter((l) => l.startsWith("· 공격력 "));
            if (off명중 && off명중.includes("맞았다") && dam.length >= 2) {
                hitLine = off명중;
                damLines = dam;
            }
        }
        assert.ok(hitLine, "예순 번을 쳤는데 보조손이 한 번도 안 맞았다");

        // ① 명중이 **불리하다** — 굴림 줄에 마이너스로 적힌다.
        assert.match(
            hitLine!,
            /[−-]\d+ 보조손/,
            `보조손의 명중 불리가 굴림에 안 실렸다: ${hitLine}`,
        );
        // ② 피해에 **힘이 안 얹힌다** — 주손 줄에는 「힘」이 있고 보조손 줄에는 없다.
        assert.ok(damLines.length >= 2, `공격력 줄이 둘이 아니다: ${JSON.stringify(damLines)}`);
        assert.ok(damLines[0].includes("힘"), `주손 공격력에 힘이 없다: ${damLines[0]}`);
        assert.ok(
            !damLines[1].includes("힘"),
            `보조손 공격력에 힘이 얹혔다 — 화면은 안 얹는다고 적는데 굴림은 얹는다: ${damLines[1]}`,
        );
    }

    // ── 두 자루가 **더 아프다** — 여러 번 때려서 합으로 본다(굴림이라 한 번으로는 못 센다)
    //
    // **표본이 적으면 이 합은 아무것도 안 말한다.** 40 판에서는 비가 2.07 까지 튀어
    // 「두 배보다는 덜」이 거짓이 된다. 400 판이면 1.55, 2000 판이면 1.48 로 가라앉는다 —
    // 재 보고 고른 수다. 규칙 자체를 거는 것은 위의 굴림 줄 블록이고, 여기는 **눈에 보이는
    // 결과가 그 규칙과 같은 쪽을 가리키는지**만 본다.
    {
        let hurtOne = 0;
        let hurtTwo = 0;
        for (let n = 0; n < 400; n++) {
            const one = duel(5200 + n, false);
            const two = duel(5200 + n, true);
            perform(one.s, { t: "move", dx: 1, dy: 0 });
            perform(two.s, { t: "move", dx: 1, dy: 0 });
            hurtOne += one.m.maxHp - one.m.hp;
            hurtTwo += two.m.maxHp - two.m.hp;
        }
        assert.ok(hurtTwo > hurtOne, `두 자루가 더 안 아프다 (${hurtOne} vs ${hurtTwo})`);
        // 그렇다고 **두 배는 아니다** — 보조손은 명중이 불리하고 힘 보정이 없다.
        assert.ok(
            hurtTwo < hurtOne * 2,
            `보조손이 주손과 똑같이 세다 (${hurtOne} vs ${hurtTwo}) — 한 자루를 쥘 까닭이 사라진다`,
        );
    }
});

test("화면이 적는 피해와 실제로 쥔 것이 같다", () => {
    const { s, hero, off } = armed(5301, "rogue", "dagger");
    const alone = heroAttackText(hero, s.known);
    perform(s, { t: "offHand", letter: off.letter! });
    const both = heroAttackText(hero, s.known);

    assert.ok(!alone.includes("+ "), `한 자루인데 두 자루로 적힌다: ${alone}`);
    assert.ok(both.includes("+ "), `두 자루인데 한 자루로 적힌다: ${both}`);
    // 보조손 몫에는 **힘 보정이 안 붙는다** — 두 몫이 같으면 규칙이 화면에 안 반영된 것이다.
    const [mainText, offText] = both.split(" + ");
    assert.notEqual(mainText, offText, `두 손의 피해가 같게 적힌다: ${both}`);
});

test("짝이 안 맞게 되면 보조손이 저절로 내려간다", () => {
    const { s, hero, off } = armed(5401, "rogue", "dagger");
    perform(s, { t: "offHand", letter: off.letter! });
    assert.ok(offHandWeapon(hero), "보조손이 안 채워졌다");

    // 주손을 장검으로 바꾼다 — 단검 보조손과 짝이 안 맞는다.
    const sword = addToPack(hero, makeItem("weapon", "long sword", 980, -1, -1))!;
    perform(s, { t: "wield", letter: sword.letter! });
    assert.equal(
        hero.offWeaponId,
        null,
        "짝이 안 맞는 이도류가 남았다 — 화면과 굴림이 조용히 어긋난다",
    );
    assert.ok(
        s.messages.some((m) => m.includes("보조손에서 내렸다")),
        "말없이 내려놨다",
    );
});
