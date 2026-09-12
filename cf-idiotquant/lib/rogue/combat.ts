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
    describe,
} from "./items";
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

/** 원작의 `swing`. 굴린 눈을 함께 돌려준다 — 화면이 주사위를 보여 줄 수 있어야 한다. */
export function swing(
    atLevel: number,
    opArmor: number,
    bonus: number,
    rng: Rng,
): { hit: boolean; roll: number; need: number } {
    const roll = rng.rnd(20) + 1;
    const need = 20 - atLevel - opArmor;
    return { hit: roll + bonus >= need, roll, need };
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

/**
 * 명중 계산 줄. 「굴린 눈 + 보정이 문턱을 넘었나」를 그대로 적는다.
 *
 * **문턱(`need`)은 아는 종에게만 준다.** `need = 20 - 레벨 - 방어` 라서, 문턱을 보여
 * 주면 나머지를 역산할 수 있다 — 내가 때릴 때는 상대의 **방어**가, 상대가 때릴 때는
 * 상대의 **레벨**이 그대로 나온다. 그러면 「잡아 봐야 안다」는 도감 규칙이 무너진다.
 * 모르는 종에게는 `null` 을 넣는다. 굴린 눈과 내 보정은 **내 것이라 늘 적는다.**
 */
export function hitLine(
    who: string,
    rolls: number[],
    bonuses: Term[],
    need: number | null,
    outcome: string,
): string {
    const add = terms(bonuses);
    const sum = bonuses.reduce((a, t) => a + t.n, 0);
    // 여러 번 때리는 놈은 눈이 여러 개다. 그때는 합을 적지 않는다 — 어느 눈의 합인지
    // 알 수 없어서다.
    const eyes =
        rolls.length === 1 && sum !== 0
            ? `${rolls[0]}${add} = ${rolls[0] + sum}`
            : `${rolls.join(", ")}${add}`;
    return `${DETAIL}명중 ${who}: d20 ${eyes}${need === null ? "" : ` vs ${need}`} → ${outcome}`;
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

/** 내가 몬스터를 때린다. */
export function heroAttack(state: GameState, m: Monster, rng: Rng): AttackResult {
    const hero = state.hero;
    const weapon = equippedWeapon(hero);
    const hitTerms: Term[] = [
        { n: weapon?.plusHit ?? 0, why: "무기" },
        { n: strHitBonus(heroStr(hero)), why: "힘" },
    ];
    const bonus = hitTerms.reduce((a, t) => a + t.n, 0);
    const s = swing(hero.level, m.def.armor, bonus, rng);
    const need = seenBefore(state, m) ? s.need : null;
    const messages: string[] = [];

    // 계산이 먼저, 결과가 나중 — 기록 판은 뒤집어 보여 주므로 거기서는 결과가 위로
    // 오고 그 아래에 「왜 그랬나」가 붙는다.
    messages.push(hitLine("나", [s.roll], hitTerms, need, s.hit ? "맞았다" : "빗나갔다"));

    if (!s.hit) {
        messages.push(`${m.def.name}을(를) 헛쳤다.`);
        return { hit: false, roll: s.roll, damage: 0, killed: false, messages };
    }

    const dice = heroDamageDice(hero);
    const damTerms: Term[] = [
        { n: weapon?.plusDam ?? 0, why: "무기" },
        { n: strDamBonus(heroStr(hero)), why: "힘" },
    ];
    const rolled = rng.rollDice(dice);
    const dmg = Math.max(1, rolled + damTerms.reduce((a, t) => a + t.n, 0));
    m.hp -= dmg;
    // 맞은 순간 깨어난다 — 자던 놈도 이제 쫓아온다.
    m.awake = true;
    const killed = m.hp <= 0;
    messages.push(damageLine(dice, rolled, damTerms, dmg));
    messages.push(killed ? `${m.def.name}을(를) 쓰러뜨렸다.` : `${m.def.name}을(를) 맞혔다.`);
    return { hit: true, roll: s.roll, damage: dmg, killed, messages };
}

/**
 * 몬스터가 나를 때린다. 여러 번 때리는 놈은 damage 가 여러 개다 —
 * **하나하나 따로 굴린다**(원작이 그렇다). 트롤이 무서운 이유가 그것이다.
 */
export function monsterAttack(state: GameState, m: Monster, rng: Rng): AttackResult {
    const hero = state.hero;
    const messages: string[] = [];
    const rolls: number[] = [];
    let total = 0;
    let hits = 0;
    let lastRoll = 0;
    let need: number | null = null;

    for (const dice of m.def.damage) {
        const s = swing(m.def.level, heroArmor(hero), 0, rng);
        rolls.push(s.roll);
        // 문턱은 첫 굴림의 것으로 적는다. 아쿠에이터가 중간에 갑옷을 녹이면 뒤 굴림의
        // 문턱은 달라지지만, 여러 숫자를 늘어놓는 것보다 한 줄이 읽기 낫다.
        if (need === null) need = s.need;
        lastRoll = s.roll;
        if (!s.hit) continue;
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
    if (rolls.length > 0) {
        const outcome =
            rolls.length === 1
                ? hits > 0
                    ? "맞았다"
                    : "빗나갔다"
                : `${rolls.length}대 중 ${hits}대`;
        messages.unshift(
            hitLine(m.def.name, rolls, [], seenBefore(state, m) ? need : null, outcome),
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
