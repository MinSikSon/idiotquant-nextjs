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

/** `+3` / `-1` / 0이면 빈 글자. */
function signed(n: number): string {
    return n === 0 ? "" : n > 0 ? `+${n}` : `${n}`;
}

/** 도감에 오른 종인가 — **잡아 본 적이 있어야 숫자를 준다.** */
export function seenBefore(state: GameState, m: Monster): boolean {
    return (state.bestiary[m.def.ch] ?? 0) > 0;
}

/**
 * 굴린 눈을 적는 한 줄.
 *
 * **명중 문턱(`need`)은 아는 종에게만 준다.** `need = 20 - 레벨 - 방어` 라서, 문턱을
 * 보여 주면 나머지를 역산할 수 있다 — 내가 때릴 때는 상대의 **방어**가, 상대가 때릴
 * 때는 상대의 **레벨**이 그대로 나온다. 그러면 「잡아 봐야 안다」는 도감 규칙이
 * 무너진다. 모르는 종에게는 `need` 자리에 `null` 을 넣는다.
 *
 * 피해 **숫자**는 늘 적는다 — 체력이 줄어드는 것은 어차피 보인다. 다만 상대의 피해
 * **주사위 표기**는 숫자가 아니라 정보라서, 부르는 쪽이 넣지 않는다.
 */
export function diceLine(
    who: string,
    rolls: { roll: number; bonus: number }[],
    need: number | null,
    damage: { dice?: string; bonus?: number; total: number } | null,
): string {
    const eyes = rolls
        .map((r) => (r.bonus === 0 ? `${r.roll}` : `${r.roll}${signed(r.bonus)}=${r.roll + r.bonus}`))
        .join(", ");
    let line = `${who}: d20 ${eyes}`;
    if (need !== null) line += ` (명중 ${need}↑)`;
    if (damage) {
        line += damage.dice
            ? ` · 피해 ${damage.dice}${signed(damage.bonus ?? 0)} → ${damage.total}`
            : ` · 피해 ${damage.total}`;
    }
    return line;
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
    const bonus = (weapon?.plusHit ?? 0) + strHitBonus(heroStr(hero));
    const s = swing(hero.level, m.def.armor, bonus, rng);
    const need = seenBefore(state, m) ? s.need : null;
    const eyes = [{ roll: s.roll, bonus }];
    const messages: string[] = [];

    if (!s.hit) {
        // 굴림이 먼저, 결과가 나중 — 위쪽 두 줄 띠가 **결과로 끝나야** 하고,
        // 뒤집어 보여 주는 기록에서는 결과가 위로 온다.
        messages.push(diceLine("나", eyes, need, null));
        messages.push(`${m.def.name}을(를) 헛쳤다.`);
        return { hit: false, roll: s.roll, damage: 0, killed: false, messages };
    }

    const dice = heroDamageDice(hero);
    const dmgBonus = (weapon?.plusDam ?? 0) + strDamBonus(heroStr(hero));
    const dmg = Math.max(1, rng.rollDice(dice) + dmgBonus);
    m.hp -= dmg;
    // 맞은 순간 깨어난다 — 자던 놈도 이제 쫓아온다.
    m.awake = true;
    const killed = m.hp <= 0;
    messages.push(diceLine("나", eyes, need, { dice, bonus: dmgBonus, total: dmg }));
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
    const eyes: { roll: number; bonus: number }[] = [];
    let total = 0;
    let anyHit = false;
    let lastRoll = 0;
    let need: number | null = null;

    for (const dice of m.def.damage) {
        const s = swing(m.def.level, heroArmor(hero), 0, rng);
        eyes.push({ roll: s.roll, bonus: 0 });
        // 문턱은 첫 굴림의 것으로 적는다. 아쿠에이터가 중간에 갑옷을 녹이면 뒤 굴림의
        // 문턱은 달라지지만, 여러 숫자를 늘어놓는 것보다 첫 줄이 읽기 낫다.
        if (need === null) need = s.need;
        lastRoll = s.roll;
        if (!s.hit) continue;
        anyHit = true;
        if (dice === "0d0") {
            messages.push(...special(state, m, rng));
            continue;
        }
        const dmg = rng.rollDice(dice);
        total += dmg;
        hero.hp -= dmg;
    }

    // 굴림 줄을 맨 앞에 끼운다 — 특수 공격이 이미 남긴 말보다 먼저 와야 한다.
    // 상대의 피해 주사위 표기는 안 적는다(도감이 할 일). 숫자만 적는다.
    if (eyes.length > 0) {
        messages.unshift(
            diceLine(
                m.def.name,
                eyes,
                seenBefore(state, m) ? need : null,
                total > 0 ? { total } : null,
            ),
        );
    }

    if (!anyHit) messages.push(`${m.def.name}의 공격이 빗나갔다.`);
    else if (total > 0) messages.push(`${m.def.name}에게 맞았다.`);

    return { hit: anyHit, roll: lastRoll, damage: total, killed: hero.hp <= 0, messages };
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
