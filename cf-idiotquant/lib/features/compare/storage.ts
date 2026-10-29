import type { ComparisonPrice, ComparisonStock } from './compareSlice';

export const COMPARISON_STORAGE_KEY = 'idiotquant:compare:workspace:v1';
export type ComparisonSnapshot = { dates: string[]; stocks: ComparisonStock[]; dateInput: string; query: string };
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const numeric = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function readComparisonSnapshot(raw: string | null): ComparisonSnapshot | null {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value?.version !== 1 || !Array.isArray(value.dates) || !Array.isArray(value.stocks)) return null;
    const dates = [...new Set(value.dates.filter(validDate))].slice(0, 10) as string[];
    const stocks: ComparisonStock[] = [];
    for (const item of value.stocks.slice(0, 20)) {
      if (!item || (item.market !== 'KR' && item.market !== 'US') || typeof item.ticker !== 'string'
        || typeof item.id !== 'string' || typeof item.name !== 'string' || !item.prices || typeof item.prices !== 'object') continue;
      if (!(item.market === 'KR' ? /^\d{6}$/ : /^[A-Z][A-Z0-9.-]{0,5}$/).test(item.ticker)) continue;
      if (stocks.some(stock => stock.market === item.market && stock.ticker === item.ticker)) continue;
      const stock: ComparisonStock = {
        id: item.id.slice(0, 100), ticker: item.ticker, name: item.name.slice(0, 100), market: item.market,
        currency: item.market === 'KR' ? '₩' : '$', prices: {},
      };
      for (const field of ['per', 'pbr', 'eps', 'bps', 'roe', 'currentShares'] as const) {
        if (numeric(item[field])) stock[field] = item[field];
      }
      for (const date of dates) {
        const price = item.prices[date];
        const clean: ComparisonPrice = {};
        if (numeric(price?.price) && price.price >= 0) clean.price = price.price;
        if (numeric(price?.marketCap) && price.marketCap > 0) clean.marketCap = price.marketCap;
        if (typeof price?.priceDate === 'string' && /^\d{8}$/.test(price.priceDate)) clean.priceDate = price.priceDate;
        if (typeof price?.error === 'string') clean.error = price.error.slice(0, 200);
        if (price?.loading) clean.error = '조회가 중단되었습니다. 날짜를 다시 추가해 주세요.';
        stock.prices[date] = clean;
      }
      stocks.push(stock);
    }
    return { dates, stocks, dateInput: validDate(value.dateInput) ? value.dateInput : '', query: typeof value.query === 'string' ? value.query.slice(0, 100) : '' };
  } catch { return null; }
}

export function serializeComparison(snapshot: ComparisonSnapshot): string {
  return JSON.stringify({ version: 1, ...snapshot });
}
