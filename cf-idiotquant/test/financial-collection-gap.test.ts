import assert from 'node:assert/strict';
import test from 'node:test';
import { collectionFinancialFreshness, scanCollectionDate, scanFinancialPeriods } from '../lib/utils/financialFreshness.ts';
import { screenerSnapshot } from '../lib/share/builders.ts';
import { parseSnapshot, serializeSnapshot } from '../lib/share/snapshot.ts';

const now = new Date('2026-10-17T03:00:00Z');
const periods = (date: unknown) => [{ label: '재무제표', date }];

test('오늘 수집한 오래된 Finnhub 자료의 수집일·재무 기준일·실제 차이를 알린다', () => {
  const item = { scan_date: '20261017', financial_bs_date: '2012-12-31', financial_is_date: '2012-12-31' };
  const result = collectionFinancialFreshness(scanFinancialPeriods(item), scanCollectionDate(item), now);
  assert.equal(result.status, 'stale');
  assert.equal(result.label, '수집일과 약 13년 9개월 차이');
  assert.equal(result.collectionDate, '2026.10.17');
  assert.ok(result.message.includes('수집 2026.10.17'));
  assert.ok(result.message.includes('재무상태표 2012.12.31'));
  assert.ok(result.message.includes('손익계산서 2012.12.31'));
});

test('과거 결과는 오늘이 아니라 당시 수집일을 기준으로 판단한다', () => {
  const result = collectionFinancialFreshness(periods('2012-12-31'), '20140101', now);
  assert.equal(result.status, 'fresh');
  assert.equal(result.label, '수집일 기준 3년 이내');
  assert.ok(result.message.includes('2014.01.01'));
});

test('주간 보관 자료는 종목의 마지막 수집일로 비교한다', () => {
  const item = { scan_date: '20261017', period_end_date: '20161017', financial_bs_date: '20131231', financial_is_date: '20131231' };
  const result = collectionFinancialFreshness(scanFinancialPeriods(item), scanCollectionDate(item), now);
  assert.equal(result.collectionDate, '2016.10.17');
  assert.equal(result.status, 'fresh');
});

test('기존 3년 경계·결산월·윤년 기준을 수집일에도 적용한다', () => {
  assert.equal(collectionFinancialFreshness(periods('2023-10-17'), '20261017', now).status, 'fresh');
  assert.equal(collectionFinancialFreshness(periods('2023-10-16'), '20261017', now).status, 'stale');
  assert.equal(collectionFinancialFreshness(periods('202310'), '20261017', now).status, 'fresh');
  assert.equal(collectionFinancialFreshness(periods('202309'), '20261017', now).status, 'stale');
  assert.equal(collectionFinancialFreshness(periods('2025-02-28'), '20280229', new Date('2028-03-01T03:00:00Z')).status, 'fresh');
});

test('수집일이 없거나 잘못되었거나 미래면 오늘로 대체하지 않는다', () => {
  for (const date of [undefined, null, '', '20260230', '202610', '20261018']) {
    const result = collectionFinancialFreshness(periods('2012-12-31'), date, now);
    assert.equal(result.status, 'unknown');
    assert.equal(result.label, '수집일 미확인');
    assert.equal(result.collectionDate, '');
  }
});

test('재무 기준일 누락·수집일 이후 자료는 미확인, 일부 오래된 자료가 있으면 경고한다', () => {
  for (const date of [null, '2026-10-18', 'invalid'])
    assert.equal(collectionFinancialFreshness(periods(date), '20261017', now).status, 'unknown');
  const result = collectionFinancialFreshness([
    { label: '재무상태표', date: '2012-12-31' }, { label: '손익계산서', date: null },
  ], '20261017', now);
  assert.equal(result.status, 'stale');
  assert.ok(result.message.includes('일부 재무 기준일도 확인할 수 없습니다'));
});

test('공유 결과는 각 종목 수집일과 당시의 날짜 차이를 보존한다', () => {
  const item = { ticker: 'SOHU', name: 'Sohu', scan_date: '20261017', financial_source: 'finnhub', financial_bs_date: '20121231', financial_is_date: '20121231' };
  const snapshot = screenerSnapshot([item], '/screener', '20261017', 'US', []);
  const table = parseSnapshot(serializeSnapshot(snapshot)).tables[0];
  const cell = (name: string) => table.rows[0][table.columns.indexOf(name)];
  assert.equal(cell('수집일'), '2026.10.17');
  assert.equal(cell('재무 출처'), 'Finnhub');
  assert.equal(cell('재무정보 상태'), '수집일과 약 13년 9개월 차이');
  assert.ok(String(cell('수집일·재무 기준일 비교')).includes('2012.12.31'));
});
