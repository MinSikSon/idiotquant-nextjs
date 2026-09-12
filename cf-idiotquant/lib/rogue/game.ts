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
    freeSpot,
    randomSpotIn,
} from "./dungeon";
import {
    computeFov,
    monsterSees,
    revealAll,
} from "./fov";
import {
    addToPack,
    equippedArmor,
    equippedWeapon,
    gainExp,
    heroArmor,
    hungerOf,
    makeHero,
    packItem,
    takeFromPack,
} from "./hero";
import {
    heroAttack,
    monsterAttack,
} from "./combat";
import {
    describe,
    itemChar,
    makeItem,
    randomItem,
    rollAppearances,
} from "./items";
import {
    randomMonsterChar,
    spawnMonster,
} from "./monsters";
import {
    Rng,
} from "./rng";
import {
    AMULET_LEVEL,
    ALL_DIRS,
    type GameState,
    type Item,
    type Level,
    MAP_H,
    MAP_W,
    type Monster,
    type Pos,
    T,
    type Tile,
    idx,
    inBounds,
    walkable,
} from "./types";

export type Command =
    | { t: "move"; dx: number; dy: number }
    | { t: "rest" }
    | { t: "descend" }
    | { t: "ascend" }
    | { t: "pickup" }
    | { t: "quaff"; letter: string }
    | { t: "read"; letter: string }
    | { t: "eat"; letter: string }
    | { t: "wield"; letter: string }
    | { t: "wear"; letter: string }
    | { t: "drop"; letter: string };

/** 메시지는 여기로만 들어온다 — 화면이 직접 밀어 넣지 않는다. */
function say(state: GameState, ...lines: string[]) {
    for (const l of lines) if (l) state.messages.push(l);
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
 * 깊을수록 몬스터가 많다. 물건은 깊이와 상관없이 고르게 나오되 **금화는 깊이를 탄다** —
 * 깊이 내려갈 이유가 점수라서다.
 */
function populate(state: GameState, level: Level, rng: Rng) {
    const monsterCount = rng.rnd(4) + 2 + Math.floor(level.depth / 3);
    for (let i = 0; i < monsterCount; i++) {
        const p = freeSpot(level, rng, [state.hero, level.stairs]);
        level.monsters.push(spawnMonster(randomMonsterChar(level.depth, rng), p.x, p.y, rng));
    }

    const itemCount = rng.rnd(3) + 2;
    for (let i = 0; i < itemCount; i++) {
        const p = freeSpot(level, rng, [state.hero, level.stairs]);
        level.items.push(randomItem(level.depth, state.nextItemId++, p.x, p.y, rng));
    }

    // 증표는 딱 한 층에 있다. 여기가 이 판의 바닥이다.
    if (level.depth === AMULET_LEVEL) {
        const room = rng.pick(level.rooms.filter((r) => !r.gone)) ?? level.rooms[0];
        const p = randomSpotIn(room, rng);
        level.items.push(makeItem("amulet", "amulet", state.nextItemId++, p.x, p.y));
    }
}

/** 층 하나를 새로 만들고 나를 그 위에 세운다. */
function enterLevel(state: GameState, depth: number, rng: Rng, arriveAtUpStairs: boolean) {
    const level = buildLevel(depth, rng);
    // 내려왔으면 올라가는 계단 위에 선다 — 온 길이 발밑에 있어야 지도가 읽힌다.
    const start = arriveAtUpStairs && level.upStairs ? level.upStairs : freeSpot(level, rng, [level.stairs]);
    state.hero.x = start.x;
    state.hero.y = start.y;
    state.level = level;
    populate(state, level, rng);
    computeFov(level, state.hero);
    state.deepest = Math.max(state.deepest, depth);
}

export function newGame(seed = Math.floor(Math.random() * 0x7fffffff)): GameState {
    const rng = new Rng(seed);
    const state: GameState = {
        seed,
        rngState: rng.state,
        // 아래에서 곧바로 덮는다. 타입을 채우기 위한 빈 층.
        level: null as unknown as Level,
        hero: null as unknown as GameState["hero"],
        messages: [],
        turn: 0,
        phase: "playing",
        epitaph: "",
        deepest: 1,
        appearance: {},
        known: {},
        nextItemId: 1,
    };
    state.appearance = rollAppearances(rng);
    state.hero = makeHero(rng, () => state.nextItemId++);
    // 처음 쥔 것은 무엇인지 안다.
    state.known["weapon:mace"] = true;
    state.known["armor:ring mail"] = true;
    state.known["food:food ration"] = true;
    enterLevel(state, 1, rng, false);
    state.rngState = rng.state;
    say(state, "지하 1층. 옌더의 증표는 26층에 있다.");
    return state;
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

function heroMove(state: GameState, dx: number, dy: number, rng: Rng): boolean {
    const hero = state.hero;
    const level = state.level;

    // 헷갈리는 동안에는 가려던 곳으로 못 간다.
    if (hero.confused > 0 && rng.chance(0.6)) {
        const d = rng.pick(ALL_DIRS)!;
        dx = d.dx;
        dy = d.dy;
    }

    const nx = hero.x + dx;
    const ny = hero.y + dy;
    if (!inBounds(nx, ny)) return false;

    const target = monsterAt(level, nx, ny);
    if (target) {
        const r = heroAttack(state, target, rng);
        say(state, ...r.messages);
        if (r.killed) {
            level.monsters = level.monsters.filter((m) => m.id !== target.id);
            const levels = gainExp(hero, target.def.exp, rng);
            for (const l of levels) say(state, `레벨 ${l} 이 되었다.`);
        }
        return true;
    }

    if (!walkable(tileAt(level, nx, ny))) return false;
    if (blockedDiagonal(level, hero, { x: nx, y: ny })) return false;

    hero.x = nx;
    hero.y = ny;

    const it = itemAt(level, nx, ny);
    if (it) {
        if (it.kind === "gold") {
            hero.gold += it.count;
            level.items = level.items.filter((i) => i.id !== it.id);
            say(state, `금화 ${it.count}을(를) 주웠다.`);
        } else {
            say(state, `발밑에 ${describe(it, state.known, state.appearance)}이(가) 있다.`);
        }
    }
    if (tileAt(level, nx, ny) === T.STAIRS) say(state, "아래로 가는 계단이다.");
    if (level.upStairs && level.upStairs.x === nx && level.upStairs.y === ny) {
        say(state, level.depth === 1 ? "바깥으로 나가는 계단이다." : "위로 가는 계단이다.");
    }
    return true;
}

function pickUp(state: GameState): boolean {
    const { hero, level } = state;
    const it = itemAt(level, hero.x, hero.y);
    if (!it) {
        say(state, "여기에는 아무것도 없다.");
        return false;
    }
    if (it.kind === "gold") {
        hero.gold += it.count;
        level.items = level.items.filter((i) => i.id !== it.id);
        say(state, `금화 ${it.count}을(를) 주웠다.`);
        return true;
    }
    if (!addToPack(hero, it)) {
        say(state, "배낭이 꽉 찼다.");
        return false;
    }
    level.items = level.items.filter((i) => i.id !== it.id);
    if (it.kind === "amulet") {
        hero.hasAmulet = true;
        say(state, "옌더의 증표를 손에 넣었다! 이제 올라갈 수 있다.");
    } else {
        say(state, `${it.letter}) ${describe(it, state.known, state.appearance)}`);
    }
    return true;
}

function quaff(state: GameState, letter: string, rng: Rng): boolean {
    const { hero } = state;
    const it = packItem(hero, letter);
    if (!it || it.kind !== "potion") {
        say(state, "마실 수 있는 것이 아니다.");
        return false;
    }
    const key = `potion:${it.type}`;
    takeFromPack(hero, it);
    state.known[key] = true;

    switch (it.type) {
        case "healing": {
            const heal = rng.roll(hero.level, 4);
            if (hero.hp + heal >= hero.maxHp) hero.maxHp += 1;
            hero.hp = Math.min(hero.maxHp, hero.hp + heal);
            say(state, "기운이 돈다.");
            break;
        }
        case "extra healing": {
            const heal = rng.roll(hero.level, 8);
            if (hero.hp + heal >= hero.maxHp) hero.maxHp += 2;
            hero.hp = Math.min(hero.maxHp, hero.hp + heal);
            hero.blind = 0;
            say(state, "몸이 놀랄 만큼 가볍다.");
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
    }
    return true;
}

function read(state: GameState, letter: string, rng: Rng): boolean {
    const { hero, level } = state;
    if (hero.blind > 0) {
        say(state, "앞이 안 보여 읽을 수 없다.");
        return false;
    }
    const it = packItem(hero, letter);
    if (!it || it.kind !== "scroll") {
        say(state, "읽을 수 있는 것이 아니다.");
        return false;
    }
    const key = `scroll:${it.type}`;
    takeFromPack(hero, it);
    state.known[key] = true;

    switch (it.type) {
        case "magic mapping":
            revealAll(level);
            say(state, "이 층의 지도가 머릿속에 그려졌다.");
            break;
        case "teleport": {
            const p = freeSpot(level, rng, [level.stairs]);
            hero.x = p.x;
            hero.y = p.y;
            say(state, "몸이 홱 당겨졌다.");
            break;
        }
        case "enchant weapon": {
            const w = equippedWeapon(hero);
            if (!w) {
                say(state, "손이 잠깐 저릿했다.");
                break;
            }
            w.plusHit = (w.plusHit ?? 0) + 1;
            w.plusDam = (w.plusDam ?? 0) + 1;
            state.known[`weapon:${w.type}`] = true;
            say(state, `${describe(w, state.known, state.appearance)}이(가) 파랗게 빛난다.`);
            break;
        }
        case "enchant armor": {
            const a = equippedArmor(hero);
            if (!a) {
                say(state, "등이 잠깐 서늘했다.");
                break;
            }
            a.plusArmor = (a.plusArmor ?? 0) + 1;
            state.known[`armor:${a.type}`] = true;
            say(state, `${describe(a, state.known, state.appearance)}이(가) 단단해졌다.`);
            break;
        }
        case "identify":
            for (const p of hero.pack) state.known[`${p.kind}:${p.type}`] = true;
            say(state, "배낭 속의 것들이 무엇인지 알겠다.");
            break;
        case "aggravate monsters":
            for (const m of level.monsters) m.awake = true;
            say(state, "어디선가 일제히 깨어나는 소리가 났다.");
            break;
        case "sleep":
            hero.asleep += rng.between(4, 9);
            say(state, "눈꺼풀이 감긴다…");
            break;
    }
    return true;
}

function eat(state: GameState, letter: string, rng: Rng): boolean {
    const { hero } = state;
    const it = packItem(hero, letter);
    if (!it || it.kind !== "food") {
        say(state, "먹을 수 있는 것이 아니다.");
        return false;
    }
    takeFromPack(hero, it);
    hero.food = Math.min(2000, Math.max(hero.food, 0) + rng.between(900, 1300));
    say(state, "배가 든든하다.");
    return true;
}

function wield(state: GameState, letter: string): boolean {
    const it = packItem(state.hero, letter);
    if (!it || it.kind !== "weapon") {
        say(state, "쥘 수 있는 것이 아니다.");
        return false;
    }
    state.hero.weaponId = it.id;
    state.known[`weapon:${it.type}`] = true;
    say(state, `${describe(it, state.known, state.appearance)}을(를) 쥐었다.`);
    return true;
}

function wear(state: GameState, letter: string): boolean {
    const it = packItem(state.hero, letter);
    if (!it || it.kind !== "armor") {
        say(state, "입을 수 있는 것이 아니다.");
        return false;
    }
    state.hero.armorId = it.id;
    state.known[`armor:${it.type}`] = true;
    say(state, `${describe(it, state.known, state.appearance)}을(를) 입었다. (방어 ${heroArmor(state.hero)})`);
    return true;
}

function drop(state: GameState, letter: string): boolean {
    const { hero, level } = state;
    const it = packItem(hero, letter);
    if (!it) return false;
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

function descend(state: GameState, rng: Rng): boolean {
    const { hero, level } = state;
    if (tileAt(level, hero.x, hero.y) !== T.STAIRS) {
        say(state, "여기에는 내려가는 계단이 없다.");
        return false;
    }
    enterLevel(state, level.depth + 1, rng, true);
    say(state, `지하 ${state.level.depth}층.`);
    return true;
}

function ascend(state: GameState, rng: Rng): boolean {
    const { hero, level } = state;
    const up = level.upStairs;
    if (!up || up.x !== hero.x || up.y !== hero.y) {
        say(state, "여기에는 올라가는 계단이 없다.");
        return false;
    }
    if (!hero.hasAmulet) {
        say(state, "보이지 않는 힘이 앞을 막는다. 증표 없이는 돌아갈 수 없다.");
        return false;
    }
    if (level.depth === 1) {
        state.phase = "won";
        state.epitaph = `옌더의 증표를 들고 지상으로 나왔다. 금화 ${hero.gold}.`;
        revealAll(level);
        say(state, "햇빛이다. 살아 돌아왔다.");
        return true;
    }
    enterLevel(state, level.depth - 1, rng, false);
    say(state, `지하 ${state.level.depth}층.`);
    return true;
}

/** 배고픔 시계. 넘어서는 순간에만 말한다 — 매 턴 말하면 그 말이 안 읽힌다. */
function tickHunger(state: GameState, rng: Rng) {
    const hero = state.hero;
    const before = hungerOf(hero);
    hero.food -= 1;
    const after = hungerOf(hero);
    if (after !== before && after) say(state, `${after}.`);
    if (hero.food <= 0 && rng.chance(0.2)) {
        hero.asleep += 1;
        say(state, "배가 고파 정신이 아득하다.");
    }
    if (hero.food <= -200) {
        hero.hp = 0;
        state.epitaph = "굶어 죽었다.";
    }
}

/** 회복 — 레벨이 높을수록 빠르다. */
function regenerate(state: GameState) {
    const hero = state.hero;
    if (hero.hp >= hero.maxHp) return;
    const every = Math.max(3, 21 - hero.level * 2);
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

/** 몬스터의 차례. 자는 놈은 나를 알아보면 깬다. */
function monsterTurns(state: GameState, rng: Rng) {
    const { hero, level } = state;
    for (const m of [...level.monsters]) {
        if (m.hp <= 0) continue;
        if (!m.awake) {
            if (monsterSees(level, m.x, m.y, hero) && m.def.mean) m.awake = true;
            else continue;
        }
        if (m.def.still) {
            if (Math.abs(m.x - hero.x) <= 1 && Math.abs(m.y - hero.y) <= 1) {
                say(state, ...monsterAttack(state, m, rng).messages);
            }
            continue;
        }
        if (Math.abs(m.x - hero.x) <= 1 && Math.abs(m.y - hero.y) <= 1) {
            say(state, ...monsterAttack(state, m, rng).messages);
            continue;
        }
        // 박쥐와 황조롱이는 제멋대로 난다 — 원작의 그 성가심이다.
        const erratic = (m.def.ch === "B" || m.def.ch === "K") && rng.chance(0.5);
        const next = erratic
            ? (() => {
                  const d = rng.pick(ALL_DIRS)!;
                  const nx = m.x + d.dx;
                  const ny = m.y + d.dy;
                  return inBounds(nx, ny) && walkable(tileAt(level, nx, ny)) ? { x: nx, y: ny } : null;
              })()
            : stepToward(level, m, hero);
        if (next) {
            m.x = next.x;
            m.y = next.y;
        }
    }
    // 특수 공격으로 스스로 사라진 놈들(레프러콘·님프)을 치운다.
    level.monsters = level.monsters.filter((m) => m.hp > 0);
}

/** 눈이 먼 동안에는 발밑 말고는 아무것도 안 보인다. */
function applyBlind(state: GameState) {
    if (state.hero.blind <= 0) return;
    const { level, hero } = state;
    for (let i = 0; i < level.flags.length; i++) level.flags[i] &= ~2;
    level.flags[idx(hero.x, hero.y)] |= 2 | 1;
}

/**
 * 명령 하나. **돌아온 것이 새 판**이다 — 화면은 이것만 보고 다시 그린다.
 */
export function perform(state: GameState, cmd: Command): GameState {
    if (state.phase !== "playing") return state;
    const rng = rngOf(state);

    // 얼어붙었거나 자는 동안에는 내 차례가 없다. 그래도 시간은 간다.
    if (state.hero.asleep > 0) {
        state.hero.asleep -= 1;
        say(state, "움직일 수 없다.");
        return finishTurn(state, rng, true);
    }

    let acted = false;
    switch (cmd.t) {
        case "move":
            acted = heroMove(state, cmd.dx, cmd.dy, rng);
            break;
        case "rest":
            acted = true;
            break;
        case "pickup":
            acted = pickUp(state);
            break;
        case "descend":
            acted = descend(state, rng);
            break;
        case "ascend":
            acted = ascend(state, rng);
            break;
        case "quaff":
            acted = quaff(state, cmd.letter, rng);
            break;
        case "read":
            acted = read(state, cmd.letter, rng);
            break;
        case "eat":
            acted = eat(state, cmd.letter, rng);
            break;
        case "wield":
            acted = wield(state, cmd.letter);
            break;
        case "wear":
            acted = wear(state, cmd.letter);
            break;
        case "drop":
            acted = drop(state, cmd.letter);
            break;
    }

    return finishTurn(state, rng, acted);
}

function finishTurn(state: GameState, rng: Rng, acted: boolean): GameState {
    if (!acted) {
        // 아무 일도 안 일어났으면 턴을 안 쓴다. 난수 상태만 저장한다.
        state.rngState = rng.state;
        return { ...state };
    }

    state.turn += 1;
    tickHunger(state, rng);
    regenerate(state);
    if (state.hero.blind > 0) state.hero.blind -= 1;
    if (state.hero.confused > 0) state.hero.confused -= 1;

    if (state.phase === "playing" && state.hero.hp > 0) monsterTurns(state, rng);

    computeFov(state.level, state.hero);
    applyBlind(state);

    if (state.hero.hp <= 0 && state.phase === "playing") {
        state.hero.hp = 0;
        state.phase = "dead";
        if (!state.epitaph) state.epitaph = `지하 ${state.level.depth}층에서 쓰러졌다. 금화 ${state.hero.gold}.`;
        revealAll(state.level);
    }

    state.rngState = rng.state;
    return { ...state };
}

/** 점수 — 금화에 증표를 얹는다. */
export function score(state: GameState): number {
    return state.hero.gold + (state.hero.hasAmulet ? 10000 : 0) + state.deepest * 50;
}

/** 화면이 쓰는 글자표 — 한 곳에서만 정한다. */
export function glyphAt(state: GameState, x: number, y: number): { ch: string; kind: string } | null {
    const { level, hero } = state;
    if (!inBounds(x, y)) return null;
    const flags = level.flags[idx(x, y)];
    const visible = (flags & 2) !== 0;
    const seen = (flags & 1) !== 0;
    if (!seen) return null;

    if (hero.x === x && hero.y === y) return { ch: "@", kind: "hero" };

    if (visible) {
        const m = monsterAt(level, x, y);
        if (m) return { ch: m.def.ch, kind: "monster" };
    }
    const it = itemAt(level, x, y);
    if (it && (visible || seen)) return { ch: itemChar(it.kind), kind: `item-${it.kind}` };

    const t = tileAt(level, x, y);
    if (level.upStairs && level.upStairs.x === x && level.upStairs.y === y) {
        return { ch: "<", kind: "stairs" };
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
