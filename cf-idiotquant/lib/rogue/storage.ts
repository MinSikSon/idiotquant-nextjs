/**
 * 판을 브라우저에 저장한다 — 새로고침이 곧 죽음이면 안 된다.
 *
 * **`JSON.stringify` 를 그냥 쓸 수 없다.** 지도는 `Uint8Array` 인데 JSON 은 그것을
 * `{"0":1,"1":0,…}` 짜리 객체로 바꿔 놓고, 되읽으면 배열이 아니라 그 객체가 돌아온다.
 * 화면은 아무 말 없이 텅 빈 지도를 그린다. 그래서 배열은 **숫자 배열로 풀어** 적고
 * 되읽을 때 다시 담는다.
 *
 * 몬스터의 `def` 도 저장하지 않는다 — 표를 가리키는 참조라 적어 봐야 사본이 생기고,
 * 표를 고치는 날 저장된 판만 옛 값으로 남는다. 글자 하나만 적고 되읽을 때 표에서 찾는다.
 */

import {
    ARMORS,
    CHEST_SLOTS,
    ENCHANT_MAX,
    POTIONS,
    RINGS,
    SCROLLS,
    WANDS,
    WEAPONS,
    armorClassOf,
    canHoldEnchant,
    defenseOf,
    fillAppearances,
    weaponDamageOf,
} from "./items";
import { heroDefense } from "./hero";
import { cleanNick, partyAmulet, partyGold, score } from "./game";
import { MONSTERS } from "./monsters";
import { MAP_H, MAP_W, type GameState, type Hero, type HeroOrigin, type Item, type ItemKind, type Level, type Monster } from "./types";

const KEY = "rogue:save:v1";

/**
 * 저장의 판(版).
 *
 * 값이 늘 때마다 올린다. 되읽는 쪽은 **옛 판도 받아서 빈 칸을 채워 준다**(`normalize`) —
 * 굴리던 판을 버리지 않기 위해서다.
 */
const VERSION = 13;

interface SavedMonster extends Omit<Monster, "def"> {
    ch: string;
}

interface SavedLevel extends Omit<Level, "tiles" | "flags" | "roomAt" | "monsters"> {
    tiles: number[];
    flags: number[];
    roomAt: number[];
    monsters: SavedMonster[];
}

interface Saved extends Omit<GameState, "level" | "levels" | "heroes"> {
    level: SavedLevel;
    /** 지나온 층들. v2 이하의 저장에는 없다. */
    levels?: Record<string, SavedLevel>;
    /** v6 부터. 그 아래 저장에는 `hero` 하나만 있다. */
    heroes?: Hero[];
    /** v5 이하의 저장 — 영웅이 하나뿐이던 때. `normalize` 가 `heroes` 로 옮긴다. */
    hero?: Hero;
    v: number;
}

function packLevel(level: Level): SavedLevel {
    return {
        ...level,
        tiles: Array.from(level.tiles),
        flags: Array.from(level.flags),
        roomAt: Array.from(level.roomAt),
        monsters: level.monsters.map(({ def, ...rest }) => ({ ...rest, ch: def.ch })),
    };
}

export function serialize(state: GameState): string {
    const levels: Record<string, SavedLevel> = {};
    for (const [depth, l] of Object.entries(state.levels ?? {})) {
        if (l) levels[depth] = packLevel(l);
    }
    const saved: Saved = {
        ...state,
        v: VERSION,
        level: packLevel(state.level),
        levels,
    };
    return JSON.stringify(saved);
}

const num = (v: unknown, fallback: number): number =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

/**
 * 되읽은 것의 **빈 칸을 채운다.**
 *
 * ── 왜 이 함수가 있나 ────────────────────────────────────────────────
 * 규칙에 값을 하나 더할 때마다(`traps` · `bestiary` · `stuck` …) **이미 저장된 판에는
 * 그 칸이 없다.** 그대로 넘기면 화면은 멀쩡히 뜨고, 한 걸음 걷는 순간
 * `level.traps.find` 가 undefined 를 읽어 터진다. 그리고 새로고침하면 **같은 저장을
 * 다시 읽어 또 터지므로 그 사람에게 `/game` 은 영영 안 열린다.** 실제로 그랬다.
 *
 * 그래서 빈 칸 채우기를 **여기 한 곳**에 둔다. 게임 코드 여기저기에 `?? []` 를 흩뿌리면
 * 규칙이 두 벌이 되고, 새로 더한 값은 또 빠뜨린다.
 *
 * **값을 새로 더하면 이 함수와 `test/rogue-storage.test.ts` 를 같이 고칠 것.**
 */
function unpackLevel(raw: SavedLevel | undefined, fallbackDepth: number): Level | null {
    if (!raw || typeof raw !== "object") return null;
    // 지도가 없으면 채울 방법이 없다 — 그건 층이 아니다.
    const { tiles, flags, roomAt } = raw;
    if (!Array.isArray(tiles) || !Array.isArray(flags) || !Array.isArray(roomAt)) return null;
    if (tiles.length !== MAP_W * MAP_H) return null;
    const rooms = Array.isArray(raw.rooms) ? raw.rooms : [];

    return {
        depth: num(raw.depth, fallbackDepth),
        tiles: new Uint8Array(tiles),
        // 길이가 어긋난 것은 통째로 새로 만든다 — 반쯤 맞는 기억은 없는 것만 못하다.
        flags: new Uint8Array(
            flags.length === tiles.length ? flags : (new Array<number>(tiles.length).fill(0)),
        ),
        // **없는 방을 가리키는 칸은 −1 로 돌린다.** 길이는 맞는데 `rooms` 쪽이 비었거나
        // 짧으면 `level.rooms[roomAt[i]]` 가 undefined 가 되고, 그것을 읽는 자리
        // (`fov.monsterSees` 의 `room.dark`)에서 **한 걸음 걷다 터진다.** 길이가 어긋난
        // 것을 통째로 새로 만드는 것과 같은 까닭이다 — 반쯤 맞는 기억은 없는 것만 못하다.
        roomAt: new Int8Array(
            roomAt.length === tiles.length
                ? roomAt.map((n) => (n >= 0 && n < rooms.length ? n : -1))
                : new Array<number>(tiles.length).fill(-1),
        ),
        rooms,
        monsters: (Array.isArray(raw.monsters) ? raw.monsters : []).map(({ ch, ...rest }) => ({
            ...rest,
            def: MONSTERS[ch] ?? MONSTERS.B,
            speed: num((rest as Partial<Monster>).speed, 0),
            cancelled: (rest as Partial<Monster>).cancelled === true,
            champion: (rest as Partial<Monster>).champion ?? undefined,
        })),
        // 바닥에 떨어져 있는 것도 손질을 올린다 — 주우면 배낭으로 들어온다.
        items: liftEnchants(Array.isArray(raw.items) ? raw.items : []),
        traps: Array.isArray(raw.traps) ? raw.traps : [],
        stairs: raw.stairs ?? { x: 0, y: 0 },
        upStairs: raw.upStairs ?? null,
        // 옛 저장에는 모루가 없다 — **그 층에는 없는 것이 맞다.** 이미 걸어 본 층에
        // 없던 것을 되읽으며 슬쩍 세우면 「아까는 없었는데」가 된다.
        anvil: raw.anvil ?? null,
        maze: raw.maze === true,
        // 옛 저장에는 특수 방이 없다 — **그 층에는 없는 것이 맞다**(모루와 같은 까닭).
        special: raw.special ?? null,
        altarUsed: raw.altarUsed === true,
        mutator: raw.mutator ?? null,
    };
}

/**
 * **마이너스 손질을 0 으로 올린다.**
 *
 * 규칙에서 `−N` 을 없앴지만(`items.rollEnchant`), **이미 그렇게 저장된 판은 안 낫는다.**
 * 「undefined) 식량」 때와 같은 자리다 — 새로 생기는 것을 막는 것과 이미 있는 것을 고치는
 * 것은 다른 일이고, 되읽는 여기가 뒤쪽을 맡는다.
 *
 * 저주는 **안 푼다.** 없앤 것은 깎인 숫자이지 저주가 아니다 — 저주받은 것은 여전히 못
 * 벗는다. 바닥에 떨어져 있는 물건도 같이 본다(주우면 배낭으로 들어온다).
 *
 * **상한(`ENCHANT_MAX`)도 같이 건다.** 강화에 상한이 없던 때의 저장에는 `+12` 짜리가
 * 있을 수 있는데, 그것 하나가 층 사다리를 통째로 무의미하게 만든다. 위아래 양쪽을 한
 * 자리에서 맞춘다.
 */
/**
 * **v7 까지는 손질 정도를 종류로 알았다** — `known["weapon:long sword"]`. 이제는 물건마다
 * 든다(`Item.plusKnown`). 규칙만 바꾸면 **이미 저장된 판은 안 낫는다**: 어제까지 `+3` 이
 * 보이던 장검이 오늘 갑자기 `장검` 으로 돌아가 「내 강화가 날아갔나」로 읽힌다.
 *
 * 그래서 되읽을 때 **옛 지식을 물건으로 옮긴다** — 그 종류를 알던 사람은 들고 있던 그
 * 물건들도 알던 것으로 둔다. 새로 줍는 것부터 새 규칙을 탄다.
 */
function learnPlus(items: Item[], known: Record<string, boolean>): Item[] {
    for (const it of items) {
        if (it.kind !== "weapon" && it.kind !== "armor") continue;
        if (it.plusKnown === undefined && known[`${it.kind}:${it.type}`]) it.plusKnown = true;
    }
    return items;
}

/**
 * 강화 수치를 **규칙 안으로 되돌린다.**
 *
 * 마이너스와 상한 넘김을 자르고, **겹쳐 쌓이는 무기의 강화는 통째로 내린다**
 * (`canHoldEnchant`). 뒤엣것이 새로 붙은 까닭은 **규칙만 고치면 이미 저장된 판은 안 낫기**
 * 때문이다 — `+2` 표창 열 자루를 든 채 저장한 사람은 새 규칙이 와도 그 열 자루를 녹여
 * 주문서를 불릴 수 있다. 새로 생기는 길을 막았으면 되읽을 때도 고쳐야 끝이다.
 */
function liftEnchants(items: Item[]): Item[] {
    const fit = (n: number | undefined) => Math.max(0, Math.min(ENCHANT_MAX, n ?? 0));
    for (const it of items) {
        if (!canHoldEnchant(it)) {
            it.plusHit = 0;
            it.plusDam = 0;
        }
        if ((it.plusHit ?? 0) < 0 || (it.plusHit ?? 0) > ENCHANT_MAX) it.plusHit = fit(it.plusHit);
        if ((it.plusDam ?? 0) < 0 || (it.plusDam ?? 0) > ENCHANT_MAX) it.plusDam = fit(it.plusDam);
        if ((it.plusArmor ?? 0) < 0 || (it.plusArmor ?? 0) > ENCHANT_MAX) it.plusArmor = fit(it.plusArmor);
        if ((it.plusRing ?? 0) < 0) it.plusRing = 0;
    }
    return items;
}

const PACK_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

/**
 * 배낭의 **빈 자리를 메운다.**
 *
 * ── 왜 이 함수가 있나 ────────────────────────────────────────────────
 * 화면은 배낭 한 줄을 `${letter}) 이름` 으로 찍는다. 자리가 없는 물건이 하나라도
 * 섞여 있으면 거기 **「undefined) 식량」**이 뜨고, 더 나쁜 것은 **저장에 그대로 남아
 * 열 때마다 다시 뜬다**는 것이다. 규칙을 고쳐 새로 생기는 것은 막아도, **이미 그렇게
 * 저장된 판은 영영 안 낫는다.** 함정(`traps`) 때 배운 것과 같은 자리다 — 빈 칸 채우기는
 * 되읽는 여기 한 곳에서 해야 한다.
 *
 * 자리가 겹치는 것도 고친다. 겹치면 `packItem(letter)` 이 먼저 걸린 것만 집으므로
 * 나머지 하나는 **고를 수도 버릴 수도 없는 물건**이 된다.
 */
function fixLetters(pack: Item[]): Item[] {
    const used = new Set<string>();
    for (const it of pack) {
        if (it.letter && PACK_LETTERS.includes(it.letter) && !used.has(it.letter)) {
            used.add(it.letter);
            continue;
        }
        const free = PACK_LETTERS.find((l) => !used.has(l));
        // 스물여섯을 넘겨 담긴 저장이면 더 줄 자리가 없다. 그래도 판은 굴러가야 하므로
        // 그 물건만 자리 없이 둔다 — 화면이 `?)` 로 찍고, 버리면 자리가 난다.
        it.letter = free;
        if (free) used.add(free);
    }
    return pack;
}

function normalize(s: Saved): GameState | null {
    if (!s || typeof s !== "object") return null;
    // **옛 저장은 영웅이 하나였다**(`hero`). 그 한 명을 길이 1 짜리 `heroes` 로 옮긴다 —
    // 규칙을 한 벌로 두려고 배열로 바꿨으니, 되읽는 쪽도 여기 한 자리에서 메운다.
    const saved = Array.isArray(s.heroes) && s.heroes.length > 0 ? s.heroes : s.hero ? [s.hero] : null;
    if (!s.level || !saved) return null;

    const level = unpackLevel(s.level, 1);
    if (!level) return null;

    // 지나온 층들. **여기서 하나가 깨져도 판은 버리지 않는다** — 그 층의 기억만 잃고
    // 다음에 가면 새로 파인다. 굴리던 판을 통째로 버리는 것보다 낫다.
    const levels: Record<number, Level> = {};
    for (const [key, raw] of Object.entries(s.levels ?? {})) {
        const depth = Number(key);
        if (!Number.isInteger(depth) || depth < 1) continue;
        // 지금 딛고 선 층이 저기에도 있으면 두 벌이 된다. 딛고 선 쪽만 남긴다.
        if (depth === level.depth) continue;
        const l = unpackLevel(raw, depth);
        if (l) levels[depth] = l;
    }

    const fixHero = (h: Hero): Hero => {
        const fixed = rawHero(h);
        // **이름도 되읽을 때 다시 다듬는다.** 온라인에서는 남이 보낸 판이 이 길로 들어오므로
        // (`deserialize`), 여기서 안 거르면 규칙이 보내는 쪽에만 있는 셈이 된다.
        //
        // 쓸 수 없는 이름이면 **칸째 지운다** — `undefined` 를 넣어 두면 저장했다 되읽은 판이
        // 저장 전과 달라진다(빈 칸도 칸이다, `test/rogue-storage.test.ts`).
        const nick = cleanNick(h.nick);
        if (nick) fixed.nick = nick;
        else delete fixed.nick;
        return fixed;
    };
    const rawHero = (h: Hero): Hero => ({
        ...h,
        maxStr: num(h.maxStr, num(h.str, 16)),
        pack: liftEnchants(fixLetters(learnPlus(Array.isArray(h.pack) ? h.pack : [], s.known ?? {}))),
        // **v8 이하에는 캠프 상자가 없다.** 안 채우면 모루에 올라선 순간 `chest.length` 가
        // undefined 를 읽어 터지고, 새로고침해도 같은 저장을 또 읽어 영영 안 열린다.
        // 자리는 배낭이 아니므로 `letter` 는 안 매긴다 — 꺼낼 때 `addToPack` 이 준다.
        chest: Array.isArray(h.chest) ? liftEnchants(h.chest).slice(0, CHEST_SLOTS) : [],
        // v6 이하에는 보조손이 없다 — 이도류가 없던 때다.
        offWeaponId: h.offWeaponId ?? null,
        leftRingId: h.leftRingId ?? null,
        rightRingId: h.rightRingId ?? null,
        // 예전 저장의 철벽 자세는 다음 제자리 전투 세 번까지로 잇는다.
        guardTurns: Math.min(3, Math.max(0, num(h.guardTurns, h.guarded ? 3 : 0))),
        blind: num(h.blind, 0),
        confused: num(h.confused, 0),
        asleep: num(h.asleep, 0),
        stuck: num(h.stuck, 0),
        detect: num(h.detect, 0),
        // **v9 이하에는 레벨업 성장이 없다.** 안 채우면 `pickSkill` 을 여는 순간
        // `pendingSkillPicks` 가 undefined 를 읽어 터진다. 음수는 0 으로, 지어낼 수
        // 없는 「이미 쓴 성장」은 못 채우므로 **가진 것이 없던 것으로** 돌아간다 —
        // 옛 저장에는 애초에 없던 값이니 맞는 처지다.
        pendingSkillPicks: Math.max(0, num(h.pendingSkillPicks, 0)),
        bonusDefense: Math.max(0, num(h.bonusDefense, 0)),
        itemLuck: Math.min(1, Math.max(0, num(h.itemLuck, 0))),
        // v11 이하에는 전직 액티브 기술이 없다. 0은 어느 실제 층과도 같지 않아
        // 되읽은 뒤 현재 층에서 한 번 쓸 수 있다.
        classSkillDepth: Math.max(0, num(h.classSkillDepth, 0)),
    });
    const heroes: Hero[] = saved.map(fixHero);

    return {
        ...(s as unknown as GameState),
        level,
        levels,
        heroes,
        // 없으면 칸째 안 둔다 — `undefined` 칸이 남으면 되읽은 판이 저장 전과 달라진다.
        // **v10 이하는 `benched` 가 영웅 하나였다**(손님이 하나뿐이던 시절) — 배열로 감싼다.
        ...(Array.isArray(s.benched)
            ? { benched: s.benched.filter((h): h is Hero => !!h && typeof h === "object").map(fixHero) }
            : s.benched && typeof s.benched === "object"
              ? { benched: [fixHero(s.benched as unknown as Hero)] }
              : {}),
        messages: Array.isArray(s.messages) ? s.messages : [],
        // **빠진 겉모습을 메운다** — 표에 물건을 더하면 옛 저장에는 그 한 종이 없고,
        // 그러면 그것만 이름 없는 「주문서」로 떠서 오히려 눈에 띈다(`fillAppearances`).
        appearance: fillAppearances(
            s.appearance && typeof s.appearance === "object" ? s.appearance : {},
            num(s.seed, 1),
        ),
        known: s.known && typeof s.known === "object" ? s.known : {},
        bestiary: s.bestiary && typeof s.bestiary === "object" ? s.bestiary : {},
        specials: s.specials && typeof s.specials === "object" ? s.specials : {},
        seenItems: s.seenItems && typeof s.seenItems === "object" ? s.seenItems : {},
        itemCodex: s.itemCodex && typeof s.itemCodex === "object" ? s.itemCodex : {},
        itemUsage: s.itemUsage && typeof s.itemUsage === "object" ? s.itemUsage : {},
        enchantDrought: num(s.enchantDrought, 0),
        foodDrought: num(s.foodDrought, 0),
        nextItemId: num(s.nextItemId, 1),
        turn: num(s.turn, 0),
        // 적의 박자 — 옛 저장에는 없다. 0 에서 시작해도 반 걸음이 어긋날 뿐이다.
        pendingSteps: num(s.pendingSteps, 0),
        monsterRound: num(s.monsterRound, num(s.turn, 0)),
        deepest: num(s.deepest, num(s.level.depth, 1)),
        phase: s.phase === "dead" || s.phase === "won" ? s.phase : "playing",
    };
}

export function deserialize(text: string): GameState | null {
    try {
        const s = JSON.parse(text) as Saved;
        // 앞으로 나올 판은 못 읽는다 — 억지로 읽으면 모르는 규칙 위에서 굴리게 된다.
        if (!s || typeof s.v !== "number" || s.v > VERSION) return null;
        return normalize(s);
    } catch {
        // 깨진 저장은 없는 것으로 친다 — 여기서 던지면 게임이 아예 안 열린다.
        return null;
    }
}

export function save(state: GameState): void {
    try {
        localStorage.setItem(KEY, serialize(state));
    } catch {
        // 사생활 보호 창이나 저장 공간이 꽉 찬 경우. 판은 그대로 굴러가야 한다.
    }
}

export function load(): GameState | null {
    try {
        const text = localStorage.getItem(KEY);
        return text ? deserialize(text) : null;
    } catch {
        return null;
    }
}

/**
 * 굴러가던 판을 지운다. **도감과 지난 판들은 안 지운다** — 그 둘은 판의 것이 아니라
 * 이 사람의 것이다.
 */
export function clear(): void {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* 지울 수 없어도 새 판은 시작된다 */
    }
}

/**
 * 도감 — 여태 잡아 본 몬스터와 그 수.
 *
 * 물약의 색과 달리 **판을 넘어 남는다.** 색은 그 판의 물건이라 섞이지만, 오크가 얼마나
 * 단단한지는 세상의 사실이라 죽는다고 잊히지 않는다. 죽어도 남는 것이 있어야 다시 할
 * 이유가 생긴다.
 */
const BESTIARY_KEY = "rogue:bestiary:v1";
const SPECIALS_KEY = "rogue:specials:v1";
const ITEM_CODEX_KEY = "rogue:item_codex:v1";
const ITEM_USAGE_KEY = "rogue:item_usage:v1";

function loadCounts(key: string): Record<string, number> {
    try {
        const t = localStorage.getItem(key);
        const o = t ? JSON.parse(t) : {};
        // 남이 고쳐 넣은 값이 들어와도 판이 안 깨지게 숫자만 남긴다.
        if (!o || typeof o !== "object" || Array.isArray(o)) return {};
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(o)) {
            if (typeof v === "number" && Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
        }
        return out;
    } catch {
        return {};
    }
}

function saveCounts(key: string, b: Record<string, number>): void {
    try {
        localStorage.setItem(key, JSON.stringify(b));
    } catch {
        /* 못 적어도 이번 판은 굴러간다 */
    }
}

function loadBooleans(key: string): Record<string, boolean> {
    try {
        const t = localStorage.getItem(key);
        const o = t ? JSON.parse(t) : {};
        if (!o || typeof o !== "object" || Array.isArray(o)) return {};
        const out: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(o)) {
            if (v === true) out[k] = true;
        }
        return out;
    } catch {
        return {};
    }
}

function saveBooleans(key: string, b: Record<string, boolean>): void {
    try {
        localStorage.setItem(key, JSON.stringify(b));
    } catch {
        /* 못 적어도 판은 굴러간다 */
    }
}

export function loadBestiary(): Record<string, number> {
    return loadCounts(BESTIARY_KEY);
}

export function saveBestiary(b: Record<string, number>): void {
    saveCounts(BESTIARY_KEY, b);
}

/**
 * 당해 본 수법들 — **도감과 따로 적는다.**
 *
 * 한 칸에 담으면 「잡아 봤다」와 「당해 봤다」가 섞여서, 님프를 잡아만 본 사람과
 * 물건을 털려 본 사람이 같은 도감을 보게 된다.
 */
export function loadSpecials(): Record<string, number> {
    return loadCounts(SPECIALS_KEY);
}

export function saveSpecials(s: Record<string, number>): void {
    saveCounts(SPECIALS_KEY, s);
}

export function loadItemCodex(): Record<string, boolean> {
    return loadBooleans(ITEM_CODEX_KEY);
}

export function saveItemCodex(c: Record<string, boolean>): void {
    saveBooleans(ITEM_CODEX_KEY, c);
}

export function loadItemUsage(): Record<string, number> {
    return loadCounts(ITEM_USAGE_KEY);
}

export function saveItemUsage(u: Record<string, number>): void {
    saveCounts(ITEM_USAGE_KEY, u);
}

/**
 * 캠프 상자 — **자리마다 따로 적는다.**
 *
 * 자리(`slot`)는 그 브라우저에 앉은 사람이다. 한 화면 둘이서 할 때 두 사람이 같은
 * 브라우저를 쓰므로, 한 칸에 담으면 **둘의 상자가 한 벌**이 된다.
 *
 * 온라인에서는 **각자 제 브라우저의 0번**을 쓴다 — 손님에게도 제 상자는 「내 상자」
 * 하나여야 한다. 방장으로 놀 때와 손님으로 놀 때 딴 상자가 열리면 그건 상자가 둘인 것이다.
 * 손님의 상자가 방장의 브라우저로 넘어가지 않게 하는 것도 같은 규칙이다(`Rogue.tsx`).
 */
const CHEST_KEY = "rogue:chest:v1";

export function loadChest(slot: number): Item[] {
    try {
        const t = localStorage.getItem(`${CHEST_KEY}:${slot}`);
        const a = t ? JSON.parse(t) : [];
        // 남이 고쳐 넣을 수 있는 파일이다 — 물건의 모양을 갖춘 것만, 칸 수만큼만 받는다.
        if (!Array.isArray(a)) return [];
        return a
            .filter((it): it is Item => !!it && typeof it === "object" && typeof it.kind === "string" && typeof it.type === "string")
            .slice(0, CHEST_SLOTS);
    } catch {
        return [];
    }
}

export function saveChest(slot: number, chest: Item[]): void {
    try {
        localStorage.setItem(`${CHEST_KEY}:${slot}`, JSON.stringify(chest.slice(0, CHEST_SLOTS)));
    } catch {
        /* 못 적어도 이번 판은 굴러간다 */
    }
}

/** 지난 판의 소지 아이템 기록 */
export interface TombItem {
    id: number;
    kind: ItemKind;
    type: string;
    name: string;
    count: number;
    letter?: string;
    power?: string;
    equipped?: "weapon" | "armor" | "leftRing" | "rightRing";
    cursed?: boolean;
    charges?: number;
    plusHit?: number;
    plusDam?: number;
    plusArmor?: number;
    plusRing?: number;
}

/** 지난 판의 영웅 상세 스탯 및 장비/인벤토리 기록 */
export interface TombHero {
    origin?: HeroOrigin;
    /** 그 판에서 쓰던 이름 — 없으면(혼자 한 판) 직업만 적는다. 옛 기록에도 없다. */
    nick?: string;
    level: number;
    exp: number;
    hp: number;
    maxHp: number;
    str: number;
    maxStr: number;
    gold: number;
    defense: number;
    hasAmulet: boolean;
    weaponName?: string | null;
    armorName?: string | null;
    leftRingName?: string | null;
    rightRingName?: string | null;
    pack: TombItem[];
}

/** 죽고 이긴 기록 — 판을 넘어 남는다. */
export interface Tomb {
    at: number;
    depth: number;
    gold: number;
    turns: number;
    epitaph: string;
    won: boolean;
    /**
     * 증표를 들고 있었나.
     *
     * **살아 돌아온 것과 다르다** — 증표를 쥐고 1층까지 못 올라와 죽는 판이 있고, 그
     * 판도 점수에는 증표가 얹힌다(`score`). `won` 으로만 세면 그런 판이 무덤이 되는
     * 순간 만 점이 날아가서, 죽음 화면에 적힌 점수와 지난 판 목록의 점수가 달라진다.
     *
     * 옛 기록에는 이 칸이 없다. 없으면 `won` 으로 메운다 — 살아 돌아왔으면 반드시
     * 들고 있었고, 죽은 판은 알 길이 없으니 안 들었던 것으로 본다.
     */
    amulet?: boolean;
    score?: number;
    seed?: number;
    hero?: TombHero;
    recentLog?: string[];
}

const TOMB_KEY = "rogue:graves:v1";

export function tombItemOf(it: Item, hero: Hero): TombItem {
    let name = "";
    let power: string | undefined;

    const plusText = (n: number | undefined) => (n ? (n > 0 ? ` +${n}` : ` ${n}`) : "");
    const curseText = it.cursed ? " (저주)" : "";

    switch (it.kind) {
        case "gold":
            name = `금화 ${it.count}`;
            break;
        case "food":
            name = it.count > 1 ? `식량 ${it.count}개` : "식량";
            break;
        case "amulet":
            name = "옌더의 증표";
            power = "승리의 열쇠";
            break;
        case "gem": {
            const gemNames: Record<string, string> = {
                ruby: "불꽃의 루비",
                sapphire: "서리의 사파이어",
                emerald: "생명의 에메랄드",
                topaz: "수호의 토파즈",
            };
            name = gemNames[it.type] ?? "원소 보석";
            power = "소켓 세공용 보석";
            break;
        }
        case "relic": {
            const relicNames: Record<string, string> = {
                daedalus_compass: "다이달로스의 나침반",
                midas_gauntlet: "미다스의 건틀릿",
                time_hourglass: "시간의 모래시계",
                phoenix_feather: "불사조의 깃털",
            };
            name = relicNames[it.type] ?? "전설 유물";
            power = "고대 전설 유물";
            break;
        }
        case "potion":
            name = `${POTIONS[it.type]?.name ?? "이름 없는"} 물약`;
            break;
        case "scroll":
            name = `${SCROLLS[it.type]?.name ?? "이름 없는"} 주문서`;
            break;
        case "ring": {
            const base = `${RINGS[it.type]?.name ?? "이름 없는"} 반지`;
            name = `${base}${plusText(it.plusRing)}${curseText}`;
            if (it.type === "protection") {
                const n = it.plusRing ?? 0;
                power = `방어력 ${n > 0 ? "+" : ""}${n}`;
            } else if (it.type === "add strength") {
                const n = it.plusRing ?? 0;
                power = `힘 ${n > 0 ? "+" : ""}${n}`;
            } else if (it.type === "regeneration") {
                power = "체력 자연 회복";
            } else if (it.type === "slow digestion") {
                power = "소화 속도 둔화";
            } else if (it.type === "searching") {
                power = "비밀문/함정 탐색";
            } else if (it.type === "sustain strength") {
                power = "힘 보존";
            } else if (it.type === "teleportation") {
                power = "순간이동";
            } else if (it.type === "adornment") {
                power = "장식용";
            }
            break;
        }
        case "wand": {
            const base = `${WANDS[it.type]?.name ?? "이름 없는"} 지팡이`;
            name = base;
            power = `${it.charges ?? 0}회 남음`;
            break;
        }
        case "weapon": {
            const base = WEAPONS[it.type]?.name ?? "이름 없는 무기";
            const sock = it.socketGem ? ` [${it.socketGem === "ruby" ? "루비" : it.socketGem === "sapphire" ? "사파이어" : "에메랄드"}]` : "";
            name = `${base}${plusText(it.plusHit)}${sock}${curseText}`;
            const dam = weaponDamageOf(it);
            const plusDam = it.plusDam ? (it.plusDam > 0 ? `+${it.plusDam}` : `${it.plusDam}`) : "";
            power = `피해 ${dam}${plusDam}`;
            break;
        }
        case "armor": {
            const base = ARMORS[it.type]?.name ?? "이름 없는 갑옷";
            const sock = it.socketGem === "topaz" ? " [토파즈]" : "";
            name = `${base}${plusText(it.plusArmor)}${sock}${curseText}`;
            power = `방어력 ${defenseOf(armorClassOf(it))}`;
            break;
        }
    }

    let equipped: TombItem["equipped"];
    if (it.id === hero.weaponId) equipped = "weapon";
    else if (it.id === hero.armorId) equipped = "armor";
    else if (it.id === hero.leftRingId) equipped = "leftRing";
    else if (it.id === hero.rightRingId) equipped = "rightRing";

    return {
        id: it.id,
        kind: it.kind,
        type: it.type,
        name,
        count: it.count,
        letter: it.letter,
        power,
        equipped,
        cursed: it.cursed,
        charges: it.charges,
        plusHit: it.plusHit,
        plusDam: it.plusDam,
        plusArmor: it.plusArmor,
        plusRing: it.plusRing,
    };
}

export function createTombHero(hero: Hero): TombHero {
    const packItems = (hero.pack ?? []).map((it) => tombItemOf(it, hero));
    const weapon = packItems.find((p) => p.equipped === "weapon");
    const armor = packItems.find((p) => p.equipped === "armor");
    const leftRing = packItems.find((p) => p.equipped === "leftRing");
    const rightRing = packItems.find((p) => p.equipped === "rightRing");

    return {
        origin: hero.origin ?? "knight",
        // **적어 둘 때도 한 번 더 다듬는다** — 지난 판 목록은 저장 판과 다른 칸에 살아서
        // `normalize` 를 안 지난다.
        ...(cleanNick(hero.nick) ? { nick: cleanNick(hero.nick) } : {}),
        level: hero.level,
        exp: hero.exp,
        hp: hero.hp,
        maxHp: hero.maxHp,
        str: hero.str,
        maxStr: hero.maxStr,
        gold: hero.gold,
        defense: heroDefense(hero),
        hasAmulet: hero.hasAmulet,
        weaponName: weapon ? weapon.name : null,
        armorName: armor ? armor.name : null,
        leftRingName: leftRing ? leftRing.name : null,
        rightRingName: rightRing ? rightRing.name : null,
        pack: packItems,
    };
}

export function graves(): Tomb[] {
    try {
        const t = localStorage.getItem(TOMB_KEY);
        const arr = t ? (JSON.parse(t) as Tomb[]) : [];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

/**
 * 끝난 판을 지난 판 목록에 적고 **적힌 목록을 돌려준다.**
 *
 * 돌려주는 까닭은 하나다 — 죽음 화면이 「몇 등인가」를 세려면 **이번 판이 들어 있는**
 * 목록이 있어야 하는데, 적고 나서 다시 `graves()` 를 부르면 「이번 판이 벌써 들어갔
 * 는가」를 화면이 짐작해야 한다. 적은 쪽이 결과를 그대로 넘기면 그 짐작이 사라진다.
 * 적기에 실패해도(사파리 비공개 창 등) 목록은 돌려준다 — 이번 판의 등수는 나와야 한다.
 */
export function bury(state: GameState): Tomb[] {
    // 남기는 얼굴은 방장이되 **금화·증표·점수는 파티의 것**이다(`score` 한 자리에서 센다).
    // 여기서 다시 더하면 화면이 적는 점수와 무덤에 적힌 점수가 어느 날 갈린다.
    const tombHero = createTombHero(state.heroes[0]);
    const item: Tomb = {
        at: Date.now(),
        depth: state.deepest,
        gold: partyGold(state),
        turns: state.turn,
        epitaph: state.epitaph || (state.phase === "won" ? "던전을 탈출했다" : "던전에서 쓰러졌다"),
        won: state.phase === "won",
        amulet: partyAmulet(state),
        score: score(state),
        seed: state.seed,
        hero: tombHero,
        recentLog: (state.messages ?? []).slice(-10),
    };
    const list = [
        item,
        ...graves(),
    ].slice(0, 30);
    try {
        localStorage.setItem(TOMB_KEY, JSON.stringify(list));
    } catch {
        /* 못 적어도 판은 끝난다 */
    }
    return list;
}
