import { apiRequest } from '@/lib/features/apiRequest';

export function marketCapPrice(marketCap: unknown, currentShares: unknown): number | undefined {
  const cap = Number(marketCap), shares = Number(currentShares);
  if (!Number.isFinite(cap) || cap <= 0 || !Number.isSafeInteger(shares) || shares <= 0) return undefined;
  const price = cap / shares;
  return Number.isFinite(price) && price > 0 ? price : undefined;
}

export function scanMarketCap(rows: Record<string, unknown>[], ticker: string, market: 'KR' | 'US', date: string): number | undefined {
  const row = rows.find(row => row.ticker === ticker && String(row.scan_date).replaceAll('-', '') === date);
  const cap = Number(row?.market_cap);
  // 국내 스캔은 KIS hts_avls의 억원 단위, 미국 스캔은 달러 단위다.
  const value = cap * (market === 'KR' ? 100_000_000 : 1);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function legacyMarketCap(data: Record<string, any>, ticker: string, name: string, date: string): number | undefined {
  if (String(data?.date).replaceAll('-', '') !== date) return undefined;
  const row = data?.data?.[ticker] ?? data?.data?.[name];
  const cap = Number(row?.['시가총액']); // 저장된 과거 시장 데이터는 원 단위다.
  return Number.isFinite(cap) && cap > 0 ? cap : undefined;
}

// 같은 날짜·종목을 반복 추가해도 불필요한 전체 목록 조회를 줄인다. 실패 응답은 캐시하지 않는다.
const requests = new Map<string, Promise<any>>();
function cached(key: string, read: () => Promise<any>) {
  const existing = requests.get(key);
  if (existing) return existing;
  const result = read().catch(error => { requests.delete(key); throw error; });
  if (requests.size >= 40) requests.delete(requests.keys().next().value!);
  requests.set(key, result);
  return result;
}

function scanHistory(ticker: string, market: 'KR' | 'US', date: string) {
  const path = market === 'KR'
    ? `/scan/daily/ticker/${encodeURIComponent(ticker)}?limit=200`
    : `/scan/daily?date=${date}&strategy=all&limit=2500&country=US`;
  return cached(market === 'KR' ? `KR:${ticker}` : `US:${date}`, async () => {
    const result = await apiRequest(path);
    if (result?.success !== true || !Array.isArray(result.data)) throw new Error('저장된 과거 시가총액을 조회하지 못했습니다.');
    // 미국 날짜 조회가 최신 날짜로 대체된 응답은 과거 시가총액으로 사용하지 않는다.
    if (market === 'US' && (result.meta?.country !== 'US' || String(result.meta?.scanDate).replaceAll('-', '') !== date)) return [];
    return result.data;
  });
}

function legacyDates() {
  return cached('legacy-dates', async () => {
    const response = await fetch('/api/proxy/stock/market-info-list', { credentials: 'include' });
    if (!response.ok) throw new Error('과거 시가총액 날짜 목록을 조회하지 못했습니다.');
    // 이 레거시 API는 KV에 저장한 날짜 목록을 JSON 문자열로 반환한다.
    const list = await response.json();
    return new Set((String(list).match(/marketInfo_\d{8}/g) ?? []).map(key => key.slice(11)));
  });
}

export async function getHistoricalMarketCap(ticker: string, name: string, market: 'KR' | 'US', date: string) {
  let cap: number | undefined;
  let failed = false;
  try { cap = scanMarketCap(await scanHistory(ticker, market, date), ticker, market, date); }
  catch { failed = true; /* 일간 스캔 조회 실패 시에도 같은 날짜의 시장 데이터를 확인한다. */ }
  if (cap != null) return cap;
  if (market === 'KR') {
    try {
      if ((await legacyDates()).has(date)) {
        const result = await cached(`legacy:${date}`, async () => {
          const result = await apiRequest(`/stock/market-info?date=${date}`);
          if (result?.success === false || !result?.data || String(result.date).replaceAll('-', '') !== date) throw new Error('과거 시장 데이터를 조회하지 못했습니다.');
          return result;
        });
        cap = legacyMarketCap(result, ticker, name, date);
        if (cap != null) return cap;
      }
    } catch { failed = true; }
  }
  if (failed) throw new Error('과거 시가총액 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  throw new Error('이 거래일의 과거 시가총액을 확보하지 못해 환산가를 계산할 수 없습니다.');
}
