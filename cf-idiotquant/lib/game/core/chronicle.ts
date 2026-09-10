// 연대기 — **회귀가 지우지 못하는 단 하나의 쓸모 있는 것.**
//
// ── 왜 이 파일이 생겼나 ────────────────────────────────────────
// 회귀는 돌지만 **나아지지 않았다.** `regress()` 가 남기는 것은 회차 번호와 불리언
// 두엇뿐이라, 2회차는 1회차와 완전히 같은 조건에서 시작했다. 「이번엔 되나?」 말고는
// 다시 할 이유가 없었다.
//
// 그런데 이 게임의 시장은 **회차를 넘어 뼈대가 같다**(`StockEngine.buildMarket`).
// 1998 은 언제나 넉 턴 하락 · 석 턴 횡보 · 다섯 턴 상승이고, 1999 는 거품이고,
// 2000 은 청구서다. 시드가 바꾸는 것은 뉴스와 개별 노이즈뿐이다.
//
// **그러니까 아는 것이 쓸모가 있다.** 그런데 게임이 그걸 안 적어 줬다. 사람이 종이에
// 적어야 했다. 이 파일이 그 종이다.
//
// ── 무엇을 적는가 ──────────────────────────────────────────────
// **지나온 턴의 국면 하나뿐이다.** 뉴스도, 값도, 어느 종목이 얼마였는지도 안 적는다 —
// 그것들은 시드가 바꾸므로 다음 판에 그대로 안 온다. 국면만이 연대에서 온다.
//
// 그리고 **겪은 턴만** 적힌다. 1회차에 1998년 6턴에서 소진됐으면 아는 것은 거기까지다.
// 멀리 갈수록 많이 알게 되고, 많이 알수록 멀리 간다.
//
// ── 아는 것은 근거가 아니다 ────────────────────────────────────
// **이게 제일 중요한 선이다.** `core/energy.ts` 가 정해 둔 규칙이 있다 —
// 「회귀자만 아는 미래는 김 부장에게 근거가 되지 못한다」. 연대기가 판정을 열어 준다고
// 해서 근거까지 생기면 그 규칙이 무너진다.
//
// 그래서 연대기가 주는 것은 **「알아볼 값어치가 있는 턴인가」** 하나다. 떨어지는 장인 걸
// 알면 3 에너지를 안 쓰고 넘긴다. 오르는 장인 걸 알면 그때 쓴다. **근거는 여전히
// 알아봐야 생긴다.** 아낀 에너지가 보수율이 되고, 보수가 빚을 깎는다 —
// 메타 진행이 이 게임의 핵심 자원과 한 줄로 이어진다.

import type { Regime } from "./types";

/**
 * 챕터 id → 턴 번호 → 그 턴의 국면.
 *
 * 턴 번호는 **챕터 안에서의 번호**(1부터)다. 전 구간 통짜 번호를 쓰면 챕터 길이를
 * 바꿀 때 여태 적어 둔 것이 통째로 어긋난다.
 */
export type Chronicle = Record<string, Record<string, Regime>>;

export const EMPTY_CHRONICLE: Chronicle = {};

const REGIMES: readonly Regime[] = ["bull", "bear", "chop"];

/** 저장된 것을 믿지 않는다 — 손으로 고친 값도, 옛 판이 남긴 값도 여기서 걸러진다. */
export function normalizeChronicle(raw: unknown): Chronicle {
    if (!raw || typeof raw !== "object") return {};
    const out: Chronicle = {};
    for (const [chapterId, turns] of Object.entries(raw as Record<string, unknown>)) {
        if (!turns || typeof turns !== "object") continue;
        const kept: Record<string, Regime> = {};
        for (const [turn, regime] of Object.entries(turns as Record<string, unknown>)) {
            const n = Number(turn);
            if (!Number.isInteger(n) || n < 1) continue;
            if (!REGIMES.includes(regime as Regime)) continue;
            kept[String(n)] = regime as Regime;
        }
        if (Object.keys(kept).length > 0) out[chapterId] = kept;
    }
    return out;
}

/**
 * 이 턴을 겪었다. **이미 적힌 것은 안 덮어쓴다** — 뼈대가 같으니 값도 같고,
 * 덮어쓰면 같은 것을 다시 쓰는 셈이다.
 *
 * 새로 적힌 것이 없으면 **받은 것을 그대로 돌려준다.** 그래야 부르는 쪽이 참조를
 * 견줘 「달라졌나」를 알 수 있고, 매 턴 저장하지 않아도 된다.
 */
export function noteTurn(c: Chronicle, chapterId: string, turn: number, regime: Regime): Chronicle {
    if (turn < 1) return c;
    if (c[chapterId]?.[String(turn)] === regime) return c;
    return { ...c, [chapterId]: { ...c[chapterId], [String(turn)]: regime } };
}

/** 이 턴을 겪은 적이 있는가. 없으면 null. */
export function recallAt(c: Chronicle, chapterId: string, turn: number): Regime | null {
    return c[chapterId]?.[String(turn)] ?? null;
}

/**
 * 이 챕터를 턴 순서대로. **안 겪은 턴은 null** 이다.
 *
 * 화면이 이걸 한 줄짜리 띠로 그린다 — 열두 칸 중 어디가 오르는 장인지가 한눈에 보이고,
 * 아직 검은 칸이 「여기부터는 모른다」다.
 */
export function chapterStrip(c: Chronicle, chapterId: string, turns: number): (Regime | null)[] {
    const out: (Regime | null)[] = [];
    for (let t = 1; t <= turns; t++) out.push(recallAt(c, chapterId, t));
    return out;
}

/** 여태 몇 턴을 적었는가. 시작 화면이 「연대기 17턴」으로 쓴다. */
export function notedCount(c: Chronicle): number {
    let n = 0;
    for (const turns of Object.values(c)) n += Object.keys(turns).length;
    return n;
}

/**
 * 겪어서 아는 것이 이번 턴에 **무엇을 하라고 말하는가.**
 *
 * 판정(`research.verdictOf`)과 **일부러 다른 말을 쓴다.** 저쪽은 알아본 결과라
 * 「지금이다」라고 단언하고, 이쪽은 기억이라 「그랬다」라고만 한다. 같은 말로 적으면
 * 아는 것과 근거를 댄 것이 화면에서 구별이 안 된다 — 그 둘이 구별되는 것이 이 게임이다.
 */
export function recallSay(r: Regime | null): { head: string; sub: string } | null {
    switch (r) {
        case "bull": return { head: "이 턴은 올랐다", sub: "겪어서 안다. 알아볼 값어치가 있다" };
        case "bear": return { head: "이 턴은 떨어졌다", sub: "겪어서 안다. 에너지를 아껴도 된다" };
        case "chop": return { head: "이 턴은 흐렸다", sub: "겪어서 안다. 걸 자리가 아니었다" };
        default: return null;
    }
}

/** 겪어서 아는 것만으로 **알아볼 값어치가 있는 턴인가.** 모르면 true — 모르면 알아봐야 한다. */
export function worthResearching(r: Regime | null): boolean {
    return r !== "bear" && r !== "chop";
}
