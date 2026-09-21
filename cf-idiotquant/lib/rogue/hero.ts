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
    type HeroOrigin,
    type Item,
} from "./types";
import {
    RINGS,
    WEAPONS,
    armorClassOf,
    defenseOf,
    makeItem,
    weaponDamageOf,
} from "./items";
import {
    abilityMod,
    proficiency,
} from "./dnd";
import { ADVANCED_GUARD_BONUS, ADVANCE_LEVEL, DUAL_WIELD, ORIGINS, type WeaponAffinity } from "./origins";

/** 이 경험치를 넘으면 다음 레벨. 원작의 `e_levels` 와 같은 모양이다. */
export const EXP_LEVELS = [
    10, 20, 40, 80, 160, 320, 640, 1300, 2600, 5200, 10000, 20000, 40000, 80000,
    160000, 320000, 1000000, 3333333, 6666666, 10000000,
];

/** 레벨이 오를 때마다 느는 체력. 고정값이다. */
export const HP_PER_LEVEL = 5;

/**
 * 이 레벨마다 성장 하나를 고른다(힘·방어·아이템운) — `hero.pendingSkillPicks` 하나가
 * 쌓고, `game.pickSkill` 하나가 던다. 캠프가 아니어도, 턴을 안 써도 고를 수 있다 —
 * 레벨업 자체가 턴을 안 쓰는 것과 같은 자리다.
 */
export const SKILL_PICK_INTERVAL = 3;

/** (하한, 상한] 사이에 있는 `SKILL_PICK_INTERVAL` 의 배수 개수 — 한 번에 여러 레벨을 건너뛰어도 안 놓친다. */
function triplesInRange(lo: number, hi: number): number {
    return Math.floor(hi / SKILL_PICK_INTERVAL) - Math.floor(lo / SKILL_PICK_INTERVAL);
}

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

export function makeHero(rng: Rng, nextId: () => number, origin: HeroOrigin = "knight"): Hero {
    const originDef = ORIGINS[origin] ?? ORIGINS.knight;
    const hero: Hero = {
        origin,
        guarded: false,
        x: 0,
        y: 0,
        hp: originDef.baseHp,
        maxHp: originDef.baseHp,
        exp: 0,
        level: 1,
        str: originDef.baseStr,
        maxStr: originDef.baseStr,
        gold: 0,
        pack: [],
        // 상자는 **판이 주는 것이 아니라 그 사람이 들고 오는 것**이다 — 화면이 저장소에서
        // 꺼내 `newGame`·`joinGame` 에 넘기고, 그쪽이 여기에 채운다.
        chest: [],
        weaponId: null,
        offWeaponId: null,
        armorId: null,
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
        pendingSkillPicks: 0,
        bonusDefense: 0,
        itemLuck: 0,
        classSkillDepth: 0,
    };
    const startingItems = originDef.createStartingItems(nextId);
    for (const item of startingItems) {
        addToPack(hero, item);
        if (item.kind === "weapon" && hero.weaponId === null) {
            hero.weaponId = item.id;
        } else if (item.kind === "armor" && hero.armorId === null) {
            hero.armorId = item.id;
        }
    }
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
    if (hero.leftRingId === it.id) hero.leftRingId = null;
    if (hero.rightRingId === it.id) hero.rightRingId = null;
}

export function packItem(hero: Hero, letter: string): Item | undefined {
    return hero.pack.find((i) => i.letter === letter);
}

export function equippedWeapon(hero: Hero): Item | undefined {
    return hero.pack.find((i) => i.id === hero.weaponId);
}

/** 지금 쥔 무기가 제 직업의 무기인가. 전투·화면이 같은 답을 읽는다. */
export function weaponAffinityOf(hero: Hero, weapon = equippedWeapon(hero)): WeaponAffinity | undefined {
    const affinity = ORIGINS[hero.origin ?? "knight"].weaponAffinity;
    return weapon?.kind === "weapon" && affinity.types.includes(weapon.type) ? affinity : undefined;
}

/** 보조손에 쥔 것 — 이도류가 아니면 `undefined`. */
export function offHandWeapon(hero: Hero): Item | undefined {
    return hero.offWeaponId === null ? undefined : hero.pack.find((i) => i.id === hero.offWeaponId);
}

/** 제 직업의 짝 무기를 양손에 모두 쥐고 있는가. 도적의 양손 단검도 이 값으로 읽는다. */
export function isDualWielding(hero: Hero): boolean {
    const pair = DUAL_WIELD[hero.origin ?? "knight"];
    const main = equippedWeapon(hero);
    const off = offHandWeapon(hero);
    return !!pair && main?.type === pair && off?.type === pair;
}

/**
 * 이 사람이 이 물건을 **보조손에 쥘 수 있는가.**
 *
 * 규칙이 넷이고 **여기 한 자리**에서 본다 — 화면도 엔진도 이것만 부른다(자물쇠는 둘이다).
 *
 *   ① 무기여야 한다.
 *   ② **제 직업이 이도류로 쓰는 종류**여야 한다(`DUAL_WIELD`). 도적은 단검, 근위대는 장검.
 *   ③ **주손에 같은 종류를 쥐고** 있어야 한다 — 한 손에만 들면 그냥 한 자루다.
 *   ④ 주손에 쥔 **그 물건 자체**는 안 된다. 한 자루를 두 손에 들 수는 없다.
 */
export function canOffHand(hero: Hero, it: Item): boolean {
    if (it.kind !== "weapon") return false;
    const pair = DUAL_WIELD[hero.origin ?? "knight"];
    if (!pair || it.type !== pair) return false;
    const main = equippedWeapon(hero);
    return !!main && main.type === pair && main.id !== it.id;
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

/** 금화 반지의 금화 보너스 — 금화를 줍는 두 경로가 같은 값을 쓴다. */
export function goldGain(hero: Hero, gold: number): number {
    return hasRing(hero, "adornment") ? Math.ceil(gold * 1.5) : gold;
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
 * 내 **방어력** — 맞았을 때 상대의 공격력에서 빼는 값이다(맨몸 0, 판금 7 언저리).
 *
 * 안쪽은 원작의 방어 등급(낮을수록 단단)을 그대로 들고 있고(`heroArmor`), 옮기는 자리는
 * `items.defenseOf` 하나뿐이다. 바깥으로 나가는 숫자는 전부 이쪽이다.
 */
export function heroDefense(hero: Hero): number {
    let base = defenseOf(heroArmor(hero)) + (hero.bonusDefense ?? 0);
    // 기사단장의 전직 보상은 단추가 아니라 위기에서 저절로 서는 방벽이다.
    if (hero.origin === "knight" && hero.level >= ADVANCE_LEVEL && hero.hp <= hero.maxHp / 2) base += 2;
    if (!hero.guarded || hero.origin !== "knight") return base;
    // 전직(`ADVANCE_LEVEL`)한 근위대는 대기 보너스가 깊어진다 — 「철벽의 자세」가
    // 켜는 값은 이 자리 하나다. `origins.ADVANCED_GUARD_BONUS` 가 그 수치를 쥔다.
    return base + (hero.level >= ADVANCE_LEVEL ? ADVANCED_GUARD_BONUS : 2);
}

/**
 * **수비 굴림에 얹히는 것** — 숙련 하나뿐이다.
 *
 * 갑옷은 여기 안 붙는다. 붙이면 갑옷이 **피하는 데에는 피해를 깎는 데에는** 두 번
 * 세이고, 그러면 판금 갑옷 한 벌에 싸움이 끝난다. 갑옷은 「덜 아프게」만 한다.
 */
export function heroDodgeBonus(hero: Hero): number {
    const base = proficiency(hero.level);
    const armor = equippedArmor(hero);
    const topazBonus = armor?.socketGem === "topaz" ? 2 : 0;
    return base + topazBonus;
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
export function heroHitTerms(hero: Hero, weapon = equippedWeapon(hero)): Term[] {
    const affinity = weaponAffinityOf(hero, weapon);
    return [
        { n: proficiency(hero.level), why: "숙련" },
        { n: strHitBonus(heroStr(hero)), why: "힘" },
        { n: weapon?.plusHit ?? 0, why: weaponLabel(weapon) },
        ...(affinity ? [{ n: 1, why: affinity.name }] : []),
    ];
}

/** 피해에 얹히는 것들 — 같은 능력 보정이 여기에도 온다(D&D 가 그렇다). */
/** `withStr` 가 거짓이면 **힘 보정을 안 얹는다** — 이도류의 보조손이 그렇다. */
export function heroDamTerms(hero: Hero, weapon = equippedWeapon(hero), withStr = true): Term[] {
    const affinity = weaponAffinityOf(hero, weapon);
    const terms: Term[] = [
        ...(withStr ? [{ n: strHitBonus(heroStr(hero)), why: "힘" }] : []),
        { n: weapon?.plusDam ?? 0, why: weaponLabel(weapon) },
        ...(affinity ? [{ n: 1, why: affinity.name }] : []),
    ];
    const midas = hero.pack.some((it) => it.kind === "relic" && it.type === "midas_gauntlet")
        ? Math.min(10, Math.floor(hero.gold / 100))
        : 0;
    if (midas > 0) {
        terms.push({ n: midas, why: "미다스" });
    }
    return terms;
}

/**
 * 굴림 줄에 적는 무기의 이름 — `+2무기` 가 아니라 **`+2진은검`.**
 *
 * 사다리가 층을 타는 지금은 「무엇으로 쳤나」가 판단거리다. 그냥 「무기」라고 적으면
 * 강화 수치는 보이는데 **그게 어느 칼의 것인지가 안 보인다.** 기록을 되짚을 때
 * 「그때 뭘 들고 있었지」를 못 읽는다.
 *
 * 쥔 것이 없으면 「무기」로 둔다 — 어차피 `0` 이라 줄에 안 찍힌다(`terms()` 가 0 을 뺀다).
 */
function weaponLabel(weapon: Item | undefined): string {
    return weapon ? (WEAPONS[weapon.type]?.name ?? "무기") : "무기";
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
    const sum = heroHitTerms(hero).reduce((s, t) => s + t.n, 0);
    // **이름표로 고르지 않는다.** 예전에는 `why !== "무기"` 로 걸렀는데, 굴림 줄에 무기
    // 이름을 적기 시작하자(`+2진은검`) 그 문자열이 안 맞아 **조용히 안 가려졌다.**
    // 빼야 할 것은 「무기라고 적힌 항목」이 아니라 **그 무기의 손질값**이다.
    return identified ? sum : sum - (w?.plusHit ?? 0);
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

export function heroDamageDice(hero: Hero, weapon = equippedWeapon(hero)): string {
    return weaponDamageOf(weapon);
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
    /** 한 손 몫 — 보조손은 힘 보정이 안 얹힌다(`combat.swing` 과 같은 규칙이다). */
    const one = (w: Item | undefined, withStr: boolean) => {
        const identified = !!w && known[`weapon:${w.type}`] === true;
        // `heroHitBonus` 와 같은 이유로 **이름표가 아니라 값으로** 뺀다(거기 주석 참고).
        const all = heroDamTerms(hero, w, withStr).reduce((sum, t) => sum + t.n, 0);
        const bonus = identified ? all : all - (w?.plusDam ?? 0);
        return `${heroDamageDice(hero, w)}${bonus === 0 ? "" : bonus > 0 ? `+${bonus}` : `${bonus}`}`;
    };
    const main = one(equippedWeapon(hero), true);
    const off = offHandWeapon(hero);
    // **두 자루면 둘 다 적는다.** 한쪽만 적으면 화면의 「피해」가 실제로 굴리는 것의
    // 절반이 되고, 그건 화면이 거짓말을 하는 자리다.
    return off ? `${main} + ${one(off, false)}` : main;
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
    const startLevel = hero.level;
    while (hero.level - 1 < EXP_LEVELS.length && hero.exp >= EXP_LEVELS[hero.level - 1]) {
        hero.level += 1;
        // **굴리지 않는다.** 몬스터 체력과 같은 이유다 — 같은 레벨의 두 판이 체력만
        // 다른 것은 판단거리가 아니라 그냥 운이다(`monsters.ts` 머리말 참고).
        hero.maxHp += HP_PER_LEVEL;
        hero.hp += HP_PER_LEVEL;
        gained.push(hero.level);
    }
    // **건너뛴 레벨도 센다.** 큰 몬스터 하나로 두 레벨을 한 번에 오르면 3레벨짜리 문턱을
    // 하나 넘었을 수 있다 — `triplesInRange` 가 시작과 끝 **사이**의 배수를 센다.
    hero.pendingSkillPicks += triplesInRange(startLevel, hero.level);
    return gained;
}

/** 배고픔의 단계 — 화면의 상태 줄이 원작 Rogue 명칭을 그대로 적는다. */
export type HungerState = "" | "Hungry" | "Weak" | "Faint";

export function hungerOf(hero: Hero): HungerState {
    if (hero.food <= 20) return "Faint";
    if (hero.food <= 150) return "Weak";
    if (hero.food <= 300) return "Hungry";
    return "";
}
