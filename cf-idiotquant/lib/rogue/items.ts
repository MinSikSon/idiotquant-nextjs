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
    "enchant weapon": { name: "무기 강화", freq: 12, depth: 1 },
    "enchant armor": { name: "갑옷 강화", freq: 12, depth: 1 },
    "blessed enchant": { name: "축복받은 강화", freq: 4, depth: 1 },
    transmutation: { name: "재련", freq: 7, depth: 3 },
    identify: { name: "감정", freq: 14, depth: 1 },
    "remove curse": { name: "저주 해제", freq: 8, depth: 3 },
    "aggravate monsters": { name: "도발", freq: 3, depth: 2 },
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
    digging: { name: "굴착", freq: 6, depth: 3 },
    swapping: { name: "위치 교환", freq: 6, depth: 2 },
    gust: { name: "돌풍", freq: 6, depth: 2 },
    "slow monster": { name: "둔화", freq: 7, depth: 3 },
    "haste monster": { name: "가속", freq: 4, depth: 5 },
    "teleport away": { name: "밀어내기", freq: 5, depth: 5 },
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
 * 옛 저장의 겉모습을 **메운다** — 있는 것은 그대로 두고 **빠진 것만** 채운다.
 *
 * 표에 물건을 더하면 이미 저장된 판에는 그 한 종의 겉모습이 없다. 그러면 `describe` 가
 * 「주문서」로 물러서는데 나머지는 다 제 이름이 있어서, **그 하나만 맨숭맨숭해 보인다**
 * — 못 알아보기는커녕 오히려 그것만 알아보게 된다. 축복받은 강화를 더하며 실제로 그랬다.
 *
 * 두 가지를 지킨다. **있는 이름은 안 건드린다**(알아낸 것이 소용없어지면 안 된다), 그리고
 * 같은 저장을 다시 열면 **같은 이름이 나와야** 한다 — 그래서 살아 있는 난수가 아니라
 * **시드**에서 굴린다. 부르는 쪽이 `rng` 를 넘기게 두면 열 때마다 이름이 달라진다.
 */
export function fillAppearances(saved: Record<string, string>, seed: number): Record<string, string> {
    return { ...rollAppearances(new Rng(seed)), ...saved };
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
 *
 * **띠를 줄 때는 그 안에서 위쪽에 무게를 싣는다**(`GEAR_TILT`). 20층 장비 띠는
 * `[6, 23]` 이라 단검이 그대로 들어 있는데, 띠를 좁혀서 빼면 「낡은 것이 아예 안 나와
 * 등급이 튄다」가 된다. 띠는 그대로 두고 **기울기만** 준다 — 띠의 맨 위가 맨 아래보다
 * 1.8배 자주 나온다.
 */
const GEAR_TILT = 0.8;

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

    // 기울기는 **띠를 줄 때만**(장비). 물약·주문서까지 기울이면 깊은 층에서 감정과
    // 체력 회복이 밀려나는데, 그건 「등급이 오른다」가 아니라 그냥 소모품이 마르는 것이다.
    const lo = Math.min(...pool.map((k) => table[k].depth));
    const hi = Math.max(...pool.map((k) => table[k].depth));
    const span = Math.max(1, hi - lo);
    const tilt = (k: string) =>
        band === Infinity ? 1 : 1 + GEAR_TILT * ((table[k].depth - lo) / span);
    // 정수 굴림이라 백 배로 키운다 — 안 키우면 기울기가 반올림에 다 먹힌다.
    const w = pool.map((k) => Math.max(1, Math.round(table[k].freq * tilt(k) * 100)));

    const total = w.reduce((s, n) => s + n, 0);
    let r = rng.rnd(total);
    for (let i = 0; i < pool.length; i++) {
        r -= w[i];
        if (r < 0) return pool[i];
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
 * 규칙 넷:
 *
 *   1. **안전 구간은 종류마다 다르다** — 무기는 `+6`, 갑옷은 `+4` 까지 안 굴린다.
 *      안전 구간이 없으면 첫 주문서부터 도박이 되고, 그건 키우기가 아니라 그냥 운이다.
 *      그런데 **떨어지는 물건이 이미 `+0~+3`**(`rollEnchant`)이라, 안전 구간을 `+3` 에
 *      두면 **강화가 운 좋은 드랍과 똑같아진다** — 재 보고 알았다.
 *      갑옷이 두 칸 낮은 것은 **한 칸의 무게가 다르기 때문**이다: 갑옷 `+1` 은 맞는 것
 *      자체를 줄여 모든 싸움에 듣고, 무기 `+1` 은 이미 이기는 싸움을 조금 빨리 끝낸다.
 *   2. **실패하면 부서진다.** 수치가 내려가는 대신 물건이 사라진다 — 마이너스를 없앤
 *      방향과 결이 같고(`rollEnchant` 머리말), 대가가 한눈에 읽힌다.
 *   3. **`+9` 가 끝이다.** 상한이 없으면 운 좋은 `+12 장검`(4층짜리)이
 *      `바포메트의 검`(25층짜리)을 이겨서 **내려갈 이유가 사라진다.** 사다리(층)가
 *      주이고 강화는 보조다.
 *   4. **축복받은 주문서는 안전 구간 안에서만 다르다** — 한 번에 `1~3` 칸을 올리되 그
 *      종류의 천장에서 잘린다. 천장 위에서는 굴림도 대가도 일반과 똑같다. 그래서 축복은
 *      **「안 부서지는 주문서」가 아니라 「주문서를 아끼는 주문서」**다.
 *
 * 성공률은 **여기 한 자리**에서만 낸다. 화면이 적는 확률과 실제로 굴리는 확률이 갈리면
 * 사람은 자기가 본 숫자를 믿고 걸었다가 영문을 모른 채 물건을 잃는다.
 */
export const ENCHANT_MAX = 9;

/**
 * 성공률표 — **안전 구간만 갈리고 그 위는 안 갈린다.**
 *
 * `+6` 부터는 두 종류가 같은 값을 쓴다. 갑옷이 **먼저** 도박을 시작할 뿐, 같은 자리에서
 * 더 가혹하지는 않다 — 종류마다 꼬리를 따로 밀면 `+9` 도달률이 한쪽만 수십 배로
 * 벌어진다(꼬리를 천장에 붙여 밀면 무기 15.4% 대 갑옷 0.6%가 된다. 지금은 5.5% 대 3.3%).
 */
const ODDS: Record<"weapon" | "armor", readonly number[]> = {
    //       +0 +1 +2 +3    +4   +5    +6   +7    +8
    weapon: [1, 1, 1, 1,    1,   1, 0.55, 0.4, 0.25],
    armor:  [1, 1, 1, 1, 0.85, 0.7, 0.55, 0.4, 0.25],
};

/** `+plus` 에서 한 칸 더 올릴 때의 성공률(0~1). 상한에서는 0. */
export function enchantOdds(plus: number, kind: ItemKind): number {
    const table = kind === "armor" ? ODDS.armor : ODDS.weapon;
    if (plus < 0) return 1;
    return table[plus] ?? 0;
}

/**
 * **안전 구간의 천장** — 여기까지는 굴리지 않고 오른다(무기 `+6`, 갑옷 `+4`).
 *
 * 표에서 **세어서** 낸다. 숫자를 따로 적어 두면 표를 고친 날 한쪽만 바뀌어, 화면은
 * 「안전」이라 적는데 실제로는 굴리는 자리가 난다.
 */
export function enchantSafeMax(kind: ItemKind): number {
    const table = kind === "armor" ? ODDS.armor : ODDS.weapon;
    let n = 0;
    while (n < table.length && table[n] === 1) n++;
    return n;
}

/**
 * 그 물건에 걸린 **강화 수치** — 무기는 명중, 갑옷은 방어.
 *
 * **한 자리에서 읽는다.** 강화도 모루도 화면도 이 값을 보는데, `it.kind === "armor" ?
 * it.plusArmor : it.plusHit` 를 부르는 쪽마다 적으면 어느 날 한 군데가 빠진다 —
 * 실제로 갑옷 강화를 없앴다 되살리는 사이에 그 갈래가 세 군데로 흩어져 있었다.
 */
export function enchantOf(it: Item): number {
    return (it.kind === "armor" ? it.plusArmor : it.plusHit) ?? 0;
}

/**
 * 그 물건의 강화 수치를 **`n` 으로 놓는다** — `enchantOf` 의 반대쪽.
 *
 * 무기는 `plusHit` 과 `plusDam` **둘 다** 움직인다. 한쪽만 적으면 「명중은 `+3` 인데
 * 피해는 `+5`」 가 조용히 생기고, 상태 줄의 두 숫자가 갈린다. 한 칸씩 올릴 때는
 * 안 갈렸지만 축복이 **여러 칸을 한 번에** 올리면서 그 갈래가 드러났다.
 */
export function setEnchant(it: Item, n: number): void {
    if (it.kind === "armor") it.plusArmor = n;
    else {
        it.plusHit = n;
        it.plusDam = n;
    }
}

/** 녹일 때 **강화 한 칸이 주문서로 돌아올 확률.** 화면이 적는 값도 이것 하나다. */
export const MELT_RETURN = 0.7;

/**
 * 모루에 **하나** 올렸을 때 나올 수 있는 주문서 — 「반드시」와 「어쩌면」으로 나뉜다.
 *
 * **쇠붙이 하나에 한 장이 깔린다**(`sure`). 강화 안 된 것도 녹이면 한 장이 나온다 —
 * 안 그러면 층마다 떨어지는 칼이 그냥 쓰레기이고, 모루는 이미 키운 것을 갈아 끼울 때만
 * 쓰는 좁은 칸이 된다.
 *
 * **걸린 강화는 한 칸씩 따로 굴린다**(`risky`, 칸마다 `MELT_RETURN`). 예전에는 그대로
 * 다 돌려줬는데, 그러면 **옮겨 심기가 공짜**다 — 아무 때나 녹였다 다시 걸어도 잃는 것이
 * 없으니 「지금 이 칼에 넣을까」가 결정이 아니게 된다. 확률이 그 값을 매긴다.
 *
 * **화살·표창은 깔아 주지 않는다.** 겹쳐 쌓이는 것들이라 한 번에 대여섯 개씩 떨어지고
 * (`stack`), 낱개마다 한 장을 깔면 **한 판에 열여덟 장**이 나온다 — 재 봤다. 그러면
 * `+9` 가 그냥 걸어 들어오고 도박 구간이 사라진다. 화살 한 대는 벼려 만든 무기가
 * 아니라 **소모품**이라는 것이 이 구분의 근거다: 걸린 강화만 되뽑는다.
 */
export function meltYield(it: Item): { sure: number; risky: number } {
    if (it.kind === "armor") return { sure: 1, risky: enchantOf(it) };
    if (it.kind !== "weapon") return { sure: 0, risky: 0 };
    const plus = enchantOf(it);
    return WEAPONS[it.type]?.stack ? { sure: 0, risky: plus } : { sure: 1, risky: plus };
}

/** 그 물건에서 나올 수 있는 **가장 많은** 장수 — 화면이 단추에 적는 값. */
export function meltMax(it: Item): number {
    const { sure, risky } = meltYield(it);
    return sure + risky;
}

/** 실제로 나온 장수 — 강화 칸마다 한 번씩 굴린다. */
export function meltRoll(it: Item, rng: Rng): number {
    const { sure, risky } = meltYield(it);
    let got = sure;
    for (let i = 0; i < risky; i++) {
        if (rng.rnd(100) < Math.round(MELT_RETURN * 100)) got++;
    }
    return got;
}

/**
 * 물건의 **분류** — 뽑기의 첫 갈래.
 *
 * **강화 주문서가 「주문서」에서 떨어져 나와 여기 선다.** 강화는 이 게임의 캐릭터
 * 키우기 자리인데(`CLAUDE.md`), 주문서 안에 섞여 있으면 **층별로 조절할 손잡이가
 * 없다** — 여덟 종 중 둘이라 빈도표를 건드리면 감정·지도까지 같이 움직인다.
 */
export type Category = "gold" | "potion" | "scroll" | "food" | "enchant" | "weapon" | "armor" | "ring" | "wand";

/**
 * 층 구간별 분류 가중치.
 *
 * **여기서 층을 타는 것은 강화 주문서뿐이라고 봐도 된다**(6 → 11). 나머지는 그 몫을
 * 내주느라 조금씩 줄 뿐이다. 식량과 물약을 거의 안 건드리는 까닭이 그것이다 —
 * 깊은 층에서 그 둘이 마르면 **굶어 죽는 까닭이 운**이 된다.
 */
const CATEGORIES: { upTo: number; w: Record<Category, number> }[] = [
    { upTo: 5, w: { gold: 24, potion: 15, scroll: 13, food: 10, enchant: 6, weapon: 12, armor: 10, ring: 5, wand: 5 } },
    { upTo: 12, w: { gold: 22, potion: 15, scroll: 12, food: 9, enchant: 8, weapon: 12, armor: 10, ring: 6, wand: 6 } },
    { upTo: 19, w: { gold: 20, potion: 14, scroll: 11, food: 9, enchant: 10, weapon: 12, armor: 11, ring: 6, wand: 7 } },
    { upTo: 26, w: { gold: 18, potion: 14, scroll: 10, food: 9, enchant: 11, weapon: 13, armor: 12, ring: 5, wand: 8 } },
];

export function categoryWeights(depth: number): Record<Category, number> {
    return (CATEGORIES.find((b) => depth <= b.upTo) ?? CATEGORIES[CATEGORIES.length - 1]).w;
}

/** 강화 주문서 셋. 최상위 분류로 섰으므로 **보통 주문서 통에서는 뺀다.** */
export const ENCHANT_SCROLLS = ["enchant weapon", "enchant armor", "blessed enchant"];

/**
 * 강화 분류에서 **축복이 차지하는 몫**(백분율).
 *
 * 축복은 천장을 안 올린다 — 안전 구간 안을 빨리 지날 뿐이라 **끝점이 같다.** 그래서
 * 흔해져도 `+9` 가 걸어 들어오지는 않는다. 그럼에도 낮게 두는 까닭은 **안전 구간을
 * 걸어 올라가는 일 자체가 강화의 절반**이기 때문이다. 축복이 흔하면 그 절반이 사라진다.
 */
const BLESSED_SHARE = 15;

/**
 * 강화를 뺀 주문서 통.
 *
 * 안 빼면 강화가 **두 통에 다 들어** 있어서, 최상위 가중치를 6 으로 낮춰도 주문서
 * 쪽으로 새어 나온다 — 손잡이를 달아 놓고 안 듣는 꼴이다.
 */
const PLAIN_SCROLLS = Object.fromEntries(
    Object.entries(SCROLLS).filter(([k]) => !ENCHANT_SCROLLS.includes(k)),
) as typeof SCROLLS;

/**
 * 분류 하나 뽑기.
 *
 * `enchantScale` 은 **그 층의 사정**이다(가뭄 보정·모루·1층). 부르는 쪽이 층을 알고
 * 여기는 비율만 안다 — 층 규칙을 여기 넣으면 이 함수가 던전을 알게 된다.
 */
export function pickCategory(
    depth: number,
    rng: Rng,
    enchantScale = 1,
    /** 특수 방의 편향 — 분류마다 곱한다. 0 이면 그 방에서는 안 나온다. */
    bias: Partial<Record<Category, number>> = {},
): Category {
    const base = categoryWeights(depth);
    // `rng.rnd` 는 정수만 준다. 열 배로 키워 굴리면 0.7·2.5 같은 배율이 살아난다.
    const w = Object.entries(base).map(
        ([k, n]) =>
            [
                k as Category,
                Math.round(n * 10 * (k === "enchant" ? enchantScale : 1) * (bias[k as Category] ?? 1)),
            ] as const,
    );
    const total = w.reduce((s, [, n]) => s + n, 0);
    let r = rng.rnd(total);
    for (const [k, n] of w) {
        r -= n;
        if (r < 0) return k;
    }
    return "gold";
}

/**
 * 이 층에 떨어져 있을 물건 하나. 깊을수록 금화가 두둑하고 **물건의 등급이 높다.**
 *
 * 분류는 부르는 쪽이 골라서 넘긴다(`pickCategory`) — 한 층에 강화 주문서를 두 장까지만
 * 놓는 것 같은 **층 단위 규칙**은 물건 하나가 알 수 있는 것이 아니기 때문이다.
 */
export function randomItem(depth: number, id: number, x: number, y: number, rng: Rng, cat?: Category): Item {
    const c = cat ?? pickCategory(depth, rng);
    if (c === "gold") return makeItem("gold", "gold", id, x, y, rng.between(2, 50 + depth * 10));
    const tier = itemTier(depth, rng);
    if (c === "potion") return makeItem("potion", weightedAt(POTIONS, tier, rng), id, x, y);
    if (c === "scroll") return makeItem("scroll", weightedAt(PLAIN_SCROLLS, tier, rng), id, x, y);
    if (c === "food") return makeItem("food", "food ration", id, x, y);
    if (c === "enchant") {
        // **축복은 얕은 층부터 나온다.** 한 번에 `1~3` 칸을 올리는 것이라 **수치가 낮을수록
        // 값어치가 크다** — 깊은 층에만 두면 주웠을 때는 이미 안전 구간을 채운 뒤라 쓸 데가
        // 없다. 값은 층이 아니라 **드문 것**으로만 매긴다.
        if (rng.rnd(100) < BLESSED_SHARE) return makeItem("scroll", "blessed enchant", id, x, y);
        // **무기 쪽을 살짝 높인다**(55:45). 갑옷 강화는 피해를 깎는 쪽이라 한 장의 체감이
        // 더 크고, 무기는 더 많이 부어야 티가 난다.
        return makeItem("scroll", rng.rnd(100) < 55 ? "enchant weapon" : "enchant armor", id, x, y);
    }

    if (c === "weapon") {
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

    if (c === "armor") {
        const it = makeItem("armor", weightedAt(ARMORS, tier, rng, GEAR_BAND), id, x, y);
        const e = rollEnchant(depth, rng);
        it.plusArmor = e.plus;
        it.cursed = e.cursed;
        return it;
    }

    if (c === "ring") {
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
        case "relic":
            return "$";
        case "gem":
            return "^";
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

function socketText(it: Item): string {
    if (!it.socketGem) return "";
    const nameMap: Record<string, string> = {
        ruby: "루비",
        sapphire: "사파이어",
        emerald: "에메랄드",
        topaz: "토파즈",
    };
    return ` [${nameMap[it.socketGem] ?? it.socketGem}]`;
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
        case "gem": {
            const gemNames: Record<string, string> = {
                ruby: "불꽃의 루비",
                sapphire: "서리의 사파이어",
                emerald: "생명의 에메랄드",
                topaz: "수호의 토파즈",
            };
            return gemNames[it.type] ?? "원소 보석";
        }
        case "relic": {
            const relicNames: Record<string, string> = {
                daedalus_compass: "다이달로스의 나침반",
                midas_gauntlet: "미다스의 건틀릿",
                time_hourglass: "시간의 모래시계",
                phoenix_feather: "불사조의 깃털",
            };
            const cool = it.relicCooldown && it.relicCooldown > 0 ? ` (대기 ${it.relicCooldown}턴)` : "";
            return (relicNames[it.type] ?? "전설 유물") + cool;
        }
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
            const sock = socketText(it);
            return known[key]
                ? `${base}${plusText(it.plusHit)}${sock}${curseText(it)}`
                : `${base}${sock}${curseText(it)}`;
        }
        case "armor": {
            const base = ARMORS[it.type]?.name ?? "이름 없는 갑옷";
            const sock = socketText(it);
            return known[key]
                ? `${base}${plusText(it.plusArmor)}${sock}${curseText(it)}`
                : `${base}${sock}${curseText(it)}`;
        }
    }
}

/** 갑옷이 실제로 내주는 방어 등급 — 손질한 만큼 **내려간다.** */
export function armorClassOf(it: Item | undefined): number {
    if (!it || it.kind !== "armor") return 10;
    const base = ARMORS[it.type]?.armor ?? 10;
    const topazBonus = it.socketGem === "topaz" ? 1 : 0;
    return base - (it.plusArmor ?? 0) - topazBonus;
}

/**
 * 원작의 방어 등급을 **방어력**으로 옮긴다 — 맞았을 때 공격력에서 빼는 값이다.
 *
 * Rogue 의 등급은 낮을수록 단단하다(맨몸 10, 판금 3, 용 −1). `10 − 등급` 이 그것을
 * 뒤집는다 — **맨몸이 0** 이고, 판금이 7, 용이 11 이다. 맨몸에서 0 이 되는 것이 이
 * 식의 근거다: 아무것도 안 입었으면 깎을 것도 없어야 한다.
 *
 * 표는 원작 값을 그대로 들고, **옮기는 자리는 여기 하나뿐이다.** 굴림도 화면도 전부
 * 이쪽 값을 쓴다. 뒤집는 곳이 둘이 되면 어느 날 한쪽만 바뀐다.
 *
 * 0 밑으로는 안 내려간다. 손질을 잔뜩 한 갑옷의 등급은 음수가 될 수 있지만 **방어력이
 * 음수면 맞을 때마다 더 아프다** — 그건 갑옷이 아니다.
 */
export function defenseOf(rogueArmor: number): number {
    return Math.max(0, 10 - rogueArmor);
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
    if (it.kind === "gem") {
        const descMap: Record<string, string> = {
            ruby: "화상 (턴당 2 지속 피해)",
            sapphire: "동결 (25% 확률 1턴 정지)",
            emerald: "흡혈 (처치 시 HP +2 회복)",
            topaz: "수호 (방어력 +1, 회피 +2)",
        };
        return descMap[it.type] ?? "소켓 세공용 보석";
    }
    if (it.kind === "relic") {
        const descMap: Record<string, string> = {
            daedalus_compass: "비밀문 & 미로 탐지",
            midas_gauntlet: "100G당 공격력 +1",
            time_hourglass: "시간 정지 3턴 (쿨 50턴)",
            phoenix_feather: "치명상 시 1회 완전 부활",
        };
        return descMap[it.type] ?? "고대 전설 유물";
    }
    if (it.kind === "weapon") {
        const plus = seen ? (it.plusDam ?? 0) : 0;
        const sock = it.socketGem ? ` [${it.socketGem === "ruby" ? "화염" : it.socketGem === "sapphire" ? "동결" : "흡혈"}]` : "";
        return `피해 ${weaponDamageOf(it)}${plus === 0 ? "" : plus > 0 ? `+${plus}` : `${plus}`}${sock}`;
    }
    if (it.kind === "armor") {
        // 모르는 갑옷은 손질을 뺀 기본값으로 적는다.
        const base = ARMORS[it.type]?.armor ?? 10;
        const sock = it.socketGem === "topaz" ? " [수호]" : "";
        return `방어력 ${defenseOf(seen ? armorClassOf(it) : base)}${sock}`;
    }
    if (it.kind === "ring") {
        // 세기가 있는 반지만 숫자를 쓴다. 나머지는 끼는 것만으로 듣는다.
        if (!seen) return "";
        const n = it.plusRing ?? 0;
        if (it.type === "protection") return n === 0 ? "" : `방어력 ${n > 0 ? "+" : ""}${n}`;
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
