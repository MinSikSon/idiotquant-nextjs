/**
 * 전설 유물(Artifacts) & 모루 보석 소켓(Gem Socketing) 시스템.
 *
 * 1. 4대 전설 유물:
 *    - daedalus_compass (다이달로스의 나침반): 비밀문과 미로의 위치를 항상 감지.
 *    - midas_gauntlet (미다스의 건틀릿): 소지 금화 100G당 공격 피해 +1 (최대 +10), 몬스터 처치 시 추가 금화.
 *    - time_hourglass (시간의 모래시계): 50턴 쿨다운 액티브. 사용 시 3턴 동안 모든 몬스터 시간 정지.
 *    - phoenix_feather (불사조의 깃털): 치명적인 피해로 사망 시 최대 체력으로 1회 부활 후 소멸.
 *
 * 2. 4대 보석 소켓 (모루에서 무기/갑옷에 장착):
 *    - ruby (루비): [무기] 공격 시 대상에게 3턴간 화상(턴당 2 피해).
 *    - sapphire (사파이어): [무기] 공격 시 25% 확률로 1턴간 빙결.
 *    - emerald (에메랄드): [무기] 몬스터 처치 시 영웅 체력 +2 즉시 회복.
 *    - topaz (토파즈): [갑옷] 방어 등급 -1 (방어력 +1) 및 회피 보정 +2.
 */

import { type Rng } from "./rng";
import { type GameState, type Hero, type Item } from "./types";
import { takeFromPack } from "./hero";

export type RelicType =
    | "daedalus_compass"
    | "midas_gauntlet"
    | "time_hourglass"
    | "phoenix_feather";

export type GemType = "ruby" | "sapphire" | "emerald" | "topaz";

export interface RelicDef {
    type: RelicType;
    name: string;
    description: string;
    icon: string;
    cooldown?: number;
}

export const RELIC_DEFS: Record<RelicType, RelicDef> = {
    daedalus_compass: {
        type: "daedalus_compass",
        name: "다이달로스의 나침반",
        description: "고대 미궁의 나침반. 던전의 모든 비밀문과 숨겨진 통로를 감지합니다.",
        icon: "🧭",
    },
    midas_gauntlet: {
        type: "midas_gauntlet",
        name: "미다스의 건틀릿",
        description: "황금의 힘이 깃든 장갑. 소지한 금화 100G마다 공격력이 +1(최대 +10) 증가합니다.",
        icon: "🧤",
    },
    time_hourglass: {
        type: "time_hourglass",
        name: "시간의 모래시계",
        description: "시간을 멈추는 모래시계. 사용 시 3턴 동안 모든 몬스터가 멈춥니다. (재사용 50턴)",
        icon: "⏳",
        cooldown: 50,
    },
    phoenix_feather: {
        type: "phoenix_feather",
        name: "불사조의 깃털",
        description: "불멸의 깃털. 치명적인 피해를 입었을 때 생명력을 가득 채워 1회 부활시킵니다.",
        icon: "🪶",
    },
};

export interface GemDef {
    type: GemType;
    name: string;
    slot: "weapon" | "armor";
    description: string;
    icon: string;
}

export const GEM_DEFS: Record<GemType, GemDef> = {
    ruby: {
        type: "ruby",
        name: "불꽃의 루비",
        slot: "weapon",
        description: "무기 소켓용. 공격 시 3턴간 화염 지속 피해(턴당 2)를 입힙니다.",
        icon: "💎",
    },
    sapphire: {
        type: "sapphire",
        name: "서리의 사파이어",
        slot: "weapon",
        description: "무기 소켓용. 공격 시 25% 확률로 대상을 1턴간 동결시킵니다.",
        icon: "🔷",
    },
    emerald: {
        type: "emerald",
        name: "생명의 에메랄드",
        slot: "weapon",
        description: "무기 소켓용. 적 처치 시 체력을 +2 즉시 흡혈 회복합니다.",
        icon: "❇️",
    },
    topaz: {
        type: "topaz",
        name: "수호의 토파즈",
        slot: "armor",
        description: "갑옷 소켓용. 방어력 +1 및 수비 회피 보정 +2를 부여합니다.",
        icon: "🔶",
    },
};

export const GEMS: GemType[] = ["ruby", "sapphire", "emerald", "topaz"];
export const RELICS: RelicType[] = [
    "daedalus_compass",
    "midas_gauntlet",
    "time_hourglass",
    "phoenix_feather",
];

/** 영웅이 특정 유물을 소지하고 있는지 확인 */
export function hasRelic(hero: Hero, relic: RelicType): boolean {
    return hero.pack.some((it) => it.kind === "relic" && it.type === relic);
}

/** 미다스의 건틀릿 공격 보너스 계산 (100G당 +1, 최대 +10) */
export function midasBonus(hero: Hero): number {
    if (!hasRelic(hero, "midas_gauntlet")) return 0;
    return Math.min(10, Math.floor(hero.gold / 100));
}

/** 모루에서 장비에 보석을 소켓에 세공 */
export function socketGemIntoItem(
    hero: Hero,
    gearItem: Item,
    gemItem: Item,
): { ok: boolean; message: string } {
    if (gearItem.socketGem) {
        return { ok: false, message: "이미 보석이 장착되어 있습니다." };
    }
    const gemDef = GEM_DEFS[gemItem.type as GemType];
    if (!gemDef) {
        return { ok: false, message: "올바른 보석이 아닙니다." };
    }
    if (gearItem.kind !== gemDef.slot) {
        return {
            ok: false,
            message: `${gemDef.name}은(는) ${gemDef.slot === "weapon" ? "무기" : "갑옷"}에만 장착할 수 있습니다.`,
        };
    }

    gearItem.socketGem = gemItem.type as GemType;
    takeFromPack(hero, gemItem, 1);
    return {
        ok: true,
        message: `${gemDef.name}을(를) ${gearItem.type}에 완벽히 세공하여 장착했습니다!`,
    };
}
