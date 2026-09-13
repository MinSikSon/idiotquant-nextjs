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
 * **화면에 로마자를 안 내보낸다.** 표에 없는 `type` 이 오면 예전에는 그 키(`banded mail`
 * 같은 영문)를 그대로 찍었다. 표에서 한 줄을 지우는 순간 **그걸 들고 있던 옛 저장이
 * 영어로 뜬다** — 실제로 그렇게 됐었다. 지금은 「이름 없는 갑옷」으로 물러선다.
 * (표에서 줄을 지우는 것 자체를 되도록 하지 말 것. 옛 저장은 그 키를 계속 들고 있다.)
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

/**
 * ── 물건의 **등급은 층이다** ────────────────────────────────────────────────
 *
 * 모든 표에 `depth` 가 있다. **그 층보다 얕은 데서는 안 나온다.** 예전에는 빈도표
 * 하나로만 뽑아서 지하 1층에서 판금 갑옷이 나오고 25층에서 단검이 나왔다 — 그러면
 * 내려갈 이유가 금화뿐이고, **줍는 일이 판단거리가 아니라 그냥 운**이 된다.
 *
 * 장비(무기·갑옷)에는 **위쪽 경계도** 있다(`GEAR_BAND`). 아래로 여덟 층을 지나면
 * 그 장비는 더 이상 안 떨어진다. 하한만 두면 깊은 층의 바닥이 단검과 가죽 갑옷으로
 * 덮여서, 고쳐도 고친 것 같지가 않다.
 *
 * **소모품(물약·주문서)과 반지·지팡이는 안 낡는다** — 하한만 본다. 26층에서도 체력
 * 회복 물약은 나와야 하고, 무력화 지팡이는 어느 층에서나 쓸모가 있다.
 *
 * ── 이름은 **리니지1** 을 참고했다 ──────────────────────────────────────────
 *
 * 사다리의 이름값이 곧 「지금 몇 층짜리 물건을 들고 있는가」다. 진은검·목마른 자의 검·
 * 기사의 검·바포메트의 검은 그 게임에서 순서가 몸에 밴 이름들이라, 처음 보는 사람도
 * 어느 쪽이 위인지 안다. **`type` 키(영문)는 안 바꿨다** — 저장과 테스트가 그 키를
 * 들고 있어서, 이름만 바꾸면 예전 저장도 그대로 열린다.
 */

/** 장비가 낡아 사라지기까지 — 제 층에서 이만큼 내려가면 더 안 떨어진다. */
const GEAR_BAND = 8;

export interface WeaponDef {
    name: string;
    damage: string;
    /** 나올 만한 정도 — 클수록 흔하다. */
    freq: number;
    /** **이 층부터** 나온다. 그보다 얕은 층에는 없다. */
    depth: number;
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
    /** **이 층부터** 나온다. */
    depth: number;
}

/**
 * 무기 사다리 — 피해의 기댓값이 층을 따라 오른다.
 *
 * `3d4`(7.5) → `4d4`(10) → `4d5`(12) → `4d6`(14) → `5d5`(15) → `5d6`(17.5) → `6d5`(18).
 * 한 칸이 두 배씩 뛰지 않는다 — 한 자루 주웠다고 판이 끝나면 그 뒤로 주울 이유가 없다.
 */
export const WEAPONS: Record<string, WeaponDef> = {
    // 1층부터 — 처음 쥐는 것들
    dagger: { name: "단검", damage: "1d6", freq: 10, depth: 1, throwable: true },
    mace: { name: "철퇴", damage: "2d4", freq: 10, depth: 1 },
    spear: { name: "창", damage: "2d3", freq: 6, depth: 1, throwable: true },
    dart: { name: "표창", damage: "1d3", freq: 8, depth: 1, throwable: true, stack: true },
    arrow: { name: "화살", damage: "1d2", freq: 8, depth: 1, throwable: true, stack: true },
    // 사다리
    "long sword": { name: "장검", damage: "3d4", freq: 9, depth: 4 },
    "two-handed sword": { name: "양손검", damage: "4d4", freq: 7, depth: 8 },
    "silver arrow": { name: "은화살", damage: "1d4", freq: 6, depth: 9, throwable: true, stack: true },
    "silver sword": { name: "진은검", damage: "4d5", freq: 6, depth: 12 },
    "thirsty sword": { name: "목마른 자의 검", damage: "4d6", freq: 5, depth: 16 },
    "magic sword": { name: "마법의 검", damage: "5d5", freq: 4, depth: 19 },
    "knight sword": { name: "기사의 검", damage: "5d6", freq: 3, depth: 22 },
    "baphomet sword": { name: "바포메트의 검", damage: "6d5", freq: 2, depth: 25 },
};

/** 갑옷 사다리 — 방어 등급이 내려가고(= 방어도가 올라가고) 층이 오른다. */
export const ARMORS: Record<string, ArmorDef> = {
    leather: { name: "가죽 갑옷", armor: 8, freq: 10, depth: 1 },
    "ring mail": { name: "사슬 고리 갑옷", armor: 7, freq: 9, depth: 1 },
    "scale mail": { name: "비늘 갑옷", armor: 6, freq: 8, depth: 4 },
    "chain mail": { name: "사슬 갑옷", armor: 5, freq: 8, depth: 7 },
    "banded mail": { name: "띠 갑옷", armor: 4, freq: 7, depth: 9 },
    "plate mail": { name: "판금 갑옷", armor: 3, freq: 6, depth: 11 },
    "mithril mail": { name: "미스릴 갑옷", armor: 2, freq: 5, depth: 15 },
    "dragon mail": { name: "용비늘 갑옷", armor: 1, freq: 3, depth: 19 },
    "baphomet mail": { name: "바포메트의 갑옷", armor: 0, freq: 2, depth: 23 },
};

export const POTIONS: Record<string, { name: string; freq: number; depth: number }> = {
    healing: { name: "체력 회복", freq: 14, depth: 1 },
    "extra healing": { name: "고급 체력 회복", freq: 6, depth: 6 },
    // 리니지의 「용기의 물약」이 근력을 올린다. 여기서도 그 일을 한다.
    strength: { name: "용기", freq: 8, depth: 3 },
    // 이 게임에서 힘을 깎는 것은 독이고, 이것이 그것을 되돌린다 — 곧 해독제다.
    "restore strength": { name: "해독", freq: 10, depth: 3 },
    poison: { name: "독", freq: 8, depth: 1 },
    blindness: { name: "암흑", freq: 5, depth: 2 },
    confusion: { name: "혼란", freq: 6, depth: 2 },
    "detect monsters": { name: "생명 탐지", freq: 6, depth: 4 },
};

export const SCROLLS: Record<string, { name: string; freq: number; depth: number }> = {
    "magic mapping": { name: "지도", freq: 8, depth: 3 },
    teleport: { name: "순간이동", freq: 8, depth: 1 },
    "enchant weapon": { name: "무기 강화", freq: 10, depth: 1 },
    "enchant armor": { name: "갑옷 강화", freq: 10, depth: 1 },
    identify: { name: "감정", freq: 14, depth: 1 },
    "remove curse": { name: "저주 해제", freq: 8, depth: 3 },
    "aggravate monsters": { name: "도발", freq: 5, depth: 2 },
    sleep: { name: "수면", freq: 5, depth: 2 },
};

/**
 * 반지 — **끼고 있으면 배가 더 고프다.**
 *
 * 그 대가가 없으면 반지는 그냥 공짜 능력치이고, 두 손에 둘을 끼지 않을 이유가 없어진다.
 * 원작의 설계가 여기 있다: 좋은 반지일수록 식량을 태우므로 **언제 빼는가**가 결정이 된다.
 *
 * **이름은 안 바꿨다.** 반지의 이름은 곧 효과이고(「재생」·「소화 억제」), 그 자리에
 * 물건 이름을 넣으면 알아낸 뒤에도 무슨 반지인지 알 수 없게 된다.
 */
export const RINGS: Record<string, { name: string; freq: number; hunger: number; depth: number }> = {
    protection: { name: "보호", freq: 9, hunger: 1, depth: 1 },
    "add strength": { name: "힘", freq: 9, hunger: 1, depth: 1 },
    regeneration: { name: "재생", freq: 4, hunger: 3, depth: 5 },
    searching: { name: "탐색", freq: 7, hunger: 1, depth: 3 },
    "sustain strength": { name: "힘 유지", freq: 5, hunger: 0, depth: 3 },
    "slow digestion": { name: "소화 억제", freq: 5, hunger: -2, depth: 5 },
    teleportation: { name: "순간이동", freq: 4, hunger: 1, depth: 7 },
    adornment: { name: "장식", freq: 2, hunger: 0, depth: 1 },
};

/** 지팡이 — 방향을 겨눠 쏜다. 횟수가 정해져 있다. */
export const WANDS: Record<string, { name: string; freq: number; damage?: string; depth: number }> = {
    "magic missile": { name: "마법 화살", freq: 10, damage: "2d4", depth: 1 },
    lightning: { name: "번개", freq: 5, damage: "6d6", depth: 10 },
    fire: { name: "화염", freq: 5, damage: "6d6", depth: 10 },
    cold: { name: "냉기", freq: 5, damage: "6d6", depth: 10 },
    "slow monster": { name: "둔화", freq: 8, depth: 3 },
    "haste monster": { name: "가속", freq: 5, depth: 5 },
    "teleport away": { name: "밀어내기", freq: 6, depth: 5 },
    "cancel": { name: "무력화", freq: 5, depth: 7 },
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

/**
 * 이 층에서 뽑을 **물건의 등급.**
 *
 * `randomMonsterChar` 와 **같은 식**이다 — 지금 층에서 여섯 위, 셋 아래까지 샌다.
 * 그래서 가끔 한 수 위의 물건이 일찍 나오고(그 한 번이 판을 바꾼다), 가끔 한 수
 * 아래의 것이 늦게 나온다. 층과 딱 맞아떨어지면 주울 때마다 놀랄 일이 없다.
 */
export function itemTier(depth: number, rng: Rng): number {
    return Math.min(26, Math.max(1, depth + rng.rnd(10) - 6));
}

/**
 * 빈도표에서 **그 등급에 맞는 것** 하나 뽑기.
 *
 * `band` 를 주면 위쪽도 자른다 — 장비는 낡으면 안 떨어진다. 안 주면 하한만 본다.
 * 띠가 비면(사다리에 구멍이 있으면) 하한까지만 물러선다. 그마저 비는 일은 1층짜리
 * 물건이 있는 한 없고, 테스트가 스물여섯 층을 다 훑어 확인한다.
 */
function weightedAt<T extends { freq: number; depth: number }>(
    table: Record<string, T>,
    tier: number,
    rng: Rng,
    band = Infinity,
): string {
    const all = Object.keys(table);
    const fits = all.filter((k) => table[k].depth <= tier);
    const keys = fits.filter((k) => table[k].depth > tier - band);
    const pool = keys.length ? keys : fits.length ? fits : all;
    const total = pool.reduce((s, k) => s + table[k].freq, 0);
    let r = rng.rnd(total);
    for (const k of pool) {
        r -= table[k].freq;
        if (r < 0) return k;
    }
    return pool[pool.length - 1];
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

/**
 * 손질 정도를 굴린다. 열에 하나는 **저주받았다.**
 *
 * **깊을수록 크게 손질된 것이 나온다.** 리니지의 얼굴이 그 숫자다 — 같은 진은검이라도
 * `+0` 과 `+3` 은 다른 물건이다. 다만 한 칸은 작게 둔다(26층에서도 최대 `+3`): 이
 * 숫자는 「무기 강화 주문서」로도 오르는 값이라, 떨어지는 것부터 크면 주문서가 쓸모를
 * 잃는다.
 *
 * ── **마이너스 손질은 없다** ───────────────────────────────────────────────
 * 예전에는 저주받은 물건이 `−2` 로 나왔다. 그러면 저주의 대가가 **두 벌**이 된다 —
 * 못 벗는다는 것과 숫자가 깎인다는 것. 지금은 하나다: **못 벗는다.** 깊은 층에서 더
 * 좋은 것을 주워도 못 바꾸는 것이 그 값이고, 사다리가 층을 타는 지금은 그 값이 예전보다
 * 오히려 크다 — 20층에서 4층짜리 장검에 손이 묶이는 것이 `−2` 보다 아프다.
 *
 * 그래서 화면에 `−` 가 붙은 물건은 이제 안 나온다. 힘이 깎여서(독) 보정이 음수가 되는
 * 일은 그대로다 — 그건 물건이 아니라 내 몸이다.
 */
function rollEnchant(depth: number, rng: Rng): { plus: number; cursed: boolean } {
    const best = 1 + Math.floor(Math.min(26, Math.max(1, depth)) / 9); // 1 … 3
    if (rng.rnd(10) === 0) return { plus: 0, cursed: true };
    if (rng.rnd(5) === 0) return { plus: rng.rnd(best) + 1, cursed: false };
    return { plus: 0, cursed: false };
}

/**
 * ── **강화** — 이 게임에서 캐릭터를 키우는 자리 ─────────────────────────────
 *
 * 레벨업은 체력 +5 와 네 레벨마다 숙련 +1 뿐이다. 키우는 맛은 **손에 쥔 것의 숫자**가
 * 낸다 — 리니지가 그랬듯이 `+0 진은검` 과 `+7 진은검` 은 다른 물건이다.
 *
 * 규칙 셋:
 *
 *   1. **`+5` 까지는 안전하다.** 안전 구간이 없으면 첫 주문서부터 도박이 되고, 그건
 *      키우기가 아니라 그냥 운이다. 그런데 **떨어지는 물건이 이미 `+0~+3`**
 *      (`rollEnchant`)이라, 안전 구간을 `+3` 에 두면 **강화가 운 좋은 드랍과 똑같아진다**
 *      — 재 보고 알았다. 두 칸을 더 줘야 「주문서를 모아서 키웠다」가 드랍을 넘어선다.
 *   2. **실패하면 부서진다.** 수치가 내려가는 대신 물건이 사라진다 — 마이너스를 없앤
 *      방향과 결이 같고(`rollEnchant` 머리말), 대가가 한눈에 읽힌다.
 *   3. **`+9` 가 끝이다.** 상한이 없으면 운 좋은 `+12 장검`(4층짜리)이
 *      `바포메트의 검`(25층짜리)을 이겨서 **내려갈 이유가 사라진다.** 사다리(층)가
 *      주이고 강화는 보조다.
 *
 * 성공률은 **여기 한 자리**에서만 낸다. 화면이 적는 확률과 실제로 굴리는 확률이 갈리면
 * 사람은 자기가 본 숫자를 믿고 걸었다가 영문을 모른 채 물건을 잃는다.
 */
export const ENCHANT_MAX = 9;

/** `+plus` 에서 한 칸 더 올릴 때의 성공률(0~1). 상한에서는 0. */
export function enchantOdds(plus: number): number {
    const ODDS = [1, 1, 1, 1, 1, 0.7, 0.55, 0.4, 0.25];
    if (plus < 0) return 1;
    return ODDS[plus] ?? 0;
}

/**
 * 이 층에 떨어져 있을 물건 하나. 깊을수록 금화가 두둑하고 **물건의 등급이 높다.**
 *
 * 종류(금화냐 물약이냐 무기냐)를 고르는 확률은 층을 안 탄다 — 그것까지 층에 맡기면
 * 「깊은 층에서는 식량이 안 나온다」 같은 일이 생겨서 굶어 죽는 까닭이 운이 된다.
 * 층이 정하는 것은 **어느 등급의 물건인가**뿐이다.
 */
export function randomItem(depth: number, id: number, x: number, y: number, rng: Rng): Item {
    const r = rng.rnd(100);
    if (r < 24) return makeItem("gold", "gold", id, x, y, rng.between(2, 50 + depth * 10));
    const tier = itemTier(depth, rng);
    if (r < 40) return makeItem("potion", weightedAt(POTIONS, tier, rng), id, x, y);
    if (r < 56) return makeItem("scroll", weightedAt(SCROLLS, tier, rng), id, x, y);
    if (r < 66) return makeItem("food", "food ration", id, x, y);

    if (r < 78) {
        const type = weightedAt(WEAPONS, tier, rng, GEAR_BAND);
        const def = WEAPONS[type];
        // 화살과 다트는 한 줌씩 나온다 — 하나씩 던져 봐야 아무 일도 안 난다.
        const count = def.stack ? rng.between(5, 14) : 1;
        const it = makeItem("weapon", type, id, x, y, count);
        const e = rollEnchant(depth, rng);
        it.plusHit = e.plus;
        it.plusDam = e.plus;
        it.cursed = e.cursed;
        return it;
    }

    if (r < 88) {
        const it = makeItem("armor", weightedAt(ARMORS, tier, rng, GEAR_BAND), id, x, y);
        const e = rollEnchant(depth, rng);
        it.plusArmor = e.plus;
        it.cursed = e.cursed;
        return it;
    }

    if (r < 95) {
        const type = weightedAt(RINGS, tier, rng);
        const it = makeItem("ring", type, id, x, y);
        const e = rollEnchant(depth, rng);
        // 세기가 있는 반지만 숫자를 쓴다. 나머지는 끼는 것만으로 듣는다.
        it.plusRing = type === "protection" || type === "add strength" ? Math.max(1, e.plus) : 0;
        // **저주받은 반지도 숫자를 안 깎는다**(위 `rollEnchant` 참고). 대가는 「손가락
        // 하나를 잃는다」다 — 두 개뿐인 자리를 쓸모없는 반지가 차지하고, 뺄 수 없다.
        if (e.cursed) it.cursed = true;
        return it;
    }

    const it = makeItem("wand", weightedAt(WANDS, tier, rng), id, x, y);
    it.charges = rng.between(3, 7);
    return it;
}

/**
 * 그 물건이 **몇 층에서 떨어지는가.** 도감의 「지하 1–8층에 나온다」와 같은 자리다.
 *
 * `randomItem` 과 **같은 식**을 쓴다. 둘이 갈리면 화면이 적어 놓은 띠와 실제로 떨어지는
 * 층이 달라지는데, 그건 고장이 고장처럼 안 보이는 자리다 — 테스트가 실제 뽑기와 맞춰 본다.
 */
export function itemDepthRange(kind: ItemKind, type: string): { min: number; max: number } | null {
    const table =
        kind === "weapon" ? WEAPONS
        : kind === "armor" ? ARMORS
        : kind === "potion" ? POTIONS
        : kind === "scroll" ? SCROLLS
        : kind === "ring" ? RINGS
        : kind === "wand" ? WANDS
        : null;
    const def = table?.[type as keyof typeof table] as { depth: number } | undefined;
    if (!def) return null;
    const band = kind === "weapon" || kind === "armor" ? GEAR_BAND : Infinity;
    let min = Infinity;
    let max = -Infinity;
    for (let depth = 1; depth <= 26; depth++) {
        // `itemTier` 가 낼 수 있는 값 전부 — 지금 층에서 여섯 위, 셋 아래.
        for (let roll = 0; roll < 10; roll++) {
            const tier = Math.min(26, Math.max(1, depth + roll - 6));
            if (def.depth > tier || def.depth <= tier - band) continue;
            min = Math.min(min, depth);
            max = Math.max(max, depth);
        }
    }
    return Number.isFinite(min) ? { min, max } : null;
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
            return known[key] ? `${POTIONS[it.type]?.name ?? "이름 없는"} 물약` : (appearance[key] ?? "물약");
        case "scroll":
            return known[key] ? `${SCROLLS[it.type]?.name ?? "이름 없는"} 주문서` : (appearance[key] ?? "주문서");
        case "ring": {
            const base = known[key] ? `${RINGS[it.type]?.name ?? "이름 없는"} 반지` : (appearance[key] ?? "반지");
            return known[key] ? `${base}${plusText(it.plusRing)}${curseText(it)}` : `${base}${curseText(it)}`;
        }
        case "wand": {
            const base = known[key] ? `${WANDS[it.type]?.name ?? "이름 없는"} 지팡이` : (appearance[key] ?? "지팡이");
            return known[key] ? `${base} (${it.charges ?? 0}회)` : base;
        }
        case "weapon": {
            // **개수는 여기서 안 붙인다.** 화면이 이미 `×10` 을 붙이므로 「다트 10개 ×10」
            // 이 되고, 하나를 던졌을 때 「다트 10개를 던졌다」로도 읽힌다.
            const base = WEAPONS[it.type]?.name ?? "이름 없는 무기";
            return known[key]
                ? `${base}${plusText(it.plusHit)}${curseText(it)}`
                : `${base}${curseText(it)}`;
        }
        case "armor": {
            const base = ARMORS[it.type]?.name ?? "이름 없는 갑옷";
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
    if (it.kind === "ring") {
        // 세기가 있는 반지만 숫자를 쓴다. 나머지는 끼는 것만으로 듣는다.
        if (!seen) return "";
        const n = it.plusRing ?? 0;
        if (it.type === "protection") return n === 0 ? "" : `방어도 ${n > 0 ? "+" : ""}${n}`;
        if (it.type === "add strength") return n === 0 ? "" : `힘 ${n > 0 ? "+" : ""}${n}`;
        return "";
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
