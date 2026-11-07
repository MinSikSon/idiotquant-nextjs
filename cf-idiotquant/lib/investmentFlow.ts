export const WATCHLIST_HREF = "/screener?filter=liked";
export const PENDING_WATCH_KEY = "idiotquant:pending-watch:v1";

export type WatchStock = { ticker: string; name: string; isUs: boolean };
type WatchEntry = { ticker: string; stock_name?: string | null; is_us: number };

export function matchesWatchStock(item: WatchEntry, stock: WatchStock) {
    if (Boolean(item.is_us) !== stock.isUs) return false;
    const aliases = [stock.ticker, stock.name].map(value => value.toUpperCase());
    return [item.ticker, item.stock_name].some(value => value && aliases.includes(value.toUpperCase()));
}

export async function completeWatchRequest(stock: WatchStock, load: () => Promise<WatchEntry[]>, consume: () => void, add: (stock: WatchStock) => Promise<unknown>) {
    const items = await load();
    consume();
    if (items.some(item => matchesWatchStock(item, stock))) return;
    await add(stock);
}

export function screenerReturnPath(value: string | null) {
    if (!value?.startsWith("/screener")) return null;
    try {
        const url = new URL(value, "https://idiotquant.local");
        return url.pathname === "/screener" ? `${url.pathname}${url.search}` : null;
    } catch { return null; }
}

export function analysisHref(ticker: string, returnTo?: string) {
    const params = new URLSearchParams({ ticker });
    const back = screenerReturnPath(returnTo ?? null);
    if (back) params.set("returnTo", back);
    return `/analyze?${params}`;
}

/** 로그인 전 사용자가 직접 누른 저장 요청만 같은 탭에서 한 번 이어간다. */
export function readPendingWatch(raw: string | null, ticker: string, now = Date.now()): WatchStock | null {
    try {
        const value = JSON.parse(raw ?? "null");
        if (!value || typeof value.ticker !== "string" || typeof value.name !== "string" || typeof value.isUs !== "boolean" || typeof value.createdAt !== "number") return null;
        const age = now - value.createdAt;
        if (!Number.isFinite(age) || age < 0 || age > 30 * 60_000) return null;
        return value.ticker === ticker ? { ticker: value.ticker, name: value.name, isUs: value.isUs } : null;
    } catch { return null; }
}

export function comparisonHref(country: "KR" | "US", tickers: string[], date: string) {
    return `/compare?${new URLSearchParams({ country, tickers: [...new Set(tickers)].join(","), date: date.replaceAll("-", "") })}`;
}

export function toggleComparisonSelection(current: string[], ticker: string, limit: number) {
    return current.includes(ticker) ? current.filter(value => value !== ticker)
        : current.length < limit ? [...current, ticker] : current;
}
