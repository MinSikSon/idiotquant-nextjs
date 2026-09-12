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
    T,
    type Tile,
    idx,
    inBounds,
    walkable,
} from "./types";

const COLS = 3;
const ROWS = 3;

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
    let x = door.x + dx;
    let y = door.y + dy;
    for (let step = 0; step < Math.max(r.w, r.h); step++) {
        if (!inBounds(x, y)) return;
        if (get(tiles, x, y) === T.CORRIDOR) return; // 미로에 닿았다
        put(tiles, x, y, T.CORRIDOR);
        x += dx;
        y += dy;
    }
}

type Side = "left" | "right" | "top" | "bottom";

/**
 * 복도가 방에서 나가는 자리.
 *
 * 진짜 방이면 벽에 문을 내고 그 **바깥 한 칸**에서 복도를 시작한다. 없는 방이면
 * 문이라는 것이 없으므로 그 점 자체가 시작이다.
 */
function exitPoint(r: Room, side: Side, rng: Rng): { door: Pos | null; start: Pos } {
    if (r.gone) return { door: null, start: { x: r.x, y: r.y } };
    switch (side) {
        case "right": {
            const y = rng.between(r.y + 1, r.y + r.h - 2);
            return { door: { x: r.x + r.w - 1, y }, start: { x: r.x + r.w, y } };
        }
        case "left": {
            const y = rng.between(r.y + 1, r.y + r.h - 2);
            return { door: { x: r.x, y }, start: { x: r.x - 1, y } };
        }
        case "bottom": {
            const x = rng.between(r.x + 1, r.x + r.w - 2);
            return { door: { x, y: r.y + r.h - 1 }, start: { x, y: r.y + r.h } };
        }
        case "top": {
            const x = rng.between(r.x + 1, r.x + r.w - 2);
            return { door: { x, y: r.y }, start: { x, y: r.y - 1 } };
        }
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
 *
 * 꺾는 자리는 **양 끝을 뺀 안쪽**에서 고른다. 끝에서 꺾으면 그 끝을 나서는 첫 걸음이
 * 없어져서 복도가 **옆으로만** 붙는데, 그 끝이 「없는 방」이면 이미 다른 복도가 물고
 * 있던 바로 그 방향이라 길이 하나로 겹친다 — 갈림길이어야 할 자리가 막다른 골목이
 * 된다. 길이가 2 미만이면 안쪽이 없으니 그대로 둔다.
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

const N4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** 「없는 방」의 그 한 점인가 — 방은 방이라, 길 하나만 물고 있어도 지우면 안 된다. */
function isGoneAnchor(rooms: Room[], x: number, y: number): boolean {
    return rooms.some((r) => r.gone && r.x === x && r.y === y);
}

/** 미로 방의 사각형 안인가 — 다듬기가 절대 건드리면 안 되는 자리. */
function inMazeRoom(rooms: Room[], x: number, y: number): boolean {
    return rooms.some(
        (r) => r.maze && !r.gone && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h,
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
        for (let y = 1; y < MAP_H - 1; y++) {
            for (let x = 1; x < MAP_W - 1; x++) {
                const t = get(tiles, x, y);
                if (t !== T.CORRIDOR && t !== T.PASSAGE) continue;
                // **미로 안은 건드리지 않는다.** 미로는 막다른 길로 이루어진 것이라,
                // 여기서 잎사귀를 떼기 시작하면 미로가 통째로 풀려 사라진다.
                if (inMazeRoom(rooms, x, y)) continue;
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

/** 무엇도 놓이지 않은 빈 바닥을 찾는다. 못 찾으면 아무 자리나 준다. */
export function freeSpot(level: Level, rng: Rng, avoid: Pos[] = []): Pos {
    const real = level.rooms.filter((r) => !r.gone);
    for (let tries = 0; tries < 200; tries++) {
        const room = rng.pick(real) ?? level.rooms[0];
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
        const ea = exitPoint(ra, e.horizontal ? "right" : "bottom", rng);
        const eb = exitPoint(rb, e.horizontal ? "left" : "top", rng);
        if (ea.door) {
            put(tiles, ea.door.x, ea.door.y, T.DOOR);
            doorsOf[e.a].push(ea.door);
        }
        if (eb.door) {
            put(tiles, eb.door.x, eb.door.y, T.DOOR);
            doorsOf[e.b].push(eb.door);
        }
        connect(tiles, ea.start, eb.start, e.horizontal, rng);
        if (extra.includes(e)) extraDoors.push(...[ea.door, eb.door].filter((d): d is Pos => !!d));
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
        maze: anyMaze,
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

    // 함정. 1층에는 없다 — 처음 켠 사람이 영문도 모르고 떨어지면 배울 것이 안 남는다.
    if (depth > 1) {
        const kinds: TrapKind[] = ["trapdoor", "arrow", "sleep", "beartrap", "teleport", "dart"];
        const count = rng.rnd(Math.min(5, 1 + Math.floor(depth / 2))) + 1;
        for (let i = 0; i < count; i++) {
            const p = freeSpot(level, rng, [down, level.upStairs]);
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
