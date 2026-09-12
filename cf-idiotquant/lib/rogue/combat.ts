/**
 * 싸움 — 원작의 식 그대로.
 *
 * ```
 *   res  = rnd(20) + 1          // 다면체 주사위가 여기서 굴러간다
 *   need = (20 - 때리는 쪽 레벨) - 맞는 쪽 방어등급
 *   맞았다 = res + 보정 >= need
 * ```
 *
 * **방어 등급은 낮을수록 단단하다.** 낮으면 `need` 가 커지고, 커지면 맞히기 어렵다.
 * 이 방향을 뒤집으면 갑옷을 입을수록 잘 맞는 게임이 된다 — 실제로 흔한 실수라
 * `test/rogue-combat.test.ts` 가 판금 갑옷과 맨몸을 견줘 본다.
 *
 * 특수 공격(0d0)은 피해 대신 **다른 것을 가져간다** — 금화·물건·갑옷·정신. 그 목록이
 * Rogue 를 Rogue 로 만드는 자리라 피해 없는 몬스터도 무섭다.
 */

import {
    Rng,
} from "./rng";
import {
    defenseOf,
    describe,
} from "./items";

// 방어를 뒤집는 자리는 `items.ts` 에 있다(갑옷의 값이라서). 싸움 쪽에서 찾는 것이
// 자연스러운 이름이라 여기서 그대로 다시 내보낸다.
export { defenseOf };
import {
    equippedArmor,
    equippedWeapon,
    heroArmor,
    heroDamageDice,
    heroStr,
    strDamBonus,
    strHitBonus,
    takeFromPack,
} from "./hero";
import {
    type GameState,
    type Hero,
    type Monster,
} from "./types";

/** 한 번의 겨룸 — 때리는 쪽과 막는 쪽이 **각자 d20 을 굴린다.** */
export interface Contest {
    hit: boolean;
    atkRoll: number;
    atkTotal: number;
    defRoll: number;
    defTotal: number;
}

/**
 * 때리기 한 번.
 *
 * ```
 *   공격 = d20 + 레벨 + 보정        (무기 손질 · 힘)
 *   방어 = d20 + 방어               (갑옷 · 보호 반지, 클수록 좋다)
 *   맞았다 = 공격 > 방어
 * ```
 *
 * **막는 쪽도 굴린다.** 예전에는 때리는 쪽만 굴리고 상대의 방어는 문턱에 박힌 고정
 * 숫자였다 — 그러면 갑옷이 「확률을 조금 깎는 설정값」이지 판에서 일어나는 일이 아니다.
 * 둘 다 굴리면 한 번의 겨룸이 화면에 그대로 보이고, 갑옷이 매번 일한다.
 *
 * **비기면 막은 것으로 친다.** 때리는 쪽이 넘어서야 한다 — 어느 한쪽으로 정해 두지
 * 않으면 「같으면?」이 두 자리에서 다르게 풀린다.
 */
export function contest(atkBonus: number, defBonus: number, rng: Rng): Contest {
    const atkRoll = rng.rnd(20) + 1;
    const defRoll = rng.rnd(20) + 1;
    const atkTotal = atkRoll + atkBonus;
    const defTotal = defRoll + defBonus;
    return { hit: atkTotal > defTotal, atkRoll, atkTotal, defRoll, defTotal };
}

/**
 * **계산을 보여 주는 줄**은 이 표시로 시작한다.
 *
 * 화면 위 두 줄 띠는 마지막 두 줄만 보여 준다. 계산 줄이 거기 섞이면 띠가 산수로
 * 가득 차고 **무슨 일이 났는지가 밀려난다.** 그래서 띠는 이 표시가 붙은 줄을 걸러
 * 내고, 기록 판만 전부 보여 준다. 엔진이 붙이고 화면이 읽는다 — 화면이 「이건
 * 계산 줄이군」 하고 다시 판단하지 않게.
 */
export const DETAIL = "· ";

export function isDetail(line: string): boolean {
    return line.startsWith(DETAIL);
}

/** 굴림에 얹히는 것 하나 — 얼마가, 무엇 때문에. */
export interface Term {
    n: number;
    why: string;
}

/** ` +1무기 +2힘` — 0인 것은 아예 안 적는다. 없는 보정을 적으면 줄만 길어진다. */
function terms(list: Term[]): string {
    return list
        .filter((t) => t.n !== 0)
        .map((t) => ` ${t.n > 0 ? "+" : "−"}${Math.abs(t.n)}${t.why}`)
        .join("");
}

/** 도감에 오른 종인가 — **잡아 본 적이 있어야 숫자를 준다.** */
export function seenBefore(state: GameState, m: Monster): boolean {
    return (state.bestiary[m.def.ch] ?? 0) > 0;
}

/** 한쪽의 굴림을 적는다 — `d20 13 +1무기 +1힘 = 15`. */
function side(rolls: number[], bonuses: Term[], total: number | null): string {
    const add = terms(bonuses);
    const sum = bonuses.reduce((a, t) => a + t.n, 0);
    // 여러 번 때리는 놈은 눈이 여러 개다. 그때는 합을 적지 않는다 — 어느 눈의 합인지
    // 알 수 없어서다.
    if (rolls.length !== 1) return `d20 ${rolls.join(", ")}${add}`;
    return sum === 0 ? `d20 ${rolls[0]}${add}` : `d20 ${rolls[0]}${add} = ${total ?? rolls[0] + sum}`;
}

/**
 * 겨룸 한 줄 — **양쪽의 굴림을 나란히 적는다.**
 *
 * ```
 * · 나 d20 13 +1레벨 +1무기 = 15  vs  트롤 d20 7 +6방어 = 13  → 맞았다
 * ```
 *
 * 막는 쪽은 **합만** 적고 보정 내역은 안 적는다. 내역을 적으면 방어 수치가 그대로
 * 나가고, 「잡아 봐야 안다」는 도감 규칙이 무너진다. 합은 주사위가 섞여 있어 한 번
 * 봐서는 방어를 못 집어낸다 — 여러 번 싸워서 눈대중하는 것은 표를 읽는 것과 다르다.
 *
 * 잡아 본 종이면 내역까지 적는다(`defTerms`). 이미 도감에 다 있는 값이다.
 */
export function contestLine(
    atkName: string,
    atkRolls: number[],
    atkTerms: Term[],
    atkTotal: number | null,
    defName: string,
    defRoll: number,
    defTerms: Term[] | null,
    defTotal: number,
    outcome: string,
): string {
    const def =
        defTerms === null
            ? `d20+방어 = ${defTotal}`
            : side([defRoll], defTerms, defTotal);
    return `${DETAIL}${atkName} ${side(atkRolls, atkTerms, atkTotal)}  vs  ${defName} ${def}  → ${outcome}`;
}

/**
 * 피해 계산 줄.
 *
 * `dice` 가 없으면 **총합만** 적는다. 체력이 줄어드는 것은 어차피 보이지만 상대의
 * 피해 주사위 표기(`2d6`)는 표의 값이라, 부르는 쪽이 안 넘긴다.
 */
export function damageLine(
    dice: string | null,
    rolled: number,
    bonuses: Term[],
    total: number,
): string {
    if (!dice) return `${DETAIL}피해: ${total}`;
    const add = terms(bonuses);
    const sum = bonuses.reduce((a, t) => a + t.n, 0);
    const raw = rolled + sum;
    // 깎여서 0 이하가 되면 1 로 올린다(`Math.max`). 그 자리를 안 적으면 식과 결과가
    // 안 맞아 보인다.
    const floored = total !== raw ? ` → 최소 ${total}` : "";
    return `${DETAIL}피해: ${dice} → ${rolled}${add}${sum !== 0 ? ` = ${raw}` : ""}${floored}`;
}

export interface AttackResult {
    hit: boolean;
    roll: number;
    damage: number;
    killed: boolean;
    messages: string[];
}

/** 내가 때릴 때 공격 굴림에 얹히는 것들. */
export function heroHitTerms(hero: GameState["hero"]): Term[] {
    const weapon = equippedWeapon(hero);
    return [
        { n: hero.level, why: "레벨" },
        { n: weapon?.plusHit ?? 0, why: "무기" },
        { n: strHitBonus(heroStr(hero)), why: "힘" },
    ];
}

/** 내가 때릴 때 피해에 얹히는 것들. */
export function heroDamTerms(hero: GameState["hero"]): Term[] {
    const weapon = equippedWeapon(hero);
    return [
        { n: weapon?.plusDam ?? 0, why: "무기" },
        { n: strDamBonus(heroStr(hero)), why: "힘" },
    ];
}

/** 내가 몬스터를 때린다. */
export function heroAttack(state: GameState, m: Monster, rng: Rng): AttackResult {
    const hero = state.hero;
    const hitTerms = heroHitTerms(hero);
    const defTerms: Term[] = [{ n: defenseOf(m.def.armor), why: "방어" }];
    const c = contest(
        hitTerms.reduce((a, t) => a + t.n, 0),
        defenseOf(m.def.armor),
        rng,
    );
    const messages: string[] = [];

    // 계산이 먼저, 결과가 나중 — 기록 판은 뒤집어 보여 주므로 거기서는 결과가 위로
    // 오고 그 아래에 「왜 그랬나」가 붙는다.
    messages.push(
        contestLine(
            "나",
            [c.atkRoll],
            hitTerms,
            c.atkTotal,
            m.def.name,
            c.defRoll,
            seenBefore(state, m) ? defTerms : null,
            c.defTotal,
            c.hit ? "맞았다" : "막혔다",
        ),
    );

    if (!c.hit) {
        messages.push(`${m.def.name}을(를) 헛쳤다.`);
        return { hit: false, roll: c.atkRoll, damage: 0, killed: false, messages };
    }

    const dice = heroDamageDice(hero);
    const damTerms = heroDamTerms(hero);
    const rolled = rng.rollDice(dice);
    const dmg = Math.max(1, rolled + damTerms.reduce((a, t) => a + t.n, 0));
    m.hp -= dmg;
    // 맞은 순간 깨어난다 — 자던 놈도 이제 쫓아온다.
    m.awake = true;
    const killed = m.hp <= 0;
    messages.push(damageLine(dice, rolled, damTerms, dmg));
    messages.push(killed ? `${m.def.name}을(를) 쓰러뜨렸다.` : `${m.def.name}을(를) 맞혔다.`);
    return { hit: true, roll: c.atkRoll, damage: dmg, killed, messages };
}

/**
 * 몬스터가 나를 때린다. 여러 번 때리는 놈은 damage 가 여러 개다 —
 * **하나하나 따로 굴린다**(원작이 그렇다). 트롤이 무서운 이유가 그것이다.
 */
export function monsterAttack(state: GameState, m: Monster, rng: Rng): AttackResult {
    const hero = state.hero;
    const messages: string[] = [];
    const atkRolls: number[] = [];
    let total = 0;
    let hits = 0;
    let lastRoll = 0;
    // 내 방어 굴림은 **한 번**이다. 세 대를 휘두르면 그 한 번의 자세로 셋을 다 받는다 —
    // 매번 새로 굴리면 여러 번 때리는 놈이 주사위를 세 배로 굴려 지나치게 세진다.
    const myDef: Term[] = [{ n: defenseOf(heroArmor(hero)), why: "방어" }];
    const defRoll = rng.rnd(20) + 1;
    const defTotal = defRoll + myDef[0].n;

    for (const dice of m.def.damage) {
        const atkRoll = rng.rnd(20) + 1;
        atkRolls.push(atkRoll);
        lastRoll = atkRoll;
        if (atkRoll + m.def.level <= defTotal) continue;
        hits++;
        if (dice === "0d0") {
            messages.push(...special(state, m, rng));
            continue;
        }
        const dmg = rng.rollDice(dice);
        total += dmg;
        hero.hp -= dmg;
    }

    // 계산 줄을 맨 앞에 끼운다 — 특수 공격이 이미 남긴 말보다 먼저 와야 한다.
    if (atkRolls.length > 0) {
        const outcome =
            atkRolls.length === 1
                ? hits > 0
                    ? "맞았다"
                    : "막았다"
                : `${atkRolls.length}대 중 ${hits}대`;
        // 상대의 레벨 보정은 잡아 본 종에게만 적는다 — 도감이 잠가 둔 값이다.
        const seen = seenBefore(state, m);
        messages.unshift(
            contestLine(
                m.def.name,
                atkRolls,
                seen ? [{ n: m.def.level, why: "레벨" }] : [],
                seen && atkRolls.length === 1 ? atkRolls[0] + m.def.level : null,
                "나",
                defRoll,
                myDef, // 내 방어는 내 것이라 늘 적는다
                defTotal,
                outcome,
            ),
        );
        // 상대의 피해 주사위 표기는 안 준다(도감이 할 일). 줄어든 숫자만 적는다.
        if (total > 0) messages.splice(1, 0, damageLine(null, 0, [], total));
    }

    if (hits === 0) messages.push(`${m.def.name}의 공격이 빗나갔다.`);
    else if (total > 0) messages.push(`${m.def.name}에게 맞았다.`);

    return { hit: hits > 0, roll: lastRoll, damage: total, killed: hero.hp <= 0, messages };
}

/**
 * 피해 없는 공격들.
 *
 * **적혀 있는 것만 한다.** 하나가 두 가지를 하면 무엇 때문에 무서운지를 알 수 없다.
 */
function special(state: GameState, m: Monster, rng: Rng): string[] {
    const hero: Hero = state.hero;
    // 무력화 지팡이를 맞은 놈은 때리기만 한다.
    if (m.cancelled) return [`${m.def.name}이(가) 헛되이 달려든다.`];
    switch (m.def.ch) {
        case "A": {
            // 아쿠에이터 — 갑옷을 녹인다.
            const armor = equippedArmor(hero);
            if (!armor) return ["아쿠에이터가 헛되이 녹이려 든다."];
            armor.plusArmor = (armor.plusArmor ?? 0) - 1;
            return ["갑옷이 녹아내렸다!"];
        }
        case "W": {
            // 망령 — 경험을 빨아먹는다. 레벨은 안 내린다(내리면 최대 체력 계산이 꼬인다).
            const drained = Math.min(hero.exp, rng.between(5, 20));
            hero.exp -= drained;
            return drained > 0 ? ["기운이 빠져나간다."] : ["망령이 스쳐 갔다."];
        }
        case "L": {
            // 레프러콘 — 금화를 채고 사라진다.
            const stolen = Math.min(hero.gold, rng.between(10, 60 + state.level.depth * 10));
            hero.gold -= stolen;
            m.hp = 0;
            return stolen > 0
                ? [`레프러콘이 금화 ${stolen}을(를) 채 갔다!`]
                : ["레프러콘이 빈손으로 달아났다."];
        }
        case "N": {
            // 님프 — 물건 하나를 채고 사라진다. 쥐고 입은 것은 안 가져간다.
            const loot = hero.pack.filter((i) => i.id !== hero.weaponId && i.id !== hero.armorId);
            const taken = rng.pick(loot);
            m.hp = 0;
            if (!taken) return ["님프가 빈손으로 달아났다."];
            takeFromPack(hero, taken, taken.count);
            return [`님프가 ${describe(taken, state.known, state.appearance)}을(를) 채 갔다!`];
        }
        case "I": {
            // 얼음괴물 — 얼린다.
            hero.asleep += rng.between(2, 4);
            return ["몸이 얼어붙어 움직일 수 없다!"];
        }
        case "F": {
            // 파리지옥 — 붙잡는다.
            hero.asleep += 1;
            return ["덩굴이 발목을 감았다!"];
        }
        default:
            return [`${m.def.name}이(가) 달라붙는다.`];
    }
}
