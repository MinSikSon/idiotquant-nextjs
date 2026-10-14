type PricePoint = {
  id: string;
  ticker: string;
  market: 'KR' | 'US';
  price?: number;
  priceDate?: string;
};

export function calculatePriceReturns(stocks: PricePoint[]) {
  const groups = new Map<string, PricePoint[]>();
  for (const stock of stocks) {
    if (!stock.priceDate || !Number.isFinite(stock.price) || !stock.price || stock.price <= 0) continue;
    const key = `${stock.market}:${stock.ticker}`;
    groups.set(key, [...(groups.get(key) ?? []), stock]);
  }

  const returns = new Map<string, { baselineDate: string; percent: number; baseline: boolean }>();
  for (const group of groups.values()) {
    group.sort((a, b) => a.priceDate!.localeCompare(b.priceDate!));
    if (new Set(group.map(stock => stock.priceDate)).size < 2) continue;
    const first = group[0];
    for (const stock of group) {
      returns.set(stock.id, {
        baselineDate: first.priceDate!,
        percent: (stock.price! / first.price! - 1) * 100,
        baseline: stock.id === first.id,
      });
    }
  }
  return returns;
}

export function summarizeReturns(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return {
    count: sorted.length,
    average: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    positiveCount: sorted.filter(value => value > 0).length,
  };
}
