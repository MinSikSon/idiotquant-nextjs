/**
 * 밸런스 자 — **정말 깨지는 게임인가.**
 *
 * 로그라이크는 경우의 수가 손으로 셀 수 있는 크기를 넘어선다. "해 보니 어렵던데" 는
 * 근거가 아니고, 표를 한 칸 고쳤을 때 무엇이 움직였는지는 재 봐야 안다. 그래서 봇
 * 하나가 수백 판을 대신 굴린다.
 *
 * 봇은 사람처럼 굴지 않는다 — **계단만 보고 내려간다.** 그래서 여기 나오는 층수는
 * 사람이 도달할 수 있는 깊이의 **아래쪽 경계**다. 이 봇이 5층에서 죽으면 사람도
 * 거기쯤에서 죽는다.
 *
 *   node --experimental-strip-types --import ./test/register.mjs scripts/measure-rogue.mjs [판수]
 */

import { newGame, perform } from "../lib/rogue/game.ts";
import { hungerOf, rapidFireOf } from "../lib/rogue/hero.ts";
import { isVisible } from "../lib/rogue/fov.ts";
import { armorClassOf } from "../lib/rogue/items.ts";
import { forSale } from "../lib/rogue/shop.ts";
import { MAP_H, MAP_W, T, idx, inBounds, walkable } from "../lib/rogue/types.ts";

/** 길이 막혔을 때 절반은 뒤지고 절반은 아무 데나 간다. */
const rngSearch = () => Math.random() < 0.5;

const RUNS = Number(process.argv[2] ?? 300);
const ORIGIN = process.argv[3] ?? "knight";
const MAX_TURNS = 4000;

const STEPS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/** 여기서 저기로 가는 첫걸음. 못 가면 null. */
function firstStep(level, from, isGoal) {
    const prev = new Int32Array(MAP_W * MAP_H).fill(-1);
    const start = idx(from.x, from.y);
    prev[start] = start;
    let queue = [from];
    let goal = null;
    while (queue.length && !goal) {
        const next = [];
        for (const p of queue) {
            if (isGoal(p.x, p.y) && !(p.x === from.x && p.y === from.y)) {
                goal = p;
                break;
            }
            for (const [dx, dy] of STEPS) {
                const nx = p.x + dx;
                const ny = p.y + dy;
                if (!inBounds(nx, ny)) continue;
                const i = idx(nx, ny);
                if (prev[i] !== -1) continue;
                if (!walkable(level.tiles[i])) continue;
                // 문은 대각으로 드나들 수 없다 — 규칙과 같은 길로 센다.
                if (dx !== 0 && dy !== 0) {
                    if (level.tiles[idx(p.x, p.y)] === T.DOOR || level.tiles[i] === T.DOOR) continue;
                }
                prev[i] = idx(p.x, p.y);
                next.push({ x: nx, y: ny });
            }
        }
        queue = next;
    }
    if (!goal) return null;
    let cur = idx(goal.x, goal.y);
    while (prev[cur] !== start) {
        cur = prev[cur];
        if (cur === -1) return null;
    }
    return { dx: (cur % MAP_W) - from.x, dy: Math.floor(cur / MAP_W) - from.y };
}

function botTurn(s) {
    const { level } = s;
    const hero = s.heroes[0];

    // 레벨 9 직업 액티브는 조건이 맞을 때 실제 명령으로 쓴다.
    if (hero.level >= 9 && hero.classSkillDepth !== level.depth) {
        if (hero.origin === "rogue" && level.monsters.some((m) => !m.champion && isVisible(level, m.x, m.y))) {
            return { t: "classSkill" };
        }
        if (hero.origin === "scholar" && level.monsters.length > 0) return { t: "classSkill" };
        if (hero.origin === "alchemist") {
            const potions = hero.pack.filter((p) => p.kind === "potion" && p.type !== "blessing");
            if (potions.length >= 2) return { t: "classSkill", ingredients: [potions[0].letter, potions[1].letter] };
        }
    }

    // 직업 특성을 쓴다: 근위대는 철벽 자세, 레인저·마법 직업은 원거리 무기를 쓴다.
    const adjacent = STEPS.some(([dx, dy]) => level.monsters.some((m) => m.x === hero.x + dx && m.y === hero.y + dy));
    if (hero.origin === "knight" && adjacent && !hero.guarded) return { t: "rest" };

    const rangedTarget = level.monsters
        .filter((m) => m.hp > 0 && isVisible(level, m.x, m.y))
        .map((m) => {
            const dx = m.x - hero.x;
            const dy = m.y - hero.y;
            const distance = Math.max(Math.abs(dx), Math.abs(dy));
            const aligned = dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
            const dir = { dx: Math.sign(dx), dy: Math.sign(dy) };
            let clear = aligned;
            for (let n = 1; n < distance && clear; n++) {
                if (!walkable(level.tiles[idx(hero.x + dir.dx * n, hero.y + dir.dy * n)])) clear = false;
            }
            return { m, distance, clear, dir };
        })
        .filter(({ distance, clear }) => distance >= 2 && distance <= 6 && clear)
        .sort((a, b) => a.distance - b.distance)[0];
    const rapid = rapidFireOf(hero);
    if (rangedTarget && rapid && ((rapid.kind === "zap" && (rapid.item.charges ?? 0) > 0) || rapid.item.count > 0)) {
        const dx = rangedTarget.dir.dx;
        const dy = rangedTarget.dir.dy;
        return { t: rapid.kind, letter: rapid.item.letter, dx, dy };
    }

    // ① 붙은 놈이 있으면 때린다. 도망치는 봇이 아니다 — 그래야 전투 밸런스가 보인다.
    // 화나지 않은 상점 주인은 빼고 — 부딪혀도 말만 하므로 봇이 그 자리에서 영영 돈다.
    const hostile = (m) => !(m.shk && level.shop && !level.shop.angry);
    for (const [dx, dy] of STEPS) {
        if (level.monsters.some((m) => hostile(m) && m.x === hero.x + dx && m.y === hero.y + dy)) {
            return { t: "move", dx, dy };
        }
    }

    // ② 배고프면 먹는다.
    if (hungerOf(hero) && hero.pack.some((p) => p.kind === "food")) {
        return { t: "eat", letter: hero.pack.find((p) => p.kind === "food").letter };
    }

    // ③ 체력이 바닥이면 아무 물약이나 마셔 본다 — 원작에서도 그게 도박이다.
    if (hero.hp <= hero.maxHp * 0.3 && hero.pack.some((p) => p.kind === "potion")) {
        return { t: "quaff", letter: hero.pack.find((p) => p.kind === "potion").letter };
    }

    // ④ 더 좋은 갑옷이 배낭에 있으면 입는다. 저주받았으면 규칙이 막는다.
    const wearing = hero.pack.find((p) => p.id === hero.armorId);
    const better = hero.pack.find(
        (p) => p.kind === "armor" && p.id !== hero.armorId && armorClassOf(p) < armorClassOf(wearing),
    );
    if (better) return { t: "wear", letter: better.letter };

    // ⑤ 발밑의 것을 줍는다. **가게의 물건은 안 줍는다** — 봇은 사지 않으므로(돈을 쓰는 판단을
    // 안 한다) 집으면 외상을 든 채 주인에게 막혀 판이 멈춘다.
    const free = (i) => !forSale(level, i);
    if (level.items.some((i) => free(i) && i.x === hero.x && i.y === hero.y)) return { t: "pickup" };

    // ⑥ 계단 위면 내려간다.
    if (level.tiles[idx(hero.x, hero.y)] === T.STAIRS) return { t: "descend" };

    // ⑦ 가까운 물건으로, 없으면 계단으로.
    const toItem = level.items.some(free)
        ? firstStep(level, hero, (x, y) => level.items.some((i) => free(i) && i.x === x && i.y === y))
        : null;
    const step = toItem ?? firstStep(level, hero, (x, y) => level.tiles[idx(x, y)] === T.STAIRS);
    if (step) return { t: "move", dx: step.dx, dy: step.dy };

    // ⑧ 길이 없으면 뒤진다 — 비밀문 뒤에 갇혔을 수 있다. 그래도 안 되면 아무 데나.
    if (rngSearch()) return { t: "search" };
    const [dx, dy] = STEPS[Math.floor(Math.random() * STEPS.length)];
    return { t: "move", dx, dy };
}

const results = [];
for (let seed = 1; seed <= RUNS; seed++) {
    let s = newGame(seed, {}, {}, {}, {}, ORIGIN);
    let turns = 0;
    while (s.phase === "playing" && turns < MAX_TURNS) {
        s = perform(s, botTurn(s));
        turns++;
    }
    results.push({
        depth: s.deepest,
        level: s.heroes[0].level,
        gold: s.heroes[0].gold,
        turn: s.turn,
        phase: s.phase === "playing" ? "timeout" : s.phase,
        epitaph: s.epitaph,
    });
}

const num = (a) => a.slice().sort((x, y) => x - y);
const pct = (arr, p) => num(arr)[Math.min(arr.length - 1, Math.floor(arr.length * p))];
const depths = results.map((r) => r.depth);
const mean = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);

console.log("층별 도달률");
for (let depth = 1; depth <= 26; depth++) {
    const reached = depths.filter((d) => d >= depth).length;
    if (reached === 0) break;
    console.log(`${String(depth).padStart(2)}층 ${String(reached).padStart(4)} (${((reached / RUNS) * 100).toFixed(1)}%)`);
}
console.log("");

const byPhase = {};
for (const r of results) byPhase[r.phase] = (byPhase[r.phase] ?? 0) + 1;

console.log(`직업 ${ORIGIN} · 판 ${RUNS} · 최대 ${MAX_TURNS}턴`);
console.log("");
console.log("도달 깊이   평균 %s · 중앙값 %d · 상위10%% %d · 최대 %d",
    mean(depths), pct(depths, 0.5), pct(depths, 0.9), Math.max(...depths));
console.log("캐릭터 레벨 평균 %s · 최대 %d",
    mean(results.map((r) => r.level)), Math.max(...results.map((r) => r.level)));
console.log("금화       평균 %s · 최대 %d",
    mean(results.map((r) => r.gold)), Math.max(...results.map((r) => r.gold)));
console.log("버틴 턴     평균 %s", mean(results.map((r) => r.turn)));
console.log("");
console.log("끝난 까닭  ", JSON.stringify(byPhase));
console.log("");
const hist = {};
for (const d of depths) {
    const band = d <= 2 ? "1–2층" : d <= 5 ? "3–5층" : d <= 10 ? "6–10층" : d <= 20 ? "11–20층" : "21층+";
    hist[band] = (hist[band] ?? 0) + 1;
}
for (const band of ["1–2층", "3–5층", "6–10층", "11–20층", "21층+"]) {
    const n = hist[band] ?? 0;
    console.log("%s %s %d (%s%%)", band.padEnd(8), "█".repeat(Math.round((n / RUNS) * 40)), n,
        ((n / RUNS) * 100).toFixed(0));
}
