import validCorpCode from "@/public/data/validCorpCode.json" with { type: "json" };
import type { StockGroup, UsCapitalStockItem } from "../capital/capitalSlice";

// 국내 자동매매 종목명과 증권사 잔고의 6자리 코드를 같은 키로 비교한다.
const KR_NAME_TO_CODE = new Map(Object.entries(validCorpCode).map(([name, data]) => [name, data.stock_code]));

export function balanceTickerKey(value: unknown, isUs: boolean): string {
    const ticker = String(value ?? "").trim();
    if (isUs) return ticker.toUpperCase();
    const code = KR_NAME_TO_CODE.get(ticker) ?? ticker;
    if (/^A\d{6}$/i.test(code)) return code.slice(1);
    return /^\d{1,6}$/.test(code) ? code.padStart(6, "0") : code;
}

export interface PortfolioBalanceRow {
    pdno?: string;
    ovrs_pdno?: string;
    hldg_qty?: string;
    ccld_qty_smtl1?: string;
    cblc_qty13?: string;
}

export function balanceHoldingQuantity(row: PortfolioBalanceRow) {
    // 해외 현재잔고는 당일 체결을 반영한 수량을 우선한다.
    return String(row.hldg_qty ?? "").trim() || String(row.ccld_qty_smtl1 ?? "").trim() || row.cblc_qty13 || 0;
}

export function heldPortfolioTickers(rows: PortfolioBalanceRow[], isUs: boolean) {
    return new Set(rows.filter(row => Number(balanceHoldingQuantity(row)) > 0)
        .map(row => balanceTickerKey(row.pdno || row.ovrs_pdno, isUs)).filter(Boolean));
}

export type PortfolioTradingStatus = { side: "buy" | "sell"; groupName: string };

export function activePortfolioTrading(stocks: UsCapitalStockItem[], groups: StockGroup[], isUs: boolean) {
    // 목표 비중 전략은 실행 시점의 평가액으로 주문 방향을 정한다.
    const activeGroups = new Map(groups.filter(group => group.id !== "__likes__" && group.is_trading_active !== false && !group.rebalancing)
        .map(group => [group.id, group]));
    const trading = new Map<string, PortfolioTradingStatus>();
    for (const stock of stocks) {
        const group = stock.group_id ? activeGroups.get(stock.group_id) : undefined;
        const ticker = balanceTickerKey(stock.symbol, isUs);
        if (ticker && group && stock.action === "active") {
            trading.set(ticker, { side: group.side ?? "buy", groupName: group.name });
        }
    }
    return trading;
}
