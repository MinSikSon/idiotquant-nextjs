import assert from 'node:assert/strict';
import test from 'node:test';
import { planComparisonImport, startImportCountdown } from '../lib/features/compare/import.ts';

for (const limit of [4, 20]) {
  test(`${limit}종목 한도: 중복은 제외하고 합계가 한도를 넘을 때만 교체 동의를 요청한다`, () => {
    const stocks = Array.from({ length: limit - 1 }, (_, index) => ({ market: 'US' as const, ticker: `OLD${index}` }));
    assert.equal(planComparisonImport(stocks, ['NEW', 'NEW', 'OLD0'], 'US', limit).exceedsLimit, false);
    const plan = planComparisonImport(stocks, ['NEW', 'OTHER', 'OLD0'], 'US', limit);
    assert.equal(plan.exceedsLimit, true);
    assert.deepEqual(plan.added, ['NEW', 'OTHER']);
    assert.equal(planComparisonImport([], Array.from({ length: 30 }, (_, index) => `NEW${index}`), 'US', limit).selected.length, limit);
  });
}

test('같은 티커라도 시장이 다르면 별도 종목으로 계산한다', () => {
  assert.deepEqual(planComparisonImport([{ market: 'KR', ticker: 'ABC' }], ['ABC'], 'US', 4).added, ['ABC']);
});

test('5초 전에는 동의하지 않고 5초 뒤 한 번만 자동 동의한다', context => {
  context.mock.timers.enable({ apis: ['setInterval'] });
  const ticks: number[] = [];
  let confirmed = 0;
  startImportCountdown(value => ticks.push(value), () => { confirmed++; });
  for (let second = 1; second < 5; second++) {
    context.mock.timers.tick(1000);
    assert.equal(confirmed, 0);
  }
  context.mock.timers.tick(1000);
  assert.equal(confirmed, 1);
  assert.deepEqual(ticks, [4, 3, 2, 1, 0]);
  context.mock.timers.tick(10_000);
  assert.equal(confirmed, 1);
});

test('취소하거나 화면을 떠나면 자동 동의 타이머를 해제한다', context => {
  context.mock.timers.enable({ apis: ['setInterval'] });
  let confirmed = 0;
  const stop = startImportCountdown(() => {}, () => { confirmed++; });
  context.mock.timers.tick(1000);
  stop();
  context.mock.timers.tick(10_000);
  assert.equal(confirmed, 0);
});
