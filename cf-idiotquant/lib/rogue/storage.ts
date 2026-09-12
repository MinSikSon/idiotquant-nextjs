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
import type { GameState, Level, Monster } from "./types";

const KEY = "rogue:save:v1";

interface SavedMonster extends Omit<Monster, "def"> {
    ch: string;
}

interface SavedLevel extends Omit<Level, "tiles" | "flags" | "roomAt" | "monsters"> {
    tiles: number[];
    flags: number[];
    roomAt: number[];
    monsters: SavedMonster[];
}

interface Saved extends Omit<GameState, "level"> {
    level: SavedLevel;
    v: 1;
}

export function serialize(state: GameState): string {
    const { level } = state;
    const saved: Saved = {
        ...state,
        v: 1,
        level: {
            ...level,
            tiles: Array.from(level.tiles),
            flags: Array.from(level.flags),
            roomAt: Array.from(level.roomAt),
            monsters: level.monsters.map(({ def, ...rest }) => ({ ...rest, ch: def.ch })),
        },
    };
    return JSON.stringify(saved);
}

export function deserialize(text: string): GameState | null {
    try {
        const s = JSON.parse(text) as Saved;
        if (s?.v !== 1 || !s.level || !s.hero) return null;
        const level: Level = {
            ...s.level,
            tiles: new Uint8Array(s.level.tiles),
            flags: new Uint8Array(s.level.flags),
            roomAt: new Int8Array(s.level.roomAt),
            monsters: s.level.monsters.map(({ ch, ...rest }) => ({
                ...rest,
                def: MONSTERS[ch] ?? MONSTERS.B,
            })),
        };
        return { ...(s as unknown as GameState), level };
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
