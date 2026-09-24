/**
 * 판이 도는 자리 — 명령 하나가 들어오면 턴 하나가 지나간다.
 *
 * **화면은 규칙을 계산하지 않는다.** `perform(state, cmd)` 하나로만 판이 바뀌고, 화면은
 * 돌아온 것을 그릴 뿐이다. 예전 게임이 무너진 자리가 그것이었다 — 판단이 화면에도
 * 있어서 규칙이 두 벌이 됐다.
 *
 * 턴의 차례는 언제나 같다:
 *   ① 내가 한다 → ② 배고픔·회복 → ③ 몬스터가 한다 → ④ 다시 본다(FOV) → ⑤ 죽었나
 *
 * 이 차례를 건너뛰는 길을 만들지 말 것. 「벽을 들이받았다」처럼 **아무 일도 안 일어난
 * 행동은 턴을 안 쓴다** — 그것이 원작이고, 그래야 배고픔 시계가 거짓말을 안 한다.
 */

import {
    buildLevel,
    SPECIAL_ROOMS,
    floorQuota,
    freeSpot,
    itemSpots,
    roomSpots,
    randomSpotIn,
} from "./dungeon";
import {
    computeFov,
    isVisible,
    monsterSees,
    revealAll,
} from "./fov";
import {
    addToPack,
    equippedArmor,
    canOffHand,
    equippedWeapon,
    offHandWeapon,
    gainExp,
    goldGain,
    hasRing,
    heroArmor,
    heroArmorClass,
    heroArmorClassTerms,
    heroStr,
    hungerOf,
    hungerRate,
    isWorn,
    makeHero,
    packItem,
    SKILL_PICK_INTERVAL,
    regenEvery,
    searchChance,
    trainWeaponSkill,
    enhanceWeaponSkills,
    takeFromPack,
    weaponSkillLevel,
    weaponSkillMax,
    weaponSkillName,
    weaponSkillTerms,
    wornRings,
} from "./hero";
import {
    ADVANCED_GUARD_BONUS,
    ADVANCED_PRESERVE_CHANCE,
    ADVANCED_TRAP_EVADE,
    ADVANCE_LEVEL,
    ORIGINS,
} from "./origins";
import {
    DETAIL,
    type Term,
    attackLine,
    damageLine,
    heroAttack,
    monsterAttack,
    monsterDefense,
    monsterDodgeBonus,
    outcomeOf,
    seenBefore,
    withDamage,
} from "./combat";
import {
    damageRoll,
    opposedRoll,
    pierce,
    proficiency,
} from "./dnd";
import {
    ARMORS,
    POTIONS,
    RINGS,
    SCROLLS,
    WANDS,
    WEAPONS,
    describe,
    isStashable,
    isThrowable,
    needsBow,
    itemChar,
    ENCHANT_MAX,
    ENCHANT_SCROLLS,
    CHEST_SLOTS,
    canHoldEnchant,
    MELT_RETURN,
    enchantOdds,
    enchantOf,
    enchantSafeMax,
    setEnchant,
    itemPower,
    meltRoll,
    meltYield,
    makeItem,
    defenseOf,
    type Category,
    pickCategory,
    randomItem,
    rollCharges,
    rollAppearances,
    weaponDamageOf,
} from "./items";
import {
    CHAMPION_DEFS,
    FLOOR_MUTATOR_DEFS,
    dropChampionLoot,
    rollChampionPrefix,
    rollFloorMutator,
} from "./champions";
import {
    RELIC_DEFS,
    GEM_DEFS,
    RELICS,
    GEMS,
    type RelicType,
    type GemType,
    socketGemIntoItem,
    hasRelic,
} from "./relics";
import {
    MONSTERS,
    depthRange,
    monsterName,
    randomMonsterChar,
    spawnMonster,
} from "./monsters";
import {
    Rng,
} from "./rng";
// **타입만** 가져온다 — 지난 판의 모양일 뿐이라 실행할 때는 사라진다(저장소를 안 끌어온다).
import type { Tomb } from "./storage";
import {
    AMULET_LEVEL,
    ALL_DIRS,
    type Hero,
    type GameState,
    type HeroOrigin,
    type Item,
    type ItemKind,
    type Level,
    MAP_H,
    MAP_W,
    type Monster,
    type Pos,
    type Trap,
    T,
    type Tile,
    idx,
    inBounds,
    walkable,
} from "./types";

type Action =
    | { t: "move"; dx: number; dy: number }
    | { t: "rest" }
    | { t: "descend" }
    | { t: "ascend" }
    | { t: "pickup" }
    /** 축복의 기름은 대상 장비에 바른다. 다른 포션은 대상 없이 마신다. */
    | { t: "quaff"; letter: string; target?: string }
    /** 강화 주문서는 **무엇에 걸지**를 같이 준다. 없으면 아무 일도 안 난다. */
    | { t: "read"; letter: string; target?: string }
    | { t: "eat"; letter: string }
    | { t: "wield"; letter: string }
    /** 보조손에 쥔다(이도류). 같은 글자를 다시 주면 내려놓는다. */
    | { t: "offHand"; letter: string }
    | { t: "wear"; letter: string }
    | { t: "putOn"; letter: string }
    | { t: "removeRing"; letter: string }
    | { t: "zap"; letter: string; dx: number; dy: number }
    | { t: "throw"; letter: string; dx: number; dy: number }
    | { t: "search" }
    /** 모루 위에서 무기나 갑옷을 녹인다 — 그 물건은 사라지고 강화 주문서가 나온다. */
    | { t: "melt"; letter: string }
    /** 모루(캠프) 위에서 배낭의 물건을 상자에 맡긴다 — **다음 판까지 남는다.** */
    | { t: "stash"; letter: string }
    /** 모루(캠프) 위에서 상자의 칸 하나를 배낭으로 꺼낸다. */
    | { t: "unstash"; slot: number }
    /**
     * 3레벨마다 쌓이는 성장 하나를 고른다 — **캠프도, 턴도 필요 없다**(레벨업 자체가
     * 턴을 안 쓰는 것과 같은 자리). `hero.pendingSkillPicks` 가 남아 있을 때만 된다.
     */
    | { t: "pickSkill"; option: "str" | "def" | "luck" }
    | { t: "inspectStatus"; kind: "origin" | "str" | "defense" | "wisdom" }
    /** 레벨 9 전직 뒤 층마다 한 번 쓰는 직업 고유 기술. */

    | { t: "classSkill"; ingredients?: [string, string] }
    | { t: "drop"; letter: string }
    /** 곁에 선 동료에게 건넨다 — 협동에서만 쓴다. */
    | { t: "give"; letter: string }
    | { t: "use_relic"; letter: string }
    | { t: "altar"; choice: "blood" | "hunger" | "guardian" }
    | { t: "socket"; gearLetter: string; gemLetter: string };

/**
 * 명령 하나 — **누가 하는지**까지.
 *
 * `who` 는 `state.heroes` 의 칸 번호이고, 없으면 `0`(방장)이다. 그래서 **단독 플레이의
 * 명령은 한 글자도 안 바뀐다** — 옛 명령이 그대로 돌고, 테스트도 그대로 산다.
 *
 * 한 자리에 붙인다. 열아홉 갈래마다 적으면 새 명령을 더하는 날 하나를 빠뜨린다.
 */
export type Command = Action & { who?: number };

/**
 * ` (피해 3d4+2)` — 착용한 **그 물건의 성능.**
 *
 * 내 명중·피해·방어도가 아니라 **물건 몫**이다. 한때 갑옷을 입으면 내 방어 등급을
 * 적었는데, 그건 (ㄱ) 물건이 아니라 나의 값이고 (ㄴ) 화면의 「방어도」와 방향이
 * 반대인 옛 등급이라 「입었더니 숫자가 내려갔다」로 읽혔다.
 *
 * 배낭 줄과 **같은 자리**(`itemPower`)에서 낸다. 둘이 갈리면 배낭에는 18 이라 적히고
 * 입을 때는 다른 숫자가 뜬다.
 */
function withPower(it: Item, state: GameState): string {
    const p = itemPower(it, state.known);
    return p ? ` (${p})` : "";
}

/** 메시지는 여기로만 들어온다 — 화면이 직접 밀어 넣지 않는다. */
/**
 * 협동에서 **지금 말하는 사람** — `perform` 이 명령 동안만 켜 둔다(`1P▸ `). 몬스터의 차례
 * (`finishTurn`)에 나는 말에는 안 붙는다: 그 말은 누구의 행동도 아니다.
 * 계산 줄(`DETAIL`)에는 안 붙인다 — 화면이 그 앞머리로 계산 줄을 가린다.
 */
let sayTag = "";

function say(state: GameState, ...lines: string[]) {
    for (const l of lines) {
        if (!l) continue;
        // 전투 계산 줄은 `DETAIL` 표지로 화면이 따로 접어 그린다. 그 줄을 제외한 모든
        // 기록에는 그 순간의 턴을 앞에 남겨, 사건의 순서를 지난 판에서도 알 수 있게 한다.
        if (l.startsWith(DETAIL)) state.messages.push(l);
        else {
            const player = sayTag && !/^\d+P▸ /.test(l) ? sayTag : "";
            state.messages.push(`T:${state.turn} ${player}${l}`);
        }
    }
    // 오래된 것은 버린다. 화면은 마지막 몇 줄만 보여 준다.
    if (state.messages.length > 200) state.messages.splice(0, state.messages.length - 200);
}

function tileAt(level: Level, x: number, y: number): Tile {
    return inBounds(x, y) ? (level.tiles[idx(x, y)] as Tile) : T.ROCK;
}

function monsterAt(level: Level, x: number, y: number): Monster | undefined {
    return level.monsters.find((m) => m.x === x && m.y === y && m.hp > 0);
}

function itemAt(level: Level, x: number, y: number): Item | undefined {
    return level.items.find((i) => i.x === x && i.y === y);
}

/**
 * 이 층에 몬스터와 물건을 흩뿌린다.
 *
 * 깊을수록 몬스터가 많다. **물건도 깊이를 탄다** — 개수가 아니라 **등급**이 (`items.ts`
 * 의 `depth` 와 `itemTier`). 금화는 액수가 는다.
 *
 * 종류를 고르는 확률(금화냐 물약이냐 무기냐)은 층을 안 탄다 — 그것까지 층에 맡기면
 * 깊은 층에서 식량이 안 나와 굶어 죽는 까닭이 운이 된다.
 */
/**
 * 한 층에 놓는 강화 주문서의 상한과, 가뭄 보정.
 *
 * **보정은 늦게 켠다**(`DROUGHT_GRACE`). 한 층에 물건이 서너 개뿐이라 「이번 층에 강화가
 * 없다」는 세 층에 두 번꼴로 일어나는 **보통 일**이다. 그걸 굶었다고 치고 곧바로 보정하면
 * 보정이 늘 켜져 있는 셈이 되어, 층별 가중치(6~11)를 12~14 로 밀어 올린다 — 실제로
 * 그랬다. 이 규칙이 없애려는 것은 평균이 아니라 **다섯 층 연속 없는 판**이다.
 */
const ENCHANT_PER_FLOOR = 2;
/** 층 단위 상한 — 특수 방을 포함한 총수, 장비, 반지. 넘으면 소모품으로 바꾼다. */
const FLOOR_ITEM_CAP = 8;
const FLOOR_GEAR_CAP = 3;
const FLOOR_RING_CAP = 1;
/** 식량 없이 이만큼 지나면 다음 층에 하나를 보장한다. */
const FOOD_GRACE = 4;
/**
 * **사람이 하나 늘 때마다 식량 쪽으로 얼마나 더 기우는가.**
 *
 * 배고픔 시계는 사람마다 따로 돌되 한 시계를 같이 본다(`finishTurn`) — 둘이면 한 걸음에
 * 배가 두 배로 곯는다. 그런데 가중치를 **인원수만큼만**(`×2`) 올렸더니 실제로 뽑히는
 * 양은 1.74배에 그쳤다 — 가중치가 오르면 다른 분류를 밀어내는 만큼 **전체 통도 같이
 * 커지므로**(`pickCategory` 의 `w`), 배로 올려도 배로 안 뽑힌다. 필요한 것은 2배인데
 * 가중치를 2배만 주면 못 미친다.
 *
 * `FOOD_MOUTH_BOOST` 는 **늘어난 입 하나마다 가중치에 몇 배를 더할지**다. 혼자
 * (`mouths=1`)면 그대로(`×1`) — 단독 플레이의 뽑기는 한 글자도 안 바뀐다. 둘이면
 * `1 + 1 × 2 = 3`, 즉 **가중치를 세 배**로 줘야 실제로 뽑히는 양이 목표(2배)를 넘는다.
 * 잰 값(씨앗 120 × 8층, `rogue-coop.test.ts`): **혼자 363 · 둘 750 — 2.07배.**
 *
 * 가뭄 보장선(`FOOD_GRACE`)도 같은 수를 본다 — 손잡이 둘이 다른 수를 보면 「몇 배를
 * 봐줄까」를 두 곳에서 따로 정하는 꼴이라, 인원을 더 받게 되는 날 한쪽만 고치게 된다.
 */
const FOOD_MOUTH_BOOST = 2;

/** 인원수가 식량에 미치는 기울기 — `pickCategory` 의 가중치와 가뭄 보장선이 같이 본다. */
function foodTilt(mouths: number): number {
    return 1 + (mouths - 1) * FOOD_MOUTH_BOOST;
}
/** 특수 방의 기본 몫과, 무기고의 등급 보너스. */
const SPECIAL_BASE = 2;
const ARMORY_TIER_UP = 2;
/** 금고 안에 놓는 물건 수 — 적게. 많으면 파는 것이 아니라 터는 것이 된다. */
const VAULT_ITEMS = 3;
/** 금고의 등급 보정 — 층보다 두 칸 위. 벽을 뚫은 값이다. */
const VAULT_TIER_UP = 2;
const DROUGHT_GRACE = 2;
const DROUGHT_STEP = 1.0;

/**
 * 파티의 「좋은 물건」운 — **가장 높은 값 하나를 쓴다.**
 *
 * 바닥에 뭐가 떨어지는지는 층 하나의 일이라 사람마다 나누지 않는다(경험치처럼 곁에 선
 * 사람과 값이 갈리는 자리가 아니다). **쓰러진 사람은 안 센다** — 서 있지도 않은 사람의
 * 안목이 바닥에 영향을 주면 안 된다.
 */
export function partyItemLuck(state: GameState): number {
    let best = 0;
    for (const h of state.heroes) {
        if (h.hp > 0 && h.itemLuck > best) best = h.itemLuck;
    }
    return best;
}

function populate(state: GameState, level: Level, rng: Rng) {
    const luck = partyItemLuck(state);
    const monsterCount = rng.rnd(4) + 2 + Math.floor(level.depth / 3);
    for (let i = 0; i < monsterCount; i++) {
        const p = freeSpot(level, rng, [...state.heroes, level.stairs]);
        const prefix = rollChampionPrefix(level.depth, rng);
        const m = spawnMonster(randomMonsterChar(level.depth, rng), p.x, p.y, rng, prefix ?? undefined);
        // NetHack Rogue의 은신: 혼자 잠입한 도적 앞에서는 평범한 적 일부가 처음부터
        // 잠든 채 선다. 협동에서는 다른 동료가 곧바로 깨울 수 있으므로 이 값도 혼자일 때만 준다.
        if (state.heroes.length === 1 && state.heroes[0].origin === "rogue" && !prefix && m.awake && rng.chance(0.5)) {
            m.awake = false;
        }
        if (level.mutator === "frenzy") {
            m.speed = 1;
        }
        level.monsters.push(m);
    }

    // **총량은 층이 정하고, 자리는 방들이 넓이 몫만큼 나눠 갖는다.**
    const dry = Math.max(0, state.enchantDrought - DROUGHT_GRACE);
    const scale = level.depth === 1 ? 0 : 1 + DROUGHT_STEP * dry;

    const sp = level.special;
    const def = sp ? SPECIAL_ROOMS[sp.kind] : null;
    const quota = floorQuota(level.depth, rng);
    const ns = def ? Math.round(SPECIAL_BASE * def.kappa) : 0;
    const borrow = def ? Math.max(0, Math.floor((ns - SPECIAL_BASE) / 2)) : 0;
    // **금고도 층에서 꾸어 간다.** 처음에는 쿼터 밖에 얹었는데, 그러면 「총량은 층이
    // 정한다」가 깨져서 금고가 난 층만 물건이 불어난다(테스트가 바로 잡았다: 한 층에 12개).
    // 꾸어 가면 **양이 아니라 질**이 상이 된다 — 판 사람은 같은 개수를 두 칸 위 등급으로 받는다.
    // `+1` 은 굴착 지팡이 몫이다. 그것도 이 층에 놓는 물건이라 같이 센다.
    const vaultRoom = level.rooms.findIndex((r) => r.vault);
    const vaultBorrow = vaultRoom >= 0 ? VAULT_ITEMS + 1 : 0;
    const ng = Math.max(2, (def ? Math.max(2, quota - borrow) : quota) - vaultBorrow);

    let enchants = 0;
    let gear = 0;
    let rings = 0;
    let foods = 0;
    let placed = 0;
    let relicPlaced = false;

    /** 한 층의 상한들 — 넘으면 **버리지 않고 다른 것으로 바꾼다**(총량은 층이 정한다). */
    // **입이 늘면 식량도 는다.** 배고픔 시계는 사람마다 따로 도니(`finishTurn`) 둘이면
    // 한 층에서 먹는 양도 두 배다. 그런데 떨어지는 양이 그대로면 굶어 죽는 까닭이
    // **판단이 아니라 인원수**가 된다. `foodTilt` 가 그 기울기다 — 혼자면 `×1` 이라
    // 단독 플레이의 뽑기는 한 글자도 안 바뀐다.
    const mouths = state.heroes.length;
    const tilt = foodTilt(mouths);
    const put = (p: Pos, bias?: Partial<Record<Category, number>>, tierUp = 0) => {
        if (placed >= FLOOR_ITEM_CAP) return;
        // 특수 방의 편향이 있으면 **거기에 곱한다** — 보물방의 `food: 0`(식량이 안 나온다)
        // 같은 규칙을 인원수가 뒤집으면 안 된다.
        let cat = pickCategory(level.depth, rng, scale, { ...bias, food: (bias?.food ?? 1) * tilt });
        if (cat === "enchant" && enchants >= ENCHANT_PER_FLOOR) cat = "scroll";
        if ((cat === "weapon" || cat === "armor") && gear >= FLOOR_GEAR_CAP) cat = "potion";
        if (cat === "ring" && rings >= FLOOR_RING_CAP) cat = "potion";
        // 보장선도 **같은 기울기**로 빨리 온다 — 가중치만 올리면 뽑기가 계속 어긋났을 때
        // 둘이서 굶는 구간이 혼자일 때와 똑같이 길다.
        if (!bias && foods === 0 && state.foodDrought >= Math.max(1, Math.ceil(FOOD_GRACE / tilt))) cat = "food";
        if (cat === "enchant") enchants++;
        if (cat === "weapon" || cat === "armor") gear++;
        if (cat === "ring") rings++;
        if (cat === "food") foods++;
        placed++;

        // 희귀 전설 유물 스폰 (food나 enchant가 아닐 때만)
        if (cat !== "food" && cat !== "enchant" && !relicPlaced && ((level.depth >= 10 && rng.rnd(100) < 8) || (bias && bias.gold && level.depth >= 8 && rng.rnd(100) < 25))) {
            const unowned = RELICS.filter((r) => !hasRelic(state.heroes[0], r) && !level.items.some((it) => it.kind === "relic" && it.type === r));
            if (unowned.length > 0) {
                const relicType = rng.pick(unowned);
                if (relicType) {
                    relicPlaced = true;
                    level.items.push(makeItem("relic", relicType, state.nextItemId++, p.x, p.y));
                    return;
                }
            }
        }

        // 2층 이상에서 8% 확률로 소모품 대신 원소 보석 스폰
        if ((cat === "potion" || cat === "scroll") && level.depth >= 2 && rng.rnd(100) < 8) {
            const gemType = rng.pick(GEMS) ?? "ruby";
            level.items.push(makeItem("gem", gemType, state.nextItemId++, p.x, p.y));
            return;
        }

        // 무기고는 **등급이 두 칸 위**다 — 무기고에서 단검이 나오면 무기고가 아니다.
        level.items.push(randomItem(level.depth + tierUp, state.nextItemId++, p.x, p.y, rng, cat, luck));
    };

    const avoid = [state.heroes[0], level.stairs];
    if (sp && def) {
        const tierUp = sp.kind === "armory" ? ARMORY_TIER_UP : 0;
        for (const p of roomSpots(level, level.rooms[sp.room], ns, rng, avoid)) put(p, def.bias, tierUp);
    }
    // ── 금고 — **파야만 들어가는 방** ───────────────────────────────────────────
    //
    //   ① **안에는 상을** — 층보다 두 칸 위 등급으로. 벽 한 겹을 뚫는 값이 있어야 한다.
    //   ② **밖에는 굴착 지팡이를** — 금고가 있는 층에는 **반드시** 놓는다. 없으면 그 방은
    //      그 판에서 영영 못 여는 죽은 칸이고, 그건 재미가 아니라 놀림이다.
    //
    // **일반 배치보다 먼저 놓는다.** 뒤에 놓으면 층이 이미 상한(`FLOOR_ITEM_CAP`)에 차
    // 있을 때 금고 몫만 밀려나거나, 지팡이가 상한을 넘겨 얹힌다 — 테스트가 잡았다(9 > 8).
    // 먼저 놓으면 꾸어 온 몫을 확실히 쓰고, 남은 것을 일반 배치가 채운다.
    //
    // 금고는 **마법 지도**와 **다이달로스의 나침반**에 잡힌다(바위가 아니라 바닥이라서다).
    // 그래서 「어디를 파야 하나」가 운이 아니라 정보가 된다 — 따로 표시를 만들지 않았다.
    if (vaultRoom >= 0) {
        // **`put` 을 지난다** — 층의 상한(강화 장수·장비 수·총량)을 금고라고 비켜 가지 않는다.
        for (const p of roomSpots(level, level.rooms[vaultRoom], VAULT_ITEMS, rng, [])) {
            put(p, undefined, VAULT_TIER_UP);
        }
        // **열쇠도 일반 물건과 같은 분배를 타고, 같은 상한을 센다.** `freeSpot` 으로 아무
        // 데나 놓았더니 특수 방 안에까지 떨어져 그 방의 몫(κ)을 넘겼다 — 그것도 테스트가 잡았다.
        const [way] = itemSpots(level, 1, rng, avoid, sp ? sp.room : null);
        if (way && placed < FLOOR_ITEM_CAP) {
            // **충전을 굴려서 놓는다** — `makeItem` 만 부르면 `0회` 짜리가 나가고, 그러면
            // 금고를 여는 유일한 열쇠가 죽은 물건이라 그 방은 열 수 없다. 지도 검사는
            // 「지팡이가 놓여 있다」까지만 보므로 이 자리는 그쪽으로 안 잡힌다.
            const key = makeItem("wand", "digging", state.nextItemId++, way.x, way.y);
            key.charges = rollCharges(rng);
            level.items.push(key);
            placed++;
        }
    }

    for (const p of itemSpots(level, ng, rng, avoid, sp ? sp.room : null)) put(p);

    state.enchantDrought = enchants > 0 ? 0 : state.enchantDrought + 1;
    state.foodDrought = foods > 0 ? 0 : state.foodDrought + 1;

    // ── 금고 — **파야만 들어가는 방** ───────────────────────────────────────────
    //
    // 두 가지를 같이 놓아야 이 방이 뜻을 갖는다:
    //
    //   ① **안에는 상을** — 층보다 두 칸 위 등급으로. 벽 한 겹을 뚫는 값이 있어야 한다.
    //   ② **밖에는 굴착 지팡이를** — 금고가 있는 층에는 **반드시** 판다. 없으면 그 방은
    //      그 판에서 영영 못 여는 죽은 칸이고, 그건 재미가 아니라 놀림이다.
    //      `freeSpot` 은 금고를 피하므로(`dungeon.freeSpot`) 지팡이가 금고 안에 갇힐 일은 없다.
    //
    // 금고는 **마법 지도**와 **다이달로스의 나침반**에 잡힌다(바위가 아니라 바닥이라서다).
    // 그래서 「어디를 파야 하나」가 운이 아니라 정보가 된다 — 따로 표시를 만들지 않았다.
    // 증표는 딱 한 층에 있다. 여기가 이 판의 바닥이다.
    if (level.depth === AMULET_LEVEL) {
        const room = rng.pick(level.rooms.filter((r) => !r.gone)) ?? level.rooms[0];
        const p = randomSpotIn(room, rng);
        level.items.push(makeItem("amulet", "amulet", state.nextItemId++, p.x, p.y));
    }
}

/**
 * 그 깊이의 층으로 옮겨 선다.
 *
 * **가 본 층이면 떠난 그대로 다시 펼친다** — 밝혀 둔 지도도, 두고 온 물건도, 잡다 만
 * 놈도 그 자리에 있다. 처음 가는 층이면 그때 판다.
 *
 * 층이 두 벌이 되지 않게 **떠나는 층을 먼저 넣고 들어갈 층을 뺀다.** 넣기만 하고 안
 * 빼면 `state.level` 과 `state.levels[depth]` 가 같은 층을 가리키고, 어느 날 한쪽만
 * 바뀐다.
 *
 * 서는 자리는 **온 방향**이 정한다. 내려왔으면 올라가는 계단 위, 올라왔으면 내려가는
 * 계단 위 — 온 길이 발밑에 있어야 지도가 읽힌다. `fall` 만 예외다: 바닥이 꺼져
 * 떨어진 것이라 계단을 안 거쳤고, 그래서 아무 데나 처박힌다.
 *
 * **새 판도 `above` 다.** 지하 1층은 지상에서 계단을 밟고 내려온 자리이고, 발밑의 그
 * 계단이 곧 나가는 문이다(`ascend`). 예전에는 새 판과 함정 추락이 `start` 한 값을
 * 같이 썼는데, 둘은 「계단을 거쳤나」가 정반대라 한 값으로 묶일 수 없다.
 */
function enterLevel(state: GameState, depth: number, rng: Rng, from: "above" | "below" | "fall") {
    if (state.level) state.levels[state.level.depth] = state.level;
    const seen = state.levels[depth];
    const level = seen ?? buildLevel(depth, rng);
    delete state.levels[depth];

    const back = from === "above" ? level.upStairs : from === "below" ? level.stairs : null;
    const start = back ?? freeSpot(level, rng, [level.stairs]);
    // **파티가 같이 옮겨 간다.** 층은 하나뿐이라(`state.level`) 둘이 다른 층에 있을 수 없고,
    // 쓰러진 사람도 업고 간다 — 두고 가면 살릴 길이 없다.
    // 먼저 전원을 판 밖으로 치워 두고 한 명씩 세운다 — 옛 층의 좌표가 곁 찾기를 막지 않게.
    for (const h of state.heroes) h.x = h.y = -1;
    state.level = level;
    // 첫 사람은 계단 위, 나머지는 **그 곁에** 선다 — 한 칸에 둘이 서지 않는다.
    state.heroes.forEach((h, i) => {
        const p = i === 0 ? start : besideFree(state, start, rng);
        h.x = p.x;
        h.y = p.y;
    });
    // **살아서 더 깊은 층에 닿으면 쓰러진 동료가 일어난다** — 최대 체력의 1/4 로.
    //
    // **내려갈 때만이다**(계단·함정으로 떨어지기). 올라가서 살리면 두 층 사이를 오르내리는
    // 것만으로 공짜 부활이 되고, 「깊이 들어가야 산다」는 무게가 사라진다.
    //
    // 협동일 때만이다. 혼자면 쓰러지는 순간 판이 끝나므로 여기까지 오지 않는다.
    // 이 규칙이 살아남은 사람에게 「계단까지 간다」는 구체적인 목표를 준다 — 판이 그냥
    // 끝나지 않고, 도망이 곧 동료를 살리는 길이 된다.
    if (state.heroes.length > 1 && from !== "below") {
        for (const h of state.heroes) {
            if (h.hp > 0) continue;
            h.hp = Math.max(1, Math.floor(h.maxHp / 4));
            // **배도 같이 일으킨다.** 굶어 쓰러진 사람은 `food` 가 죽음선(`-200`) 아래 그대로라
            // 체력만 채우면 **다음 한 걸음에 도로 쓰러진다** — 일으킨 것이 아니라 한 턴을
            // 빌려준 것이 된다. 올리는 것은 죽음선 위 딱 한 칸(`Faint`)까지다: 살아났을
            // 뿐이지 먹은 것은 아니다.
            h.food = Math.max(h.food, REVIVE_FOOD);
            h.burnTurns = 0;
            h.asleep = 0;
            h.confused = 0;
            h.blind = 0;
            // 「굶어 죽었다」는 **일어난 사람의 비문이 아니다.** 안 지우면 나중에 판이 끝날 때
            // `if (!state.epitaph)` 가 그 옛 문구를 그대로 쓴다.
            state.epitaph = "";
            say(state, "쓰러졌던 동료가 층을 넘으며 숨을 되찾았다.");
        }
    }
    // 이미 살던 층에 몬스터와 물건을 또 뿌리면 갈 때마다 불어난다.
    if (!seen) {
        level.mutator = rollFloorMutator(depth, rng);
        populate(state, level, rng);
        if (level.mutator) {
            say(state, FLOOR_MUTATOR_DEFS[level.mutator].banner);
        }
    }
    computeFov(level, state.heroes);
    state.deepest = Math.max(state.deepest, depth);
}

/** 시야 내에 들어온 바닥의 물건들을 이번 판 목격 목록에 기록한다. */
export function updateSeenItems(state: GameState): void {
    const { level } = state;
    const hero = state.heroes[0];
    if (!level || !level.items) return;
    for (const it of level.items) {
        if (isVisible(level, it.x, it.y) || hero.detect > 0) {
            state.seenItems[`${it.kind}:${it.type}`] = true;
        }
    }
}

/**
 * 지난 판에서 들고 온 상자를 **이 판의 물건으로 앉힌다.**
 *
 * 저장소에서 꺼낸 물건은 **지난 판의 `id`** 를 달고 있다. 그대로 두면 이 판이 새로 빚는
 * 물건과 번호가 겹치고, `takeFromPack`·`itemAt` 이 전부 `id` 로 찾으므로 **엉뚱한 것이
 * 사라진다.** 그래서 앉히는 자리에서 번호를 다시 매긴다.
 *
 * 칸 수 상한도 여기서 한 번 더 자른다 — 저장소의 값은 남이 고칠 수 있는 파일이다.
 */
function seatChest(state: GameState, hero: Hero, chest: Item[]): void {
    hero.chest = chest.slice(0, CHEST_SLOTS).map((it) => {
        const seated = { ...it, id: state.nextItemId++, x: -1, y: -1 };
        delete seated.letter;
        return seated;
    });
}

/**
 * 이 사람의 상자를 저장소의 것으로 **맞춘다.**
 *
 * 상자의 진짜 자리는 판이 아니라 **그 사람**이다. 한 사람이 판을 둘 들고 있을 수 있어서다 —
 * 혼자 하던 판을 세워 두고 남의 방에 손님으로 들어가면, 그 사람의 상자를 아는 판이 둘이 된다.
 * 둘을 화해시키는 규칙은 하나다: **저장소가 참이고, 판을 되읽을 때 그쪽에 맞춘다.**
 *
 * 판에도 상자를 적는 까닭은 온라인이다 — 손님은 방장이 보낸 판(`init`)으로만 제 상자를 본다.
 */
export function setChest(state: GameState, who: number, chest: Item[]): GameState {
    const hero = state.heroes[who];
    if (!hero) return state;
    seatChest(state, hero, chest);
    return { ...state };
}

/**
 * 새 판.
 *
 * `bestiary`, `specials`, `itemCodex`, `itemUsage`, `chest` 는 **지난 판에서 이어받는 것
 * 전부**다. 부르는 쪽(화면)이 저장소에서 꺼내 넘긴다 — 엔진이 `localStorage` 를 알면
 * 테스트가 브라우저를 필요로 하게 된다.
 */
export function newGame(
    seed = Math.floor(Math.random() * 0x7fffffff),
    bestiary: Record<string, number> = {},
    specials: Record<string, number> = {},
    itemCodex: Record<string, boolean> = {},
    itemUsage: Record<string, number> = {},
    origin: HeroOrigin = "knight",
    chest: Item[] = [],
): GameState {
    const rng = new Rng(seed);
    const state: GameState = {
        seed,
        rngState: rng.state,
        // 아래에서 곧바로 덮는다. 타입을 채우기 위한 빈 층.
        level: null as unknown as Level,
        levels: {},
        heroes: [],
        messages: [],
        turn: 0,
        phase: "playing",
        epitaph: "",
        deepest: 1,
        appearance: {},
        known: {},
        bestiary: { ...bestiary },
        specials: { ...specials },
        seenItems: {},
        itemCodex: { ...itemCodex },
        itemUsage: { ...itemUsage },
        enchantDrought: 0,
        foodDrought: 0,
        nextItemId: 1,
    };
    state.appearance = rollAppearances(rng);
    state.heroes[0] = makePartyHero(state, rng, origin);
    seatChest(state, state.heroes[0], chest);
    enterLevel(state, 1, rng, "above");
    updateSeenItems(state);
    state.rngState = rng.state;
    say(state, "지하 1층. 옌더의 증표는 26층에 있다.");
    return state;
}

/**
 * 영웅 하나를 빚고 **그가 아는 것을 판에 올린다.**
 *
 * `newGame` 과 `joinGame` 이 **같이 쓴다** — 갈라 두면 손님만 제 직업의 지식을 못 받는
 * 날이 온다.
 *
 * **아는 것(`known`)은 파티가 같이 든다.** 고서 연구자가 합류하면 방장도 주문서를 읽을
 * 줄 알게 된다 — 시야를 합치는 것과 같은 결이다(등을 맡긴 사람이 아는 것은 나도 안다).
 */
function makePartyHero(state: GameState, rng: Rng, origin: HeroOrigin): Hero {
    const hero = makeHero(rng, () => state.nextItemId++, origin);
    // 처음 쥔 것은 무엇인지 안다 — 손질 정도까지. 제 손에 들려 온 장비다.
    for (const it of hero.pack) {
        const k = `${it.kind}:${it.type}`;
        state.known[k] = true;
        state.itemCodex[k] = true;
        it.plusKnown = true;
    }
    // 연금술사는 시작부터 모든 물약의 정체를 안다.
    if (origin === "alchemist") {
        for (const pot of Object.keys(POTIONS)) {
            const k = `potion:${pot}`;
            state.known[k] = true;
            state.itemCodex[k] = true;
        }
    } else if (origin === "scholar") {
        // 고서 연구자는 시작부터 모든 주문서와 지팡이의 정체를 안다.
        for (const scr of Object.keys(SCROLLS)) {
            const k = `scroll:${scr}`;
            state.known[k] = true;
            state.itemCodex[k] = true;
        }
        for (const w of Object.keys(WANDS)) {
            const k = `wand:${w}`;
            state.known[k] = true;
            state.itemCodex[k] = true;
        }
    }
    return hero;
}

/**
 * 손님 하나를 판에 들인다 — **방장 곁에** 세운다.
 *
 * 핫시트도 온라인도 이 자리를 쓴다. 자리를 층 아무 데나(`freeSpot`) 주면 둘이 서로를
 * 못 찾은 채 시작한다 — **같이 들어왔으면 같이 서 있어야** 한다. 곁에 설 칸이 하나도
 * 없으면(벽장 같은 방) 그때는 층에서 찾는다. 그래도 판은 굴러가야 한다.
 *
 * **턴을 안 쓴다** — 합류는 세상을 바꾸는 행동이 아니라 사람이 하나 느는 일이다
 * (`survey` 와 같은 자리, 못 박은 규칙 3).
 */
/**
 * 동료 하나를 보낸다 — **그 자리만** 비운다. 방장(`heroes[0]`)은 못 보낸다.
 *
 * `who` 를 안 주면 옛 뜻 그대로 `heroes[1]`(핫시트 동료 · 온라인 손님이 하나뿐이던 시절의
 * 자리)이다. 방장이 쓰러져 있으면 못 보낸다: 혼자 남은 사람이 쓰러진 판은 이미 끝난 판이다
 * — 다만 이 규칙은 **방장이 떠날 때만** 묻는다(방장 자신을 못 보내므로 사실상 안 걸린다,
 * 남아 있던 옛 검사를 그대로 옮겼다).
 *
 * **가운데 자리가 빠지면 뒤엣사람들의 칸 번호가 하나씩 당겨진다.** 몬스터가 쥐고 있던
 * 어그로(`target`)는 사람의 **칸 번호**라 그대로 두면 엉뚱한 사람을 쫓는다 — 떠난 자리를
 * 쫓던 것은 지우고, 그 뒤를 쫓던 것은 하나씩 당긴다. 화면 쪽의 `who`(누가 조종하는가)는
 * 판의 값이 아니라 **화면이 따로 챙긴다**(온라인은 `guestKey` 로 제 칸을 다시 찾는다).
 */
export function leaveGame(state: GameState, who = 1): GameState {
    const hero = state.heroes[who];
    if (!hero || who === 0) return state;
    if (state.heroes[0].hp <= 0) {
        say(state, "쓰러진 채로는 동료를 보낼 수 없다.");
        return { ...state };
    }
    state.heroes.splice(who, 1);
    (state.benched ??= []).push(hero);
    for (const l of [state.level, ...Object.values(state.levels)]) {
        for (const m of l?.monsters ?? []) {
            if (m.target === who) delete m.target;
            else if ((m.target ?? -1) > who) m.target! -= 1;
        }
    }
    computeFov(state.level, state.heroes);
    say(state, "동료가 떠났다. 다시 혼자다.");
    return { ...state };
}

/**
 * `at` 곁의 빈 칸 — 다른 영웅도 몬스터도 없는 곳. 곁이 다 찼으면 층 아무 데나.
 * **영웅은 한 칸에 둘이 안 선다** — 합류·층 이동이 다 이 자리를 쓴다.
 */
function besideFree(state: GameState, at: Pos, rng: Rng): Pos {
    const taken = (x: number, y: number) =>
        state.heroes.some((h) => h.x === x && h.y === y) ||
        state.level.monsters.some((m) => m.x === x && m.y === y);
    const beside = ALL_DIRS.map((d) => ({ x: at.x + d.dx, y: at.y + d.dy })).find(
        (p) => inBounds(p.x, p.y) && walkable(tileAt(state.level, p.x, p.y)) && !taken(p.x, p.y),
    );
    return beside ?? freeSpot(state.level, rng, state.heroes);
}

/** 지도 한 칸에 2×2 로 앉힐 수 있는 글자 수. */
export const NICK_MAX = 4;

/**
 * 지도에 적을 **이름 넉 자**로 다듬는다 — 길이·글자·대소문자를 **여기 한 자리**에서 정한다.
 *
 * 남이 보낸 값이 그대로 화면에 그려지는 자리다(온라인의 `hello`). 흘려보내면 한 칸에
 * 열 글자짜리가 들어와 지도를 덮거나, 줄바꿈 하나로 칸이 두 줄이 된다.
 *
 *   · **문자·숫자·기호**만 — 빈칸·줄바꿈·제어문자는 지도 한 칸을 깨므로 버린다.
 *   · **넉 칸까지** — 2×2 로 그리는 자리라 그 이상은 그릴 데가 없다. 한글·그림문자는
 *     두 칸으로 세어 둘까지 받는다.
 *
 * 남는 것이 없으면 `undefined` — 이름표를 안 달고 `@` 그대로 간다.
 */
export function cleanNick(raw: unknown): string | undefined {
    if (typeof raw !== "string") return undefined;
    let used = 0;
    let out = "";
    for (const ch of Array.from(raw.normalize("NFC").toUpperCase())) {
        if (!/[\p{L}\p{N}\p{P}\p{S}]/u.test(ch)) continue;
        // 한글·한자·가나·그림문자는 한 칸의 두 글자 폭을 쓴다. 넉 칸짜리 표 안에서
        // 한글 넉 자를 억지로 눌러 넣으면 읽을 수 없으므로, 들어갈 자리를 먼저 센다.
        const width = /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Extended_Pictographic}]/u.test(ch) ? 2 : 1;
        if (used + width > NICK_MAX) break;
        out += ch;
        used += width;
    }
    return out || undefined;
}

/** 그 사람의 이름을 놓는다 — **판을 안 굴린다**(턴도 난수도 안 쓴다). */
export function setNick(state: GameState, who: number, nick: string | undefined): GameState {
    const hero = state.heroes[who];
    if (!hero) return state;
    const clean = cleanNick(nick);
    if (clean) hero.nick = clean;
    else delete hero.nick;
    return { ...state };
}

export function joinGame(
    state: GameState,
    origin: HeroOrigin = "knight",
    nick?: string,
    chest?: Item[],
    /**
     * 온라인 손님의 붙박이 자리표 — **이 값으로 「돌아온 그 사람」을 고른다.**
     * 핫시트 동료는 안 준다(`undefined`) — 대기석에도 그 값이 없는 자리를 고른다.
     */
    guestKey?: string,
): GameState {
    const rng = rngOf(state);
    const host = state.heroes[0];
    // **이 판에서 보냈던 동료 중 이 사람을 고른다** — 자리표가 같은 사람이 돌아온 것이고,
    // 없으면 새로 온 사람이다. 손님이 하나뿐이던 시절엔 「대기석에 있으면 그 사람」이었는데,
    // 손님이 여럿이면 **A 가 나간 자리에 B 가 들어와 A 의 캐릭터를 가로채는 일**이 생긴다.
    const benchIdx = state.benched?.findIndex((h) => h.guestKey === guestKey) ?? -1;
    const back = benchIdx >= 0 ? state.benched![benchIdx] : undefined;
    if (back) state.benched!.splice(benchIdx, 1);
    if (state.benched?.length === 0) delete state.benched;
    const guest = back ?? makePartyHero(state, rng, origin);
    guest.guestKey = guestKey;
    // **상자는 새로 앉는 사람만 들고 온다.** 돌아온 동료의 상자는 이 판에서 이미 굴러간
    // 것이라(맡겼다 꺼냈을 수 있다) 지난 판의 값으로 덮으면 그 사이의 일이 지워진다.
    if (!back && chest) seatChest(state, guest, chest);
    // **이름은 돌아온 동료도 새로 받는다** — 직업과 달리 그 판의 것이 아니라 그 사람의 것이다.
    const clean = cleanNick(nick);
    if (clean) guest.nick = clean;
    else delete guest.nick;

    const at = besideFree(state, host, rng);
    guest.x = at.x;
    guest.y = at.y;
    state.heroes.push(guest);

    computeFov(state.level, state.heroes);
    updateSeenItems(state);
    state.rngState = rng.state;
    say(state, back ? "동료가 돌아왔다." : "동료가 합류했다.");
    return { ...state };
}

/** 저장해 둔 난수 상태로 이어 굴린다 — 그래야 판이 재현된다. */
function rngOf(state: GameState): Rng {
    const rng = new Rng(state.seed);
    rng.state = state.rngState;
    return rng;
}

/** 문을 대각선으로 드나들 수 없다 — 원작의 규칙이다. */
function blockedDiagonal(level: Level, from: Pos, to: Pos): boolean {
    if (from.x === to.x || from.y === to.y) return false;
    return tileAt(level, from.x, from.y) === T.DOOR || tileAt(level, to.x, to.y) === T.DOOR;
}

function heroMove(state: GameState, hero: Hero, dx: number, dy: number, rng: Rng): { acted: boolean; fought: boolean } {
    const level = state.level;

    // 헷갈리는 동안에는 가려던 곳으로 못 간다.
    if (hero.confused > 0 && rng.chance(0.6)) {
        const d = rng.pick(ALL_DIRS)!;
        dx = d.dx;
        dy = d.dy;
    }

    const nx = hero.x + dx;
    const ny = hero.y + dy;
    if (!inBounds(nx, ny)) return { acted: false, fought: false };

    const target = monsterAt(level, nx, ny);
    if (target) {
        pullAggro(state, target, hero);
        const r = heroAttack(state, hero, target, rng);
        say(state, ...r.messages);
        if (r.killed) killMonster(state, target, rng, hero);
        return { acted: true, fought: true };
    }

    if (!walkable(tileAt(level, nx, ny))) return { acted: false, fought: false };
    if (blockedDiagonal(level, hero, { x: nx, y: ny })) return { acted: false, fought: false };

    // **동료와는 자리를 바꾼다** — 막히게 두면 폭 한 칸 복도에서 둘이 영영 못 지나간다.
    const mate = state.heroes.find((h) => h !== hero && h.x === nx && h.y === ny);
    if (mate) {
        mate.x = hero.x;
        mate.y = hero.y;
    }
    hero.x = nx;
    hero.y = ny;

    // 갑옷과 반지 착용 걸음 수 누적 (도감 통달)
    if (hero.armorId) {
        const arm = hero.pack.find((p) => p.id === hero.armorId);
        if (arm) {
            const k = `armor:${arm.type}`;
            state.itemUsage[k] = (state.itemUsage[k] ?? 0) + 1;
        }
    }
    if (hero.leftRingId) {
        const lr = hero.pack.find((p) => p.id === hero.leftRingId);
        if (lr) {
            const k = `ring:${lr.type}`;
            state.itemUsage[k] = (state.itemUsage[k] ?? 0) + 1;
        }
    }
    if (hero.rightRingId) {
        const rr = hero.pack.find((p) => p.id === hero.rightRingId);
        if (rr) {
            const k = `ring:${rr.type}`;
            state.itemUsage[k] = (state.itemUsage[k] ?? 0) + 1;
        }
    }

    const it = itemAt(level, nx, ny);
    if (it) {
        if (it.kind === "gold") {
            const gold = goldGain(hero, it.count);
            hero.gold += gold;
            level.items = level.items.filter((i) => i.id !== it.id);
            say(state, `금화 ${gold}을(를) 주웠다.`);
        } else {
            say(state, `발밑에 ${describe(it, state.known, state.appearance)}이(가) 있다.`);
        }
    }
    if (tileAt(level, nx, ny) === T.STAIRS) say(state, "아래로 가는 계단이다.");
    if (level.upStairs && level.upStairs.x === nx && level.upStairs.y === ny) {
        say(state, level.depth === 1 ? "바깥으로 나가는 계단이다." : "위로 가는 계단이다.");
    }
    // **모루는 밟았을 때 말해 준다.** 「배낭 → 무기 → 녹인다」는 눌러 봐야 나오는 길이라,
    // 여기서 한 마디 안 하면 `&` 가 그냥 못 보던 글자로 남는다.
    if (level.anvil && level.anvil.x === nx && level.anvil.y === ny) {
        say(
            state,
            `모루다 — 캠프. 무기·갑옷을 녹여 강화 주문서를 되뽑고, 상자에 ${CHEST_SLOTS}칸까지 맡긴다 (${hero.chest.length}/${CHEST_SLOTS} · 다음 판까지 남는다).`,
        );
    }

    const trap = level.traps.find((t) => t.x === nx && t.y === ny);
    if (trap) springTrap(state, hero, trap, rng);
    return { acted: true, fought: false };
}

function pickUp(state: GameState, hero: Hero): boolean {
    const { level } = state;
    const it = itemAt(level, hero.x, hero.y);
    if (!it) {
        say(state, "여기에는 아무것도 없다.");
        return false;
    }
    if (it.kind === "gold") {
        const gold = goldGain(hero, it.count);
        hero.gold += gold;
        level.items = level.items.filter((i) => i.id !== it.id);
        say(state, `금화 ${gold}을(를) 주웠다.`);
        return true;
    }
    // **배낭에 있는 쪽**을 받는다. 겹쳐 쌓였으면 집은 물건과 다른 물건이고, 자리를
    // 가진 것은 배낭 쪽뿐이다.
    const inPack = addToPack(hero, it, true);
    if (!inPack) {
        say(state, "배낭이 꽉 찼다.");
        return false;
    }
    level.items = level.items.filter((i) => i.id !== it.id);
    if (it.kind === "amulet") {
        hero.hasAmulet = true;
        state.known["amulet:amulet"] = true;
        state.itemCodex["amulet:amulet"] = true;
        state.itemUsage["amulet:amulet"] = Math.max(state.itemUsage["amulet:amulet"] ?? 0, 1);
        say(state, "옌더의 증표를 손에 넣었다! 이제 올라갈 수 있다.");
    } else {
        say(state, `${inPack.letter}) ${describe(inPack, state.known, state.appearance)}`);
    }
    return true;
}

/** 연금술사의 회복 배율 — 전직과 무관하게 기본 특성으로만 남는다. */
export function alchemistHealMult(hero: Hero): number {
    if (hero.origin !== "alchemist") return 1;
    return 1.5;
}

/** 연구자의 주문서 보존 확률 — 전직하면 `origins.ADVANCED_PRESERVE_CHANCE` 로 깊어진다. */
export function scholarPreserveChance(hero: Hero): number {
    if (hero.origin !== "scholar") return 0;
    return hero.level >= ADVANCE_LEVEL ? ADVANCED_PRESERVE_CHANCE : 0.25;
}

function quaff(state: GameState, hero: Hero, letter: string, rng: Rng, target?: string): boolean {
    const it = packItem(hero, letter);
    if (!it || it.kind !== "potion") {
        say(state, "마실 수 있는 것이 아니다.");
        return false;
    }
    if (it.type === "blessing") {
        const gear = target ? packItem(hero, target) : undefined;
        if (!gear || (gear.kind !== "weapon" && gear.kind !== "armor")) {
            say(state, "축복을 입힐 무기나 갑옷을 골라야 한다.");
            return false;
        }
        if (gear.blessed) {
            say(state, "이미 축복받은 장비다.");
            return false;
        }
        takeFromPack(hero, it);
        gear.blessed = true;
        say(state, `${describe(gear, state.known, state.appearance)}에 축복이 깃들었다.`);
        return true;
    }

    const key = `potion:${it.type}`;
    takeFromPack(hero, it);
    state.known[key] = true;
    state.itemCodex[key] = true;
    state.itemUsage[key] = (state.itemUsage[key] ?? 0) + 1;

    // 연금술사는 독성 물약을 비약으로 바꾼다. 세 결과 모두 이미 쓰는 수치라 별도 상태나
    // 예외 규칙을 외울 필요가 없다.
    if (hero.origin === "alchemist" && (it.type === "poison" || it.type === "blindness" || it.type === "confusion")) {
        switch (rng.rnd(3)) {
            case 0:
                hero.str = Math.min(31, hero.str + 1);
                hero.maxStr = Math.max(hero.maxStr, hero.str);
                say(state, "연금술의 통찰로 독성을 힘으로 바꾸었다!");
                break;
            case 1:
                hero.food = Math.min(2000, Math.max(hero.food, 0) + 800);
                say(state, "연금술의 통찰로 속이 든든해졌다!");
                break;
            default:
                hero.detect += 200;
                say(state, "연금술의 통찰로 괴물의 기척이 드러났다!");
                break;
        }
        return true;
    }

    switch (it.type) {
        case "healing": {
            let heal = rng.roll(hero.level, 4);
            heal = Math.floor(heal * alchemistHealMult(hero));
            if (hero.hp + heal >= hero.maxHp) hero.maxHp += 1;
            hero.hp = Math.min(hero.maxHp, hero.hp + heal);
            say(state, "기운이 돈다.");
            break;
        }
        case "extra healing": {
            let heal = rng.roll(hero.level, 8);
            heal = Math.floor(heal * alchemistHealMult(hero));
            if (hero.hp + heal >= hero.maxHp) hero.maxHp += 2;
            hero.hp = Math.min(hero.maxHp, hero.hp + heal);
            hero.blind = 0;
            say(state, "몸이 놀랄 만큼 가볍다.");
            break;
        }
        /**
         * 소생 — **곁에 쓰러진 동료를 일으킨다.**
         *
         * 쓰러진 사람을 되살리는 길이 여태 둘뿐이었다: **층을 넘거나**(살아남은 사람이
         * 계단까지 가야 한다), 불사조의 깃털(제 몸에만 듣는다). 둘 다 **곁에 가서 살리는**
         * 길은 아니라, 동료가 눈앞에 누워 있는데 할 수 있는 것이 없었다.
         *
         * **곁(옆 칸)이어야 한다** — 건네기와 같은 거리다. 멀리서 살리면 위험을 무릅쓰고
         * 다가가는 일이 사라진다. 일으키는 것은 **최대 체력의 절반** — 층을 넘어 일어나는
         * 1/4 보다 후하다(물약 한 병을 썼으니).
         *
         * 곁에 쓰러진 사람이 없으면 **제 몸을 가득** 채운다. 혼자 하는 판에서 빈 칸이
         * 되지 않게 하는 자리다 — 협동에서만 듣는 물건은 혼자인 사람에게 함정이다.
         */
        case "revival": {
            const fallen = state.heroes.find(
                (h) => h !== hero && h.hp <= 0 && Math.max(Math.abs(h.x - hero.x), Math.abs(h.y - hero.y)) <= 1,
            );
            if (fallen) {
                fallen.hp = Math.max(1, Math.floor(fallen.maxHp / 2));
                fallen.food = Math.max(fallen.food, REVIVE_FOOD);
                fallen.burnTurns = 0;
                fallen.asleep = 0;
                fallen.confused = 0;
                fallen.blind = 0;
                // 굶어 쓰러졌다면 그 비문은 일어난 사람의 것이 아니다(`enterLevel` 과 같은 자리).
                state.epitaph = "";
                say(state, `${heroLabel(state, fallen)}이(가) 숨을 되찾고 일어났다!`);
                break;
            }
            hero.hp = hero.maxHp;
            hero.blind = 0;
            say(state, "곁에 일으킬 사람이 없다 — 대신 내 몸이 가득 찬다.");
            break;
        }
        case "strength":
            hero.str = Math.min(31, hero.str + 1);
            hero.maxStr = Math.max(hero.maxStr, hero.str);
            say(state, "힘이 솟는다.");
            break;
        case "restore strength":
            hero.str = hero.maxStr;
            say(state, "힘이 돌아왔다.");
            break;
        case "poison":
            if (hasRing(hero, "sustain strength")) {
                say(state, "속이 뒤집혔지만 힘은 그대로다.");
                break;
            }
            hero.str = Math.max(3, hero.str - (rng.rnd(3) + 1));
            say(state, "속이 뒤집힌다. 힘이 빠졌다.");
            break;
        case "blindness":
            hero.blind += rng.between(40, 80);
            say(state, "눈앞이 캄캄하다.");
            break;
        case "confusion":
            hero.confused += rng.between(15, 25);
            say(state, "바닥이 일렁인다.");
            break;
        case "detect monsters":
            hero.detect += rng.between(150, 300);
            say(
                state,
                state.level.monsters.length > 0
                    ? "벽 너머에서 무언가 움직이는 것이 느껴진다."
                    : "이 층에는 아무것도 없다.",
            );
            break;
    }
    return true;
}

/**
 * 이 주문서가 **고를 것을 묻는가** — 무엇 중에서 고르는가.
 *
 * 화면이 「고르기를 한 번 더 띄울까」를 정하는 데 쓴다. **판단이 아니라 값 읽기**라
 * 규칙이 두 벌이 되지 않는다(`onStairs` 와 같은 자리 — 못 박은 규칙 1). 눌러도
 * `read` 가 한 번 더 본다: 대상 없이 들어오면 아무 일도 안 난다.
 */
export function scrollTargetKinds(state: GameState, letter: string, who = 0): ItemKind[] | null {
    const it = packItem(state.heroes[who] ?? state.heroes[0], letter);
    if (!it || it.kind !== "scroll") return null;
    // **정체를 모르면 안 묻는다.** 고르기 창이 뜨는 것만으로, 그리고 목록이 무기로
    // 좁혀지는 것만으로 그 주문서가 무엇인지 드러난다 — 취소하면 주문서도 턴도 안 쓰니
    // 「읽고 제목만 보고 닫기」로 **공짜 감정**이 된다. 모르는 것은 원작 그대로 쥔 것·입은
    // 것에 걸리고, 무엇이었는지는 **걸린 뒤에** 안다.
    if (!state.known[`scroll:${it.type}`]) return null;
    return targetKindsOf(it);
}

/** 이 주문서가 무엇에 걸리는가 — **정체를 아는지와 상관없는 규칙**이다. */
function targetKindsOf(it: Item): ItemKind[] | null {
    if (it.type === "enchant weapon") return ["weapon"];
    if (it.type === "enchant armor") return ["armor"];
    if (it.type === "blessed enchant") return ["weapon", "armor"];
    if (it.type === "transmutation") return ["weapon", "armor", "ring"];
    return null;
}

/**
 * 정체를 모르는 주문서가 **저절로 걸리는 자리** — 쥔 것 · 입은 것 · 낀 것 순서로 본다.
 *
 * 원작 Rogue 가 그랬다. 고를 수 없는 대신 **몸에 걸친 것**에 걸리므로, 모르는 주문서를
 * 읽는 것이 곧 「지금 쓰는 장비를 건다」는 뜻이 된다.
 */
function defaultTarget(hero: Hero, kinds: ItemKind[], allow?: (it: Item) => boolean): Item | undefined {
    for (const k of kinds) {
        const it =
            k === "weapon" ? equippedWeapon(hero) : k === "armor" ? equippedArmor(hero) : wornRings(hero)[0];
        // **걸 수 없는 것은 「걸친 것이 없다」와 같이 친다.** 표창을 쥔 채 정체 모르는 강화
        // 주문서를 읽으면 부르는 쪽이 「걸 것이 없었다」로 보내 주문서가 타고 정체가 밝혀진다 —
        // 아무 일도 안 일어나고 턴도 안 쓰는 막다른 길보다 낫다.
        if (it && (!allow || allow(it))) return it;
    }
    return undefined;
}

export function enchantTarget(state: GameState, letter: string, who = 0): ItemKind | null {
    const kinds = scrollTargetKinds(state, letter, who);
    return kinds && kinds.length === 1 ? kinds[0] : null;
}

/**
 * 그 주문서가 **강화 갈래인가** — 축복까지 포함해서. 재련이면 `null`.
 *
 * 화면이 고르기 제목·상한 거르기·축복 범위 표기를 이것으로 가른다. **대상 종류의
 * 개수로 가르면 안 된다** — 축복도 재련도 여럿을 받아서 **축복이 재련으로 오인된다**.
 * 그러면 상한(`+9`)에 닿은 물건이 고르는 목록에 그대로 뜬다.
 *
 * `scrollTargetKinds` 와 같은 자리의 **값 읽기**다(못 박은 규칙 1).
 */
export function enchantScrollKind(state: GameState, letter: string, who = 0): "plain" | "blessed" | null {
    const it = packItem(state.heroes[who] ?? state.heroes[0], letter);
    if (!it || it.kind !== "scroll" || !ENCHANT_SCROLLS.includes(it.type)) return null;
    return it.type === "blessed enchant" ? "blessed" : "plain";
}

/**
 * 재련 한 번. 대상 장비(무기·갑옷·반지)를 같은 분류의 다른 무작위 장비로 바꾼다.
 * 25% 확률로 +1 강화 보너스를 획득한다 (축복 재련은 100% 확정 +1 및 상위 티어 변환).
 */
function transmute(state: GameState, it: Item, rng: Rng, isBlessed = false): void {
    const oldDesc = describe(it, state.known, state.appearance);

    if (it.kind === "weapon") {
        const pool = Object.keys(WEAPONS).filter((k) => k !== it.type);
        let nextType: string;
        if (isBlessed) {
            const curDepth = WEAPONS[it.type]?.depth ?? 1;
            const higher = pool.filter((k) => (WEAPONS[k]?.depth ?? 1) >= curDepth);
            nextType = rng.pick(higher.length ? higher : pool) ?? pool[0];
        } else {
            nextType = rng.pick(pool) ?? pool[0];
        }
        it.type = nextType;
        const def = WEAPONS[nextType];
        if (def?.stack) {
            if (it.count <= 1) it.count = rng.between(5, 12);
        } else {
            it.count = 1;
        }
        // **겹치는 것이 되었으면 강화는 안 얹는다.** 여기로 얹으면 「겹치는 것은 강화를 안
        // 가진다」가 재련 한 자리에서만 뚫려, 표창으로 재련해 놓고 녹이는 길이 도로 열린다.
        // 바뀐 종류가 강화를 못 가지면 **들고 있던 것도 내린다** — 장검 `+3` 이 표창이 되면
        // 그 `+3` 은 갈 데가 없다.
        if (!canHoldEnchant(it)) {
            setEnchant(it, 0);
        } else if (isBlessed || rng.chance(0.25)) {
            it.plusHit = (it.plusHit ?? 0) + 1;
            it.plusDam = (it.plusDam ?? 0) + 1;
            say(state, "✨ 재련 과정에서 마법의 기운이 깃들어 성능이 더욱 강화되었다!");
        }
    } else if (it.kind === "armor") {
        const pool = Object.keys(ARMORS).filter((k) => k !== it.type);
        let nextType: string;
        if (isBlessed) {
            const curDepth = ARMORS[it.type]?.depth ?? 1;
            const higher = pool.filter((k) => (ARMORS[k]?.depth ?? 1) >= curDepth);
            nextType = rng.pick(higher.length ? higher : pool) ?? pool[0];
        } else {
            nextType = rng.pick(pool) ?? pool[0];
        }
        it.type = nextType;
        if (isBlessed || rng.chance(0.25)) {
            it.plusArmor = (it.plusArmor ?? 0) + 1;
            say(state, "✨ 재련 과정에서 마법의 기운이 깃들어 성능이 더욱 강화되었다!");
        }
    } else if (it.kind === "ring") {
        const pool = Object.keys(RINGS).filter((k) => k !== it.type);
        const nextType = rng.pick(pool) ?? pool[0];
        it.type = nextType;
        if (nextType === "protection" || nextType === "add strength") {
            if ((it.plusRing ?? 0) === 0) it.plusRing = 1;
        }
        if (isBlessed || rng.chance(0.25)) {
            it.plusRing = (it.plusRing ?? 0) + 1;
            say(state, "✨ 재련 과정에서 마법의 기운이 깃들어 성능이 더욱 강화되었다!");
        }
    }

    if (isBlessed) it.blessed = true;
    const key = `${it.kind}:${it.type}`;
    state.known[key] = true;
    state.itemCodex[key] = true;
    it.plusKnown = true;
    say(
        state,
        `연금술의 불꽃이 일며 ${oldDesc}이(가) ${describe(it, state.known, state.appearance)}(으)로 재련되었다!`,
    );
}

/**
 * 강화 한 번. 성공하면 `+1`(축복 시 +2~+3), **실패하면 부서진다(축복 시 보호).**
 *
 * 확률은 `items.enchantOdds` **한 자리**에서 온다 — 화면이 고르기 줄에 적는 것과 같은
 * 값이다. 갈리면 사람은 자기가 본 숫자를 믿고 걸었다가 영문을 모른 채 물건을 잃는다.
 *
 * **저주받은 것도 걸 수 있다.** 부서지면 저주에서 풀려나는데, 그것이 벗을 수 없는
 * 물건을 떼는 유일한 길이고 대가도 분명하다(물건이 사라진다).
 */
function enchant(state: GameState, hero: Hero, it: Item, rng: Rng, blessed: boolean): void {
    const plus = enchantOf(it);
    // **정체를 알게 된다.** 걸어 본 물건의 속을 모른 채로 둘 수는 없다.
    const key = `${it.kind}:${it.type}`;
    state.known[key] = true;
    state.itemCodex[key] = true;
    it.plusKnown = true;

    // ── 축복 — **안전 구간 안에서만 여러 칸을 한 번에 올린다** ────────────────────
    //
    // 천장을 넘는 눈이 나오면 **천장에서 자른다.** 천장 위에서는 이 갈래를 안 타고 아래
    // 굴림으로 그대로 떨어진다 — 굴림도 대가도 일반과 똑같다. 그래서 축복은 「안 부서지는
    // 주문서」가 아니라 **「안전 구간을 빨리 지나는 주문서」**다. 끝점(`+9`)은 안 움직인다.
    const safeMax = enchantSafeMax(it.kind);
    if (blessed && plus < safeMax) {
        const step = rng.between(1, 3);
        const next = Math.min(plus + step, safeMax);
        say(
            state,
            `${DETAIL}축복 강화 ${describe(it, state.known, state.appearance)} → +${next}` +
            `   d3 ${step}${plus + step > safeMax ? `  → 천장 +${safeMax} 에서 잘림` : ""}`,
        );
        setEnchant(it, next);
        say(
            state,
            `${describe(it, state.known, state.appearance)}이(가) 축복의 빛을 머금고 단숨에 벼려졌다.` +
            `${withPower(it, state)}`,
        );
        return;
    }

    const odds = enchantOdds(plus, it.kind);
    // 굴린 눈을 남긴다 — 싸움의 굴림 줄과 같은 모양이다(`combat.DETAIL`).
    const roll = rng.rnd(100) + 1;
    const ok = roll <= Math.round(odds * 100);
    say(
        state,
        `${DETAIL}강화 ${describe(it, state.known, state.appearance)} → +${plus + 1}` +
        `   d100 ${roll}  vs  ${Math.round(odds * 100)}%  → ${ok ? "성공" : "실패"}`,
    );
    if (!ok) {
        if (it.blessed) {
            it.blessed = false;
            say(state, `${describe(it, state.known, state.appearance)}의 축복이 깨짐을 막고 사라졌다!`);
            return;
        }
        // 쥐고/입고 있던 것이면 그 자리도 같이 빈다(`takeFromPack` 이 한다).
        takeFromPack(hero, it, it.count);
        say(state, `${describe(it, state.known, state.appearance)}이(가) 산산이 부서졌다!`);
        return;
    }
    setEnchant(it, plus + 1);
    say(
        state,
        `${describe(it, state.known, state.appearance)}이(가) ` +
        `${it.kind === "armor" ? "단단해졌다" : "파랗게 빛난다"}.${withPower(it, state)}`,
    );
}

function read(state: GameState, hero: Hero, letter: string, rng: Rng, target?: string): boolean {
    const { level } = state;
    if (hero.blind > 0) {
        say(state, "앞이 안 보여 읽을 수 없다.");
        return false;
    }
    const it = packItem(hero, letter);
    if (!it || it.kind !== "scroll") {
        say(state, "읽을 수 있는 것이 아니다.");
        return false;
    }

    // ── 대상이 필요한 주문서(강화/재련)는 **고를 것을 먼저 묻는다** ──────────────
    // 대상 없이 들어오면 **아무 일도 안 난다** — 주문서도 턴도 안 쓴다(못 박은 규칙 3).
    // 화면이 고르기를 띄우는 사이에 판이 한 턴 흐르면 안 된다.
    const targetKinds = targetKindsOf(it);
    if (targetKinds) {
        // **정체를 아는 주문서만 고르게 한다**(`scrollTargetKinds` 와 같은 갈래).
        // 모르는 것은 고르기 창이 안 떴으므로 여기서도 묻지 않고 몸에 걸친 것에 건다.
        const known = !!state.known[`scroll:${it.type}`];
        if (known && !target) return false;
        // 재련은 겹치는 것에도 걸린다 — 표창 열 자루가 **한 자루**의 딴 무기가 되므로
        // (`transmute` 가 `count` 를 1 로 내린다) 불어나지 않는다. 거르는 것은 강화뿐이다.
        const on = known
            ? packItem(hero, target!)
            : defaultTarget(hero, targetKinds, ENCHANT_SCROLLS.includes(it.type) ? canHoldEnchant : undefined);
        if (!on || !targetKinds.includes(on.kind)) {
            if (known) {
                say(state, "선택한 대상에 적용할 수 없다.");
                return false;
            }
            // 모르는 주문서인데 걸 것이 없다 — **주문서는 탄다.** 그래야 무엇이었는지 안다.
            takeFromPack(hero, it);
            const k = `scroll:${it.type}`;
            state.known[k] = true;
            state.itemCodex[k] = true;
            state.itemUsage[k] = (state.itemUsage[k] ?? 0) + 1;
            say(state, `${describe(it, state.known, state.appearance)}를 읽었지만 걸 것이 없었다.`);
            return true;
        }
        if (ENCHANT_SCROLLS.includes(it.type)) {
            // **겹쳐 쌓이는 것에는 못 건다**(`canHoldEnchant`). 한 장이 열 자루를 한꺼번에
            // 올리는데 모루는 한 자루씩 녹이므로, 거기서 주문서가 불어났다.
            // 화면도 목록에서 빼지만 **자물쇠는 둘이다** — 정체를 모르는 주문서는 고르기
            // 창을 안 지나고 몸에 걸친 것에 곧장 걸리므로, 표창을 쥔 채 읽으면 이쪽으로만
            // 걸러진다(`defaultTarget` 이 그 경우를 「걸 것이 없다」로 보낸다).
            if (!canHoldEnchant(on)) {
                say(state, "벼려 만든 것이 아니라 주문이 걸리지 않는다.");
                return false;
            }
            const plus = enchantOf(on);
            if (plus >= ENCHANT_MAX) {
                say(state, "더 손댈 곳이 없다.");
                return false;
            }
            // `rng.chance` 는 **확률이 0보다 클 때만** 부른다 — 안 그러면 연구자가
            // 아닌 사람도 이 자리에서 난수를 하나씩 태워, 「시드가 같으면 판도 같다」가
            // 직업에 따라 갈린다.
            const scholarChance = scholarPreserveChance(hero);
            const preserved = scholarChance > 0 && rng.chance(scholarChance);
            if (preserved) {
                say(state, "🔮 비전 전도: 주문서가 소모되지 않고 보존되었다!");
            } else {
                takeFromPack(hero, it);
            }
            const scrKey = `scroll:${it.type}`;
            state.known[scrKey] = true;
            state.itemCodex[scrKey] = true;
            state.itemUsage[scrKey] = (state.itemUsage[scrKey] ?? 0) + 1;
            enchant(state, hero, on, rng, it.type === "blessed enchant" || !!it.blessed);
            return true;
        } else if (it.type === "transmutation") {
            // `rng.chance` 는 **확률이 0보다 클 때만** 부른다 — 안 그러면 연구자가
            // 아닌 사람도 이 자리에서 난수를 하나씩 태워, 「시드가 같으면 판도 같다」가
            // 직업에 따라 갈린다.
            const scholarChance = scholarPreserveChance(hero);
            const preserved = scholarChance > 0 && rng.chance(scholarChance);
            if (preserved) {
                say(state, "🔮 비전 전도: 주문서가 소모되지 않고 보존되었다!");
            } else {
                takeFromPack(hero, it);
            }
            const scrKey = `scroll:${it.type}`;
            state.known[scrKey] = true;
            state.itemCodex[scrKey] = true;
            state.itemUsage[scrKey] = (state.itemUsage[scrKey] ?? 0) + 1;
            transmute(state, on, rng, it.blessed);
            return true;
        }
    }

    const key = `scroll:${it.type}`;
    const scholarChance = scholarPreserveChance(hero);
    const preserved = scholarChance > 0 && rng.chance(scholarChance);
    if (preserved) {
        say(state, "🔮 비전 전도: 주문서가 소모되지 않고 보존되었다!");
    } else {
        takeFromPack(hero, it);
    }
    state.known[key] = true;
    state.itemCodex[key] = true;
    state.itemUsage[key] = (state.itemUsage[key] ?? 0) + 1;

    switch (it.type) {
        case "magic mapping":
            revealAll(level);
            if (it.blessed) {
                for (const t of level.traps) t.found = true;
                hero.detect = Math.max(hero.detect, 30);
                say(state, "✨ 축복의 빛이 미궁의 모든 지도와 숨겨진 함정, 괴물의 기척을 환히 비추었습니다!");
            } else {
                say(state, "이 층의 지도가 머릿속에 그려졌다.");
            }
            break;
        case "teleport": {
            if (it.blessed) {
                const candidates: Pos[] = [];
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const x = level.stairs.x + dx;
                        const y = level.stairs.y + dy;
                        if (inBounds(x, y) && walkable(level.tiles[idx(x, y)] as Tile)) {
                            if (
                                !level.monsters.some((m) => m.x === x && m.y === y) &&
                                !state.heroes.some((h) => h !== hero && h.x === x && h.y === y)
                            ) {
                                candidates.push({ x, y });
                            }
                        }
                    }
                }
                const p = rng.pick(candidates) ?? level.stairs;
                hero.x = p.x;
                hero.y = p.y;
                say(state, "✨ 축복받은 공간 이동의 힘으로 계단 근처의 안전한 장소로 이동했습니다.");
            } else {
                const p = freeSpot(level, rng, [level.stairs, ...state.heroes.filter((h) => h !== hero)]);
                hero.x = p.x;
                hero.y = p.y;
                say(state, "몸이 홱 당겨졌다.");
            }
            break;
        }
        // 강화 주문서(`ENCHANT_SCROLLS` — 축복 포함) 및 재련(`transmutation`)은
        // 위에서 이미 끝났다 — 고를 것을 묻고 굴려야 해서 갈래가 다르다.
        case "identify":
            for (const p of hero.pack) {
                const k = `${p.kind}:${p.type}`;
                state.known[k] = true;
                state.itemCodex[k] = true;
                // 무기·갑옷의 손질 정도는 **물건마다** 드는 값이라 여기서 같이 연다 —
                // 종류만 열면 감정 주문서가 무기·갑옷에는 아무 일도 안 하는 것이 된다.
                p.plusKnown = true;
            }
            if (it.blessed) {
                let doorsOpened = 0;
                for (let i = 0; i < level.tiles.length; i++) {
                    if (level.tiles[i] === T.SECRET) {
                        level.tiles[i] = T.DOOR;
                        doorsOpened++;
                    }
                }
                computeFov(level, state.heroes);
                say(state, `✨ 축복의 혜안으로 배낭의 모든 물건을 감정하고 미궁의 비밀문(${doorsOpened}개)이 모두 드러났습니다!`);
            } else {
                say(state, "배낭 속의 것들이 무엇인지 알겠다.");
            }
            break;
        case "remove curse": {
            const freed = hero.pack.filter((p) => p.cursed);
            for (const p of freed) {
                p.cursed = false;
                p.curseKnown = false;
            }
            if (it.blessed) {
                const wep = equippedWeapon(hero);
                const arm = equippedArmor(hero);
                if (wep) wep.blessed = true;
                if (arm) arm.blessed = true;
                say(state, "✨ 성스러운 축복의 기운이 온몸을 감싸며 착용한 무기와 갑옷이 축복받았습니다!");
            } else {
                say(state, freed.length ? "몸에 붙었던 것이 헐거워졌다." : "누군가 지켜보는 듯하다.");
            }
            break;
        }
        case "aggravate monsters":
            for (const m of level.monsters) m.awake = true;
            say(state, "어디선가 일제히 깨어나는 소리가 났다.");
            break;
        case "sleep":
            if (it.blessed) {
                for (const m of level.monsters) {
                    m.awake = false;
                }
                say(state, "✨ 축복의 자장가가 울려 퍼지며 이 층의 모든 괴물이 깊은 잠에 빠졌습니다!");
            } else {
                hero.asleep += rng.between(4, 9);
                say(state, "눈꺼풀이 감긴다…");
            }
            break;
    }
    return true;
}

function eat(state: GameState, hero: Hero, letter: string, rng: Rng): boolean {
    const it = packItem(hero, letter);
    if (!it || it.kind !== "food") {
        say(state, "먹을 수 있는 것이 아니다.");
        return false;
    }
    takeFromPack(hero, it);
    const key = `food:${it.type}`;
    state.known[key] = true;
    state.itemCodex[key] = true;
    state.itemUsage[key] = (state.itemUsage[key] ?? 0) + 1;
    hero.food = Math.min(2000, Math.max(hero.food, 0) + rng.between(900, 1300));
    say(state, "배가 든든하다.");
    return true;
}

/**
 * 저주는 **쥐거나 입는 순간에** 드러난다.
 *
 * 겉모습으로는 못 가른다. 그래서 바닥의 좋아 보이는 갑옷을 집어 입는 일이 도박이 되고,
 * 그 도박이 없으면 이 게임의 물건은 전부 그냥 이득이다.
 */
function revealCurse(state: GameState, it: Item): boolean {
    if (!it.cursed) return false;
    it.curseKnown = true;
    return true;
}

function wield(state: GameState, hero: Hero, letter: string): boolean {
    const cur = equippedWeapon(hero);
    if (cur && cur.cursed) {
        cur.curseKnown = true;
        say(state, `${describe(cur, state.known, state.appearance)}이(가) 손에서 떨어지지 않는다!`);
        return false;
    }
    const it = packItem(hero, letter);
    if (!it || it.kind !== "weapon") {
        say(state, "쥘 수 있는 것이 아니다.");
        return false;
    }
    hero.weaponId = it.id;
    // **써 봤으니 안다** — 종류가 아니라 이 물건의 손질 정도를 안다(`Item.plusKnown`).
    it.plusKnown = true;
    // **주손을 바꾸면 보조손이 어긋날 수 있다.** 장검을 쥐고 단검을 보조손에 들 수는
    // 없는데, 정리를 안 하면 「짝이 안 맞는 이도류」가 조용히 남는다.
    const off = offHandWeapon(hero);
    if (off && !canOffHand(hero, off)) {
        hero.offWeaponId = null;
        say(state, `${describe(off, state.known, state.appearance)}을(를) 보조손에서 내렸다.`);
    }
    const key = `weapon:${it.type}`;
    state.known[key] = true;
    state.itemCodex[key] = true;
    // **그 물건의 성능**을 적는다 — 내 명중·피해가 아니라. 무엇을 쥐었는지가 바로 보여야
    // 「이게 지금 것보다 나은가」를 그 자리에서 판단할 수 있다.
    say(state, `${describe(it, state.known, state.appearance)}을(를) 쥐었다.${withPower(it, state)}`);
    if (revealCurse(state, it)) say(state, "손에 착 달라붙는다. 저주받았다!");
    return true;
}

/**
 * 보조손에 쥔다 — **이도류.**
 *
 * 쥘 수 있는지는 `canOffHand` **한 자리**가 답한다(화면도 그것만 본다). 같은 글자를
 * 다시 주면 내려놓는다 — 따로 명령을 만들 까닭이 없다.
 */
function offHand(state: GameState, hero: Hero, letter: string): boolean {
    const it = packItem(hero, letter);
    if (!it) {
        say(state, "그런 것이 없다.");
        return false;
    }
    // 이미 보조손에 든 것을 다시 고르면 내려놓는다.
    if (hero.offWeaponId === it.id) {
        if (it.cursed) {
            it.curseKnown = true;
            say(state, `${describe(it, state.known, state.appearance)}이(가) 손에서 떨어지지 않는다!`);
            return false;
        }
        hero.offWeaponId = null;
        say(state, `${describe(it, state.known, state.appearance)}을(를) 보조손에서 내렸다.`);
        return true;
    }
    if (!canOffHand(hero, it)) {
        say(state, "보조손에 쥘 수 있는 것이 아니다.");
        return false;
    }
    hero.offWeaponId = it.id;
    const key = `weapon:${it.type}`;
    state.known[key] = true;
    state.itemCodex[key] = true;
    say(state, `${describe(it, state.known, state.appearance)}을(를) 보조손에 쥐었다.${withPower(it, state)}`);
    if (revealCurse(state, it)) say(state, "손에 착 달라붙는다. 저주받았다!");
    return true;
}

function wear(state: GameState, hero: Hero, letter: string): boolean {
    const cur = equippedArmor(hero);
    if (cur && cur.cursed) {
        cur.curseKnown = true;
        say(state, `${describe(cur, state.known, state.appearance)}이(가) 벗겨지지 않는다!`);
        return false;
    }
    const it = packItem(hero, letter);
    if (!it || it.kind !== "armor") {
        say(state, "입을 수 있는 것이 아니다.");
        return false;
    }
    hero.armorId = it.id;
    it.plusKnown = true;
    const key = `armor:${it.type}`;
    state.known[key] = true;
    state.itemCodex[key] = true;
    say(state, `${describe(it, state.known, state.appearance)}을(를) 입었다.${withPower(it, state)}`);
    if (revealCurse(state, it)) say(state, "몸에 달라붙는다. 저주받았다!");
    return true;
}

/** 반지를 낀다 — 양손에 하나씩. **끼면 배가 더 고프다.** */
function putOn(state: GameState, hero: Hero, letter: string): boolean {
    const it = packItem(hero, letter);
    if (!it || it.kind !== "ring") {
        say(state, "낄 수 있는 것이 아니다.");
        return false;
    }
    if (it.id === hero.leftRingId || it.id === hero.rightRingId) {
        say(state, "이미 끼고 있다.");
        return false;
    }
    const hand = hero.leftRingId === null ? "left" : hero.rightRingId === null ? "right" : null;
    if (!hand) {
        say(state, "양손에 이미 반지를 꼈다. 하나를 빼야 한다.");
        return false;
    }
    if (hand === "left") hero.leftRingId = it.id;
    else hero.rightRingId = it.id;
    const key = `ring:${it.type}`;
    state.known[key] = true;
    state.itemCodex[key] = true;
    say(state, `${describe(it, state.known, state.appearance)}을(를) 꼈다.${withPower(it, state)}`);
    if (revealCurse(state, it)) say(state, "손가락에서 빠지지 않는다. 저주받았다!");
    else if (it.type === "slow digestion") {
        say(state, "배가 늦게 고파진다.");
    } else {
        say(state, `배가 더 빨리 고파진다. (한 걸음에 ${hungerRate(hero)})`);
    }
    return true;
}

function removeRing(state: GameState, hero: Hero, letter: string): boolean {
    const it = packItem(hero, letter);
    if (!it || it.kind !== "ring") return false;
    if (it.id !== hero.leftRingId && it.id !== hero.rightRingId) {
        say(state, "끼고 있지 않다.");
        return false;
    }
    if (it.cursed) {
        it.curseKnown = true;
        say(state, "반지가 손가락에서 빠지지 않는다!");
        return false;
    }
    if (hero.leftRingId === it.id) hero.leftRingId = null;
    else hero.rightRingId = null;
    say(state, `${describe(it, state.known, state.appearance)}을(를) 뺐다.`);
    return true;
}

function drop(state: GameState, hero: Hero, letter: string): boolean {
    const { level } = state;
    const it = packItem(hero, letter);
    if (!it) return false;
    if (it.cursed && isWorn(hero, it)) {
        it.curseKnown = true;
        say(state, "몸에서 떨어지지 않는다!");
        return false;
    }
    if (itemAt(level, hero.x, hero.y)) {
        say(state, "발밑에 이미 뭔가 있다.");
        return false;
    }
    takeFromPack(hero, it, it.count);
    it.x = hero.x;
    it.y = hero.y;
    level.items.push(it);
    say(state, `${describe(it, state.known, state.appearance)}을(를) 내려놓았다.`);
    return true;
}

/**
 * **곁에 선 동료에게 건넨다.**
 *
 * 바닥에 놓고 상대가 줍는 길은 두 턴이 들고, 한 칸에 둘이 못 서므로(`heroMove`) 좁은
 * 복도에서는 그마저 어렵다. 물약 한 병을 나누는 것이 협동의 기본이라 길을 하나 낸다.
 *
 * 규칙은 바닥에 놓는 것(`drop`)과 같은 자리를 지킨다: **저주받아 몸에 붙은 것은 못 준다.**
 * 상대의 배낭이 꽉 찼으면 아무 일도 안 난다 — 그러면 턴도 안 쓴다.
 */
function give(state: GameState, hero: Hero, letter: string): boolean {
    const mate = state.heroes.find((h) => h !== hero && h.hp > 0);
    if (!mate) {
        say(state, "건넬 동료가 없다.");
        return false;
    }
    if (Math.max(Math.abs(mate.x - hero.x), Math.abs(mate.y - hero.y)) > 1) {
        say(state, "동료가 곁에 없다 — 옆 칸에 서야 건넨다.");
        return false;
    }
    const it = packItem(hero, letter);
    if (!it) return false;
    if (it.cursed && isWorn(hero, it)) {
        it.curseKnown = true;
        say(state, "몸에서 떨어지지 않는다!");
        return false;
    }
    takeFromPack(hero, it, it.count);
    if (!addToPack(mate, it)) {
        // 못 받으면 **없던 일로 한다** — 돌려놓지 않으면 물건이 사라진다.
        addToPack(hero, it);
        say(state, "동료의 배낭이 꽉 찼다.");
        return false;
    }
    say(state, `${describe(it, state.known, state.appearance)}을(를) 동료에게 건넸다.`);
    return true;
}

/**
 * 무기나 갑옷을 모루에 녹여 **강화 주문서를 되뽑는다.** 그 물건은 사라진다.
 *
 * ── 왜 이것이 있나 ──────────────────────────────────────────────────
 * 강화는 **못 되돌린다.** 4층에서 주운 장검에 주문서 다섯 장을 부어 `+5` 를 만들고 나면,
 * 16층에서 목마른 자의 검이 떨어져도 그 다섯 장이 낡은 칼에 갇혀 있다. 그러면 **좋은
 * 물건을 줍는 것이 반갑지 않은** 기묘한 자리가 생긴다. 모루가 그 자리를 연다 — 값은
 * 그 물건 자체이고, 되뽑은 주문서로 새것을 올린다.
 *
 * **다 돌아오지는 않는다**(`meltRoll`). 강화 한 칸마다 따로 굴려 `MELT_RETURN` 만큼만
 * 돌아온다 — 다 돌려주면 **옮겨 심기가 공짜**가 되어 「지금 이 칼에 넣을까, 더 좋은 것을
 * 주울 때까지 아낄까」가 결정이 아니게 된다. 쇠붙이 몫 한 장은 반드시 나온다.
 *
 * 나올 것이 없으면(화살 한 대 같은 것) **주문서도 턴도 안 쓴다**(못 박은 규칙 3).
 *
 * **저주받은 것을 쥐거나 입고 있으면 못 녹인다** — 벗지도 못하는 물건을 모루에 올릴 수는
 * 없다. 배낭에 든 것은 녹일 수 있다(몸에 붙은 것이 아니므로).
 *
 * **그 물건을 먼저 빼고 주문서를 넣는다.** 순서가 반대면 배낭이 꽉 찼을 때 자리가 없어
 * 실패하는데, 정작 자리를 비우는 것은 그 물건이다.
 */
function melt(state: GameState, hero: Hero, letter: string, rng: Rng): boolean {
    const { level } = state;
    if (!level.anvil || level.anvil.x !== hero.x || level.anvil.y !== hero.y) {
        say(state, "여기에는 모루가 없다.");
        return false;
    }
    const it = packItem(hero, letter);
    if (!it || (it.kind !== "weapon" && it.kind !== "armor")) {
        say(state, "모루에 올릴 것이 아니다.");
        return false;
    }
    if (it.cursed && isWorn(hero, it)) {
        it.curseKnown = true;
        say(state, "몸에서 떨어지지 않는다!");
        return false;
    }
    const { sure, risky } = meltYield(it);
    if (sure + risky <= 0) {
        say(state, "뽑아낼 것이 없다 — 벼린 쇠가 아니다.");
        return false;
    }

    // **하나만 녹인다.** 표창처럼 겹쳐 쌓인 것도 한 번에 하나다 — 손질은 자루마다 같은
    // 값이므로 뭉텅이째 태우면 같은 주문서가 갑절로 쏟아진다.
    const name = describe(it, state.known, state.appearance);
    const kind = it.kind;
    const got = meltRoll(it, rng);
    takeFromPack(hero, it, 1);
    const type = kind === "armor" ? "enchant armor" : "enchant weapon";
    const label = kind === "armor" ? "갑옷 강화 주문서" : "무기 강화 주문서";
    say(state, `${name}을(를) 모루에 올렸다. 쇳물이 되어 흘러내린다.`);
    // **굴린 것을 적는다.** 확률이 걸린 자리는 기록에 남아야 「왜 두 장뿐인가」에 답이 된다.
    if (risky > 0) {
        say(state, `${DETAIL}되뽑기 강화 ${risky}칸 × ${Math.round(MELT_RETURN * 100)}%  → ${got - sure}칸 회수`);
    }
    if (got <= 0) {
        say(state, `${label}가 한 장도 안 남았다.`);
        return true;
    }
    const made = makeItem("scroll", type, state.nextItemId++, -1, -1, got);
    const inPack = addToPack(hero, made);
    const scrKey = `scroll:${type}`;
    state.known[scrKey] = true;
    state.itemCodex[scrKey] = true;
    say(state, inPack ? `${label} ${got}장을 되뽑았다.` : `배낭이 꽉 차서 ${got}장이 발밑에 떨어졌다.`);
    if (!inPack) {
        made.x = hero.x;
        made.y = hero.y;
        level.items.push(made);
    }
    return true;
}

/**
 * 모루 칸 위에 서 있나 — **캠프에서만 되는 일은 전부 여기를 지난다.**
 *
 * 화면도 같은 값을 읽어 단추를 접지만(`Desk.onAnvil`), 자물쇠는 둘이다 — 눌러도 엔진이
 * 한 번 더 막는다.
 */
function atCamp(state: GameState, hero: Hero): boolean {
    const { anvil } = state.level;
    return !!anvil && anvil.x === hero.x && anvil.y === hero.y;
}

/**
 * 배낭의 물건 하나를 **캠프 상자에 맡긴다.**
 *
 * 이 게임에서 **판을 넘어 남는 넷째 것**이다(앞의 셋은 도감·수법·지난 판). 죽어도 안 비고,
 * 다음 판의 모루에 걸어가면 그대로 있다.
 *
 * ── 지키는 것 ────────────────────────────────────────────────────────────────
 *
 * 1. **캠프에서만.** 아무 데서나 되면 상자가 아니라 배낭 한 칸이 더 생기는 것이다.
 * 2. **증표는 못 맡긴다**(`isStashable`). 맡겨 두고 다음 판에 꺼내면 26층을 안 내려가고
 *    이긴다 — 이기는 조건이 통째로 사라진다.
 * 3. **저주받아 몸에 붙은 것은 못 맡긴다.** 모루에 올리는 것과 같은 규칙이다 — 상자가
 *    저주를 떼는 뒷문이 되면 「못 벗는다」가 저주의 유일한 대가라는 말이 거짓이 된다.
 * 4. **하나만 맡긴다.** 겹쳐 쌓인 것도 한 칸에 하나다 — 뭉텅이째 넣으면 세 칸이라는
 *    상한이 「다트 30개」로 뚫린다.
 * 5. **몸에서 먼저 내린다.** 쥐거나 입거나 낀 것은 `takeFromPack` 이 자리를 비우는데,
 *    보조손(`offWeaponId`)만 그쪽이 안 지운다 — 여기서 같이 지운다.
 */
function stash(state: GameState, hero: Hero, letter: string): boolean {
    if (!atCamp(state, hero)) {
        say(state, "여기에는 캠프가 없다.");
        return false;
    }
    const it = packItem(hero, letter);
    if (!it) return false;
    if (!isStashable(it)) {
        say(state, it.kind === "amulet" ? "증표는 손에서 떨어지지 않는다." : "맡길 것이 아니다.");
        return false;
    }
    if (hero.chest.length >= CHEST_SLOTS) {
        say(state, `상자가 꽉 찼다 — ${CHEST_SLOTS}칸뿐이다.`);
        return false;
    }
    if (it.cursed && isWorn(hero, it)) {
        it.curseKnown = true;
        say(state, "몸에서 떨어지지 않는다!");
        return false;
    }

    const name = describe(it, state.known, state.appearance);
    // **하나만 떼어 낸다.** 겹쳐 쌓인 것에서 하나를 뽑을 때는 상자에 넣을 몫을 따로 빚는다 —
    // 같은 객체를 넣으면 배낭의 남은 개수와 상자의 것이 한 몸이 된다.
    const one =
        it.count > 1
            ? { ...it, id: state.nextItemId++, count: 1 }
            : it;
    takeFromPack(hero, it, 1);
    if (hero.offWeaponId === one.id) hero.offWeaponId = null;
    delete one.letter;
    one.x = -1;
    one.y = -1;
    hero.chest.push(one);
    say(state, `${name}을(를) 상자에 맡겼다. (${hero.chest.length}/${CHEST_SLOTS})`);
    return true;
}

/** 캠프 상자의 칸 하나를 배낭으로 꺼낸다. 배낭이 꽉 찼으면 **상자에 그대로 둔다.** */
function unstash(state: GameState, hero: Hero, slot: number): boolean {
    if (!atCamp(state, hero)) {
        say(state, "여기에는 캠프가 없다.");
        return false;
    }
    const it = hero.chest[slot];
    if (!it) return false;
    const name = describe(it, state.known, state.appearance);
    // **넣을 자리부터 본다.** 먼저 상자에서 빼고 나서 배낭이 꽉 찬 것을 알면 그 물건은
    // 어디에도 없는 것이 된다 — 바닥에 떨구는 갈래를 만드느니 아예 안 꺼낸다.
    if (!addToPack(hero, it)) {
        say(state, "배낭이 꽉 찼다.");
        return false;
    }
    hero.chest.splice(slot, 1);
    say(state, `${name}을(를) 상자에서 꺼냈다.`);
    return true;
}

/**
 * 3레벨마다 쌓이는 성장 하나를 고른다 — 힘 · 방어력 · 지혜 중 하나.
 *
 * **턴을 안 쓴다**(`acted=false` 로 돌아간다) — 레벨업 자체가 이미 턴을 안 쓰는
 * 자리다(경험치는 몬스터를 잡을 때 는다, 판을 걷는 것과는 다른 시계). 캠프도 필요
 * 없다 — 어디서든, 언제든 쌓인 것을 쓸 수 있다.
 *
 * **힘은 물약(`quaff` 의 `"strength"`)과 같은 식**이다(상한 31 · `maxStr` 을 따라 올림) —
 * 두 길이 갈리면 「힘 31 을 넘겼다」가 한쪽에서만 막힌다.
 */
function pickSkill(state: GameState, hero: Hero, option: "str" | "def" | "luck"): boolean {
    if (hero.pendingSkillPicks <= 0) {
        say(state, "지금은 고를 수 있는 성장이 없다.");
        return false;
    }
    hero.pendingSkillPicks -= 1;
    switch (option) {
        case "str":
            hero.str = Math.min(31, hero.str + 1);
            hero.maxStr = Math.max(hero.maxStr, hero.str);
            say(state, "🔺 성장 — 힘이 늘었다.");
            break;
        case "def":
            hero.bonusDefense += 1;
            say(state, "🛡️ 성장 — 몸놀림이 단단해졌다.");
            break;
        case "luck":
            hero.itemLuck = Math.min(1, hero.itemLuck + 0.01);
            say(state, "🔺 성장 — 지혜가 늘었다.");
            break;
    }
    return false;
}

/**
 * 전직 기술 — 새 자원이나 쿨다운 시계를 만들지 않고 **층마다 한 번**만 쓴다.
 * 실제로 효과가 생긴 뒤에만 사용한 층을 적고 턴을 쓴다.
 */
function useClassSkill(state: GameState, hero: Hero, ingredients?: [string, string]): boolean {
    if (hero.level < ADVANCE_LEVEL) {
        say(state, `레벨 ${ADVANCE_LEVEL}에 전직해야 쓸 수 있다.`);
        return false;
    }
    if (hero.classSkillDepth === state.level.depth) {
        say(state, "이 층에서는 이미 전직 기술을 썼다.");
        return false;
    }

    switch (hero.origin ?? "knight") {
        case "knight": {
            say(state, "불굴의 방벽은 체력이 절반 이하일 때 저절로 발동한다.");
            return false;
        }
        case "rogue": {
            const seen = state.level.monsters.filter(
                (m) => isVisible(state.level, m.x, m.y) && !m.champion,
            );
            if (seen.length === 0) {
                say(state, "연막에 숨길 평범한 괴물이 보이지 않는다.");
                return false;
            }
            for (const m of seen) {
                m.awake = false;
                // 이 기술을 쓰는 턴에 곧바로 다시 보고 깨어나면 아무 효과도 없다.
                m.frozenTurns = Math.max(m.frozenTurns ?? 0, 1);
                delete m.target;
            }
            say(state, `🌑 연막 — 보이는 괴물 ${seen.length}마리가 나를 놓쳤다.`);
            break;
        }
        case "alchemist": {
            if (!ingredients) {
                say(state, "축복의 기름을 만들 포션 두 개를 골라야 한다.");
                return false;
            }
            const first = packItem(hero, ingredients[0]);
            const second = packItem(hero, ingredients[1]);
            if (!first || !second || first.kind !== "potion" || second.kind !== "potion" || first.type === "blessing" || second.type === "blessing" || (first === second && first.count < 2)) {
                say(state, "일반 포션 두 개가 필요하다.");
                return false;
            }
            if (hero.pack.length >= 26 && first.count === 1 && second.count === 1) {
                say(state, "배낭이 꽉 찼다.");
                return false;
            }
            takeFromPack(hero, first);
            takeFromPack(hero, second);
            const blessing = makeItem("potion", "blessing", state.nextItemId++, -1, -1);
            if (!addToPack(hero, blessing)) {
                // 위의 자리 검사 뒤에는 닿지 않는 방어막이다.
                say(state, "배낭이 꽉 찼다.");
                return false;
            }
            state.known["potion:blessing"] = true;
            state.itemCodex["potion:blessing"] = true;
            say(state, "⚗️ 포션 두 병에서 정수를 뽑아 축복의 기름을 만들었다.");
            break;
        }
        case "scholar":
            revealAll(state.level);
            hero.detect = Math.max(hero.detect, 12);
            say(state, "✦ 비전 통찰 — 층의 지형을 밝히고 괴물의 기척을 읽었다.");
            break;
    }
    hero.classSkillDepth = state.level.depth;
    return true;
}

/**
 * 겨눈 방향으로 한 칸씩 나아가며 처음 걸리는 것을 찾는다.
 *
 * 지팡이도 던진 물건도 같은 길을 쓴다 — 길이 둘이면 「벽을 뚫고 맞았다」 같은 일이
 * 한쪽에만 생긴다.
 */
function ray(
    level: Level,
    from: Pos,
    dx: number,
    dy: number,
    range: number,
): { x: number; y: number; monster?: Monster; cells: { x: number; y: number }[] } {
    let x = from.x;
    let y = from.y;
    const cells: { x: number; y: number }[] = [];
    for (let i = 0; i < range; i++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny) || !walkable(tileAt(level, nx, ny))) break;
        x = nx;
        y = ny;
        cells.push({ x, y });
        const m = monsterAt(level, x, y);
        if (m) return { x, y, monster: m, cells };
    }
    return { x, y, cells };
}

/** 기록 줄에 적을 그 사람의 이름 — 지은 이름이 있으면 그것, 없으면 `1P`·`2P`. */
function heroLabel(state: GameState, hero: Hero): string {
    return hero.nick ?? `${state.heroes.indexOf(hero) + 1}P`;
}

/**
 * 경험치를 **나눠 갖는 사람들**과 각자의 몫.
 *
 * ── 누가 받나 ────────────────────────────────────────────────────────
 * **잡은 사람**과, 그 자리를 **알아보고 서 있는 동료**다. 「같은 방인가」를 따로 세지
 * 않고 `monsterSees` 를 그대로 쓴다 — 그 함수가 이미 같은 질문에 답한다(같은 방이면
 * 참, 어두운 방이면 두 칸 안, 방 밖이면 바로 곁). 자를 두 벌 두면 어느 날 한쪽만 고쳐진다.
 *
 * 쓰러진 사람은 못 받는다. 누워 있는 동안 공짜로 크면 「살아서 층을 넘어야 일어난다」가
 * 무게를 잃는다.
 *
 * ── 얼마씩 ──────────────────────────────────────────────────────────
 * **총량은 안 늘어난다.** 같은 방에 둘이 서 있다고 판이 두 배로 후해지면, 동료를 부르는
 * 것이 곧 경험치 두 배가 된다. 나누어떨어지지 않는 나머지는 **잡은 사람**이 갖는다 —
 * 마지막 일격의 몫이고, 이렇게 해야 합이 정확히 맞는다.
 *
 * 혼자면 나눌 사람이 저뿐이라 몫이 통째로 간다 — 단독 플레이는 한 글자도 안 바뀐다.
 */
function expShares(state: GameState, m: Monster, by: Hero, total: number): [Hero, number][] {
    const shared = state.heroes.filter(
        (h) => h === by || (h.hp > 0 && monsterSees(state.level, m.x, m.y, h)),
    );
    const each = Math.floor(total / shared.length);
    const rest = total - each * shared.length;
    return shared.map((h) => [h, each + (h === by ? rest : 0)]);
}

/**
 * 쓰러뜨린 자리 — **손으로 때리든 지팡이로 쏘든 던져서 맞히든 전부 여기를 지난다.**
 *
 * 예전에는 손으로 때린 것만 따로 세고 있었다. 그 상태로 도감을 붙이면 「지팡이로만
 * 잡아 본 종은 영영 모른다」가 되는데, 그건 규칙이 아니라 빠뜨린 자리다.
 */
function killMonster(state: GameState, m: Monster, rng: Rng, by: Hero) {
    state.level.monsters = state.level.monsters.filter((o) => o.id !== m.id);
    state.bestiary[m.def.ch] = (state.bestiary[m.def.ch] ?? 0) + 1;
    // 무기 처치 수 누적 (도감 통달) — **잡은 사람이 쥔 칼**이다.
    if (by.weaponId) {
        const wep = by.pack.find((p) => p.id === by.weaponId);
        if (wep) {
            const k = `weapon:${wep.type}`;
            state.itemUsage[k] = (state.itemUsage[k] ?? 0) + 1;
        }
    }
    const expMultiplier = (m.champion ? 2 : 1) * (state.level.mutator === "frenzy" ? 2 : 1);
    const expGained = m.def.exp * expMultiplier;
    for (const [h, got] of expShares(state, m, by, expGained)) {
        const before = h.pendingSkillPicks;
        const levels = gainExp(h, got, rng);
        // 둘이면 **누가 올랐는지**를 적는다 — 한 줄만 뜨면 제 레벨이 오른 줄 안다.
        const tag = state.heroes.length > 1 ? `${heroLabel(state, h)} ` : "";
        for (const l of levels) {
            say(state, `${tag}레벨 ${l} 이 되었다.`);
            // **전직은 그 레벨에서 한 번만** 말한다 — 여러 레벨을 한꺼번에 건너뛰어도
            // `l === ADVANCE_LEVEL` 은 그 판에 정확히 한 번만 참이다.
            if (l === ADVANCE_LEVEL) {
                const def = ORIGINS[h.origin ?? "knight"];
                say(state, `🎖️ ${tag}${def.advancedName}(${def.advancedTitle})로 전직했다!`);
            }
        }
        if (levels.length > 0) for (const skill of enhanceWeaponSkills(h)) say(state, `⚔ ${tag}${skill}에 도달했다.`);
        // **쌓인 만큼만** 알린다 — 고르는 화면을 찾는 줄은 화면(★ 단추) 몫이라 여기서는
        // 「생겼다」만 짚는다.
        if (h.pendingSkillPicks > before) {
            say(state, `${tag}★ 성장을 고를 수 있다.`);
        }
    }

    // 챔피언 처치 시 100% 확정 전리품 드랍
    if (m.champion) {
        const dropped = dropChampionLoot(state, m, rng);
        state.level.items.push(...dropped);
        say(state, `${monsterName(m)}을(를) 쓰러뜨려 희귀 전리품이 바닥에 떨어졌습니다!`);
    }
    if (m.altarGuardian) {
        const gem = makeItem("gem", rng.pick(GEMS) ?? "ruby", state.nextItemId++, m.x, m.y);
        state.level.items.push(gem);
        say(state, "제단 수호자가 보석을 남겼다.");
    }

    // 미다스의 건틀릿 소지 시 추가 금화 생성 — **잡은 사람이 낀 것**이다.
    if (hasRelic(by, "midas_gauntlet")) {
        const midasGold = m.def.level * 15 + rng.between(10, 30);
        state.level.items.push(makeItem("gold", "gold", state.nextItemId++, m.x, m.y, midasGold));
        say(state, `미다스의 건틀릿이 몬스터의 유골을 황금(${midasGold}G)으로 바꾸었습니다!`);
    }

    if (state.bestiary[m.def.ch] === 1) {
        say(state, `${m.def.name}을(를) 처음 잡았다 — 이제 조사하면 속을 안다.`);
    }
}

/** 지팡이를 쏜다. 남은 횟수가 없으면 아무 일도 안 난다 — 그것도 정보다. */
function zap(state: GameState, hero: Hero, letter: string, dx: number, dy: number, rng: Rng): boolean {
    const { level } = state;
    const it = packItem(hero, letter);
    if (!it || it.kind !== "wand") {
        say(state, "쏠 수 있는 것이 아니다.");
        return false;
    }
    if (dx === 0 && dy === 0) {
        say(state, "어디를 겨눌지 정해야 한다.");
        return false;
    }
    const wandKey = `wand:${it.type}`;
    // ── 빈 지팡이 — **처음 한 번만** 턴을 쓴다
    //
    // 정체를 모르는 지팡이는 빈 것도 겨눠 봐야 안다. 그 한 번은 「아무 반응이 없다」는
    // **것을 알아낸** 것이므로 값이 있고, 턴을 쓴다.
    //
    // 이미 아는 지팡이를 또 쏘는 것은 **정말로 아무 일도 안 일어난다** — 그런데도 턴을
    // 쓰면 배가 고파진다. 벽을 들이받는 것과 같은 자리다(못 박은 규칙 셋째). 사용 횟수도
    // 같이 멈춘다 — 안 그러면 다 쓴 지팡이를 허공에 난사해서 도감의 숫자를 올릴 수 있다.
    if ((it.charges ?? 0) <= 0) {
        say(state, "지팡이가 아무 반응도 없다.");
        if (state.known[wandKey]) return false;
        state.itemUsage[wandKey] = (state.itemUsage[wandKey] ?? 0) + 1;
        state.known[wandKey] = true;
        state.itemCodex[wandKey] = true;
        return true;
    }
    state.itemUsage[wandKey] = (state.itemUsage[wandKey] ?? 0) + 1;
    it.charges = (it.charges ?? 0) - 1;

    const def = WANDS[it.type];
    const name = () => describe(it, state.known, state.appearance);

    // ── 굴착의 지팡이 (digging) : 최대 4칸 벽을 부수고 관통 파편 피해(2d6)를 줌 ──
    if (it.type === "digging") {
        let dug = 0;
        for (let step = 1; step <= 4; step++) {
            const nx = hero.x + dx * step;
            const ny = hero.y + dy * step;
            if (nx <= 0 || nx >= MAP_W - 1 || ny <= 0 || ny >= MAP_H - 1) break;
            const i = idx(nx, ny);
            const tile = level.tiles[i] as Tile;
            if (!walkable(tile)) {
                level.tiles[i] = T.CORRIDOR;
                dug++;
            }
            const m = monsterAt(level, nx, ny);
            if (m) {
                const dmg = rng.rollDice("2d6");
                pullAggro(state, m, hero);
                m.hp -= dmg;
                m.awake = true;
                say(state, withDamage(`${m.def.name}이(가) 무너지는 파편에 맞았다.`, dmg));
                if (m.hp <= 0) {
                    say(state, `${m.def.name}을(를) 쓰러뜨렸다.`);
                    killMonster(state, m, rng, hero);
                }
            }
        }
        computeFov(level, state.heroes);
        state.known[wandKey] = true;
        state.itemCodex[wandKey] = true;
        if (dug > 0) {
            say(state, `지팡이 끝에서 굉음이 일며 벽이 부서지고 새로운 길이 뚫렸다! (${dug}칸)`);
        } else {
            say(state, "지팡이 끝에서 강력한 파쇄 광선이 뻗어 나갔다.");
        }
        return true;
    }

    const hit = ray(level, hero, dx, dy, 12);

    // ── 위치 교환의 지팡이 (swapping) ───────────────────────────────────────────
    if (it.type === "swapping") {
        if (!hit.monster) {
            say(state, `${name()}에서 은빛 광선이 허공을 갈랐으나 아무도 맞지 않았다.`);
            return true;
        }
        const m = hit.monster;
        const hx = hero.x;
        const hy = hero.y;
        hero.x = m.x;
        hero.y = m.y;
        m.x = hx;
        m.y = hy;
        m.awake = true;
        computeFov(level, state.heroes);
        state.known[wandKey] = true;
        state.itemCodex[wandKey] = true;
        say(state, `공간이 뒤틀리며 ${m.def.name}와(과) 위치가 바뀌었다!`);
        return true;
    }

    // ── 돌풍의 지팡이 (gust) : 3칸 넉백 및 벽 충돌 시 3d4 피해 + 둔화 ────────────
    if (it.type === "gust") {
        if (!hit.monster) {
            say(state, `${name()}에서 거센 돌풍이 뿜어져 나왔으나 허공을 갈랐다.`);
            return true;
        }
        const m = hit.monster;
        let pushed = 0;
        let collided = false;
        for (let step = 1; step <= 3; step++) {
            const nx = m.x + dx;
            const ny = m.y + dy;
            if (!inBounds(nx, ny) || !walkable(tileAt(level, nx, ny)) || monsterAt(level, nx, ny)) {
                collided = true;
                break;
            }
            m.x = nx;
            m.y = ny;
            pushed++;
        }
        m.awake = true;
        state.known[wandKey] = true;
        state.itemCodex[wandKey] = true;
        if (collided) {
            const dmg = rng.rollDice("3d4");
            pullAggro(state, m, hero);
            m.hp -= dmg;
            m.speed = -1;
            say(state, withDamage(`돌풍에 밀려난 ${m.def.name}이(가) 벽에 강하게 충돌했다! (기절)`, dmg));
            if (m.hp <= 0) {
                say(state, `${m.def.name}을(를) 쓰러뜨렸다.`);
                killMonster(state, m, rng, hero);
            }
        } else {
            say(state, `돌풍이 ${m.def.name}을(를) 뒤로 세차게 밀쳐냈다! (${pushed}칸)`);
        }
        return true;
    }

    if (!hit.monster) {
        if (def?.damage) {
            const ch = it.type === "magic missile" ? "*" : boltGlyph(dx, dy);
            state.projectile = { id: `${state.turn}:${hero.x},${hero.y}:${state.messages.length}`, cells: hit.cells.map((cell) => ({ ...cell, ch })) };
        }
        say(state, `${name()}에서 무언가 뻗어 나가 사라졌다.`);
        return true;
    }
    state.known[wandKey] = true;
    state.itemCodex[wandKey] = true;
    const m = hit.monster;

    if (def?.damage) {
        // 원작처럼 마법 화살은 `*`, 세 원소 지팡이는 방향에 맞춘 광선 문자로 날아간다.
        const ch = it.type === "magic missile" ? "*" : boltGlyph(dx, dy);
        state.projectile = { id: `${state.turn}:${hero.x},${hero.y}:${state.messages.length}`, cells: hit.cells.map((cell) => ({ ...cell, ch })) };
        const dmg = rng.rollDice(def.damage);
        pullAggro(state, m, hero);
        m.hp -= dmg;
        m.awake = true;
        say(state, withDamage(`${m.def.name}이(가) ${def.name}에 맞았다.`, dmg));
        if (m.hp <= 0) {
            say(state, `${m.def.name}을(를) 쓰러뜨렸다.`);
            killMonster(state, m, rng, hero);
        }
        return true;
    }

    switch (it.type) {
        case "slow monster":
            m.speed = -1;
            say(state, `${m.def.name}의 움직임이 느려졌다.`);
            break;
        case "haste monster":
            m.speed = 1;
            m.awake = true;
            say(state, `${m.def.name}이(가) 빨라졌다!`);
            break;
        case "teleport away": {
            const p = freeSpot(level, rng, state.heroes);
            m.x = p.x;
            m.y = p.y;
            say(state, `${m.def.name}이(가) 사라졌다.`);
            break;
        }
        case "cancel":
            m.cancelled = true;
            say(state, `${m.def.name}에게서 기운이 빠졌다.`);
            break;
    }
    return true;
}

/** 던지기 — 멀리서 때리는 유일한 길이다. */
function throwItem(state: GameState, hero: Hero, letter: string, dx: number, dy: number, rng: Rng, volley = true): boolean {
    const { level } = state;
    const it = packItem(hero, letter);
    if (!it) return false;
    if (!isThrowable(it) || (needsBow(it) && equippedWeapon(hero)?.type !== "short bow")) {
        if (needsBow(it) && equippedWeapon(hero)?.type !== "short bow") {
            say(state, "활을 쥐어야 화살을 쏠 수 있다.");
            return false;
        }
        say(state, "던질 만한 것이 아니다.");
        return false;
    }
    if (it.cursed && isWorn(hero, it)) {
        it.curseKnown = true;
        say(state, "몸에서 떨어지지 않는다!");
        return false;
    }
    if (dx === 0 && dy === 0) {
        say(state, "어디를 겨눌지 정해야 한다.");
        return false;
    }

    // NetHack Rogue는 단검을 던질 때 +1 multishot을 얻는다. 이 게임의 던지기는 한 번에
    // 한 글자 묶음에서 하나씩 빼므로, 두 번째 단검도 같은 조준선으로 즉시 보낸다.
    if (volley && hero.origin === "rogue" && it.type === "dagger" && it.count > 1) {
        say(state, "🗡️ 도적의 단검 2연사!");
        throwItem(state, hero, letter, dx, dy, rng, false);
        if (packItem(hero, letter)) throwItem(state, hero, letter, dx, dy, rng, false);
        return true;
    }

    // **하나만 던진다.** 남은 개수를 따로 적어 준다 — 안 적으면 줄었는지 알 수 없다.
    const name = describe(it, state.known, state.appearance);
    takeFromPack(hero, it, 1);
    const left = hero.pack.find((p) => p.id === it.id)?.count ?? 0;
    const rest = left > 0 ? ` (${left}개 남음)` : "";
    const hit = ray(level, hero, dx, dy, 8);
    // 원작은 던진 물건의 문자 자체를 한 칸씩 옮겼다. 착탄 뒤의 물건 처리와는 분리해
    // 경로만 남겨, 화면이 지나간 자리에 있던 지형을 그대로 되돌려 그릴 수 있게 한다.
    const ch = itemChar(it.kind);
    state.projectile = { id: `${state.turn}:${hero.x},${hero.y}:${state.messages.length}`, cells: hit.cells.map((cell) => ({ ...cell, ch })) };

    // 물약은 깨진다. 무기는 떨어진 자리에 남는다 — 주우러 갈 수 있어야 한다.
    const land = (): void => {
        if (it.kind === "potion") return;
        const here = itemAt(level, hit.x, hit.y);
        // 같은 것이 이미 떨어져 있으면 겹쳐 쌓는다. 예전에는 그냥 사라졌다 —
        // 다트를 한 자리에 열 번 던지면 아홉 개가 없어졌다.
        //
        // **다른 것이 떨어져 있어도 사라지면 안 된다.** 그 자리에 나란히 둔다 —
        // `itemAt` 은 하나만 보여 주지만 `pickUp` 이 집은 것을 지우므로 다음 것이
        // 그때 드러난다. 한 칸에 물건이 둘이면 두 번 주우면 된다.
        if (
            here &&
            here.kind === it.kind &&
            here.type === it.type &&
            (it.kind !== "weapon" ||
                ((here.plusHit ?? 0) === (it.plusHit ?? 0) &&
                    (here.plusDam ?? 0) === (it.plusDam ?? 0) &&
                    here.blessed === it.blessed &&
                    here.cursed === it.cursed &&
                    here.socketGem === it.socketGem))
        ) {
            here.count += 1;
            here.plusKnown = !!here.plusKnown || !!it.plusKnown;
            here.curseKnown = !!here.curseKnown || !!it.curseKnown;
            return;
        }
        const dropped = makeItem(it.kind, it.type, state.nextItemId++, hit.x, hit.y, 1);
        dropped.plusHit = it.plusHit;
        dropped.plusDam = it.plusDam;
        dropped.plusKnown = it.plusKnown;
        dropped.blessed = it.blessed;
        dropped.cursed = it.cursed;
        dropped.curseKnown = it.curseKnown;
        dropped.socketGem = it.socketGem;
        level.items.push(dropped);
    };

    if (!hit.monster) {
        say(state, `${name}을(를) 던졌다.${rest}`);
        land();
        return true;
    }

    const m = hit.monster;
    m.awake = true;
    if (it.kind === "potion") {
        const potKey = `potion:${it.type}`;
        state.known[potKey] = true;
        state.itemCodex[potKey] = true;
        state.itemUsage[potKey] = (state.itemUsage[potKey] ?? 0) + 1;
        say(state, `포션이 ${m.def.name}에게 깨졌다.${rest}`);
        if (it.type === "confusion") {
            m.speed = -1;
            say(state, `${m.def.name}이(가) 비틀거린다.`);
        }
        return true;
    }

    // 던진 것도 D&D 의 공격 굴림을 거친다. 손에 쥔 것보다 보정이 적다 — **힘이 안 붙는다.**
    const hitTerms: Term[] = [
        { n: proficiency(hero.level), why: "숙련" },
        ...weaponSkillTerms(hero, it).slice(0, 1),
        ...(hero.origin === "rogue" && it.type === "dagger" ? [{ n: 1, why: "도적 단검" }] : []),
        { n: it.plusHit ?? 0, why: "손질" },
    ];
    const seen = seenBefore(state, m);
    const dodge: Term[] = [{ n: monsterDodgeBonus(m), why: "숙련" }];
    const a = opposedRoll(hitTerms.reduce((t, b) => t + b.n, 0), dodge[0].n, rng);
    say(
        state,
        attackLine("나(던짐)", a, hitTerms, { who: m.def.name, bonus: dodge, show: seen }, outcomeOf(a)),
    );
    if (!a.hit) {
        say(state, `${name}이(가) ${m.def.name}을(를) 비껴갔다.${rest}`);
        land();
        return true;
    }
    const dice = weaponDamageOf(it);
    const damTerms: Term[] = [...weaponSkillTerms(hero, it).slice(1).filter((term) => term.n !== 0), { n: it.plusDam ?? 0, why: "손질" }];
    const d = damageRoll(dice, damTerms.reduce((sum, term) => sum + term.n, 0), a.crit, rng);
    // 던진 것도 갑옷에 깎인다 — 손에 쥔 것과 다를 까닭이 없다.
    const guard = monsterDefense(m);
    const got = pierce(d.total, guard);
    pullAggro(state, m, hero);
    m.hp -= got;
    const advanced = trainWeaponSkill(hero, it, d.rolled.reduce((sum, roll) => sum + roll, 0) > 1);
    if (advanced) say(state, `⚔ ${advanced}에 도달했다.`);
    say(state, seen ? damageLine(dice, d.rolled, damTerms, d.total, guard, got) : damageLine(null, [], [], 0, 0, got));
    // 남은 개수보다 피해가 먼저다 — 둘 다 붙으면 「(5개 남음) 피해 3」 순서가 어색하다.
    say(
        state,
        `${withDamage(
            got === 0
                ? `${name}이(가) ${m.def.name}의 갑옷에 튕겼다.`
                : `${name}이(가) ${m.def.name}에게 맞았다.`,
            got,
        )}${rest}`,
    );
    m.awake = true;
    if (m.hp <= 0) {
        say(state, `${m.def.name}을(를) 쓰러뜨렸다.`);
        killMonster(state, m, rng, hero);
    }
    land();
    return true;
}

/**
 * 벽을 뒤진다 — 비밀문과 함정이 여기서 드러난다.
 *
 * 한 번에 찾을 확률은 낮다(탐색 반지가 크게 올린다). 여러 번 뒤져야 하므로
 * **시간과 식량을 쓴다** — 그것이 비밀문의 값이다.
 */
function search(state: GameState, hero: Hero, rng: Rng): boolean {
    const { level } = state;
    const chance = searchChance(hero);
    let found = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const x = hero.x + dx;
            const y = hero.y + dy;
            if (!inBounds(x, y)) continue;
            if (tileAt(level, x, y) === T.SECRET && rng.chance(chance)) {
                level.tiles[idx(x, y)] = T.DOOR;
                level.flags[idx(x, y)] |= 1;
                found++;
                say(state, "숨은 문을 찾았다!");
            }
            const trap = level.traps.find((t) => t.x === x && t.y === y && !t.found);
            if (trap && rng.chance(chance)) {
                trap.found = true;
                found++;
                say(state, `${TRAP_NAME[trap.kind]}을(를) 찾았다.`);
            }
        }
    }
    if (found === 0) say(state, "아무것도 못 찾았다.");
    return true;
}

const TRAP_NAME: Record<Trap["kind"], string> = {
    trapdoor: "함정문",
    arrow: "화살 덫",
    sleep: "잠 가스",
    beartrap: "곰덫",
    teleport: "순간이동 덫",
    dart: "다트 덫",
};

/** 도적의 함정 회피 확률 — 전직(`ADVANCE_LEVEL`)하면 `origins.ADVANCED_TRAP_EVADE` 로 깊어진다. */
export function rogueTrapEvade(hero: Hero): number {
    if (hero.origin !== "rogue") return 0;
    return hero.level >= ADVANCE_LEVEL ? ADVANCED_TRAP_EVADE : 0.5;
}

/** 함정을 밟았다. **찾아 둔 함정도 밟으면 터진다** — 아는 것과 피하는 것은 다르다. */
function springTrap(state: GameState, hero: Hero, trap: Trap, rng: Rng) {
    const { level } = state;
    trap.found = true;
    const evade = rogueTrapEvade(hero);
    if (evade > 0 && rng.chance(evade)) {
        say(state, "🗡️ 기습 본능: 재빠른 몸놀림으로 함정을 회피했다!");
        return;
    }
    switch (trap.kind) {
        case "trapdoor":
            say(state, "바닥이 꺼졌다!");
            // 떨어진 것이라 계단 위가 아니다 — 아무 데나 처박힌다.
            enterLevel(state, level.depth + 1, rng, "fall");
            say(state, `지하 ${state.level.depth}층.`);
            break;
        case "arrow": {
            const dmg = rng.roll(1, 6);
            hero.hp -= dmg;
            say(state, withDamage("어디선가 화살이 날아왔다!", dmg));
            break;
        }
        case "sleep":
            hero.asleep += rng.between(3, 6);
            say(state, "가스가 뿜어져 나온다. 정신이 아득하다…");
            break;
        case "beartrap":
            hero.stuck += rng.between(2, 5);
            say(state, "곰덫이 발목을 물었다!");
            break;
        case "teleport": {
            const p = freeSpot(level, rng, [level.stairs, ...state.heroes.filter((h) => h !== hero)]);
            hero.x = p.x;
            hero.y = p.y;
            say(state, "몸이 홱 당겨졌다.");
            break;
        }
        case "dart": {
            const dmg = rng.roll(1, 4);
            hero.hp -= dmg;
            if (hasRing(hero, "sustain strength")) {
                say(state, withDamage("다트에 찔렸다. 힘은 그대로다.", dmg));
            } else {
                hero.str = Math.max(3, hero.str - 1);
                say(state, withDamage("독 다트에 찔렸다. 힘이 빠졌다.", dmg));
            }
            break;
        }
    }
}

function descend(state: GameState, hero: Hero, rng: Rng): boolean {
    const { level } = state;
    if (tileAt(level, hero.x, hero.y) !== T.STAIRS) {
        say(state, "여기에는 내려가는 계단이 없다.");
        return false;
    }
    enterLevel(state, level.depth + 1, rng, "above");
    say(state, `지하 ${state.level.depth}층.`);
    return true;
}

/**
 * 위로 간다.
 *
 * **막히는 자리는 밖으로 나가는 문 하나뿐이다.** 1층의 계단은 곧 끝이라 증표가
 * 있어야 오르지만, 그 아래에서는 언제든 물러설 수 있다. 물러설 길이 없으면 「도망」이
 * 선택지에서 빠지고, 그러면 깊이를 고르는 일이 결정이 아니라 그냥 내려가기가 된다.
 *
 * **올라간 층은 떠난 그대로다.** 밝혀 둔 지도도, 두고 온 물건도, 잡다 만 놈도 그 자리에
 * 있다(`state.levels`). 그래서 물러서기가 「없던 일로 하기」가 아니라 **두고 온 것을
 * 가지러 가기**가 된다. 점수는 `deepest` 로 재므로 물러선다고 깎이지 않는다.
 *
 * 대신 층을 다시 굴려 뽑는 짓도 못 한다 — 맘에 안 드는 층은 그대로 거기 있다.
 */
function ascend(state: GameState, hero: Hero, rng: Rng): boolean {
    const { level } = state;
    const up = level.upStairs;
    if (!up || up.x !== hero.x || up.y !== hero.y) {
        say(state, "여기에는 올라가는 계단이 없다.");
        return false;
    }
    if (level.depth === 1) {
        if (!hero.hasAmulet) {
            say(state, "보이지 않는 힘이 앞을 막는다. 증표 없이는 나갈 수 없다.");
            return false;
        }
        state.phase = "won";
        state.epitaph = `옌더의 증표를 들고 지상으로 나왔다. 금화 ${hero.gold}.`;
        revealAll(level);
        say(state, "햇빛이다. 살아 돌아왔다.");
        return true;
    }
    enterLevel(state, level.depth - 1, rng, "below");
    say(state, `지하 ${state.level.depth}층.`);
    return true;
}

/** 굶어 죽는 선. */
const STARVE_AT = -200;
/**
 * 층을 넘어 일어난 사람의 배.
 *
 * **죽음선 위 딱 한 칸**이다(`hungerOf` 로는 여전히 `Faint`). 0 으로 두면 `food <= 0` 의
 * 정신 잃기가 곧바로 돌고, 넉넉히 채우면 굶어 쓰러지는 것이 **공짜 식사**가 된다.
 */
const REVIVE_FOOD = 1;

/** 배고픔 시계. 넘어서는 순간에만 말한다 — 매 턴 말하면 그 말이 안 읽힌다. */
function tickHunger(state: GameState, hero: Hero, rng: Rng) {
    const before = hungerOf(hero);
    hero.food -= hungerRate(hero);
    const after = hungerOf(hero);
    if (after !== before && after) {
        const msg =
            after === "Hungry"
                ? "시장해지기 시작했다 (Hungry)."
                : after === "Weak"
                    ? "허기져서 힘이 빠진다 (Weak)."
                    : "배가 너무 고파 쓰러질 것 같다 (Faint).";
        say(state, msg);
    }
    if (hero.food <= 0 && rng.chance(0.2)) {
        hero.asleep += 1;
        say(state, "배가 고파 정신이 아득하다.");
    }
    if (hero.food <= STARVE_AT) {
        hero.hp = 0;
        state.epitaph = "굶어 죽었다.";
    }
}

/** 저주를 견뎌 내는 데 드는 걸음 수. 식량 한 덩이가 1300 걸음쯤이니 **한 끼 몫**이다. */
const CURSE_BOND = 400;

/**
 * **오래 견디면 저주가 풀린다.**
 *
 * 저주받은 것을 떼는 길이 여태 둘뿐이었다 — 저주 해제 주문서, 그리고 강화하다 부서뜨리기.
 * 둘 다 **손에 다른 물건이 있어야** 하는 길이라, 초반에 저주받은 것을 쥐면 그 판이
 * 통째로 끌려다니는 판이 된다. 그래서 **시간을 세 번째 길**로 둔다: 벗을 수 없다는 대가를
 * 이미 치르고 있으니, 치른 만큼이 값이 되는 것이 맞다.
 *
 * **무기는 풀리면서 한 칸 벼려진다**(축복까지). 갑옷·반지는 풀리기만 한다 — 무기는
 * 저주받은 채 계속 휘두르는 것이 곧 견디는 일이라, 견딤이 제일 비싼 자리다.
 *
 * 세는 것은 **몸에 붙어 있는 동안**뿐이다(`isWorn`). 배낭에 넣어 둔 저주받은 것은
 * 아무 값도 안 치르므로 저절로 풀리면 안 된다.
 */
function bearCurse(state: GameState, hero: Hero) {
    for (const it of hero.pack) {
        if (!it.cursed || !isWorn(hero, it)) continue;
        it.bond = (it.bond ?? 0) + 1;
        if (it.bond < CURSE_BOND) continue;
        it.cursed = false;
        it.curseKnown = false;
        it.bond = 0;
        if (it.kind !== "weapon") {
            say(state, `${describe(it, state.known, state.appearance)}에 걸린 저주가 삭아 떨어졌다.`);
            continue;
        }
        // 수치를 놓는 자리는 `setEnchant` 하나다 — 무기는 명중과 피해 **둘 다**여서
        // 여기서 직접 더하면 한쪽만 오른다.
        setEnchant(it, Math.min(ENCHANT_MAX, enchantOf(it) + 1));
        it.blessed = true;
        it.plusKnown = true;
        say(state, `${describe(it, state.known, state.appearance)}이(가) 저주를 삼키고 검게 벼려졌다.`);
    }
}

/** 회복 — 레벨이 높을수록 빠르다. */
function regenerate(state: GameState, hero: Hero) {
    if (hero.hp >= hero.maxHp) return;
    const every = regenEvery(hero);
    if (state.turn % every === 0) hero.hp += 1;
}

function stepToward(level: Level, m: Monster, target: Pos): Pos | null {
    let best: Pos | null = null;
    let bestD = Infinity;
    for (const d of ALL_DIRS) {
        const nx = m.x + d.dx;
        const ny = m.y + d.dy;
        if (!inBounds(nx, ny)) continue;
        if (!walkable(tileAt(level, nx, ny))) continue;
        if (blockedDiagonal(level, m, { x: nx, y: ny })) continue;
        if (level.monsters.some((o) => o.id !== m.id && o.x === nx && o.y === ny && o.hp > 0)) continue;
        const dist = Math.max(Math.abs(nx - target.x), Math.abs(ny - target.y));
        if (dist < bestD) {
            bestD = dist;
            best = { x: nx, y: ny };
        }
    }
    return best;
}

/**
 * 몬스터의 차례. 자는 놈은 나를 알아보면 깬다.
 *
 * **빠른 놈은 두 번, 느린 놈은 두 턴에 한 번** 움직인다(지팡이가 그 값을 바꾼다).
 * 그래서 둔화 지팡이가 도망갈 시간을 실제로 벌어 준다.
 */
/**
 * **때린 사람에게 어그로가 옮는다.**
 *
 * 근접이든 지팡이든 던지기든 **같다.** 뒤에서 지팡이만 쏘는 사람이 안전하면 딜러가
 * 무적이 되고, 그러면 「한 명이 버티고 한 명이 때린다」가 아니라 그냥 한 명이 미끼다.
 *
 * 때리는 자리마다 흩어 적으면 새 공격 수단이 생기는 날 하나를 빠뜨린다 — 여기 한 자리다.
 */
function pullAggro(state: GameState, m: Monster, by: Hero): void {
    const i = state.heroes.indexOf(by);
    if (i >= 0) m.target = i;
}

/**
 * 그 몬스터가 **쫓는 사람.**
 *
 * **마지막에 자기를 때린 쪽**(`m.target`)을 쫓는다. 그래야 한 명이 버티고 한 명이 딜을
 * 넣는 역할이 생긴다. 어그로가 없거나 목표가 쓰러졌으면 **가까운 쪽**을 본다.
 *
 * **쓰러진 사람은 안 쫓는다.** 눕힌 사람을 계속 때리면 살아남은 쪽은 아무것도 못 하고,
 * 협동이 「한 명이 먼저 죽으면 끝」이 된다.
 */
function monsterTarget(state: GameState, m: Monster): Hero {
    const standing = state.heroes.filter((h) => h.hp > 0);
    const pool = standing.length > 0 ? standing : state.heroes;
    const marked = m.target === undefined ? undefined : state.heroes[m.target];
    if (marked && marked.hp > 0) return marked;
    let best = pool[0];
    let bestD = Infinity;
    for (const h of pool) {
        const d = Math.abs(h.x - m.x) + Math.abs(h.y - m.y);
        if (d < bestD) {
            bestD = d;
            best = h;
        }
    }
    return best;
}

function monsterTurns(state: GameState, rng: Rng, fled?: { hero: Hero; x: number; y: number }) {
    const { level } = state;
    // 저주받은 도발 반지는 원작처럼 모든 적을 깨운다. 가까운 적만 건드리는 대신,
    // 반지 주인을 목표로 고정해 "더 공격적"이라는 값이 분명하게 남는다.
    const provocateur = state.heroes.find((h) => h.hp > 0 && hasRing(h, "aggravate monsters"));
    if (provocateur) {
        const target = state.heroes.indexOf(provocateur);
        for (const m of level.monsters) {
            m.awake = true;
            m.target = target;
        }
    }
    // **누구 하나라도 시간을 세웠으면 세상이 선다.** 파티의 것이지 한 사람의 것이 아니다.
    const stopper = state.heroes.find((h) => (h.timeStop ?? 0) > 0);
    if (stopper) {
        for (const h of state.heroes) if ((h.timeStop ?? 0) > 0) h.timeStop! -= 1;
        say(state, `⏳ 시간 정지 지속 중... (남은 턴: ${stopper.timeStop})`);
        return;
    }
    for (const m of [...level.monsters]) {
        if (m.hp <= 0) continue;
        if (m.frozenTurns && m.frozenTurns > 0) {
            m.frozenTurns -= 1;
            say(state, `${monsterName(m)}이(가) 얼어붙어 움직이지 못한다.`);
            continue;
        }
        // 격턴으로 움직이는 놈은 **적이 움직인 횟수**를 센다 — `turn` 을 보면 둘일 때
        // 「적이 도는 턴」과 짝이 어긋나 한 걸음도 못 움직인다.
        if (m.speed < 0 && (state.monsterRound ?? state.turn) % 2 === 0) continue;
        const acts = m.speed > 0 ? 2 : 1;
        for (let n = 0; n < acts; n++) {
            if (m.hp <= 0 || state.heroes.every((h) => h.hp <= 0)) break;
            monsterAct(state, m, rng, fled);
        }
    }
    // 특수 공격으로 스스로 사라진 놈들(레프러콘·님프)을 치운다.
    level.monsters = level.monsters.filter((m) => m.hp > 0);
}

function boltGlyph(dx: number, dy: number): string {
    if (dx === 0) return "|";
    if (dy === 0) return "-";
    return dx === dy ? "\\" : "/";
}

/** 원작의 용 숨결 — 직선·대각선 여섯 칸, 벽에서는 꺾여 돌아온다. */
function dragonFlamePath(level: Level, dragon: Monster, victim: Hero): { hit: boolean; bounced: boolean; cells: { x: number; y: number; ch: string }[] } {
    let dx = Math.sign(victim.x - dragon.x);
    let dy = Math.sign(victim.y - dragon.y);
    const range = Math.max(Math.abs(victim.x - dragon.x), Math.abs(victim.y - dragon.y));
    if ((dx !== 0 && dy !== 0 && Math.abs(victim.x - dragon.x) !== Math.abs(victim.y - dragon.y)) || range === 0 || range > 6) {
        return { hit: false, bounced: false, cells: [] };
    }
    let x = dragon.x;
    let y = dragon.y;
    let steps = 0;
    let bounced = false;
    let turns = 0;
    const cells: { x: number; y: number; ch: string }[] = [];
    while (steps < 6 && turns++ < 12) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny) || !walkable(tileAt(level, nx, ny))) {
            dx = -dx;
            dy = -dy;
            bounced = true;
            continue;
        }
        x = nx;
        y = ny;
        steps++;
        cells.push({ x, y, ch: boltGlyph(dx, dy) });
        if (x === victim.x && y === victim.y) return { hit: true, bounced, cells };
    }
    return { hit: false, bounced, cells };
}

function monsterAct(state: GameState, m: Monster, rng: Rng, fled?: { hero: Hero; x: number; y: number }) {
    const { level } = state;
    {
        if (!m.awake) {
            // **누구든 하나를 보면 깨어난다** — 곁의 성한 사람이 안 보인다고 자는 것은
            // 아니다. 깨울 때 본 사람이 첫 목표가 된다.
            const spotted = state.heroes.find((h) => h.hp > 0 && monsterSees(level, m.x, m.y, h));
            if (spotted && m.def.mean && !hasRing(spotted, "stealth")) {
                m.awake = true;
                m.target = state.heroes.indexOf(spotted);
            } else return;
        }
        const victim = monsterTarget(state, m);
        if (m.def.still) {
            if (Math.abs(m.x - victim.x) <= 1 && Math.abs(m.y - victim.y) <= 1) {
                say(state, ...monsterAttack(state, m, victim, rng).messages);
            }
            return;
        }

        // 원작처럼 용은 직선·대각선 6칸 안의 목표에게 20% 확률로 6d6 불꽃을 쏜다.
        // 벽에 꺾여 돌아오는 숨결도 그대로 두되, 무력화된 용은 이 수법을 잃는다.
        const dragonInLine = m.def.ch === "D" && !m.cancelled
            && (m.x === victim.x || m.y === victim.y || Math.abs(m.x - victim.x) === Math.abs(m.y - victim.y))
            && Math.max(Math.abs(m.x - victim.x), Math.abs(m.y - victim.y)) <= 6;
        if (dragonInLine && rng.chance(0.2)) {
            const victimIndex = state.heroes.indexOf(victim);
            const target = state.heroes.length > 1
                ? `${victimIndex + 1}P${victim.nick ? `(${victim.nick})` : ""}`
                : "나";
            const flame = dragonFlamePath(level, m, victim);
            state.projectile = { id: `${state.turn}:${m.id}:${state.messages.length}`, cells: flame.cells };
            say(state, `🐉 ${monsterName(m)} → ${target}: 불꽃을 뿜었다${flame.bounced ? " — 벽에 튕겨 돌아왔다" : ""}!`);
            if (flame.hit) {
                const dmg = rng.rollDice("6d6");
                victim.hp -= dmg;
                say(state, withDamage("화염에 휩싸였다!", dmg));
            } else say(state, "불꽃이 빗나갔다.");
            return;
        }

        // 적은 이번 행동에 **실제로** 내 칸에 들어갈 수 있을 때 때린다. 단, 바로 앞
        // 칸으로 달아난 표적을 쫓아 방금 떠난 칸에 닿을 때도 추격 공격이 들어간다.
        const erratic = (m.def.ch === "B" || m.def.ch === "K") && rng.chance(0.5);
        const next = erratic
            ? (() => {
                const d = rng.pick(ALL_DIRS)!;
                const nx = m.x + d.dx;
                const ny = m.y + d.dy;
                return inBounds(nx, ny) && walkable(tileAt(level, nx, ny)) && !blockedDiagonal(level, m, { x: nx, y: ny }) ? { x: nx, y: ny } : null;
            })()
            : stepToward(level, m, victim);
        if (
            next &&
            ((next.x === victim.x && next.y === victim.y) ||
                (victim === fled?.hero && next.x === fled.x && next.y === fled.y))
        ) {
            say(state, ...monsterAttack(state, m, victim, rng).messages);
            return;
        }
        if (next) {
            m.x = next.x;
            m.y = next.y;
        }
    }
}

function useRelicCommand(state: GameState, hero: Hero, letter: string): boolean {
    const it = packItem(hero, letter);
    if (!it || it.kind !== "relic") {
        say(state, "사용할 수 있는 유물이 아니다.");
        return false;
    }
    if (it.type === "time_hourglass") {
        if (it.relicCooldown && it.relicCooldown > 0) {
            say(state, `시간의 모래시계가 충전 중입니다. (남은 턴: ${it.relicCooldown})`);
            return false;
        }
        hero.timeStop = 3;
        it.relicCooldown = 50;
        say(state, "⏳ 시간의 모래시계를 발동했습니다! 3턴 동안 모든 몬스터의 시간이 정지합니다.");
        return true;
    }
    const def = RELIC_DEFS[it.type as RelicType];
    say(state, `${def?.name ?? "유물"}은(는) 소지 시 상시 발동하는 패시브 유물입니다.`);
    return false;
}

function socketGemCommand(state: GameState, hero: Hero, gearLetter: string, gemLetter: string): boolean {
    const { level } = state;
    if (!level.anvil || hero.x !== level.anvil.x || hero.y !== level.anvil.y) {
        say(state, "보석을 장착하려면 모루 칸(&) 위에 서 있어야 합니다.");
        return false;
    }
    const gear = packItem(hero, gearLetter);
    const gem = packItem(hero, gemLetter);
    if (!gear || (gear.kind !== "weapon" && gear.kind !== "armor")) {
        say(state, "보석을 장착할 무기나 갑옷을 선택해야 합니다.");
        return false;
    }
    if (!gem || gem.kind !== "gem") {
        say(state, "장착할 원소 보석을 선택해야 합니다.");
        return false;
    }
    const res = socketGemIntoItem(hero, gear, gem);
    say(state, res.message);
    return res.ok;
}

/**
 * 명령 하나. **돌아온 것이 새 판**이다 — 화면은 이것만 보고 다시 그린다.
 */
export function perform(state: GameState, cmd: Command): GameState {
    sayTag = state.heroes.length > 1 ? `${(cmd.who ?? 0) + 1}P▸ ` : "";
    try {
        return act(state, cmd);
    } finally {
        sayTag = "";
    }
}

/** 선택 제단 — 화면은 고르는 것만, 비용·보상·한 번 사용은 이 엔진 자리가 맡는다. */
function useAltar(state: GameState, hero: Hero, choice: "blood" | "hunger" | "guardian", rng: Rng): boolean {
    const { level } = state;
    const onAltar = level.special?.kind === "altar" && level.anvil && hero.x === level.anvil.x && hero.y === level.anvil.y;
    if (!onAltar || level.altarUsed) {
        say(state, level.altarUsed ? "이 제단의 불빛은 이미 꺼졌다." : "제단 앞에 서야 한다.");
        return false;
    }
    if (choice === "blood") {
        const cost = Math.max(5, Math.ceil(hero.hp / 3));
        if (hero.hp <= cost || hero.pack.length >= 26) {
            say(state, hero.hp <= cost ? "바칠 피가 모자라다." : "배낭이 꽉 찼다.");
            return false;
        }
        hero.hp -= cost;
        const reward = makeItem("scroll", "blessed enchant", state.nextItemId++, -1, -1);
        reward.blessed = true;
        addToPack(hero, reward);
        say(state, `피 ${cost}를 바쳤다. 축복받은 강화 주문서를 얻었다.`);
    } else if (choice === "hunger") {
        if (hero.food <= 400 || hero.pack.length >= 25) {
            say(state, hero.food <= 400 ? "바칠 식량이 모자라다." : "배낭에 두 장을 담을 자리가 없다.");
            return false;
        }
        hero.food -= 400;
        addToPack(hero, makeItem("scroll", "magic mapping", state.nextItemId++, -1, -1));
        addToPack(hero, makeItem("scroll", "identify", state.nextItemId++, -1, -1));
        say(state, "허기 400을 바쳤다. 지도와 감정 주문서를 얻었다.");
    } else {
        const room = level.rooms[level.special!.room];
        const [spot] = roomSpots(level, room, 1, rng, [hero]);
        if (!spot) {
            say(state, "제단방에 수호자가 설 자리가 없다.");
            return false;
        }
        for (const m of level.monsters) {
            if (m.x > room.x && m.x < room.x + room.w - 1 && m.y > room.y && m.y < room.y + room.h - 1) m.awake = true;
        }
        const guardian = spawnMonster(randomMonsterChar(level.depth, rng), spot.x, spot.y, rng, rollChampionPrefix(level.depth, rng) ?? "blazing");
        guardian.altarGuardian = true;
        level.monsters.push(guardian);
        say(state, `${monsterName(guardian)} 수호자가 깨어났다. 쓰러뜨리면 보석을 남긴다.`);
    }
    level.altarUsed = true;
    return true;
}

function inspectStatus(state: GameState, hero: Hero, who: number, kind: "origin" | "str" | "defense" | "wisdom") {
    const tag = `${who + 1}P▸ `;
    if (kind === "origin") {
        const origin = ORIGINS[hero.origin ?? "knight"];
        const nextGrowth = hero.pendingSkillPicks > 0
            ? `지금 성장 ${hero.pendingSkillPicks}개 선택 가능`
            : `다음 성장 Lv ${Math.floor(hero.level / SKILL_PICK_INTERVAL + 1) * SKILL_PICK_INTERVAL}`;
        const advancement = hero.level < ADVANCE_LEVEL
            ? `전직: Lv ${ADVANCE_LEVEL} ${origin.advancedSkillName} 해금까지 ${ADVANCE_LEVEL - hero.level}레벨`
            : `전직: ${origin.advancedName} · ${origin.advancedSkillName}`;
        const skills = Object.entries(hero.weaponSkills ?? {}).map(([type, level]) => `${type} ${weaponSkillName(level)}/${weaponSkillName(weaponSkillMax(hero, type))}`).join(", ") || "무기 훈련 없음";
        say(state, `${tag}직업 · ${origin.advancedName} | 무기 숙련: ${skills} | 성장: Lv ${SKILL_PICK_INTERVAL}마다 힘·방어·지혜 선택 | ${nextGrowth} | ${advancement}`);
    } else if (kind === "str") {
        say(state, `${tag}St:${heroStr(hero)} · 기본 ${hero.str} · 최대 ${hero.maxStr}`);
    } else if (kind === "defense") {
        say(state, `${tag}AC:${heroArmorClass(hero)} · ${heroArmorClassTerms(hero).map((term) => `${term.why} ${term.n >= 0 ? "+" : ""}${term.n}`).join(" · ")}`);
    } else {
        const wisdom = Math.round(hero.itemLuck * 100);
        say(state, `${tag}Wi:${wisdom} · 아이템 등급 판정 +${wisdom}%`);
    }
}

function act(state: GameState, cmd: Command): GameState {
    if (state.phase !== "playing") return state;
    const rng = rngOf(state);

    // **누가 하는 명령인지를 여기서 한 번 정하고 아래로 넘긴다.** `who` 가 없으면 방장이라,
    // 단독 플레이의 옛 명령이 한 글자도 안 바뀌고 그대로 돈다. 아래의 어느 처리기도
    // 「누구 차례인가」를 다시 판단하지 않는다 — 그러면 규칙이 두 벌이 된다.
    const hero = state.heroes[cmd.who ?? 0];
    if (!hero) return state;
    if (cmd.t === "inspectStatus") {
        inspectStatus(state, hero, cmd.who ?? 0, cmd.kind);
        return { ...state };
    }
    const turnStart = { x: hero.x, y: hero.y };
    // **쓰러진 사람은 못 움직인다.** 화면이 조종을 안 넘기지만 엔진도 한 번 더 본다.
    if (hero.hp <= 0) return state;

    // 얼어붙었거나 자는 동안에는 내 차례가 없다. 그래도 시간은 간다.
    if (hero.asleep > 0) {
        hero.asleep -= 1;
        say(state, "움직일 수 없다.");
        return finishTurn(state, hero, rng, true);
    }

    // **곰덫은 다르다** — 자리를 못 뜰 뿐, 싸우고 마시고 읽는 것은 할 수 있다.
    if (hero.stuck > 0 && cmd.t === "move") {
        hero.stuck -= 1;
        const target = monsterAt(state.level, hero.x + cmd.dx, hero.y + cmd.dy);
        if (!target) {
            say(state, "덫에 걸려 발이 안 떨어진다.");
            return finishTurn(state, hero, rng, true);
        }
    }

    let acted = false;
    let heldGuard = false;
    if (cmd.t === "rest") {
        if (hero.origin === "knight") {
            hero.guarded = true;
            hero.guardTurns = 3;
            const guardArmor = hero.level >= ADVANCE_LEVEL ? ADVANCED_GUARD_BONUS : 2;
            say(state, `🛡️ 철벽의 자세를 취했다 (제자리 전투 3턴 방어 등급 -${guardArmor} / 받는 피해 2 경감).`);
        }
        acted = true;
    } else {
        switch (cmd.t) {
            case "move": {
                const moved = heroMove(state, hero, cmd.dx, cmd.dy, rng);
                acted = moved.acted;
                heldGuard = hero.guarded === true && hero.origin === "knight" && moved.fought && (hero.guardTurns ?? 0) > 0;
                break;
            }
            case "pickup":
                acted = pickUp(state, hero);
                break;
            case "descend":
                acted = descend(state, hero, rng);
                break;
            case "ascend":
                acted = ascend(state, hero, rng);
                break;
            case "quaff":
                acted = quaff(state, hero, cmd.letter, rng, cmd.target);
                break;
            case "read":
                acted = read(state, hero, cmd.letter, rng, cmd.target);
                break;
            case "eat":
                acted = eat(state, hero, cmd.letter, rng);
                break;
            case "wield":
                acted = wield(state, hero, cmd.letter);
                break;
            case "offHand":
                acted = offHand(state, hero, cmd.letter);
                break;
            case "wear":
                acted = wear(state, hero, cmd.letter);
                break;
            case "drop":
                acted = drop(state, hero, cmd.letter);
                break;
            case "give":
                acted = give(state, hero, cmd.letter);
                break;
            case "melt":
                acted = melt(state, hero, cmd.letter, rng);
                break;
            case "stash":
                acted = stash(state, hero, cmd.letter);
                break;
            case "unstash":
                acted = unstash(state, hero, cmd.slot);
                break;
            case "pickSkill":
                acted = pickSkill(state, hero, cmd.option);
                break;
            case "classSkill":
                acted = useClassSkill(state, hero, cmd.ingredients);
                break;
            case "putOn":
                acted = putOn(state, hero, cmd.letter);
                break;
            case "removeRing":
                acted = removeRing(state, hero, cmd.letter);
                break;
            case "zap":
                acted = zap(state, hero, cmd.letter, cmd.dx, cmd.dy, rng);
                break;
            case "throw":
                acted = throwItem(state, hero, cmd.letter, cmd.dx, cmd.dy, rng);
                break;
            case "search":
                acted = search(state, hero, rng);
                break;
            case "use_relic":
                acted = useRelicCommand(state, hero, cmd.letter);
                break;
            case "altar":
                acted = useAltar(state, hero, cmd.choice, rng);
                break;
            case "socket":
                acted = socketGemCommand(state, hero, cmd.gearLetter, cmd.gemLetter);
                break;
        }
        if (hero.guarded && hero.origin === "knight" && !heldGuard) {
            hero.guarded = false;
            hero.guardTurns = 0;
            say(state, "🛡️ 철벽의 자세가 풀렸다.");
        }
    }

    const fled = cmd.t === "move" && (hero.x !== turnStart.x || hero.y !== turnStart.y)
        ? { hero, ...turnStart }
        : undefined;
    return finishTurn(state, hero, rng, acted, heldGuard, fled);
}

function finishTurn(state: GameState, hero: Hero, rng: Rng, acted: boolean, heldGuard = false, fled?: { hero: Hero; x: number; y: number }): GameState {
    sayTag = "";
    if (!acted) {
        // 아무 일도 안 일어났으면 턴을 안 쓴다. 난수 상태만 저장한다.
        state.rngState = rng.state;
        return { ...state };
    }

    state.turn += 1;

    // ── 영웅에게 붙은 것은 **누가 움직이든** 한 칸씩 돈다 ────────────────────────
    //
    // 값은 사람마다 따로 들되(배고픔은 제 주머니 사정이고, 반지도 제 것이 제 배를 곯린다),
    // **시계는 하나다.** 움직인 사람만 치르게 하면 **가만히 있는 사람이 공짜**가 된다 —
    // 상대가 층을 다 뒤지는 동안 굶지도, 불타지도, 눈이 풀리지도 않는다. 그건 협동이
    // 아니라 얌체다.
    for (const h of state.heroes) {
        // **쓰러진 사람의 시계는 선다.** 누워 있는 사람이 굶어 죽으면 살릴 길이 없다.
        if (h.hp <= 0) continue;
        tickHunger(state, h, rng);
        regenerate(state, h);
        bearCurse(state, h);
        if (h.blind > 0) h.blind -= 1;
        if (h.confused > 0) h.confused -= 1;
        if (h.detect > 0) h.detect -= 1;
        // 눈이 멀면 탐지가 꺼진다 — 안 보이는데 생명만 짚어 낼 수는 없다.
        if (h.blind > 0) h.detect = 0;

        // 화상 틱 (영웅)
        if (h.burnTurns && h.burnTurns > 0) {
            h.hp -= 2;
            h.burnTurns -= 1;
            say(state, "몸에 붙은 불로 2의 화염 피해를 입었다! (화상)");
        }

        // 유물 쿨다운 감소
        for (const it of h.pack) {
            if (it.relicCooldown && it.relicCooldown > 0) {
                it.relicCooldown -= 1;
            }
        }

    }

    // 화상 틱 (몬스터)
    for (const m of [...state.level.monsters]) {
        if (m.burnTurns && m.burnTurns > 0 && m.hp > 0) {
            m.hp -= 2;
            m.burnTurns -= 1;
            say(state, `${monsterName(m)}이(가) 불길로 2의 지속 피해를 입었다.`);
            if (m.hp <= 0) {
                // **불을 붙인 사람의 몫**이다 — 이 턴에 움직인 사람이 아니다. 여기서
                // `hero` 를 쓰면 동료가 붙인 불로 내가 경험치를 받는다.
                killMonster(state, m, rng, state.heroes[m.burnBy ?? 0] ?? state.heroes[0]);
            }
        }
    }

    // ── 적은 **파티의 걸음**에 맞춰 움직인다 ──────────────────────────────────────
    //
    // 배고픔·회복은 위에서 **사람마다** 돈다 — 제 몸의 것이라 그렇다. 적은 다르다:
    // 적은 파티 **하나**를 상대하는 판의 것이다. 걸음마다 한 칸씩 따라오게 두면 둘일 때
    // 사람은 각자 한 걸음인데 적은 두 걸음이라, 동료를 부르는 것이 **세상을 두 배로
    // 빠르게 만드는 일**이 된다. 그래서 **서 있는 사람 수만큼 걸음이 모여야** 한 번 움직인다.
    //
    // 혼자면 `pace` 가 1 이라 걸음마다 그대로 돈다 — 단독 플레이는 한 글자도 안 바뀐다.
    if (state.phase === "playing" && hero.hp > 0) {
        const pace = Math.max(1, state.heroes.filter((h) => h.hp > 0).length);
        state.pendingSteps = (state.pendingSteps ?? 0) + 1;
        if (state.pendingSteps >= pace) {
            state.pendingSteps = 0;
            state.monsterRound = (state.monsterRound ?? 0) + 1;
            monsterTurns(state, rng, fled);
        }
    }

    // 철벽 자세는 이동하지 않고 맞붙어 싸운 뒤의 적 턴까지 지킨다. 세 번째 전투가
    // 끝나면 바로 풀어 다음 행동에는 보너스가 남지 않는다.
    if (heldGuard && hero.guarded && hero.origin === "knight") {
        hero.guardTurns = Math.max(0, (hero.guardTurns ?? 0) - 1);
        if (hero.guardTurns === 0) {
            hero.guarded = false;
            say(state, "🛡️ 철벽의 자세가 풀렸다.");
        }
    }

    // 탈출 반지는 둘 이상에게 포위된 뒤에만 듣는다. 평소 이동을 방해하지 않는 직관적인 비상 탈출이다.
    for (const h of state.heroes) {
        const surrounded = state.level.monsters.filter((m) => m.hp > 0 && Math.abs(m.x - h.x) <= 1 && Math.abs(m.y - h.y) <= 1).length >= 2;
        if (h.hp <= 0 || !hasRing(h, "teleportation") || !surrounded) continue;
        const p = freeSpot(state.level, rng, [state.level.stairs, ...state.heroes.filter((o) => o !== h)]);
        h.x = p.x;
        h.y = p.y;
        say(state, "탈출 반지가 포위망 밖으로 옮겼다.");
    }

    computeFov(state.level, state.heroes);
    updateSeenItems(state);

    // **쓰러진 사람을 훑는다** — 행동한 사람만이 아니다. 불길에도 몬스터에게도 누구나
    // 쓰러질 수 있고, 그 턴에 움직인 사람이 아닐 수 있다.
    if (state.phase === "playing") {
        for (const h of state.heroes) {
            if (h.hp > 0) continue;
            const featherIdx = h.pack.findIndex((it) => it.kind === "relic" && it.type === "phoenix_feather");
            if (featherIdx < 0) continue;
            // 깃털은 **그 자리에서 즉시** 일으킨다 — 층을 넘어야 하는 부활보다 먼저다.
            h.pack.splice(featherIdx, 1);
            h.hp = h.maxHp;
            h.burnTurns = 0;
            h.asleep = 0;
            h.confused = 0;
            h.blind = 0;
            say(state, "🔥 불사조의 깃털이 타오르며 영웅을 최대 생명력으로 부활시켰습니다! 🔥");
            for (const m of state.level.monsters) {
                if (Math.abs(m.x - h.x) <= 1 && Math.abs(m.y - h.y) <= 1) {
                    const pushSpot = freeSpot(state.level, rng, [...state.heroes, { x: m.x, y: m.y }]);
                    m.x = pushSpot.x;
                    m.y = pushSpot.y;
                }
            }
        }
        // **둘 다 쓰러져야 판이 끝난다.** 혼자면 한 명이 곧 전부라 규칙이 한 벌로 남는다 —
        // 「혼자일 때」를 따로 적으면 어느 날 한쪽만 고쳐진다.
        const down = state.heroes.filter((h) => h.hp <= 0);
        for (const h of down) h.hp = 0;
        if (down.length === state.heroes.length) {
            state.phase = "dead";
            if (!state.epitaph) {
                state.epitaph = `지하 ${state.level.depth}층에서 쓰러졌다. 금화 ${state.heroes[0].gold}.`;
            }
            revealAll(state.level);
        } else if (down.length > 0) {
            say(state, "동료가 쓰러졌다. 살아서 더 깊은 층에 닿으면 일으킬 수 있다.");
        }
    }

    state.rngState = rng.state;
    return { ...state };
}

/**
 * 조사 — **한 번이라도 잡아 본 종이면 속을 안다.**
 *
 * ── 왜 턴을 안 쓰나 ──────────────────────────────────────────────────
 * 조사는 세상을 바꾸지 않는다. **내 수첩을 읽는 것**이고, 거기 적힌 것은 이미 내가
 * 값을 치르고 얻은 것이다(한 마리를 잡았다). 그래서 이 함수는 `perform` 을 안 지나고
 * 아무것도 안 바꾼다 — 문서의 규칙 3 「아무 일도 안 일어난 행동은 턴을 안 쓴다」가
 * 그대로 적용되는 자리다.
 *
 * 값은 **먼저 한 마리를 잡아야 한다**는 것 하나다. 처음 보는 글자 앞에서는 여전히
 * 아무것도 모른 채 결정해야 하고, 그 한 번이 이 게임에서 제일 무서운 순간이다.
 *
 * ── 지금 체력은 숫자로 안 준다 ───────────────────────────────────────
 * 표에 적힌 것(레벨·방어·피해·경험)은 **세상의 사실**이라 그대로 준다. 하지만 눈앞의
 * 이 한 마리가 몇 대 남았는지는 수첩에 없는 것이다. 그건 **보이는 만큼**만 — 성한지
 * 다쳤는지 정도로 준다. 숫자로 주면 「몇 대 더 때리면 죽는다」가 되어 싸움이 산수가 된다.
 */
export type Condition = "성하다" | "다쳤다" | "반쯤 죽었다" | "빈사";

export interface Sighting {
    id: number;
    ch: string;
    name: string;
    /** 여태 잡아 본 적이 있는가. 없으면 아래 값들이 비어 있다. */
    known: boolean;
    kills: number;
    level?: number;
    /** 방어도(AC) — 공격 굴림이 넘어야 할 문턱이다. */
    defense?: number;
    damage?: string[];
    exp?: number;
    hp?: number;
    /** 원작 Rogue 몬스터 특성 기호. */
    traits?: string[];
    /** 사납게 구는 놈인가 — 잡아 봐야 안다. */
    mean?: boolean;
    /** 눈으로 보이는 것. 잡아 본 적이 없어도 이건 안다. */
    condition: Condition;
    /** 몇 칸 떨어져 있나 (대각선도 한 칸). */
    distance: number;
    /** 지금 나를 쫓고 있는가 — 이것도 보면 안다. */
    awake: boolean;
}

function conditionOf(m: Monster): Condition {
    const r = m.hp / Math.max(1, m.maxHp);
    if (r > 0.99) return "성하다";
    if (r > 0.6) return "다쳤다";
    if (r > 0.25) return "반쯤 죽었다";
    return "빈사";
}

/**
 * 지금 보이는 몬스터들. 화면이 이것을 그대로 늘어놓는다.
 *
 * **보이는 범위는 지도와 같은 규칙**이다(`isVisible` · 감지 물약). 조사만 벽을 뚫으면
 * 지도와 조사가 서로 다른 말을 하게 된다.
 */
export function survey(state: GameState): Sighting[] {
    const { level } = state;
    const hero = state.heroes[0];
    return level.monsters
        .filter((m) => m.hp > 0 && (isVisible(level, m.x, m.y) || hero.detect > 0))
        .map((m) => {
            const kills = state.bestiary[m.def.ch] ?? 0;
            const base: Sighting = {
                id: m.id,
                ch: m.def.ch,
                name: m.def.name,
                known: kills > 0,
                kills,
                condition: conditionOf(m),
                distance: Math.max(Math.abs(m.x - hero.x), Math.abs(m.y - hero.y)),
                awake: m.awake,
            };
            if (kills === 0) return base;
            return {
                ...base,
                level: m.def.level,
                defense: defenseOf(m.def.armor),
                // **`0d0` 을 버리지 않는다.** 그게 곧 「대를 몇 번 치나」다 — 아쿠에이터는
                // `0d0` 이 둘이라 **한 턴에 갑옷을 두 칸** 녹인다. 걸러 내면 도감이 「Dmg 없음」
                // 이라고 적어, 왜 두 칸이 녹는지 어디에도 안 적힌 판이 된다. 무엇을 하는
                // 수법인지는 여전히 **당해 봐야**(`special`) 열린다 — 여기 적는 것은 대의 수다.
                damage: m.def.damage,
                exp: m.def.exp,
                hp: m.def.hp,
                mean: m.def.mean,
                traits: m.def.traits ?? [],
            };
        })
        .sort((a, b) => a.distance - b.distance);
}

/** 도감 — 여태 잡아 본 것 전부. 스물여섯 중 몇을 채웠는지가 곧 진행이다. */
export interface BestiaryRow {
    ch: string;
    name: string;
    kills: number;
    level: number;
    defense: number;
    damage: string[];
    exp: number;
    hp: number;
    mean: boolean;
    traits: string[];
    /** 몇 층에서 나오는가. 능력치는 층을 안 타고, 층이 정하는 것은 **어느 종이 나오는가**다. */
    depths: { min: number; max: number } | null;
    /**
     * 수법 — **당해 본 것만 적힌다.** 안 당해 봤으면 `null` 이고, 그러면 화면은
     * 「아직 모르는 수가 있다」를 대신 적는다. 수법이 아예 없는 종은 둘 다 `null` 이다.
     */
    special: string | null;
    /** 수법이 있는 종인가 — 모르는 것과 없는 것을 가르는 칸이다. */
    hasSpecial: boolean;
    /** 그 수법에 몇 번 당했나. */
    suffered: number;
}

export function bestiaryRows(
    bestiary: Record<string, number>,
    specials: Record<string, number> = {},
): BestiaryRow[] {
    return Object.keys(MONSTERS)
        .filter((ch) => (bestiary[ch] ?? 0) > 0)
        .map((ch) => {
            const d = MONSTERS[ch];
            const suffered = specials[ch] ?? 0;
            return {
                ch,
                name: d.name,
                kills: bestiary[ch],
                special: suffered > 0 ? (d.special ?? null) : null,
                hasSpecial: d.special !== undefined,
                suffered,
                level: d.level,
                defense: defenseOf(d.armor),
                // **`0d0` 을 버리지 않는다.** 그게 곧 「대를 몇 번 치나」다 — 아쿠에이터는
                // `0d0` 이 둘이라 **한 턴에 갑옷을 두 칸** 녹인다. 걸러 내면 도감이 「Dmg 없음」
                // 이라고 적어, 왜 두 칸이 녹는지 어디에도 안 적힌 판이 된다. 무엇을 하는
                // 수법인지는 여전히 **당해 봐야**(`special`) 열린다 — 여기 적는 것은 대의 수다.
                damage: d.damage,
                exp: d.exp,
                hp: d.hp,
                depths: depthRange(ch),
                mean: d.mean,
                traits: d.traits ?? [],
            };
        })
        .sort((a, b) => a.level - b.level || a.ch.localeCompare(b.ch));
}

/** 도감을 몇 칸 채웠나 — 스물여섯이 전부다. */
export function bestiaryProgress(bestiary: Record<string, number>): { found: number; total: number } {
    return {
        found: Object.keys(MONSTERS).filter((ch) => (bestiary[ch] ?? 0) > 0).length,
        total: Object.keys(MONSTERS).length,
    };
}

/**
 * 점수 — 금화에 증표와 깊이를 얹는다.
 *
 * **식은 여기 하나뿐이다.** 지난 판 목록도 이걸 다시 쓴다(`tombScore`) — 둘로 나뉘면
 * 죽음 화면의 점수와 목록의 점수가 어느 날 달라지고, 그러면 등수가 거짓말을 한다.
 */
function scoreOf(gold: number, deepest: number, amulet: boolean): number {
    return gold + (amulet ? 10000 : 0) + deepest * 50;
}

/**
 * 이번 판의 점수 — **파티 전체의 금화**를 센다. 둘이서 모은 절반을 동료가 들고 있다고
 * 안 세면, 협동에서는 누가 줍느냐에 따라 점수가 갈린다. 증표는 **누가 들었든** 판의 것이다.
 */
export function score(state: GameState): number {
    return scoreOf(partyGold(state) + partyAdornmentValue(state), state.deepest, partyAmulet(state));
}

/** 파티가 가진 금화 — 보낸 동료들(`benched`)이 들고 간 몫도 이 판에서 번 것이다. */
export function partyGold(state: GameState): number {
    return (
        state.heroes.reduce((n, h) => n + h.gold, 0) +
        (state.benched?.reduce((n, h) => n + h.gold, 0) ?? 0)
    );
}

/** 장식 반지는 팔 수 없으므로, 원작의 10 gold 가치를 최종 점수에 바로 더한다. */
function partyAdornmentValue(state: GameState): number {
    return [...state.heroes, ...(state.benched ?? [])]
        .flatMap((hero) => hero.pack)
        .filter((it) => it.kind === "ring" && it.type === "adornment").length * 10;
}

/** 증표를 **누군가** 들었는가. */
export function partyAmulet(state: GameState): boolean {
    return state.heroes.some((h) => h.hasAmulet) || !!state.benched?.some((h) => h.hasAmulet);
}

/** 지난 판 하나의 점수. 옛 기록에는 증표 칸이 없어 「살아 돌아왔나」로 메운다. */
export function tombScore(t: Tomb): number {
    return scoreOf(t.gold, t.depth, t.amulet ?? t.won);
}

/** 이번 판이 지난 판들 사이에서 선 자리. */
export interface Standing {
    /** 몇 등인가. **같은 점수는 같은 등수다** — 나란한 두 판의 순서를 시계가 정하면 안 된다. */
    place: number;
    /** 몇 판 중에서인가. **이번 판을 포함한다.** */
    total: number;
    /** 여태까지의 최고 점수(이번 판 포함). */
    best: number;
    /**
     * 나와 **똑같은 점수**의 판이 또 있는가 — 공동 등수라는 뜻이다.
     *
     * 이 칸이 없으면 화면이 1등마다 「최고 기록!」이라 적는데, 1층에서 금화 없이 죽으면
     * 점수가 늘 50 이라 **처음 켠 사람이 죽을 때마다 최고 기록을 세운다.** 그러면 그
     * 말이 아무 뜻도 없어진다.
     */
    shared: boolean;
}

/**
 * 이번 판이 몇 등인가 — **내 지난 판들 사이에서만** 센다. 남과 겨루지 않는다.
 *
 * `tombs` 는 `bury` 가 돌려준, **이번 판이 이미 들어 있는** 목록이다. 그래서 여기서는
 * 이번 판을 따로 끼워 넣지 않는다 — 넣으면 두 번 세인다.
 *
 * 등수는 **나보다 높은 점수의 수 + 1** 이다. 같은 점수끼리는 같은 등수를 나눠 갖고, 그
 * 다음 등수는 그만큼 건너뛴다(공동 2등이 둘이면 다음은 4등) — 스포츠의 셈이다.
 */
export function standing(mine: number, tombs: Tomb[]): Standing {
    const scores = tombs.map(tombScore);
    return {
        place: scores.filter((s) => s > mine).length + 1,
        total: Math.max(1, scores.length),
        best: scores.length > 0 ? Math.max(...scores) : mine,
        // 이번 판의 무덤도 세이므로 **하나는 늘 나 자신**이다. 둘부터가 공동이다.
        shared: scores.filter((s) => s === mine).length > 1,
    };
}

/**
 * 아직 찾지 못한 비밀문이 원래 있던 벽의 방향.
 *
 * 비밀문은 여분 통로의 문 자리를 `SECRET`으로 바꾼 값이라 방향을 따로 저장하지 않는다.
 * 가로 벽 사이면 `-`, 세로 벽 사이면 `|`로 되짚어야 밝은 방에서도 문 모양이 새지 않는다.
 */
function secretWallGlyph(level: Level, x: number, y: number): "-" | "|" {
    const horizontal = tileAt(level, x - 1, y) === T.WALL_H || tileAt(level, x + 1, y) === T.WALL_H;
    const vertical = tileAt(level, x, y - 1) === T.WALL_V || tileAt(level, x, y + 1) === T.WALL_V;
    return vertical && !horizontal ? "|" : "-";
}

/** 화면이 쓰는 글자표 — 한 곳에서만 정한다. */
export function glyphAt(
    state: GameState,
    x: number,
    y: number,
    /** 이 화면이 **조종하는** 영웅. 그 사람만 밝게 선다 — 나머지는 동료다. */
    who = 0,
): { ch: string; kind: string } | null {
    const { level } = state;
    const hero = state.heroes[who] ?? state.heroes[0];
    if (!inBounds(x, y)) return null;
    const flags = level.flags[idx(x, y)];
    const visible = (flags & 2) !== 0;
    const seen = (flags & 1) !== 0;
    if (!seen) return null;

    // **조종하는 쪽을 먼저 본다.** 둘이 한 칸에 겹칠 일은 없지만, 겹치더라도 화면은
    // 「내가 어디 있나」를 먼저 답해야 한다.
    // **쓰러진 사람은 `†`** — 같은 `@` 로 두면 살아 있는지 파티 줄을 봐야 안다.
    const face = (h: Hero) => (h.hp > 0 ? "@" : "†");
    if (hero.x === x && hero.y === y) return { ch: face(hero), kind: "hero" };
    const other = state.heroes.find((h) => h !== hero && h.x === x && h.y === y);
    if (other) return { ch: face(other), kind: "ally" };

    // 생명 탐지 물약을 마신 동안에는 벽 너머의 놈도 보인다.
    if (visible || hero.detect > 0) {
        const m = monsterAt(level, x, y);
        if (m && (!m.def.invisible || hasRing(hero, "see invisible") || hero.detect > 0)) {
            return { ch: m.def.ch, kind: visible ? "monster" : "monster-sensed" };
        }
    }
    const it = itemAt(level, x, y);
    if (it && (visible || seen)) return { ch: itemChar(it.kind), kind: `item-${it.kind}` };

    // 찾은 함정만 뜬다. 못 찾은 것은 바닥과 구별되지 않는다 — 그것이 함정이다.
    const trap = level.traps.find((t) => t.x === x && t.y === y && t.found);
    if (trap) return { ch: "^", kind: visible ? "trap" : "trap-dim" };

    const t = tileAt(level, x, y);
    if (level.upStairs && level.upStairs.x === x && level.upStairs.y === y) {
        return { ch: "<", kind: "stairs" };
    }
    if (level.anvil && level.anvil.x === x && level.anvil.y === y) {
        return { ch: "&", kind: visible ? "anvil" : "anvil-dim" };
    }
    switch (t) {
        case T.FLOOR:
            return { ch: ".", kind: visible ? "floor" : "floor-dim" };
        case T.WALL_H:
            return { ch: "-", kind: visible ? "wall" : "wall-dim" };
        case T.WALL_V:
            return { ch: "|", kind: visible ? "wall" : "wall-dim" };
        case T.DOOR:
            return { ch: "+", kind: visible ? "door" : "door-dim" };
        case T.SECRET:
            // **찾기 전에는 원래 방향의 벽이다.** 문과 다른 글자는 물론, 벽 방향이 달라도
            // 밝은 방의 외곽선이 끊겨 비밀문 자리가 새어 버린다.
            return { ch: secretWallGlyph(level, x, y), kind: visible ? "wall" : "wall-dim" };
        case T.CORRIDOR:
        case T.PASSAGE:
            return { ch: "#", kind: visible ? "corridor" : "corridor-dim" };
        case T.STAIRS:
            return { ch: ">", kind: "stairs" };
        default:
            return null;
    }
}

export { MAP_H, MAP_W };
