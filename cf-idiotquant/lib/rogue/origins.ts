/**
 * 4대 출신(직업) 시스템 — Origin Classes & Traits
 *
 * 원작 Rogue 스탯 체계(Hp, Str, Arm, Exp, Gold)에 기반하여 4가지 시작 클래스를 제공합니다.
 */

import { makeItem } from "./items";
import { type Item } from "./types";

export type HeroOrigin = "knight" | "rogue" | "alchemist" | "scholar";

export interface OriginDef {
    id: HeroOrigin;
    name: string;
    title: string;
    icon: string;
    description: string;
    traitName: string;
    traitDescription: string;
    baseHp: number;
    baseStr: number;
    createStartingItems: (nextId: () => number) => Item[];
}

export const ORIGINS: Record<HeroOrigin, OriginDef> = {
    knight: {
        id: "knight",
        name: "왕실 근위대",
        title: "Knight",
        icon: "🛡️",
        description: "높은 체력과 단단한 방어구를 갖춘 굳건한 전사.",
        traitName: "철벽의 자세",
        traitDescription: "제자리 대기(.) 시 다음 턴 방어력 +2 (받는 피해 2 추가 경감)",
        baseHp: 14,
        baseStr: 16,
        createStartingItems: (nextId) => {
            const mace = makeItem("weapon", "mace", nextId(), -1, -1);
            mace.plusHit = 1;
            mace.plusDam = 1;
            const ringMail = makeItem("armor", "ring mail", nextId(), -1, -1);
            ringMail.plusArmor = 1;
            const food = makeItem("food", "food ration", nextId(), -1, -1, 1);
            return [mace, ringMail, food];
        },
    },
    rogue: {
        id: "rogue",
        name: "지하 도적",
        title: "Rogue",
        icon: "🗡️",
        description: "치명적인 기습과 함정 회피에 능한 재빠른 잠입자.",
        traitName: "기습 암습",
        traitDescription: "자거나 둔화된 적 공격 시 치명타 2배 + 3 추가 피해, 함정 50% 회피",
        baseHp: 11,
        baseStr: 15,
        createStartingItems: (nextId) => {
            const dagger = makeItem("weapon", "dagger", nextId(), -1, -1);
            dagger.plusHit = 1;
            dagger.plusDam = 1;
            const dart = makeItem("weapon", "dart", nextId(), -1, -1, 10);
            const teleportScroll = makeItem("scroll", "teleport", nextId(), -1, -1, 1);
            const food = makeItem("food", "food ration", nextId(), -1, -1, 1);
            return [dagger, dart, teleportScroll, food];
        },
    },
    alchemist: {
        id: "alchemist",
        name: "방랑 연금술사",
        title: "Alchemist",
        icon: "🧪",
        description: "모든 물약의 비밀을 꿰뚫고 있는 비약의 대가.",
        traitName: "연금술의 통찰",
        traitDescription: "모든 물약 시작부터 100% 식별, 회복 물약 음용 시 1.5배 회복",
        baseHp: 12,
        baseStr: 14,
        createStartingItems: (nextId) => {
            const dagger = makeItem("weapon", "dagger", nextId(), -1, -1);
            const leather = makeItem("armor", "leather", nextId(), -1, -1);
            const healPot = makeItem("potion", "healing", nextId(), -1, -1, 1);
            const extraHealPot = makeItem("potion", "extra healing", nextId(), -1, -1, 1);
            const food = makeItem("food", "food ration", nextId(), -1, -1, 1);
            return [dagger, leather, healPot, extraHealPot, food];
        },
    },
    scholar: {
        id: "scholar",
        name: "고서 연구자",
        title: "Scholar",
        icon: "🔮",
        description: "고대 주문서와 마법 지팡이를 다루는 비전 탐구자.",
        traitName: "비전 전도",
        traitDescription: "지팡이 충전량 +30%, 주문서 시전 시 25% 확률로 미소모 보존",
        baseHp: 10,
        baseStr: 13,
        createStartingItems: (nextId) => {
            const dagger = makeItem("weapon", "dagger", nextId(), -1, -1);
            const slowWand = makeItem("wand", "slow monster", nextId(), -1, -1);
            slowWand.charges = 8;
            const mapScroll = makeItem("scroll", "magic mapping", nextId(), -1, -1, 1);
            const idScroll = makeItem("scroll", "identify", nextId(), -1, -1, 1);
            const food = makeItem("food", "food ration", nextId(), -1, -1, 1);
            return [dagger, slowWand, mapScroll, idScroll, food];
        },
    },
};

export const ORIGIN_LIST: OriginDef[] = [
    ORIGINS.knight,
    ORIGINS.rogue,
    ORIGINS.alchemist,
    ORIGINS.scholar,
];
