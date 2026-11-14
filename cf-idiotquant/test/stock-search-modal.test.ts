import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

// 공통 Provider를 실행하고 React 렌더링·라우터 경계만 대체한다.
function harness() {
  const slots: any[] = [];
  let cursor = 0;
  let pathname = '/compare';
  let tree: any;
  const routes: string[] = [];
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useContext: () => tree.props.value,
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value: any) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback: (callback: unknown) => callback,
    useMemo: (callback: () => unknown) => callback(),
  };
  const source = readFileSync(new URL('../components/stock-search-provider.tsx', import.meta.url), 'utf8');
  const script = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const output = { exports: {} as any };
  class HTMLElement {}
  runInNewContext(script, {
    module: output, exports: output.exports, HTMLElement, document: { activeElement: new HTMLElement() },
    require(name: string) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react-dom') return { flushSync: (callback: () => void) => { callback(); render(); } };
      if (name === 'next/navigation') return { usePathname: () => pathname, useRouter: () => ({ push: (url: string) => routes.push(url) }) };
      if (name === 'lucide-react') return { Search: 'Search' };
      if (name.endsWith('stock-search-modal')) return { StockSearchModal: 'Modal' };
      throw new Error(`예상하지 못한 import: ${name}`);
    },
  });
  function render() {
    cursor = 0;
    tree = output.exports.StockSearchProvider({ children: 'page' });
  }
  render();
  return {
    render, routes,
    context: () => tree.props.value,
    modal: () => tree.props.children[1].props,
    route: (value: string) => { pathname = value; render(); },
  };
}

for (const label of ['종목 검색', '비교할 종목 검색', '발굴 종목 검색', '잔고 종목 검색', '티커 매핑 검색']) {
  test(`${label}: 선택은 모달을 닫은 뒤 현재 페이지 콜백으로 전달한다`, () => {
    const app = harness();
    const selected: string[] = [];
    app.context().register({ label, onSelect(value: string) { assert.equal(app.modal().open, false); selected.push(value); } });
    app.render();
    app.context().openSearch();
    assert.equal(app.modal().open, true);
    assert.equal(app.modal().label, label);
    app.modal().onSelect('SK하이닉스');
    assert.deepEqual(selected, ['SK하이닉스']);
    assert.deepEqual(app.routes, []);
  });
}

test('페이지가 등록되지 않은 곳에서는 분석 주소로 이동한다', () => {
  const app = harness();
  app.context().openSearch();
  app.modal().onSelect('삼성전자');
  assert.deepEqual(app.routes, [`/analyze?ticker=${encodeURIComponent('삼성전자')}`]);
});

test('이전 페이지의 늦은 해제는 새 페이지 검색 설정을 지우지 않는다', () => {
  const app = harness();
  const oldCleanup = app.context().register({ label: '이전', onSelect() {} });
  const cleanup = app.context().register({ label: '현재', market: 'US', options: ['AAPL'], onSelect() {} });
  oldCleanup();
  app.render();
  assert.equal(app.modal().label, '현재');
  assert.equal(app.modal().market, 'US');
  assert.equal(app.modal().options[0], 'AAPL');
  cleanup();
  app.render();
  app.modal().onSelect('AAPL');
  assert.deepEqual(app.routes, ['/analyze?ticker=AAPL']);
});

test('작업 중이거나 한도에 도달해도 가이드는 열리고 선택 실행은 막는다', () => {
  const app = harness();
  let selected = false;
  app.context().register({ disabled: true, onSelect() { selected = true; } });
  app.render();
  app.context().openSearch();
  app.modal().onSelect('AAPL');
  assert.equal(app.modal().open, true);
  assert.equal(selected, false);
});

test('닫기는 선택을 실행하지 않고, 페이지 이동 시 열린 모달을 닫는다', () => {
  const app = harness();
  app.context().openSearch();
  app.modal().onClose();
  app.render();
  assert.equal(app.modal().open, false);
  assert.deepEqual(app.routes, []);
  app.context().openSearch();
  app.route('/screener');
  assert.equal(app.modal().open, false);
});

test('페이지가 다시 렌더링되면 최신 선택 함수를 사용하고 해제 시 등록을 정리한다', () => {
  const effects: { deps: unknown[]; cleanup?: () => void }[] = [];
  let index = 0;
  let registered: any;
  let registrations = 0;
  const callbackRef = { current: undefined as unknown };
  const selected: string[] = [];
  const register = (value: unknown) => {
    registered = value;
    registrations++;
    return () => { registered = undefined; };
  };
  const output = { exports: {} as any };
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const script = ts.transpileModule(readFileSync(new URL('../components/page-search.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(script, {
    module: output, exports: output.exports,
    require(name: string) {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'lucide-react') return { Search: 'Search' };
      if (name.endsWith('stock-search-provider')) return { useStockSearchModal: () => ({ register, openSearch() {} }) };
      if (name === 'react') return {
        useRef: () => callbackRef,
        useLayoutEffect(callback: () => (() => void) | undefined, deps: unknown[]) {
          const effectIndex = index++;
          const previous = effects[effectIndex];
          if (previous && deps.every((dep, i) => dep === previous.deps[i])) return;
          previous?.cleanup?.();
          effects[effectIndex] = { deps, cleanup: callback() };
        },
      };
      throw new Error(`예상하지 못한 import: ${name}`);
    },
  });
  output.exports.PageSearch({ onSelect: (value: string) => selected.push(`old:${value}`) });
  index = 0;
  output.exports.PageSearch({ onSelect: (value: string) => selected.push(`new:${value}`) });
  registered.onSelect('AAPL');
  assert.deepEqual(selected, ['new:AAPL']);
  assert.equal(registrations, 1);
  for (const effect of effects) effect.cleanup?.();
  assert.equal(registered, undefined);
});
