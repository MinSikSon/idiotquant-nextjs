/**
 * 값의 모양.
 *
 * 이 파일은 규칙을 담지 않는다 — 모양만 담는다. 계산이 필요해지면 그 옆의 모듈로
 * 간다(`dungeon` · `fov` · `combat` · `game`). 여기에 함수가 늘기 시작하면 규칙이
 * 두 곳에 살게 된다.
 */

/** 지도 크기 — Rogue 원작의 80×24 에서 메시지 줄과 상태 줄을 뺀 넓이. */
export const MAP_W = 80;
export const MAP_H = 22;

/** 지하 몇 층에 증표가 있는가. 원작과 같다. */
export const AMULET_LEVEL = 26;

export type Tile =
    | 0 // 바위 (아직 아무것도 아닌 곳)
    | 1 // 방 바닥
    | 2 // 가로 벽 ─
    | 3 // 세로 벽 │
    | 4 // 문
    | 5 // 복도
    | 6 // 아래로 가는 계단
    | 7 // 통로 (없는 방의 교차점)
    | 8; // 비밀문 — 찾기 전에는 벽이다

export const T = {
    ROCK: 0 as Tile,
    FLOOR: 1 as Tile,
    WALL_H: 2 as Tile,
    WALL_V: 3 as Tile,
    DOOR: 4 as Tile,
    CORRIDOR: 5 as Tile,
    STAIRS: 6 as Tile,
    PASSAGE: 7 as Tile,
    SECRET: 8 as Tile,
} as const;

/**
 * 걸어 들어갈 수 있는 칸인가.
 *
 * **비밀문은 여기 없다.** 찾기 전에는 벽이고, 찾으면 `T.DOOR` 로 **바뀐다** —
 * 「찾았다」를 따로 기억하지 않는 것이 이 게임에서 제일 단순한 길이다. 만약 비밀문을
 * walkable 에 넣으면 찾지도 않은 문을 걸어서 지나가게 된다.
 */
export function walkable(t: Tile): boolean {
    return t === T.FLOOR || t === T.DOOR || t === T.CORRIDOR || t === T.STAIRS || t === T.PASSAGE;
}

export interface Pos {
    x: number;
    y: number;
}

export interface Room {
    /** 벽을 포함한 사각형. 안쪽은 x+1 … x+w-2. */
    x: number;
    y: number;
    w: number;
    h: number;
    /** 어두운 방은 인접한 칸만 보인다. 깊을수록 잦다. */
    dark: boolean;
    /** 「없는 방」 — 방이 아니라 복도의 교차점 한 칸이다. */
    gone: boolean;
    /** 미로 방 — 안쪽이 바닥이 아니라 얽힌 통로다. 깊은 층에만 선다. */
    maze: boolean;
}

export interface MonsterDef {
    /** 화면의 글자. Rogue 는 A–Z 스물여섯이다. */
    ch: string;
    name: string;
    /** 경험치. */
    exp: number;
    level: number;
    /** 방어 등급 — **낮을수록 단단하다**(원작과 같다). */
    armor: number;
    /** 체력 주사위. */
    hp: string;
    /** 때릴 때 굴리는 것. 여러 번 때리는 놈은 여러 개. */
    damage: string[];
    /** 보자마자 쫓아오는가. 아니면 건드릴 때까지 가만히 있는가. */
    mean: boolean;
    /** 자기 자리에서 안 움직인다 (파리지옥처럼). */
    still?: boolean;
}

export interface Monster {
    def: MonsterDef;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    /** 쫓는 중인가. 한 번 깨면 계속 쫓는다. */
    awake: boolean;
    /** 이번 층에서만 쓰는 식별자 — 화면이 같은 놈을 계속 짚는 데 쓴다. */
    id: number;
    /** −1 느리다(두 턴에 한 번) · 0 보통 · +1 빠르다(한 턴에 두 번). 지팡이가 바꾼다. */
    speed: number;
    /** 무력화됐는가 — 특수 공격을 잃는다. */
    cancelled: boolean;
}

export type ItemKind =
    | "gold"
    | "food"
    | "potion"
    | "scroll"
    | "weapon"
    | "armor"
    | "ring"
    | "wand"
    | "amulet";

export interface Item {
    id: number;
    kind: ItemKind;
    /** 종류 안에서의 갈래 — `"healing"` · `"mace"` 처럼 **참 이름**이다. */
    type: string;
    /** 금화 더미의 액수, 또는 같은 물건이 몇 개인가. */
    count: number;
    /** 바닥에 있으면 좌표, 들고 있으면 −1. */
    x: number;
    y: number;
    /** 배낭에서의 자리 — Rogue 의 a·b·c 그것이다. */
    letter?: string;
    /** 무기의 손질 정도. */
    plusHit?: number;
    plusDam?: number;
    /** 갑옷의 손질 정도 — 방어 등급을 그만큼 **내린다**(낮을수록 단단하다). */
    plusArmor?: number;
    /** 반지의 세기. 보호 반지 +2 는 방어 등급을 2 내린다. */
    plusRing?: number;
    /** 지팡이에 남은 횟수. 0 이면 아무 일도 안 난다. */
    charges?: number;
    /**
     * 저주받았는가.
     *
     * 쥐거나 입은 **순간에** 드러난다 — 그전에는 알 수 없다. 저주받은 것은 벗을 수도
     * 놓을 수도 없다. 그것이 이 게임에서 「좋아 보이는 것을 집는 일」에 값을 매긴다.
     */
    cursed?: boolean;
    /** 저주가 드러났는가 — 화면이 「(저주)」를 붙일지 정한다. */
    curseKnown?: boolean;
}

/** 함정 — 밟기 전에는 바닥과 구별되지 않는다. */
export type TrapKind =
    | "trapdoor"
    | "arrow"
    | "sleep"
    | "beartrap"
    | "teleport"
    | "dart";

export interface Trap {
    x: number;
    y: number;
    kind: TrapKind;
    /** 밟았거나 뒤져서 찾았는가. 찾은 함정만 화면에 뜬다. */
    found: boolean;
}

export interface Level {
    depth: number;
    tiles: Uint8Array;
    /** 1 = 본 적 있다(기억). 2 = 지금 보인다. */
    flags: Uint8Array;
    rooms: Room[];
    /** 칸마다 어느 방인지. -1 이면 방이 아니다. */
    roomAt: Int8Array;
    monsters: Monster[];
    items: Item[];
    traps: Trap[];
    stairs: Pos;
    /** 올라가는 계단 — 1층의 그것이 바깥으로 나가는 문이다. */
    upStairs: Pos | null;
    /** 미로층인가 — 방 대신 통로가 얽힌 층. 깊을수록 잦다. */
    maze: boolean;
}

export interface Hero {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    /** 경험치와 그것이 만든 레벨. */
    exp: number;
    level: number;
    str: number;
    maxStr: number;
    gold: number;
    /** 배낭. 자리는 `letter` 가 진다. */
    pack: Item[];
    /** 지금 쥔 것 · 입은 것 · 낀 것. 없으면 null. */
    weaponId: number | null;
    armorId: number | null;
    /** 반지는 양손에 하나씩. 두 개를 끼면 배가 두 배로 고프다. */
    leftRingId: number | null;
    rightRingId: number | null;
    /** 남은 식량 시계. 0 밑으로 내려가면 굶어 죽는다. */
    food: number;
    hasAmulet: boolean;
    /** 몇 턴 동안 앞이 안 보이는가 · 헷갈리는가 · 자는가 · 덫에 걸려 있는가. */
    blind: number;
    confused: number;
    asleep: number;
    stuck: number;
    /** 괴물이 벽 너머로도 보이는 남은 턴. */
    detect: number;
}

export type Phase = "playing" | "dead" | "won";

export interface GameState {
    seed: number;
    rngState: number;
    level: Level;
    hero: Hero;
    /** 화면 맨 위에 쌓이는 것. 최신이 끝. */
    messages: string[];
    /** 지나간 턴 수 — 점수와 배고픔의 시계. */
    turn: number;
    phase: Phase;
    /** 죽은 까닭 · 이긴 까닭. */
    epitaph: string;
    /** 가 본 제일 깊은 곳. */
    deepest: number;
    /**
     * 이 판에서 물약과 주문서가 **어떻게 생겼는가.** 판마다 섞이므로 「파란 물약」이
     * 무엇인지는 마셔 봐야 안다 — Rogue 의 수집이 이것이다.
     */
    appearance: Record<string, string>;
    /** 정체를 알아낸 것들. 판을 넘지 않는다. */
    known: Record<string, boolean>;
    /**
     * 여태 잡아 본 몬스터와 그 수 — **판을 넘어 남는다.**
     *
     * 물약의 색과는 다른 것이다. 색은 **그 판의 물건**이라 판마다 섞이지만, 오크가
     * 얼마나 단단한지는 **세상의 사실**이라 죽는다고 잊히지 않는다. 그래서 죽어도
     * 남는 유일한 것이 되고, 그것이 다시 하는 이유다.
     */
    bestiary: Record<string, number>;
    /** 다음 물건에 줄 번호. */
    nextItemId: number;
}

export type Dir = { dx: number; dy: number };

/** 여덟 방향. Rogue 는 대각선도 한 걸음이다. */
export const DIRS: Record<string, Dir> = {
    h: { dx: -1, dy: 0 },
    j: { dx: 0, dy: 1 },
    k: { dx: 0, dy: -1 },
    l: { dx: 1, dy: 0 },
    y: { dx: -1, dy: -1 },
    u: { dx: 1, dy: -1 },
    b: { dx: -1, dy: 1 },
    n: { dx: 1, dy: 1 },
};

export const ALL_DIRS: Dir[] = Object.values(DIRS);

export function idx(x: number, y: number): number {
    return y * MAP_W + x;
}

export function inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
}
