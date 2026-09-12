/**
 * 나 — 경험치·힘·배낭.
 *
 * 값은 원작 계열이다. 경험치 표가 **두 배씩** 오르는 것이 Rogue 의 곡선이고, 그래서
 * 레벨업은 갈수록 사건이 된다.
 */

import {
    Rng,
} from "./rng";
import {
    type Hero,
    type Item,
} from "./types";
import {
    armorClassOf,
    makeItem,
    weaponDamageOf,
} from "./items";

/** 이 경험치를 넘으면 다음 레벨. 원작의 `e_levels` 와 같은 모양이다. */
export const EXP_LEVELS = [
    10, 20, 40, 80, 160, 320, 640, 1300, 2600, 5200, 10000, 20000, 40000, 80000,
    160000, 320000, 1000000, 3333333, 6666666, 10000000,
];

const PACK_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

/** 힘이 주는 명중 보정. */
export function strHitBonus(str: number): number {
    if (str <= 7) return -1;
    if (str <= 16) return 0;
    if (str <= 18) return 1;
    if (str <= 20) return 2;
    return 3;
}

/** 힘이 주는 피해 보정. */
export function strDamBonus(str: number): number {
    if (str <= 6) return -1;
    if (str <= 15) return 0;
    if (str <= 17) return 1;
    if (str <= 18) return 2;
    if (str <= 20) return 3;
    return 4;
}

export function makeHero(rng: Rng, nextId: () => number): Hero {
    const mace = makeItem("weapon", "mace", nextId(), -1, -1);
    const ring = makeItem("armor", "ring mail", nextId(), -1, -1);
    const food = makeItem("food", "food ration", nextId(), -1, -1, 1);
    const hero: Hero = {
        x: 0,
        y: 0,
        hp: 12,
        maxHp: 12,
        exp: 0,
        level: 1,
        str: 16,
        maxStr: 16,
        gold: 0,
        pack: [],
        weaponId: mace.id,
        armorId: ring.id,
        // 원작의 허기 시계. 한 걸음에 1 씩 준다.
        food: 1300,
        hasAmulet: false,
        blind: 0,
        confused: 0,
        asleep: 0,
    };
    // 처음 쥐는 것은 손질된 철퇴와 사슬 고리 갑옷 — 그리고 그 둘은 정체를 안다.
    mace.plusHit = 1;
    mace.plusDam = 1;
    ring.plusArmor = 1;
    addToPack(hero, mace);
    addToPack(hero, ring);
    addToPack(hero, food);
    // rng 는 나중에 시작 소지품을 굴리게 될 자리다 — 지금은 고정이다.
    void rng;
    return hero;
}

/** 배낭의 빈 자리를 준다. 꽉 찼으면 null. */
function freeLetter(hero: Hero): string | null {
    const used = new Set(hero.pack.map((i) => i.letter));
    for (const l of PACK_LETTERS) if (!used.has(l)) return l;
    return null;
}

/**
 * 배낭에 넣는다. 같은 것이 이미 있으면 **겹쳐 쌓는다** — 식량 스무 개가 자리를
 * 스무 칸 먹으면 배낭이 금방 찬다.
 *
 * 넣지 못하면 false 를 준다. 부르는 쪽이 "배낭이 꽉 찼다" 를 말해야 한다.
 */
export function addToPack(hero: Hero, it: Item): boolean {
    it.x = -1;
    it.y = -1;
    const stackable = it.kind === "food" || it.kind === "potion" || it.kind === "scroll";
    if (stackable) {
        const same = hero.pack.find(
            (p) => p.kind === it.kind && p.type === it.type && p.id !== it.id,
        );
        if (same) {
            same.count += it.count;
            return true;
        }
    }
    const letter = freeLetter(hero);
    if (!letter) return false;
    it.letter = letter;
    hero.pack.push(it);
    hero.pack.sort((a, b) => (a.letter ?? "").localeCompare(b.letter ?? ""));
    return true;
}

/** 하나 덜어낸다. 겹쳐 쌓인 것은 개수만 준다. */
export function takeFromPack(hero: Hero, it: Item, n = 1): void {
    if (it.count > n) {
        it.count -= n;
        return;
    }
    hero.pack = hero.pack.filter((p) => p.id !== it.id);
    if (hero.weaponId === it.id) hero.weaponId = null;
    if (hero.armorId === it.id) hero.armorId = null;
}

export function packItem(hero: Hero, letter: string): Item | undefined {
    return hero.pack.find((i) => i.letter === letter);
}

export function equippedWeapon(hero: Hero): Item | undefined {
    return hero.pack.find((i) => i.id === hero.weaponId);
}

export function equippedArmor(hero: Hero): Item | undefined {
    return hero.pack.find((i) => i.id === hero.armorId);
}

/** 지금의 방어 등급 — 갑옷이 없으면 맨몸 10 이다. */
export function heroArmor(hero: Hero): number {
    return armorClassOf(equippedArmor(hero));
}

export function heroDamageDice(hero: Hero): string {
    return weaponDamageOf(equippedWeapon(hero));
}

/**
 * 경험치를 준다. 레벨이 올랐으면 그 사실을 돌려준다 — 메시지는 부르는 쪽이 쓴다.
 */
export function gainExp(hero: Hero, amount: number, rng: Rng): number[] {
    hero.exp += amount;
    const gained: number[] = [];
    while (hero.level - 1 < EXP_LEVELS.length && hero.exp >= EXP_LEVELS[hero.level - 1]) {
        hero.level += 1;
        const bump = rng.rnd(10) + 1;
        hero.maxHp += bump;
        hero.hp += bump;
        gained.push(hero.level);
    }
    return gained;
}

/** 배고픔의 단계 — 화면의 상태 줄이 이걸 그대로 적는다. */
export type HungerState = "" | "시장함" | "허기짐" | "탈진";

export function hungerOf(hero: Hero): HungerState {
    if (hero.food <= 20) return "탈진";
    if (hero.food <= 150) return "허기짐";
    if (hero.food <= 300) return "시장함";
    return "";
}
