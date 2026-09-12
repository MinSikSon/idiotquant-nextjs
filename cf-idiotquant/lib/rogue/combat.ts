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
    const bonus = (weapon?.plusHit ?? 0) + strHitBonus(hero.str);
    const s = swing(hero.level, m.def.armor, bonus, rng);
    const messages: string[] = [];

    if (!s.hit) {
        messages.push(`${m.def.name}을(를) 헛쳤다.`);
        return { hit: false, roll: s.roll, damage: 0, killed: false, messages };
    }

    const dmg = Math.max(
        1,
        rng.rollDice(heroDamageDice(hero)) + (weapon?.plusDam ?? 0) + strDamBonus(hero.str),
    );
    m.hp -= dmg;
    // 맞은 순간 깨어난다 — 자던 놈도 이제 쫓아온다.
    m.awake = true;
    const killed = m.hp <= 0;
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
    let total = 0;
    let anyHit = false;
    let lastRoll = 0;

    for (const dice of m.def.damage) {
        const s = swing(m.def.level, heroArmor(hero), 0, rng);
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
    switch (m.def.ch) {
        case "A": {
            // 아쿠에이터 — 갑옷을 녹인다.
            const armor = equippedArmor(hero);
            if (!armor) return ["아쿠에이터가 헛되이 녹이려 든다."];
            armor.plusArmor = (armor.plusArmor ?? 0) - 1;
            return ["갑옷이 녹아내렸다!"];
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
