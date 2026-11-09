import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchHistoricalMarketCap } from '../lib/server/historicalMarketCap.ts';
import { GET } from '../app/(api)/api/public/compare/market-cap/route.ts';
import { readComparisonSnapshot, serializeComparison } from '../lib/features/compare/storage.ts';

const kr = (item: unknown, code = '00') => ({ response: { header: { resultCode: code }, body: { items: { item } } } });
const mock = (data: unknown): typeof fetch => async () => Response.json(data);

test('국내 외부 시총은 원 단위로 받고 정확한 종목·거래일을 대조한다', async () => {
  const result = await fetchHistoricalMarketCap('005930', 'KR', '2024-10-02', { dataGoKr: 'secret+/=' }, async input => {
    const url = new URL(String(input));
    assert.equal(url.pathname, '/1160100/GetStockSecuritiesInfoService_V2/getStockPriceInfo_V2');
    assert.equal(url.searchParams.get('serviceKey'), 'secret+/=');
    assert.equal(url.searchParams.get('basDt'), '20241002');
    assert.equal(url.searchParams.get('likeSrtnCd'), '005930');
    return Response.json(kr([
      { basDt: '20241001', srtnCd: '005930', mrktTotAmt: '999' },
      { basDt: '20241002', srtnCd: '005935', mrktTotAmt: '888' },
      { basDt: '20241002', srtnCd: '005930', mrktTotAmt: '360000000000000' },
    ]));
  });
  assert.deepEqual(result, { marketCap: 360_000_000_000_000, marketCapSource: 'data-go-kr' });
});

test('국내 외부 시총이 비었으면 같은 행의 당시 종가·주식수로 보정한다', async () => {
  const row = { basDt: '20241002', srtnCd: '005930', clpr: '60000', lstgStCnt: '1000' };
  assert.equal((await fetchHistoricalMarketCap('005930', 'KR', '2024-10-02', { dataGoKr: 'key' }, mock(kr(row)))).marketCap, 60_000_000);
  for (const lstgStCnt of ['0', '-1', '1.5', 'NaN']) {
    assert.equal((await fetchHistoricalMarketCap('005930', 'KR', '2024-10-02', { dataGoKr: 'key' }, mock(kr({ ...row, lstgStCnt })))).marketCap, undefined);
  }
});

test('미국 종목은 키 설정과 외부 호출 없이 종가 비교를 유지한다', async () => {
  const result = await fetchHistoricalMarketCap('AAPL', 'US', '2024-10-02', {}, async () => { throw new Error('must not fetch'); });
  assert.deepEqual(result, {});
});

test('미설정·권한 오류·비 JSON·네트워크 실패는 환산값 대신 사유를 반환한다', async () => {
  const absent = await fetchHistoricalMarketCap('005930', 'KR', '2024-10-02', {}, async () => { throw new Error('must not fetch'); });
  assert.match(absent.marketCapError!, /설정/);
  for (const request of [
    async () => new Response('denied', { status: 403 }),
    async () => new Response('<html>error</html>'),
    async () => { throw new Error('secret key'); },
    mock({ 'Error Message': 'Premium endpoint' }),
  ]) {
    const result = await fetchHistoricalMarketCap('005930', 'KR', '2024-10-02', { dataGoKr: 'key' }, request);
    assert.equal(result.marketCap, undefined);
    assert.ok(result.marketCapError);
    assert.ok(!result.marketCapError.includes('secret'));
  }
  assert.equal((await fetchHistoricalMarketCap('005930', 'KR', '2024-10-02', { dataGoKr: 'key' }, mock(kr({ mrktTotAmt: 100 }, '30')))).marketCap, undefined);
});

test('공개 라우트는 잘못된 날짜·종목·시장을 외부 조회 전에 거절한다', async () => {
  for (const query of [
    'ticker=005930&market=KR&date=2024-02-30',
    'ticker=AAPL&market=XX&date=2024-10-02',
    'ticker=../secret&market=US&date=2024-10-02',
    'ticker=AAPL&market=US&date=2999-10-02',
  ]) assert.equal((await GET(new Request(`http://localhost/api/public/compare/market-cap?${query}`))).status, 400);
});

test('외부 시총 출처와 실패 사유는 비교 저장본에서 복원된다', () => {
  const prices = { '2024-10-02': { price: 100, priceDate: '20241002', marketCap: 1000, marketCapSource: 'data-go-kr' as const, marketCapError: '조회 사유' } };
  const saved = serializeComparison({ dates: ['2024-10-02'], dateInput: '', query: '', stocks: [{ id: 'a', ticker: 'AAPL', name: 'Apple', market: 'US', currency: '$', prices }] });
  assert.deepEqual(readComparisonSnapshot(saved)!.stocks[0].prices, prices);
});
