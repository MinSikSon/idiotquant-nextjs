// 이력 — **회귀가 지우지 못하는 것.**
//
// `regress()` 는 돈도 신뢰도 고객도 1997 로 되돌리고 `facts` 까지 비운다. 그래서 여태
// 회차를 넘어 남는 것은 상황카드 목록과 불리언 두엇뿐이었다. 판을 몇 번 했는지, 빚을
// 얼마나 갚았는지, 어떻게 끝났는지가 **어디에도 안 남았다.**
//
// 이 파일이 그 자리다. 여기 쌓이는 값은 `regress()` 가 손대지 않는다.
//
// ── 능력치가 아니라 기록이다 ────────────────────────────────────
// 이 숫자들은 **판에 아무 영향을 주지 않는다.** 신뢰가 오르지도, 카드가 세지지도 않는다.
// 앞서 「캐릭터 스탯 판」을 안 넣기로 한 것은 그런 판정을 늘리지 않겠다는 뜻이었고,
// 이것은 지나온 것을 읽는 자리다. 값이 규칙으로 새면 그때 그 결정이 깨진다 —
// **`core/` 의 어느 곳도 `Career` 를 읽지 않는다.**
//
// ── 언제 쌓이는가 ───────────────────────────────────────────────
//   챕터가 끝날 때   보수 · 최고 신뢰 · 최고 자산 · 끝낸 챕터 수   `recordChapter`
//   판이 끝날 때     판 수 · 엔딩 · 남긴 빚 · 한 판의 사실들       `recordRun`
//
// 나눠 둔 이유는 `SituationFacts` 가 **한 판 동안만** 쌓이기 때문이다. 챕터마다 접으면
// 같은 값을 여러 번 세게 된다. 판이 끝나는 자리(`toPark`)는 한 판에 정확히 한 번이다.

import type { ChapterSummary, EndReason } from "./types";
import type { SituationFacts } from "./situations";

/** 회차를 넘어 남는 이력. */
export interface Career {
    /** 끝까지 간 판 수. */
    runs: number;
    /** 끝낸 챕터 수. 판을 넘어 더해진다. */
    chapters: number;
    /** 어떻게 끝났는가 — 넷을 각각 몇 번. */
    endings: Record<EndReason, number>;
    /** 받은 보수의 합. **여태 갚은 빚의 총액이다.** */
    feePaid: number;
    /** 판이 끝났을 때 남아 있던 빚 중 가장 적었던 값. 아직 한 판도 안 끝냈으면 null. */
    leastDebt: number | null;
    /** 챕터를 끝냈을 때의 신뢰 중 가장 높았던 값. */
    bestTrust: number;
    /** 챕터를 끝냈을 때의 자산 중 가장 컸던 값. */
    bestEquity: number;
    /** 근거를 대고 권한 횟수, 그중 잃은 횟수. */
    thesisPlays: number;
    thesisLosses: number;
    /** 근거 없이 권해서 번 횟수, 잃은 횟수. */
    blindGains: number;
    blindLosses: number;
    /** 손절이 발동한 횟수. */
    stopHits: number;
}

export const EMPTY_CAREER: Career = {
    runs: 0,
    chapters: 0,
    endings: { debtCleared: 0, debtRemains: 0, trustLost: 0, ruined: 0 },
    feePaid: 0,
    leastDebt: null,
    bestTrust: 0,
    bestEquity: 0,
    thesisPlays: 0,
    thesisLosses: 0,
    blindGains: 0,
    blindLosses: 0,
    stopHits: 0,
};

export const END_REASONS: readonly EndReason[] = ["debtCleared", "debtRemains", "trustLost", "ruined"];

const int = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

/** 저장된 것을 믿지 않는다 — 손으로 고친 값도, 옛 판이 남긴 값도 여기서 걸러진다. */
export function normalizeCareer(raw: unknown): Career {
    if (!raw || typeof raw !== "object") return { ...EMPTY_CAREER, endings: { ...EMPTY_CAREER.endings } };
    const o = raw as Record<string, unknown>;
    const e = (o.endings && typeof o.endings === "object" ? o.endings : {}) as Record<string, unknown>;
    const least = Number(o.leastDebt);
    return {
        runs: int(o.runs),
        chapters: int(o.chapters),
        endings: {
            debtCleared: int(e.debtCleared), debtRemains: int(e.debtRemains),
            trustLost: int(e.trustLost), ruined: int(e.ruined),
        },
        feePaid: int(o.feePaid),
        leastDebt: Number.isFinite(least) ? Math.max(0, Math.floor(least)) : null,
        bestTrust: int(o.bestTrust),
        bestEquity: int(o.bestEquity),
        thesisPlays: int(o.thesisPlays),
        thesisLosses: int(o.thesisLosses),
        blindGains: int(o.blindGains),
        blindLosses: int(o.blindLosses),
        stopHits: int(o.stopHits),
    };
}

/** 한 챕터가 끝났다. **판이 이어지는 중에도 쌓인다** — 도중에 그만둬도 남는다. */
export function recordChapter(c: Career, sum: ChapterSummary): Career {
    return {
        ...c,
        chapters: c.chapters + 1,
        feePaid: c.feePaid + Math.max(0, sum.fee),
        bestTrust: Math.max(c.bestTrust, Math.round(sum.trust)),
        bestEquity: Math.max(c.bestEquity, Math.round(sum.finalEquity)),
    };
}

/**
 * 한 판이 끝났다. **`facts` 가 비워지기 직전에 접는 자리다.**
 *
 * 한 판 동안 쌓인 사실을 이력에 더한다. 이 함수를 부른 뒤에 `regress()` 가 돌면
 * `facts` 는 사라지지만 합은 남는다.
 */
export function recordRun(c: Career, reason: EndReason, f: SituationFacts, debt: number): Career {
    const left = Math.max(0, Math.round(debt));
    return {
        ...c,
        runs: c.runs + 1,
        endings: { ...c.endings, [reason]: c.endings[reason] + 1 },
        leastDebt: c.leastDebt === null ? left : Math.min(c.leastDebt, left),
        thesisPlays: c.thesisPlays + f.thesisPlays,
        thesisLosses: c.thesisLosses + f.thesisLosses,
        blindGains: c.blindGains + f.blindGains,
        blindLosses: c.blindLosses + f.blindLosses,
        stopHits: c.stopHits + f.stopHits,
    };
}

/**
 * 근거를 댄 쪽과 감으로 지른 쪽 중 어느 쪽이 더 맞았는가. 표본이 없으면 null.
 *
 * 이 게임이 하는 말이 「근거가 값어치가 있다」인데, 그것이 사실인지는 여태 아무도 셀 수
 * 없었다. 이력이 쌓이면 사람이 직접 센다.
 */
export function hitRate(wins: number, losses: number): number | null {
    const n = wins + losses;
    return n > 0 ? wins / n : null;
}
