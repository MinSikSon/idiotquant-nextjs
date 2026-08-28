// 리플레이 한 판의 규칙과 모양 (클라이언트 판).
//
// 워커의 src/services/replay.js 와 짝이다. 그쪽은 KIS·D1 을 다루고 여기는 순수 규칙만
// 가져오지만, 상수와 계산식은 반드시 같아야 한다 — 판은 브라우저에서 굴러가고 결과만
// 워커에 저장되므로, 어긋나면 화면이 보여 준 판과 저장된 기록이 달라진다.

export const TOTAL_DAYS = 60;    // 한 판의 캔들 수
export const CONTEXT_DAYS = 20;  // 시작할 때 한 번에 보여 주는 구간

/** 한 반기에 함께 굴리는 종목 수. 워커 replayRules.js 의 SLOTS 와 같아야 한다. */
export const SLOTS = 4;

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
    /**
     * buy·sell 은 내 돈으로 사고파는 것, short·cover 는 빌려서 팔고 사서 갚는 것이다.
     * 넷을 한 목록에 섞어 두는 이유는 차트 마커와 성과 곡선이 "그날 무슨 일이 있었나"를
     * 한 줄로 읽어야 해서다 — 목록이 둘이면 두 곳을 합치는 코드가 세 군데 생긴다.
     */
    side: "buy" | "sell" | "short" | "cover";
    qty: number;
    price: number;
    auto?: number;   // 1 = 마지막 날 강제 청산 (플레이어가 누른 게 아니다)
    slot?: number;   // 어느 종목인가. 자리가 없던 옛 주문은 0번으로 읽는다
    /**
     * 낸 수수료와 매도 실현손익. 체결한 자리(halfTrade)에서만 채워진다 — 서버에서 받아
     * 그린 주문에는 없다. 지난 분기 목록의 "이 자리에 넣은 돈"이 이 값으로 집계되므로
     * 결과를 제출할 때 함께 보낸다.
     */
    fee?: number;
    realized?: number | null;
}

/**
 * 매매 습관 — 판에서 관찰된 사실. 반기가 끝날 때 lib/paper/habits.ts 가 계산해 확정하고,
 * 그 뒤로는 저장된 값을 그대로 그린다(규칙이 바뀌어도 지난 기록은 그때 값이어야 한다).
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

/** 예약 한 건. 체결 판정과 체결가 규칙은 lib/paper/reservations.ts 에 있다. */
export interface Reservation {
    kind: "buy_limit" | "stop_loss" | "take_profit";
    price: number;
    qty: number;
    /**
     * 어느 자리(종목)에 건 예약인가.
     *
     * 체결 판정은 이 자리의 캔들로 난다(halfAdvance 의 예약 체결). 안 보내면 0번 —
     * 종목이 하나뿐이던 시절 예약과 같은 취급이라 옛 기록도 그대로 읽힌다.
     */
    slot?: number;
}

/** 서버 `_publicRound` 와 같은 모양. 진행 중에는 정답과 미래 캔들이 비어 있다. */
/**
 * 한 자리(slot)의 종목. 한 반기에 넷을 함께 굴린다.
 *
 * 현금과 시드는 판에 하나뿐이고 넷이 나눠 쓴다. 값·보유·체결은 자리마다 따로다.
 * 진행 중에는 ticker·name 이 null 이다 — 블라인드가 무너지면 이 게임이 아니다.
 */
export interface ReplayHolding {
    slot: number;
    qty: number;
    cost_basis: number;
    /**
     * 빌려서 판 수량과 그때 받은 돈(= 묶인 담보). 0032 배포 전 워커 응답에는 없어서
     * 물음표를 붙여 뒀다 — 읽는 쪽은 항상 `?? 0` 으로 받는다.
     */
    short_qty?: number;
    short_basis?: number;
    realized: number;
    carried: boolean;
    sector: string | null;
    scenario: string | null;
    candles: Candle[];
    ticker: string | null;
    name: string | null;
    orders: ReplayOrder[];
}

export interface ReplayRound {
    orders: ReplayOrder[];
    /** 자리마다 종목 하나. 옛 판·체험 운용에는 없다(그때는 종목이 하나뿐이었다). */
    holdings?: ReplayHolding[];
    /** 블라인드 중에도 열어 주는 업종. 예전 판·체험 운용은 null. */
    sector: string | null;
    /** 판의 성격(plunge·range·peak·mixed). 컨텍스트 구간만 보고 붙인 값이라 정답이 새지 않는다. */
    scenario: string | null;
    /** 걸어 둔 예약. 하루가 열릴 때 halfAdvance 가 체결을 본다. */
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
    /**
     * 이번 반기의 목표를 해냈는가. null 이면 목표가 없던 판이다(캠페인 없이 굴렸거나 옛 기록).
     *
     * 어떤 목표였는지는 저장하지 않는다 — campaign_id 와 half_index 로 다시 뽑는다
     * (lib/paper/season.ts 의 seasonOf).
     */
    mission_ok?: boolean | null;
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

/**
 * 지난 분기의 한 자리. 넷을 합친 수익률만 보면 어느 종목이 벌고 어느 종목이 까먹었는지가
 * 안 보여서 다음 판에 고칠 것도 안 보인다.
 *
 * 이월한 자리는 다음 판에서 아직 굴리는 중이라 ticker·name 이 null 이다(자리 단위로 가린다).
 */
export interface HistoryStock {
    slot: number;
    ticker: string | null;
    name: string | null;
    sector: string | null;
    /** 이 자리가 이 분기에 만든 실현손익(원). 마지막 날 강제 청산까지 포함한다 */
    realized: number;
    /** 이 자리에 넣은 매수대금(수수료 포함). 0 이면 한 번도 안 산 자리다 */
    invested: number;
    /** 플레이어가 누른 체결 수 — 강제 청산은 안 센다 */
    trades: number;
    carried: boolean;
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
    /** 자리별 성적. 종목 하나로 굴리던 옛 판에는 없어서 빈 배열이다 */
    stocks?: HistoryStock[];
    /** 어느 캠페인의 몇 번째 반기였나. 캠페인 없이 굴린 옛 판은 둘 다 null */
    campaign_id?: string | null;
    half_index?: number | null;
    created_at: number;
}

/** 같은 구간을 그냥 사서 들고 있었을 때의 수익률(%). */
export function buyAndHoldReturn(candles: Candle[]): number {
    const first = candles?.[0]?.c;
    const last = candles?.[candles.length - 1]?.c;
    if (!(first > 0) || !(last > 0)) return 0;
    return ((last - first) / first) * 100;
}

/**
 * 다음 반기로 넘길 수 있는 주수. 워커 d1Store 의 _carryQty 와 같아야 한다.
 *
 * 넷을 다 이월하면 다음 판의 시드를 통째로 넘길 수 있다. 그래서 자리 하나가 넘길 수 있는
 * 몫은 시드를 자리 수로 나눈 만큼으로 막는다.
 */
export function carryQty(qty: number, price: number, perSlotSeed: number): number {
    if (!(qty > 0) || !(price > 0)) return 0;
    return Math.max(0, Math.min(qty, Math.floor(perSlotSeed / price)));
}

