import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePriceReturns, summarizeReturns } from '../app/(compare)/compare/priceReturns.ts';

test('같은 종목의 실제 거래일을 순서대로 정렬해 첫 종가 대비 수익률을 계산한다', () => {
  const result = calculatePriceReturns([
    { id: 'later', market: 'KR', ticker: '005930', priceDate: '20261008', price: 110 },
    { id: 'other', market: 'US', ticker: 'AAPL', priceDate: '20261008', price: 200 },
    { id: 'earlier', market: 'KR', ticker: '005930', priceDate: '20261001', price: 100 },
    { id: 'missing', market: 'KR', ticker: '005930', priceDate: '20261009' },
  ]);

  assert.deepEqual(result.get('earlier'), { baselineDate: '20261001', percent: 0, baseline: true });
  assert.equal(result.get('later')?.baselineDate, '20261001');
  assert.equal(result.get('later')?.baseline, false);
  assert.ok(Math.abs(result.get('later')!.percent - 10) < 0.000001);
  assert.equal(result.has('other'), false);
  assert.equal(result.has('missing'), false);
});

test('같은 거래일만 있으면 기간 수익률을 표시하지 않는다', () => {
  const result = calculatePriceReturns([
    { id: 'a', market: 'US', ticker: 'AAPL', priceDate: '20261009', price: 100 },
    { id: 'b', market: 'US', ticker: 'AAPL', priceDate: '20261009', price: 100 },
  ]);
  assert.equal(result.size, 0);
});

test('하락한 종목은 음수 수익률로 표시한다', () => {
  const result = calculatePriceReturns([
    { id: 'start', market: 'US', ticker: 'AAPL', priceDate: '20261001', price: 100 },
    { id: 'end', market: 'US', ticker: 'AAPL', priceDate: '20261009', price: 80 },
  ]);
  assert.ok(Math.abs(result.get('end')!.percent + 20) < 0.000001);
});

test('유효한 종목의 수익률만 평균·중앙값·상승 수로 집계한다', () => {
  assert.deepEqual(summarizeReturns([10, -5, 0, Number.NaN, 30]), {
    count: 4, average: 8.75, median: 5, positiveCount: 2,
  });
  assert.equal(summarizeReturns([Number.NaN]), null);
});
