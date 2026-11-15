export type WatchSnapshot = {
    market?: 'KR' | 'US';
    ticker: string; name: string; scanDate: string; strategies: string[];
    price: number | null; pbr: number | null; per: number | null; ncav: number | null;
};
export type WatchChange = {
    before: WatchSnapshot; after: WatchSnapshot; entered: string[]; exited: string[];
    pricePercent: number | null;
};
const metric = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;

export function watchChangeLabel(change: WatchChange) {
    const labels: string[] = [];
    if (change.pricePercent !== null && change.before.price !== change.after.price) {
        labels.push(`가격 ${change.pricePercent > 0 ? '+' : ''}${change.pricePercent.toFixed(2)}%`);
    }
    for (const field of ['per', 'pbr', 'ncav'] as const) {
        if (change.before[field] !== null && change.after[field] !== null && change.before[field] !== change.after[field]) labels.push(field.toUpperCase());
    }
    if (change.entered.length || change.exited.length) labels.push('전략 조건');
    return labels.join(' · ');
}

export function watchSnapshot(items: readonly {
    is_us?: number;
    ticker: string; stock_name: string | null; scan_date: string | null; strategies: string[];
    last_price: number | null; pbr: number | null; per: number | null; ncav_ratio: number | null;
}[]): WatchSnapshot[] {
    return items.filter(item => item.scan_date).map(item => ({
        market: item.is_us ? 'US' : 'KR', ticker: item.ticker, name: item.stock_name || item.ticker, scanDate: item.scan_date!.replaceAll('-', ''),
        strategies: [...new Set(item.strategies)].sort(), price: metric(item.last_price),
        pbr: metric(item.pbr), per: metric(item.per), ncav: metric(item.ncav_ratio),
    }));
}

export function watchChanges(before: readonly WatchSnapshot[], after: readonly WatchSnapshot[]): WatchChange[] {
    const previous = new Map(before.map(item => [watchKey(item), item]));
    return after.flatMap(item => {
        const old = previous.get(watchKey(item));
        if (!old || item.scanDate < old.scanDate) return [];
        const entered = item.strategies.filter(strategy => !old.strategies.includes(strategy));
        const exited = old.strategies.filter(strategy => !item.strategies.includes(strategy));
        const changed = (['price', 'pbr', 'per', 'ncav'] as const).some(key => old[key] !== null && item[key] !== null && old[key] !== item[key]);
        if (!entered.length && !exited.length && !changed) return [];
        return [{ before: old, after: item, entered, exited, pricePercent:
            old.price !== null && old.price > 0 && item.price !== null ? (item.price / old.price - 1) * 100 : null }];
    });
}

export const watchKey = (item: WatchSnapshot) => `${item.market ?? 'KR'}:${item.ticker}`;

export const scanDateLabel = (value: string) => {
    const digits = value.replaceAll('-', '');
    return /^\d{8}$/.test(digits) ? `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}` : value;
};
