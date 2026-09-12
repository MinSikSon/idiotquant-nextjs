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
    RINGS,
    armorClass,
    armorClassOf,
    makeItem,
    weaponDamageOf,
} from "./items";
import {
    abilityMod,
    proficiency,
} from "./dnd";

/** 이 경험치를 넘으면 다음 레벨. 원작의 `e_levels` 와 같은 모양이다. */
export const EXP_LEVELS = [
    10, 20, 40, 80, 160, 320, 640, 1300, 2600, 5200, 10000, 20000, 40000, 80000,
    160000, 320000, 1000000, 3333333, 6666666, 10000000,
];

/** 레벨이 오를 때마다 느는 체력. 고정값이다. */
export const HP_PER_LEVEL = 5;

const PACK_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

/**
 * 힘이 주는 보정 — **D&D 의 능력 보정 하나로 명중과 피해에 같이 쓴다.**
 *
 * 원작 Rogue 는 명중과 피해에 서로 다른 표를 썼지만 D&D 는 능력 보정 하나가 둘 다
 * 맡는다. `(능력치 − 10) ÷ 2` 내림이라 힘 16 이면 +3, 10~11 이면 0, 8 이면 −1 이다.
 */
export function strHitBonus(str: number): number {
    return abilityMod(str);
}

export function strDamBonus(str: number): number {
    return abilityMod(str);
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
        leftRingId: null,
        rightRingId: null,
        // 원작의 허기 시계. 한 걸음에 1 씩 준다.
        food: 1300,
        hasAmulet: false,
        blind: 0,
        confused: 0,
        asleep: 0,
        stuck: 0,
        detect: 0,
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
 * **넣은 물건이 아니라 배낭에 있는 물건을 돌려준다.** 겹쳐 쌓았을 때 이 둘은 다른
 * 물건이다 — 바닥에서 집은 쪽은 배낭 자리(`letter`)가 없다. 예전에는 `true` 만
 * 돌려줘서, 부르는 쪽이 집은 물건의 자리를 읽다가 「`undefined`) 식량」을 적었다.
 *
 * 넣지 못하면 null 을 준다. 부르는 쪽이 "배낭이 꽉 찼다" 를 말해야 한다.
 */
export function addToPack(hero: Hero, it: Item): Item | null {
    it.x = -1;
    it.y = -1;
    const stackable = it.kind === "food" || it.kind === "potion" || it.kind === "scroll";
    if (stackable) {
        const same = hero.pack.find(
            (p) => p.kind === it.kind && p.type === it.type && p.id !== it.id,
        );
        if (same) {
            same.count += it.count;
            return same;
        }
    }
    const letter = freeLetter(hero);
    if (!letter) return null;
    it.letter = letter;
    hero.pack.push(it);
    hero.pack.sort((a, b) => (a.letter ?? "").localeCompare(b.letter ?? ""));
    return it;
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

/** 지금 낀 반지 — 왼손·오른손 순서. 없는 손은 건너뛴다. */
export function wornRings(hero: Hero): Item[] {
    return [hero.leftRingId, hero.rightRingId]
        .map((id) => (id === null ? undefined : hero.pack.find((i) => i.id === id)))
        .filter((i): i is Item => !!i);
}

function ringSum(hero: Hero, type: string): number {
    return wornRings(hero)
        .filter((r) => r.type === type)
        .reduce((s, r) => s + (r.plusRing ?? 0), 0);
}

export function hasRing(hero: Hero, type: string): boolean {
    return wornRings(hero).some((r) => r.type === type);
}

/**
 * 지금의 방어 등급 — 갑옷이 없으면 맨몸 10 이고, **보호 반지가 더 내린다.**
 *
 * 화면도 몬스터도 이 함수 하나만 본다. 반지를 세는 자리가 둘이 되면 어느 날 화면에
 * 적힌 방어와 실제로 맞는 방어가 달라진다.
 */
export function heroArmor(hero: Hero): number {
    return armorClassOf(equippedArmor(hero)) - ringSum(hero, "protection");
}

/**
 * 내 **방어도(AC)** — 몬스터의 공격 굴림이 넘어야 할 문턱이다.
 *
 * 안쪽은 원작의 방어 등급(낮을수록 단단)을 그대로 들고 있고(`heroArmor`), 옮기는 자리는
 * `items.armorClass` 하나뿐이다. 바깥으로 나가는 숫자는 전부 이쪽이다.
 */
export function heroDefense(hero: Hero): number {
    return armorClass(heroArmor(hero));
}

/** 내 숙련 보너스 — 레벨이 오르면 네 레벨마다 하나씩 는다. */
export function heroProficiency(hero: Hero): number {
    return proficiency(hero.level);
}

/** 굴림에 얹히는 것 하나 — 얼마가, 무엇 때문에. 기록이 이 이름을 그대로 적는다. */
export interface Term {
    n: number;
    why: string;
}

/**
 * 공격 굴림에 얹히는 것들 — **D&D 의 숙련 + 능력 보정 + 손질.**
 *
 * 굴림도 화면도 이 목록 하나를 본다. 화면이 숙련과 힘과 손질을 따로 주워 모아 더하면
 * 그 셈이 두 벌이 되고, 어느 날 **화면에 적힌 명중과 실제로 굴리는 명중이 갈린다.**
 */
export function heroHitTerms(hero: Hero): Term[] {
    const weapon = equippedWeapon(hero);
    return [
        { n: proficiency(hero.level), why: "숙련" },
        { n: strHitBonus(heroStr(hero)), why: "힘" },
        { n: weapon?.plusHit ?? 0, why: "무기" },
    ];
}

/** 피해에 얹히는 것들 — 같은 능력 보정이 여기에도 온다(D&D 가 그렇다). */
export function heroDamTerms(hero: Hero): Term[] {
    const weapon = equippedWeapon(hero);
    return [
        { n: strHitBonus(heroStr(hero)), why: "힘" },
        { n: weapon?.plusDam ?? 0, why: "무기" },
    ];
}

/**
 * 화면에 적는 **명중** — `heroHitTerms` 를 더한 값이다.
 *
 * 손질(`+1`)은 **써 보기 전에는 모른다.** 그래서 `known` 을 받아, 모르는 무기면 무기
 * 몫을 빼고 적는다 — 굴림은 실제 값으로 하되 화면이 속을 흘리지는 않는다.
 */
export function heroHitBonus(hero: Hero, known: Record<string, boolean> = {}): number {
    const w = equippedWeapon(hero);
    const identified = !!w && known[`weapon:${w.type}`] === true;
    return heroHitTerms(hero)
        .filter((t) => identified || t.why !== "무기")
        .reduce((sum, t) => sum + t.n, 0);
}

/** 지금의 힘 — 힘 반지가 얹힌다. 명중·피해 보정은 이 값으로 잰다. */
export function heroStr(hero: Hero): number {
    return hero.str + ringSum(hero, "add strength");
}

/**
 * 한 걸음에 배가 얼마나 고픈가.
 *
 * **반지는 식량을 태운다.** 이 대가가 없으면 두 손에 둘을 끼지 않을 이유가 없고,
 * 반지는 공짜 능력치가 된다. 「소화 억제」만 반대로 간다.
 */
export function hungerRate(hero: Hero): number {
    const extra = wornRings(hero).reduce((s, r) => s + (RINGS[r.type]?.hunger ?? 0), 0);
    return Math.max(0, 1 + extra);
}

/** 몇 턴마다 체력이 1 오르는가. 재생 반지가 절반으로 줄인다. */
export function regenEvery(hero: Hero): number {
    const base = Math.max(3, 21 - hero.level * 2);
    return hasRing(hero, "regeneration") ? Math.max(2, Math.floor(base / 2)) : base;
}

/** 한 번 뒤졌을 때 숨은 것을 찾을 확률. 탐색 반지가 크게 올린다. */
export function searchChance(hero: Hero): number {
    return hasRing(hero, "searching") ? 0.65 : 0.25;
}

export function heroDamageDice(hero: Hero): string {
    return weaponDamageOf(equippedWeapon(hero));
}

/**
 * 지금 휘두르면 굴리는 것 — **화면에 적는 「피해」가 이 값이다.**
 *
 * 방어가 `heroArmor()` 하나로 나오듯 공격도 여기 하나로 나온다. 화면이 무기 주사위와
 * 손질과 힘을 따로 주워 모아 더하면 그 셈이 두 벌이 되고, 어느 날 화면에 적힌 공격과
 * 실제로 들어가는 피해가 달라진다.
 *
 * 손질(`+1`)은 **써 보기 전에는 모른다.** 그래서 `known` 을 받아, 모르는 무기면 그
 * 몫을 빼고 적는다 — 화면이 정체 모를 무기의 속을 흘리면 안 된다.
 */
export function heroAttackText(hero: Hero, known: Record<string, boolean>): string {
    const w = equippedWeapon(hero);
    const identified = !!w && known[`weapon:${w.type}`] === true;
    const bonus = heroDamTerms(hero)
        .filter((t) => identified || t.why !== "무기")
        .reduce((sum, t) => sum + t.n, 0);
    return `${heroDamageDice(hero)}${bonus === 0 ? "" : bonus > 0 ? `+${bonus}` : `${bonus}`}`;
}

/** 지금 몸에 붙어 있는가 — 저주받아 못 벗는 것. */
export function isWorn(hero: Hero, it: Item): boolean {
    return (
        it.id === hero.weaponId ||
        it.id === hero.armorId ||
        it.id === hero.leftRingId ||
        it.id === hero.rightRingId
    );
}

/**
 * 경험치를 준다. 레벨이 올랐으면 그 사실을 돌려준다 — 메시지는 부르는 쪽이 쓴다.
 */
export function gainExp(hero: Hero, amount: number, rng: Rng): number[] {
    hero.exp += amount;
    const gained: number[] = [];
    while (hero.level - 1 < EXP_LEVELS.length && hero.exp >= EXP_LEVELS[hero.level - 1]) {
        hero.level += 1;
        // **굴리지 않는다.** 몬스터 체력과 같은 이유다 — 같은 레벨의 두 판이 체력만
        // 다른 것은 판단거리가 아니라 그냥 운이다(`monsters.ts` 머리말 참고).
        hero.maxHp += HP_PER_LEVEL;
        hero.hp += HP_PER_LEVEL;
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
