/**
 * 싸움 — **D&D 의 주사위 체계 그대로.**
 *
 * ```
 *   공격 굴림 = d20 + 숙련 + 능력 보정 + 손질
 *   맞았다    = 공격 굴림 >= 방어도(AC)          ← 막는 쪽은 굴리지 않는다
 *   피해      = 무기 주사위 + 능력 보정 + 손질
 * ```
 *
 * D&D 의 핵심은 **막는 쪽이 안 굴린다**는 것이다. 방어도는 넘어야 할 고정된 문턱이고,
 * 주사위는 때리는 쪽만 굴린다. 한때 양쪽이 굴리게 해 봤는데(대결 굴림), 그건 D&D 가
 * 아니라 다른 체계다. 지금은 원판을 따른다.
 *
 * 같이 오는 것 넷:
 *
 *   · **자연 20 은 치명타** — 무조건 맞고 **피해 주사위를 두 번** 굴린다(보정은 한 번).
 *   · **자연 1 은 자동 실패** — 보정이 아무리 커도 빗나간다.
 *   · **유리/불리** — d20 을 두 번 굴려 높은/낮은 쪽을 쓴다. 자는 놈을 치면 유리,
 *     눈이 멀거나 헷갈리면 불리.
 *   · **능력 보정 = (능력치 − 10) ÷ 2 내림**, **숙련 = 2 + (레벨−1) ÷ 4 내림.**
 *
 * 특수 공격(0d0)은 피해 대신 **다른 것을 가져간다** — 금화·물건·갑옷·정신. 그 목록이
 * Rogue 를 Rogue 로 만드는 자리라 피해 없는 몬스터도 무섭다.
 */

import {
    Rng,
} from "./rng";
import {
    armorClass,
    describe,
} from "./items";
import {
    type Attack,
    type Luck,
    attackRoll,
    damageRoll,
    luckOf,
    proficiency,
} from "./dnd";

// 방어도로 옮기는 자리는 `items.ts` 에 있다(갑옷의 값이라서). 싸움 쪽에서 찾는 것이
// 자연스러운 이름이라 여기서 그대로 다시 내보낸다.
export { armorClass };
import {
    equippedArmor,
    equippedWeapon,
    heroArmor,
    heroDamTerms,
    heroDamageDice,
    heroDefense,
    heroHitTerms,
    heroStr,
    strDamBonus,
    strHitBonus,
    takeFromPack,
} from "./hero";
export type { Attack, Luck };
export { heroHitTerms, heroDamTerms };
import {
    type GameState,
    type Hero,
    type Monster,
} from "./types";

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

/** `d20 13 +2숙련 +3힘 = 18` — 유리·불리면 두 눈과 고른 쪽까지. */
function rollText(a: Attack, bonuses: Term[]): string {
    const eyes =
        a.luck === "normal"
            ? `${a.roll}`
            : `${a.rolls.join(", ")} (${a.luck === "advantage" ? "유리" : "불리"} → ${a.roll})`;
    const add = terms(bonuses);
    const sum = bonuses.reduce((t, b) => t + b.n, 0);
    return `d20 ${eyes}${add}${sum === 0 ? "" : ` = ${a.total}`}`;
}

/** 공격 굴림이 무엇으로 끝났나 — 치명타·자동 실패는 따로 말한다. */
export function outcomeOf(a: Attack): string {
    if (a.crit) return "치명타!";
    if (a.fumble) return "자동 실패";
    return a.hit ? "맞았다" : "빗나갔다";
}

/**
 * 공격 굴림 한 줄.
 *
 * ```
 * · 명중 나 d20 13 +2숙련 +3힘 +2무기 = 20  vs  방어도 17  → 맞았다
 * · 명중 나 d20 20  vs  방어도 17  → 치명타!
 * · 명중 나 d20 6, 14 (유리 → 14) +2숙련 = 16  vs  방어도 ?  → 맞았다
 * ```
 *
 * **줄 앞에 무슨 굴림인지를 적는다.** 안 적으면 `d20` 만 덩그러니 남아 「이 스무면체가
 * 무엇을 정하는 건가」를 읽는 사람이 알 수 없다 — 실제로 그 물음을 들었다. 이 게임에서
 * d20 이 도는 자리는 **명중 하나뿐**이고, 피해는 무기 주사위(`2d4` 따위)가 돈다.
 *
 * **방어도는 아는 종에게만 적는다.** 표의 값이라, 잡아 본 적 없는 종의 것을 보여 주면
 * 「한 마리 잡아야 준다」는 도감 규칙이 뒷문으로 뚫린다. 모르는 종은 `?` 로 가린다.
 * 굴린 눈과 내 보정은 **내 것이라 늘 적는다.**
 */
export function attackLine(
    who: string,
    a: Attack,
    bonuses: Term[],
    showAc: boolean,
    outcome: string,
): string {
    return `${DETAIL}명중 ${who} ${rollText(a, bonuses)}  vs  방어도 ${showAc ? a.ac : "?"}  → ${outcome}`;
}

/** 여러 번 때리는 놈의 굴림을 한 줄로 — 눈만 늘어놓고 합은 안 적는다(어느 눈의 합인지 모른다). */
export function multiAttackLine(
    who: string,
    attacks: Attack[],
    bonuses: Term[],
    showAc: boolean,
    outcome: string,
): string {
    const eyes = attacks.map((a) => (a.crit ? `${a.roll}!` : `${a.roll}`)).join(", ");
    return `${DETAIL}명중 ${who} d20 ${eyes}${terms(bonuses)}  vs  방어도 ${showAc ? (attacks[0]?.ac ?? 0) : "?"}  → ${outcome}`;
}

/**
 * 피해 계산 줄.
 *
 * `dice` 가 없으면 **총합만** 적는다. 체력이 줄어드는 것은 어차피 보이지만 상대의
 * 피해 주사위 표기(`2d6`)는 표의 값이라, 부르는 쪽이 안 넘긴다.
 *
 * 치명타면 굴린 눈이 둘이다 — `2d4 두 번 → 5+7 = 12` 처럼 둘 다 적는다.
 */
export function damageLine(
    dice: string | null,
    rolled: number[],
    bonuses: Term[],
    total: number,
): string {
    if (!dice) return `${DETAIL}피해 ${total}`;
    const sum = rolled.reduce((a, n) => a + n, 0);
    const add = terms(bonuses);
    const bonus = bonuses.reduce((a, t) => a + t.n, 0);
    const eyes =
        rolled.length > 1 ? `${dice} 두 번 → ${rolled.join("+")} = ${sum}` : `${dice} → ${sum}`;
    const raw = sum + bonus;
    // 깎여서 0 밑으로 내려가면 0 이다(D&D 도 그렇다). 식과 결과가 안 맞아 보이지 않게 적는다.
    const floored = total !== raw ? ` → 최소 ${total}` : "";
    return `${DETAIL}피해 ${eyes}${add}${bonus !== 0 ? ` = ${raw}` : ""}${floored}`;
}

export interface AttackResult {
    hit: boolean;
    roll: number;
    damage: number;
    killed: boolean;
    messages: string[];
}

/**
 * 내가 때릴 때의 유리·불리.
 *
 * · **자는 놈을 친다** → 유리. 5판에서 의식을 잃은 상대를 치면 유리다.
 * · **눈이 멀었거나 헷갈린다** → 불리.
 *
 * 둘 다면 서로 지운다(`luckOf`) — 이것도 5판의 규칙이다.
 */
export function heroLuck(hero: GameState["hero"], m: Monster): Luck {
    return luckOf([!m.awake], [hero.blind > 0, hero.confused > 0]);
}

/** 내가 몬스터를 때린다. */
export function heroAttack(state: GameState, m: Monster, rng: Rng): AttackResult {
    const hero = state.hero;
    const hitTerms = heroHitTerms(hero);
    const seen = seenBefore(state, m);
    const a = attackRoll(
        hitTerms.reduce((t, b) => t + b.n, 0),
        armorClass(m.def.armor),
        rng,
        heroLuck(hero, m),
    );
    const messages: string[] = [];

    // 계산이 먼저, 결과가 나중 — 기록 판은 뒤집어 보여 주므로 거기서는 결과가 위로
    // 오고 그 아래에 「왜 그랬나」가 붙는다.
    messages.push(attackLine("나", a, hitTerms, seen, outcomeOf(a)));

    if (!a.hit) {
        messages.push(`${m.def.name}을(를) 헛쳤다.`);
        return { hit: false, roll: a.roll, damage: 0, killed: false, messages };
    }

    const dice = heroDamageDice(hero);
    const damTerms = heroDamTerms(hero);
    const d = damageRoll(dice, damTerms.reduce((t, b) => t + b.n, 0), a.crit, rng);
    m.hp -= d.total;
    // 맞은 순간 깨어난다 — 자던 놈도 이제 쫓아온다.
    m.awake = true;
    const killed = m.hp <= 0;
    messages.push(damageLine(dice, d.rolled, damTerms, d.total));
    messages.push(
        killed
            ? `${m.def.name}을(를) 쓰러뜨렸다.`
            : a.crit
              ? `${m.def.name}의 급소를 찔렀다!`
              : `${m.def.name}을(를) 맞혔다.`,
    );
    return { hit: true, roll: a.roll, damage: d.total, killed, messages };
}

/**
 * 몬스터가 나를 때린다. 여러 번 때리는 놈은 damage 가 여러 개다 —
 * **하나하나 따로 굴린다**(D&D 의 다중 공격이 그렇다). 트롤이 무서운 이유가 그것이다.
 */
export function monsterAttack(state: GameState, m: Monster, rng: Rng): AttackResult {
    const hero = state.hero;
    const messages: string[] = [];
    const attacks: Attack[] = [];
    const myAc = heroDefense(hero);
    // 몬스터의 공격 보정도 D&D 의 모양을 따른다 — 숙련 + 힘. 레벨이 곧 그 둘의 크기다.
    const bonus = monsterHitBonus(m);
    const bonusTerms: Term[] = [{ n: bonus, why: "공격" }];
    // **내가 자거나 덫에 걸려 있으면 상대가 유리하다** — 5판에서 못 움직이는 상대는 그렇다.
    const luck = luckOf([hero.asleep > 0 || hero.stuck > 0], []);
    let total = 0;
    let hits = 0;
    let crits = 0;
    let lastRoll = 0;

    for (const dice of m.def.damage) {
        const a = attackRoll(bonus, myAc, rng, luck);
        attacks.push(a);
        lastRoll = a.roll;
        if (!a.hit) continue;
        hits++;
        if (a.crit) crits++;
        if (dice === "0d0") {
            messages.push(...special(state, m, rng));
            continue;
        }
        const d = damageRoll(dice, 0, a.crit, rng);
        total += d.total;
        hero.hp -= d.total;
    }

    // 계산 줄을 맨 앞에 끼운다 — 특수 공격이 이미 남긴 말보다 먼저 와야 한다.
    if (attacks.length > 0) {
        const seen = seenBefore(state, m);
        const outcome =
            attacks.length === 1
                ? outcomeOf(attacks[0])
                : `${attacks.length}대 중 ${hits}대${crits > 0 ? ` (치명타 ${crits})` : ""}`;
        messages.unshift(
            attacks.length === 1
                ? attackLine(m.def.name, attacks[0], seen ? bonusTerms : [], true, outcome)
                : multiAttackLine(m.def.name, attacks, seen ? bonusTerms : [], true, outcome),
        );
        // 상대의 피해 주사위 표기는 안 준다(도감이 할 일). 줄어든 숫자만 적는다.
        if (total > 0) messages.splice(1, 0, damageLine(null, [], [], total));
    }

    if (hits === 0) messages.push(`${m.def.name}의 공격이 빗나갔다.`);
    else if (total > 0) {
        messages.push(crits > 0 ? `${m.def.name}에게 급소를 찔렸다!` : `${m.def.name}에게 맞았다.`);
    }

    return { hit: hits > 0, roll: lastRoll, damage: total, killed: hero.hp <= 0, messages };
}

/**
 * 몬스터의 공격 보정 — D&D 의 **숙련 + 힘** 모양을 레벨 하나로 낸다.
 *
 * 표에는 공격 보정 칸이 따로 없고 레벨만 있다. 5판의 괴물은 대체로 숙련에 능력 보정이
 * 얹힌 값을 쓰므로, 레벨을 그 둘로 나눠 본다 — 레벨 1 짜리가 +3, 용(10)이 +9 다.
 *
 * **내 방어도는 맨몸 10, 판금 17 언저리**라 이 값이 그 폭과 맞물린다. 숫자를 바꾸면
 * `scripts/measure-rogue.mjs` 로 다시 재 볼 것.
 */
export function monsterHitBonus(m: Monster): number {
    return proficiency(m.def.level) + Math.floor(m.def.level / 2);
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
