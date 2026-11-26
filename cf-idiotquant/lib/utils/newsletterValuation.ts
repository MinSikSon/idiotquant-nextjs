import { scanValuationSummary } from "./valuationSummary.ts";

export type Market = "KR" | "US";
export type NewsletterStock = { market: Market; ticker: string; name: string };
export type Model = { label: string; basis: string; targetPrice: number | null; gapPercent: number | null };
export type ValuationSnapshot = { date: string; name: string; price: number; models: Model[] };

export function stockKey(stock: Pick<NewsletterStock, "market" | "ticker">) {
    return `${stock.market}:${stock.ticker}`;
}

export function parseStockKey(key: string | null | undefined) {
    const [market, ticker, extra] = key?.split(":") ?? [];
    if (extra !== undefined) return null;
    if (market === "KR" && /^\d{6}$/.test(ticker ?? "")) return { market, ticker } as const;
    if (market === "US" && /^[A-Z][A-Z0-9.-]{0,14}$/.test(ticker ?? "")) return { market, ticker } as const;
    return null;
}

export function newsletterUrl(step: string, stock?: Pick<NewsletterStock, "market" | "ticker">) {
    const params = new URLSearchParams({ step });
    if (stock) params.set("stock", stockKey(stock));
    return `/newsletter?${params}`;
}

export function scanSnapshot(row: Record<string, unknown>, stock: Pick<NewsletterStock, "market" | "ticker">): ValuationSnapshot | null {
    if (!row || row.ticker !== stock.ticker || (row.country && row.country !== stock.market)) return null;
    const rawDate = row.scan_date ?? row.period_end_date;
    const date = typeof rawDate === "string" ? rawDate.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3") : "";
    const timestamp = Date.parse(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) ||
        new Date(timestamp).toISOString().slice(0, 10) !== date) return null;
    const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
    const price = number(row.last_price);
    if (price === null || price <= 0) return null;
    const isUs = Number(stock.market === "US");
    const eps = number(row.eps);
    const bps = number(row.bps);
    const netIncome = number(row.net_income);
    // The archive endpoint omits share count. Prefer the stored scan ratio across both sources
    // so a switch between archive and daily records doesn't change the NCAV methodology.
    const models = scanValuationSummary({
        last_price: price, is_us: isUs, eps, bps,
        current_assets: null, total_liabilities: null,
        ncav_ratio: number(row.ncav_ratio), net_income: netIncome,
    });
    // Same residual income formula as Analyze, using the EPS/BPS available in the stored scan.
    const costOfEquity = 0.08;
    if (eps !== null && eps > 0 && bps !== null && bps > 0 && !(isUs && netIncome !== null && netIncome <= 0)) {
        const scale = isUs ? 100 : 1;
        const targetPrice = Math.round(eps / costOfEquity * scale) / scale;
        if (Number.isFinite(targetPrice) && targetPrice > 0) models.push({
            label: "SRIM", basis: "Ke 8%", targetPrice, gapPercent: (targetPrice / price - 1) * 100,
        });
    }
    return { date, name: typeof row.name === "string" && row.name ? row.name : stock.ticker, price, models };
}

export function mergeValuationSnapshots(groups: ValuationSnapshot[][]) {
    const byDate = new Map<string, ValuationSnapshot>();
    for (const group of groups) {
        for (const snapshot of group) byDate.set(snapshot.date, snapshot);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const HISTORY_QUARTERS = 20;

export function seoulDate(now = Date.now()) {
    return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function quarterNumber(date: string) {
    return Math.ceil(Number(date.slice(5, 7)) / 3);
}

function quarterEnd(year: number, quarter: number) {
    return new Date(Date.UTC(year, quarter * 3, 0)).toISOString().slice(0, 10);
}

export function latestCompletedQuarter(date: string) {
    return quarterEnd(Number(date.slice(0, 4)), quarterNumber(date) - 1);
}

export function historyQuarterEnds(date: string) {
    const year = Number(date.slice(0, 4));
    const quarter = quarterNumber(date);
    return Array.from({ length: HISTORY_QUARTERS }, (_, index) =>
        quarterEnd(year, quarter - HISTORY_QUARTERS + 1 + index));
}

export function valuationQuarters(snapshots: ValuationSnapshot[], through: string) {
    const latestByQuarter = new Map<string, ValuationSnapshot>();
    for (const snapshot of snapshots) {
        if (snapshot.date > through) continue;
        const end = quarterEnd(Number(snapshot.date.slice(0, 4)), quarterNumber(snapshot.date));
        const saved = latestByQuarter.get(end);
        if (!saved || snapshot.date >= saved.date) latestByQuarter.set(end, snapshot);
    }
    return historyQuarterEnds(through).map(end => ({ end, snapshot: latestByQuarter.get(end) }));
}

export function scanPath(stock: Pick<NewsletterStock, "market" | "ticker">, source: "latest" | "daily" | "weekly" | "monthly" | "preview") {
    const ticker = encodeURIComponent(stock.ticker);
    const query = new URLSearchParams({ country: stock.market });
    if (source === "latest" || source === "daily") {
        query.set("limit", source === "latest" ? "1" : "30");
        return `/scan/daily/ticker/${ticker}?${query}`;
    }
    query.set("period_type", source === "preview" ? "monthly" : source);
    query.set("limit", source === "preview" ? "1" : "120");
    return `/scan/archive/ticker/${ticker}?${query}`;
}

export function newsletterNumber(value: number, market: Market) {
    return new Intl.NumberFormat("ko-KR", market === "KR"
        ? { maximumFractionDigits: 0 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
