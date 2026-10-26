import type { TradingLog, UsCapitalStockItem } from "./capitalSlice";

/** 누락된 가격·수량을 0원 체결로 취급하지 않는다. */
export function executionAmount(log: TradingLog): number | null {
    const price = numericValue(log.stck_prpr);
    const quantity = numericValue(log.ORD_QTY);
    if (price === null || quantity === null || price <= 0 || quantity <= 0) return null;
    const amount = price * quantity;
    return Number.isFinite(amount) ? amount : null;
}

export function numericValue(value: unknown): number | null {
    if (value === undefined || value === null || String(value).trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

/** 체결 당시 그룹 정보가 없으므로 현재 소속이 유일하게 확인되는 종목만 연결한다. */
export function currentLogGroup(log: TradingLog, stocks: UsCapitalStockItem[], country: "KR" | "US"): string | null {
    const symbol = country === "KR" ? log.stock_code || log.symbol : log.symbol;
    if (!symbol) return null;
    const memberships = new Set(stocks.filter(stock => stock.symbol === symbol).map(stock => stock.group_id || null));
    return memberships.size === 1 ? [...memberships][0] : null;
}

export function executionTotals(logs: TradingLog[]) {
    let buy = 0;
    let sell = 0;
    let missing = 0;
    for (const log of logs) {
        const amount = executionAmount(log);
        if (amount === null || (log.buyOrSell !== "buy" && log.buyOrSell !== "sell")) {
            missing++;
            continue;
        }
        if (log.buyOrSell === "buy") buy += amount;
        else sell += amount;
    }
    return { buy, sell, missing };
}

/** 원화 포인트를 종목별 1주 예산과 비교한다. 풀 합계로 주문 가능량을 계산하지 않는다. */
export function stockBudgetProgress(stock: UsCapitalStockItem, country: "KR" | "US", exchangeRate?: number) {
    const price = numericValue(stock.condition?.LastPrice);
    const rate = country === "KR" ? 1 : numericValue(exchangeRate);
    const unitKrw = price !== null && price > 0 && rate !== null && rate > 0 ? price * rate : null;
    const points = Math.max(0, numericValue(stock.token) ?? 0);
    if (unitKrw === null || !Number.isFinite(unitKrw)) return null;
    return {
        unitKrw, points,
        percent: Math.min(100, points / unitKrw * 100),
        shares: Math.floor(points / unitKrw),
        missing: Math.max(0, unitKrw - points),
    };
}

/** Stored cursor addresses the complete stock_list, before inactive stocks are skipped. */
export function tradingCursorIndex(value: unknown, length: number): number | null {
    if (value === null || value === undefined || value === "" || length <= 0) return null;
    const index = Number(value);
    if (!Number.isFinite(index)) return null;
    return ((Math.trunc(index) % length) + length) % length;
}
