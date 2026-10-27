import test from 'node:test';
import assert from 'node:assert/strict';
import { annualKrIncomeRows, annualUsReport, usReportPeriodLabel } from '../lib/utils/financialPeriods.ts';
import { calculateKrNcavValue, calculateKrMultipliers, calculateUsNcavValue, calculateUsMultipliers } from '../lib/utils/financeCalc.ts';
import { buildUsBars } from '../app/(search)/search/components/financialBarsData.ts';

test('국장 NCAV는 최신 분기 잔액, PER 평가는 별도 연간 순이익을 사용한다', () => {
    const bs = { output: [
        { stac_yymm: '202512', cras: 500, total_lblt: 100 },
        { stac_yymm: '202606', cras: 200, total_lblt: 50 },
    ] };
    const income = { frequency: 'quarterly', output: [{ stac_yymm: '202606', thtr_ntin: 2 }],
        annualOutput: [{ stac_yymm: '202512', thtr_ntin: 10 }] };
    const quote = { output1: { lstn_stcn: 1e8, stck_prpr: 100 } };
    assert.equal(calculateKrNcavValue(bs, quote), 150);
    assert.equal(calculateKrMultipliers(bs, income, quote).rows[0].targetPrice, 80);
    assert.deepEqual(annualKrIncomeRows({ ...income, annualOutput: [] }), []);
    assert.deepEqual(annualKrIncomeRows({ frequency: 'quarterly', output: income.output }), []);
});

test('미장 NEON의 최신 분기 NCAV와 연간 이익 기반 평가를 분리한다', () => {
    const entry = (concept: string, value: number) => ({ concept, value });
    const annual = { form: '10-K', endDate: '2025-12-31', report: {
        bs: [entry('AssetsCurrent', 30e6), entry('Liabilities', 3e6)],
        ic: [entry('NetIncomeLoss', 16_782_922)], cf: [],
    } };
    const quarter = { form: '10-Q', startDate: '2026-01-01', endDate: '2026-06-30', report: {
        bs: [entry('AssetsCurrent', 22.376e6), entry('Liabilities', 2.874e6)],
        ic: [entry('NetIncomeLoss', -2e6)], cf: [],
    } };
    const financial = { data: [annual, quarter], annualData: [annual] };
    const quote = { output: { shar: 16_782_922, last: 0.7 } };
    assert.equal(calculateUsNcavValue(financial as any, quote), '1.16');
    const valuation = calculateUsMultipliers(financial as any, quote);
    assert.notEqual(typeof valuation, 'string');
    if (typeof valuation !== 'string') assert.equal(valuation.rows[0].targetPrice, 15);
    assert.equal(annualUsReport(financial)?.endDate, '2025-12-31');
    assert.equal(annualUsReport({ data: [quarter], annualData: [] }), undefined);
    const bars = buildUsBars(financial.data);
    assert.equal(bars.bs?.groups[0].items.find(item => item.label === '유동자산 합계')?.values[0], 22.376e6);
    assert.equal(bars.bs?.periods[0], '2026-06-30 · 분기 공시');
    assert.equal(usReportPeriodLabel(annual), '2025-12-31 · 연간');
});
