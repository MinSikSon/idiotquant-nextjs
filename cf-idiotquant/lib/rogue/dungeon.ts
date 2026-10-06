/**
 * 층 만들기 — Rogue 원작의 방식, 깊은 층에는 NetHack 의 방식을 섞는다.
 *
 * 화면을 3×3 칸으로 나누고 칸마다 방을 하나 놓는다. 깊이 들어갈수록 몇몇 칸은
 * **「없는 방」**(방 대신 복도의 교차점 한 칸)이 된다. 그다음 이웃한 칸끼리 꺾인
 * 복도로 잇는데, **먼저 전부 이어질 만큼만 잇고**(신장 트리) 그 위에 몇 개를 더한다 —
 * 그래야 갈림길이 생기면서도 못 가는 방이 없다.
 *
 * **4층부터는 넷핵식이 섞인다**(`pickLayout`) — 빈 사각형에 방을 아무 데나 흩고, x 순으로 줄 세워
 * 옆 방끼리 잇는다(`layNethack`). 두 방식은 **방과 문까지만** 다르고, 비밀문·다듬기·금고·계단은
 * 같은 길을 지난다(`buildLevel`). 그래서 아래의 자물쇠가 두 방식에 똑같이 걸린다.
 *
 * **모든 방이 이어져야 한다.** 하나라도 끊기면 화면은 멀쩡한데 그 층은 못 깨는 층이
 * 되고, 계단이 거기 있으면 판이 죽는다. `test/rogue-dungeon.test.ts` 가 그것을 건다.
 *
 * 방 고르기와 잇기는 전부 `Rng` 를 지난다 — 같은 시드는 같은 층이어야 다시 볼 수 있다.
 */

import { type Category } from "./items";
import { doorwayInside, startingTill } from "./shop";
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
    type ShopState,
    type SpecialKind,
    T,
    type Tile,
    fountainsOf,
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
/** 그 칸이 **금고 안**인가 — 놓는 자리도 테스트도 이 한 자리에 묻는다. */
export function inVault(level: Level, x: number, y: number): boolean {
    return level.rooms.some((r) => r.vault && x > r.x && x < r.x + r.w - 1 && y > r.y && y < r.y + r.h - 1);
}

export function freeSpot(level: Level, rng: Rng, avoid: Pos[] = []): Pos {
    // **금고는 뺀다.** 여기 계단이나 물건이 놓이면 못 파는 사람의 판이 막힌다.
    const real = level.rooms.filter((r) => !r.gone && !r.vault);
    const weights = real.map((r) => roomWeight(level, r));
    for (let tries = 0; tries < 200; tries++) {
        const room = pickWeighted(real, weights, rng) ?? level.rooms[0];
        const p = randomSpotIn(room, rng);
        if (!walkable(level.tiles[idx(p.x, p.y)] as Tile)) continue;
        if (avoid.some((q) => q.x === p.x && q.y === p.y)) continue;
        if (fountainsOf(level).some((fountain) => fountain.x === p.x && fountain.y === p.y)) continue;
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
            if (fountainsOf(level).some((fountain) => fountain.x === x && fountain.y === y)) continue;
            // 훑어서 주는 이 마지막 길에서도 금고는 뺀다 — 여기가 뚫리면 위의 거름이 헛것이다.
            if (inVault(level, x, y)) continue;
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
    // 상점은 **몫을 안 받는다**(κ 0) — 진열품은 값을 치러야 하는 물건이라 층의 공짜 몫과
    // 따로 센다(`game.stockShop`). 고르는 길도 따로다(`pickSpecialRoom` 이 먼저 굴린다).
    shop: { name: "상점", kappa: 0, bias: {}, monsters: 0, awake: false },
};

/** 상점이 서는 첫 층 — NetHack 은 2층부터지만, 우리 2층은 금화가 거의 없다(잰 것: 중앙값 0). */
const SHOP_MIN_DEPTH = 3;
/** 진열할 칸이 있어야 한다 — 안쪽 3×3 이면 주인 자리 둘을 빼고 일곱 칸이 남는다. */
const SHOP_MIN_AREA = 9;
/** NetHack 의 `rn2(depth) < 3` — 3층은 늘, 6층 절반, 12층 네 번에 한 번. */
const SHOP_ODDS = 3;

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
    if (depth < Math.min(SPECIAL_MIN_DEPTH, SHOP_MIN_DEPTH)) return null;

    const has = (r: Room, p: Pos | null) =>
        !!p && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
    const oneDoor = (minArea: number) =>
        level.rooms
            .map((r, i) => ({ r, i }))
            .filter(
                ({ r }) =>
                    !r.gone &&
                    !r.maze &&
                    !r.vault &&
                    effectiveArea(level, r) >= minArea &&
                    doorCount(level, r) === 1 &&
                    !has(r, level.stairs) &&
                    !has(r, level.upStairs),
            );

    // **상점을 먼저 굴린다**(NetHack 의 `mkroom(SHOPBASE)` 가 다른 특수 방보다 먼저다).
    // 문이 하나인 방이면 넓지 않아도 된다 — 들어가고 나오는 길이 하나라야 주인이 지킨다.
    if (depth >= SHOP_MIN_DEPTH) {
        const shops = oneDoor(SHOP_MIN_AREA);
        if (shops.length && rng.rnd(depth) < SHOP_ODDS) return { room: rng.pick(shops)!.i, kind: "shop" };
    }
    if (depth < SPECIAL_MIN_DEPTH) return null;
    const fits = oneDoor(SPECIAL_MIN_AREA);
    // **후보를 먼저 찾고 굴린다.** 굴린 뒤에 후보가 없어 무르면 그 확률이 무슨 뜻인지
    // 아무도 모르게 된다 — 이 값은 「맞는 방이 있을 때 그것이 특수 방이 될 확률」이다.
    if (!fits.length) return null;
    const chance = Math.min(SPECIAL_MAX_CHANCE, SPECIAL_SLOPE * (depth - 2));
    if (rng.rnd(1000) >= Math.round(chance * 1000)) return null;

    const pick = rng.pick(fits)!;
    const kinds = (Object.keys(SPECIAL_ROOMS) as SpecialKind[]).filter((k) => k !== "shop");
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
            if (fountainsOf(level).some((fountain) => fountain.x === x && fountain.y === y)) continue;
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
    // **금고는 몫을 안 받는다.** 파야 들어가는 방에 일반 물건이 떨어지면, 안 판 사람은
    // 그 층의 제 몫을 통째로 잃는다 — 금고 안의 것은 금고가 따로 놓는다(`game.populate`).
    const real = level.rooms.filter((r, i) => !r.gone && !r.vault && i !== except);
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
/** 금고가 처음 나는 층. 굴착 지팡이가 나오기 시작하는 깊이와 맞춘다. */
const VAULT_MIN_DEPTH = 5;
/** 그 층에 금고가 날 확률. 드물어야 「찾았다」가 된다. */
const VAULT_CHANCE = 0.18;

/**
 * 바위 속에 **문 없는 방**을 판다. 팠으면 `true`.
 *
 * 고르는 자리는 **테두리 한 칸까지 전부 바위**인 사각형뿐이다. 그래서 이미 선 길·방·문을
 * 한 칸도 안 건드리고, 판 뒤에도 층의 이어짐이 그대로다 — 금고는 **더해지기만** 한다.
 *
 * 안쪽만 바닥으로 판다(벽은 바위로 남는다). 굴착 지팡이는 한 번에 네 칸을 뚫으므로,
 * 벽 한 겹은 옆에 붙어서 쏘면 열린다.
 */
function carveVault(tiles: Uint8Array, roomAt: Int8Array, rooms: Room[], depth: number, rng: Rng): boolean {
    if (depth < VAULT_MIN_DEPTH || !rng.chance(VAULT_CHANCE)) return false;
    const w = rng.between(5, 7);
    const h = rng.between(4, 5);
    /** 테두리 한 칸까지 전부 바위인가 — 한 칸이라도 뚫려 있으면 남의 길에 닿는다. */
    const clear = (x: number, y: number) => {
        for (let yy = y - 1; yy < y + h + 1; yy++) {
            for (let xx = x - 1; xx < x + w + 1; xx++) {
                if (!inBounds(xx, yy)) return false;
                if (get(tiles, xx, yy) !== T.ROCK) return false;
            }
        }
        return true;
    };
    for (let tries = 0; tries < 300; tries++) {
        const x = rng.between(2, MAP_W - w - 3);
        const y = rng.between(2, MAP_H - h - 3);
        if (!clear(x, y)) continue;
        const r: Room = { x, y, w, h, dark: false, gone: false, maze: false, vault: true };
        const ri = rooms.length;
        rooms.push(r);
        for (let yy = y + 1; yy < y + h - 1; yy++) {
            for (let xx = x + 1; xx < x + w - 1; xx++) {
                put(tiles, xx, yy, T.FLOOR);
                roomAt[idx(xx, yy)] = ri;
            }
        }
        return true;
    }
    return false;
}

/** 이 층을 어느 방식으로 짓나 — 3×3 칸의 로그식, 아무 데나 방을 흩는 넷핵식. */
export type Layout = "rogue" | "nethack";

/**
 * **넷핵식은 깊이 들어가야 섞인다.** 1~3층은 전부 로그식이다 — 처음 켠 사람이 보는
 * 밝은 3×3 지도가 이 게임의 첫인상이고, 물건 배치·특수 방 확률도 그 모양에 맞춰 잰 것이다.
 * 4층부터 층마다 6%p 씩 올라 13층에서 천장(60%)에 닿는다. 깊은 층도 로그식이 남는다 —
 * 두 모양이 번갈아 나와야 「이번 층은 어떻게 생겼나」가 산다.
 */
const NETHACK_MIN_DEPTH = 4;
const NETHACK_SLOPE = 0.06;
const NETHACK_MAX_CHANCE = 0.6;

/** 그 깊이에서 넷핵식이 설 확률. */
export function nethackChance(depth: number): number {
    if (depth < NETHACK_MIN_DEPTH) return 0;
    return Math.min(NETHACK_MAX_CHANCE, (depth - NETHACK_MIN_DEPTH + 1) * NETHACK_SLOPE);
}

/**
 * 이 층의 방식을 굴린다. **확률이 0 인 층에서는 난수를 안 뽑는다** — 그래야 1~3층이
 * 섞기를 넣기 전과 같은 시드로 같은 층이다.
 */
export function pickLayout(depth: number, rng: Rng): Layout {
    const p = nethackChance(depth);
    if (p <= 0) return "rogue";
    return rng.chance(p) ? "nethack" : "rogue";
}

/** 뼈대 — 방과 문까지. 비밀문·다듬기·금고·계단은 두 방식이 같이 쓴다(`buildLevel`). */
interface Laid {
    rooms: Room[];
    /** 방마다 제 문 — 미로를 팔 때 쓴다. */
    doorsOf: Pos[][];
    /** 여분 통로에 난 문 — **비밀문이 될 수 있는 것은 이것뿐이다.** */
    extraDoors: Pos[];
}

/*
 * ── 넷핵식 — NetHack 3.x `mklev.c`·`rect.c`·`sp_lev.c(dig_corridor)` 를 옮겼다.
 *
 * 빈 사각형 목록에서 하나를 골라 방을 놓고, 방과 그 둘레(XLIM·YLIM)를 뺀 나머지를 다시
 * 사각형으로 쪼갠다. 더 놓을 데가 없을 때까지. 방을 x 순으로 줄 세워 **옆 방끼리 잇고**,
 * 끊긴 데를 이어 붙인 뒤, 아무 두 방이나 몇 쌍 더 잇는다.
 *
 * **안 옮긴 것** — 규칙이 바뀌는 것이라 따로 정한다:
 *   - 숨은 복도 칸(SCORR): 필수 길에도 나서 「못 찾으면 막힌 판」이 된다.
 *   - 중간에 끊기는 여분 복도(`nxcor && !rn2(35)`): 「눈에 보이는 막다른 길은 비밀문 앞뿐」과 부딪힌다.
 *   - 복도의 바위(boulder), 문 상태(잠김·부서짐): 여는 수단이 아직 없다.
 * 비밀문은 로그식과 같은 규칙이다 — **여분 통로의 문만** 숨는다.
 */

/** 방과 방 사이에 남기는 여백 — 복도가 지나갈 자리. 넷핵의 값 그대로. */
const XLIM = 4;
const YLIM = 3;
/**
 * 넷핵의 COLNO·ROWNO 자리. 우리 지도는 가장자리 한 줄을 비워 두므로(굴착도 못 한다)
 * 한 칸씩 줄여서 넣는다 — 방 벽이 가장자리에 서지 않는다.
 */
const NH_COLS = MAP_W - 1;
const NH_ROWS = MAP_H - 1;
const NH_MAX_RECTS = 50;
/** 방이 이보다 적으면 다시 짓는다 — 로그식의 「진짜 방은 넷 이상」과 맞춘다. */
const NH_MIN_ROOMS = 4;
const NH_TRIES = 8;

/** 넷핵의 사각형 — 네 끝을 **포함한다.** 방이면 안쪽(벽 제외)이다. */
interface Box {
    lx: number;
    ly: number;
    hx: number;
    hy: number;
}

function intersect(a: Box, b: Box): Box | null {
    const r = { lx: Math.max(a.lx, b.lx), ly: Math.max(a.ly, b.ly), hx: Math.min(a.hx, b.hx), hy: Math.min(a.hy, b.hy) };
    return r.lx > r.hx || r.ly > r.hy ? null : r;
}

function addRect(rects: Box[], r: Box) {
    if (rects.length >= NH_MAX_RECTS) return;
    // 이미 있는 사각형 안에 들어가면 더하지 않는다(`get_rect`).
    if (rects.some((q) => q.lx <= r.lx && q.ly <= r.ly && q.hx >= r.hx && q.hy >= r.hy)) return;
    rects.push(r);
}

/** 방(`r2`, 벽 포함)이 먹은 자리를 빈 사각형 목록에서 빼고 남은 조각을 넣는다(`split_rects`). */
function splitRects(rects: Box[], r1: Box, r2: Box) {
    const old = { ...r1 };
    rects.splice(rects.indexOf(r1), 1);
    for (const q of rects.slice().reverse()) {
        if (!rects.includes(q)) continue;
        const cut = intersect(q, r2);
        if (cut) splitRects(rects, q, cut);
    }
    if (r2.ly - old.ly - 1 > (old.hy < NH_ROWS - 1 ? 2 * YLIM : YLIM + 1) + 4) addRect(rects, { ...old, hy: r2.ly - 2 });
    if (r2.lx - old.lx - 1 > (old.hx < NH_COLS - 1 ? 2 * XLIM : XLIM + 1) + 4) addRect(rects, { ...old, hx: r2.lx - 2 });
    if (old.hy - r2.hy - 1 > (old.ly > 0 ? 2 * YLIM : YLIM + 1) + 4) addRect(rects, { ...old, ly: r2.hy + 2 });
    if (old.hx - r2.hx - 1 > (old.lx > 0 ? 2 * XLIM : XLIM + 1) + 4) addRect(rects, { ...old, lx: r2.hx + 2 });
}

/**
 * 방 하나를 놓는다(`create_room`). 못 놓으면 null — 방 놓기가 거기서 끝난다.
 *
 * 크기는 넷핵 그대로 — 안쪽 가로 3~9(넓은 사각형이면 3~13), 세로 3~6, 넓이 50 남짓까지.
 */
function nhCreateRoom(rects: Box[], placed: Box[], rng: Rng): Box | null {
    for (let tries = 0; tries <= 100; tries++) {
        if (!rects.length) return null;
        const r1 = rects[rng.rnd(rects.length)];
        const { lx, ly, hx, hy } = r1;
        const dx = 2 + rng.rnd(hx - lx > 28 ? 12 : 8);
        let dy = 2 + rng.rnd(4);
        if (dx * dy > 50) dy = Math.floor(50 / dx);
        const xborder = lx > 0 && hx < NH_COLS - 1 ? 2 * XLIM : XLIM + 1;
        const yborder = ly > 0 && hy < NH_ROWS - 1 ? 2 * YLIM : YLIM + 1;
        if (hx - lx < dx + 3 + xborder || hy - ly < dy + 3 + yborder) continue;
        const xabs = lx + (lx > 0 ? XLIM : 3) + rng.rnd(hx - (lx > 0 ? lx : 3) - dx - xborder + 1);
        let yabs = ly + (ly > 0 ? YLIM : 2) + rng.rnd(hy - (ly > 0 ? ly : 2) - dy - yborder + 1);
        // 첫 방이 아래쪽에 쏠리지 않게 위로 끌어올린다(넷핵 그대로).
        if (ly === 0 && hy >= NH_ROWS - 1 && (!placed.length || !rng.rnd(placed.length)) && yabs + dy > NH_ROWS / 2) {
            yabs = 2 + rng.rnd(3);
            if (placed.length < 4 && dy > 1) dy--;
        }
        const room = { lx: xabs, ly: yabs, hx: xabs + dx, hy: yabs + dy };
        const walls = { lx: room.lx - 1, ly: room.ly - 1, hx: room.hx + 1, hy: room.hy + 1 };
        // `check_room` 자리 — 다른 방과 벽이 붙으면 무른다. 가장자리는 위의 여백 셈이 이미 비켜 간다.
        if (placed.some((p) => intersect({ lx: p.lx - 2, ly: p.ly - 2, hx: p.hx + 2, hy: p.hy + 2 }, walls))) continue;
        splitRects(rects, r1, walls);
        return room;
    }
    return null;
}

/** 문을 낼 수 있는 벽인가 — 곁에 문이 붙어 있으면 안 된다(`okdoor`·`bydoor`). */
function okDoor(tiles: Uint8Array, x: number, y: number): boolean {
    const t = get(tiles, x, y);
    if (t !== T.WALL_H && t !== T.WALL_V) return false;
    return !N4.some(([dx, dy]) => get(tiles, x + dx, y + dy) === T.DOOR);
}

/** 벽 한 줄에서 문 자리 하나(`finddpos`). 마땅한 데가 없으면 이미 난 문을 같이 쓴다. */
function findDoorPos(tiles: Uint8Array, xl: number, yl: number, xh: number, yh: number, rng: Rng): Pos {
    const x = xl + rng.rnd(xh - xl + 1);
    const y = yl + rng.rnd(yh - yl + 1);
    if (okDoor(tiles, x, y)) return { x, y };
    for (let xx = xl; xx <= xh; xx++) for (let yy = yl; yy <= yh; yy++) if (okDoor(tiles, xx, yy)) return { x: xx, y: yy };
    for (let xx = xl; xx <= xh; xx++) for (let yy = yl; yy <= yh; yy++) if (get(tiles, xx, yy) === T.DOOR) return { x: xx, y: yy };
    return { x: xl, y: yh };
}

/**
 * 복도를 판다(`dig_corridor`). 바위와 이미 난 복도만 지나고, **벽을 만나면 돌아간다** —
 * 그래서 넷핵의 복도는 남의 방을 비켜 구불구불 간다. 끝까지 못 가면 false.
 */
function nhDigCorridor(tiles: Uint8Array, org: Pos, dest: Pos, rng: Rng): boolean {
    let xx = org.x;
    let yy = org.y;
    const tx = dest.x;
    const ty = dest.y;
    if (!inBounds(xx, yy) || !inBounds(tx, ty)) return false;
    let dx = 0;
    let dy = 0;
    if (tx > xx) dx = 1;
    else if (ty > yy) dy = 1;
    else if (tx < xx) dx = -1;
    else dy = -1;
    xx -= dx;
    yy -= dy;
    const passable = (x: number, y: number) => {
        const t = get(tiles, x, y);
        return t === T.ROCK || t === T.CORRIDOR;
    };
    let cct = 0;
    while (xx !== tx || yy !== ty) {
        if (cct++ > 500) return false;
        xx += dx;
        yy += dy;
        if (xx >= MAP_W - 1 || xx <= 0 || yy <= 0 || yy >= MAP_H - 1) return false;
        const t = get(tiles, xx, yy);
        if (t === T.ROCK) put(tiles, xx, yy, T.CORRIDOR);
        else if (t !== T.CORRIDOR) return false;

        // 다음 칸 — 남은 거리가 긴 쪽으로 가되, 가끔 짧은 쪽을 먼저 턴다(곧기만 하면 심심하다).
        let dix = Math.abs(xx - tx);
        let diy = Math.abs(yy - ty);
        if (dix > diy && diy && !rng.rnd(dix - diy + 1)) dix = 0;
        else if (diy > dix && dix && !rng.rnd(diy - dix + 1)) diy = 0;

        if (dy && dix > diy) {
            const ddx = xx > tx ? -1 : 1;
            if (passable(xx + ddx, yy)) {
                dx = ddx;
                dy = 0;
                continue;
            }
        } else if (dx && diy > dix) {
            const ddy = yy > ty ? -1 : 1;
            if (passable(xx, yy + ddy)) {
                dy = ddy;
                dx = 0;
                continue;
            }
        }
        if (passable(xx + dx, yy + dy)) continue;
        if (dx) {
            dx = 0;
            dy = ty < yy ? -1 : 1;
        } else {
            dy = 0;
            dx = tx < xx ? -1 : 1;
        }
        if (passable(xx + dx, yy + dy)) continue;
        dy = -dy;
        dx = -dx;
    }
    return true;
}

/**
 * 두 방을 잇는다(`join`). 문 두 개를 돌려준다. 못 이으면 null — 반쯤 판 복도는 넷핵처럼
 * 그대로 두고 문만 안 낸다. 그 토막은 막다른 길이라 `pruneDeadEnds` 가 되메운다.
 */
function nhJoin(tiles: Uint8Array, rooms: Box[], a: number, b: number, extra: boolean, rng: Rng): [Pos, Pos] | null {
    const c = rooms[a];
    const t = rooms[b];
    let dx = 0;
    let dy = 0;
    let dd: Pos;
    let tt: Pos;
    if (t.lx > c.hx) {
        dx = 1;
        dd = findDoorPos(tiles, c.hx + 1, c.ly, c.hx + 1, c.hy, rng);
        tt = findDoorPos(tiles, t.lx - 1, t.ly, t.lx - 1, t.hy, rng);
    } else if (t.hy < c.ly) {
        dy = -1;
        dd = findDoorPos(tiles, c.lx, c.ly - 1, c.hx, c.ly - 1, rng);
        tt = findDoorPos(tiles, t.lx, t.hy + 1, t.hx, t.hy + 1, rng);
    } else if (t.hx < c.lx) {
        dx = -1;
        dd = findDoorPos(tiles, c.lx - 1, c.ly, c.lx - 1, c.hy, rng);
        tt = findDoorPos(tiles, t.hx + 1, t.ly, t.hx + 1, t.hy, rng);
    } else {
        dy = 1;
        dd = findDoorPos(tiles, c.lx, c.hy + 1, c.hx, c.hy + 1, rng);
        tt = findDoorPos(tiles, t.lx, t.ly - 1, t.hx, t.ly - 1, rng);
    }
    const org = { x: dd.x + dx, y: dd.y + dy };
    const dest = { x: tt.x - dx, y: tt.y - dy };
    // 여분 통로는 이미 길이 난 자리에서 시작하지 않는다(넷핵 그대로) — 겹친 복도만 는다.
    if (extra && get(tiles, org.x, org.y) !== T.ROCK) return null;
    if (!nhDigCorridor(tiles, org, dest, rng)) return null;
    put(tiles, dd.x, dd.y, T.DOOR);
    put(tiles, tt.x, tt.y, T.DOOR);
    return [dd, tt];
}

/** 넷핵식 뼈대. 끝내 못 지으면 null — 지도를 비워 두고 돌아간다. */
function layNethack(tiles: Uint8Array, roomAt: Int8Array, depth: number, rng: Rng): Laid | null {
    for (let attempt = 0; attempt < NH_TRIES; attempt++) {
        tiles.fill(T.ROCK);
        roomAt.fill(-1);
        const laid = tryNethack(tiles, roomAt, depth, rng);
        if (laid) return laid;
    }
    tiles.fill(T.ROCK);
    roomAt.fill(-1);
    return null;
}

function tryNethack(tiles: Uint8Array, roomAt: Int8Array, depth: number, rng: Rng): Laid | null {
    const rects: Box[] = [{ lx: 0, ly: 0, hx: NH_COLS - 1, hy: NH_ROWS - 1 }];
    const boxes: Box[] = [];
    for (;;) {
        const b = nhCreateRoom(rects, boxes, rng);
        if (!b) break;
        boxes.push(b);
    }
    if (boxes.length < NH_MIN_ROOMS) return null;

    // x 순으로 줄 세운다(`sort_rooms`) — 「옆 방끼리 잇기」가 이 순서를 탄다.
    boxes.sort((p, q) => p.lx - q.lx || p.ly - q.ly);
    const rooms: Room[] = boxes.map((b) => ({
        x: b.lx - 1,
        y: b.ly - 1,
        w: b.hx - b.lx + 3,
        h: b.hy - b.ly + 3,
        // 어둠은 로그식과 같은 규칙 — 층의 어둡기는 방식이 아니라 깊이가 정한다.
        dark: depth > 1 && rng.chance(Math.min(0.6, (depth - 1) * 0.07)),
        gone: false,
        maze: false,
    }));
    rooms.forEach((r, i) => carveRoom(tiles, roomAt, r, i));

    const n = rooms.length;
    const uf = new Uf(n);
    const doorsOf: Pos[][] = rooms.map(() => []);
    const needed: Pos[] = [];
    const extras: Pos[] = [];
    const link = (a: number, b: number, extra: boolean) => {
        const res = nhJoin(tiles, boxes, a, b, extra, rng);
        if (!res) return;
        doorsOf[a].push(res[0]);
        doorsOf[b].push(res[1]);
        (extra ? extras : needed).push(...res);
        if (!extra) uf.union(a, b);
    };

    // 1) 옆 방끼리. 넷핵은 1/50 로 여기서 끊는다 — 그러면 2)·3) 이 다른 모양으로 잇는다.
    for (let a = 0; a < n - 1; a++) {
        link(a, a + 1, false);
        if (!rng.rnd(50)) break;
    }
    // 2) 한 칸 건너 — 아직 안 이어진 것만.
    for (let a = 0; a < n - 2; a++) if (uf.find(a) !== uf.find(a + 2)) link(a, a + 2, false);
    // 3) 그래도 떨어진 것은 아무하고나.
    for (let a = 0, any = true; any && a < n; a++) {
        any = false;
        for (let b = 0; b < n; b++) {
            if (uf.find(a) !== uf.find(b)) {
                link(a, b, false);
                any = true;
            }
        }
    }
    // **여기까지가 필수 길이다.** 하나라도 떨어졌으면 이 층은 버리고 다시 짓는다.
    for (let i = 1; i < n; i++) if (uf.find(i) !== uf.find(0)) return null;

    // 4) 여분 통로 — 없어도 층은 이어진다. 그래서 **여기 난 문만 숨길 수 있다.**
    if (n > 2) {
        for (let i = rng.rnd(n) + 4; i; i--) {
            const a = rng.rnd(n);
            let b = rng.rnd(n - 2);
            if (b >= a) b += 2;
            link(a, b, true);
        }
    }
    // 여분 통로가 **필수 길의 문을 같이 쓴** 자리는 뺀다 — 그 문을 숨기면 필수 길이 끊긴다.
    const extraDoors = extras.filter((d) => !needed.some((q) => q.x === d.x && q.y === d.y));
    return { rooms, doorsOf, extraDoors };
}

/**
 * **로그식 뼈대** — 3×3 칸에 방 하나씩, 이웃한 칸끼리 잇는다. 원래의 생성기 그대로다.
 *
 * 난수를 뽑는 순서를 바꾸지 말 것 — 같은 시드가 같은 층이어야 한다.
 */
function layRogue(tiles: Uint8Array, roomAt: Int8Array, depth: number, rng: Rng): Laid {
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

    return { rooms, doorsOf, extraDoors };
}

/** 넷핵 Big Room이 한 판의 10~12층 중 하나에 생기는가. 층 재생성에도 결과가 고정된다. */
export function isBigRoomDepth(seed: number, depth: number): boolean {
    const roll = new Rng((seed ^ 0x42494752) >>> 0);
    if (!roll.chance(0.4)) return false;
    return depth === 10 + roll.rnd(3);
}

function layBigRoom(tiles: Uint8Array, roomAt: Int8Array): Laid {
    const room: Room = { x: 1, y: 1, w: MAP_W - 2, h: MAP_H - 2, dark: false, gone: false, maze: false };
    carveRoom(tiles, roomAt, room, 0);
    return { rooms: [room], doorsOf: [[]], extraDoors: [] };
}

export function buildLevel(depth: number, rng: Rng, layout: Layout = pickLayout(depth, rng), bigRoom = false): Level {
    const tiles = new Uint8Array(MAP_W * MAP_H).fill(T.ROCK);
    const roomAt = new Int8Array(MAP_W * MAP_H).fill(-1);
    // 넷핵식이 안 서면(방이 모자라거나 끝내 못 이으면) 로그식으로 짓는다 — 층은 언제나 선다.
    const { rooms, doorsOf, extraDoors } = bigRoom
        ? layBigRoom(tiles, roomAt)
        : (layout === "nethack" && layNethack(tiles, roomAt, depth, rng)) || layRogue(tiles, roomAt, depth, rng);

    // 미로는 **문을 낸 뒤에** 판다. 먼저 파면 문 자리를 모르니 안쪽으로 뚫을 수가 없다.
    let anyMaze = false;
    rooms.forEach((r, i) => {
        if (bigRoom || !r.maze || r.gone) return;
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

    // **금고** — 문도 복도도 없이 바위에 둘러싸인 방. 굴착 지팡이로만 들어간다.
    //
    // **다듬기(`pruneDeadEnds`) 뒤에 판다.** 앞에서 파면 문 없는 방이 「잎」으로 보여
    // 통째로 메워진다. 그리고 **사방 한 칸까지 전부 바위인 자리**에만 파므로, 이미 선
    // 길·방·문을 한 칸도 안 건드린다 — 층의 이어짐은 금고를 파기 전과 똑같다.
    //
    // 「길이 막힌 판」 규칙과 부딪히지 않는 까닭: 금고는 `Room.vault` 로 **표가 나 있고**,
    // 연결성 자물쇠가 그 표만 콕 집어 뺀다. 자물쇠를 무르게 하는 것이 아니라 예외를
    // **한 군데에 모아** 두는 것이다. 계단·모루·물건은 여전히 전부 닿아야 한다.
    if (!bigRoom) carveVault(tiles, roomAt, rooms, depth, rng);

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
        bigRoom,
        special: null,
        altarUsed: false,
        shop: null,
        transmuteAltar: null,
        fountain: null,
        fountains: [],
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
    level.special = bigRoom ? null : pickSpecialRoom(level, depth, rng);
    if (level.special?.kind === "altar") {
        // **제단에는 모루가 선다.** 그 방을 찾는 것이 곧 모루를 찾는 것이 되어, 「문이
        // 하나뿐인 방에 들어간다」는 위험에 값이 붙는다.
        const spot = rng.pick(openTiles(level, level.rooms[level.special.room], [down, level.upStairs]));
        if (spot) level.anvil = spot;
    }
    if (level.special?.kind === "shop") level.shop = openShop(level, level.special.room);

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

    // 변환 제단은 **함정 뒤에** 굴린다 — 앞에서 굴리면 모든 층의 함정 자리가 바뀐다.
    // 1층에는 없다(함정과 같은 까닭). 특수 방·금고에는 안 선다 — 선택 제단 옆에 또 제단이
    // 서면 둘이 헷갈리고, 상점 안이면 가게 물건을 올려 바꾸는 길이 된다. 미로 방·없는 방은
    // 방이 아니라 통로라 뺀다.
    if (!bigRoom && depth > 1 && rng.rnd(100) < TRANSMUTE_ALTAR_CHANCE) {
        const avoid = [down, level.upStairs, level.anvil, ...level.traps].filter((p): p is Pos => !!p);
        const spots = level.rooms.flatMap((r, i) =>
            r.gone || r.maze || r.vault || i === level.special?.room ? [] : openTiles(level, r, avoid),
        );
        const p = rng.pick(spots);
        if (p) {
            // 파생값으로 정렬을 정해 새 난수를 쓰지 않는다 — 이후 층 생성의 RNG 흐름을 보존한다.
            const alignments = ["lawful", "neutral", "chaotic"] as const;
            level.transmuteAltar = {
                x: p.x,
                y: p.y,
                uses: TRANSMUTE_ALTAR_USES,
                alignment: alignments[(p.x + p.y + depth) % alignments.length],
            };
        }
    }

    // 빅룸 일부 변형에는 마법이 아닌 분수가 무리 지어 선다. 자리는 겹치지 않게 고른다.
    if (bigRoom && rng.chance(0.5)) {
        const avoid = [down, level.upStairs, level.anvil, ...level.traps];
        const spots = rng.shuffle(openTiles(level, level.rooms[0], avoid));
        const count = rng.between(4, 7);
        for (const p of spots.slice(0, count)) level.fountains!.push({ ...p, magic: false, magicUsed: false, drinks: 0 });
    }

    // 일반 층 분수는 방 안에만 선다. 계단·모루·특수 방·함정·변환 제단과 자리를 겹치지 않는다.
    // 2층부터 층마다 1/5 확률로 하나까지 둔다.
    if (!bigRoom && depth > 1 && rng.chance(0.2)) {
        const avoid = [down, level.upStairs, level.anvil, ...level.traps,
            ...(level.transmuteAltar ? [level.transmuteAltar] : [])].filter((p): p is Pos => !!p);
        const spots = level.rooms.flatMap((r, i) =>
            r.gone || r.maze || r.vault || i === level.special?.room ? [] : openTiles(level, r, avoid),
        );
        const p = rng.pick(spots);
        if (p) level.fountains!.push({ ...p, magic: rng.chance(0.1), magicUsed: false, drinks: 0 });
    }

    return level;
}

/** 변환 제단이 설 확률(%) — 2층부터, 층마다 따로 굴린다. */
export const TRANSMUTE_ALTAR_CHANCE = 25;
/** 제단 하나로 바꿀 수 있는 횟수 — 잡동사니를 몽땅 올려 층 드롭을 다시 뽑는 것을 막는다. */
export const TRANSMUTE_ALTAR_USES = 3;

/**
 * 상점의 자리를 잡는다 — 문 하나, 주인이 막아 서는 문 안쪽 한 칸, 비켜 서는 한 칸.
 * 주인과 진열품은 `game.populate` 가 놓는다(몬스터·물건 번호가 판의 것이라서).
 *
 * **문을 연다** — 가게 문이 비밀문이면 찾기 전에는 가게가 없는 것과 같다.
 */
function openShop(level: Level, ri: number): ShopState | null {
    const r = level.rooms[ri];
    let door: Pos | null = null;
    for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
            const edge = x === r.x || x === r.x + r.w - 1 || y === r.y || y === r.y + r.h - 1;
            const t = level.tiles[idx(x, y)];
            if (edge && (t === T.DOOR || t === T.SECRET)) door = { x, y };
        }
    }
    const home = door && doorwayInside(r, door);
    if (!door || !home) return null;
    level.tiles[idx(door.x, door.y)] = T.DOOR;
    // 비켜 서는 자리 — 문과 같은 줄이 아닌 이웃 칸을 먼저 본다(그래야 문 앞이 트인다).
    const inside = (p: Pos) => p.x > r.x && p.x < r.x + r.w - 1 && p.y > r.y && p.y < r.y + r.h - 1;
    const along = door.x === r.x || door.x === r.x + r.w - 1 ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
    const cands = [...along, [1, 1], [-1, 1], [1, -1], [-1, -1], [home.x - door.x, home.y - door.y]]
        .map(([dx, dy]) => ({ x: home.x + dx, y: home.y + dy }))
        .filter((p) => inside(p) && walkable(level.tiles[idx(p.x, p.y)] as Tile));
    const rest = cands[0];
    if (!rest) return null;
    return { room: ri, door, home, rest, angry: false, debt: 0, till: startingTill(level.depth) };
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
