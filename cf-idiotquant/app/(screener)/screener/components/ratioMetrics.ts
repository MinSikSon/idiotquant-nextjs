// 종목의 유동자산·부채총계·시가총액을 서로 비교하기 위한 순수 계산.
// 세 값은 스캔 응답에서 모두 억원 단위로 들어온다(ncav_ratio 가 이 셋으로 계산되므로 단위가 같다).
// React 비의존 — 값 계산만 담당하고 표현은 StockRatioRow 가 맡는다.

export interface RatioInput {
    current_assets?: unknown;   // 유동자산 (억원)
    total_liabilities?: unknown; // 부채총계 (억원)
    market_cap?: unknown;        // 시가총액 (억원)
}

export interface RatioMetrics {
    currentAssets: number;
    liabilities: number;
    marketCap: number;
    netCurrent: number;      // 순유동자산 = 유동자산 − 부채총계 (음수 가능)
    /** 순유동자산 ÷ 시가총액. 1 이상이면 청산가치가 시총보다 크다. 계산 불가 시 null */
    ncavMultiple: number | null;
    /** 부채총계 ÷ 유동자산. 1 이상이면 유동자산으로 부채를 못 덮는다. 계산 불가 시 null */
    debtToAssets: number | null;
    /** 시가총액 ÷ 유동자산. 낮을수록 자산 대비 싸게 거래된다. 계산 불가 시 null */
    capToAssets: number | null;
    /** 세 값을 같은 축에 그리기 위한 공통 분모 (최댓값). 전부 0 이하면 0 */
    scale: number;
}

const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

// 0 이하 분모는 비율을 만들 수 없다 → null. (자본잠식·데이터 누락 종목에서 Infinity/NaN 방지)
const ratio = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export function ratioMetrics(item: RatioInput): RatioMetrics {
    const currentAssets = num(item.current_assets);
    const liabilities = num(item.total_liabilities);
    const marketCap = num(item.market_cap);
    const netCurrent = currentAssets - liabilities;

    return {
        currentAssets,
        liabilities,
        marketCap,
        netCurrent,
        ncavMultiple: ratio(netCurrent, marketCap),
        debtToAssets: ratio(liabilities, currentAssets),
        capToAssets: ratio(marketCap, currentAssets),
        // 음수(순유동자산)는 축 길이에 쓰지 않으므로 양수 후보만 비교한다
        scale: Math.max(currentAssets, liabilities, marketCap, 0),
    };
}

/** 공통 축(scale) 기준 막대 길이 % — 0~100 으로 클램프해 레이아웃이 넘치지 않게 한다 */
export function barPct(value: number, scale: number): number {
    if (!(scale > 0)) return 0;
    return Math.min(100, Math.max(0, (value / scale) * 100));
}
