// 일별 스캔의 한국·미국 재무값을 같은 의미로 읽는다.
// 미국 EPS/PER에는 순이익과 부호가 맞지 않는 응답이 있어 수익성은 순이익을 우선한다.
const finiteNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

export const isUsScanStock = (item: Record<string, any>): boolean =>
    String(item.country ?? "").toUpperCase() === "US";

export function profitableScanStock(item: Record<string, any>): boolean {
    const income = finiteNumber(item.net_income);
    if (isUsScanStock(item) && income !== null) return income > 0;
    return (finiteNumber(item.eps) ?? 0) > 0;
}

/** 스캔 응답의 roe 는 비율(0.1 = 10%)이며 화면·필터에서는 퍼센트를 쓴다. */
export function scanRoePercent(item: Record<string, any>): number {
    if (isUsScanStock(item) && !profitableScanStock(item)) return 0;
    const eps = finiteNumber(item.eps);
    const bps = finiteNumber(item.bps);
    if (eps !== null && bps !== null && bps > 0) return eps / bps * 100;
    if (isUsScanStock(item)) return (finiteNumber(item.roe) ?? 0) * 100;
    return 0;
}

/** KR: 억원, US: 백만 달러. 필터 UI의 단위와 일치한다. */
export function scanMarketCap(item: Record<string, any>, country: "KR" | "US"): number {
    const value = finiteNumber(item.market_cap) ?? 0;
    return country === "US" ? value / 1_000_000 : value;
}

/** KR: 억원, US: 백만 달러. 값이 없는 종목은 null. */
export function scanTradingAmount(item: Record<string, any>, country: "KR" | "US"): number | null {
    const value = finiteNumber(item.acml_tr_pbmn);
    if (value === null) return null;
    return value / (country === "US" ? 1_000_000 : 100_000_000);
}
