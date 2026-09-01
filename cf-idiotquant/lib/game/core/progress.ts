// 판을 넘어 남는 것.
//
// ── 판은 한 장(章)일 뿐이다 ────────────────────────────────────────
// 예전에는 판마다 자금이 1,000만으로 되돌아갔다. 그러면 한 판을 아무리 말아먹어도
// 다음 판이 똑같이 시작하므로, 판 안의 결정에 무게가 없다.
//
// 지금은 **자금과 덱이 그대로 이어진다.** 이번 판에서 불린 돈으로 다음 판을 굴리고,
// 이번 판에서 얻은 카드로 다음 판을 싸운다. 판은 끝이 아니라 장이 넘어가는 자리다.
//
// 그래서 지는 방법도 하나뿐이다 — **자본잠식.** 자금이 바닥나면 거기서 전부 끝난다.
//
// ── 순수한 것과 저장하는 것을 갈라 둔다 ────────────────────────────
// `applyRun` 은 값을 받아 값을 주는 순수 함수라 테스트가 붙고, `recordRun` 만 저장을
// 만진다. 코어(StockEngine·RoguelikeManager)는 여전히 저장을 모른다.

import type { RunSummary } from "./types";
import { MAX_TIER, RUIN_LINE, SEED_CASH } from "./StockEngine";

const KEY = "iq:rogue:v1";

/** 자본잠식선. 규칙 자체는 엔진이 들고 있고 여기서는 그대로 다시 내보낸다. */
export { RUIN_LINE };

export interface Progress {
    /**
     * 지금 굴리는 돈. **판을 넘어 이어진다.** 판이 끝나면 그 판의 최종 자산이 이 값이 된다.
     * 자본잠식선 아래로 떨어지면 게임이 끝나고 시작 자금으로 되돌아간다.
     */
    bankroll: number;
    /**
     * 지금 덱(카드 id 목록). 이것도 이어진다.
     *
     * 비어 있으면 새 게임이라는 뜻이고, 그때 랜덤 세 장으로 시작한다. 3턴마다 한 장이
     * 늘고, 같은 카드가 셋 모이면 한 장으로 합쳐진다 — 그 합성이 덱이 불어나는 것을 막는다.
     */
    deck: string[];
    /** 판을 넘어 쌓이는 점수. 시작 유물 수를 정한다. */
    insightPoints: number;
    /**
     * **경력 인사이트** — 판마다 번 것을 그대로 더한다. 쓰지도, 잃지도 않는다.
     *
     * 자금도 덱도 자본잠식이면 날아간다. 이 값만은 오직 오르고, 카드와 유물이 여기서
     * 열린다. 한 판을 굴린 것 자체가 어딘가에 남는다.
     */
    careerIP: number;
    /** 여태 가장 잘한 판의 수익률(%). 아직 없으면 null. */
    bestReturn: number | null;
    /** 굴린 판의 수. */
    runs: number;
    /** 자본잠식으로 끝난 횟수. */
    ruins: number;
    /** 지금 차수. 완주하면 오르고 자본잠식이면 0 으로 돌아간다. */
    tier: number;
}

export const EMPTY: Progress = {
    bankroll: SEED_CASH,
    deck: [],
    insightPoints: 0,
    careerIP: 0,
    bestReturn: null,
    runs: 0,
    ruins: 0,
    tier: 0,
};

/* ── 해금 ───────────────────────────────────────────────────── */

export interface Unlock {
    id: string;
    kind: "card" | "relic";
    /** 이 경력 인사이트에서 열린다. */
    at: number;
}

/**
 * 경력 인사이트가 쌓이면 보상 풀에 새로 들어오는 것들.
 *
 * 처음부터 다 나오면 세 판이면 다 본다. 시작을 얇게 두고 굴릴수록 넓어지게 하면,
 * 판을 거듭할 이유와 다양성이 같은 곳에서 나온다.
 */
export const UNLOCKS: readonly Unlock[] = [
    { id: "dividend", kind: "relic", at: 40 },
    { id: "insider", kind: "card", at: 70 },
    { id: "hotline", kind: "relic", at: 110 },
    { id: "margin", kind: "card", at: 160 },
    { id: "shredder", kind: "relic", at: 220 },
];

/** 지금 열려 있는 것들의 id. 처음부터 있던 것은 여기 안 들어간다. */
export function unlockedIds(careerIP: number): string[] {
    return UNLOCKS.filter(u => careerIP >= u.at).map(u => u.id);
}

/** 이번 판으로 새로 열린 것. 결산이 그 자리에서 알려 준다. */
export function newlyUnlocked(before: number, after: number): Unlock[] {
    return UNLOCKS.filter(u => before < u.at && after >= u.at);
}

/** 다음 해금까지 얼마 남았는가. 없으면 null. */
export function nextUnlock(careerIP: number): Unlock | null {
    return UNLOCKS.find(u => careerIP < u.at) ?? null;
}

/* ── 저장에서 읽기 ──────────────────────────────────────────── */

const int = (v: unknown, min = 0) => {
    const n = Number(v);
    return Number.isFinite(n) && n > min ? Math.floor(n) : min;
};

/** 모르는 값이 들어와도 판이 안 깨지게 한 겹 거른다. */
function clean(raw: unknown): Progress {
    if (!raw || typeof raw !== "object") return { ...EMPTY, deck: [] };
    const o = raw as Record<string, unknown>;
    const best = Number(o.bestReturn);
    const bankroll = Number(o.bankroll);
    return {
        // 0 원은 저장될 수 있는 값이라 int() 의 최소 0 규칙과 어긋난다. 따로 본다.
        bankroll: Number.isFinite(bankroll) && bankroll >= 0 ? Math.floor(bankroll) : SEED_CASH,
        deck: Array.isArray(o.deck) ? o.deck.filter((x): x is string => typeof x === "string") : [],
        insightPoints: int(o.insightPoints),
        careerIP: int(o.careerIP),
        bestReturn: Number.isFinite(best) ? best : null,
        runs: int(o.runs),
        ruins: int(o.ruins),
        tier: Math.max(0, Math.min(MAX_TIER, int(o.tier))),
    };
}

/* ── 규칙 ───────────────────────────────────────────────────── */

/** 이 자금으로 더 굴릴 수 있는가. */
export function isRuined(bankroll: number): boolean {
    return bankroll < RUIN_LINE;
}

/**
 * 한 판의 결과를 진행에 얹는다. **순수 함수다** — 저장은 안 한다.
 *
 * 자금과 덱이 그대로 넘어간다. 다만 그 자금이 자본잠식선 아래면 게임이 끝나고,
 * 자금·덱·차수·인사이트가 처음으로 돌아간다 — 경력만 남는다.
 */
export function applyRun(prev: Progress, run: RunSummary): Progress {
    const careerIP = prev.careerIP + Math.max(0, run.earnedIP);
    const bestReturn = prev.bestReturn === null || run.returnPct > prev.bestReturn
        ? run.returnPct
        : prev.bestReturn;

    const base = {
        careerIP,
        bestReturn,
        runs: prev.runs + 1,
    };

    if (isRuined(run.finalEquity)) {
        // 자본잠식 — 쌓아 둔 것이 실제로 날아가는 유일한 자리다.
        return {
            ...base,
            bankroll: SEED_CASH,
            deck: [],
            insightPoints: 0,
            ruins: prev.ruins + 1,
            tier: 0,
        };
    }

    return {
        ...base,
        bankroll: run.finalEquity,
        deck: [...run.deck],
        insightPoints: prev.insightPoints + Math.max(0, run.earnedIP),
        ruins: prev.ruins,
        // 관망만 한 판은 차수를 안 올린다. 12턴을 흘려보내 올리는 길을 막는다.
        tier: run.idle ? prev.tier : Math.min(MAX_TIER, prev.tier + 1),
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
        return raw ? clean(JSON.parse(raw)) : { ...EMPTY, deck: [] };
    } catch {
        return { ...EMPTY, deck: [] };
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
export function recordRun(run: RunSummary): { progress: Progress; newBest: boolean; ruined: boolean } {
    const prev = loadProgress();
    const next = applyRun(prev, run);
    saveProgress(next);
    return { progress: next, newBest: isNewBest(prev, run), ruined: isRuined(run.finalEquity) };
}

/** 처음부터 다시. 테스트와 디버깅용이다. */
export function resetProgress(): void {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // 지우지 못해도 할 수 있는 것이 없다
    }
}
