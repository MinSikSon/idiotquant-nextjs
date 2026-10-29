import assert from 'node:assert/strict';
import test from 'node:test';
import { comparisonPrice, historicalMarketCap } from '../lib/features/compare/pricing.ts';
import { calculatePriceReturns } from '../app/(compare)/compare/priceReturns.ts';

for (const [name, shares, oldPrice, newPrice] of [
  ['분할', 1000, 1000, 100], ['병합', 10, 10, 100],
] as const) {
  test(`${name} 전후 시총이 같으면 환산가와 변화율이 같다`, () => {
    const stock = { currentShares: shares };
    const before = { price: oldPrice, marketCap: shares * newPrice, priceDate: '20261001' };
    const after = { price: newPrice, marketCap: shares * newPrice, priceDate: '20261002' };
    assert.equal(comparisonPrice(stock, before), newPrice);
    const returns = calculatePriceReturns([before, after].map((price, i) => ({
      id: String(i), ticker: 'TEST', market: 'US', priceDate: price.priceDate, price: comparisonPrice(stock, price),
    })));
    assert.equal(returns.get('1')?.percent, 0);
  });
}

test('실제 거래일의 시총만 사용하고 국내 억원을 원으로 변환한다', () => {
  const history = { success: true, data: [
    { scan_date: '2026-10-08', market_cap: 10 }, { scan_date: '2026-10-09', market_cap: 12 },
  ] };
  assert.equal(historicalMarketCap(history, 'KR', '20261009'), 1_200_000_000);
  // 미국 수집일은 한국 날짜이므로 같은 날짜의 미국 거래일로 취급하지 않는다.
  assert.equal(historicalMarketCap(history, 'US', '20261009'), undefined);
  assert.equal(historicalMarketCap(history, 'KR', '20261010'), undefined);
  assert.equal(historicalMarketCap({ ...history, success: false }, 'KR', '20261009'), undefined);
});

test('시총이나 현재 주식 수가 없거나 잘못되면 종가로 환산가를 추정하지 않는다', () => {
  for (const shares of [undefined, 0, -1, 1.5, Infinity, NaN]) {
    assert.equal(comparisonPrice({ currentShares: shares }, { price: 100, marketCap: 1000 }), undefined);
  }
  for (const cap of [undefined, 0, -1, Infinity, NaN]) {
    assert.equal(comparisonPrice({ currentShares: 10 }, { price: 100, marketCap: cap }), undefined);
  }
  assert.equal(comparisonPrice({ currentShares: 10 }), undefined);
});

for (const [name, beforePrice, beforeShares, currentShares] of [
  ['10대1 분할', 1000, 100, 1000],
  ['10대1 병합', 10, 100, 10],
] as const) {
  test(`${name}: 저장 시총이 없으면 당시 원가격과 당시 상장주식수로 역산한다`, () => {
    const history = { success: true, data: [{
      scan_date: '2026-10-01', market_cap: null, last_price: String(beforePrice), lstn_stcn: String(beforeShares),
    }] };
    const cap = historicalMarketCap(history, 'KR', '20261001');
    assert.equal(cap, beforePrice * beforeShares);
    assert.equal(comparisonPrice({ currentShares }, { price: 999, marketCap: cap }), 100);
    assert.equal(historicalMarketCap(history, 'KR', '20261002'), undefined);
  });
}

test('저장된 시총을 우선하고 역산은 유효한 당시 가격·주식수가 모두 있을 때만 한다', () => {
  const history = (row: object) => ({ success: true, data: [{ scan_date: '20261001', ...row }] });
  assert.equal(historicalMarketCap(history({ market_cap: 10, last_price: 1, lstn_stcn: 1 }), 'KR', '20261001'), 1_000_000_000);
  for (const row of [
    { last_price: 100 }, { lstn_stcn: 100 },
    { last_price: 100, lstn_stcn: 0 }, { last_price: 100, lstn_stcn: 1.5 },
    { last_price: 0, lstn_stcn: 100 }, { last_price: Infinity, lstn_stcn: 100 },
    { last_price: Number.MAX_VALUE, lstn_stcn: 2 },
  ]) {
    assert.equal(historicalMarketCap(history(row), 'KR', '20261001'), undefined);
  }
});
