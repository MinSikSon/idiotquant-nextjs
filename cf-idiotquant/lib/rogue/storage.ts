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

import { MONSTERS } from "./monsters";
import { MAP_H, MAP_W, type GameState, type Item, type Level, type Monster } from "./types";

const KEY = "rogue:save:v1";

/**
 * 저장의 판(版).
 *
 * 값이 늘 때마다 올린다. 되읽는 쪽은 **옛 판도 받아서 빈 칸을 채워 준다**(`normalize`) —
 * 굴리던 판을 버리지 않기 위해서다.
 */
const VERSION = 3;

interface SavedMonster extends Omit<Monster, "def"> {
    ch: string;
}

interface SavedLevel extends Omit<Level, "tiles" | "flags" | "roomAt" | "monsters"> {
    tiles: number[];
    flags: number[];
    roomAt: number[];
    monsters: SavedMonster[];
}

interface Saved extends Omit<GameState, "level" | "levels"> {
    level: SavedLevel;
    /** 지나온 층들. v2 이하의 저장에는 없다. */
    levels?: Record<string, SavedLevel>;
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

    return {
        depth: num(raw.depth, fallbackDepth),
        tiles: new Uint8Array(tiles),
        // 길이가 어긋난 것은 통째로 새로 만든다 — 반쯤 맞는 기억은 없는 것만 못하다.
        flags: new Uint8Array(
            flags.length === tiles.length ? flags : (new Array<number>(tiles.length).fill(0)),
        ),
        roomAt: new Int8Array(
            roomAt.length === tiles.length ? roomAt : (new Array<number>(tiles.length).fill(-1)),
        ),
        rooms: Array.isArray(raw.rooms) ? raw.rooms : [],
        monsters: (Array.isArray(raw.monsters) ? raw.monsters : []).map(({ ch, ...rest }) => ({
            ...rest,
            def: MONSTERS[ch] ?? MONSTERS.B,
            speed: num((rest as Partial<Monster>).speed, 0),
            cancelled: (rest as Partial<Monster>).cancelled === true,
        })),
        items: Array.isArray(raw.items) ? raw.items : [],
        traps: Array.isArray(raw.traps) ? raw.traps : [],
        stairs: raw.stairs ?? { x: 0, y: 0 },
        upStairs: raw.upStairs ?? null,
        maze: raw.maze === true,
    };
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
    if (!s.level || !s.hero) return null;

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

    const h = s.hero;
    const hero: GameState["hero"] = {
        ...h,
        maxStr: num(h.maxStr, num(h.str, 16)),
        pack: fixLetters(Array.isArray(h.pack) ? h.pack : []),
        leftRingId: h.leftRingId ?? null,
        rightRingId: h.rightRingId ?? null,
        blind: num(h.blind, 0),
        confused: num(h.confused, 0),
        asleep: num(h.asleep, 0),
        stuck: num(h.stuck, 0),
        detect: num(h.detect, 0),
    };

    return {
        ...(s as unknown as GameState),
        level,
        levels,
        hero,
        messages: Array.isArray(s.messages) ? s.messages : [],
        appearance: s.appearance && typeof s.appearance === "object" ? s.appearance : {},
        known: s.known && typeof s.known === "object" ? s.known : {},
        bestiary: s.bestiary && typeof s.bestiary === "object" ? s.bestiary : {},
        nextItemId: num(s.nextItemId, 1),
        turn: num(s.turn, 0),
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

export function loadBestiary(): Record<string, number> {
    try {
        const t = localStorage.getItem(BESTIARY_KEY);
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

export function saveBestiary(b: Record<string, number>): void {
    try {
        localStorage.setItem(BESTIARY_KEY, JSON.stringify(b));
    } catch {
        /* 못 적어도 이번 판은 굴러간다 */
    }
}

/** 죽고 이긴 기록 — 판을 넘어 남는다. */
export interface Tomb {
    at: number;
    depth: number;
    gold: number;
    turns: number;
    epitaph: string;
    won: boolean;
}

const TOMB_KEY = "rogue:graves:v1";

export function graves(): Tomb[] {
    try {
        const t = localStorage.getItem(TOMB_KEY);
        const arr = t ? (JSON.parse(t) as Tomb[]) : [];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

export function bury(state: GameState): void {
    try {
        const list = graves();
        list.unshift({
            at: Date.now(),
            depth: state.deepest,
            gold: state.hero.gold,
            turns: state.turn,
            epitaph: state.epitaph,
            won: state.phase === "won",
        });
        localStorage.setItem(TOMB_KEY, JSON.stringify(list.slice(0, 30)));
    } catch {
        /* 못 적어도 판은 끝난다 */
    }
}
