/**
 * 접두사 챔피언 몬스터 & 층 돌발 이벤트 시스템.
 *
 * 1. 5대 접두사 챔피언:
 *    - blazing (타오르는): 붉은 글리프. 플레이어가 공격/피격 시 화염 지속 반사 피해.
 *    - shadow (그림자의): 보라 글리프. 피격 시 순간이동 기습, 높은 회피율(+2).
 *    - gilded (황금의): 황금 글리프. 피격 시 금화 드랍, 처치 시 대량 금화 & 추가 보상.
 *    - swift (신속의): 청록 글리프. 한 턴에 2회 행동(speed = 1), 명중 보정 +2.
 *    - vampiric (흡혈의): 진홍 글리프. 공격 성공 시 입힌 피해의 50% 체력 흡혈.
 *
 * 2. 4대 층 돌발 이벤트:
 *    - fog (짙은 안개): 시야가 한 칸으로 좁아진다 — 밝은 방도 통째로는 안 보인다.
 *    - frenzy (괴물 폭주): 몬스터 속도 +1, 처치 경험치 2배.
 *    - vault (고대 보물고): 아이템 & 금화 생성량 대폭 증가.
 *    - armory_floor (전설 무기고): 모루 주변에 고등급 무기/갑옷 다수 생성.
 */

import { type Rng } from "./rng";
import {
    type ChampionPrefix,
    type FloorMutator,
    type GameState,
    type Item,
    type Monster,
    type Pos,
} from "./types";
import { makeItem, randomItem } from "./items";

export interface ChampionDef {
    prefix: ChampionPrefix;
    name: string;
    tag: string;
    colorVar: string;
    description: string;
}

export const CHAMPION_DEFS: Record<ChampionPrefix, ChampionDef> = {
    blazing: {
        prefix: "blazing",
        name: "타오르는",
        tag: "🔥",
        colorVar: "--rg-trap",
        description: "공격 시 화염을 반사하여 3턴간 화상을 입힙니다.",
    },
    shadow: {
        prefix: "shadow",
        name: "그림자의",
        tag: "🌑",
        colorVar: "--rg-wand",
        description: "공격을 받으면 등 뒤로 순간이동하며 높은 회피율을 지닙니다.",
    },
    gilded: {
        prefix: "gilded",
        name: "황금의",
        tag: "💰",
        colorVar: "--rg-gold",
        description: "피격 시 금화를 흘리고, 처치 시 대량의 금화와 보물을 남깁니다.",
    },
    swift: {
        prefix: "swift",
        name: "신속의",
        tag: "⚡",
        colorVar: "--rg-ring",
        description: "한 턴에 2번 행동하며 날카로운 공격 명중률을 자랑합니다.",
    },
    vampiric: {
        prefix: "vampiric",
        name: "흡혈의",
        tag: "🩸",
        colorVar: "--rg-potion",
        description: "공격 성공 시 입힌 피해의 50%만큼 생명력을 흡수합니다.",
    },
};

export const CHAMPION_PREFIXES: ChampionPrefix[] = [
    "blazing",
    "shadow",
    "gilded",
    "swift",
    "vampiric",
];

/** 2층 이상에서 12% 확률로 챔피언 출현 */
export function rollChampionPrefix(depth: number, rng: Rng): ChampionPrefix | null {
    if (depth < 2) return null;
    if (rng.rnd(100) < 12) {
        return rng.pick(CHAMPION_PREFIXES) ?? null;
    }
    return null;
}

export function applyChampion(monster: Monster, prefix: ChampionPrefix): Monster {
    monster.champion = prefix;
    const def = CHAMPION_DEFS[prefix];
    monster.hp = Math.round(monster.hp * 1.5);
    monster.maxHp = monster.hp;
    monster.awake = true; // 챔피언은 항상 각성 상태

    if (prefix === "swift") {
        monster.speed = 1;
    }
    return monster;
}

export interface MutatorDef {
    kind: FloorMutator;
    name: string;
    banner: string;
    description: string;
    tag: string;
}

export const FLOOR_MUTATOR_DEFS: Record<FloorMutator, MutatorDef> = {
    fog: {
        kind: "fog",
        name: "짙은 안개",
        banner: "🌫️ 짙은 안개가 자욱하다 — 맞닿은 한 칸 밖은 안 보입니다!",
        description: "밝은 방도 통째로는 안 보이고, 맞닿은 한 칸만 보입니다.",
        tag: "🌫️",
    },
    frenzy: {
        kind: "frenzy",
        name: "괴물 폭주",
        banner: "⚡ 몬스터들이 광란에 휩싸여 빨라졌지만, 처치 경험치가 2배입니다!",
        description: "모든 몬스터의 이동/공격 속도가 빨라지며 처치 경험치가 2배가 됩니다.",
        tag: "⚡",
    },
    vault: {
        kind: "vault",
        name: "고대 보물고",
        banner: "👑 고대 보물고가 개방되어 금화와 희귀 아이템이 풍성하게 놓여 있습니다!",
        description: "바닥에 생성되는 금화와 아이템 수가 3배로 증가합니다.",
        tag: "👑",
    },
    armory_floor: {
        kind: "armory_floor",
        name: "전설 무기고",
        banner: "⚔️ 전설 대장간의 층입니다! 모루 주변에 고등급 장비가 흩어져 있습니다.",
        description: "모루 주변에 고등급 무기와 갑옷이 다수 배치됩니다.",
        tag: "⚔️",
    },
};

export const FLOOR_MUTATORS: FloorMutator[] = ["fog", "frenzy", "vault", "armory_floor"];

/** 2층 이상, 26층 미만에서 15% 확률로 돌발 층 이벤트 발생 */
export function rollFloorMutator(depth: number, rng: Rng): FloorMutator | null {
    if (depth < 2 || depth >= 26) return null;
    if (rng.rnd(100) < 15) {
        return rng.pick(FLOOR_MUTATORS) ?? null;
    }
    return null;
}

/** 챔피언 처치 시 100% 확정 고급 전리품 드랍 */
export function dropChampionLoot(state: GameState, m: Monster, rng: Rng): Item[] {
    const dropped: Item[] = [];
    const depth = state.level.depth;

    if (m.champion === "gilded") {
        // 황금 챔피언은 대량 금화 + 고급 아이템
        const goldAmt = rng.between(80, 200 + depth * 20);
        dropped.push(makeItem("gold", "gold", state.nextItemId++, m.x, m.y, goldAmt));
    }

    // 100% 확정 보상 (강화 주문서 50% or 상위 장비 30% or 보석/고급물약 20%)
    const roll = rng.rnd(100);
    if (roll < 50) {
        const type = rng.rnd(100) < 55 ? "enchant weapon" : "enchant armor";
        const it = makeItem("scroll", type, state.nextItemId++, m.x, m.y);
        it.blessed = rng.rnd(100) < 35;
        dropped.push(it);
    } else if (roll < 80) {
        const gearCat = rng.rnd(2) === 0 ? "weapon" : "armor";
        const it = randomItem(depth + 2, state.nextItemId++, m.x, m.y, rng, gearCat);
        it.blessed = rng.rnd(100) < 35;
        dropped.push(it);
    } else {
        const gemTypes = ["ruby", "sapphire", "emerald", "topaz"];
        const gemType = rng.pick(gemTypes) ?? "ruby";
        dropped.push(makeItem("gem", gemType, state.nextItemId++, m.x, m.y));
    }

    return dropped;
}
