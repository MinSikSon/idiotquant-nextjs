import assert from 'node:assert/strict';
import test from 'node:test';
import { isComparisonDate, localToday } from '../lib/features/compare/dates.ts';

test('오늘과 과거의 실제 날짜만 비교에 허용한다', () => {
    for (const date of ['2026-11-04', '2026-11-03', '2024-02-29', '2000-02-29']) {
        assert.equal(isComparisonDate(date, '2026-11-04'), true, date);
    }
    for (const date of ['2026-11-05', '2027-01-01', '2026-02-29', '2026-02-30', '1900-02-29', '2026-13-01', '2026-00-10', '2026-11-00', '2026-11-31', '0000-01-01', '2026-1-01', '20261104', '', null, undefined]) {
        assert.equal(isComparisonDate(date, '2026-11-04'), false, String(date));
    }
});

test('자정 전후에는 사용자의 로컬 날짜로 미래 여부를 판단한다', () => {
    const before = new Date(2026, 10, 4, 23, 59, 59);
    const after = new Date(2026, 10, 5, 0, 0, 0);
    assert.equal(localToday(before), '2026-11-04');
    assert.equal(localToday(after), '2026-11-05');
    assert.equal(isComparisonDate('2026-11-05', localToday(before)), false);
    assert.equal(isComparisonDate('2026-11-05', localToday(after)), true);
});
