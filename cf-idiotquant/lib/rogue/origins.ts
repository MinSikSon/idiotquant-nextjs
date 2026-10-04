/**
 * 7대 출신(직업) 시스템 — Origin Classes & Traits
 *
 * 원작 Rogue 스탯 체계(Hp, Str, Arm, Exp, Gold)에 기반하여 7가지 시작 클래스를 제공합니다.
 * 레인저는 NetHack 의 Ranger 를 옮겼다 — 활·화살 묶음과 연사(multishot) +1.
 * 고고학자는 NetHack 의 Archeologist 를 옮겼다 — 곡괭이로 벽과 발밑을 판다.
 * 정령술사는 원소 정령을 불러 함께 싸운다 — 층에 들어서면 곧바로, 같은 층에서는 턴이 쌓이면 다시.
 */

import { makeItem } from "./items";
import { type Item } from "./types";

export type HeroOrigin = "knight" | "rogue" | "alchemist" | "scholar" | "ranger" | "archeologist" | "elementalist";

/** 직업별 선호 무기 계열. 전투 보정은 이 목록이 아니라 무기 숙련도에서 계산한다. */
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
export const ADVANCED_PRESERVE_CHANCE = 0.4; // 연구자: 주문서 보존 25% → 40%

/**
 * 레인저의 연사 보너스 — NetHack 의 Ranger 는 발사기로 쏠 때 multishot 이 +1 이다.
 * 전직(명사수)하면 +2 로 한 단 오른다. 굴리는 자리는 `volleyMax`(`hero.ts`) 하나다.
 */
export const RANGER_VOLLEY_BONUS = 1;
export const ADVANCED_RANGER_VOLLEY_BONUS = 2;

/**
 * 고고학자의 벽 뒤지기 확률 — 기본 25% 와 탐색 반지 65% 사이. 전직(발굴 대가)하면 반지와
 * 같은 값이 된다. 굴리는 자리는 `searchChance`(`hero.ts`) 하나다 — 벽 뒤지기와 함정 찾기가
 * 같은 확률을 쓴다.
 */
export const ARCHEOLOGIST_SEARCH = 0.45;
export const ADVANCED_ARCHEOLOGIST_SEARCH = 0.65;
/** NetHack 에서 고고학자·드워프는 파는 힘이 두 배다(`dig()` 의 `bonus *= 2`). */
export const ARCHEOLOGIST_DIG_MULT = 2;

/**
 * 정령술사의 정령이 머무는 턴 수 — 층마다 한 번 부르고, 이만큼 지나면 흩어진다.
 * 전직(원소의 군주)하면 두 배로 머물고 두 번 때린다(`spiritDef`). 새 자원 없이 숫자만 깊어진다.
 */
export const SPIRIT_TURNS = 20;
export const ADVANCED_SPIRIT_TURNS = 40;
/**
 * 같은 층에서 정령을 **다시** 부르기까지 지나야 하는 턴(T). 새 층에 들어서면 기다리지 않는다.
 * 전직 정령이 머무는 턴(40)보다 길게 둬서 정령이 둘 서는 일이 없다.
 */
export const SPIRIT_COOLDOWN = 60;

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
     * `!` 포션(연금술사) · `?` 주문서(연구자). 레인저만 예외로 `}` 이다 — 무기 글자 `)` 는
     * 도적이 쓰고 있어서, 시위를 당긴 활의 모양을 빌렸다. 고고학자는 곡괭이도 무기(`)`)라
     * 대신 **유물**의 글자 `$` 를 빌렸다 — 파내는 것이 곧 유물이다. 도움말의 기호 설명에 이미 있는 글자라
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
 * **직업마다 이도류로 쓸 수 있는 무기 종류를 정한다.** 없으면 이도류가 없는 직업이다.
 *
 * 「가벼운 무기」라는 특성을 따로 두지 않았다. 지금 사다리에 가벼운 날붙이가 단검
 * 하나뿐이라, 특성으로 열면 이도류가 **4층에서 끝나는** 기능이 된다. 직업마다 한
 * 종류를 못 박으면 새 무기 없이도 끝까지 살고, 무엇보다 **값이 저절로 붙는다** —
 * 근위대가 장검 둘을 들면 12층의 진은검을 포기하는 셈이다. 「사다리 위 하나 vs
 * 아래 둘」이 거기서 진짜 선택이 된다.
 *
 * 연금술사와 고서 연구자는 안 준다. 둘은 포션·주문서로 푸는 직업이라 손이 비어야 한다.
 */
export const DUAL_WIELD: Partial<Record<HeroOrigin, string[]>> = {
    rogue: ["dagger", "magic dagger", "crystal dagger", "oriharukon dagger", "damascus dagger"],
    knight: [
        "dagger", "magic dagger", "crystal dagger", "oriharukon dagger", "damascus dagger",
        "mace", "spear", "long sword", "silver sword", "thirsty sword", "magic sword", "knight sword", "baphomet sword",
    ],
};

/** 직업별 무기 숙련 상한. 표 밖 무기는 Basic까지만 쓸 수 있다. */
export const WEAPON_SKILL_MAX: Record<HeroOrigin, Record<string, number>> = {
    // NetHack Knight 는 석궁을 Skilled 까지 쓴다 — 연사 없는 원거리 한 발.
    knight: { crossbow: 2, dagger: 1, "magic dagger": 1, "crystal dagger": 1, "oriharukon dagger": 1, "damascus dagger": 1, mace: 2, spear: 2, "long sword": 3, "two-handed sword": 2, "silver sword": 3, "thirsty sword": 3, "magic sword": 2, "knight sword": 3, "baphomet sword": 3 },
    rogue: { dagger: 3, "magic dagger": 3, "crystal dagger": 3, "oriharukon dagger": 3, "damascus dagger": 3, dart: 3, "long sword": 2, mace: 2, spear: 1 },
    alchemist: { dagger: 3, spear: 1, "magic sword": 2 },
    scholar: { dagger: 2, "magic sword": 3 },
    // NetHack Ranger: 활·단검·표창 Expert, 창 Skilled.
    ranger: { bow: 3, crossbow: 3, dagger: 3, dart: 3, spear: 2 },
    // NetHack Archeologist: 곡괭이 Expert, 단검 Basic·표창 Basic 보다 한 칸 넉넉히.
    archeologist: { "pick-axe": 3, dagger: 2, dart: 2 },
    // 지팡이로 싸우는 직업이라 손 무기는 연구자처럼 얕다.
    elementalist: { dagger: 2, spear: 2, "magic sword": 2 },
};

/** 직업별 방어구 숙련 상한: 1 Basic, 2 Skilled, 3 Expert. */
export const ARMOR_SKILL_MAX: Record<HeroOrigin, Record<string, number>> = {
    knight: { leather: 3, "ring mail": 3, "scale mail": 3, "chain mail": 3, "banded mail": 3, "plate mail": 3, "mithril mail": 3, "dragon mail": 3, "baphomet mail": 3 },
    rogue: { leather: 3, "ring mail": 2, "scale mail": 2, "chain mail": 1, "banded mail": 1, "plate mail": 1, "mithril mail": 1, "dragon mail": 1, "baphomet mail": 1 },
    alchemist: { leather: 3, "ring mail": 2, "scale mail": 2, "chain mail": 1, "banded mail": 1, "plate mail": 1, "mithril mail": 1, "dragon mail": 1, "baphomet mail": 1 },
    scholar: { leather: 2, "ring mail": 2, "scale mail": 1, "chain mail": 1, "banded mail": 1, "plate mail": 1, "mithril mail": 1, "dragon mail": 1, "baphomet mail": 1 },
    ranger: { leather: 3, "ring mail": 2, "scale mail": 2, "chain mail": 1, "banded mail": 1, "plate mail": 1, "mithril mail": 1, "dragon mail": 1, "baphomet mail": 1 },
    archeologist: { leather: 3, "ring mail": 2, "scale mail": 2, "chain mail": 1, "banded mail": 1, "plate mail": 1, "mithril mail": 1, "dragon mail": 1, "baphomet mail": 1 },
    elementalist: { leather: 2, "ring mail": 2, "scale mail": 1, "chain mail": 1, "banded mail": 1, "plate mail": 1, "mithril mail": 1, "dragon mail": 1, "baphomet mail": 1 },
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
        traitDescription: "제자리 대기(.) 후 전투 3턴 방어력 +2 (받는 피해 2 추가 경감)",
        weaponAffinity: { name: "근위 무기", types: ["mace", "long sword", "two-handed sword", "silver sword", "thirsty sword", "magic sword", "knight sword", "baphomet sword"], description: "근위대 선호 계열 · 숙련도 보정 적용" },
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
        description: "은신·탐색·단검 연사와 기습에 능한 재빠른 잠입자.",
        traitName: "기습 암습",
        traitDescription: "은신으로 적 일부를 재운 채 시작 · 단검 2연사 · Lv10 탐색 · 기습 치명타 · 함정 50% 회피",
        weaponAffinity: { name: "암살 단검", types: ["dagger", "magic dagger", "crystal dagger", "oriharukon dagger", "damascus dagger"], description: "도적 선호 계열 · 숙련도 보정 적용" },
        advancedSkillName: "연막",
        advancedSkillDescription: "보이는 일반 괴물이 나를 놓친다 · 층마다 한 번",
        advancedSkillKind: "active",
        baseHp: 11,
        baseStr: 15,
        createStartingItems: (nextId) => {
            const dagger = makeItem("weapon", "dagger", nextId(), -1, -1, 6);
            dagger.plusHit = 1;
            dagger.plusDam = 1;
            const leather = makeItem("armor", "leather", nextId(), -1, -1);
            leather.plusArmor = 1;
            const teleportScroll = makeItem("scroll", "teleport", nextId(), -1, -1, 1);
            const food = makeItem("food", "food ration", nextId(), -1, -1, 1);
            return [dagger, leather, teleportScroll, food];
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
        description: "모든 포션의 비밀을 꿰뚫고 있는 비약의 대가.",
        traitName: "연금술의 통찰",
        traitDescription: "모든 포션 시작부터 100% 식별, 회복 포션 1.5배 · 해로운 포션은 무작위 이득 · 지팡이 장착 가능, 걷기 회복 때 충전 +1",
        weaponAffinity: { name: "연금 도구", types: ["dagger", "magic dagger", "crystal dagger", "oriharukon dagger", "damascus dagger", "spear"], description: "연금술사 선호 계열 · 숙련도 보정 적용" },
        advancedSkillName: "축복의 기름 제조",
        advancedSkillDescription: "포션 2개로 축복의 기름 제작 · 층마다 한 번",
        advancedSkillKind: "active",
        baseHp: 12,
        baseStr: 14,
        createStartingItems: (nextId) => {
            const dagger = makeItem("weapon", "dagger", nextId(), -1, -1);
            const leather = makeItem("armor", "leather", nextId(), -1, -1);
            const healPot = makeItem("potion", "healing", nextId(), -1, -1, 1);
            const extraHealPot = makeItem("potion", "extra healing", nextId(), -1, -1, 1);
            const missileWand = makeItem("wand", "magic missile", nextId(), -1, -1);
            missileWand.charges = 5;
            const food = makeItem("food", "food ration", nextId(), -1, -1, 1);
            return [dagger, leather, healPot, extraHealPot, missileWand, food];
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
        traitDescription: "지팡이 충전량 +30%, 장착 지팡이 사용 · 걷기 회복 때 충전 +1 · 주문서 시전 시 25% 확률로 미소모 보존",
        weaponAffinity: { name: "비전 검", types: ["dagger", "magic dagger", "crystal dagger", "oriharukon dagger", "damascus dagger", "magic sword"], description: "연구자 선호 계열 · 숙련도 보정 적용" },
        advancedSkillName: "비전 통찰",
        advancedSkillDescription: "층의 지형과 괴물의 기척을 밝힌다 · 층마다 한 번",
        advancedSkillKind: "active",
        baseHp: 10,
        baseStr: 13,
        createStartingItems: (nextId) => {
            const dagger = makeItem("weapon", "dagger", nextId(), -1, -1);
            const missileWand = makeItem("wand", "magic missile", nextId(), -1, -1);
            missileWand.charges = 8;
            const mapScroll = makeItem("scroll", "magic mapping", nextId(), -1, -1, 1);
            const idScroll = makeItem("scroll", "identify", nextId(), -1, -1, 1);
            const food = makeItem("food", "food ration", nextId(), -1, -1, 1);
            return [dagger, missileWand, mapScroll, idScroll, food];
        },
    },
    ranger: {
        id: "ranger",
        name: "변방 레인저",
        title: "Ranger",
        // NetHack Ranger 의 마지막 칭호가 Marksman 이다.
        advancedName: "명사수",
        advancedTitle: "Marksman",
        icon: "}",
        iconInk: "var(--rg-food)",
        description: "활과 화살로 먼 거리에서 적을 쓰러뜨리는 추적자.",
        traitName: "연사",
        traitDescription: "활·표창 연사 +1 (숙련 +1 · 전문 +2와 합산) · `.` 토글 사격(활이면 화살, 아니면 표창 등 투척 무기) · 활·단검·표창 전문까지",
        weaponAffinity: { name: "사냥 도구", types: ["short bow", "long bow", "elven bow", "sayha bow", "crossbow", "arrow", "silver arrow", "mithril arrow", "oriharukon arrow", "bolt", "dagger", "magic dagger", "crystal dagger", "oriharukon dagger", "damascus dagger", "dart"], description: "레인저 선호 계열 · 숙련도 보정 적용" },
        advancedSkillName: "명사수의 눈",
        advancedSkillDescription: "활·표창 연사 +1 → +2",
        advancedSkillKind: "passive",
        baseHp: 12,
        baseStr: 14,
        createStartingItems: (nextId) => {
            // NetHack Ranger: +1 활 · 화살 두 묶음 · +1 단검 · 망토. 여기서는 겹치는 화살이
            // 강화를 못 가지므로(`canHoldEnchant`) 손질은 활에 싣고, 망토 대신 가죽 갑옷이다.
            // 활을 **먼저** 넣는다 — 처음 넣은 무기를 쥐고 시작한다(`makeHero`).
            // 표창 한 뭉치는 NetHack 에 없는 몫이다 — 활을 내린 채(`.` 토글이 표창으로 간다) 쓸 탄이다.
            const bow = makeItem("weapon", "short bow", nextId(), -1, -1);
            bow.plusHit = 1;
            bow.plusDam = 1;
            const arrows = makeItem("weapon", "arrow", nextId(), -1, -1, 40);
            const darts = makeItem("weapon", "dart", nextId(), -1, -1, 10);
            const dagger = makeItem("weapon", "dagger", nextId(), -1, -1);
            dagger.plusHit = 1;
            dagger.plusDam = 1;
            const leather = makeItem("armor", "leather", nextId(), -1, -1);
            const food = makeItem("food", "food ration", nextId(), -1, -1, 1);
            return [bow, arrows, darts, dagger, leather, food];
        },
    },
    archeologist: {
        id: "archeologist",
        name: "유적 고고학자",
        title: "Archeologist",
        // NetHack Archeologist 의 칭호 사다리에서 「Excavator」(발굴가)를 빌렸다.
        advancedName: "발굴 대가",
        advancedTitle: "Excavator",
        icon: "$",
        iconInk: "var(--rg-gold)",
        description: "곡괭이로 벽을 뚫고 발밑을 파 내려가는 유적 탐사가.",
        traitName: "발굴 본능",
        traitDescription: "곡괭이를 쥐고 벽으로 걸으면 판다 · 계단 없는 곳에서 내려가면 발밑을 판다 · 파는 힘 2배 · 벽 뒤지기 45%",
        weaponAffinity: { name: "발굴 도구", types: ["pick-axe", "dagger", "magic dagger", "crystal dagger", "oriharukon dagger", "damascus dagger"], description: "고고학자 선호 계열 · 숙련도 보정 적용" },
        advancedSkillName: "숨은 길의 감",
        advancedSkillDescription: "벽 뒤지기·함정 찾기 45% → 65%",
        advancedSkillKind: "passive",
        baseHp: 12,
        baseStr: 15,
        createStartingItems: (nextId) => {
            // NetHack Archeologist: 곡괭이 · 가죽 재킷 · 식량 셋. 곡괭이를 **먼저** 넣는다 —
            // 처음 넣은 무기를 쥐고 시작하고(`makeHero`), 쥐고 있어야 판다.
            // 식량을 하나 더 주는 까닭: 파는 턴도 걸음처럼 배를 곯린다.
            const pick = makeItem("weapon", "pick-axe", nextId(), -1, -1);
            pick.plusHit = 1;
            pick.plusDam = 1;
            const leather = makeItem("armor", "leather", nextId(), -1, -1);
            const food = makeItem("food", "food ration", nextId(), -1, -1, 2);
            return [pick, leather, food];
        },
    },
    elementalist: {
        id: "elementalist",
        name: "정령술사",
        title: "Elementalist",
        advancedName: "원소의 군주",
        advancedTitle: "Elemental Lord",
        // 정령(NetHack 의 elemental)의 글자 `E` 를 빌렸다. 지도에서는 정령만 원소마다 다른 색으로 칠해
        // 같은 글자의 에뮤와 갈린다.
        icon: "E",
        iconInk: "var(--rg-wand)",
        description: "불·물·바람·땅의 정령을 골라 불러 곁에 세우고 함께 싸우는 술사.",
        traitName: "정령 소환",
        traitDescription: "곁에 원소 정령을 골라 부른다(★ 단추) · 원소마다 싸우는 법이 다르다 · 새 층에서는 곧바로, 같은 층에서는 60턴 뒤 다시 · 내 레벨만큼 세지고 20턴 머문다 · 부딪히면 자리를 바꾼다",
        weaponAffinity: { name: "정령 매개", types: ["dagger", "magic dagger", "crystal dagger", "oriharukon dagger", "damascus dagger", "spear", "magic sword"], description: "정령술사 선호 계열 · 숙련도 보정 적용" },
        advancedSkillName: "정령 화신",
        advancedSkillDescription: "정령이 40턴 머물고, 원소마다 한 가지가 깊어진다",
        advancedSkillKind: "passive",
        baseHp: 11,
        baseStr: 13,
        createStartingItems: (nextId) => {
            // 싸움은 정령이 맡는다 — 손에는 가벼운 단검 하나. 정령을 다시 부르기까지 턴이 들어
            // 부르기 전·흩어진 뒤를 버틸 회복 물약을 하나 쥐여 준다.
            const dagger = makeItem("weapon", "dagger", nextId(), -1, -1);
            dagger.plusHit = 1;
            dagger.plusDam = 1;
            const leather = makeItem("armor", "leather", nextId(), -1, -1);
            const healPot = makeItem("potion", "healing", nextId(), -1, -1, 1);
            const food = makeItem("food", "food ration", nextId(), -1, -1, 1);
            return [dagger, leather, healPot, food];
        },
    },
};

export const ORIGIN_LIST: OriginDef[] = [
    ORIGINS.knight,
    ORIGINS.rogue,
    ORIGINS.alchemist,
    ORIGINS.scholar,
    ORIGINS.ranger,
    ORIGINS.archeologist,
    ORIGINS.elementalist,
];
