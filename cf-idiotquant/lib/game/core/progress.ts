// 판을 넘어 남는 것.
//
// 로그라이크의 절반은 "이번 판은 졌지만 다음 판은 조금 세다" 인데, 지금까지는 새로고침
// 한 번에 그게 통째로 날아갔다. 인사이트가 남지 않으면 12턴짜리 미니게임일 뿐이다.
//
// ── 순수한 것과 저장하는 것을 갈라 둔다 ────────────────────────────
// `applyRun` 은 값을 받아 값을 주는 순수 함수라 테스트가 붙고, `recordRun` 만 저장을
// 만진다. 코어(StockEngine·RoguelikeManager)는 여전히 저장을 모른다 — 저장을 코어에
// 넣으면 브라우저 없이 규칙을 돌려 볼 수 없게 된다.

import type { RunSummary } from "./types";

const KEY = "iq:rogue:v1";

export interface Progress {
    /** 판을 넘어 쌓이는 점수. 시작 유물 수를 정하고, 시작 덱 강화의 값이기도 하다. */
    insightPoints: number;
    /** 여태 가장 잘한 판의 수익률(%). 아직 없으면 null. */
    bestReturn: number | null;
    /** 굴린 판의 수. 청산된 판도 센다. */
    runs: number;
    /**
     * 시작 덱에 **영구히** 박아 둔 카드들. 앞에서부터 약한 카드 자리를 대신한다.
     *
     * 덱을 통째로 물려주지 않고 여섯 장의 **내용만** 바꾸는 이유: 판마다 카드가 쌓이면
     * 덱이 불어나 정작 원하는 카드가 안 잡힌다. 크기는 늘 6 이고 질만 오른다.
     */
    upgrades: string[];
    /** 청산으로 끝난 판의 수. */
    busts: number;
}

export const EMPTY: Progress = {
    insightPoints: 0, bestReturn: null, runs: 0, upgrades: [], busts: 0,
};

/**
 * 강화 한 장의 값. 앞에서부터 차례로 든다 — 네 번째 자리가 가장 비싸다.
 *
 * 유물은 IP 75 에서 여섯 개로 차 버려 더 쌓을 값어치가 없어진다. 이 표가 그 뒤로도
 * 인사이트가 쓰일 자리를 만든다.
 */
export const UPGRADE_COSTS = [20, 40, 60, 80] as const;

/** 다음 강화에 드는 값. 더 살 자리가 없으면 null. */
export function nextUpgradeCost(p: Progress): number | null {
    return UPGRADE_COSTS[p.upgrades.length] ?? null;
}

/** 지금 강화를 살 수 있는가. */
export function canUpgrade(p: Progress): boolean {
    const cost = nextUpgradeCost(p);
    return cost !== null && p.insightPoints >= cost;
}

/**
 * 강화 한 장을 산다. **순수 함수다** — 저장은 안 한다.
 * 살 수 없으면 받은 진행을 그대로 돌려준다(화면이 이미 막고 있지만, 값을 믿지 않는다).
 */
export function buyUpgrade(p: Progress, cardId: string): Progress {
    const cost = nextUpgradeCost(p);
    if (cost === null || p.insightPoints < cost) return p;
    return { ...p, insightPoints: p.insightPoints - cost, upgrades: [...p.upgrades, cardId] };
}

/** 모르는 값이 들어와도 판이 안 깨지게 한 겹 거른다. */
function clean(raw: unknown): Progress {
    if (!raw || typeof raw !== "object") return { ...EMPTY };
    const o = raw as Record<string, unknown>;
    const ip = Number(o.insightPoints);
    const best = Number(o.bestReturn);
    const runs = Number(o.runs);
    const busts = Number(o.busts);
    return {
        insightPoints: Number.isFinite(ip) && ip > 0 ? Math.floor(ip) : 0,
        bestReturn: Number.isFinite(best) ? best : null,
        runs: Number.isFinite(runs) && runs > 0 ? Math.floor(runs) : 0,
        // 모르는 카드 이름이 섞여 들어와도 덱이 안 깨지게 자르기만 한다 — 실제로 그 이름의
        // 카드가 있는지는 RoguelikeManager 가 덱을 세울 때 한 번 더 거른다.
        upgrades: Array.isArray(o.upgrades)
            ? o.upgrades.filter((x): x is string => typeof x === "string").slice(0, UPGRADE_COSTS.length)
            : [],
        busts: Number.isFinite(busts) && busts > 0 ? Math.floor(busts) : 0,
    };
}

/**
 * 한 판의 결과를 진행에 얹는다. **순수 함수다** — 저장은 안 한다.
 *
 * 인사이트는 엔진이 이미 더해 놓은 값(summarize 가 player.insightPoints 를 올린다)이
 * 아니라 이 판에서 **번 것**만 받는다. 그래야 이어서 굴리든 새로 켜든 한 번만 더해진다.
 */
export function applyRun(prev: Progress, run: RunSummary): Progress {
    const bestReturn = prev.bestReturn === null || run.returnPct > prev.bestReturn
        ? run.returnPct
        : prev.bestReturn;

    // 청산 — 쌓아 둔 것이 실제로 깎이는 유일한 자리다. 강화는 전부 날아가고 인사이트는
    // 절반이 된다. 최고 기록과 판 수는 남긴다(그것도 지운 기록의 일부다).
    if (run.bankrupt) {
        return {
            insightPoints: Math.floor(prev.insightPoints / 2),
            bestReturn,
            runs: prev.runs + 1,
            upgrades: [],
            busts: prev.busts + 1,
        };
    }

    return {
        insightPoints: prev.insightPoints + Math.max(0, run.earnedIP),
        bestReturn,
        runs: prev.runs + 1,
        upgrades: prev.upgrades,
        busts: prev.busts,
    };
}

/** 이번 판이 기록을 갈아치웠는가. 화면이 "새 기록" 을 띄우는 근거다. */
export function isNewBest(prev: Progress, run: RunSummary): boolean {
    return prev.bestReturn === null || run.returnPct > prev.bestReturn;
}

/* ── 저장 ───────────────────────────────────────────────────
   여기서만 localStorage 를 만진다. 프라이빗 모드나 용량 초과로 실패해도 판은 그대로
   굴러가야 하므로 전부 삼킨다 — 기록이 안 남는 것과 게임이 멈추는 것은 다른 일이다. */

export function loadProgress(): Progress {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? clean(JSON.parse(raw)) : { ...EMPTY };
    } catch {
        return { ...EMPTY };
    }
}

export function saveProgress(p: Progress): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
        // 저장 못 해도 이번 판의 성적은 화면에 그대로 뜬다
    }
}

/** 판이 끝났을 때 한 번. 저장하고 갱신된 진행을 돌려준다. */
export function recordRun(run: RunSummary): { progress: Progress; newBest: boolean } {
    const prev = loadProgress();
    const next = applyRun(prev, run);
    saveProgress(next);
    return { progress: next, newBest: isNewBest(prev, run) };
}

/** 강화를 사고 그 자리에서 저장한다. 화면이 부르는 자리. */
export function purchaseUpgrade(cardId: string): Progress {
    const next = buyUpgrade(loadProgress(), cardId);
    saveProgress(next);
    return next;
}

/** 처음부터 다시. 화면에서 부를 자리는 아직 없고, 테스트와 디버깅용이다. */
export function resetProgress(): void {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // 지우지 못해도 할 수 있는 것이 없다
    }
}
