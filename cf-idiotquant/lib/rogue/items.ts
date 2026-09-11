/**
 * 물건 — 그리고 **정체를 모른 채 줍는다**는 Rogue 의 규칙.
 *
 * 물약의 색과 주문서의 이름은 **판마다 섞인다.** 그래서 「파란 물약」이 회복인지 독인지는
 * 마셔 봐야 알고, 그 한 모금이 이 게임의 도박이다. 알아낸 것은 `GameState.known` 에
 * 쌓이고 **판이 끝나면 사라진다** — 다음 판의 파란 물약은 다른 것이다.
 *
 * 이름을 부르는 자리는 `describe()` **하나뿐이다.** 화면이 따로 이름을 지어내면
 * 알아낸 것과 안 알아낸 것이 화면마다 달라 보인다.
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
}

export interface ArmorDef {
    name: string;
    /** 방어 등급 — **낮을수록 단단하다.** */
    armor: number;
    freq: number;
}

export const WEAPONS: Record<string, WeaponDef> = {
    dagger: { name: "단검", damage: "1d6", freq: 10 },
    mace: { name: "철퇴", damage: "2d4", freq: 10 },
    "long sword": { name: "장검", damage: "3d4", freq: 8 },
    "two-handed sword": { name: "양손검", damage: "4d4", freq: 4 },
    spear: { name: "창", damage: "2d3", freq: 6 },
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
};

export const SCROLLS: Record<string, { name: string; freq: number }> = {
    "magic mapping": { name: "지도", freq: 8 },
    teleport: { name: "순간이동", freq: 8 },
    "enchant weapon": { name: "무기 손질", freq: 10 },
    "enchant armor": { name: "갑옷 손질", freq: 10 },
    identify: { name: "감정", freq: 14 },
    "aggravate monsters": { name: "도발", freq: 5 },
    sleep: { name: "잠", freq: 5 },
};

/** 물약이 이 판에서 무슨 색으로 보이는가 — 스물 몇 가지를 섞어 쓴다. */
const POTION_LOOKS = [
    "빨간", "파란", "초록", "노란", "검은", "갈색", "은빛", "보라", "주황", "하얀",
    "탁한", "반짝이는", "거품 이는", "짙은", "투명한",
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
    return it;
}

/**
 * 이 층에 떨어져 있을 물건 하나. 깊을수록 금화가 두둑하다.
 */
export function randomItem(depth: number, id: number, x: number, y: number, rng: Rng): Item {
    const r = rng.rnd(100);
    if (r < 26) return makeItem("gold", "gold", id, x, y, rng.between(2, 50 + depth * 10));
    if (r < 44) return makeItem("potion", weighted(POTIONS, rng), id, x, y);
    if (r < 62) return makeItem("scroll", weighted(SCROLLS, rng), id, x, y);
    if (r < 74) return makeItem("food", "food ration", id, x, y);
    if (r < 87) {
        const it = makeItem("weapon", weighted(WEAPONS, rng), id, x, y);
        // 가끔 손질된 것이 나온다 — 그리고 가끔 상한 것도.
        const plus = rng.rnd(10) === 0 ? -1 : rng.rnd(6) === 0 ? 1 : 0;
        it.plusHit = plus;
        it.plusDam = plus;
        return it;
    }
    const it = makeItem("armor", weighted(ARMORS, rng), id, x, y);
    it.plusArmor = rng.rnd(10) === 0 ? -1 : rng.rnd(6) === 0 ? 1 : 0;
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
        case "amulet":
            return ",";
    }
}

function plusText(n: number | undefined): string {
    if (!n) return "";
    return n > 0 ? ` +${n}` : ` ${n}`;
}

/**
 * 이름을 부른다 — **알아낸 만큼만.**
 *
 * 물약과 주문서는 정체를 알기 전까지 겉모습으로만 불린다. 무기와 갑옷은 이름은 알되
 * 손질 정도(`+1` · `−1`)는 **써 봐야** 안다.
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
        case "weapon": {
            const d = WEAPONS[it.type];
            const base = d?.name ?? it.type;
            return known[key] ? `${base}${plusText(it.plusHit)}` : base;
        }
        case "armor": {
            const d = ARMORS[it.type];
            const base = d?.name ?? it.type;
            return known[key] ? `${base}${plusText(it.plusArmor)}` : base;
        }
    }
}

/** 갑옷이 실제로 내주는 방어 등급 — 손질한 만큼 **내려간다.** */
export function armorClassOf(it: Item | undefined): number {
    if (!it || it.kind !== "armor") return 10;
    const base = ARMORS[it.type]?.armor ?? 10;
    return base - (it.plusArmor ?? 0);
}

export function weaponDamageOf(it: Item | undefined): string {
    if (!it || it.kind !== "weapon") return "1d2";
    return WEAPONS[it.type]?.damage ?? "1d2";
}
