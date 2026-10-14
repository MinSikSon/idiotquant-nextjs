export type PriceBar = { date: string; close: number; volume?: number };

export function normalizeBars(rows: { stck_bsop_date?: unknown; stck_clpr?: unknown; acml_vol?: unknown; xymd?: unknown; clos?: unknown; tvol?: unknown }[], market: 'KR' | 'US'): PriceBar[] {
    const bars = new Map<string, PriceBar>();
    for (const row of rows) {
        const date = String(market === 'KR' ? row.stck_bsop_date : row.xymd);
        const close = Number(market === 'KR' ? row.stck_clpr : row.clos);
        const rawVolume = market === 'KR' ? row.acml_vol : row.tvol;
        const volume = rawVolume == null || rawVolume === '' ? undefined : Number(rawVolume);
        if (/^\d{8}$/.test(date) && Number.isFinite(close) && close > 0) {
            bars.set(date, { date, close, volume: Number.isFinite(volume) && volume! >= 0 ? volume : undefined });
        }
    }
    return [...bars.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function technicalSummary(bars: readonly PriceBar[]) {
    const prices = bars.map(bar => bar.close);
    const last = prices.at(-1);
    const sma = (period: number) => prices.length >= period
        ? prices.slice(-period).reduce((sum, price) => sum + price, 0) / period : null;
    const momentum = (period: number) => last != null && prices.length > period
        ? (last / prices[prices.length - period - 1] - 1) * 100 : null;
    let rsi: number | null = null;
    if (prices.length > 14) {
        let gain = 0, loss = 0;
        for (let i = 1; i <= 14; i++) {
            const change = prices[i] - prices[i - 1];
            gain += Math.max(0, change) / 14;
            loss += Math.max(0, -change) / 14;
        }
        for (let i = 15; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gain = (gain * 13 + Math.max(0, change)) / 14;
            loss = (loss * 13 + Math.max(0, -change)) / 14;
        }
        rsi = gain === 0 && loss === 0 ? 50 : loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    }
    const previousVolumes = bars.slice(-21, -1).map(bar => bar.volume);
    const volume = bars.at(-1)?.volume;
    const averageVolume = previousVolumes.length === 20 && previousVolumes.every(v => v != null)
        ? previousVolumes.reduce<number>((sum, v) => sum + v!, 0) / 20 : null;
    return {
        date: bars.at(-1)?.date, count: bars.length, sma20: sma(20), sma60: sma(60),
        momentum20: momentum(20), momentum60: momentum(60), rsi14: rsi,
        volumeRatio: volume != null && averageVolume != null && averageVolume > 0 ? volume / averageVolume : null,
    };
}
