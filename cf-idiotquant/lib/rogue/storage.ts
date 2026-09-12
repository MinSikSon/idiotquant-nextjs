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

export function clear(): void {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* 지울 수 없어도 새 판은 시작된다 */
    }
}

/** 죽고 이긴 기록 — **판을 넘어 남는 유일한 것**이다. */
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
