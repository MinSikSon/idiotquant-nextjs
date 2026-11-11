import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildKrBars, buildUsBars } from '@/app/(search)/search/components/financialBarsData';

const report = (values: Record<string, number>) => [{
  endDate: '2024-12-31 00:00:00',
  report: { bs: Object.entries(values).map(([concept, value]) => ({ concept: `us-gaap_${concept}`, value })) },
}];

test('GTEC 연결 재무상태표는 비지배지분 포함 자본을 사용해 부채와 합계 100%를 만든다', () => {
  const { bs } = buildUsBars(report({
    Assets: 115_576_195,
    Liabilities: 62_307_307,
    StockholdersEquity: 60_207_697,
    StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest: 53_268_888,
    LiabilitiesAndStockholdersEquity: 115_576_195,
  }));
  const funding = bs?.stacks.find(row => row.title === '부채와 자본 비중');
  assert.ok(funding);
  assert.deepEqual(funding.segs.map(seg => seg.label), ['부채', '자본']);
  assert.ok(Math.abs(funding.segs.reduce((sum, seg) => sum + seg.pct, 0) - 100) < 0.000001);
  assert.equal(bs?.groups[1].items[1].values[0], 53_268_888);
});

test('부채 항목이 없을 때 부채·자본 합계를 부채로 오인하지 않는다', () => {
  const { bs } = buildUsBars(report({
    Assets: 100,
    LiabilitiesAndStockholdersEquity: 100,
    StockholdersEquity: 40,
  }));
  assert.equal(bs?.groups[1].items[0].values[0], null);
  assert.equal(bs?.stacks.some(row => row.title === '부채와 자본 비중'), false);
});

test('NEON 유동 수취채권의 접두사 유무를 지원하며 미공시 재고는 결측으로 보존한다', () => {
  for (const concept of ['ReceivablesNetCurrent', 'us-gaap_ReceivablesNetCurrent']) {
    const { bs } = buildUsBars([{
      endDate: '2026-06-30',
      report: { bs: [{ concept, value: 425000 }] },
    }]);
    assert.deepEqual(bs?.groups[0].items.find(item => item.label === '매출·수취채권')?.values, [425000]);
    assert.deepEqual(bs?.groups[0].items.find(item => item.label === '재고자산')?.values, [null]);
  }
  const { bs } = buildUsBars(report({ AccountsReceivableNetCurrent: 0, ReceivablesNetCurrent: 425000 }));
  assert.deepEqual(bs?.groups[0].items.find(item => item.label === '매출·수취채권')?.values, [0]);
});

test('NEON의 세금 포함 매출 공시도 기간별 매출액에 표시한다', () => {
  for (const prefix of ['', 'us-gaap_']) {
    const { is } = buildUsBars([{ endDate: '2026-06-30', report: { ic: [{ concept: `${prefix}RevenueFromContractWithCustomerIncludingAssessedTax`, value: 1091000 }] } }]);
    assert.deepEqual(is?.groups[0].items.find(item => item.label === '매출액')?.values, [1091000]);
  }
});


test('앞선 공시 항목이 결측이면 다음 별칭을 확인하고 실제 0은 보존한다', () => {
  for (const value of [0, 425000]) {
    const { bs } = buildUsBars([{
      endDate: '2026-06-30',
      report: { bs: [
        { concept: 'us-gaap_AccountsReceivableNetCurrent', value: null },
        { concept: 'us-gaap_ReceivablesNetCurrent', value },
      ] },
    }]);
    assert.deepEqual(bs?.groups[0].items.find(item => item.label === '매출·수취채권')?.values, [value]);
  }
});


test('국내 특별손익을 반영한 세전손익과 법인세 등 차액을 최신순으로 표시한다', () => {
  const { is } = buildKrBars(null, { output: [
    { stac_yymm: '202503', op_prfi: '80', spec_prfi: '0', spec_loss: '0', thtr_ntin: '80' },
    { stac_yymm: '202603', op_prfi: '100', spec_prfi: '20', spec_loss: '5', thtr_ntin: '90', bsop_non_ernn: '30', bsop_non_expn: '10' },
  ] });
  const items = is?.groups.flatMap(group => group.items);
  assert.deepEqual(items?.find(item => item.label === '세전손익(계산)')?.values, [115, 80]);
  assert.deepEqual(items?.find(item => item.label === '법인세 등(차액)')?.values, [25, 0]);
  assert.equal(items?.find(item => item.label === '법인세 등(차액)')?.hideDelta, true);
  assert.deepEqual(items?.find(item => item.label === '영업외수익')?.values, [30, null]);
  assert.deepEqual(items?.find(item => item.label === '영업외비용')?.values, [10, null]);
});

test('국내 차액은 필요한 항목이 없으면 계산하지 않고 세금 혜택의 음수도 보존한다', () => {
  const rows = [
    { stac_yymm: '202603', op_prfi: '100', spec_prfi: '0', spec_loss: '0', thtr_ntin: '120' },
    { stac_yymm: '202503', op_prfi: '100', spec_prfi: '', spec_loss: '0', thtr_ntin: '90' },
    { stac_yymm: '202403', op_prfi: '100', spec_prfi: '0', spec_loss: '0' },
    { stac_yymm: '202303', op_prfi: 'invalid', spec_prfi: '0', spec_loss: '0', thtr_ntin: '90' },
  ];
  const { is } = buildKrBars(null, { output: rows });
  const items = is?.groups.flatMap(group => group.items);
  assert.deepEqual(items?.find(item => item.label === '법인세 등(차액)')?.values, [-20, null, null, null]);
  assert.deepEqual(items?.find(item => item.label === '세전손익(계산)')?.values, [100, null, 100, null]);
});

test('미국 법인세 공시 별칭과 0·세금 혜택·결측을 보존한다', () => {
  for (const prefix of ['', 'us-gaap_']) {
    for (const pretax of ['IncomeLossFromContinuingOperationsBeforeIncomeTaxExpenseBenefit', 'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest']) {
      const { is } = buildUsBars([0, -25, null].map((tax, index) => ({
        endDate: `${2026 - index}-06-30`,
        report: { ic: [
          { concept: `${prefix}${pretax}`, value: 100 },
          { concept: `${prefix}IncomeTaxExpenseBenefit`, value: tax },
          { concept: `${prefix}NetIncomeLoss`, value: 100 },
        ] },
      })));
      const items = is?.groups.flatMap(group => group.items);
      assert.deepEqual(items?.find(item => item.label === '세전이익(계속영업)')?.values, [100, 100, 100]);
      assert.deepEqual(items?.find(item => item.label === '법인세비용(혜택)')?.values, [0, -25, null]);
      assert.equal(items?.find(item => item.label === '법인세비용(혜택)')?.hideDelta, true);
    }
  }
});
