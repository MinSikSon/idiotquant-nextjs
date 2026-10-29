import type { LikedStockItem } from "./stockLikesSlice";

export const WATCHLIST_MARKETS = [
    { value: "all", label: "전체보기" },
    { value: "KR", label: "국내" },
    { value: "US", label: "미국" },
    { value: "KOSPI", label: "코스피" },
    { value: "KOSDAQ", label: "코스닥" },
    { value: "KONEX", label: "코넥스" },
    { value: "NASDAQ", label: "나스닥" },
    { value: "NYSE", label: "NYSE" },
    { value: "AMEX", label: "AMEX" },
    { value: "unknown", label: "거래소 미분류" },
] as const;

export type WatchlistMarket = typeof WATCHLIST_MARKETS[number]["value"];
type MarketStock = Pick<LikedStockItem, "is_us" | "market">;

export function watchlistExchange(item: MarketStock): string {
    const market = (item.market ?? "").trim().toUpperCase();
    const aliases: Record<string, string> = item.is_us ? {
        NASDAQ: "NASDAQ", NASD: "NASDAQ", NAS: "NASDAQ", 나스닥: "NASDAQ",
        NYSE: "NYSE", NYS: "NYSE", 뉴욕: "NYSE",
        AMEX: "AMEX", AMS: "AMEX", 아멕스: "AMEX", "NYSE AMERICAN": "AMEX",
    } : {
        KOSPI: "KOSPI", 코스피: "KOSPI", 유가증권: "KOSPI", 유가증권시장: "KOSPI",
        KOSDAQ: "KOSDAQ", 코스닥: "KOSDAQ",
        KONEX: "KONEX", 코넥스: "KONEX",
    };
    return aliases[market] ?? "unknown";
}

export function matchesWatchlistMarket(item: MarketStock, market: WatchlistMarket): boolean {
    if (market === "all") return true;
    if (market === "KR") return !item.is_us;
    if (market === "US") return !!item.is_us;
    return watchlistExchange(item) === market;
}
