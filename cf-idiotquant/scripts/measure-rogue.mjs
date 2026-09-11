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
import { hungerOf } from "../lib/rogue/hero.ts";
import { MAP_H, MAP_W, T, idx, inBounds, walkable } from "../lib/rogue/types.ts";

const RUNS = Number(process.argv[2] ?? 300);
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
    const { hero, level } = s;

    // ① 붙은 놈이 있으면 때린다. 도망치는 봇이 아니다 — 그래야 전투 밸런스가 보인다.
    for (const [dx, dy] of STEPS) {
        if (level.monsters.some((m) => m.x === hero.x + dx && m.y === hero.y + dy)) {
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

    // ④ 발밑의 것을 줍는다.
    if (level.items.some((i) => i.x === hero.x && i.y === hero.y)) return { t: "pickup" };

    // ⑤ 계단 위면 내려간다.
    if (level.tiles[idx(hero.x, hero.y)] === T.STAIRS) return { t: "descend" };

    // ⑥ 가까운 물건으로, 없으면 계단으로.
    const toItem = level.items.length
        ? firstStep(level, hero, (x, y) => level.items.some((i) => i.x === x && i.y === y))
        : null;
    const step = toItem ?? firstStep(level, hero, (x, y) => level.tiles[idx(x, y)] === T.STAIRS);
    if (step) return { t: "move", dx: step.dx, dy: step.dy };

    // ⑦ 길이 없으면 아무 데나 — 여기 오면 층이 이상한 것이다.
    const [dx, dy] = STEPS[Math.floor(Math.random() * STEPS.length)];
    return { t: "move", dx, dy };
}

const results = [];
for (let seed = 1; seed <= RUNS; seed++) {
    let s = newGame(seed);
    let turns = 0;
    while (s.phase === "playing" && turns < MAX_TURNS) {
        s = perform(s, botTurn(s));
        turns++;
    }
    results.push({
        depth: s.deepest,
        level: s.hero.level,
        gold: s.hero.gold,
        turn: s.turn,
        phase: s.phase === "playing" ? "timeout" : s.phase,
        epitaph: s.epitaph,
    });
}

const num = (a) => a.slice().sort((x, y) => x - y);
const pct = (arr, p) => num(arr)[Math.min(arr.length - 1, Math.floor(arr.length * p))];
const depths = results.map((r) => r.depth);
const mean = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);

const byPhase = {};
for (const r of results) byPhase[r.phase] = (byPhase[r.phase] ?? 0) + 1;

console.log(`판 ${RUNS} · 최대 ${MAX_TURNS}턴`);
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
