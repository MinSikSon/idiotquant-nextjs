import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { calculateUsNcav, calculateUsSRIM } from '../lib/utils/financeCalc.ts';
import { financialSourceLabel, analysisFinancialPeriods, financialFreshness } from '../lib/utils/financialFreshness.ts';
import { buildUsBars } from '../app/(search)/search/components/financialBarsData.ts';
import { analysisSnapshot } from '../lib/share/analysis.ts';
import { screenerSnapshot } from '../lib/share/builders.ts';
import { parseSnapshot, serializeSnapshot } from '../lib/share/snapshot.ts';

// 2026-10-17 SEC Company Facts 실제 응답을 새 어댑터로 변환한 2025 연간 보고서.
const financial = JSON.parse(readFileSync(new URL('./fixtures/sec-sohu-2025.json', import.meta.url), 'utf8'));
const detail = { output: { last: '15', shar: '26069022' } };

test('SOHU SEC 자료를 기존 평가 모델이 읽으며 NCAV는 실제 유동자산에서 부채를 뺀 값이다', () => {
  const result = calculateUsNcav(financial, detail);
  assert.notEqual(typeof result, 'string');
  if (typeof result === 'string') throw new Error(result);
  assert.equal(result.rows[0].targetPrice, Number((609936000 / 26069022).toFixed(2)));
  const srim = calculateUsSRIM(financial, detail);
  assert.notEqual(typeof srim, 'string');
  if (typeof srim === 'string') throw new Error(srim);
  assert.ok(srim.metrics.some(metric => metric.label === 'ROE' && metric.value === '30.84%'));
});

test('SEC 자료의 재무 차트·기준일·출처가 원래 공시와 일치한다', () => {
  const bars = buildUsBars(financial.data);
  assert.deepEqual(bars.bs?.periods, ['FY2025']);
  assert.equal(bars.bs?.groups[0].items.find(item => item.label === '유동자산 합계')?.values[0], 967918000);
  const periods = analysisFinancialPeriods({ finnhubData: financial }, 'US');
  assert.equal(financialFreshness(periods, new Date('2026-10-17T03:00:00Z')).status, 'fresh');
  assert.equal(financialSourceLabel(financial.source), 'SEC EDGAR');
  assert.equal(financialSourceLabel(undefined), '');
  assert.equal(financialSourceLabel('unknown'), '');
});

test('공유받은 분석·발굴 결과에도 SEC 출처와 재무 기준일이 보존된다', () => {
  const data = { finnhubData: financial, usDetail: detail };
  const analysis = analysisSnapshot({ title: 'SOHU', sourcePath: '/analyze?ticker=SOHU', market: 'US',
    values: { per: 1, pbr: 1, eps: 1, bps: 1, curPrice: 15 }, ncav: 1, roe: 30.84,
    data, bars: [], includeDetails: true, verdict: null });
  const restored = parseSnapshot(serializeSnapshot(analysis));
  assert.ok(restored.notes.includes('재무 출처: SEC EDGAR'));
  assert.ok(restored.notes.some(note => note.includes('2025.12.31')));
  const screener = screenerSnapshot([{ ticker: 'SOHU', name: 'Sohu', financial_source: 'sec',
    financial_bs_date: '2025-12-31', financial_is_date: '2025-12-31' }], '/screener', '20261017', 'US', []);
  const table = parseSnapshot(serializeSnapshot(screener)).tables[0];
  assert.equal(table.rows[0][table.columns.indexOf('재무 출처')], 'SEC EDGAR');
});
