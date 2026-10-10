/**
 * Rogue의 A부터 Z까지 스물여섯과 NetHack의 검은 푸딩.
 *
 * Rogue의 A–Z 문자는 엔진·도감에서 종을 가리키는 내부 키다. 지도에서는 NetHack 방식으로
 * 부류 문자를 공유하고, 색으로 그 부류 안의 종을 구분한다. 그림 대신 글자라서 배울 것이 남는다.
 *
 * **`armor` 는 원작의 방어 등급이라 낮을수록 단단하다** — 용은 −1 이고 좀비는 8 이다.
 * 다만 **굴리고 보여 주는 것은 이 값이 아니다.** 「낮을수록 좋다」는 화면에서 읽히지
 * 않으므로(`+1` 갑옷이 숫자를 내리면 나빠 보인다) `defenseOf()` 가 `10 - armor` 로
 * 뒤집어 준다. 표는 원작 값을 그대로 들고, 뒤집는 자리는 한 곳뿐이다.
 *
 * **`hp` 는 고정값이다.** 예전에는 `6d8` 을 굴려서 같은 트롤이 6부터 48까지 제각각
 * 이었다 — 「이 트롤이 센 트롤인가」는 사람이 알 수 없는 것이라 판단거리가 아니라
 * 그냥 운이었다. 지금 숫자는 그 주사위의 기댓값을 반올림한 것이다.
 *
 * 값은 원작 계열이되 바이트 단위로 같다고 주장하지 않는다 — 밸런스는
 * `scripts/measure-rogue.mjs` 로 재서 맞춘다.
 */

import {
    Rng,
} from "./rng";
import { SHOPKEEPER } from "./shop";
import {
    type Monster,
    type MonsterDef,
    type SpiritBond,
    type SpiritElement,
} from "./types";

export const MONSTERS: Record<string, MonsterDef> = {
    A: { ch: "A", name: "아쿠에이터", exp: 20, level: 5, armor: 2, hp: 22, damage: ["0d0", "0d0"], mean: true, traits: ["M"], special: "갑옷을 녹인다" },
    B: { ch: "B", name: "박쥐", exp: 1, level: 1, armor: 3, hp: 4, corpseSize: "tiny", damage: ["1d2"], mean: false, traits: ["F"] },
    C: { ch: "C", name: "켄타우로스", exp: 17, level: 4, armor: 4, hp: 18, corpseSize: "large", damage: ["1d2", "1d5", "1d5"], mean: false },
    D: { ch: "D", name: "용", exp: 5000, level: 10, armor: -1, hp: 45, corpseSize: "large", damage: ["1d8", "1d8", "3d10"], mean: true, traits: ["M"] },
    E: { ch: "E", name: "에뮤", exp: 2, level: 1, armor: 7, hp: 4, damage: ["1d2"], mean: true },
    F: { ch: "F", name: "파리지옥", exp: 80, level: 8, armor: 3, hp: 36, corpseSize: "large", damage: ["1d6", "0d0"], mean: true, traits: ["M"], still: true, special: "덩굴로 붙잡는다" },
    G: { ch: "G", name: "그리핀", exp: 2000, level: 13, armor: 2, hp: 58, corpseSize: "large", damage: ["4d3", "3d5"], mean: true, traits: ["M", "F", "R"] },
    H: { ch: "H", name: "홉고블린", exp: 3, level: 1, armor: 5, hp: 4, damage: ["1d8"], mean: true },
    I: { ch: "I", name: "얼음괴물", exp: 15, level: 1, armor: 9, hp: 4, damage: ["0d0"], mean: false, special: "얼려서 못 움직이게 한다" },
    J: { ch: "J", name: "재버워크", exp: 3000, level: 15, armor: 6, hp: 68, corpseSize: "large", damage: ["2d12", "2d4"], mean: false },
    K: { ch: "K", name: "황조롱이", exp: 1, level: 1, armor: 7, hp: 4, corpseSize: "tiny", damage: ["1d4"], mean: true, traits: ["M", "F"] },
    L: { ch: "L", name: "레프러콘", exp: 10, level: 3, armor: 8, hp: 14, damage: ["0d0"], mean: false, special: "금화를 채고 달아난다" },
    M: { ch: "M", name: "메두사", exp: 200, level: 8, armor: 2, hp: 36, generationFrequency: 1, damage: ["3d4", "3d4", "2d5"], mean: true, traits: ["M"] },
    N: { ch: "N", name: "님프", exp: 37, level: 3, armor: 9, hp: 14, damage: ["0d0"], mean: false, special: "물건을 채고 달아난다" },
    O: { ch: "O", name: "오크", exp: 5, level: 1, armor: 6, hp: 4, damage: ["1d8"], mean: false, traits: ["G"] },
    P: { ch: "P", name: "팬텀", exp: 120, level: 8, armor: 3, hp: 36, damage: ["4d4"], mean: false, traits: ["I", "S"], invisible: true },
    Q: { ch: "Q", name: "콰가", exp: 15, level: 3, armor: 3, hp: 14, damage: ["1d5", "1d5"], mean: true, traits: ["M"] },
    R: { ch: "R", name: "방울뱀", exp: 9, level: 2, armor: 3, hp: 9, damage: ["1d6"], mean: true, traits: ["M"] },
    S: { ch: "S", name: "뱀", exp: 2, level: 1, armor: 5, hp: 4, damage: ["1d3"], mean: true, traits: ["M"] },
    T: { ch: "T", name: "트롤", exp: 120, level: 6, armor: 4, hp: 27, corpseSize: "large", damage: ["1d8", "1d8", "2d6"], mean: true, traits: ["R", "M"] },
    U: { ch: "U", name: "우르바일", exp: 190, level: 7, armor: -2, hp: 32, damage: ["1d9", "1d9", "2d9"], mean: true, traits: ["M"] },
    V: { ch: "V", name: "뱀파이어", exp: 350, level: 8, armor: 1, hp: 36, damage: ["1d10"], mean: true, traits: ["R", "M", "S"] },
    W: { ch: "W", name: "망령", exp: 55, level: 5, armor: 4, hp: 22, generationFrequency: 1, damage: ["1d6", "0d0"], mean: false, traits: ["S"], special: "경험을 빨아먹는다" },
    X: { ch: "X", name: "제록", exp: 100, level: 7, armor: 7, hp: 32, damage: ["4d4"], mean: false },
    Y: { ch: "Y", name: "예티", exp: 50, level: 4, armor: 6, hp: 18, corpseSize: "large", damage: ["1d6", "1d6"], mean: false },
    Z: { ch: "Z", name: "좀비", exp: 6, level: 2, armor: 8, hp: 9, damage: ["1d8"], mean: true, traits: ["M", "S"] },
    // P는 기존 팬텀의 글자다. 지도에서 둘을 가르기 위해 소문자 p를 쓴다.
    p: { ch: "p", name: "검은 푸딩", exp: 180, level: 10, armor: 6, hp: 45, damage: ["3d8"], mean: false, traits: ["D"] },
};

/**
 * Rogue 몬스터 난이도 순서 — 1부터 26까지의 자리에 글자가 하나씩 있다.
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
    // 기존 A–Z 순위는 그대로 두고, 깊은 층에 푸딩이 드물게 섞인다.
    if (depth >= 14 && rng.rnd(100) < 6) return "p";
    let d = depth + (rng.rnd(10) - 6);
    if (d < 1) d = rng.rnd(5) + 1;
    if (d > 26) d = rng.rnd(5) + 22;
    return LVL_MONS[Math.min(25, Math.max(0, d - 1))];
}

/** NetHack 3.6 계열의 사체 생성 확률을 몸집·생성 빈도에 따라 적용한다. */
export function shouldDropCorpse(def: MonsterDef, rng: Rng): boolean {
    // 큰 몸집은 확정. 좀비·흡혈귀는 사람 시체를 남기되 사체 자체는 보장되지 않는다.
    if (def.corpseSize === "large") return true;

    const tiny = def.corpseSize === "tiny";
    const rare = (def.generationFrequency ?? 2) < 2;
    const denominator = 2 + Number(tiny) + Number(rare);
    return rng.rnd(denominator) === 0;
}

/**
 * 그 깊이에서 **나올 수 있는 순위**들. `randomMonsterChar` 와 **같은 식**을 쓴다.
 *
 * 둘이 갈리면 도감이 「7층에 나온다」고 적어 놓고 실제로는 안 나오는 일이 생긴다.
 * 그래서 여기 한 곳에서 내고, 테스트가 실제 뽑기와 맞춰 본다.
 */
function ranksAt(depth: number): Set<number> {
    const out = new Set<number>();
    for (let roll = 0; roll < 10; roll++) {
        let d = depth + (roll - 6);
        if (d < 1) {
            for (let r = 1; r <= 5; r++) out.add(Math.min(25, Math.max(0, r - 1)));
            continue;
        }
        if (d > 26) {
            for (let r = 22; r <= 26; r++) out.add(Math.min(25, Math.max(0, r - 1)));
            continue;
        }
        out.add(Math.min(25, Math.max(0, d - 1)));
    }
    return out;
}

/**
 * 이 종이 **몇 층에서 나오는가.**
 *
 * 종의 능력치는 층을 안 탄다 — 트롤은 어디서나 같은 트롤이다. 층이 정하는 것은
 * **어느 종이 나오는가**뿐이고, 도감이 적을 수 있는 「층에 따른 것」은 이 띠 하나다.
 */
export function depthRange(ch: string): { min: number; max: number } | null {
    if (ch === "p") return { min: 14, max: 26 };
    const rank = LVL_MONS.indexOf(ch);
    if (rank < 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (let depth = 1; depth <= 26; depth++) {
        if (!ranksAt(depth).has(rank)) continue;
        min = Math.min(min, depth);
        max = Math.max(max, depth);
    }
    return Number.isFinite(min) ? { min, max } : null;
}

let nextId = 1;

/** 몬스터의 표시 이름 (챔피언 접두사 포함) */
export function monsterName(m: Monster): string {
    if (m.champion) {
        const prefixMap: Record<string, string> = {
            blazing: "타오르는",
            shadow: "그림자의",
            gilded: "황금의",
            swift: "신속의",
            vampiric: "흡혈의",
        };
        const p = prefixMap[m.champion] ?? "";
        return p ? `${p} ${m.def.name}` : m.def.name;
    }
    return m.def.name;
}

/**
 * 정령의 글자 — NetHack 의 elemental 은 `E` 다. 에뮤와 글자가 같지만 도감의 몬스터 표 밖이고
 * (`MONSTERS` 에 없다), 지도에서는 원소마다 다른 색(`spirit-<원소>`)으로 칠해 갈린다.
 */
export const SPIRIT_CH = "E";

export const SPIRIT_NAMES: Record<SpiritElement, string> = {
    fire: "불의 정령",
    water: "물의 정령",
    air: "바람의 정령",
    earth: "땅의 정령",
};

/**
 * 원소의 문양 — 부를 때 고르는 줄에는 **이것만** 선다. 이모지가 아니라 **글자 기호**다 — 기기마다 그림이
 * 달라지지 않고 지도의 글자들과 같은 결로 선다(불은 오르는 △ · 물은 떨어지는 ▽ · 바람은 물결 ≈ · 땅은 바위 ■). 원소마다 싸우는 법이 다르지만 설명은 안 붙인다 —
 * 싸움 기록(`SPIRIT_VERBS` · 물의 「상처를 씻어」 · 땅의 「발이 묶였다」·「되받아친다」)을 보고 알아 간다.
 *
 * - 불: 세게 친다(`2d6`) · 전직 뒤 두 번.
 * - 물: 친 피해의 절반(적어도 1)만큼 주인을 고친다(`strikeMonster`) · 전직 뒤 다.
 * - 바람: 한 턴에 두 번 움직인다 — 대신 몸이 약하다(`spiritAct`) · 전직 뒤 머무는 턴만 는다.
 * - 땅: 단단하고, 곁의 적이 주인보다 **땅의 정령을 먼저** 친다(`monsterAct`) · 전직 뒤 체력 1.5배에 되받아친다.
 *
 * 모두에게 「두 번 친다」를 주면 이미 두 번 움직이는 바람이 턴에 넷을 치고, 버티는 땅은 거의 안 는다.
 */
export const SPIRIT_GLYPHS: Record<SpiritElement, string> = {
    fire: "△",
    water: "▽",
    air: "≈",
    earth: "■",
};

/** 정령이 적을 쳤을 때의 말 — 원소가 기록에서 드러나는 자리. 빗나간 줄은 여느 싸움과 같다. */
export const SPIRIT_VERBS: Record<SpiritElement, string> = {
    fire: "불길로 태웠다",
    water: "물살로 때렸다",
    air: "바람칼로 베었다",
    earth: "바위로 짓눌렀다",
};

/**
 * 정령의 몸 — **부를 때의 레벨과 원소가 다 정한다.** 명중·공격력 보정은 여느 몬스터처럼
 * `def.level` 에서 나오므로(`monsterHitBonus`·`monsterDamBonus`) 따로 셈을 두지 않는다.
 * 그 레벨은 부른 사람보다 **두 단 위**다 — 같은 레벨이면 1층에서 `1d8+1` 이 홉고블린의
 * 방어력 5 에 거의 다 깎여 부른 보람이 없다. 방어 등급 5 는 홉고블린·뱀과 같은 값이고,
 * 땅의 정령만 2(방어력 8)다. 원소마다 다른 것은 주사위·체력·방어 셋뿐이다(`SPIRIT_GLYPHS`).
 */
export function spiritDef(bond: SpiritBond): MonsterDef {
    const level = Math.max(1, bond.level);
    const element = SPIRIT_NAMES[bond.element] ? bond.element : "fire";
    const dice = { fire: "2d6", water: "1d8", air: "1d6", earth: "1d6" }[element];
    const base = { fire: 6 + 3 * level, water: 6 + 3 * level, air: 4 + 2 * level, earth: 10 + 4 * level }[element];
    // 전직 뒤 땅만 몸이 커진다(`SPIRIT_GLYPHS`).
    const hp = bond.advanced && element === "earth" ? Math.floor(base * 1.5) : base;
    return {
        ch: SPIRIT_CH,
        name: SPIRIT_NAMES[element],
        exp: 0,
        level: level + 2,
        armor: element === "earth" ? 2 : 5,
        hp,
        // 전직 뒤 두 번 치는 것은 불뿐이다.
        damage: bond.advanced && element === "fire" ? [dice, dice] : [dice],
        mean: true,
    };
}

export function summonSpiritAt(bond: SpiritBond, x: number, y: number): Monster {
    const def = spiritDef(bond);
    return { def, x, y, hp: def.hp, maxHp: def.hp, awake: true, id: nextId++, speed: 0, cancelled: false, spirit: bond };
}

/** 같은 종은 같은 체력으로 선다 — 굴리지 않는다(`MONSTERS` 머리말 참고). */
export function spawnMonster(ch: string, x: number, y: number, rng: Rng, champion?: Monster["champion"]): Monster {
    const def = ch === SHOPKEEPER.ch ? SHOPKEEPER : MONSTERS[ch] ?? MONSTERS.B;
    let hp = Math.max(1, def.hp);
    if (champion) {
        hp = Math.round(hp * 1.5);
    }
    void rng;
    return {
        def,
        x,
        y,
        hp,
        maxHp: hp,
        awake: champion ? true : def.mean,
        id: nextId++,
        speed: champion === "swift" ? 1 : ch === "p" ? -1 : 0,
        fleeTurns: 0,
        cancelled: false,
        champion,
    };
}

/** 테스트가 식별자를 예측할 수 있게 한다. */
export function resetMonsterIds(): void {
    nextId = 1;
}
