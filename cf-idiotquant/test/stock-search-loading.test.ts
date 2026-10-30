import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// 실제 검색 훅을 실행하되 React 상태·Redux 요청 경계만 대체한다.
const source = readFileSync(
  new URL('../app/(search)/search/hooks/useStockSearch.ts', import.meta.url),
  'utf8'
);
const corpCodes = JSON.parse(readFileSync(new URL('../public/data/validCorpCode.json', import.meta.url), 'utf8'));
const corpNames = JSON.parse(readFileSync(new URL('../public/data/validCorpNameArray.json', import.meta.url), 'utf8'));
const script = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;
function harness() {
  const states: unknown[] = [];
  const pending: { type: string; payload: unknown; resolve: () => void; reject: () => void }[] =
    [];
  const actions = new Proxy(
    {},
    { get: (_, key) => (payload: unknown) => ({ type: String(key), payload }) }
  );
  const dispatch = (action: { type: string; payload: unknown }) => {
    if (!action.type.startsWith('reqGet')) return action;
    return new Promise((resolve, reject) =>
      pending.push({
        type: action.type,
        payload: action.payload,
        resolve: () => resolve({}),
        reject: () => reject(new Error('시세 서버 오류')),
      })
    );
  };
  const output = {
    exports: {} as {
      useStockSearch?: () => { onSearch: (value: string) => Promise<void> };
    },
  };
  runInNewContext(script, {
    exports: output.exports,
    module: output,
    fetch: async (url: string) => ({
      json: async () => ({
        data: url.includes('country=US')
          ? [{ ticker: 'NEW' }]
          : [{ ticker: '123456', name: '새국내' }],
      }),
    }),
    require(name: string) {
      if (name === 'react')
        return {
          useState(initial: unknown) {
            const index = states.length;
            states.push(initial);
            return [
              initial,
              (value: unknown) => {
                states[index] = value;
              },
            ];
          },
          useEffect() {},
          useCallback: (callback: unknown) => callback,
          useRef: (value: unknown) => ({ current: value }),
        };
      if (name === '@/lib/hooks')
        return {
          useAppDispatch: () => dispatch,
          useAppSelector: () => ({ state: 'idle' }),
        };
      if (name.endsWith('validCorpCode.json'))
        return corpCodes;
      if (name.endsWith('nasdaq_tickers.json')) return ['AAPL'];
      if (name.endsWith('nyse_tickers.json')) return ['BRK.B'];
      if (name.endsWith('amex_tickers.json')) return [];
      if (name.startsWith('@/lib/features/')) return actions;
      throw new Error(`예상하지 못한 import: ${name}`);
    },
  });
  const hook = output.exports.useStockSearch!();
  return { hook, pending, loading: () => states[2] };
}

test('케이아이이는 분석 페이지의 검색·자동완성 목록에 포함된다', () => {
  assert.ok(corpNames.includes('케이아이이'));
  assert.equal(corpCodes['케이아이이']?.stock_code, '009140');
});

for (const name of ['케이아이이', '경인전자', '009140']) {
  test(`${name}: 국내 종목 009140으로 시세와 재무제표를 요청한다`, async () => {
    const { hook, pending } = harness();
    const work = hook.onSearch(name);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(pending.map(request => request.type), [
      'reqGetInquirePrice', 'reqGetInquireDailyItemChartPrice',
      'reqGetBalanceSheet', 'reqGetIncomeStatement',
    ]);
    for (const request of pending) {
      assert.equal((request.payload as { PDNO: string }).PDNO, '009140');
      request.resolve();
    }
    await work;
  });
}

for (const ticker of ['삼성전자', '005930', 'AAPL']) {
  test(`${ticker}: 분석 응답을 기다린 뒤 로딩을 해제해 공유 버튼이 활성화될 수 있다`, async () => {
    const { hook, pending, loading } = harness();
    const work = hook.onSearch(ticker);
    assert.equal(loading(), true);
    assert.equal(pending.length, 4);
    pending.slice(0, 3).forEach((request) => request.resolve());
    await Promise.resolve();
    assert.equal(loading(), true);
    pending[3].resolve();
    await work;
    assert.equal(loading(), false);
  });
}

test('일부 재무 요청이 실패해도 로딩에 영구적으로 묶이지 않는다', async () => {
  const { hook, pending, loading } = harness();
  const work = hook.onSearch('삼성전자');
  pending[0].resolve();
  pending[1].resolve();
  pending[2].resolve();
  pending[3].reject();
  await work;
  assert.equal(loading(), false);
});

test('이전 검색이 늦게 끝나도 현재 종목의 로딩을 해제하지 않는다', async () => {
  const { hook, pending, loading } = harness();
  const first = hook.onSearch('삼성전자');
  const second = hook.onSearch('AAPL');
  pending.slice(0, 4).forEach((request) => request.resolve());
  await first;
  assert.equal(loading(), true);
  pending.slice(4).forEach((request) => request.resolve());
  await second;
  assert.equal(loading(), false);
});

for (const ticker of ['NEW', '새국내']) {
  test(`${ticker}: 추가 종목 목록을 조회한 뒤에도 요청 완료 시 공유 로딩을 해제한다`, async () => {
    const { hook, pending, loading } = harness();
    const work = hook.onSearch(ticker);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(loading(), true);
    assert.equal(pending.length, 4);
    pending.forEach((request) => request.resolve());
    await work;
    assert.equal(loading(), false);
  });
}
