import assert from 'node:assert/strict';
import test from 'node:test';
import { readComparisonSnapshot, serializeComparison } from '../lib/features/compare/storage.ts';
import { compareSlice, restoreComparison } from '../lib/features/compare/compareSlice.ts';

test('새 세션에서 날짜·조회값을 복원하고 중단된 조회는 로딩으로 남기지 않는다', () => {
    const raw = serializeComparison({ dates: ['2026-10-01'], dateInput: '2026-10-01', query: '삼성', stocks: [{
        id: 'KR:005930', market: 'KR', ticker: '005930', name: '삼성전자', currency: '₩', pbr: 1.2,
        prices: { '2026-10-01': { price: 60000, marketCap: 360_000_000_000_000, priceDate: '20261001', loading: true } },
    }] });
    const restored = readComparisonSnapshot(raw)!;
    const state = compareSlice.reducer(undefined, restoreComparison(restored));
    assert.deepEqual(state.dates, ['2026-10-01']);
    assert.equal(state.stocks[0].prices['2026-10-01'].price, 60000);
    assert.equal(state.stocks[0].prices['2026-10-01'].marketCap, 360_000_000_000_000);
    assert.equal(state.stocks[0].prices['2026-10-01'].loading, undefined);
    assert.equal(state.loading, false);
    assert.equal(state.dateLoading, false);
});

test('깨진 저장본·다른 버전을 거절하고 잘못된 날짜·종목을 제외한다', () => {
    assert.equal(readComparisonSnapshot('{broken'), null);
    assert.equal(readComparisonSnapshot('{"version":2}'), null);
    const restored = readComparisonSnapshot(JSON.stringify({ version: 1, dates: ['2026-02-30', '2026-10-01', '2026-10-01'], stocks: [null, { ticker: 'bad', market: 'KR' }] }))!;
    assert.deepEqual(restored.dates, ['2026-10-01']);
    assert.deepEqual(restored.stocks, []);
});


test('예전에 저장된 미래 날짜와 가격은 복원하지 않고 유효한 비교는 보존한다', () => {
    const raw = serializeComparison({ dates: ['2026-11-04', '2026-11-05', '2026-02-30'], dateInput: '2026-11-05', query: '삼성', stocks: [{
        id: 'KR:005930', market: 'KR', ticker: '005930', name: '삼성전자', currency: '₩',
        prices: { '2026-11-04': { price: 60000 }, '2026-11-05': { price: 61000 } },
    }] });
    const restored = readComparisonSnapshot(raw, '2026-11-04')!;
    assert.deepEqual(restored.dates, ['2026-11-04']);
    assert.equal(restored.dateInput, '');
    assert.equal(restored.query, '삼성');
    assert.deepEqual(restored.stocks[0].prices, { '2026-11-04': { price: 60000 } });
    assert.deepEqual(readComparisonSnapshot(raw, '2026-11-05')!.dates, ['2026-11-04', '2026-11-05']);
});
