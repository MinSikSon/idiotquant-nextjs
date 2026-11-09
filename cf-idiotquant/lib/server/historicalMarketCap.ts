export type MarketCapResult = { marketCap?: number; marketCapSource?: 'data-go-kr'; marketCapError?: string };

const positive = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

// 날짜와 종목을 모두 대조한다. 인접 거래일의 시총으로 대체하지 않는다.
export async function fetchHistoricalMarketCap(
  ticker: string, market: 'KR' | 'US', date: string,
  keys: { dataGoKr?: string }, request: typeof fetch = fetch,
): Promise<MarketCapResult> {
  if (market === 'US') return {};
  const key = keys.dataGoKr;
  if (!key) return { marketCapError: '외부 과거 시총 조회가 설정되지 않았습니다.' };
  const compact = date.replaceAll('-', '');
  const url = new URL('https://apis.data.go.kr/1160100/GetStockSecuritiesInfoService_V2/getStockPriceInfo_V2');
  url.search = new URLSearchParams({ serviceKey: key, resultType: 'json', numOfRows: '10', pageNo: '1', basDt: compact, likeSrtnCd: ticker }).toString();
  try {
    const response = await request(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!response.ok) return { marketCapError: '외부 과거 시총 조회에 실패했습니다.' };
    const data = await response.json();
    if (String(data?.response?.header?.resultCode) !== '00') return { marketCapError: '외부 과거 시총 조회에 실패했습니다.' };
    const items = data?.response?.body?.items?.item;
    const rows = Array.isArray(items) ? items : items ? [items] : [];
    const row = rows.find((item: any) => item?.basDt === compact && item?.srtnCd === ticker);
    const shares = Number(row?.lstgStCnt);
    const close = positive(row?.clpr);
    const marketCap = positive(row?.mrktTotAmt) ?? (Number.isSafeInteger(shares) && shares > 0 && close ? positive(close * shares) : undefined);
    if (marketCap) return { marketCap, marketCapSource: 'data-go-kr' };
    return { marketCapError: '해당 거래일의 외부 시가총액 자료가 없습니다.' };
  } catch {
    // 외부 응답·URL에는 인증키가 포함될 수 있으므로 그대로 노출하지 않는다.
    return { marketCapError: '외부 과거 시총 조회에 실패했습니다.' };
  }
}
