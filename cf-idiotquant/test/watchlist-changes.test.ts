import assert from 'node:assert/strict';
import test from 'node:test';
import { readWatchSnapshot, watchChanges, type WatchSnapshot } from '../lib/features/stockLikes/changes.ts';

const before: WatchSnapshot = { ticker: '005930', name: '삼성전자', scanDate: '20261020', strategies: ['ncav'], price: 60000, pbr: 1, per: 10, ncav: 1.2 };

test('동일 관심종목의 전략 편입·이탈 및 지표 변화를 계산한다', () => {
    const after = { ...before, scanDate: '20261022', strategies: ['low_pbr'], price: 66000, pbr: 1.1 };
    const [change] = watchChanges([before], [after]);
    assert.deepEqual(change.entered, ['low_pbr']);
    assert.deepEqual(change.exited, ['ncav']);
    assert.ok(Math.abs(change.pricePercent! - 10) < 1e-8);
    assert.equal(watchChanges([before], [before]).length, 0);
});

test('첫 조회·새 관심종목·과거 기준 데이터·결측값은 변동으로 오인하지 않는다', () => {
    assert.deepEqual(watchChanges([], [before]), []);
    assert.deepEqual(watchChanges([before], [{ ...before, ticker: '000660' }]), []);
    assert.deepEqual(watchChanges([before], [{ ...before, scanDate: '20261019', price: 70000 }]), []);
    assert.deepEqual(watchChanges([before], [{ ...before, price: null, pbr: null }]), []);
    assert.deepEqual(readWatchSnapshot('{bad'), []);
    assert.deepEqual(readWatchSnapshot(JSON.stringify({ version: 1, items: [null] })), []);
});
