import test from 'node:test';
import assert from 'node:assert/strict';
import { rankFactors, parseResearchCsv, backtestFactors, withHistoricalMomentum, scanResearchRows, type ResearchRow, type FactorRule } from '../lib/research/strategy.ts';
import { normalizeBars, technicalSummary } from '../lib/research/technical.ts';

const rules: FactorRule[] = [{ key: 'pbr', weight: 1, lower: true }];
const row = (date: string, ticker: string, close: number, pbr = 1): ResearchRow => ({ date, availableDate: date, ticker, close, pbr });
const near = (value: number, expected: number) => assert.ok(Math.abs(value - expected) < 1e-7, `${value} != ${expected}`);

test('팩터 순위는 사용자 범위·가중치·방향을 반영하고 결측·미공개 지표는 제외한다', () => {
    const data = [
        { ...row('2026-01-01', 'A', 100, 0.7), roe: 10 },
        { ...row('2026-01-01', 'B', 100, 1.3), roe: 20 },
        { ...row('2026-01-01', 'C', 100, 0.1), availableDate: '2026-01-02', roe: 30 },
        { ...row('2026-01-01', 'D', 100), pbr: undefined },
        row('2026-01-01', 'E', 100, 0),
    ];
    assert.deepEqual(rankFactors(data, rules).map(r => r.ticker), ['A', 'B']);
    assert.equal(rankFactors(data, [{ key: 'pbr', weight: 1, lower: true }, { key: 'roe', weight: 3, lower: false }])[0].ticker, 'B');
    assert.deepEqual(rankFactors(data, [{ ...rules[0], min: 0.65, max: 0.75 }]).map(r => r.ticker), ['A']);
    assert.equal(rankFactors(data, [{ ...rules[0], lower: false }])[0].ticker, 'B');
});

test('동점 팩터는 평균 순위를 받아 입력 순서에 따라 유리해지지 않는다', () => {
    const ranked = rankFactors([row('2026-01-01', 'B', 100, 1), row('2026-01-01', 'A', 100, 1), row('2026-01-01', 'C', 100, 2)], rules);
    near(ranked[0].score, 75); near(ranked[1].score, 75); near(ranked[2].score, 0);
    assert.equal(ranked[0].ticker, 'A');
});

test('현재 지표로 과거를 고르지 않고 다음 시점 가격으로 체결한다', () => {
    const rows = [row('2026-01-01', 'A', 10, 0.5), row('2026-01-01', 'B', 10, 2), row('2026-01-02', 'A', 20, 4), row('2026-01-02', 'B', 10, 0.2), row('2026-01-03', 'A', 40, 4), row('2026-01-03', 'B', 10, 0.2)];
    const result = backtestFactors(rows, rules, 1, 20, 0);
    near(result.totalReturn, 100); assert.equal(result.cagr, null); // A를 첫날 10이 아니라 다음날 20에 산다.
    assert.deepEqual(result.curve[1].holdings, ['A']);
    assert.equal(result.curve[1].signalDate, '2026-01-01');
    const changedFuture = rows.map(r => r.date === '2026-01-03' ? { ...r, pbr: 999 } : r);
    assert.deepEqual(backtestFactors(changedFuture, rules, 1, 20, 0).curve, result.curve);
});

test('매매 비용은 실제 거래금액에 적용하고 동일 비중을 유지하면 중복 차감하지 않는다', () => {
    const rows = ['2026-01-01', '2026-01-02', '2026-01-03'].map(date => row(date, 'A', 100));
    const result = backtestFactors(rows, rules, 1, 1, 100);
    near(result.curve[1].value, 1 / 1.01);
    near(result.curve[2].value, 1 / 1.01);
    assert.equal(result.trades, 1);
    near(result.totalCosts, (1 - 1 / 1.01) * 100);
});

test('매도·재매수 비용과 가격 손실은 최대 낙폭에 포함한다', () => {
    const rows = [row('2026-01-01', 'A', 100, 1), row('2026-01-02', 'A', 100, 2), row('2026-01-02', 'B', 100, 1), row('2026-01-03', 'A', 50, 2), row('2026-01-03', 'B', 100, 1)];
    const result = backtestFactors(rows, rules, 1, 1, 100);
    const expected = (1 / 1.01) * 0.5 * 0.99 / 1.01;
    near(result.curve[2].value, expected); near(result.mdd, (expected - 1) * 100);
    assert.deepEqual(result.curve[2].holdings, ['B']);
});

test('보유 또는 선정 종목 가격 누락은 조용히 제외하지 않고 계산을 거절한다', () => {
    assert.throws(() => backtestFactors([row('2026-01-01', 'A', 100), row('2026-01-02', 'A', 100), row('2026-01-03', 'B', 100)], rules, 1, 20, 0), /가격이 없습니다/);
    assert.throws(() => backtestFactors([row('2026-01-01', 'A', 100), row('2026-01-02', 'B', 100), row('2026-01-03', 'B', 100)], rules, 1, 20, 0), /가격이 없습니다/);
});

test('보유 종목의 확정 정산가 0은 손실로 남고 미공개 지표만 있으면 현금을 보유한다', () => {
    const rows = [row('2026-01-01', 'A', 100), row('2026-01-02', 'A', 100), row('2026-01-03', 'A', 0)];
    near(backtestFactors(rows, rules, 1, 20, 0).totalReturn, -100);
    near(backtestFactors(rows.map(r => ({ ...r, availableDate: '2027-01-01' })), rules, 1, 20, 0).totalReturn, 0);
});

test('CSV는 BOM·따옴표·쉼표·개행과 0 가격을 읽으며 잘못된 날짜·중복·결측 가격은 거절한다', () => {
    const header = 'date,available_date,ticker,name,close,pbr';
    const csv = `\uFEFF${header}\r\n2026-01-01,2026-01-01,A,"회사, 이름",100,0.65\r\n2026-01-02,2026-01-02,A,"회사\n이름",0,`;
    const parsed = parseResearchCsv(csv);
    assert.equal(parsed[0].name, '회사, 이름'); assert.equal(parsed[1].name, '회사\n이름'); assert.equal(parsed[1].close, 0); assert.equal(parsed[1].pbr, undefined);
    assert.throws(() => parseResearchCsv(`${header}\n2026-02-30,2026-01-01,A,x,100,1`), /날짜/);
    assert.throws(() => parseResearchCsv(`${header}\n2026-01-01,2026-01-01,A,x,,1`), /가격/);
    const repeated = '2026-01-01,2026-01-01,A,x,100,1';
    assert.throws(() => parseResearchCsv(`${header}\n${repeated}\n${repeated}`), /중복/);
    assert.throws(() => parseResearchCsv('date,ticker,close\n2026-01-01,A,100'), /available_date/);
});

test('기간·보유 수·가중치·모순된 범위는 계산 전에 거절한다', () => {
    assert.throws(() => rankFactors([], [{ ...rules[0], weight: 0 }]), /가중치/);
    assert.throws(() => rankFactors([], [{ ...rules[0], min: 2, max: 1 }]), /범위/);
    assert.throws(() => backtestFactors([], rules, 1, 0, 0), /주기/);
    assert.throws(() => backtestFactors([row('2026-01-01', 'A', 100)], rules, 1, 1, 0), /3개/);
});

test('기술적 지표는 오래된 시세부터 정렬하며 누락 가격을 0으로 만들지 않는다', () => {
    const bars = normalizeBars([{ xymd: '20260102', clos: '20', tvol: '0' }, { xymd: '20260101', clos: '10', tvol: '100' }, { xymd: '20260103', clos: '' }], 'US');
    assert.deepEqual(bars.map(b => b.close), [10, 20]); assert.equal(bars[1].volume, 0);
    assert.equal(technicalSummary(bars).sma20, null); assert.equal(technicalSummary(bars).rsi14, null);
});

test('이동평균·20기간 변화율·이전 거래량 평균은 현재 데이터를 중복 포함하지 않는다', () => {
    const bars = Array.from({ length: 21 }, (_, i) => ({ date: String(i), close: 100 + i, volume: i === 20 ? 200 : 100 }));
    const result = technicalSummary(bars);
    near(result.sma20!, 110.5); near(result.momentum20!, 20); near(result.volumeRatio!, 2);
    assert.equal(result.sma60, null); assert.equal(result.rsi14, 100);
});

test('RSI는 Wilder 초기 평균과 후속 평활을 사용하며 횡보·하락도 계산한다', () => {
    const prices = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00];
    const bars = prices.map((close, i) => ({ date: String(i), close }));
    near(technicalSummary(bars.slice(0, 15)).rsi14!, 70.46413502109705);
    near(technicalSummary(bars).rsi14!, 66.24961855355505);
    assert.equal(technicalSummary(Array.from({ length: 20 }, (_, i) => ({ date: String(i), close: 100 }))).rsi14, 50);
    assert.equal(technicalSummary(Array.from({ length: 20 }, (_, i) => ({ date: String(i), close: 100 - i }))).rsi14, 0);
});


test('과거 모멘텀은 앞선 관측값만 사용하고 미래 가격을 바꿔도 이전 값이 유지된다', () => {
    const rows = Array.from({ length: 22 }, (_, i) => row(`2026-01-${String(i + 1).padStart(2, '0')}`, 'A', 100 + i));
    const enriched = withHistoricalMomentum(rows);
    assert.equal(enriched[19].momentum20, undefined);
    near(enriched[20].momentum20!, 20);
    const altered = withHistoricalMomentum(rows.map((r, i) => i === 21 ? { ...r, close: 9999 } : r));
    assert.equal(altered[20].momentum20, enriched[20].momentum20);
    assert.equal(enriched[20].momentum60, undefined);
});


test('1년 이상 구간의 연환산 수익률은 실제 날짜 간격을 사용한다', () => {
    const rows = [row('2024-01-01', 'A', 100), row('2024-01-02', 'A', 100), row('2025-01-01', 'A', 110)];
    const result = backtestFactors(rows, rules, 1, 20, 0);
    near(result.cagr!, (Math.pow(1.1, 365.25 / 366) - 1) * 100);
});


test('스캔 변환은 결측 ROE를 0으로 만들지 않고 음수 EPS와 백엔드 비율 단위를 유지한다', () => {
    const rows = scanResearchRows([
        { ticker: 'A', last_price: 100, eps: null, bps: null, roe: null },
        { ticker: 'B', last_price: 100, eps: -10, bps: 100 },
        { ticker: 'C', last_price: 100, roe: 0.15 },
    ], '2026-01-01');
    assert.equal(rows[0].roe, undefined); assert.equal(rows[1].roe, -10); assert.equal(rows[2].roe, 15);
    assert.throws(() => scanResearchRows([{ ticker: 'A', last_price: null }], '2026-01-01'), /가격/);
});
