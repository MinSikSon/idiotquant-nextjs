import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSlice, restoreComparison, marketCapReceived, removeDate, removeStock, dateLoadStarted } from '../lib/features/compare/compareSlice.ts';
import { readComparisonSnapshot } from '../lib/features/compare/storage.ts';
import { comparisonPrices } from '../lib/features/compare/pricing.ts';
import { getExternalMarketCap } from '../lib/features/compare/marketCap.ts';

const date = '2025-11-08';
const priceDate = '20251107';
const saved = JSON.stringify({ version: 1, dates: [date], dateInput: '', query: '', stocks: [{
  id: 'aw', ticker: '312610', name: '에이엠더블유', market: 'KR', currency: '₩', currentShares: 20_256_888,
  prices: { [date]: { price: 1510, priceDate, marketCapError: '외부 과거 시총 조회가 설정되지 않았습니다.' } },
}] });
const restored = () => compareSlice.reducer(undefined, restoreComparison(readComparisonSnapshot(saved)!));
const update = { marketCap: 30_587_900_880, marketCapSource: 'data-go-kr' as const, marketCapError: undefined };
const action = () => marketCapReceived({ id: 'aw', date, priceDate, update });

test('배포 전 저장값·이전 키 미설정 오류를 실제 거래일의 시총으로 보완한다', async t => {
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    const url = new URL(input, 'https://idiotquant.com');
    assert.equal(url.searchParams.get('ticker'), '312610');
    assert.equal(url.searchParams.get('date'), '2025-11-07');
    return Response.json(update);
  });
  const before = restored();
  assert.equal(comparisonPrices(before.stocks[0], [date]).closing, true);
  const result = await getExternalMarketCap('312610', priceDate);
  const after = compareSlice.reducer(before, marketCapReceived({ id: 'aw', date, priceDate, update: result }));
  assert.equal(after.stocks[0].prices[date].marketCapError, undefined);
  assert.equal(after.stocks[0].prices[date].price, 1510);
  assert.equal(after.stocks[0].prices[date].priceDate, priceDate);
  assert.deepEqual(comparisonPrices(after.stocks[0], [date]), { closing: false, prices: { [date]: 1510 } });
});

test('실패해도 저장된 종가를 유지하고 실패 사유를 반영한다', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('error', { status: 503 }));
  const result = await getExternalMarketCap('312610', priceDate);
  const after = compareSlice.reducer(restored(), marketCapReceived({ id: 'aw', date, priceDate, update: result }));
  assert.equal(after.stocks[0].prices[date].price, 1510);
  assert.match(after.stocks[0].prices[date].marketCapError!, /실패/);
  assert.equal(comparisonPrices(after.stocks[0], [date]).closing, true);
});

test('날짜·종목 삭제 또는 날짜 재조회 뒤 도착한 보정값은 무시한다', () => {
  for (const change of [removeDate(date), removeStock('aw'), dateLoadStarted(date)]) {
    const state = compareSlice.reducer(restored(), change);
    assert.deepEqual(compareSlice.reducer(state, action()), state);
  }
  const state = restored();
  assert.deepEqual(compareSlice.reducer(state, marketCapReceived({ id: 'aw', date, priceDate: '20251106', update })), state);
});

test('다른 시총 조회가 먼저 완료되면 늦게 도착한 실패로 덮어쓰지 않는다', () => {
  const state = compareSlice.reducer(restored(), action());
  assert.deepEqual(compareSlice.reducer(state, marketCapReceived({ id: 'aw', date, priceDate, update: { marketCapError: '늦은 실패' } })), state);
});
