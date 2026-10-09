/**
 * 상점 — NetHack 의 가게를 옮겼다. **값을 매기고, 가게 안인지 가리는 것**만 여기 있다.
 * 사고팔고 훔치는 규칙은 `game.ts` 가 이 함수들을 불러 판단한다.
 *
 * **값은 NetHack 의 기본가**(objects.c)다. NetHack 에 없는 물건은 가장 가까운 것의 값을
 * 쓴다(예: 소생 → 완전 회복 200, 무력화 지팡이 → cancellation 200). 이름을 모르는 물약도
 * **값은 참 이름을 따른다** — 그래서 값을 보면 어느 무리인지 짐작이 선다(NetHack 의
 * 가격 감정). 이 성질을 깨지 않으려면 값을 겉모습이 아니라 `type` 으로만 매길 것.
 */

import { type Item, type Level, type Monster, type MonsterDef, type Pos } from "./types";

export const PRICES: Record<string, Record<string, number>> = {
    potion: {
        healing: 100,
        "extra healing": 100,
        strength: 300,
        "restore strength": 100,
        poison: 50,
        blindness: 150,
        confusion: 100,
        "detect monsters": 150,
        revival: 200,
    },
    scroll: {
        identify: 20,
        "enchant weapon": 60,
        "enchant armor": 80,
        "remove curse": 80,
        "magic mapping": 100,
        teleport: 100,
        "aggravate monsters": 100,
        sleep: 100,
        "blessed enchant": 200,
        transmutation: 200,
        "recharge wand": 300,
    },
    spellbook: { healing: 100, "detect monsters": 100, "magic mapping": 500 },
    ring: {
        protection: 100,
        "sustain strength": 100,
        adornment: 100,
        stealth: 100,
        "maintain armor": 100,
        "add strength": 150,
        "see invisible": 150,
        "aggravate monsters": 150,
        dexterity: 150,
        "increase damage": 150,
        searching: 200,
        regeneration: 200,
        "slow digestion": 200,
        teleportation: 200,
    },
    wand: {
        "magic missile": 150,
        digging: 150,
        swapping: 150,
        gust: 150,
        "slow monster": 150,
        "haste monster": 150,
        lightning: 175,
        fire: 175,
        cold: 175,
        "teleport away": 200,
        cancel: 200,
    },
    armor: {
        leather: 5,
        "scale mail": 45,
        "chain mail": 75,
        "banded mail": 90,
        "ring mail": 100,
        "mithril mail": 240,
        "plate mail": 600,
        "dragon mail": 900,
        "baphomet mail": 1200,
    },
    weapon: {
        dart: 2,
        arrow: 2,
        bolt: 2,
        spear: 3,
        dagger: 4,
        mace: 5,
        "silver arrow": 5,
        "mithril arrow": 10,
        "long sword": 15,
        "oriharukon arrow": 20,
        crossbow: 40,
        "short bow": 50,
        "two-handed sword": 50,
        "pick-axe": 50,
        "long bow": 60,
        "elven bow": 60,
        "silver sword": 75,
        "sayha bow": 300,
        "thirsty sword": 300,
        "magic sword": 400,
        "knight sword": 500,
        "baphomet sword": 800,
    },
    food: { "food ration": 45 },
    gem: { ruby: 200, sapphire: 200, emerald: 200, topaz: 200 },
};

/**
 * 가게가 **안 사고 안 파는** 것. 금화는 돈이고, 증표는 이기는 조건이며(캠프 상자와 같은
 * 까닭 — `items.isStashable`), 유물은 층마다 하나뿐인 상이라 값을 매기면 사고파는 물건이 된다.
 */
export function isTradable(it: Item): boolean {
    return it.kind !== "gold" && it.kind !== "amulet" && it.kind !== "relic" && PRICES[it.kind]?.[it.type] !== undefined;
}

/**
 * 한 개의 값. 무기·갑옷은 손질 한 칸마다 10 을 더한다(NetHack 그대로) — **알든 모르든**
 * 붙으므로, 값이 곧 손질을 귀띔한다.
 */
export function unitPrice(it: Item, charisma?: number): number {
    const base = PRICES[it.kind]?.[it.type] ?? 0;
    const value = it.kind === "weapon"
        ? base + 10 * Math.max(0, Math.max(it.plusHit ?? 0, it.plusDam ?? 0))
        : it.kind === "armor" ? base + 10 * Math.max(0, it.plusArmor ?? 0) : base;
    const factor = charisma === undefined ? 1 : charismaPriceFactor(charisma);
    return Math.max(1, Math.round(value * factor));
}

/** NetHack `shk.c`의 매력별 구매가 배율. */
export function charismaPriceFactor(charisma: number): number {
    if (charisma > 18) return 0.5;
    if (charisma === 18) return 2 / 3;
    if (charisma >= 16) return 0.75;
    if (charisma <= 5) return 2;
    if (charisma <= 7) return 1.5;
    if (charisma <= 10) return 4 / 3;
    return 1;
}

/** 더미째의 값 — 사는 값. */
export function price(it: Item, charisma?: number): number {
    return unitPrice(it, charisma) * Math.max(1, it.count);
}

/** 파는 값 — 사는 값의 절반(NetHack 의 보통 값). 한 푼 아래로는 안 내려간다. */
export function sellPrice(it: Item): number {
    return Math.max(1, Math.floor(price(it) / 2));
}

/**
 * 상점 주인 — 도감의 몬스터 표(`MONSTERS`)에 안 넣는다. 안 넣어야 무작위로 안 나오고,
 * 도감의 「몇 종 중 몇 종」이 그대로다. 되읽을 때는 `storage` 가 이 글자로 되찾는다.
 *
 * NetHack 의 shopkeeper 처럼 **얕은 층에서는 못 이기는 상대**다(레벨 12, 방어 0, 4d4 두 번,
 * 빠르다). 훔치는 값이 여기 있다.
 */
export const SHOPKEEPER: MonsterDef = {
    ch: "@",
    name: "상점 주인",
    exp: 300,
    level: 12,
    armor: 0,
    hp: 60,
    damage: ["4d4", "4d4"],
    mean: false,
};

/** 새 상점의 금고 — 파는 값을 치를 돈. 사는 값이 여기로 들어온다. */
export function startingTill(depth: number): number {
    return 300 + depth * 50;
}

/** 그 칸이 **가게 안쪽**인가(벽·문 제외). 가게가 없거나 주인이 죽었으면 false. */
export function inShop(level: Level, x: number, y: number): boolean {
    const shop = level.shop;
    if (!shop) return false;
    const r = level.rooms[shop.room];
    return !!r && x > r.x && x < r.x + r.w - 1 && y > r.y && y < r.y + r.h - 1;
}

/** 이 층의 상점 주인. 없으면(죽었거나 가게가 없으면) undefined. */
export function shopkeeperOf(level: Level): Monster | undefined {
    return level.shop ? level.monsters.find((m) => m.shk && m.hp > 0) : undefined;
}

/** 파는 물건인가 — 가게 안 바닥에 있고, 내가 내려놓은 것(`noCharge`)이 아니다. */
export function forSale(level: Level, it: Item): boolean {
    return inShop(level, it.x, it.y) && !it.noCharge && isTradable(it) && !level.shop?.angry;
}

/** 외상 — 배낭에서 아직 값을 안 치른 것들의 합. */
export function billOf(pack: Item[], charisma?: number): number {
    return pack.filter((it) => it.unpaid).reduce((n, it) => n + price(it, charisma), 0);
}

/** 문에서 가게 안으로 한 칸 — 주인이 서서 길을 막는 자리. 문이 방 벽에 없으면 null. */
export function doorwayInside(r: { x: number; y: number; w: number; h: number }, door: Pos): Pos | null {
    if (door.y === r.y) return { x: door.x, y: door.y + 1 };
    if (door.y === r.y + r.h - 1) return { x: door.x, y: door.y - 1 };
    if (door.x === r.x) return { x: door.x + 1, y: door.y };
    if (door.x === r.x + r.w - 1) return { x: door.x - 1, y: door.y };
    return null;
}
