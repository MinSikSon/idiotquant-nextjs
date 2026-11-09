import type { ComparisonPrice } from './compareSlice';

export type MarketCapUpdate = Pick<ComparisonPrice, 'marketCap' | 'marketCapSource' | 'marketCapError'>;

export async function getExternalMarketCap(ticker: string, priceDate: string): Promise<MarketCapUpdate> {
  const params = new URLSearchParams({ ticker, market: 'KR', date: `${priceDate.slice(0, 4)}-${priceDate.slice(4, 6)}-${priceDate.slice(6)}` });
  try {
    const response = await fetch(`/api/public/compare/market-cap?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('market cap unavailable');
    const external: ComparisonPrice = await response.json();
    return { marketCap: external.marketCap, marketCapSource: external.marketCapSource, marketCapError: external.marketCapError };
  } catch {
    return { marketCapError: '외부 과거 시총 조회에 실패했습니다.' };
  }
}
