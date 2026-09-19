// 도감 — **한 마리를 잡아야 그 종의 속을 안다.**
//
// 이 파일이 지키는 것 셋.
//
//   1. 잡기 전에는 스탯이 **아예 안 나간다.** 조금이라도 새면 「처음 보는 글자 앞에서
//      아무것도 모른 채 결정한다」가 무너지는데, 그 한 번이 이 게임에서 제일 무서운
//      순간이다.
//   2. **어떻게 잡았든 센다.** 손·지팡이·던지기가 따로 세면 「지팡이로만 잡아 본 종은
//      영영 모른다」가 되고, 그건 규칙이 아니라 빠뜨린 자리다.
//   3. 도망친 것은 잡은 것이 아니다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { bestiaryProgress, bestiaryRows, newGame, perform, survey } from "@/lib/rogue/game";
import { makeItem } from "@/lib/rogue/items";
import { MONSTERS, spawnMonster } from "@/lib/rogue/monsters";
import { defenseOf } from "@/lib/rogue/items";
import { Rng } from "@/lib/rogue/rng";
import { idx, type GameState } from "@/lib/rogue/types";

/** 내 옆에 원하는 놈을 한 마리 세운다. 그 칸은 반드시 비운다. */
function placeNextTo(s: GameState, ch: string, hp = 1) {
    const x = s.heroes[0].x + 1;
    const y = s.heroes[0].y;
    s.level.tiles[idx(x, y)] = 1; // 방 바닥
    s.level.monsters = s.level.monsters.filter((m) => !(m.x === x && m.y === y));
    const m = spawnMonster(ch, x, y, new Rng(7));
    m.hp = hp;
    m.maxHp = Math.max(hp, m.maxHp);
    s.level.monsters.push(m);
    return m;
}

test("잡기 전에는 속을 안 보이고, 한 마리 잡으면 알게 된다", () => {
    // ── 잡기 전에는 조사해도 속이 안 나온다
    {
        const s = newGame(301);
        placeNextTo(s, "S", 30);

        const seen = survey(s).find((x) => x.ch === "S");
        assert.ok(seen, "옆에 세운 놈이 조사에 안 보인다");
        assert.equal(seen!.known, false);
        assert.equal(seen!.kills, 0);
        // **한 조각도 새면 안 된다.**
        assert.equal(seen!.level, undefined);
        assert.equal(seen!.defense, undefined);
        assert.equal(seen!.damage, undefined);
        assert.equal(seen!.exp, undefined);
        assert.equal(seen!.hp, undefined);
        assert.equal(seen!.mean, undefined);
        // 눈으로 보이는 것은 잡아 본 적이 없어도 안다.
        assert.ok(seen!.condition);
        assert.equal(seen!.distance, 1);
    }

    // ── 한 마리를 잡으면 그 뒤로는 속을 안다
    {
        let s = newGame(302);
        placeNextTo(s, "S", 1);

        // 한 방에 죽을 때까지 때린다.
        for (let i = 0; i < 40 && (s.bestiary.S ?? 0) === 0; i++) {
            s = perform(s, { t: "move", dx: 1, dy: 0 });
            if (s.level.monsters.every((m) => m.def.ch !== "S")) break;
        }
        assert.equal(s.bestiary.S, 1, "옆의 뱀을 못 잡았다");
        assert.ok(
            s.messages.some((m) => m.includes("처음 잡았다")),
            "처음 잡은 것을 화면이 말하지 않았다",
        );

        // 다시 만나면 속이 보인다.
        placeNextTo(s, "S", 5);
        const seen = survey(s).find((x) => x.ch === "S")!;
        assert.equal(seen.known, true);
        assert.equal(seen.level, MONSTERS.S.level);
        assert.equal(seen.defense, defenseOf(MONSTERS.S.armor));
        assert.equal(seen.exp, MONSTERS.S.exp);
        assert.equal(seen.hp, MONSTERS.S.hp);
        assert.deepEqual(seen.damage, MONSTERS.S.damage);
    }
});

test("무엇으로 잡았든 도감에 오른다 — 도망친 놈은 아니다", () => {
    // ── 지팡이로 잡아도 도감에 들어간다
    {
        const s = newGame(303);
        const m = placeNextTo(s, "O", 1);
        const wand = makeItem("wand", "magic missile", 990, -1, -1);
        wand.charges = 3;
        wand.letter = "z";
        s.heroes[0].pack.push(wand);

        const after = perform(s, { t: "zap", letter: "z", dx: 1, dy: 0 });
        assert.ok(after.level.monsters.every((x) => x.id !== m.id), "지팡이에 안 죽었다");
        assert.equal(after.bestiary.O, 1, "지팡이로 잡은 것이 도감에 안 들어갔다");
    }

    // ── 던져서 잡아도 도감에 들어간다
    {
        const s = newGame(304);
        // 던진 것이 맞아야 하므로 체력을 1 로 두고 여러 번 던진다.
        const dagger = makeItem("weapon", "dagger", 991, -1, -1);
        dagger.count = 20;
        dagger.plusHit = 10; // 반드시 맞도록
        // 갑옷을 뚫도록 손질도 넉넉히 — 피해가 방어력에 다 깎이면 못 죽인다.
        dagger.plusDam = 20;
        dagger.letter = "z";
        s.heroes[0].pack.push(dagger);

        let cur: GameState = s;
        for (let i = 0; i < 20 && !(cur.bestiary.H > 0); i++) {
            placeNextTo(cur, "H", 1);
            cur = perform(cur, { t: "throw", letter: "z", dx: 1, dy: 0 });
        }
        assert.ok((cur.bestiary.H ?? 0) > 0, "던져서 잡은 것이 도감에 안 들어갔다");
    }

    // ── 도망친 놈은 잡은 것이 아니다
    {
        const s = newGame(305);
        // 레프러콘은 금화를 채고 스스로 사라진다 — 그건 내가 잡은 것이 아니다.
        const m = placeNextTo(s, "L", 40);
        m.awake = true;
        s.heroes[0].gold = 500;

        let cur: GameState = s;
        for (let i = 0; i < 60 && cur.level.monsters.some((x) => x.id === m.id); i++) {
            cur = perform(cur, { t: "rest" });
        }
        if (cur.level.monsters.some((x) => x.id === m.id)) return; // 끝내 안 훔쳤으면 이 판으로는 못 잰다
        assert.equal(cur.bestiary.L ?? 0, 0, "도망친 레프러콘이 도감에 들어갔다");
    }
});

test("도감은 새 판으로 이어지고, 약한 것부터 선다", () => {
    // ── 도감은 새 판으로 이어진다 — 죽어도 남는 유일한 것
    {
        const kept = { S: 3, O: 1 };
        const s = newGame(308, kept);
        assert.deepEqual(s.bestiary, kept);
        assert.equal(bestiaryProgress(s.bestiary).found, 2);
        assert.equal(bestiaryProgress(s.bestiary).total, 26);

        // 넘긴 객체를 게임이 물들이면 안 된다 — 부르는 쪽의 값이 몰래 바뀐다.
        placeNextTo(s, "S", 1);
        for (let i = 0; i < 40; i++) perform(s, { t: "move", dx: 1, dy: 0 });
        assert.equal(kept.S, 3, "넘긴 도감이 게임 안에서 바뀌었다");
    }

    // ── 도감 목록은 잡은 것만, 약한 것부터
    {
        const rows = bestiaryRows({ D: 1, S: 2, T: 1 });
        assert.deepEqual(rows.map((r) => r.ch), ["S", "T", "D"]);
        assert.equal(rows[0].kills, 2);
        assert.equal(rows[0].name, MONSTERS.S.name);
        // 안 잡은 것은 목록에 아예 없다.
        assert.equal(bestiaryRows({}).length, 0);
    }
});

// ── 수법 ────────────────────────────────────────────────────────────────
//
// 도감에는 **열쇠가 둘** 있다. 잡으면 속(능력치)이 열리고, **당해 봐야 수법이 열린다.**
// 둘을 한 칸에 담으면 님프를 열 마리 잡아 본 사람과 물건을 털려 본 사람이 같은
// 도감을 보게 되는데, 그 둘이 아는 것은 전혀 다르다.

/** 옆의 놈에게 수법을 당할 때까지 쉰다. 못 당하면 `null`. */
function suffer(s: GameState, ch: string, tries = 400): GameState | null {
    // **들어올 때보다 한 번 더** 당할 때까지 쉰다. `> 0` 으로 보면 두 번째로 부를 때
    // 이미 참이라 첫 턴에 그냥 돌아오고, 그 한 턴에 또 당하느냐는 **운**이 된다 —
    // 여태 통과한 것도 그 운이었고, 난수 줄기가 한 칸 밀리자 깨졌다.
    const before = s.specials[ch] ?? 0;
    for (let i = 0; i < tries; i++) {
        s = perform(s, { t: "rest" });
        if ((s.specials[ch] ?? 0) > before) return s;
        // 아쿠에이터는 피해를 안 주지만 다른 놈이 끼어들어 죽일 수는 있다.
        if (s.phase !== "playing") return null;
        if (!s.level.monsters.some((m) => m.def.ch === ch)) return null;
    }
    return null;
}

// 아쿠에이터는 **갑옷의 손질을 0 아래로는 못 녹인다.**
//
// 바닥이 없던 때에는 한 마리에게 오래 붙들리면 `+0` 판금이 `−7` 짜리가 되어 **안 입느니만
// 못한 갑옷**이 되었다. 그러면 「벗을까」가 아니라 「이 판은 끝났다」가 되고, 되돌릴 길은
// 강화 주문서뿐이다. 깎을 것이 남았을 때만 녹는다.
test("아쿠에이터는 갑옷을 0 아래로 못 녹인다", async () => {
    const { equippedArmor } = await import("@/lib/rogue/hero");

    // ── 녹을 것이 있으면 녹는다 (수법 자체는 살아 있어야 한다)
    {
        let melted = false;
        for (let n = 0; n < 20 && !melted; n++) {
            const s = newGame(3300 + n);
            const armor = equippedArmor(s.heroes[0]);
            if (!armor) continue;
            armor.plusArmor = 2;
            const m = placeNextTo(s, "A", 500);
            m.awake = true;
            const after = suffer(s, "A");
            if (!after) continue;
            melted = (equippedArmor(after.heroes[0])?.plusArmor ?? 2) < 2;
        }
        assert.ok(melted, "스무 판을 붙였는데 아쿠에이터가 한 번도 안 녹였다 — 수법이 죽었다");
    }

    // ── **0 에서는 더 안 녹는다** — 오래 붙들려도 마이너스로 안 내려간다
    {
        const s = newGame(3401);
        const armor = equippedArmor(s.heroes[0]);
        assert.ok(armor, "처음 판에 갑옷이 없다");
        armor!.plusArmor = 0;
        const m = placeNextTo(s, "A", 9999);
        m.awake = true;
        // 아쿠에이터는 피해를 안 주므로(`0d0`) 오래 붙어 있어도 안 죽는다.
        let now = s;
        for (let i = 0; i < 300; i++) {
            now = perform(now, { t: "rest" });
            if (now.phase !== "playing") break;
            assert.ok(
                (equippedArmor(now.heroes[0])?.plusArmor ?? 0) >= 0,
                `${i}턴째에 갑옷이 0 아래로 녹았다 (${equippedArmor(now.heroes[0])?.plusArmor})`,
            );
        }
        assert.ok(
            now.messages.some((t) => t.includes("더 녹을 것이 없다")),
            "삼백 턴을 붙어 있었는데 「더 녹을 것이 없다」가 한 번도 안 떴다 — 이 주장이 아무것도 안 가린다",
        );
    }
});

test("수법은 표와 방아쇠가 한 짝이다", () => {
    // `damage` 의 `"0d0"` 이 특수 공격의 **유일한 방아쇠**다(`combat.ts`). 이름만
    // 있고 방아쇠가 없으면 **영영 안 열리는 도감 칸**이 되고, 방아쇠만 있고 이름이
    // 없으면 당하고도 도감이 빈다. 둘은 반드시 같이 움직여야 한다.
    for (const [ch, d] of Object.entries(MONSTERS)) {
        assert.equal(
            d.damage.includes("0d0"),
            d.special !== undefined,
            `${ch} ${d.name}: 방아쇠(0d0)와 수법 이름이 짝이 안 맞는다`,
        );
    }
    // 지금 수법을 가진 것은 여섯이다 — 이 수가 말없이 늘거나 줄면 알아야 한다.
    const withSpecial = Object.keys(MONSTERS).filter((ch) => MONSTERS[ch].special);
    assert.deepEqual(withSpecial, ["A", "F", "I", "L", "N", "W"]);
});

test("잡아서 아는 것과 당해서 아는 것은 따로다", () => {
    // ── 잡기만 해서는 수법 칸이 안 열린다
    {
        const rows = bestiaryRows({ A: 5 }, {});
        assert.equal(rows.length, 1);
        assert.equal(rows[0].hasSpecial, true, "아쿠에이터는 수법이 있는 종이다");
        assert.equal(rows[0].special, null, "안 당해 봤는데 수법이 적혔다");
        assert.equal(rows[0].suffered, 0);
    }

    // ── 당해 보면 열린다
    {
        const rows = bestiaryRows({ A: 5 }, { A: 2 });
        assert.equal(rows[0].special, MONSTERS.A.special);
        assert.equal(rows[0].suffered, 2);
    }

    // ── 수법이 아예 없는 종은 둘 다 비어 있다 — 「모른다」와 「없다」는 다르다
    {
        const rows = bestiaryRows({ S: 1 }, { S: 9 });
        assert.equal(rows[0].hasSpecial, false);
        assert.equal(rows[0].special, null);
    }

    // ── 안 잡은 종은 당해 봤어도 목록에 없다 — 목록에 서는 열쇠는 여전히 잡은 것이다
    assert.equal(bestiaryRows({}, { N: 3 }).length, 0);
});

test("수법은 당한 순간 적히고, 처음 한 번만 말한다", () => {
    const s0 = newGame(321);
    const m = placeNextTo(s0, "A", 200);
    m.awake = true;
    // 갑옷이 있어야 아쿠에이터가 녹일 것이 있다.
    assert.ok(s0.heroes[0].armorId, "처음 판에 갑옷이 없다");

    const s = suffer(s0, "A");
    assert.ok(s, "아쿠에이터가 400턴 동안 한 번도 안 녹였다");
    assert.ok((s!.specials.A ?? 0) >= 1);
    const learned = s!.messages.filter((t) => t.includes("수법을 알았다"));
    assert.equal(learned.length, 1, "처음 당한 것을 한 번만 말해야 한다");
    assert.ok(learned[0].includes(MONSTERS.A.name));

    // 잡지 않았으므로 도감 **목록**에는 아직 없다. 그래도 기록은 남아서,
    // 나중에 한 마리를 잡는 순간 수법이 이미 적혀 있다.
    assert.equal(s!.bestiary.A ?? 0, 0);
    assert.equal(bestiaryRows(s!.bestiary, s!.specials).length, 0);
    assert.equal(bestiaryRows({ A: 1 }, s!.specials)[0].special, MONSTERS.A.special);

    // ── 두 번째부터는 조용하다
    const before = s!.messages.length;
    const again = suffer(s!, "A");
    assert.ok(again, "두 번째를 못 당했다");
    assert.ok(again!.specials.A >= 2);
    assert.equal(
        again!.messages.slice(before).filter((t) => t.includes("수법을 알았다")).length,
        0,
        "이미 아는 수법을 또 알았다고 말한다",
    );
});

test("무력화된 놈에게서는 배울 것이 없다", () => {
    // 무력화 지팡이를 맞은 놈은 **아무 일도 못 한다.** 헛손질을 본 것으로 수법을
    // 알게 되면 지팡이가 도감 여는 도구가 된다.
    const s = newGame(322);
    const m = placeNextTo(s, "A", 200);
    m.awake = true;
    m.cancelled = true;

    let cur: GameState = s;
    for (let i = 0; i < 200; i++) cur = perform(cur, { t: "rest" });
    assert.ok(
        cur.messages.some((t) => t.includes("헛되이 달려든다")),
        "무력화된 놈이 달려들지도 않았다 — 이 판으로는 못 잰다",
    );
    assert.equal(cur.specials.A ?? 0, 0, "무력화된 놈에게서 수법을 배웠다");
});

test("수법도 판을 넘어 남는다", () => {
    const kept = { A: 2, N: 1 };
    const s = newGame(323, {}, kept);
    assert.deepEqual(s.specials, kept);

    // 넘긴 객체를 게임이 물들이면 안 된다 — 부르는 쪽의 값이 몰래 바뀐다.
    const m = placeNextTo(s, "A", 200);
    m.awake = true;
    suffer(s, "A");
    assert.equal(kept.A, 2, "넘긴 수법 기록이 게임 안에서 바뀌었다");

    // 안 넘기면 빈칸에서 시작한다 — 옛 저장에는 이 칸이 아예 없다.
    assert.deepEqual(newGame(324).specials, {});
});

test("묶는 수법은 빠져나올 수 있어야 한다", () => {
    // **잠은 턴당 1씩만 풀리는데 상대는 매 턴 때린다.** 그냥 더하면 쌓이는 속도가
    // 풀리는 속도를 앞질러 영영 못 움직인다 — 얼음괴물 옆에서 299턴을 내리 묶였다.
    // 얼음괴물은 1층부터 나오는 놈이라 그건 수법이 아니라 사형 선고다.
    //
    // 값에 상한만 씌우는 것으로는 안 된다: 남은 턴이 4 를 안 넘어도 **매 턴 다시 채워지면**
    // 갇힌 것은 똑같다. 그래서 묶는 것은 **한 번에 한 번**이다.
    for (const ch of ["I", "F"]) {
        let worst = 0;
        for (let seed = 1; seed <= 40; seed++) {
            const s0 = newGame(seed * 13);
            const m = placeNextTo(s0, ch, 9999);
            m.awake = true;
            let s: GameState = s0;
            let streak = 0;
            for (let t = 0; t < 200; t++) {
                s.heroes[0].hp = s.heroes[0].maxHp; // 죽는 것 말고 **묶이는 것**만 잰다
                const before = s.heroes[0].asleep;
                s = perform(s, { t: "move", dx: -1, dy: 0 });
                if (before > 0) streak++;
                else {
                    worst = Math.max(worst, streak);
                    streak = 0;
                }
            }
            worst = Math.max(worst, streak);
        }
        assert.ok(
            worst <= 20,
            `${MONSTERS[ch].name} 옆에서 ${worst} 턴을 내리 묶였다 — 빠져나올 수 없으면 수법이 아니라 사형 선고다`,
        );
    }
});
