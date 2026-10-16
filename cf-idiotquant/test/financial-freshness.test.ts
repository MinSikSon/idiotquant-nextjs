import assert from 'node:assert/strict';
import test from 'node:test';
import {
  financialFreshness,
  scanFinancialPeriods,
  analysisFinancialPeriods,
} from '../lib/utils/financialFreshness.ts';
import { screenerSnapshot } from '../lib/share/builders.ts';
import { analysisSnapshot } from '../lib/share/analysis.ts';
import { serializeSnapshot, parseSnapshot } from '../lib/share/snapshot.ts';

const now = new Date('2026-10-16T03:00:00Z');
const check = (date: unknown) =>
  financialFreshness([{ label: '재무제표', date }], now);

test('최근 3년 경계일은 포함하고 하루 더 오래된 회계 종료일은 경고한다', () => {
  assert.equal(check('2023-10-16').status, 'fresh');
  assert.equal(check('2023-10-15').status, 'stale');
  assert.equal(check('20231015').status, 'stale');
  assert.equal(check('2025-12-31 00:00:00').status, 'fresh');
  assert.equal(check('2025-12-31T00:00:00Z').status, 'fresh');
});

test('국내 결산월은 월말로 비교해 날짜를 모르는 당월을 너무 일찍 경고하지 않는다', () => {
  assert.equal(check('202310').status, 'fresh');
  assert.equal(check('202309').status, 'stale');
  assert.equal(check('2023.09').status, 'stale');
  assert.ok(check('202309').periods.includes('2023.09'));
});

test('기준일 없음·잘못된 날짜·미래 날짜는 최신으로 간주하지 않는다', () => {
  for (const value of [
    null,
    undefined,
    '',
    '202513',
    '20250230',
    'not-a-date',
    '2027-01-01',
    '2026-10-17',
  ])
    assert.equal(check(value).status, 'unknown');
  assert.equal(financialFreshness([], now).status, 'unknown');
});

test('오늘의 기준은 한국 날짜이며 윤년 경계도 달력 연도로 계산한다', () => {
  assert.equal(
    financialFreshness(
      [{ label: '재무', date: '20231016' }],
      new Date('2026-10-16T14:59:59Z')
    ).status,
    'fresh'
  );
  assert.equal(
    financialFreshness(
      [{ label: '재무', date: '20231016' }],
      new Date('2026-10-16T15:00:00Z')
    ).status,
    'stale'
  );
  assert.equal(
    financialFreshness(
      [{ label: '재무', date: '20250228' }],
      new Date('2028-02-29T03:00:00Z')
    ).status,
    'fresh'
  );
  assert.equal(
    financialFreshness(
      [{ label: '재무', date: '20250227' }],
      new Date('2028-02-29T03:00:00Z')
    ).status,
    'stale'
  );
});

test('재무상태표가 최신이어도 사용하는 손익계산서가 오래됐으면 경고한다', () => {
  const periods = analysisFinancialPeriods(
    {
      kiBS: { output: [{ stac_yymm: '202512' }] },
      kiIS: { output: [{ stac_yymm: '202212' }, { stac_yymm: '202512' }] },
    },
    'KR'
  );
  const status = financialFreshness(periods, now);
  assert.equal(status.status, 'stale');
  assert.ok(status.message.includes('손익계산서 2022.12'));
  assert.equal(
    financialFreshness(
      analysisFinancialPeriods(
        {
          kiBS: { state: 'fulfilled', output: [{ stac_yymm: '202512' }] },
          kiIS: { state: 'pending' },
        },
        'KR'
      ),
      now
    ).status,
    'fresh'
  );
});

test('미국 자료는 최근 제출일이 있어도 오래된 회계 종료일로 경고한다', () => {
  const periods = analysisFinancialPeriods(
    {
      finnhubData: {
        data: [
          {
            endDate: '2021-12-31',
            filedDate: '2026-10-16',
            acceptedDate: '2026-10-16',
          },
        ],
      },
    },
    'US'
  );
  assert.equal(financialFreshness(periods, now).status, 'stale');
  assert.equal(
    financialFreshness(
      analysisFinancialPeriods(
        { finnhubData: { data: [{ filedDate: '2026-10-16' }] } },
        'US'
      ),
      now
    ).status,
    'unknown'
  );
});

test('발굴 수집일이 오늘이어도 재무 기준일이 오래되거나 없으면 구분한다', () => {
  const item = {
    scan_date: '20261016',
    financial_bs_date: '202212',
    financial_is_date: '202112',
  };
  assert.equal(
    financialFreshness(scanFinancialPeriods(item), now).status,
    'stale'
  );
  assert.equal(
    financialFreshness(scanFinancialPeriods({ scan_date: '20261016' }), now)
      .status,
    'unknown'
  );
});

test('공유 데이터에도 재무 기준일과 경고를 포함한다', () => {
  const snapshot = screenerSnapshot(
    [
      {
        name: '오래된 기업',
        ticker: '001000',
        financial_bs_date: '200012',
        financial_is_date: '200112',
      },
    ],
    '/screener',
    '20261016',
    'KR',
    []
  );
  const shared = parseSnapshot(serializeSnapshot(snapshot));
  assert.equal(
    shared.tables[0].rows[0][shared.tables[0].columns.indexOf('재무정보 상태')],
    '재무정보 3년 경과'
  );
  assert.ok(
    shared.tables[0].rows[0][
      shared.tables[0].columns.indexOf('재무 기준일')
    ].includes('2000.12')
  );
  const analysis = analysisSnapshot({
    title: '오래된 기업',
    sourcePath: '/analyze?ticker=001000',
    market: 'KR',
    values: { per: 10, pbr: 1, eps: 100, bps: 1000, curPrice: 1000 },
    ncav: null,
    roe: 10,
    data: {
      kiBS: { output: [{ stac_yymm: '200012' }] },
      kiIS: { output: [{ stac_yymm: '200112' }] },
    },
    bars: [],
    includeDetails: false,
    verdict: null,
  });
  assert.ok(
    analysis.notes.some((note) =>
      note.includes('최근 3년 이내 재무정보가 아닙니다')
    )
  );
});
