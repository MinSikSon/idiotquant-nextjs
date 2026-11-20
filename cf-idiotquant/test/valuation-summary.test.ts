import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valuationModels } from '@/lib/utils/valuationModels';
import { valuationSummary, scanValuationSummary, valuationComparisonAxis } from '@/lib/utils/valuationSummary';
import { calculateKrNcav, calculateUsNcav, type FinnhubFinancialsAsReportedType, type ValuationResult } from '@/lib/utils/financeCalc';

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

test('NAVER의 음수 NCAV를 보존하고 결측 재무정보와 구분한다', () => {
    const chart = { output1: { lstn_stcn: '152126544', stck_prpr: '161300' } };
    const balance = { stac_yymm: '202609', cras: 103593.2143691, total_lblt: 126939.49659996 };
    const summarize = (result: ValuationResult) => valuationSummary([{ type: 'NCAV', result }])[0];
    const result = calculateKrNcav({ output: [balance] }, chart);
    assert.deepEqual(result.rows.map(row => row.targetPrice), [-15347, -12789, -10231]);
    assert.deepEqual(summarize(result), { type: 'NCAV', targetPrice: -15347, returnPct: -109.51, notice: null });
    const zero = summarize(calculateKrNcav({ output: [{ ...balance, cras: balance.total_lblt }] }, chart));
    assert.equal(zero.targetPrice, 0);
    assert.equal(zero.notice, null);
    for (const incomplete of [{ ...balance, cras: '' }, { ...balance, total_lblt: undefined }]) {
        assert.equal(summarize(calculateKrNcav({ output: [incomplete] }, chart)).targetPrice, null);
    }
    assert.equal(summarize(calculateKrNcav({ output: [balance] }, {})).targetPrice, null);
});

test('미국 NCAV는 음수와 센트 단위를 보존하고 누락된 계정을 계산 불가로 표시한다', () => {
    const assets = { concept: 'us-gaap_AssetsCurrent', value: '100' };
    const liabilities = { concept: 'us-gaap_Liabilities', value: '234' };
    const run = (bs: (typeof assets)[]) => {
        const finance = { data: [{ report: { bs } }] } as FinnhubFinancialsAsReportedType;
        const result = calculateUsNcav(finance, { output: { shar: '100', last: '10' } });
        assert.notEqual(typeof result, 'string');
        return valuationSummary([{ type: 'NCAV', result: result as ValuationResult }])[0];
    };
    assert.equal(run([assets, liabilities]).targetPrice, -1.34);
    assert.equal(run([liabilities]).targetPrice, null);
});


const scan = { last_price: 10000, eps: 1200, bps: 8000, current_assets: 200, total_liabilities: 50, lstn_stcn: 1000000 };

test('스캔 적정가는 NCAV 억원 환산·PER 10배·PBR 1배와 기준가 대비 차이를 계산한다', () => {
    const rows = scanValuationSummary(scan);
    assert.equal(rows[0].targetPrice, 15000);
    assert.equal(rows[1].targetPrice, 12000);
    assert.equal(rows[2].targetPrice, 8000);
    assert.equal(rows[0].gapPercent, 50);
    assert.ok(Math.abs(rows[1].gapPercent! - 20) < 0.0001);
    assert.ok(Math.abs(rows[2].gapPercent! + 20) < 0.0001);
});

test('스캔 적정가는 적자·음수 순자산·결측 및 잘못된 주식 수를 계산 불가로 남긴다', () => {
    for (const patch of [
        { eps: -1, bps: -1, current_assets: 10 },
        { eps: null, bps: null, lstn_stcn: null },
        { eps: NaN, bps: Infinity, lstn_stcn: 0 },
    ]) {
        const rows = scanValuationSummary({ ...scan, ...patch });
        assert.ok(rows.every(row => row.targetPrice === null && row.gapPercent === null));
    }
    assert.equal(scanValuationSummary({ ...scan, total_liabilities: null })[0].targetPrice, null);
    assert.equal(scanValuationSummary({ ...scan, total_liabilities: 0 })[0].targetPrice, 20000);
});

test('기준가가 없으면 적정가만 표시하고 차이율을 만들지 않는다', () => {
    for (const last_price of [null, 0, NaN, Infinity]) {
        const rows = scanValuationSummary({ ...scan, last_price });
        assert.ok(rows.every(row => row.targetPrice !== null && row.gapPercent === null));
    }
});


test('주식 수 없는 관심종목은 스캔 NCAV 비율로 평가하고 비율 결측을 추정하지 않는다', () => {
    const liked = { ...scan, lstn_stcn: undefined, ncav_ratio: 1.25 };
    assert.equal(scanValuationSummary(liked)[0].targetPrice, 12500);
    assert.equal(scanValuationSummary({ ...liked, ncav_ratio: null })[0].targetPrice, null);
    assert.equal(scanValuationSummary({ ...liked, last_price: null })[0].targetPrice, null);
    assert.equal(scanValuationSummary({ ...liked, ncav_ratio: -1 })[0].targetPrice, null);
});

test('미국 평가액은 NCAV 비율을 사용하고 센트 단위를 보존하며 적자 PER을 제외한다', () => {
    const us = { ...scan, is_us: 1, last_price: 20, ncav_ratio: 0.625, eps: 1.234, bps: 8.76, net_income: 100 };
    const models = scanValuationSummary(us);
    assert.deepEqual(models.map(model => model.targetPrice), [12.5, 12.34, 8.76]);
    assert.equal(scanValuationSummary({ ...us, net_income: -100 })[1].targetPrice, null);
    assert.equal(scanValuationSummary({ ...us, ncav_ratio: null })[0].targetPrice, null);
});

test('비교 축은 모든 모델에 0 기준의 같은 가격 비율을 쓰고 최신 시세로 차이율을 계산한다', () => {
    const axis = valuationComparisonAxis(200, [100, 50, 300]);
    assert.equal(axis.position(100), axis.position(200) / 2);
    assert.equal(axis.difference(100), -50);
    assert.equal(axis.difference(300), 50);
    assert.equal(axis.difference(200), 0);
    assert.ok(axis.position(300) < 100);
});

test('시세·적정가가 없거나 무효면 차이율을 만들지 않고 축 위치는 유한하게 유지한다', () => {
    for (const current of [0, NaN, Infinity]) {
        const axis = valuationComparisonAxis(current, [null, NaN, Infinity]);
        assert.equal(axis.difference(100), null);
        assert.equal(axis.position(current), 0);
    }
    const axis = valuationComparisonAxis(0.5, [0.25, null]);
    assert.equal(axis.difference(0.25), -50);
    assert.equal(axis.difference(null), null);
});

test('음수 NCAV는 같은 선형 축에서 0 왼쪽에 배치하고 현재가 대비 차이율을 표시한다', () => {
    const axis = valuationComparisonAxis(200, [-100, 100, 300]);
    assert.ok(axis.position(-100) > 0);
    assert.ok(axis.position(-100) < axis.position(0));
    assert.ok(Math.abs((axis.position(100) - axis.position(0)) - (axis.position(0) - axis.position(-100))) < 1e-8);
    assert.equal(axis.difference(-100), -150);
    assert.equal(axis.difference(0), -100);
});
