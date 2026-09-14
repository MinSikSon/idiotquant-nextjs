/**
 * 주사위 체계 — **규칙만, 이 게임을 모른 채.**
 *
 * ```
 *   때리는 쪽 = d20 + 숙련 + 능력 보정 + 손질
 *   피하는 쪽 = d20 + 숙련
 *   맞았다    = 때리는 쪽 > 피하는 쪽            ← 둘 다 굴린다(대결 굴림)
 *   공격력    = 무기 주사위 + 능력 보정 + 손질
 *   피해      = 공격력 − 상대의 방어력           ← 0 밑은 0, 완전히 막힌다
 * ```
 *
 * **한때 D&D 5판이었다.** 거기서는 막는 쪽이 안 굴리고 방어도가 넘어야 할 고정된
 * 문턱이었으며, 피해는 주사위가 통째로 들어갔다. 지금은 **양쪽이 굴리고 갑옷이 피해를
 * 깎는** 체계다 — 갑옷이 「안 맞게 해 주는 것」에서 「덜 아프게 해 주는 것」으로 바뀌었고,
 * 그래서 좋은 갑옷의 값이 눈에 보이는 숫자로 남는다.
 *
 * **동점은 빗나간다.** 피하는 쪽이 비기면 이긴다 — 어느 한쪽으로 정해 두지 않으면
 * 「같은 눈인데 어떨 땐 맞고 어떨 땐 안 맞는」 자리가 생긴다.
 *
 * 이 파일이 따로 있는 이유는 **`hero` 와 `combat` 이 둘 다 쓰기 때문**이다. 한쪽에
 * 두면 둘이 서로를 불러 고리가 생긴다. 여기에는 이 게임의 값이 하나도 없다 —
 * 능력치도 몬스터도 모르고, 숫자를 받아 숫자를 낸다.
 */

import { Rng } from "./rng";

/** 능력 보정 — `(능력치 − 10) ÷ 2` 내림. 10~11 이면 0, 16 이면 +3, 8 이면 −1. */
export function abilityMod(score: number): number {
    return Math.floor((score - 10) / 2);
}

/** 숙련 보너스 — 레벨 1~4 는 +2, 5~8 은 +3, 네 레벨마다 하나씩. */
export function proficiency(level: number): number {
    return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

/** 굴림에 얹히는 운 — 유리는 두 번 굴려 높은 쪽, 불리는 낮은 쪽. */
export type Luck = "normal" | "advantage" | "disadvantage";

export interface Attack {
    hit: boolean;
    /** 때리는 쪽이 굴린 눈. 유리·불리면 두 개다. */
    rolls: number[];
    /** 때리는 쪽이 실제로 쓴 눈. */
    roll: number;
    total: number;
    /** **피하는 쪽이 굴린 눈**과 그 합. 대결 굴림이라 이쪽도 남는다. */
    dodgeRoll: number;
    dodge: number;
    /** 자연 20 — 무조건 맞고 공격력 주사위를 두 번 굴린다. */
    crit: boolean;
    /** 자연 1 — 보정이 아무리 커도 빗나간다. */
    fumble: boolean;
    luck: Luck;
}

/**
 * 대결 굴림 하나 — **양쪽이 d20 을 굴려 때리는 쪽이 높으면 맞는다.**
 *
 * **자연 20 과 자연 1 은 상대를 보지 않는다.** 20 은 무조건 맞고 1 은 무조건 빗나간다.
 * 그래서 아무리 센 놈에게도 스무 번에 한 번은 닿고, 아무리 약한 놈에게도 스무 번에
 * 한 번은 빗나간다 — 그 두 칸이 없으면 숫자 차이가 큰 싸움이 통째로 결정돼 버린다.
 *
 * **동점은 빗나간다**(`>` 이지 `>=` 가 아니다) — 피하는 쪽이 비기면 이긴다.
 *
 * 유리·불리는 **때리는 쪽에만** 붙는다. 자는 놈을 치는 것은 내 몫이 좋아지는 일이지
 * 그놈이 더 굴리는 일이 아니다.
 */
export function opposedRoll(bonus: number, dodgeBonus: number, rng: Rng, luck: Luck = "normal"): Attack {
    const rolls = [rng.rnd(20) + 1];
    if (luck !== "normal") rolls.push(rng.rnd(20) + 1);
    const roll =
        luck === "advantage"
            ? Math.max(...rolls)
            : luck === "disadvantage"
              ? Math.min(...rolls)
              : rolls[0];
    const dodgeRoll = rng.rnd(20) + 1;
    const crit = roll === 20;
    const fumble = roll === 1;
    const total = roll + bonus;
    const dodge = dodgeRoll + dodgeBonus;
    return { hit: crit || (!fumble && total > dodge), rolls, roll, total, dodgeRoll, dodge, crit, fumble, luck };
}

/**
 * 들어가는 피해 — **공격력에서 방어력을 뺀다. 0 밑은 0 이다.**
 *
 * 맞아도 갑옷이 두꺼우면 아무 일이 없다. 그것이 이 체계에서 갑옷이 갖는 값이고, 동시에
 * **깊은 층에서 내 칼이 안 통하면 상대를 영영 못 죽인다**는 뜻이기도 하다 — 사다리를
 * 올라갈 이유가 거기서 나온다.
 */
export function pierce(power: number, defense: number): number {
    return Math.max(0, power - defense);
}

/**
 * **공격력**을 굴린다 — 무기 주사위 + 보정. 여기서 상대의 방어력을 빼면 피해다(`pierce`).
 *
 * **치명타면 주사위를 두 번 굴리고 보정은 한 번만 얹는다.** 보정까지 두 배로 하면
 * 힘센 캐릭터의 치명타가 걷잡을 수 없이 커진다.
 *
 * 깎여서 0 밑으로 내려가면 0 이다. 「맞았는데 0」은 드물지만 있는 일이다.
 */
export function damageRoll(
    dice: string,
    bonus: number,
    crit: boolean,
    rng: Rng,
): { rolled: number[]; total: number } {
    const rolled = [rng.rollDice(dice)];
    if (crit) rolled.push(rng.rollDice(dice));
    const sum = rolled.reduce((a, n) => a + n, 0);
    return { rolled, total: Math.max(0, sum + bonus) };
}

/** 유리와 불리는 **서로 지운다** — 5판의 규칙. 둘 다 있으면 그냥 굴린다. */
export function luckOf(advantages: boolean[], disadvantages: boolean[]): Luck {
    const up = advantages.some(Boolean);
    const down = disadvantages.some(Boolean);
    if (up === down) return "normal";
    return up ? "advantage" : "disadvantage";
}
