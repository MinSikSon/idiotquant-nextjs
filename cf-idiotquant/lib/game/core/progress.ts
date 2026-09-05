// 회차를 넘어 남는 것. **회귀의 규칙이 이 파일의 타입 하나에 들어 있다.**
//
// 판이 끝나면 다시 1997년 겨울이다. 돈도 신뢰도 고객도 빚도 그때로 되돌아가고
// **기억만 남는다.** 그래서 이 파일은 남는 것과 사라지는 것을 **타입에서** 갈라 둔다 —
// 한 덩어리에 섞어 두면 어느 날 반드시 하나가 잘못된 쪽에 붙는다.
//
//   남는다 (기억)          사라진다 (1997 로)
//   ─────────────────      ──────────────────
//   모은 상황카드            맡은 돈 · 신뢰 · 빚
//   회차 수 · 최고 기록      고객 (김 부장부터 다시)
//   들고 나갈 여섯 장        상장 진행 (다시 셋부터)
//
// 루프를 끊는 것은 **빚 완납 하나뿐**이다. 나머지 셋(빚 남음·신뢰 0·자본잠식)은
// 전부 1997년 집으로 돌아간다 — 공원은 끝이 아니라 회귀 지점이다.

import type { ChapterSummary, EndReason } from "./types";
import { EMPTY_FACTS, STARTER_IDS, type SituationFacts } from "./situations";
import { LOADOUT_SIZE } from "./DeckManager";

const KEY = "iq:rise:v1";

/** 회차를 넘어 남는 것. */
export interface Memory {
    /** 몇 번째 회차인가. 1 부터. */
    cycle: number;
    /** 겪은 상황카드의 id. **처음 셋은 여기 이미 들어 있다.** */
    situations: string[];
    /** 다음 챕터에 들고 나갈 여섯 장. */
    loadout: string[];
    /** 조건이 읽는 사실. 회차를 넘어 남는 것만 여기 쌓인다. */
    facts: SituationFacts;
    /** 루프를 끊은 적이 있는가 — 빚을 다 갚아 본 적이 있는가. */
    escaped: boolean;
    /** 여태 가장 멀리 간 챕터(0=프롤로그). */
    bestChapter: number;
}

export const EMPTY: Memory = {
    cycle: 1,
    situations: [...STARTER_IDS],
    loadout: [...STARTER_IDS],
    facts: { ...EMPTY_FACTS },
    escaped: false,
    bestChapter: 0,
};

const int = (v: unknown, min = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.floor(n)) : min;
};

function normalize(raw: unknown): Memory {
    if (!raw || typeof raw !== "object") return { ...EMPTY, facts: { ...EMPTY_FACTS } };
    const o = raw as Record<string, unknown>;
    const situations = Array.isArray(o.situations)
        ? [...new Set([...STARTER_IDS, ...o.situations.filter(x => typeof x === "string") as string[]])]
        : [...STARTER_IDS];
    const loadoutRaw = Array.isArray(o.loadout)
        ? (o.loadout.filter(x => typeof x === "string") as string[]).filter(id => situations.includes(id))
        : [];
    const facts = (o.facts && typeof o.facts === "object")
        ? { ...EMPTY_FACTS, ...(o.facts as Partial<SituationFacts>) }
        : { ...EMPTY_FACTS };
    return {
        cycle: Math.max(1, int(o.cycle, 1)),
        situations,
        loadout: (loadoutRaw.length ? loadoutRaw : situations).slice(0, LOADOUT_SIZE),
        facts,
        escaped: o.escaped === true,
        bestChapter: int(o.bestChapter),
    };
}

/* ── 한 챕터가 끝났다 ──────────────────────────────────────── */

/** 새로 겪은 것을 기억에 넣는다. **이미 가진 것은 다시 안 들어간다.** */
export function remember(prev: Memory, run: ChapterSummary, chapterIndex: number): Memory {
    const situations = [...new Set([...prev.situations, ...run.earned])];
    return {
        ...prev,
        situations,
        // 새로 얻은 것은 아직 안 골랐으므로 덱에는 자동으로 안 들어간다 — 집에서 고른다.
        loadout: prev.loadout.filter(id => situations.includes(id)),
        bestChapter: Math.max(prev.bestChapter, chapterIndex),
    };
}

/* ── 회귀 ─────────────────────────────────────────────────── */

/**
 * 판이 어떻게 끝났는가. **공원의 그림이 이 값으로 갈린다.**
 *
 * 순서가 중요하다 — 빚을 다 갚았으면 그것이 먼저다. 자본잠식과 신뢰 0 이 겹쳐도
 * 화면은 하나만 말해야 한다.
 */
export function endReasonOf(p: { debt: number; trust: number; ruined: boolean; finalChapterDone: boolean }): EndReason | null {
    if (p.debt <= 0) return "debtCleared";
    if (p.ruined) return "ruined";
    if (p.trust <= 0) return "trustLost";
    if (p.finalChapterDone) return "debtRemains";
    return null;
}

/** 이 끝이 루프를 끊는가. 넷 중 하나뿐이다. */
export function breaksLoop(reason: EndReason): boolean {
    return reason === "debtCleared";
}

/**
 * 1997년 겨울로 돌아간다.
 *
 * **`facts.everRuined` 만은 회차를 넘어 남는다** — 「바닥을 본 적 있다」가 그 위에 서 있다.
 * 다 날려 본 사람은 그 사실을 잊지 못한다.
 */
export function regress(prev: Memory, reason: EndReason): Memory {
    return {
        ...prev,
        cycle: prev.cycle + 1,
        escaped: prev.escaped || breaksLoop(reason),
        facts: {
            ...EMPTY_FACTS,
            everRuined: prev.facts.everRuined || reason === "ruined",
        },
    };
}

/* ── 저장 ─────────────────────────────────────────────────── */

export function loadMemory(): Memory {
    try {
        const raw = localStorage.getItem(KEY);
        return normalize(raw ? JSON.parse(raw) : null);
    } catch {
        return { ...EMPTY, facts: { ...EMPTY_FACTS } };
    }
}

export function saveMemory(m: Memory): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(m));
    } catch {
        // 사파리 시크릿 모드처럼 저장이 막힌 자리가 있다. 게임은 계속 돌아야 한다.
    }
}

export function resetMemory(): void {
    try { localStorage.removeItem(KEY); } catch { /* 위와 같다 */ }
}
