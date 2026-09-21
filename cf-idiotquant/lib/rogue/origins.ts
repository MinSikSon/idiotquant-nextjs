/**
 * 4대 출신(직업) 시스템 — Origin Classes & Traits
 *
 * 원작 Rogue 스탯 체계(Hp, Str, Arm, Exp, Gold)에 기반하여 4가지 시작 클래스를 제공합니다.
 */

import { makeItem } from "./items";
import { type Item } from "./types";

export type HeroOrigin = "knight" | "rogue" | "alchemist" | "scholar";

/** 직업 무기를 쥐면 전투에 얹는 보너스. 무기 이름과 효과는 직업 표 한 곳에서 정한다. */
export interface WeaponAffinity {
    name: string;
    types: string[];
    description: string;
}

/**
 * 전직 레벨 — **숙련이 3→4로 두 번째 오르는 자리**(`proficiency`, `dnd.ts`).
 *
 * 봇 300판 기준 캐릭터 도달 레벨은 평균 5.6 · 최대 8이라, 여기는 **대부분 판에서 못 보는
 * 것이 정상**이다. 흔한 것을 매 판 주면 특별할 것이 없다 — 「닿으면 확 달라지는」 먼
 * 목표로 둔다. 얼마나 먼지는 `scripts/measure-rogue.mjs` 가 다시 잰다(이 값이 바뀌면
 * 다시 잴 것).
 */
export const ADVANCE_LEVEL = 9;

/**
 * 전직 뒤의 수치 — **직업 특성을 실제로 굴리는 자리**(`hero.ts`·`game.ts`)가 이 넷을 본다.
 * 레벨 1의 기본값은 그 자리에 그대로 있다(철벽 +2 · 함정 회피 50% · 회복 1.5배 · 보존
 * 25%) — 새 규칙 하나를 더하는 것뿐이라 거기까지 옮기지 않는다.
 */
export const ADVANCED_GUARD_BONUS = 4; // 근위대: 대기 시 방어력 +2 → +4
export const ADVANCED_TRAP_EVADE = 0.8; // 도적: 함정 회피 50% → 80%
export const ADVANCED_HEAL_MULT = 2; // 연금술사: 회복 물약 배율 1.5배 → 2배
export const ADVANCED_PRESERVE_CHANCE = 0.4; // 연구자: 주문서 보존 25% → 40%

export interface OriginDef {
    id: HeroOrigin;
    name: string;
    title: string;
    /** 전직(`ADVANCE_LEVEL`) 뒤의 이름·칭호. `OriginTag` **하나**가 레벨을 보고 고른다. */
    advancedName: string;
    advancedTitle: string;
    /**
     * 화면에 세우는 표. **이모지가 아니라 글자다** — 지도도 상태 줄도 고정폭 한 벌인데
     * 이모지는 칸 폭이 제각각이라 그 줄만 어긋나고, 기기마다 그림도 다르다.
     * **지도의 물건 글자를 그대로 빌린다** — `]` 갑옷(근위대) · `)` 무기(도적) ·
     * `!` 물약(연금술사) · `?` 주문서(연구자). 도움말의 기호 설명에 이미 있는 글자라
     * 따로 외울 것이 없고, 한 칸짜리 글자라 고정폭 줄이 안 흔들린다.
     */
    icon: string;
    /** 그 글자를 칠하는 색 — 지도에서 그 물건을 칠하는 색과 같은 이름이다(`--rg-*`). */
    iconInk: string;
    description: string;
    traitName: string;
    traitDescription: string;
    weaponAffinity: WeaponAffinity;
    advancedSkillName: string;
    advancedSkillDescription: string;
    advancedSkillKind: "passive" | "active";
    baseHp: number;
    baseStr: number;
    createStartingItems: (nextId: () => number) => Item[];
}

/**
 * **직업마다 이도류로 쓸 수 있는 무기는 한 종류뿐이다.** 없으면 이도류가 없는 직업이다.
 *
 * 「가벼운 무기」라는 특성을 따로 두지 않았다. 지금 사다리에 가벼운 날붙이가 단검
 * 하나뿐이라, 특성으로 열면 이도류가 **4층에서 끝나는** 기능이 된다. 직업마다 한
 * 종류를 못 박으면 새 무기 없이도 끝까지 살고, 무엇보다 **값이 저절로 붙는다** —
 * 근위대가 장검 둘을 들면 12층의 진은검을 포기하는 셈이다. 「사다리 위 하나 vs
 * 아래 둘」이 거기서 진짜 선택이 된다.
 *
 * 연금술사와 고서 연구자는 안 준다. 둘은 물약·주문서로 푸는 직업이라 손이 비어야 한다.
 */
export const DUAL_WIELD: Partial<Record<HeroOrigin, string>> = {
    rogue: "dagger",
    knight: "long sword",
};

export const ORIGINS: Record<HeroOrigin, OriginDef> = {
    knight: {
        id: "knight",
        name: "왕실 근위대",
        title: "Knight",
        advancedName: "왕실 근위 기사단장",
        advancedTitle: "Knight Captain",
        icon: "]",
        iconInk: "var(--rg-armor)",
        description: "높은 체력과 단단한 방어구를 갖춘 굳건한 전사.",
        traitName: "철벽의 자세",
        traitDescription: "제자리 대기(.) 시 다음 턴 방어력 +2 (받는 피해 2 추가 경감)",
        weaponAffinity: { name: "근위 무기", types: ["mace", "long sword", "two-handed sword", "silver sword", "thirsty sword", "magic sword", "knight sword", "baphomet sword"], description: "명중 +1 · 피해 +1" },
        advancedSkillName: "불굴의 방벽",
        advancedSkillDescription: "체력이 절반 이하일 때 방어력 +2 (철벽의 자세와 중첩)",
        advancedSkillKind: "passive",
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
        advancedName: "그림자 암살자",
        advancedTitle: "Shadow Assassin",
        icon: ")",
        iconInk: "var(--rg-weapon)",
        description: "치명적인 기습과 함정 회피에 능한 재빠른 잠입자.",
        traitName: "기습 암습",
        traitDescription: "자거나 둔화된 적 공격 시 치명타 2배 + 3 추가 피해, 함정 50% 회피",
        weaponAffinity: { name: "암살 단검", types: ["dagger"], description: "명중 +1 · 피해 +1" },
        advancedSkillName: "연막",
        advancedSkillDescription: "보이는 일반 괴물이 나를 놓친다 · 층마다 한 번",
        advancedSkillKind: "active",
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
        advancedName: "현자의 연금술사",
        advancedTitle: "Master Alchemist",
        icon: "!",
        iconInk: "var(--rg-potion)",
        description: "모든 물약의 비밀을 꿰뚫고 있는 비약의 대가.",
        traitName: "연금술의 통찰",
        traitDescription: "모든 물약 시작부터 100% 식별, 회복 물약 음용 시 1.5배 회복",
        weaponAffinity: { name: "연금 도구", types: ["dagger", "spear"], description: "명중 +1 · 피해 +1" },
        advancedSkillName: "만능 비약",
        advancedSkillDescription: "체력 1/3 회복 · 화상·실명·혼란 해제 · 층마다 한 번",
        advancedSkillKind: "active",
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
        advancedName: "대마도사",
        advancedTitle: "Archmage",
        icon: "?",
        iconInk: "var(--rg-scroll)",
        description: "고대 주문서와 마법 지팡이를 다루는 비전 탐구자.",
        traitName: "비전 전도",
        traitDescription: "지팡이 충전량 +30%, 주문서 시전 시 25% 확률로 미소모 보존",
        weaponAffinity: { name: "비전 검", types: ["dagger", "magic sword"], description: "명중 +1 · 피해 +1" },
        advancedSkillName: "비전 통찰",
        advancedSkillDescription: "층의 지형과 괴물의 기척을 밝힌다 · 층마다 한 번",
        advancedSkillKind: "active",
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
