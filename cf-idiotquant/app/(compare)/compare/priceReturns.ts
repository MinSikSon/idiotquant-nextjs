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
    if (!stock.priceDate || !stock.price || stock.price <= 0) continue;
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
