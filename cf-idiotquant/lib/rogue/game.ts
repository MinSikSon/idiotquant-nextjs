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
    isVisible,
    monsterSees,
    revealAll,
} from "./fov";
import {
    addToPack,
    equippedArmor,
    equippedWeapon,
    gainExp,
    hasRing,
    heroArmor,
    hungerOf,
    hungerRate,
    isWorn,
    makeHero,
    packItem,
    regenEvery,
    searchChance,
    takeFromPack,
    wornRings,
} from "./hero";
import {
    diceLine,
    heroAttack,
    monsterAttack,
    seenBefore,
    swing,
} from "./combat";
import {
    RINGS,
    WANDS,
    describe,
    isThrowable,
    itemChar,
    makeItem,
    randomItem,
    rollAppearances,
    weaponDamageOf,
} from "./items";
import {
    MONSTERS,
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
    type Trap,
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
    | { t: "putOn"; letter: string }
    | { t: "removeRing"; letter: string }
    | { t: "zap"; letter: string; dx: number; dy: number }
    | { t: "throw"; letter: string; dx: number; dy: number }
    | { t: "search" }
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

/**
 * 새 판.
 *
 * `bestiary` 는 **지난 판에서 이어받는 유일한 것**이다. 부르는 쪽(화면)이 저장소에서
 * 꺼내 넘긴다 — 엔진이 `localStorage` 를 알면 테스트가 브라우저를 필요로 하게 된다.
 */
export function newGame(
    seed = Math.floor(Math.random() * 0x7fffffff),
    bestiary: Record<string, number> = {},
): GameState {
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
        bestiary: { ...bestiary },
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
        if (r.killed) killMonster(state, target, rng);
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

    const trap = level.traps.find((t) => t.x === nx && t.y === ny);
    if (trap) springTrap(state, trap, rng);
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
        case "remove curse": {
            const freed = hero.pack.filter((p) => p.cursed);
            for (const p of freed) {
                p.cursed = false;
                p.curseKnown = false;
            }
            say(state, freed.length ? "몸에 붙었던 것이 헐거워졌다." : "누군가 지켜보는 듯하다.");
            break;
        }
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

function wield(state: GameState, letter: string): boolean {
    const hero = state.hero;
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
    state.known[`weapon:${it.type}`] = true;
    say(state, `${describe(it, state.known, state.appearance)}을(를) 쥐었다.`);
    if (revealCurse(state, it)) say(state, "손에 착 달라붙는다. 저주받았다!");
    return true;
}

function wear(state: GameState, letter: string): boolean {
    const hero = state.hero;
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
    state.known[`armor:${it.type}`] = true;
    say(state, `${describe(it, state.known, state.appearance)}을(를) 입었다. (방어 ${heroArmor(hero)})`);
    if (revealCurse(state, it)) say(state, "몸에 달라붙는다. 저주받았다!");
    return true;
}

/** 반지를 낀다 — 양손에 하나씩. **끼면 배가 더 고프다.** */
function putOn(state: GameState, letter: string): boolean {
    const hero = state.hero;
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
    state.known[`ring:${it.type}`] = true;
    say(state, `${describe(it, state.known, state.appearance)}을(를) 꼈다.`);
    if (revealCurse(state, it)) say(state, "손가락에서 빠지지 않는다. 저주받았다!");
    else say(state, `배가 더 빨리 고파진다. (한 걸음에 ${hungerRate(hero)})`);
    return true;
}

function removeRing(state: GameState, letter: string): boolean {
    const hero = state.hero;
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

function drop(state: GameState, letter: string): boolean {
    const { hero, level } = state;
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
): { x: number; y: number; monster?: Monster } {
    let x = from.x;
    let y = from.y;
    for (let i = 0; i < range; i++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny) || !walkable(tileAt(level, nx, ny))) break;
        x = nx;
        y = ny;
        const m = monsterAt(level, x, y);
        if (m) return { x, y, monster: m };
    }
    return { x, y };
}

/**
 * 쓰러뜨린 자리 — **손으로 때리든 지팡이로 쏘든 던져서 맞히든 전부 여기를 지난다.**
 *
 * 예전에는 손으로 때린 것만 따로 세고 있었다. 그 상태로 도감을 붙이면 「지팡이로만
 * 잡아 본 종은 영영 모른다」가 되는데, 그건 규칙이 아니라 빠뜨린 자리다.
 */
function killMonster(state: GameState, m: Monster, rng: Rng) {
    state.level.monsters = state.level.monsters.filter((o) => o.id !== m.id);
    state.bestiary[m.def.ch] = (state.bestiary[m.def.ch] ?? 0) + 1;
    const levels = gainExp(state.hero, m.def.exp, rng);
    for (const l of levels) say(state, `레벨 ${l} 이 되었다.`);
    if (state.bestiary[m.def.ch] === 1) {
        say(state, `${m.def.name}을(를) 처음 잡았다 — 이제 조사하면 속을 안다.`);
    }
}

/** 지팡이를 쏜다. 남은 횟수가 없으면 아무 일도 안 난다 — 그것도 정보다. */
function zap(state: GameState, letter: string, dx: number, dy: number, rng: Rng): boolean {
    const { hero, level } = state;
    const it = packItem(hero, letter);
    if (!it || it.kind !== "wand") {
        say(state, "쏠 수 있는 것이 아니다.");
        return false;
    }
    if (dx === 0 && dy === 0) {
        say(state, "어디를 겨눌지 정해야 한다.");
        return false;
    }
    if ((it.charges ?? 0) <= 0) {
        say(state, "지팡이가 아무 반응도 없다.");
        state.known[`wand:${it.type}`] = true;
        return true;
    }
    it.charges = (it.charges ?? 0) - 1;

    const hit = ray(level, hero, dx, dy, 12);
    const def = WANDS[it.type];
    const name = () => describe(it, state.known, state.appearance);

    if (!hit.monster) {
        say(state, `${name()}에서 무언가 뻗어 나가 사라졌다.`);
        return true;
    }
    state.known[`wand:${it.type}`] = true;
    const m = hit.monster;

    if (def?.damage) {
        const dmg = rng.rollDice(def.damage);
        m.hp -= dmg;
        m.awake = true;
        say(state, `${m.def.name}이(가) ${def.name}에 맞았다.`);
        if (m.hp <= 0) {
            say(state, `${m.def.name}을(를) 쓰러뜨렸다.`);
            killMonster(state, m, rng);
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
            const p = freeSpot(level, rng, [hero]);
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
function throwItem(state: GameState, letter: string, dx: number, dy: number, rng: Rng): boolean {
    const { hero, level } = state;
    const it = packItem(hero, letter);
    if (!it) return false;
    if (!isThrowable(it)) {
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

    const name = describe(it, state.known, state.appearance);
    takeFromPack(hero, it, 1);
    const hit = ray(level, hero, dx, dy, 8);

    // 물약은 깨진다. 무기는 떨어진 자리에 남는다 — 주우러 갈 수 있어야 한다.
    const land = (): void => {
        if (it.kind === "potion") return;
        const one = makeItem(it.kind, it.type, state.nextItemId++, hit.x, hit.y, 1);
        one.plusHit = it.plusHit;
        one.plusDam = it.plusDam;
        one.cursed = it.cursed;
        one.curseKnown = it.curseKnown;
        if (!itemAt(level, hit.x, hit.y)) level.items.push(one);
    };

    if (!hit.monster) {
        say(state, `${name}을(를) 던졌다.`);
        land();
        return true;
    }

    const m = hit.monster;
    m.awake = true;
    if (it.kind === "potion") {
        state.known[`potion:${it.type}`] = true;
        say(state, `물약이 ${m.def.name}에게 깨졌다.`);
        if (it.type === "confusion") {
            m.speed = -1;
            say(state, `${m.def.name}이(가) 비틀거린다.`);
        }
        return true;
    }

    // 던진 것도 명중 판정을 거친다. 손에 쥔 것보다 보정이 없다.
    const s = swing(hero.level, m.def.armor, it.plusHit ?? 0, rng);
    const eyes = [{ roll: s.roll, bonus: it.plusHit ?? 0 }];
    const need = seenBefore(state, m) ? s.need : null;
    if (!s.hit) {
        say(state, diceLine("나", eyes, need, null));
        say(state, `${name}이(가) ${m.def.name}을(를) 비껴갔다.`);
        land();
        return true;
    }
    const dice = weaponDamageOf(it);
    const dmg = Math.max(1, rng.rollDice(dice) + (it.plusDam ?? 0));
    m.hp -= dmg;
    say(state, diceLine("나", eyes, need, { dice, bonus: it.plusDam ?? 0, total: dmg }));
    say(state, `${name}이(가) ${m.def.name}에게 맞았다.`);
    if (m.hp <= 0) {
        say(state, `${m.def.name}을(를) 쓰러뜨렸다.`);
        killMonster(state, m, rng);
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
function search(state: GameState, rng: Rng): boolean {
    const { hero, level } = state;
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

/** 함정을 밟았다. **찾아 둔 함정도 밟으면 터진다** — 아는 것과 피하는 것은 다르다. */
function springTrap(state: GameState, trap: Trap, rng: Rng) {
    const { hero, level } = state;
    trap.found = true;
    switch (trap.kind) {
        case "trapdoor":
            say(state, "바닥이 꺼졌다!");
            enterLevel(state, level.depth + 1, rng, false);
            say(state, `지하 ${state.level.depth}층.`);
            break;
        case "arrow": {
            const dmg = rng.roll(1, 6);
            hero.hp -= dmg;
            say(state, "어디선가 화살이 날아왔다!");
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
            const p = freeSpot(level, rng, [level.stairs]);
            hero.x = p.x;
            hero.y = p.y;
            say(state, "몸이 홱 당겨졌다.");
            break;
        }
        case "dart":
            hero.hp -= rng.roll(1, 4);
            if (hasRing(hero, "sustain strength")) {
                say(state, "다트에 찔렸다. 힘은 그대로다.");
            } else {
                hero.str = Math.max(3, hero.str - 1);
                say(state, "독 다트에 찔렸다. 힘이 빠졌다.");
            }
            break;
    }
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

/**
 * 위로 간다.
 *
 * **막히는 자리는 밖으로 나가는 문 하나뿐이다.** 1층의 계단은 곧 끝이라 증표가
 * 있어야 오르지만, 그 아래에서는 언제든 물러설 수 있다. 물러설 길이 없으면 「도망」이
 * 선택지에서 빠지고, 그러면 깊이를 고르는 일이 결정이 아니라 그냥 내려가기가 된다.
 *
 * 물러서는 값은 따로 안 매겨도 이미 치른다 — **층은 다시 짜인다.** 올라간 층은 내가
 * 알던 그 층이 아니고, 되내려가면 또 새 층이다. 밟아 둔 지도와 남겨 둔 물건이
 * 그때 사라진다. 점수는 `deepest` 로 재므로 물러선다고 깎이지도, 얕게 맴돈다고
 * 벌리지도 않는다.
 */
function ascend(state: GameState, rng: Rng): boolean {
    const { hero, level } = state;
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
    enterLevel(state, level.depth - 1, rng, false);
    say(state, `지하 ${state.level.depth}층. 층은 다시 짜였다.`);
    return true;
}

/** 배고픔 시계. 넘어서는 순간에만 말한다 — 매 턴 말하면 그 말이 안 읽힌다. */
function tickHunger(state: GameState, rng: Rng) {
    const hero = state.hero;
    const before = hungerOf(hero);
    hero.food -= hungerRate(hero);
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
function monsterTurns(state: GameState, rng: Rng) {
    const { hero, level } = state;
    for (const m of [...level.monsters]) {
        if (m.hp <= 0) continue;
        if (m.speed < 0 && state.turn % 2 === 0) continue;
        const acts = m.speed > 0 ? 2 : 1;
        for (let n = 0; n < acts; n++) {
            if (m.hp <= 0 || state.hero.hp <= 0) break;
            monsterAct(state, m, rng);
        }
    }
    // 특수 공격으로 스스로 사라진 놈들(레프러콘·님프)을 치운다.
    level.monsters = level.monsters.filter((m) => m.hp > 0);
}

function monsterAct(state: GameState, m: Monster, rng: Rng) {
    const { hero, level } = state;
    {
        if (!m.awake) {
            if (monsterSees(level, m.x, m.y, hero) && m.def.mean) m.awake = true;
            else return;
        }
        if (m.def.still) {
            if (Math.abs(m.x - hero.x) <= 1 && Math.abs(m.y - hero.y) <= 1) {
                say(state, ...monsterAttack(state, m, rng).messages);
            }
            return;
        }
        if (Math.abs(m.x - hero.x) <= 1 && Math.abs(m.y - hero.y) <= 1) {
            say(state, ...monsterAttack(state, m, rng).messages);
            return;
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
}

/** 눈이 먼 동안에는 발밑 말고는 아무것도 안 보인다. */
function applyBlind(state: GameState) {
    if (state.hero.blind <= 0) return;
    state.hero.detect = 0;
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

    // **곰덫은 다르다** — 자리를 못 뜰 뿐, 싸우고 마시고 읽는 것은 할 수 있다.
    // 잠처럼 통째로 막으면 덫이 「몇 턴간 아무것도 못 한다」가 되어 잠과 같아진다.
    if (state.hero.stuck > 0 && cmd.t === "move") {
        state.hero.stuck -= 1;
        const target = monsterAt(state.level, state.hero.x + cmd.dx, state.hero.y + cmd.dy);
        if (!target) {
            say(state, "덫에 걸려 발이 안 떨어진다.");
            return finishTurn(state, rng, true);
        }
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
        case "putOn":
            acted = putOn(state, cmd.letter);
            break;
        case "removeRing":
            acted = removeRing(state, cmd.letter);
            break;
        case "zap":
            acted = zap(state, cmd.letter, cmd.dx, cmd.dy, rng);
            break;
        case "throw":
            acted = throwItem(state, cmd.letter, cmd.dx, cmd.dy, rng);
            break;
        case "search":
            acted = search(state, rng);
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
    if (state.hero.detect > 0) state.hero.detect -= 1;
    // 순간이동 반지는 가끔 나를 아무 데나 던진다 — 좋은 반지가 아니다.
    if (hasRing(state.hero, "teleportation") && rng.rnd(80) === 0) {
        const p = freeSpot(state.level, rng, [state.level.stairs]);
        state.hero.x = p.x;
        state.hero.y = p.y;
        say(state, "반지가 나를 어딘가로 던졌다.");
    }

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
    armor?: number;
    damage?: string[];
    exp?: number;
    hpDice?: string;
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
    const { level, hero } = state;
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
                armor: m.def.armor,
                damage: m.def.damage.filter((d) => d !== "0d0"),
                exp: m.def.exp,
                hpDice: m.def.hp,
                mean: m.def.mean,
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
    armor: number;
    damage: string[];
    exp: number;
    hpDice: string;
    mean: boolean;
}

export function bestiaryRows(bestiary: Record<string, number>): BestiaryRow[] {
    return Object.keys(MONSTERS)
        .filter((ch) => (bestiary[ch] ?? 0) > 0)
        .map((ch) => {
            const d = MONSTERS[ch];
            return {
                ch,
                name: d.name,
                kills: bestiary[ch],
                level: d.level,
                armor: d.armor,
                damage: d.damage.filter((x: string) => x !== "0d0"),
                exp: d.exp,
                hpDice: d.hp,
                mean: d.mean,
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

    // 괴물 감지 물약을 마신 동안에는 벽 너머의 놈도 보인다.
    if (visible || hero.detect > 0) {
        const m = monsterAt(level, x, y);
        if (m) return { ch: m.def.ch, kind: visible ? "monster" : "monster-sensed" };
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
            // **찾기 전에는 벽이다.** 다른 글자를 주면 화면이 비밀을 흘린다.
            return { ch: "-", kind: visible ? "wall" : "wall-dim" };
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
