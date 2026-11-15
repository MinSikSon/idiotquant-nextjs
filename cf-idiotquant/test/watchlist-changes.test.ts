import assert from 'node:assert/strict';
import test from 'node:test';
import { watchChanges, watchSnapshot, watchChangeLabel, scanDateLabel, type WatchSnapshot } from '../lib/features/stockLikes/changes.ts';

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
});


test('국내·미국의 같은 티커는 서로 다른 종목으로 비교한다', () => {
    const kr = { ...before, market: 'KR' as const };
    const us = { ...before, market: 'US' as const, price: 100 };
    const result = watchChanges([kr, us], [kr, { ...us, price: 110 }]);
    assert.equal(result.length, 1);
    assert.equal(result[0].before.price, 100);
    assert.equal(result[0].after.market, 'US');
});

test('스캔 날짜 형식과 결측 지표를 정규화하고 변화 요약에 실제 변경 지표를 보여준다', () => {
    const [snapshot] = watchSnapshot([{ ticker: before.ticker, stock_name: before.name, is_us: 1, scan_date: '2026-11-15', strategies: [], last_price: NaN, per: 0, pbr: null, ncav_ratio: 1 }]);
    assert.equal(snapshot.scanDate, '20261115');
    assert.equal(snapshot.market, 'US');
    assert.equal(snapshot.price, null);
    assert.equal(snapshot.per, 0);
    assert.equal(scanDateLabel('2026-11-15'), '2026.11.15');
    const [change] = watchChanges([before], [{ ...before, price: 66000, per: 11 }]);
    assert.equal(watchChangeLabel(change), '가격 +10.00% · PER');
});
