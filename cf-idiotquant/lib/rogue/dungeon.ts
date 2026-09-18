/**
 * 층 만들기 — Rogue 원작의 방식 그대로.
 *
 * 화면을 3×3 칸으로 나누고 칸마다 방을 하나 놓는다. 깊이 들어갈수록 몇몇 칸은
 * **「없는 방」**(방 대신 복도의 교차점 한 칸)이 된다. 그다음 이웃한 칸끼리 꺾인
 * 복도로 잇는데, **먼저 전부 이어질 만큼만 잇고**(신장 트리) 그 위에 몇 개를 더한다 —
 * 그래야 갈림길이 생기면서도 못 가는 방이 없다.
 *
 * **모든 방이 이어져야 한다.** 하나라도 끊기면 화면은 멀쩡한데 그 층은 못 깨는 층이
 * 되고, 계단이 거기 있으면 판이 죽는다. `test/rogue-dungeon.test.ts` 가 그것을 건다.
 *
 * 방 고르기와 잇기는 전부 `Rng` 를 지난다 — 같은 시드는 같은 층이어야 다시 볼 수 있다.
 */

import { type Category } from "./items";
import {
    Rng,
} from "./rng";
import {
    type Level,
    type Trap,
    type TrapKind,
    MAP_H,
    MAP_W,
    type Pos,
    type Room,
    type SpecialKind,
    T,
    type Tile,
    idx,
    inBounds,
    walkable,
} from "./types";

const COLS = 3;
const ROWS = 3;

/*
 * 물건이 **어디에 몇 개** 놓이나 — 손잡이는 전부 여기 있다.
 * 기획과 값이 같아야 한다: `app/(game)/game/DROP-CODEX.md` §5.
 */
/** 이 장단비까지는 안 깎는다 — 이 생성기의 방은 중앙값이 이미 3.0 이다. */
const ASPECT_FREE = 2.5;
/** 회랑 감쇠의 세기. */
const ASPECT_K = 0.15;
/** 실효 면적 → 가중치의 지수. 제곱근(0.5)과 선형(1.0) 사이. */
const AREA_GAMMA = 0.85;
/** 방 하나가 가질 수 있는 가중치의 천장. */
const AREA_CAP = 32;
/** 층 쿼터 = BASE + SLOPE·√깊이, 흔들림 ±1, 상하한 사이. */
const QUOTA_BASE = 2.2;
const QUOTA_SLOPE = 0.45;
const QUOTA_MIN = 2;
const QUOTA_MAX = 7;
/** 한 방에 놓이는 물건의 최대. */
const ROOM_ITEM_CAP = 3;

/**
 * 특수 방 — 3층부터, 깊을수록 잦다. 넓고 **문이 하나뿐인** 방만 후보다.
 *
 * **이 확률은 「후보가 있는 층」에만 건다.** 기획서는 이 값을 층 전체의 확률로 적었는데,
 * 재 보니 조건에 맞는 방이 있는 층이 **24.2%뿐**이라 그대로 넣으면 0.25 가 실제로는
 * 0.06 이 된다 — 26층을 다 돌아도 특수 방을 한 번 볼까 말까다. 그래서 굴림을 후보가
 * 있을 때로 옮기고 값을 그만큼 올렸다. 층 전체로 보면 기획서가 노린 20% 언저리가 된다.
 */
const SPECIAL_MIN_DEPTH = 3;
const SPECIAL_SLOPE = 0.1;
const SPECIAL_MAX_CHANCE = 0.85;
const SPECIAL_MIN_AREA = 20;

/** 칸의 경계 — 마지막 칸이 나머지를 먹는다. */
function cellBounds(ci: number) {
    const col = ci % COLS;
    const row = Math.floor(ci / COLS);
    const cw = Math.floor(MAP_W / COLS);
    const ch = Math.floor(MAP_H / ROWS);
    return {
        x: col * cw,
        y: row * ch,
        w: col === COLS - 1 ? MAP_W - cw * (COLS - 1) : cw,
        h: row === ROWS - 1 ? MAP_H - ch * (ROWS - 1) : ch,
    };
}

function put(tiles: Uint8Array, x: number, y: number, t: Tile) {
    if (inBounds(x, y)) tiles[idx(x, y)] = t;
}

function get(tiles: Uint8Array, x: number, y: number): Tile {
    return inBounds(x, y) ? (tiles[idx(x, y)] as Tile) : T.ROCK;
}

/** 방 하나를 찍는다 — 테두리는 벽, 안쪽은 바닥. */
function carveRoom(tiles: Uint8Array, roomAt: Int8Array, r: Room, ri: number) {
    if (r.gone) {
        put(tiles, r.x, r.y, T.PASSAGE);
        return;
    }
    for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
            const edgeTop = y === r.y;
            const edgeBottom = y === r.y + r.h - 1;
            const edgeLeft = x === r.x;
            const edgeRight = x === r.x + r.w - 1;
            if (edgeTop || edgeBottom) put(tiles, x, y, T.WALL_H);
            else if (edgeLeft || edgeRight) put(tiles, x, y, T.WALL_V);
            else {
                put(tiles, x, y, T.FLOOR);
                roomAt[idx(x, y)] = ri;
            }
        }
    }
}

/**
 * 방 안쪽을 미로로 바꾼다.
 *
 * 되추적(recursive backtracker) 하나면 **반드시 하나로 이어진 미로**가 나온다 — 그래서
 * 안쪽에 갇히는 칸이 안 생긴다. 문에서 미로로 들어가는 길은 `linkDoorToMaze` 가 판다.
 *
 * 칸은 **홀수 자리**에만 선다(벽을 한 칸씩 남겨야 미로가 미로다). 그래서 안쪽이
 * 최소 3×3 은 되어야 하고, 그보다 좁으면 그냥 방으로 둔다.
 */
function carveMaze(tiles: Uint8Array, roomAt: Int8Array, r: Room, rng: Rng) {
    const x0 = r.x + 1;
    const y0 = r.y + 1;
    const w = r.w - 2;
    const h = r.h - 2;
    if (w < 3 || h < 3) return false;

    // 안쪽을 통째로 되돌린 뒤 미로를 판다. 방이었던 표시(roomAt)도 지운다 —
    // 미로는 방이 아니므로 「밝은 방은 통째로 보인다」가 걸리면 안 된다.
    for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
            put(tiles, x, y, T.ROCK);
            roomAt[idx(x, y)] = -1;
        }
    }

    const cols = Math.floor((w + 1) / 2);
    const rows = Math.floor((h + 1) / 2);
    const cellX = (c: number) => x0 + c * 2;
    const cellY = (c: number) => y0 + c * 2;
    const seen = new Uint8Array(cols * rows);

    const stack: { c: number; r: number }[] = [{ c: rng.rnd(cols), r: rng.rnd(rows) }];
    seen[stack[0].r * cols + stack[0].c] = 1;
    put(tiles, cellX(stack[0].c), cellY(stack[0].r), T.CORRIDOR);

    while (stack.length) {
        const cur = stack[stack.length - 1];
        const nbrs = rng.shuffle([
            { c: cur.c + 1, r: cur.r },
            { c: cur.c - 1, r: cur.r },
            { c: cur.c, r: cur.r + 1 },
            { c: cur.c, r: cur.r - 1 },
        ]).filter((n) => n.c >= 0 && n.r >= 0 && n.c < cols && n.r < rows && !seen[n.r * cols + n.c]);

        if (nbrs.length === 0) {
            stack.pop();
            continue;
        }
        const n = nbrs[0];
        seen[n.r * cols + n.c] = 1;
        // 두 칸 사이의 벽을 튼다.
        put(tiles, (cellX(cur.c) + cellX(n.c)) / 2, (cellY(cur.r) + cellY(n.r)) / 2, T.CORRIDOR);
        put(tiles, cellX(n.c), cellY(n.r), T.CORRIDOR);
        stack.push(n);
    }
    return true;
}

/**
 * 문에서 미로 안으로 파고든다.
 *
 * 미로의 칸은 홀수 자리에만 있으므로 문이 짝수 자리에 나면 **문 바로 안쪽이 벽**이다.
 * 안 뚫으면 그 문은 벽을 마주 본 채 서 있고, 그 방으로 들어갈 길이 사라진다.
 */
function linkDoorToMaze(tiles: Uint8Array, r: Room, door: Pos) {
    const dx = door.x === r.x ? 1 : door.x === r.x + r.w - 1 ? -1 : 0;
    const dy = door.y === r.y ? 1 : door.y === r.y + r.h - 1 ? -1 : 0;
    if (!dx && !dy) return; // 이 방의 벽에 난 문이 아니다
    let x = door.x + dx;
    let y = door.y + dy;
    // **이 방 안쪽에서만 판다.** 안 막으면 미로에 닿지 못한 파기가 방을 뚫고 나가
    // 옆 방 한가운데에 통로를 그린다 — 방 안에 `#` 이 지나가는 그 자리다.
    const inside = (px: number, py: number) =>
        px > r.x && px < r.x + r.w - 1 && py > r.y && py < r.y + r.h - 1;
    while (inBounds(x, y) && inside(x, y)) {
        if (get(tiles, x, y) === T.CORRIDOR) return; // 미로에 닿았다
        put(tiles, x, y, T.CORRIDOR);
        x += dx;
        y += dy;
    }
}

/** 바위에만 복도를 판다 — 이미 바닥이나 문인 자리는 건드리지 않는다. */
function digCorridor(tiles: Uint8Array, x: number, y: number) {
    if (!inBounds(x, y)) return;
    if (get(tiles, x, y) === T.ROCK) put(tiles, x, y, T.CORRIDOR);
}

function digLine(tiles: Uint8Array, from: Pos, to: Pos) {
    if (from.x === to.x) {
        const step = to.y >= from.y ? 1 : -1;
        for (let y = from.y; y !== to.y + step; y += step) digCorridor(tiles, from.x, y);
    } else {
        const step = to.x >= from.x ? 1 : -1;
        for (let x = from.x; x !== to.x + step; x += step) digCorridor(tiles, x, from.y);
    }
}

/**
 * 꺾인 복도 하나. 가로면 가운데에서 위아래로 꺾고, 세로면 그 반대다.
 */
function connect(tiles: Uint8Array, a: Pos, b: Pos, horizontal: boolean, rng: Rng) {
    const pick = (lo: number, hi: number) =>
        hi - lo >= 2 ? rng.between(lo + 1, hi - 1) : lo === hi ? lo : rng.between(lo, hi);
    if (horizontal) {
        const lo = Math.min(a.x, b.x);
        const hi = Math.max(a.x, b.x);
        const mid = pick(lo, hi);
        digLine(tiles, a, { x: mid, y: a.y });
        digLine(tiles, { x: mid, y: a.y }, { x: mid, y: b.y });
        digLine(tiles, { x: mid, y: b.y }, b);
    } else {
        const lo = Math.min(a.y, b.y);
        const hi = Math.max(a.y, b.y);
        const mid = pick(lo, hi);
        digLine(tiles, a, { x: a.x, y: mid });
        digLine(tiles, { x: a.x, y: mid }, { x: b.x, y: mid });
        digLine(tiles, { x: b.x, y: mid }, b);
    }
}

/**
 * 방과 방을 **최단 거리**로 잇는다.
 *
 * 가로로 이웃한 방이면 Y 좌표 겹침 구간에서 일직선 직통(최단 직선)으로 잇고,
 * 겹침이 없으면 가장 가까운 Y 좌표를 골라 Manhattan 최단 경로로 연결한다.
 * 세로로 이웃한 방도 마찬가지로 X 좌표 겹침 시 일직선 직통으로 연결한다.
 * 통로는 항상 양쪽 방의 문(또는 없는 방 중심)을 확실히 잇는다.
 */
function connectRoomsShortest(
    tiles: Uint8Array,
    ra: Room,
    rb: Room,
    horizontal: boolean,
    rng: Rng,
): { doorA: Pos | null; doorB: Pos | null; startA: Pos; startB: Pos } {
    if (horizontal) {
        const yMinA = ra.gone ? ra.y : ra.y + 1;
        const yMaxA = ra.gone ? ra.y : ra.y + ra.h - 2;
        const yMinB = rb.gone ? rb.y : rb.y + 1;
        const yMaxB = rb.gone ? rb.y : rb.y + rb.h - 2;

        const overlapMin = Math.max(yMinA, yMinB);
        const overlapMax = Math.min(yMaxA, yMaxB);

        let yA: number;
        let yB: number;
        if (overlapMin <= overlapMax) {
            const y = rng.between(overlapMin, overlapMax);
            yA = y;
            yB = y;
        } else if (yMaxA < yMinB) {
            yA = yMaxA;
            yB = yMinB;
        } else {
            yA = yMinA;
            yB = yMaxB;
        }

        const doorA = ra.gone ? null : { x: ra.x + ra.w - 1, y: yA };
        const startA = ra.gone ? { x: ra.x, y: ra.y } : { x: ra.x + ra.w, y: yA };
        const doorB = rb.gone ? null : { x: rb.x, y: yB };
        const startB = rb.gone ? { x: rb.x, y: rb.y } : { x: rb.x - 1, y: yB };

        if (yA === yB) {
            digLine(tiles, startA, startB);
        } else {
            connect(tiles, startA, startB, true, rng);
        }

        return { doorA, doorB, startA, startB };
    } else {
        const xMinA = ra.gone ? ra.x : ra.x + 1;
        const xMaxA = ra.gone ? ra.x : ra.x + ra.w - 2;
        const xMinB = rb.gone ? rb.x : rb.x + 1;
        const xMaxB = rb.gone ? rb.x : rb.x + rb.w - 2;

        const overlapMin = Math.max(xMinA, xMinB);
        const overlapMax = Math.min(xMaxA, xMaxB);

        let xA: number;
        let xB: number;
        if (overlapMin <= overlapMax) {
            const x = rng.between(overlapMin, overlapMax);
            xA = x;
            xB = x;
        } else if (xMaxA < xMinB) {
            xA = xMaxA;
            xB = xMinB;
        } else {
            xA = xMinA;
            xB = xMaxB;
        }

        const doorA = ra.gone ? null : { x: xA, y: ra.y + ra.h - 1 };
        const startA = ra.gone ? { x: ra.x, y: ra.y } : { x: xA, y: ra.y + ra.h };
        const doorB = rb.gone ? null : { x: xB, y: rb.y };
        const startB = rb.gone ? { x: rb.x, y: rb.y } : { x: xB, y: rb.y - 1 };

        if (xA === xB) {
            digLine(tiles, startA, startB);
        } else {
            connect(tiles, startA, startB, false, rng);
        }

        return { doorA, doorB, startA, startB };
    }
}


const N4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** 「없는 방」의 그 한 점인가 — 방은 방이라, 길 하나만 물고 있어도 지우면 안 된다. */
function isGoneAnchor(rooms: Room[], x: number, y: number): boolean {
    return rooms.some((r) => r.gone && r.x === x && r.y === y);
}

/** 미로 방의 사각형 안인가 — 벽까지 친다. 구멍을 뚫으면 안 되는 자리다. */
function inMazeRoom(rooms: Room[], x: number, y: number): boolean {
    return rooms.some(
        (r) => r.maze && !r.gone && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h,
    );
}

/**
 * 미로 **안쪽**인가 — 벽은 뺀다.
 *
 * 막다른 길을 되메울 때 쓴다. 미로의 안쪽은 막다른 길로 이루어진 것이라 건드리면
 * 통째로 풀리지만, **벽 위에 얹힌 복도 토막은 미로가 아니다.** 사각형째로 지켜 주면
 * 그 토막이 영영 안 떼어진다 — 실제로 막다른 길 96 개 중 60 개가 이 자리였다.
 */
function inMazeInterior(rooms: Room[], x: number, y: number): boolean {
    return rooms.some(
        (r) => r.maze && !r.gone && x > r.x && x < r.x + r.w - 1 && y > r.y && y < r.y + r.h - 1,
    );
}

function openNbrs(tiles: Uint8Array, x: number, y: number): number {
    return N4.filter(([dx, dy]) => inBounds(x + dx, y + dy) && walkable(get(tiles, x + dx, y + dy) as Tile)).length;
}

/**
 * 대각으로만 이어진 복도를 **직각으로 잇는다.**
 *
 * 꺾이는 자리에서 두 조각이 대각선으로만 맞닿는 일이 드물게 난다. 걸어서 지나갈 수는
 * 있지만(대각선 이동이 되므로) **화면에서는 길이 끊겨 보인다.** 사이의 바위 한 칸을
 * 뚫어 준다.
 */
function joinDiagonals(tiles: Uint8Array, rooms: Room[]) {
    for (let y = 1; y < MAP_H - 1; y++) {
        for (let x = 1; x < MAP_W - 1; x++) {
            if (get(tiles, x, y) !== T.CORRIDOR) continue;
            if (inMazeRoom(rooms, x, y)) continue;
            for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as [number, number][]) {
                if (get(tiles, x + dx, y + dy) !== T.CORRIDOR) continue;
                if (walkable(get(tiles, x + dx, y) as Tile) || walkable(get(tiles, x, y + dy) as Tile)) continue;
                // 둘 다 바위일 때만 뚫는다 — 방 벽을 뚫으면 문 없는 구멍이 난다.
                if (get(tiles, x + dx, y) === T.ROCK) put(tiles, x + dx, y, T.CORRIDOR);
                else if (get(tiles, x, y + dy) === T.ROCK) put(tiles, x, y + dy, T.CORRIDOR);
            }
        }
    }
}

/**
 * **막다른 복도를 되메운다.**
 *
 * 복도는 곧은 선 셋으로 파는데, 그 선이 남의 방을 가로지르면 방 안쪽은 안 파이고
 * (`digCorridor` 가 바위만 판다) **양쪽 끄트머리만 남는다.** 그러면 화면에서는 길이
 * 방 벽에 부딪혀 끊긴 것처럼 보인다 — 팔백 층에 열다섯 자리였다.
 *
 * 잎사귀(이웃이 하나뿐인 칸)만 떼므로 **이어진 것을 끊을 수 없다.** 더 뗄 것이
 * 없을 때까지 되풀이한다.
 *
 * **비밀문에 닿은 끝은 안 뗀다** — 그건 못 찾은 지름길이지 잘못 파인 길이 아니다.
 */
function pruneDeadEnds(tiles: Uint8Array, rooms: Room[]): void {
    // 파는 선이 지도 폭을 넘을 수 없으므로 이 횟수 안에 반드시 멎는다.
    for (let pass = 0; pass < MAP_W; pass++) {
        let removed = 0;
        // **지도 가장자리까지 훑는다.** 예전에는 `1 … MAP_W−2` 만 봐서 맨 끝 줄·칸에
        // 남은 토막이 영영 안 떼어졌다. 방은 가장자리에 안 서므로(칸 경계가 그렇게
        // 잡힌다) 여기서 뗄 수 있는 것은 복도뿐이고, 잎사귀만 떼니 안전하다.
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                const t = get(tiles, x, y);
                if (t !== T.CORRIDOR && t !== T.PASSAGE) continue;
                // **미로 안은 건드리지 않는다.** 미로는 막다른 길로 이루어진 것이라,
                // 여기서 잎사귀를 떼기 시작하면 미로가 통째로 풀려 사라진다.
                // 다만 **벽 위에 얹힌 토막은 미로가 아니다** — 안쪽만 지킨다.
                if (inMazeInterior(rooms, x, y)) continue;
                // 「없는 방」은 방이다. 길을 하나만 물고 있어도 지우면 그 방이 지도에서
                // 사라지고, 「모든 방이 이어진다」가 깨진다.
                if (isGoneAnchor(rooms, x, y)) continue;
                if (openNbrs(tiles, x, y) > 1) continue;
                if (N4.some(([dx, dy]) => get(tiles, x + dx, y + dy) === T.SECRET)) continue;
                put(tiles, x, y, T.ROCK);
                removed++;
            }
        }
        if (removed === 0) break;
    }
}

/** 이을 후보 — 3×3 격자에서 가로로 이웃하거나 세로로 이웃한 칸 쌍. */
function cellEdges(): { a: number; b: number; horizontal: boolean }[] {
    const out: { a: number; b: number; horizontal: boolean }[] = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const i = r * COLS + c;
            if (c + 1 < COLS) out.push({ a: i, b: i + 1, horizontal: true });
            if (r + 1 < ROWS) out.push({ a: i, b: i + COLS, horizontal: false });
        }
    }
    return out;
}

class Uf {
    private p: number[];
    constructor(n: number) {
        this.p = Array.from({ length: n }, (_, i) => i);
    }
    find(i: number): number {
        while (this.p[i] !== i) i = this.p[i] = this.p[this.p[i]];
        return i;
    }
    union(a: number, b: number): boolean {
        const ra = this.find(a);
        const rb = this.find(b);
        if (ra === rb) return false;
        this.p[ra] = rb;
        return true;
    }
}

/** 방 안쪽의 아무 칸. 없는 방이면 그 점. */
export function randomSpotIn(r: Room, rng: Rng): Pos {
    if (r.gone) return { x: r.x, y: r.y };
    return {
        x: rng.between(r.x + 1, r.x + r.w - 2),
        y: rng.between(r.y + 1, r.y + r.h - 2),
    };
}

/** 방 안쪽의 칸 수 — 벽을 뺀 직사각형의 넓이. 「없는 방」은 한 칸이다. */
export function roomArea(r: Room): number {
    return r.gone ? 1 : Math.max(1, (r.w - 2) * (r.h - 2));
}

/**
 * **장단비 감쇠** — 긴 회랑은 넓이만큼 값을 안 쳐 준다.
 *
 * 14×1 짜리 통로는 안쪽이 14칸이라 4×4 방(16칸)과 맞먹는데, 걸어 들어가 둘러보는
 * 맛은 전혀 다르다. 그래서 길쭉할수록 깎는다.
 *
 * **다만 기준점이 1 이 아니다.** 이 생성기가 만드는 방은 장단비 **중앙값이 이미 3.0**
 * 이라(가로 4~16, 세로 3~7), ρ>1 부터 깎으면 거의 모든 방이 깎인다. 그건 감쇠가 아니라
 * 그냥 전체를 줄이는 것이다. 「정상」의 끝을 2.5 로 두고 그 위부터 뺀다.
 */
export function shapeFactor(a: number, b: number): number {
    const lo = Math.max(1, Math.min(a, b));
    const rho = Math.max(1, Math.max(a, b)) / lo;
    return 1 / (1 + ASPECT_K * Math.max(0, rho - ASPECT_FREE));
}

/**
 * **실효 면적** — 실제로 걸을 수 있는 칸 수에 회랑 감쇠를 먹인 값.
 *
 * 직사각형 넓이가 아니라 **칸을 센다.** 미로 방은 안쪽이 통로로 파여 절반쯤만 남는데,
 * 그걸 직사각형으로 세면 미로 방에 물건이 두 배로 몰린다.
 */
export function effectiveArea(level: Level, r: Room): number {
    if (r.gone) return 1;
    let n = 0;
    for (let y = r.y + 1; y <= r.y + r.h - 2; y++) {
        for (let x = r.x + 1; x <= r.x + r.w - 2; x++) {
            if (walkable(level.tiles[idx(x, y)] as Tile)) n++;
        }
    }
    if (n === 0) return 1;
    return n * shapeFactor(r.w - 2, r.h - 2);
}

/**
 * 방의 **가중치** — 물건을 나눠 줄 때의 몫.
 *
 * 예전에는 `rng.pick` 으로 고르게 뽑았고(방 하나가 크든 작든 한 몫), 그다음에는 넓이에
 * **곧이곧대로 비례**시켰다. 비례는 넓은 방이 자주 비던 것을 고쳤지만, 20×20 같은 홀이
 * 들어오면 그 방이 층을 통째로 먹는다.
 *
 * 그래서 지수 `0.85` 로 **누르고**(제곱근 0.5 와 선형 1.0 사이다) 상한에서 **꺾는다.**
 * 지금 생성기의 최대 방(실효 65칸 → 34.8)이 겨우 상한에 닿으므로, 상한은 현행 범위의
 * 맨 끝에서만 문다 — 더 큰 방이 생기는 날을 위한 자물쇠다.
 */
export function roomWeight(level: Level, r: Room): number {
    return Math.min(Math.pow(effectiveArea(level, r), AREA_GAMMA), AREA_CAP);
}

/** 가중치 표를 태워 하나 고른다. */
function pickWeighted(rooms: Room[], weights: number[], rng: Rng): Room | undefined {
    if (rooms.length === 0) return undefined;
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return rooms[rng.rnd(rooms.length)];
    // `rnd` 는 정수라 소수 가중치를 못 태운다 — 천 배로 늘려 센다.
    let n = rng.rnd(Math.max(1, Math.round(total * 1000)));
    for (let i = 0; i < rooms.length; i++) {
        n -= Math.round(weights[i] * 1000);
        if (n < 0) return rooms[i];
    }
    return rooms[rooms.length - 1];
}

/** 무엇도 놓이지 않은 빈 바닥을 찾는다. 못 찾으면 아무 자리나 준다. */
export function freeSpot(level: Level, rng: Rng, avoid: Pos[] = []): Pos {
    const real = level.rooms.filter((r) => !r.gone);
    const weights = real.map((r) => roomWeight(level, r));
    for (let tries = 0; tries < 200; tries++) {
        const room = pickWeighted(real, weights, rng) ?? level.rooms[0];
        const p = randomSpotIn(room, rng);
        if (!walkable(level.tiles[idx(p.x, p.y)] as Tile)) continue;
        if (avoid.some((q) => q.x === p.x && q.y === p.y)) continue;
        if (level.monsters.some((m) => m.x === p.x && m.y === p.y)) continue;
        if (level.items.some((it) => it.x === p.x && it.y === p.y)) continue;
        return p;
    }
    // 이백 번을 굴려도 못 찾았다 — 미로 방뿐인 층에서는 드물지 않다. 그때 아무 칸이나
    // 내주면 **바위 속에 물건이나 계단이 박힌다.** 걸어갈 수 있는 칸을 훑어서 준다.
    for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
            if (!walkable(level.tiles[idx(x, y)] as Tile)) continue;
            if (avoid.some((q) => q.x === x && q.y === y)) continue;
            return { x, y };
        }
    }
    // 걸어갈 칸이 하나도 없는 층은 만들어질 수 없다 — 여기 오면 층 만들기가 깨진 것이다.
    return { x: level.rooms[0].x + 1, y: level.rooms[0].y + 1 };
}

/**
 * 이 층에 물건을 **몇 개** 놓나.
 *
 * 깊이를 제곱근으로 탄다 — 깊을수록 위험이 커지는데 보상이 그대로면 내려갈 까닭이 준다.
 * 다만 선형으로 늘리면 바닥층이 창고가 되므로 완만하게만 올린다(1층 3개 → 26층 4~5개).
 */
export function floorQuota(depth: number, rng: Rng): number {
    const base = Math.round(QUOTA_BASE + QUOTA_SLOPE * Math.sqrt(Math.max(1, depth)));
    const jitter = [-1, 0, 0, 1][rng.rnd(4)];
    return Math.max(QUOTA_MIN, Math.min(QUOTA_MAX, base + jitter));
}

/** 두 칸이 서로 붙어 있나 — 대각도 붙은 것으로 센다. */
function touching(a: Pos, b: Pos): boolean {
    return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
}

/** 그 방 안에서 실제로 놓을 수 있는 칸들 — 이미 찬 자리와 피할 자리를 뺀다. */
/**
 * 특수 방 — **새로 만들지 않고 이미 생긴 방 중에서 고른다.**
 *
 * 생성기를 안 건드리는 것이 이 설계의 값이다. 방의 모양은 그대로 두고 **무엇이 놓이는지**만
 * 바꾼다 — 그래서 「층은 반드시 다 이어져야 한다」도, 막다른 길 규칙도 하나도 안 흔들린다.
 *
 * `bias` 는 분류 가중치에 곱한다. `monsters` 는 그 방에 설 놈의 배수다.
 */
export const SPECIAL_ROOMS: Record<
    SpecialKind,
    { name: string; kappa: number; bias: Partial<Record<Category, number>>; monsters: number; awake: boolean }
> = {
    // 금화와 반지가 쌓여 있고 **지키는 놈들이 깨어 있다.** 식량은 없다 — 보물방이
    // 「먹을 것도 주는 방」이면 위험을 무릅쓸 까닭이 두 겹이 되어 저울이 흐려진다.
    treasure: { name: "보물방", kappa: 2.0, bias: { gold: 3, ring: 2, food: 0 }, monsters: 2, awake: true },
    // 장비만 나온다. 등급도 두 칸 위 — 무기고에서 단검이 나오면 무기고가 아니다.
    armory: {
        name: "무기고",
        kappa: 1.8,
        bias: { weapon: 4, armor: 4, gold: 0.3, potion: 0.3, scroll: 0.3, food: 0.3, enchant: 0.3, ring: 0.3, wand: 0.3 },
        monsters: 1,
        awake: false,
    },
    // 소모품 창고. 지키는 놈이 적은 대신 주는 것도 조용하다.
    store: { name: "창고", kappa: 1.5, bias: { potion: 3, scroll: 3 }, monsters: 0.5, awake: false },
    // 제단은 **몫이 작다**(κ 0.5). 대신 나오는 것이 강화라 값이 다르다 — 그리고 모루가
    // 여기 선다. 물건 수로 보면 손해인 방인데 그래서 「찾아 들어갈 값이 있나」가 갈린다.
    altar: { name: "제단", kappa: 0.5, bias: { enchant: 3 }, monsters: 1, awake: false },
};

/** 그 방의 문이 몇 개인가 — **비밀문도 문이다**(찾으면 열린다). */
function doorCount(level: Level, r: Room): number {
    if (r.gone) return 0;
    let n = 0;
    for (let x = r.x; x < r.x + r.w; x++) {
        for (const y of [r.y, r.y + r.h - 1]) {
            const t = level.tiles[idx(x, y)];
            if (t === T.DOOR || t === T.SECRET) n++;
        }
    }
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) {
        for (const x of [r.x, r.x + r.w - 1]) {
            const t = level.tiles[idx(x, y)];
            if (t === T.DOOR || t === T.SECRET) n++;
        }
    }
    return n;
}

/**
 * 이 층에 특수 방이 서는가, 선다면 어디에 무엇이.
 *
 * **문이 정확히 하나**인 것이 핵심 조건이다 — 들어가면 나오는 길이 하나라, 위험과
 * 보상이 같은 자리에 선다. 계단이 있는 방은 뺀다(지나는 길에 공짜로 얻게 된다).
 */
export function pickSpecialRoom(
    level: Level,
    depth: number,
    rng: Rng,
): { room: number; kind: SpecialKind } | null {
    if (depth < SPECIAL_MIN_DEPTH) return null;

    const has = (r: Room, p: Pos | null) =>
        !!p && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
    const fits = level.rooms
        .map((r, i) => ({ r, i }))
        .filter(
            ({ r }) =>
                !r.gone &&
                !r.maze &&
                effectiveArea(level, r) >= SPECIAL_MIN_AREA &&
                doorCount(level, r) === 1 &&
                !has(r, level.stairs) &&
                !has(r, level.upStairs),
        );
    // **후보를 먼저 찾고 굴린다.** 굴린 뒤에 후보가 없어 무르면 그 확률이 무슨 뜻인지
    // 아무도 모르게 된다 — 이 값은 「맞는 방이 있을 때 그것이 특수 방이 될 확률」이다.
    if (!fits.length) return null;
    const chance = Math.min(SPECIAL_MAX_CHANCE, SPECIAL_SLOPE * (depth - 2));
    if (rng.rnd(1000) >= Math.round(chance * 1000)) return null;

    const pick = rng.pick(fits)!;
    const kinds = Object.keys(SPECIAL_ROOMS) as SpecialKind[];
    return { room: pick.i, kind: rng.pick(kinds)! };
}

function openTiles(level: Level, r: Room, avoid: Pos[]): Pos[] {
    const out: Pos[] = [];
    const x0 = r.gone ? r.x : r.x + 1;
    const y0 = r.gone ? r.y : r.y + 1;
    const x1 = r.gone ? r.x : r.x + r.w - 2;
    const y1 = r.gone ? r.y : r.y + r.h - 2;
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            if (!walkable(level.tiles[idx(x, y)] as Tile)) continue;
            if (avoid.some((q) => q.x === x && q.y === y)) continue;
            if (level.monsters.some((m) => m.x === x && m.y === y)) continue;
            if (level.items.some((it) => it.x === x && it.y === y)) continue;
            out.push({ x, y });
        }
    }
    return out;
}

/**
 * 물건 `n` 개를 놓을 자리 — **층이 총량을 정하고, 방은 그것을 나눠 갖는다.**
 *
 * 예전에는 물건마다 따로 `freeSpot` 을 불렀다. 뽑기가 서로를 모르니 **한 방에 세 개가
 * 몰리고 나머지가 텅 비는** 일이 잦았다(같은 던전에서 77%). 그건 가중치를 어떻게 고쳐도
 * 안 고쳐진다 — 실제로 세 모델을 재 봤는데 전체 빈 방 비율이 63~66% 로 똑같았다.
 * 가중치는 **어느** 방이 비는지만 정하지, 몇 방이 비는지는 배분이 정한다.
 *
 * 그래서 **최대잔여 배분**을 쓴다. 정확 몫을 내림해 나눠 주고, 남은 것을 소수부가 큰
 * 방부터 하나씩 얹는다. 같은 개수로 넓은 방이 비어 있을 확률이 36.5% → 8.9% 로 떨어진다.
 */
/**
 * 방 **하나** 안에 n 자리. 특수 방이 제 몫을 받는 자리다.
 *
 * 흩어 놓는 방식은 `itemSpots` 의 그것과 같다 — 한 바퀴는 안 붙게, 그래도 모자라면
 * 붙는 것을 받아들인다. 이 방이 꽉 차면 거기서 멈춘다(밖으로 새지 않는다).
 */
export function roomSpots(level: Level, r: Room, n: number, rng: Rng, avoid: Pos[] = []): Pos[] {
    if (n <= 0) return [];
    const open = rng.shuffle(openTiles(level, r, avoid));
    const taken: Pos[] = [];
    for (const pass of [true, false]) {
        for (const p of open) {
            if (taken.length >= n) break;
            if (taken.some((q) => q.x === p.x && q.y === p.y)) continue;
            if (pass && taken.some((q) => touching(q, p))) continue;
            taken.push(p);
        }
    }
    return taken;
}

export function itemSpots(
    level: Level,
    n: number,
    rng: Rng,
    avoid: Pos[] = [],
    /** 이 방은 빼고 나눈다 — 특수 방은 제 몫을 따로 받는다. */
    except: number | null = null,
): Pos[] {
    const real = level.rooms.filter((r, i) => !r.gone && i !== except);
    if (n <= 0 || real.length === 0) return [];

    const areas = real.map((r) => effectiveArea(level, r));
    const weights = areas.map((a) => Math.min(Math.pow(a, AREA_GAMMA), AREA_CAP));
    const sum = weights.reduce((a, b) => a + b, 0);

    // ── 최대잔여: 내림한 몫 + 소수부가 큰 방부터 남은 것
    const exact = weights.map((w) => (sum > 0 ? (w / sum) * n : n / real.length));
    const quota = exact.map((e) => Math.floor(e));
    const byFrac = exact
        .map((e, i) => ({ frac: e - Math.floor(e), i }))
        .sort((a, b) => b.frac - a.frac || a.i - b.i);
    let left = n - quota.reduce((a, b) => a + b, 0);
    for (let k = 0; left > 0; k++, left--) quota[byFrac[k % byFrac.length].i]++;

    // ── 한 방이 층을 통째로 먹지 않게. 넘친 몫은 제일 적게 받은 방으로.
    for (let i = 0; i < quota.length; i++) {
        while (quota[i] > ROOM_ITEM_CAP) {
            const to = quota.indexOf(Math.min(...quota));
            if (to === i || quota[to] >= ROOM_ITEM_CAP) break;
            quota[i]--;
            quota[to]++;
        }
    }

    // 넓은 방을 따로 지켜 줄 필요는 **없다.** 기획에는 「A* 가 큰 방이 0개면 뺏어 온다」는
    // 보정이 있었는데, 500층 3천여 방으로 재 보니 넣으나 빼나 8.0% 로 같았다 —
    // 최대잔여가 소수부 큰 방부터 남은 몫을 주므로 **제일 넓은 방은 구조적으로 먼저
    // 받는다.** 안 듣는 보정은 안 넣는다.

    // ── 몫만큼 실제 칸을 고른다. 같은 방 안에서는 흩어 놓는다.
    const out: Pos[] = [];
    let spilled = 0;
    real.forEach((r, i) => {
        let want = quota[i];
        const open = rng.shuffle(openTiles(level, r, avoid));
        const taken: Pos[] = [];
        // **한 방 안에서도 흩어 놓는다.** 겹쳐서 안 보이는 것은 아니다(칸이 다르면 둘 다
        // 보인다) — 구석에 쌓여 있으면 「이 방에 뭐가 좀 있다」가 아니라 「저기 한 무더기」로
        // 읽혀서, 넓은 방을 걸어 볼 까닭이 다시 사라진다.
        // 한 바퀴는 떨어뜨려 놓고, 그래도 모자라면 붙는 것을 받아들인다 —
        // 작은 방에서는 두 칸을 못 띄운다.
        for (const pass of [true, false]) {
            for (const p of open) {
                if (want === 0) break;
                if (taken.some((q) => q.x === p.x && q.y === p.y)) continue;
                if (pass && taken.some((q) => touching(q, p))) continue;
                taken.push(p);
                want--;
            }
            if (want === 0) break;
        }
        out.push(...taken);
        spilled += want;
    });

    // ── 자리가 모자라 못 놓은 몫은 아무 빈 바닥에나. (미로뿐인 층에서 드물게 난다)
    for (let k = 0; k < spilled; k++) out.push(freeSpot(level, rng, [...avoid, ...out]));
    return out;
}

/**
 * 층의 뼈대를 만든다 — 방·복도·문·계단까지. 몬스터와 물건은 `populate` 가 얹는다.
 */
export function buildLevel(depth: number, rng: Rng): Level {
    const tiles = new Uint8Array(MAP_W * MAP_H).fill(T.ROCK);
    const roomAt = new Int8Array(MAP_W * MAP_H).fill(-1);
    const rooms: Room[] = [];

    // 「없는 방」은 깊을수록 잦다. 다만 진짜 방을 넷 아래로 떨어뜨리지 않는다 —
    // 방이 너무 적으면 층이 복도 뭉치가 되어 Rogue 처럼 안 읽힌다.
    const goneChance = depth <= 1 ? 0 : Math.min(0.34, depth * 0.03);
    let goneCount = 0;
    const maxGone = COLS * ROWS - 4;

    for (let i = 0; i < COLS * ROWS; i++) {
        const c = cellBounds(i);
        // 칸의 마지막 행·열은 비워 둔다 — 옆 칸의 방과 벽이 맞붙지 않게.
        const availW = c.w - 1;
        const availH = c.h - 1;
        const gone = goneCount < maxGone && rng.chance(goneChance);

        if (gone) {
            goneCount++;
            rooms.push({
                x: c.x + rng.between(1, Math.max(1, availW - 2)),
                y: c.y + rng.between(1, Math.max(1, availH - 2)),
                w: 1,
                h: 1,
                dark: true,
                gone: true,
                maze: false,
            });
            continue;
        }

        const w = rng.between(4, Math.max(4, Math.min(availW, 16)));
        const h = rng.between(3, Math.max(3, availH));
        rooms.push({
            x: c.x + rng.rnd(Math.max(1, availW - w + 1)),
            y: c.y + rng.rnd(Math.max(1, availH - h + 1)),
            w,
            h,
            // 깊을수록 어두운 방이 잦다. 1층은 전부 밝다 — 처음 켠 사람이 지도를 본다.
            dark: depth > 1 && rng.chance(Math.min(0.6, (depth - 1) * 0.07)),
            gone: false,
            // 미로 방은 깊은 층에만. 안쪽이 통로라 어차피 인접한 칸만 보인다.
            maze: depth >= 8 && w >= 7 && h >= 5 && rng.chance(Math.min(0.3, (depth - 7) * 0.03)),
        });
    }

    rooms.forEach((r, i) => carveRoom(tiles, roomAt, r, i));

    // 먼저 전부 이어질 만큼만 잇고, 그 위에 갈림길을 몇 개 더한다.
    const edges = rng.shuffle(cellEdges());
    const uf = new Uf(COLS * ROWS);
    const spanning: typeof edges = [];
    for (const e of edges) if (uf.union(e.a, e.b)) spanning.push(e);
    // 여분 통로 — 이것이 없어도 층은 이어진다. 그래서 **여기 난 문만 숨길 수 있다.**
    const extra = edges.filter((e) => !spanning.includes(e) && rng.chance(0.28));
    const chosen = [...spanning, ...extra];

    // **「없는 방」은 갈림길이다.** 신장 트리에서 잎이 되면 길이 하나뿐인데, 그건 방이
    // 아니라 막다른 골목이다 — 화면에서는 복도가 한참 뻗다가 **아무것도 없는 데서
    // 끊겨 보인다.** 「길이 중간에 끊긴다」의 가장 긴 자리가 이것이었다(깊이 17·시드 5
    // 에서 열다섯 칸짜리 꼬리).
    //
    // 다듬기로는 못 지운다 — 지우면 그 방이 지도에서 사라진다. 그래서 **여기서 미리**
    // 길을 하나 더 물린다. 이 길은 여분 통로가 아니므로 그 문은 비밀문이 되지 않는다.
    for (let i = 0; i < rooms.length; i++) {
        if (!rooms[i].gone) continue;
        if (chosen.filter((e) => e.a === i || e.b === i).length >= 2) continue;
        const more = edges.find((e) => (e.a === i || e.b === i) && !chosen.includes(e));
        if (more) chosen.push(more);
    }

    // 방마다 제 문을 들고 있어야 한다 — 미로를 팔 때도, 비밀문을 고를 때도 필요하다.
    const doorsOf: Pos[][] = rooms.map(() => []);
    /** 여분 통로에 난 문들 — 비밀문이 될 수 있는 것은 이것뿐이다. */
    const extraDoors: Pos[] = [];

    for (const e of chosen) {
        const ra = rooms[e.a];
        const rb = rooms[e.b];
        const res = connectRoomsShortest(tiles, ra, rb, e.horizontal, rng);
        if (res.doorA) {
            put(tiles, res.doorA.x, res.doorA.y, T.DOOR);
            doorsOf[e.a].push(res.doorA);
        }
        if (res.doorB) {
            put(tiles, res.doorB.x, res.doorB.y, T.DOOR);
            doorsOf[e.b].push(res.doorB);
        }
        if (extra.includes(e)) {
            extraDoors.push(...[res.doorA, res.doorB].filter((d): d is Pos => !!d));
        }
    }

    // 미로는 **문을 낸 뒤에** 판다. 먼저 파면 문 자리를 모르니 안쪽으로 뚫을 수가 없다.
    let anyMaze = false;
    rooms.forEach((r, i) => {
        if (!r.maze || r.gone) return;
        if (!carveMaze(tiles, roomAt, r, rng)) {
            r.maze = false;
            return;
        }
        anyMaze = true;
        for (const d of doorsOf[i]) linkDoorToMaze(tiles, r, d);
    });

    // **비밀문은 「여분 통로」에만 난다.**
    //
    // 방의 문 개수로 고르면 안 된다 — 문이 둘인 방 A 와 문이 하나인 방 B 가 한 통로로
    // 이어져 있을 때, A 쪽 문을 숨기면 B 로 가는 길이 통째로 사라진다. A 는 멀쩡한데
    // B 가 갇히므로 방만 보고는 못 잡는다.
    //
    // 신장 트리 밖의 통로는 **없어도 층이 이어진다**는 것이 정의라, 거기 난 문은
    // 숨겨도 안전하다. 그래서 비밀문은 언제나 **지름길**이고, 못 찾아도 판은 돈다.
    const secretChance = depth <= 2 ? 0 : Math.min(0.55, (depth - 2) * 0.06);
    for (const d of extraDoors) {
        if (rng.chance(secretChance)) put(tiles, d.x, d.y, T.SECRET);
    }

    // 판 자국을 다듬는다. **비밀문을 정한 뒤**에 해야 한다 — 비밀문에 닿은 막다른 끝은
    // 못 찾은 지름길이라 남겨야 하기 때문이다.
    joinDiagonals(tiles, rooms);
    pruneDeadEnds(tiles, rooms);

    const level: Level = {
        depth,
        tiles,
        flags: new Uint8Array(MAP_W * MAP_H),
        rooms,
        roomAt,
        monsters: [],
        items: [],
        traps: [],
        stairs: { x: 0, y: 0 },
        upStairs: null,
        anvil: null,
        maze: anyMaze,
        special: null,
    };

    // **`freeSpot` 을 쓴다.** 예전에는 `randomSpotIn` 을 그냥 불러서 걸어갈 수 있는
    // 칸인지 안 봤다. 보통 방이면 안쪽이 전부 바닥이라 티가 안 났는데, **미로 방은
    // 안쪽 대부분이 바위**라 계단이 바위 속에 박혔다 — 사방이 막힌 계단이 되고
    // 그 층은 내려갈 수 없는 층이 된다. 실제로 그랬다(깊이 12, 시드 186).
    const down = freeSpot(level, rng);
    put(tiles, down.x, down.y, T.STAIRS);
    level.stairs = down;

    // 올라가는 계단은 어느 층에나 있다. 1층의 그것이 **바깥으로 나가는 문**이고,
    // 증표를 쥐기 전에는 열리지 않는다 — 이기는 길이 그 한 칸이다.
    level.upStairs = freeSpot(level, rng, [down]);

    // 모루는 **층마다 하나.** 계단 둘을 피해 아무 데나 선다 — 어디 있는지는 걸어 보고
    // 알아야 하고, 가는 길이 위험한 것이 이 자리의 값이다.
    level.anvil = freeSpot(level, rng, [down, level.upStairs]);

    // 특수 방은 **모루 다음, 함정 앞**이다. 제단이면 모루를 그 방으로 옮기는데, 함정이
    // 피해야 할 자리가 그 옮긴 뒤의 자리이기 때문이다.
    level.special = pickSpecialRoom(level, depth, rng);
    if (level.special?.kind === "altar") {
        // **제단에는 모루가 선다.** 그 방을 찾는 것이 곧 모루를 찾는 것이 되어, 「문이
        // 하나뿐인 방에 들어간다」는 위험에 값이 붙는다.
        const spot = rng.pick(openTiles(level, level.rooms[level.special.room], [down, level.upStairs]));
        if (spot) level.anvil = spot;
    }

    // 함정. 1층에는 없다 — 처음 켠 사람이 영문도 모르고 떨어지면 배울 것이 안 남는다.
    if (depth > 1) {
        const kinds: TrapKind[] = ["trapdoor", "arrow", "sleep", "beartrap", "teleport", "dart"];
        const count = rng.rnd(Math.min(5, 1 + Math.floor(depth / 2))) + 1;
        for (let i = 0; i < count; i++) {
            const p = freeSpot(level, rng, [down, level.upStairs, level.anvil]);
            if (level.traps.some((t) => t.x === p.x && t.y === p.y)) continue;
            const trap: Trap = { x: p.x, y: p.y, kind: rng.pick(kinds)!, found: false };
            level.traps.push(trap);
        }
    }

    return level;
}

/**
 * 두 칸 사이를 걸어서 갈 수 있는가 — 층이 끊기지 않았는지 재는 자다.
 *
 * **상하좌우 넷으로만 센다.** 실제 이동은 여덟 방향이지만 문을 대각으로 드나들 수는
 * 없으므로(원작 규칙), 넷으로 이어지는 것이 더 엄한 조건이다. 넷으로 이어지면
 * 여덟으로도 반드시 이어진다.
 */
export function reachable(level: Level, from: Pos, to: Pos): boolean {
    const seen = new Uint8Array(MAP_W * MAP_H);
    const queue: Pos[] = [from];
    seen[idx(from.x, from.y)] = 1;
    const step = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ];
    while (queue.length) {
        const p = queue.shift()!;
        if (p.x === to.x && p.y === to.y) return true;
        for (const [dx, dy] of step) {
            const nx = p.x + dx;
            const ny = p.y + dy;
            if (!inBounds(nx, ny)) continue;
            if (seen[idx(nx, ny)]) continue;
            if (!walkable(level.tiles[idx(nx, ny)] as Tile)) continue;
            seen[idx(nx, ny)] = 1;
            queue.push({ x: nx, y: ny });
        }
    }
    return false;
}
