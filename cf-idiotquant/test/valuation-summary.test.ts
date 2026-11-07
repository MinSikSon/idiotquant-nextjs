import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valuationModels } from '@/lib/utils/valuationModels';
import { valuationSummary } from '@/lib/utils/valuationSummary';
import type { ValuationResult } from '@/lib/utils/financeCalc';

const model = (type: string, targetPrice: number, returnPct = 10) => ({
    type,
    result: { rows: [{ multiplier: '기준', targetPrice, returnPct }] } as ValuationResult,
});

test('적정가 요약은 손실 기업의 수익가치 모델도 빠뜨리지 않는다', () => {
    const data = {
        kiBS: { output: [{ stac_yymm: '202512', total_cptl: '100', cras: '200', lblt: '50' }] },
        kiIS: { output: [{ stac_yymm: '202512', thtr_ntin: '-10' }] },
        kiChart: { output1: { lstn_stcn: '1000000', stck_prpr: '3855' } },
    };
    const models = valuationModels(data, false);
    const rows = valuationSummary(models);
    assert.deepEqual(rows.map(row => row.type), ['NCAV', 'PBR', 'SRIM', 'PER']);
    assert.equal(rows.length, models.length);
    for (const row of rows.filter(row => row.type === 'SRIM' || row.type === 'PER')) {
        assert.equal(row.targetPrice, null);
        assert.equal(row.returnPct, null);
        assert.match(row.notice!, /0 이하/);
    }
    assert.ok(rows.find(row => row.type === 'PBR')!.targetPrice! > 0);
});

test('유효한 가격·괴리율은 보존하고 무효한 가격은 차트 값으로 쓰지 않는다', () => {
    const rows = valuationSummary([
        model('PBR', 6506, 68.77), model('NCAV', 467, -87.89),
        model('SRIM', NaN), model('PER', Infinity), model('DCF', -100),
    ]);
    assert.equal(rows.length, 5);
    assert.deepEqual(rows[0], { type: 'PBR', targetPrice: 6506, returnPct: 68.77, notice: null });
    assert.equal(rows[1].returnPct, -87.89);
    for (const row of rows.slice(2)) {
        assert.equal(row.targetPrice, null);
        assert.equal(row.returnPct, null);
        assert.ok(row.notice);
    }
});

test('모든 모델이 계산 불가이거나 기준 행이 없어도 요약에 남는다', () => {
    const empty = model('PEG', 1);
    empty.result.rows = [];
    const rows = valuationSummary([model('SRIM', 0), empty]);
    assert.equal(rows.length, 2);
    assert.ok(rows.every(row => row.targetPrice === null && row.notice));
    assert.deepEqual(valuationSummary([]), []);
});

test('가격은 유효해도 괴리율이 무효면 퍼센트를 표시하지 않는다', () => {
    const [row] = valuationSummary([model('PBR', 6506, NaN)]);
    assert.equal(row.targetPrice, 6506);
    assert.equal(row.returnPct, null);
});
