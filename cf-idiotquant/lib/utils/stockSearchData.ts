import type { StockSearchName } from './stockSuggestions';

export interface StaticStockData {
  allTickers: string[];
  usStocks: StockSearchName[];
  corpCodeJson: Record<string, any>;
}

let cachedStaticData: StaticStockData | null = null;
let staticDataPromise: Promise<StaticStockData> | null = null;

export const loadStaticStockData = (): Promise<StaticStockData> => {
  if (cachedStaticData) return Promise.resolve(cachedStaticData);
  if (staticDataPromise) return staticDataPromise;

  staticDataPromise = Promise.all([
    import('@/public/data/usStockSymbols/nasdaq_full_tickers.json'),
    import('@/public/data/usStockSymbols/nyse_full_tickers.json'),
    import('@/public/data/usStockSymbols/amex_full_tickers.json'),
    import('@/public/data/validCorpCodeArray.json'),
    import('@/public/data/validCorpNameArray.json'),
    import('@/public/data/validCorpCode.json'),
    fetch('/api/proxy/ticker-map?source=overrides&country=all&limit=500')
      .then(r => r.json())
      .catch(() => ({ success: false, data: [] })),
  ]).then(([nasdaq, nyse, amex, corpCode, corpName, corpCodeData, overrides]) => {
    // override 항목: KR은 코드+이름 모두, US는 코드만 추가 (검색 유효성 검사 + 자동완성 확장)
    const overrideEntries: string[] = (overrides.data ?? []).flatMap((o: any) =>
      o.country === 'KR' ? [o.ticker, o.name].filter(Boolean) : [o.ticker].filter(Boolean)
    );
    const usStocks: StockSearchName[] = [
      ...nasdaq.default, ...nyse.default, ...amex.default,
    ];
    // 같은 티커의 관리자 이름도 검색 별칭으로 남긴다.
    for (const entry of overrides.data ?? []) {
      if (entry.country === 'US' && entry.ticker && entry.name) {
        usStocks.push({ symbol: entry.ticker.toUpperCase(), name: entry.name });
      }
    }
    cachedStaticData = {
      allTickers: [...new Set([
        ...usStocks.map(stock => stock.symbol),
        ...corpCode.default, ...corpName.default,
        ...overrideEntries,
      ])],
      usStocks,
      corpCodeJson: corpCodeData.default,
    };
    return cachedStaticData;
  });

  return staticDataPromise;
};

