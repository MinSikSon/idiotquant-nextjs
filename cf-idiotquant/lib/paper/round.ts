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
    auto?: number;   // 1 = 마지막 날 강제 청산 (플레이어가 누른 게 아니다)
}

/**
 * 매매 습관 — 판에서 관찰된 사실. 계산은 워커(src/lib/habits.js)에서만 하고 여기는 받아
 * 그리기만 한다. 프론트에 규칙 사본을 또 만들지 않으려는 선택이다.
 *
 * null 인 값은 "표본이 없어 말할 수 없다"는 뜻이다 — 0 으로 바꿔 그리면 안 된다.
 */
export interface RoundHabits {
    trades: number;
    buys: number;
    sells: number;
    closedLots: number;
    tradableDays: number;
    turnover: number | null;
    holdDays: number | null;
    entryTrend: number | null;
    chaseRatio: number | null;
    gainHoldDays: number | null;
    lossHoldDays: number | null;
    disposition: number | null;
    biteShare: number | null;
    maxExposure: number;
    watchRatio: number | null;
}

/** 여러 분기를 합친 습관. 기록이 없으면 서버가 null 을 준다. */
export interface HabitSummary extends Omit<RoundHabits, "buys" | "sells" | "maxExposure"> {
    quarters: number;
    maxExposure: number | null;
}

/** 예약 한 건. kind 는 워커의 RESERVE_KINDS 와 같아야 한다. */
export interface Reservation {
    kind: "buy_limit" | "stop_loss" | "take_profit";
    price: number;
    qty: number;
}

/** 서버 `_publicRound` 와 같은 모양. 진행 중에는 정답과 미래 캔들이 비어 있다. */
export interface ReplayRound {
    orders: ReplayOrder[];
    /** 블라인드 중에도 열어 주는 업종. 예전 판·체험 운용은 null. */
    sector: string | null;
    /** 판의 성격(plunge·range·peak·mixed). 컨텍스트 구간만 보고 붙인 값이라 정답이 새지 않는다. */
    scenario: string | null;
    /** 걸어 둔 예약. 체결 판정과 체결가 규칙은 워커(src/lib/reservations.js)에만 있다. */
    pending: Reservation[];
    /** 이 분기를 다음으로 이월했는가. 이월했으면 정답(종목명)은 아직 열리지 않는다. */
    carried?: boolean;
    id: string;
    cursor: number;
    /** 이 판의 캔들 수. 반기 창을 달력으로 자르면 판마다 다르다. */
    total_days: number;
    /** 미리 보여 준 구간의 캔들 수. 벤치마크 기준일이 여기서 나온다. */
    context_days?: number;
    /** 몇 번째 반기인가(0부터). 캠페인 없이 굴린 판·체험 운용은 null. */
    half_index?: number | null;
    campaign_id?: string | null;
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
    // 분기 정산 — 끝난 판에만 있다. 규칙이 바뀌어도 지난 기록은 그때 값 그대로여야 해서
    // 다시 계산하지 않고 서버가 남긴 값을 그대로 쓴다.
    aum_before: number | null;
    aum_after: number | null;
    fee_base: number | null;
    fee_perf: number | null;
    habits: RoundHabits | null;
}

/**
 * 캠페인 — "몇 년을 굴릴 것인가". 기간을 고르면 그만큼 전으로 돌아가 달력 45일짜리
 * 반기(1-1 … 4-2)를 차례로 굴린다. 규칙과 계산은 전부 워커(lib/campaign.js)에 있다.
 */
export interface Campaign {
    id: string;
    years: number;
    start_date: string;
    half_index: number;
    total_halves: number;
    status: "playing" | "done";
    /** 몇 년차인지. 20년이면 라벨(1-1)만으로는 구분이 안 된다. */
    year: number;
    /** "1-1" … "4-2" */
    half_label: string;
    done_halves: number;
    ended_at: number | null;
}

export interface ReplayHistoryItem {
    id: string;
    /** 이월한 분기는 아직 그 회사를 들고 있어 정답을 열지 않는다 — 그때는 둘 다 null */
    ticker: string | null;
    name: string | null;
    carried?: boolean;
    start_date: string | null;
    end_date: string | null;
    final_return: number | null;
    bh_return: number | null;
    aum_before: number | null;
    aum_after: number | null;
    fee_base: number | null;
    fee_perf: number | null;
    habits: RoundHabits | null;
    created_at: number;
}

/** 같은 구간을 그냥 사서 들고 있었을 때의 수익률(%). */
export function buyAndHoldReturn(candles: Candle[]): number {
    const first = candles?.[0]?.c;
    const last = candles?.[candles.length - 1]?.c;
    if (!(first > 0) || !(last > 0)) return 0;
    return ((last - first) / first) * 100;
}

