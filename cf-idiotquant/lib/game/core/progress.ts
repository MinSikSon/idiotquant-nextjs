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
    /** 판을 넘어 쌓이는 점수. 다음 런의 시작 유물 수를 정한다. */
    insightPoints: number;
    /** 여태 가장 잘한 판의 수익률(%). 아직 없으면 null. */
    bestReturn: number | null;
    /** 끝까지 굴린 판의 수. */
    runs: number;
}

export const EMPTY: Progress = { insightPoints: 0, bestReturn: null, runs: 0 };

/** 모르는 값이 들어와도 판이 안 깨지게 한 겹 거른다. */
function clean(raw: unknown): Progress {
    if (!raw || typeof raw !== "object") return { ...EMPTY };
    const o = raw as Record<string, unknown>;
    const ip = Number(o.insightPoints);
    const best = Number(o.bestReturn);
    const runs = Number(o.runs);
    return {
        insightPoints: Number.isFinite(ip) && ip > 0 ? Math.floor(ip) : 0,
        bestReturn: Number.isFinite(best) ? best : null,
        runs: Number.isFinite(runs) && runs > 0 ? Math.floor(runs) : 0,
    };
}

/**
 * 한 판의 결과를 진행에 얹는다. **순수 함수다** — 저장은 안 한다.
 *
 * 인사이트는 엔진이 이미 더해 놓은 값(summarize 가 player.insightPoints 를 올린다)이
 * 아니라 이 판에서 **번 것**만 받는다. 그래야 이어서 굴리든 새로 켜든 한 번만 더해진다.
 */
export function applyRun(prev: Progress, run: RunSummary): Progress {
    return {
        insightPoints: prev.insightPoints + Math.max(0, run.earnedIP),
        bestReturn: prev.bestReturn === null || run.returnPct > prev.bestReturn
            ? run.returnPct
            : prev.bestReturn,
        runs: prev.runs + 1,
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

/** 처음부터 다시. 화면에서 부를 자리는 아직 없고, 테스트와 디버깅용이다. */
export function resetProgress(): void {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // 지우지 못해도 할 수 있는 것이 없다
    }
}
