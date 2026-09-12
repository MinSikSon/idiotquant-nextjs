/**
 * 몬스터 스물여섯 — A부터 Z까지.
 *
 * Rogue 의 서명이 이 표다. 글자 하나가 곧 정체이고, `D` 를 보면 도망쳐야 한다는 것을
 * 사람이 **배워서** 안다. 그림이 아니라 글자라서 배울 것이 남는다.
 *
 * **방어(`armor`)는 낮을수록 단단하다** — 원작과 같다. 용은 −1 이고 좀비는 8 이다.
 * 이 방향을 뒤집으면 `combat.ts` 의 명중식이 통째로 거꾸로 돈다.
 *
 * 값은 원작 계열이되 바이트 단위로 같다고 주장하지 않는다 — 밸런스는
 * `scripts/measure-rogue.mjs` 로 재서 맞춘다.
 */

import {
    Rng,
} from "./rng";
import {
    type Monster,
    type MonsterDef,
} from "./types";

export const MONSTERS: Record<string, MonsterDef> = {
    A: { ch: "A", name: "아쿠에이터", exp: 20, level: 5, armor: 2, hp: "5d8", damage: ["0d0", "0d0"], mean: true },
    B: { ch: "B", name: "박쥐", exp: 1, level: 1, armor: 3, hp: "1d8", damage: ["1d2"], mean: false },
    C: { ch: "C", name: "켄타우로스", exp: 17, level: 4, armor: 4, hp: "4d8", damage: ["1d2", "1d5", "1d5"], mean: false },
    D: { ch: "D", name: "용", exp: 5000, level: 10, armor: -1, hp: "10d8", damage: ["1d8", "1d8", "3d10"], mean: true },
    E: { ch: "E", name: "에뮤", exp: 2, level: 1, armor: 7, hp: "1d8", damage: ["1d2"], mean: true },
    F: { ch: "F", name: "파리지옥", exp: 80, level: 8, armor: 3, hp: "8d8", damage: ["1d6"], mean: true, still: true },
    G: { ch: "G", name: "그리핀", exp: 2000, level: 13, armor: 2, hp: "13d8", damage: ["4d3", "3d5"], mean: true },
    H: { ch: "H", name: "홉고블린", exp: 3, level: 1, armor: 5, hp: "1d8", damage: ["1d8"], mean: true },
    I: { ch: "I", name: "얼음괴물", exp: 15, level: 1, armor: 9, hp: "1d8", damage: ["1d2"], mean: false },
    J: { ch: "J", name: "재버워크", exp: 3000, level: 15, armor: 6, hp: "15d8", damage: ["2d12", "2d4"], mean: false },
    K: { ch: "K", name: "황조롱이", exp: 1, level: 1, armor: 7, hp: "1d8", damage: ["1d4"], mean: true },
    L: { ch: "L", name: "레프러콘", exp: 10, level: 3, armor: 8, hp: "3d8", damage: ["1d1"], mean: false },
    M: { ch: "M", name: "메두사", exp: 200, level: 8, armor: 2, hp: "8d8", damage: ["3d4", "3d4", "2d5"], mean: true },
    N: { ch: "N", name: "님프", exp: 37, level: 3, armor: 9, hp: "3d8", damage: ["0d0"], mean: false },
    O: { ch: "O", name: "오크", exp: 5, level: 1, armor: 6, hp: "1d8", damage: ["1d8"], mean: false },
    P: { ch: "P", name: "팬텀", exp: 120, level: 8, armor: 3, hp: "8d8", damage: ["4d4"], mean: false },
    Q: { ch: "Q", name: "콰가", exp: 15, level: 3, armor: 3, hp: "3d8", damage: ["1d5", "1d5"], mean: true },
    R: { ch: "R", name: "방울뱀", exp: 9, level: 2, armor: 3, hp: "2d8", damage: ["1d6"], mean: true },
    S: { ch: "S", name: "뱀", exp: 2, level: 1, armor: 5, hp: "1d8", damage: ["1d3"], mean: true },
    T: { ch: "T", name: "트롤", exp: 120, level: 6, armor: 4, hp: "6d8", damage: ["1d8", "1d8", "2d6"], mean: true },
    U: { ch: "U", name: "우르바일", exp: 190, level: 7, armor: -2, hp: "7d8", damage: ["1d9", "1d9", "2d9"], mean: true },
    V: { ch: "V", name: "뱀파이어", exp: 350, level: 8, armor: 1, hp: "8d8", damage: ["1d10"], mean: true },
    W: { ch: "W", name: "망령", exp: 55, level: 5, armor: 4, hp: "5d8", damage: ["1d6", "0d0"], mean: false },
    X: { ch: "X", name: "제록", exp: 100, level: 7, armor: 7, hp: "7d8", damage: ["4d4"], mean: false },
    Y: { ch: "Y", name: "예티", exp: 50, level: 4, armor: 6, hp: "4d8", damage: ["1d6", "1d6"], mean: false },
    Z: { ch: "Z", name: "좀비", exp: 6, level: 2, armor: 8, hp: "2d8", damage: ["1d8"], mean: true },
};

/**
 * 난이도 순서 — 1부터 26까지의 자리에 글자가 하나씩 있다.
 *
 * 원작의 `lvl_mons` 와 같은 장치다. 층수가 이 표의 자리를 고르므로 **깊이가 곧 난이도**가
 * 되고, 표를 고치는 것만으로 곡선이 움직인다.
 */
const LVL_MONS = "KEBHISORZLNQCYAWTUXFMPVDGJ".split("");

/**
 * 이 층에 나올 놈 하나.
 *
 * 원작 그대로 **층수 언저리를 굴린다** — 깊은 층에도 가끔 약한 놈이 나오고, 얕은 층에도
 * 가끔 무서운 놈이 나온다. 그 예외가 없으면 층수만 보고 안심하게 된다.
 */
export function randomMonsterChar(depth: number, rng: Rng): string {
    let d = depth + (rng.rnd(10) - 6);
    if (d < 1) d = rng.rnd(5) + 1;
    if (d > 26) d = rng.rnd(5) + 22;
    return LVL_MONS[Math.min(25, Math.max(0, d - 1))];
}

let nextId = 1;

export function spawnMonster(ch: string, x: number, y: number, rng: Rng): Monster {
    const def = MONSTERS[ch] ?? MONSTERS.B;
    const hp = Math.max(1, rng.rollDice(def.hp));
    return { def, x, y, hp, maxHp: hp, awake: def.mean, id: nextId++, speed: 0, cancelled: false };
}

/** 테스트가 식별자를 예측할 수 있게 한다. */
export function resetMonsterIds(): void {
    nextId = 1;
}
