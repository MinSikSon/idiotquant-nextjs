import test from 'node:test';
import assert from 'node:assert/strict';
import { historicalPrice } from '../app/(compare)/compare/historicalPrice.ts';

test('국내 종가는 시총이나 현재 주식 수 없이 표시한다', () => {
  assert.deepEqual(historicalPrice({ rt_cd: '0', output2: [{ stck_bsop_date: '20191213', stck_clpr: '54700' }] }, 'KR', '20191213'), { price: 54700, priceDate: '20191213' });
});

test('휴장일은 정렬과 관계없이 선택일 이전의 최근 거래일을 사용한다', () => {
  assert.deepEqual(historicalPrice({ rt_cd: '0', output2: [
    { xymd: '20191216', clos: '279.86' },
    { xymd: '20191212', clos: '271.46' },
    { xymd: '20191213', clos: '275.15' },
    { clos: '999' },
  ] }, 'US', '20191215'), { price: 275.15, priceDate: '20191213' });
});

test('실패 응답이나 유효하지 않은 종가를 현재가로 대체하지 않는다', () => {
  assert.throws(() => historicalPrice({ rt_cd: '1', output2: [] }, 'KR', '20191213'));
  for (const price of ['', '0', '-1', 'NaN', 'Infinity']) {
    assert.throws(() => historicalPrice({ rt_cd: '0', output1: { stck_prpr: '200000' }, output2: [{ stck_bsop_date: '20191213', stck_clpr: price }] }, 'KR', '20191213'));
  }
  assert.throws(() => historicalPrice({ rt_cd: '0', output2: [{ xymd: '20191216', clos: '100' }] }, 'US', '20191213'));
});
