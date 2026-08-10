// 리플레이 한 판의 규칙과 모양 (클라이언트 판).
//
// 워커의 src/services/replay.js 와 짝이다. 그쪽은 KIS·D1 을 다루고 여기는 순수 규칙만
// 가져오지만, 상수와 계산식은 반드시 같아야 한다 — 비로그인은 이 파일로 판을 굴리고
// 로그인은 워커에서 굴리므로, 어긋나면 같은 판이 다른 점수를 낸다.

export const TOTAL_DAYS = 60;    // 한 판의 캔들 수
export const CONTEXT_DAYS = 20;  // 시작할 때 한 번에 보여 주는 구간

export interface Candle {
    d: string;  // YYYYMMDD
    o: number;
    h: number;
    l: number;
    c: number;
}

/** 체결 하나. 차트에 매매 시점을 찍는 데 쓴다. day_index 는 몇 번째 캔들인지(0-based). */
export interface ReplayOrder {
    day_index: number;
    side: "buy" | "sell";
    qty: number;
    price: number;
}

/** 서버 `_publicRound` 와 같은 모양. 진행 중에는 정답과 미래 캔들이 비어 있다. */
export interface ReplayRound {
    orders: ReplayOrder[];
    id: string;
    cursor: number;
    total_days: number;
    cash: number;
    seed: number;
    qty: number;
    cost_basis: number;
    realized: number;
    fees_paid: number;
    status: "playing" | "done";
    candles: Candle[];
    ticker: string | null;
    name: string | null;
    start_date: string | null;
    end_date: string | null;
    final_return: number | null;
    bh_return: number | null;
    coins_earned: number | null;
}

export interface ReplayHistoryItem {
    id: string;
    ticker: string;
    name: string | null;
    start_date: string | null;
    end_date: string | null;
    final_return: number | null;
    bh_return: number | null;
    coins_earned: number | null;
    created_at: number;
}

/** 같은 구간을 그냥 사서 들고 있었을 때의 수익률(%). */
export function buyAndHoldReturn(candles: Candle[]): number {
    const first = candles?.[0]?.c;
    const last = candles?.[candles.length - 1]?.c;
    if (!(first > 0) || !(last > 0)) return 0;
    return ((last - first) / first) * 100;
}

/** 수익률과 Buy & Hold 대비 성과로 코인을 준다. */
export function coinsFor(finalReturn: number, bhReturn: number): number {
    let coins = 0;
    if (finalReturn >= 10) coins += 30;
    else if (finalReturn >= 0) coins += 10;
    if (finalReturn > bhReturn) coins += 20;
    return coins;
}
