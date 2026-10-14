import assert from 'node:assert/strict';
import test from 'node:test';
import { marketCapPrice, scanMarketCap, legacyMarketCap, getHistoricalMarketCap } from '../app/(compare)/compare/marketCapitalization.ts';
import { calculatePriceReturns } from '../app/(compare)/compare/priceReturns.ts';

function normalizedReturns(caps: number[], currentShares: number) {
  return calculatePriceReturns(caps.map((cap, index) => ({
    id: String(index), ticker: 'TEST', market: 'KR', priceDate: `2026100${index + 1}`,
    price: marketCapPrice(cap, currentShares),
  })));
}

test('10대1 액면분할에서 기업 시가총액이 같으면 -90%의 가짜 하락이 생기지 않는다', () => {
  const result = normalizedReturns([1_000_000, 1_000_000], 100_000);
  assert.equal(marketCapPrice(1_000_000, 100_000), 10);
  assert.equal(result.get('1')?.percent, 0);
});

test('10대1 주식병합에서 기업 시가총액이 같으면 +900%의 가짜 상승이 생기지 않는다', () => {
  assert.equal(marketCapPrice(1_000_000, 1_000), 1000);
  assert.equal(normalizedReturns([1_000_000, 1_000_000], 1_000).get('1')?.percent, 0);
});

test('기준 주식 수를 새로 조회하면 모든 날짜의 가격이 바뀌되 시가총액 변화율은 같다', () => {
  assert.equal(marketCapPrice(1_000_000, 10_000), 100);
  assert.equal(marketCapPrice(1_000_000, 20_000), 50);
  const before = normalizedReturns([1_000_000, 1_200_000], 10_000).get('1')!.percent;
  const after = normalizedReturns([1_000_000, 1_200_000], 20_000).get('1')!.percent;
  assert.ok(Math.abs(before - 20) < 1e-9); assert.equal(before, after);
});

test('시가총액·현재 주식 수 결측과 0·음수·무한대·소수 주식 수는 원주가로 대신하지 않는다', () => {
  for (const cap of [undefined, null, '', 0, -1, Infinity, NaN]) assert.equal(marketCapPrice(cap, 100), undefined);
  for (const shares of [undefined, null, '', 0, -1, Infinity, NaN, 1.5]) assert.equal(marketCapPrice(1_000_000, shares), undefined);
  assert.equal(marketCapPrice('1000000', '100'), 10000);
  assert.equal(calculatePriceReturns([{ id: 'bad', ticker: 'TEST', market: 'KR', priceDate: '20261001', price: Infinity }]).size, 0);
});

test('국내 스캔의 억원과 미국 스캔의 달러를 구분하며 요청 날짜와 종목이 같은 값만 사용한다', () => {
  const rows = [{ ticker: 'TEST', scan_date: '2026-10-01', market_cap: 10 }, { ticker: 'OTHER', scan_date: '20261001', market_cap: 999 }];
  assert.equal(scanMarketCap(rows, 'TEST', 'KR', '20261001'), 1_000_000_000);
  assert.equal(scanMarketCap(rows, 'TEST', 'US', '20261001'), 10);
  assert.equal(scanMarketCap(rows, 'TEST', 'KR', '20261002'), undefined);
  assert.equal(scanMarketCap(rows, 'MISSING', 'KR', '20261001'), undefined);
});

test('저장된 과거 시장 데이터의 원 단위 시가총액을 현재 주식 수로 환산한다', () => {
  const data = { date: '20181214', data: { 삼성전자: { 시가총액: '232523030322500', 상장주식수: '5969782550', 종가: '38950' } } };
  const cap = legacyMarketCap(data, '005930', '삼성전자', '20181214');
  assert.equal(cap, 232523030322500);
  assert.equal(Number(marketCapPrice(cap, 5846278608)!.toFixed(2)), 39772.83);
  assert.equal(legacyMarketCap(data, '005930', '삼성전자', '20181215'), undefined);
  assert.equal(legacyMarketCap(data, '000000', '다른회사', '20181214'), undefined);
});

test('미국 시가총액이 최신 날짜로 대체되면 가격을 만들지 않는다', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: [{ ticker: 'TEST-US', scan_date: '20261014', market_cap: 1_000_000 }], meta: { country: 'US', scanDate: '20261014' } }));
  await assert.rejects(getHistoricalMarketCap('TEST-US', 'TEST-US', 'US', '20200101'), /확보하지 못해/);
});

test('해당 종목의 일간 스캔만 조회하여 KR 시가총액 단위를 변환한다', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    paths.push(String(input));
    return new Response(JSON.stringify({ success: true, data: [{ ticker: 'TEST-KR', scan_date: '20261001', market_cap: 12.5 }] }));
  };
  assert.equal(await getHistoricalMarketCap('TEST-KR', 'TEST-KR', 'KR', '20261001'), 1_250_000_000);
  assert.equal(paths.length, 1); assert.ok(paths[0].includes('/scan/daily/ticker/TEST-KR'));
});

test('일간 자료에 없는 오래된 날짜는 검증된 레거시 날짜의 자료만 조회한다', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (input) => {
    const path = String(input);
    if (path.includes('/scan/')) return new Response(JSON.stringify({ success: true, data: [] }));
    if (path.endsWith('/market-info-list')) return new Response(JSON.stringify('["marketInfo_20170103"]'));
    return new Response(JSON.stringify({ date: '20170103', data: { '과거회사': { 시가총액: 100_000_000 } } }));
  };
  assert.equal(await getHistoricalMarketCap('HISTORICAL', '과거회사', 'KR', '20170103'), 100_000_000);
  await assert.rejects(getHistoricalMarketCap('HISTORICAL', '과거회사', 'KR', '20170104'), /확보하지 못해/);
});
