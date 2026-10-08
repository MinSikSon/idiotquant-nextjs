import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildUsBars } from '@/app/(search)/search/components/financialBarsData';

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
  const funding = bs?.stacks.find(row => row.title === '그 자산은 누구 돈인가');
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
  assert.equal(bs?.stacks.some(row => row.title === '그 자산은 누구 돈인가'), false);
});
