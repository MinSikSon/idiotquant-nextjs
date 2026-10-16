import assert from 'node:assert/strict';
import test from 'node:test';
import {
  snapshotNumber,
  snapshotMoney,
  snapshotGrowthRows,
  snapshotPriceSeries,
  snapshotStockName,
  analysisTableTab,
  snapshotFinancialModel,
} from '../lib/share/presentation.ts';
import { calculatorSnapshot } from '../lib/share/calculator.ts';
import { DEFAULTS, simulate } from '../app/(calculator)/calculator/calc.ts';

test('공유 화면은 통화·배수·백분율의 0과 음수를 보존하고 설명이나 결측값은 숫자로 만들지 않는다', () => {
  assert.equal(snapshotNumber('₩12,345.67'), 12345.67);
  assert.equal(snapshotNumber('$0'), 0);
  assert.equal(snapshotNumber('−2.5%'), -2.5);
  assert.equal(snapshotNumber('+10%'), 10);
  assert.equal(snapshotNumber('0배'), 0);
  for (const value of [
    '—',
    '',
    '조회 실패',
    '1,23',
    '2026-10-16 종가',
    'Infinity',
  ])
    assert.equal(snapshotNumber(value), null);
});

test('계산기의 억·만원 표기를 같은 단위인 만원으로 복원한다', () => {
  assert.equal(snapshotMoney('1억 2,345만원'), 12345);
  assert.equal(snapshotMoney('1,234억 5,678만원'), 12345678);
  assert.equal(snapshotMoney('2억원'), 20000);
  assert.equal(snapshotMoney('−1억 1만원'), -10001);
  assert.equal(snapshotMoney('0만원'), 0);
  assert.equal(snapshotMoney('—'), null);
  assert.equal(snapshotMoney('원금 1000만원'), null);
});

test('계산 차트는 받은 연도별 내역을 사용하며 읽을 수 없는 값이 있으면 그래프 대신 원본 표를 남긴다', () => {
  const result = simulate(DEFAULTS);
  const snapshot = calculatorSnapshot(DEFAULTS, 'simple', result);
  const original = JSON.stringify(snapshot);
  const rows = snapshotGrowthRows(snapshot);
  assert.equal(rows.length, result.rows.length);
  assert.deepEqual(rows[0], {
    year: 0,
    principal: DEFAULTS.initial,
    value: DEFAULTS.initial,
  });
  assert.equal(rows.at(-1)?.value, Math.round(result.rows.at(-1)!.value));
  assert.equal(JSON.stringify(snapshot), original);
  snapshot.tables[2].rows[1][4] = '값 없음';
  assert.deepEqual(snapshotGrowthRows(snapshot), []);
  assert.equal(snapshot.tables[2].rows[1][4], '값 없음');
});

test('분석의 가격 차트는 거래일 순서와 결측 구간을 보존하고 값이 없는 날을 0으로 그리지 않는다', () => {
  assert.deepEqual(
    snapshotPriceSeries({
      title: '조회된 주가 추이',
      columns: ['거래일', '종가', '거래량'],
      rows: [
        ['20261013', '₩1,000', '10'],
        ['20261014', '—', '0'],
        ['20261015', '₩1,200', '20'],
      ],
    }),
    [
      { date: '20261013', close: 1000 },
      { date: '20261014', close: null },
      { date: '20261015', close: 1200 },
    ]
  );
});

test('기존 공유 데이터의 분석 표를 지표·전략·위험도·재무 항목으로 연결한다', () => {
  const table = { title: '핵심 지표', columns: ['지표', '값'], rows: [] };
  assert.equal(analysisTableTab(table), 'metrics');
  assert.equal(
    analysisTableTab({
      ...table,
      title: 'NCAV 청산가치 모델',
      columns: ['가정', '평가 가격', '기준가 대비'],
    }),
    'valuation'
  );
  assert.equal(
    analysisTableTab({ ...table, title: '상장유지 위험도 확인' }),
    'risk'
  );
  assert.equal(
    analysisTableTab({ ...table, title: '손익계산서 · 현금흐름 · USD' }),
    'financials'
  );
  assert.deepEqual(snapshotStockName('회사(우) (005935 · KR)'), {
    name: '회사(우)',
    code: '005935 · KR',
  });
  assert.deepEqual(snapshotStockName('이름만 있는 종목'), {
    name: '이름만 있는 종목',
    code: '',
  });
});

test('재무 막대는 공유된 기간·단위·음수·결측값을 유지한다', () => {
  const model = snapshotFinancialModel({
    title: '재무상태표 · 억 원',
    columns: ['계정과목', '2025.12', '2024.12'],
    rows: [
      ['유동자산', '1,200', '—'],
      ['부채총계', '500', '0'],
      ['당기순이익', '−10', '20'],
    ],
  });
  assert.deepEqual(model.periods, ['2025.12', '2024.12']);
  assert.deepEqual(model.groups[0].items[0].values, [1200, null]);
  assert.deepEqual(model.groups[0].items[1].values, [500, 0]);
  assert.deepEqual(model.groups[0].items[2].values, [-10, 20]);
  assert.equal(model.groups[0].items[1].costLike, true);
});
