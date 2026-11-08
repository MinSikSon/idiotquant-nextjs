import { isValuationEligible } from "./stockValuationEligibility";

export const HOME_STOCK_FILTERS = [
    { id: "large_cap", label: "대형주", description: "시가총액이 큰 순" },
    { id: "per10", label: "저PER", description: "PER 0 초과·10 이하 · PER 낮은 순" },
    { id: "low_pbr", label: "저PBR", description: "PBR 0 초과·0.5 미만 · PBR 낮은 순" },
    { id: "ncav", label: "NCAV", description: "순유동자산/시가총액 100% 이상 · 비율 높은 순" },
] as const;
export type HomeStockFilter = typeof HOME_STOCK_FILTERS[number]["id"];
export type HomeStock = {
    ticker: string; name: string; country?: "KR" | "US"; last_price: number; per: number; pbr: number;
    ncav_ratio: number; market_cap: number; scan_date: string;
    eps?: number; bps?: number; roe?: number | null; net_income?: number; strategies?: string[];
    financial_bs_date?: string | null; financial_is_date?: string | null;
    financial_source?: "sec" | "finnhub" | "kis" | null;
};
export type HomeStockPreview = {
    groups: Record<HomeStockFilter, HomeStock[]>;
    counts: Record<HomeStockFilter, number>;
    total: number; loaded: number; scanDate: string | null;
};

// 수집 시총 단위는 국내 억 원, 미국 달러다.
export function formatHomeMarketCap(value: number, country: "KR" | "US") {
    if (!Number.isFinite(value) || value <= 0) return "—";
    const amount = (value / (country === "US" ? 1e9 : 1e4)).toLocaleString("ko-KR", { maximumFractionDigits: 1 });
    return country === "US" ? `$${amount}B` : `${amount}조 원`;
}

export function matchesHomeFilter(item: Pick<HomeStock, "per" | "pbr" | "ncav_ratio" | "market_cap">, filter: HomeStockFilter) {
    if (!isValuationEligible(item)) return false;
    if (filter === "large_cap") return Number.isFinite(item.market_cap) && item.market_cap > 0;
    if (filter === "low_pbr") return Number.isFinite(item.pbr) && item.pbr > 0 && item.pbr < 0.5;
    if (filter === "ncav") return Number.isFinite(item.ncav_ratio) && item.ncav_ratio >= 1;
    return Number.isFinite(item.per) && item.per > 0 && item.per <= 10;
}

export function homeStockPreview<T extends Pick<HomeStock, "per" | "pbr" | "ncav_ratio" | "market_cap">>(list: T[], filter: HomeStockFilter, limit = 5): T[] {
    const cap = (item: T) => Number.isFinite(item.market_cap) ? item.market_cap : 0;
    return list.filter(item => matchesHomeFilter(item, filter)).sort((a, b) => {
        const order = filter === "large_cap" ? cap(b) - cap(a)
            : filter === "ncav" ? b.ncav_ratio - a.ncav_ratio
                : filter === "low_pbr" ? a.pbr - b.pbr : a.per - b.per;
        return order || cap(b) - cap(a);
    }).slice(0, limit);
}

export function buildHomeStockPreview(list: HomeStock[], total: number, scanDate: string | null, limit = 5): HomeStockPreview {
    return {
        groups: Object.fromEntries(HOME_STOCK_FILTERS.map(({ id }) => [id, homeStockPreview(list, id, limit)])) as HomeStockPreview["groups"],
        counts: Object.fromEntries(HOME_STOCK_FILTERS.map(({ id }) => [id, list.filter(item => matchesHomeFilter(item, id)).length])) as HomeStockPreview["counts"],
        loaded: list.length, total, scanDate,
    };
}

export function homeResultsHref(filter: HomeStockFilter, country: "KR" | "US") {
    const params = new URLSearchParams({ country, from: "preview" });
    params.set("sort", filter === "large_cap" ? "market_cap" : filter === "ncav" ? "ncav_ratio" : filter === "low_pbr" ? "pbr" : "per");
    params.set("order", filter === "large_cap" || filter === "ncav" ? "desc" : "asc");
    if (filter === "per10") params.set("maxper", "10");
    else if (filter !== "large_cap") params.set("strategies", filter);
    return `/screener?${params}`;
}

/** 공개 미리보기는 홈에서 제공하는 네 가지 조건만 해석한다. 개인 저장 필터는 섞지 않는다. */
export function homeFilterFromParams(params: { get(name: string): string | null }): HomeStockFilter {
    const strategy = params.get("strategies");
    if (strategy === "ncav" || strategy === "low_pbr") return strategy;
    if (params.get("maxper") === "10") return "per10";
    return "large_cap";
}
