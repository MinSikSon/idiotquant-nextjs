import { fetchHistoricalMarketCap } from '@/lib/server/historicalMarketCap';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ticker = params.get('ticker') ?? '';
  const market = params.get('market');
  const date = params.get('date') ?? '';
  if ((market !== 'KR' && market !== 'US') ||
    !(market === 'KR' ? /^\d{6}$/ : /^[A-Z][A-Z0-9.-]{0,5}$/).test(ticker) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date || date > new Date().toISOString().slice(0, 10)) {
    return Response.json({ marketCapError: '종목과 거래일을 확인해 주세요.' }, { status: 400 });
  }
  const result = await fetchHistoricalMarketCap(ticker, market, date, {
    dataGoKr: process.env.DATA_GO_KR_SERVICE_KEY,
  });
  return Response.json(result, {
    headers: { 'Cache-Control': result.marketCap ? 'public, s-maxage=86400' : 'no-store' },
  });
}
