/**
 * 물건 — 그리고 **정체를 모른 채 줍는다**는 Rogue 의 규칙.
 *
 * 물약의 색, 주문서의 이름, 반지의 보석, 지팡이의 재질은 **판마다 섞인다.** 그래서
 * 「파란 물약」이 회복인지 독인지는 마셔 봐야 알고, 그 한 모금이 이 게임의 도박이다.
 * 알아낸 것은 `GameState.known` 에 쌓이고 **판이 끝나면 사라진다.**
 *
 * 이름을 부르는 자리는 `describe()` **하나뿐이다.** 화면이 따로 이름을 지어내면
 * 알아낸 것과 안 알아낸 것이 화면마다 달라 보인다.
 *
 * **저주는 겉모습으로 못 가른다.** 쥐거나 입은 순간에만 드러나고, 드러나면 벗을 수
 * 없다. 그것이 「좋아 보이는 것을 집는 일」에 값을 매기는 유일한 장치다.
 */

import {
    Rng,
} from "./rng";
import {
    type Item,
    type ItemKind,
} from "./types";

export interface WeaponDef {
    name: string;
    damage: string;
    /** 나올 만한 정도 — 클수록 흔하다. */
    freq: number;
    /** 던질 수 있는가. 던지면 그 자리에 떨어진다. */
    throwable?: boolean;
    /** 뭉쳐 다니는가 (화살·다트). */
    stack?: boolean;
}

export interface ArmorDef {
    name: string;
    /** 방어 등급 — **낮을수록 단단하다.** */
    armor: number;
    freq: number;
}

export const WEAPONS: Record<string, WeaponDef> = {
    dagger: { name: "단검", damage: "1d6", freq: 10, throwable: true },
    mace: { name: "철퇴", damage: "2d4", freq: 10 },
    "long sword": { name: "장검", damage: "3d4", freq: 8 },
    "two-handed sword": { name: "양손검", damage: "4d4", freq: 4 },
    spear: { name: "창", damage: "2d3", freq: 6, throwable: true },
    dart: { name: "다트", damage: "1d3", freq: 8, throwable: true, stack: true },
    arrow: { name: "화살", damage: "1d2", freq: 8, throwable: true, stack: true },
};

export const ARMORS: Record<string, ArmorDef> = {
    leather: { name: "가죽 갑옷", armor: 8, freq: 10 },
    "ring mail": { name: "사슬 고리 갑옷", armor: 7, freq: 9 },
    "scale mail": { name: "비늘 갑옷", armor: 6, freq: 8 },
    "chain mail": { name: "사슬 갑옷", armor: 5, freq: 7 },
    "banded mail": { name: "띠 갑옷", armor: 4, freq: 5 },
    "plate mail": { name: "판금 갑옷", armor: 3, freq: 3 },
};

export const POTIONS: Record<string, { name: string; freq: number }> = {
    healing: { name: "회복", freq: 14 },
    "extra healing": { name: "큰 회복", freq: 6 },
    strength: { name: "힘", freq: 8 },
    "restore strength": { name: "힘 되돌리기", freq: 10 },
    poison: { name: "독", freq: 8 },
    blindness: { name: "실명", freq: 5 },
    confusion: { name: "혼란", freq: 6 },
    "detect monsters": { name: "괴물 감지", freq: 6 },
};

export const SCROLLS: Record<string, { name: string; freq: number }> = {
    "magic mapping": { name: "지도", freq: 8 },
    teleport: { name: "순간이동", freq: 8 },
    "enchant weapon": { name: "무기 손질", freq: 10 },
    "enchant armor": { name: "갑옷 손질", freq: 10 },
    identify: { name: "감정", freq: 14 },
    "remove curse": { name: "저주 풀기", freq: 8 },
    "aggravate monsters": { name: "도발", freq: 5 },
    sleep: { name: "잠", freq: 5 },
};

/**
 * 반지 — **끼고 있으면 배가 더 고프다.**
 *
 * 그 대가가 없으면 반지는 그냥 공짜 능력치이고, 두 손에 둘을 끼지 않을 이유가 없어진다.
 * 원작의 설계가 여기 있다: 좋은 반지일수록 식량을 태우므로 **언제 빼는가**가 결정이 된다.
 */
export const RINGS: Record<string, { name: string; freq: number; hunger: number }> = {
    protection: { name: "보호", freq: 9, hunger: 1 },
    "add strength": { name: "힘", freq: 9, hunger: 1 },
    regeneration: { name: "재생", freq: 4, hunger: 3 },
    searching: { name: "탐색", freq: 7, hunger: 1 },
    "sustain strength": { name: "힘 유지", freq: 5, hunger: 0 },
    "slow digestion": { name: "소화 억제", freq: 5, hunger: -2 },
    teleportation: { name: "순간이동", freq: 4, hunger: 1 },
    adornment: { name: "장식", freq: 2, hunger: 0 },
};

/** 지팡이 — 방향을 겨눠 쏜다. 횟수가 정해져 있다. */
export const WANDS: Record<string, { name: string; freq: number; damage?: string }> = {
    "magic missile": { name: "마법 화살", freq: 10, damage: "2d4" },
    lightning: { name: "번개", freq: 5, damage: "6d6" },
    fire: { name: "화염", freq: 5, damage: "6d6" },
    cold: { name: "냉기", freq: 5, damage: "6d6" },
    "slow monster": { name: "둔화", freq: 8 },
    "haste monster": { name: "가속", freq: 5 },
    "teleport away": { name: "밀어내기", freq: 6 },
    "cancel": { name: "무력화", freq: 5 },
};

/** 물약이 이 판에서 무슨 색으로 보이는가. */
const POTION_LOOKS = [
    "빨간", "파란", "초록", "노란", "검은", "갈색", "은빛", "보라", "주황", "하얀",
    "탁한", "반짝이는", "거품 이는", "짙은", "투명한",
];

/** 반지의 보석. */
const RING_LOOKS = [
    "루비", "사파이어", "에메랄드", "다이아몬드", "오팔", "호박", "흑요석", "진주",
    "자수정", "석류석", "터키석", "마노",
];

/** 지팡이의 재질. */
const WAND_LOOKS = [
    "떡갈나무", "주목", "은", "구리", "놋쇠", "상아", "수정", "흑단", "대나무", "주석",
    "백금", "뼈",
];

/** 주문서의 이름 — 뜻 없는 음절을 이어 붙인다. Rogue 가 그렇게 한다. */
const SYLLABLES = [
    "아", "나", "리", "무", "카", "젠", "토", "바", "시", "루",
    "네", "포", "구", "라", "미", "델", "하", "온", "즈", "윽",
];

function randomTitle(rng: Rng): string {
    const n = rng.between(2, 4);
    let s = "";
    for (let i = 0; i < n; i++) s += rng.pick(SYLLABLES);
    return s;
}

/**
 * 이 판의 겉모습을 정한다. **한 판에 한 번만** 부른다 — 층을 내려갈 때마다 부르면
 * 같은 물약이 층마다 다른 색이 되어 알아낸 것이 소용없어진다.
 */
export function rollAppearances(rng: Rng): Record<string, string> {
    const out: Record<string, string> = {};

    const looks = rng.shuffle([...POTION_LOOKS]);
    Object.keys(POTIONS).forEach((k, i) => {
        out[`potion:${k}`] = `${looks[i % looks.length]} 물약`;
    });

    const gems = rng.shuffle([...RING_LOOKS]);
    Object.keys(RINGS).forEach((k, i) => {
        out[`ring:${k}`] = `${gems[i % gems.length]} 반지`;
    });

    const woods = rng.shuffle([...WAND_LOOKS]);
    Object.keys(WANDS).forEach((k, i) => {
        out[`wand:${k}`] = `${woods[i % woods.length]} 지팡이`;
    });

    const used = new Set<string>();
    for (const k of Object.keys(SCROLLS)) {
        let t = randomTitle(rng);
        while (used.has(t)) t = randomTitle(rng);
        used.add(t);
        out[`scroll:${k}`] = `「${t}」이라 적힌 주문서`;
    }
    return out;
}

/** 빈도표에서 하나 뽑기. */
function weighted<T extends { freq: number }>(table: Record<string, T>, rng: Rng): string {
    const keys = Object.keys(table);
    const total = keys.reduce((s, k) => s + table[k].freq, 0);
    let r = rng.rnd(total);
    for (const k of keys) {
        r -= table[k].freq;
        if (r < 0) return k;
    }
    return keys[keys.length - 1];
}

export function makeItem(kind: ItemKind, type: string, id: number, x: number, y: number, count = 1): Item {
    const it: Item = { id, kind, type, count, x, y };
    if (kind === "weapon") {
        it.plusHit = 0;
        it.plusDam = 0;
    }
    if (kind === "armor") it.plusArmor = 0;
    if (kind === "ring") it.plusRing = 0;
    if (kind === "wand") it.charges = 0;
    return it;
}

/** 손질 정도를 굴린다. 열에 하나는 상했고, 상한 것은 **저주받았다.** */
function rollEnchant(rng: Rng): { plus: number; cursed: boolean } {
    if (rng.rnd(10) === 0) return { plus: -(rng.rnd(2) + 1), cursed: true };
    if (rng.rnd(5) === 0) return { plus: rng.rnd(2) + 1, cursed: false };
    return { plus: 0, cursed: false };
}

/**
 * 이 층에 떨어져 있을 물건 하나. 깊을수록 금화가 두둑하다.
 */
export function randomItem(depth: number, id: number, x: number, y: number, rng: Rng): Item {
    const r = rng.rnd(100);
    if (r < 24) return makeItem("gold", "gold", id, x, y, rng.between(2, 50 + depth * 10));
    if (r < 40) return makeItem("potion", weighted(POTIONS, rng), id, x, y);
    if (r < 56) return makeItem("scroll", weighted(SCROLLS, rng), id, x, y);
    if (r < 66) return makeItem("food", "food ration", id, x, y);

    if (r < 78) {
        const type = weighted(WEAPONS, rng);
        const def = WEAPONS[type];
        // 화살과 다트는 한 줌씩 나온다 — 하나씩 던져 봐야 아무 일도 안 난다.
        const count = def.stack ? rng.between(5, 14) : 1;
        const it = makeItem("weapon", type, id, x, y, count);
        const e = rollEnchant(rng);
        it.plusHit = e.plus;
        it.plusDam = e.plus;
        it.cursed = e.cursed;
        return it;
    }

    if (r < 88) {
        const it = makeItem("armor", weighted(ARMORS, rng), id, x, y);
        const e = rollEnchant(rng);
        it.plusArmor = e.plus;
        it.cursed = e.cursed;
        return it;
    }

    if (r < 95) {
        const type = weighted(RINGS, rng);
        const it = makeItem("ring", type, id, x, y);
        const e = rollEnchant(rng);
        // 세기가 있는 반지만 숫자를 쓴다. 나머지는 끼는 것만으로 듣는다.
        it.plusRing = type === "protection" || type === "add strength" ? Math.max(1, e.plus) : 0;
        if (e.cursed) {
            it.cursed = true;
            it.plusRing = -Math.abs(e.plus || 1);
        }
        return it;
    }

    const it = makeItem("wand", weighted(WANDS, rng), id, x, y);
    it.charges = rng.between(3, 7);
    return it;
}

/** 화면의 글자. */
export function itemChar(kind: ItemKind): string {
    switch (kind) {
        case "gold":
            return "*";
        case "food":
            return "%";
        case "potion":
            return "!";
        case "scroll":
            return "?";
        case "weapon":
            return ")";
        case "armor":
            return "]";
        case "ring":
            return "=";
        case "wand":
            return "/";
        case "amulet":
            return ",";
    }
}

function plusText(n: number | undefined): string {
    if (!n) return "";
    return n > 0 ? ` +${n}` : ` ${n}`;
}

/** 저주가 드러났으면 그렇게 적는다. 드러나기 전에는 아무 표시도 없다. */
function curseText(it: Item): string {
    return it.curseKnown && it.cursed ? " (저주)" : "";
}

/**
 * 이름을 부른다 — **알아낸 만큼만.**
 *
 * 물약·주문서·반지·지팡이는 정체를 알기 전까지 겉모습으로만 불린다. 무기와 갑옷은
 * 이름은 알되 손질 정도(`+1` · `−1`)는 **써 봐야** 안다.
 */
export function describe(
    it: Item,
    known: Record<string, boolean>,
    appearance: Record<string, string>,
): string {
    const key = `${it.kind}:${it.type}`;
    switch (it.kind) {
        case "gold":
            return `금화 ${it.count}`;
        case "food":
            return it.count > 1 ? `식량 ${it.count}개` : "식량";
        case "amulet":
            return "옌더의 증표";
        case "potion":
            return known[key] ? `${POTIONS[it.type]?.name ?? it.type} 물약` : (appearance[key] ?? "물약");
        case "scroll":
            return known[key] ? `${SCROLLS[it.type]?.name ?? it.type} 주문서` : (appearance[key] ?? "주문서");
        case "ring": {
            const base = known[key] ? `${RINGS[it.type]?.name ?? it.type} 반지` : (appearance[key] ?? "반지");
            return known[key] ? `${base}${plusText(it.plusRing)}${curseText(it)}` : `${base}${curseText(it)}`;
        }
        case "wand": {
            const base = known[key] ? `${WANDS[it.type]?.name ?? it.type} 지팡이` : (appearance[key] ?? "지팡이");
            return known[key] ? `${base} (${it.charges ?? 0}회)` : base;
        }
        case "weapon": {
            // **개수는 여기서 안 붙인다.** 화면이 이미 `×10` 을 붙이므로 「다트 10개 ×10」
            // 이 되고, 하나를 던졌을 때 「다트 10개를 던졌다」로도 읽힌다.
            const base = WEAPONS[it.type]?.name ?? it.type;
            return known[key]
                ? `${base}${plusText(it.plusHit)}${curseText(it)}`
                : `${base}${curseText(it)}`;
        }
        case "armor": {
            const base = ARMORS[it.type]?.name ?? it.type;
            return known[key]
                ? `${base}${plusText(it.plusArmor)}${curseText(it)}`
                : `${base}${curseText(it)}`;
        }
    }
}

/** 갑옷이 실제로 내주는 방어 등급 — 손질한 만큼 **내려간다.** */
export function armorClassOf(it: Item | undefined): number {
    if (!it || it.kind !== "armor") return 10;
    const base = ARMORS[it.type]?.armor ?? 10;
    return base - (it.plusArmor ?? 0);
}

/**
 * 원작의 방어 등급을 **D&D 의 방어도(AC)** 로 옮긴다.
 *
 * Rogue 의 등급은 낮을수록 단단하고(맨몸 10, 판금 3, 용 −1), D&D 의 AC 는 **높을수록
 * 단단하며 공격 굴림이 넘어야 할 문턱**이다(맨몸 10, 판금 17, 용 21). `20 − 등급` 이
 * 그 둘을 잇는다 — 맨몸이 양쪽에서 10 으로 맞아떨어지는 것이 이 식의 근거다.
 *
 * 표는 원작 값을 그대로 들고, **옮기는 자리는 여기 하나뿐이다.** 굴림도 화면도 전부
 * 이쪽 값을 쓴다. 뒤집는 곳이 둘이 되면 어느 날 한쪽만 바뀐다.
 */
export function armorClass(rogueArmor: number): number {
    return 20 - rogueArmor;
}

/**
 * 배낭에서 고를 때 보이는 한 줄짜리 성능 — **`+` 가 붙으면 숫자가 커져야 한다.**
 *
 * 무기는 **피해**를 적는다. 명중은 무기 혼자 정하는 값이 아니라 숙련과 힘이 같이
 * 만드는 것이라 배낭 줄에 적을 수 없다 — 그것은 「지금의 나」 줄이 맡는다.
 *
 * 예전에는 무기는 기본 주사위만, 갑옷은 방어 등급을 그대로 적었다. 그래서 `+2 장검`
 * 과 맹탕 장검이 똑같이 `3d4` 로 보였고, `+1` 을 손질한 가죽 갑옷은 `방어 8` 이
 * `방어 7` 로 **내려가서 나빠 보였다.** 둘 다 고쳤다.
 *
 * 손질은 **정체를 알아낸 물건에만** 얹는다 — 모르는 물건의 속을 화면이 흘리면 안 된다.
 */
export function itemPower(it: Item, known: Record<string, boolean>): string {
    const seen = known[`${it.kind}:${it.type}`] === true;
    if (it.kind === "weapon") {
        const plus = seen ? (it.plusDam ?? 0) : 0;
        return `피해 ${weaponDamageOf(it)}${plus === 0 ? "" : plus > 0 ? `+${plus}` : `${plus}`}`;
    }
    if (it.kind === "armor") {
        // 모르는 갑옷은 손질을 뺀 기본값으로 적는다.
        const base = ARMORS[it.type]?.armor ?? 10;
        return `방어도 ${armorClass(seen ? armorClassOf(it) : base)}`;
    }
    return "";
}

export function weaponDamageOf(it: Item | undefined): string {
    if (!it || it.kind !== "weapon") return "1d2";
    return WEAPONS[it.type]?.damage ?? "1d2";
}

export function isThrowable(it: Item): boolean {
    if (it.kind === "potion") return true;
    return it.kind === "weapon" && !!WEAPONS[it.type]?.throwable;
}
