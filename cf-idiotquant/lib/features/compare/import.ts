import type { ComparisonStock } from './compareSlice';

export function comparisonImportSource(market: 'KR' | 'US', date: string, tickers: string[], request: string | null) {
  return JSON.stringify([market, date, tickers, request]);
}

export function planComparisonImport(stocks: Pick<ComparisonStock, 'market' | 'ticker'>[], tickers: string[], market: 'KR' | 'US', limit: number) {
  const selected = [...new Set(tickers)].slice(0, limit);
  const added = selected.filter(ticker => !stocks.some(stock => stock.market === market && stock.ticker === ticker));
  return { selected, added, exceedsLimit: stocks.length + added.length > limit };
}

export function startImportCountdown(onTick: (seconds: number) => void, onConfirm: () => void) {
  let remaining = 5;
  const timer = setInterval(() => {
    remaining--;
    onTick(remaining);
    if (remaining === 0) {
      clearInterval(timer);
      onConfirm();
    }
  }, 1000);
  return () => clearInterval(timer);
}
