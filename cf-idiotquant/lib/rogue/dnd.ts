/**
 * D&D 의 주사위 체계 — **규칙만, 이 게임을 모른 채.**
 *
 * ```
 *   공격 굴림 = d20 + 숙련 + 능력 보정 + 손질
 *   맞았다    = 공격 굴림 >= 방어도(AC)          ← 막는 쪽은 굴리지 않는다
 *   피해      = 무기 주사위 + 능력 보정 + 손질
 * ```
 *
 * **막는 쪽이 안 굴린다**는 것이 D&D 의 핵심이다. 방어도는 넘어야 할 고정된 문턱이고
 * 주사위는 때리는 쪽만 굴린다. 한때 양쪽이 굴리게 해 봤는데(대결 굴림) 그건 D&D 가
 * 아니라 다른 체계라, 지금은 원판을 따른다.
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
    /** 굴린 눈. 유리·불리면 두 개다. */
    rolls: number[];
    /** 실제로 쓴 눈. */
    roll: number;
    total: number;
    /** 넘어야 했던 방어도. */
    ac: number;
    /** 자연 20 — 무조건 맞고 피해 주사위를 두 번 굴린다. */
    crit: boolean;
    /** 자연 1 — 보정이 아무리 커도 빗나간다. */
    fumble: boolean;
    luck: Luck;
}

/**
 * 공격 굴림 하나 — `d20 + 보정 >= 방어도`.
 *
 * **자연 20 과 자연 1 은 보정을 보지 않는다.** 20 은 무조건 맞고 1 은 무조건 빗나간다.
 * 그래서 아무리 센 놈에게도 스무 번에 한 번은 닿고, 아무리 약한 놈에게도 스무 번에
 * 한 번은 빗나간다 — 그 두 칸이 D&D 를 D&D 답게 만든다.
 */
export function attackRoll(bonus: number, ac: number, rng: Rng, luck: Luck = "normal"): Attack {
    const rolls = [rng.rnd(20) + 1];
    if (luck !== "normal") rolls.push(rng.rnd(20) + 1);
    const roll =
        luck === "advantage"
            ? Math.max(...rolls)
            : luck === "disadvantage"
              ? Math.min(...rolls)
              : rolls[0];
    const crit = roll === 20;
    const fumble = roll === 1;
    const total = roll + bonus;
    return { hit: crit || (!fumble && total >= ac), rolls, roll, total, ac, crit, fumble, luck };
}

/**
 * 피해를 굴린다.
 *
 * **치명타면 주사위를 두 번 굴리고 보정은 한 번만 얹는다** — 5판의 규칙이다. 보정까지
 * 두 배로 하면 힘센 캐릭터의 치명타가 걷잡을 수 없이 커진다.
 *
 * 깎여서 0 밑으로 내려가면 0 이다(D&D 도 그렇다). 「맞았는데 0」은 드물지만 있는 일이다.
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
