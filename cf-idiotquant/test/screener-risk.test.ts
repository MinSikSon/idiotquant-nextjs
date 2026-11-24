import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenerRisks } from '@/app/(screener)/screener/risk';
import { applyFilters, GROUP_DEFAULTS, type ScreenerFilters } from '@/app/(screener)/screener/filters';

const annual = (values: unknown[], years = [2025, 2024, 2023]) => values.map((value, i) => ({ fiscal_year: years[i], value }));
const us = (over = {}) => ({ country: 'US', scan_date: '20261117', market_cap: 100_000_000, ...over });

test('중국 소재 소형주: 상장 시장과 본사 소재지를 구별하고 ADR·이름을 근거로 삼지 않는다', () => {
    assert.equal(screenerRisks(us({ headquarters_country: 'CN' })).chinaSmall, true);
    assert.equal(screenerRisks(us({ headquarters_country: 'CN', market_cap: 300_000_000 })).chinaSmall, false);
    assert.equal(screenerRisks(us({ headquarters_country: 'US', name: 'China ADR' })).chinaSmall, false);
    assert.equal(screenerRisks(us({ name: 'China ADR' })).chinaSmall, null);
    assert.equal(screenerRisks(us({ headquarters_country: 'CN', market_cap: null })).chinaSmall, null);
    assert.equal(screenerRisks({ headquarters_country: 'CN' }, 'KR').chinaSmall, false);
});

test('저유동성: 시장별 단위, 0, 경계값, 미수집을 구별한다', () => {
    for (const [country, limit] of [['KR', 300_000_000], ['US', 100_000]] as const) {
        assert.equal(screenerRisks({ country, acml_tr_pbmn: 0 }).lowLiquidity, true);
        assert.equal(screenerRisks({ country, acml_tr_pbmn: limit - 1 }).lowLiquidity, true);
        assert.equal(screenerRisks({ country, acml_tr_pbmn: limit }).lowLiquidity, false);
        for (const value of [null, undefined, '', ' ', -1, 'NaN']) {
            assert.equal(screenerRisks({ country, acml_tr_pbmn: value }).lowLiquidity, null);
        }
    }
});

test('지속 소진: 최근 3개 연도 연속 음수만 판별하고 누락·중복·오래된 자료는 미확인이다', () => {
    const check = (history: unknown) => screenerRisks(us({ operating_cash_flow_history: history })).cashBurn;
    assert.equal(check(annual([-1, -2, -3])), true);
    assert.equal(check(annual([-1, 0, -3])), false);
    assert.equal(check(annual([-1, 2, -3])), false);
    for (const history of [[], annual([-1, null, -3]), annual([-1, '', -3]), annual([-1, -2, -3], [2025, 2025, 2023]), annual([-1, -2, -3], [2025, 2023, 2022]), annual([-1, -2, -3], [2022, 2021, 2020])]) {
        assert.equal(check(history), null);
    }
});

test('위험 제외는 확인된 대상만 제거하고 미확인과 해제 상태를 보존한다', () => {
    const filters = { ...Object.assign({}, ...Object.values(GROUP_DEFAULTS)), country: 'US', strategies: new Set(), q: '' } as ScreenerFilters;
    const unknown = us({ ticker: 'UNKNOWN' });
    const china = us({ ticker: 'CN', headquarters_country: 'CN' });
    const liquid = us({ ticker: 'LIQ', acml_tr_pbmn: 1_000_000 });
    const illiquid = us({ ticker: 'LOW', acml_tr_pbmn: 0 });
    const burn = us({ ticker: 'BURN', operating_cash_flow_history: annual([-1, -2, -3]) });
    const list = [unknown, china, liquid, illiquid, burn];
    assert.deepEqual(applyFilters(list, filters), list);
    assert.deepEqual(applyFilters(list, { ...filters, excludeChinaSmall: true }), [unknown, liquid, illiquid, burn]);
    assert.deepEqual(applyFilters(list, { ...filters, excludeLowLiquidity: true }), [unknown, china, liquid, burn]);
    assert.deepEqual(applyFilters(list, { ...filters, excludeCashBurn: true }), [unknown, china, liquid, illiquid]);
    assert.deepEqual(applyFilters(list, { ...filters, excludeChinaSmall: true, excludeLowLiquidity: true, excludeCashBurn: true }), [unknown, liquid]);
});
