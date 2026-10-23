export type WatchSnapshot = {
    ticker: string; name: string; scanDate: string; strategies: string[];
    price: number | null; pbr: number | null; per: number | null; ncav: number | null;
};
export type WatchChange = {
    before: WatchSnapshot; after: WatchSnapshot; entered: string[]; exited: string[];
    pricePercent: number | null;
};
const metric = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;

export function watchSnapshot(items: readonly {
    ticker: string; stock_name: string | null; scan_date: string | null; strategies: string[];
    last_price: number | null; pbr: number | null; per: number | null; ncav_ratio: number | null;
}[]): WatchSnapshot[] {
    return items.filter(item => item.scan_date).map(item => ({
        ticker: item.ticker, name: item.stock_name || item.ticker, scanDate: item.scan_date!,
        strategies: [...new Set(item.strategies)].sort(), price: metric(item.last_price),
        pbr: metric(item.pbr), per: metric(item.per), ncav: metric(item.ncav_ratio),
    }));
}

export function readWatchSnapshot(raw: string | null): WatchSnapshot[] {
    try {
        const value = JSON.parse(raw ?? 'null');
        if (value?.version !== 1 || !Array.isArray(value.items)) return [];
        return value.items.slice(0, 5000).filter((item: WatchSnapshot) => item && typeof item.ticker === 'string'
            && typeof item.name === 'string' && typeof item.scanDate === 'string'
            && Array.isArray(item.strategies) && item.strategies.every(value => typeof value === 'string')
            && [item.price, item.pbr, item.per, item.ncav].every(value => value === null || metric(value) !== null));
    } catch { return []; }
}

export function watchChanges(before: readonly WatchSnapshot[], after: readonly WatchSnapshot[]): WatchChange[] {
    const previous = new Map(before.map(item => [item.ticker, item]));
    return after.flatMap(item => {
        const old = previous.get(item.ticker);
        if (!old || item.scanDate < old.scanDate) return [];
        const entered = item.strategies.filter(strategy => !old.strategies.includes(strategy));
        const exited = old.strategies.filter(strategy => !item.strategies.includes(strategy));
        const changed = (['price', 'pbr', 'per', 'ncav'] as const).some(key => old[key] !== null && item[key] !== null && old[key] !== item[key]);
        if (!entered.length && !exited.length && !changed) return [];
        return [{ before: old, after: item, entered, exited, pricePercent:
            old.price !== null && old.price > 0 && item.price !== null ? (item.price / old.price - 1) * 100 : null }];
    });
}
