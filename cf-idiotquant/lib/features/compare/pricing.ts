import type { ComparisonPrice, ComparisonStock } from './compareSlice';

// 시가총액은 통화 기본 단위(원/USD)로 보관한다. 과거 가격에 현재 주식 수를
// 곱해 시총을 추정하면 분할·병합 효과가 사라지므로 당시 자료만 사용한다.
export function comparisonPrice(stock: Pick<ComparisonStock, 'currentShares'>, price?: ComparisonPrice): number | undefined {
  const shares = stock.currentShares;
  const cap = price?.marketCap;
  if (!shares || !Number.isSafeInteger(shares) || shares <= 0 || !cap || !Number.isFinite(cap) || cap <= 0) return undefined;
  const value = cap / shares;
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function comparisonUnavailableReason(stock: Pick<ComparisonStock, 'market' | 'currentShares'>, price?: ComparisonPrice): string {
  if (!price?.marketCap || !Number.isFinite(price.marketCap) || price.marketCap <= 0) {
    return stock.market === 'US'
      ? '미국 거래일 기준의 당시 자료가 제공되지 않아 환산할 수 없습니다.'
      : '당시 시가총액 또는 가격·상장주식 수 자료가 없어 환산할 수 없습니다.';
  }
  return '현재 상장주식 수 자료가 없어 환산할 수 없습니다.';
}

export function historicalMarketCap(result: any, market: 'KR' | 'US', priceDate: string): number | undefined {
  // 미국 스캔 날짜는 한국 수집일이다. 미국 거래일 필드가 없으므로 같은 날짜의
  // 시총으로 연결하면 다른 거래일의 가격을 비교하게 된다.
  if (market === 'US') return undefined;
  if (result?.success !== true || !Array.isArray(result.data)) return undefined;
  const row = result.data.find((item: any) => typeof item?.scan_date === 'string' && item.scan_date.replaceAll('-', '') === priceDate);
  const cap = Number(row?.market_cap) * 100_000_000;
  if (Number.isFinite(cap) && cap > 0) return cap;
  // last_price와 lstn_stcn은 같은 스캔에서 받은 원가격·상장주식수다.
  // 차트의 수정주가나 현재 상장주식수로 대체하면 이중 보정될 수 있다.
  const shares = Number(row?.lstn_stcn);
  const price = Number(row?.last_price);
  if (!Number.isSafeInteger(shares) || shares <= 0 || !Number.isFinite(price) || price <= 0) return undefined;
  const reconstructed = price * shares;
  return Number.isFinite(reconstructed) && reconstructed > 0 ? reconstructed : undefined;
}
