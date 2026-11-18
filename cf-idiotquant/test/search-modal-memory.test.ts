import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { STOCK_SEARCH_GUIDANCE } from '../lib/stock-search-guidance.ts';
import { backSwipe } from '../lib/back-swipe.ts';

function harness(options?: string[]) {
  const slots: any[] = [];
  let cursor = 0;
  let tree: any;
  const selected: string[] = [];
  const props = { open: true, label: '종목 검색', options, requireSelection: true, disabled: false, onSelect: (value: string) => selected.push(value), onClose() {}, trigger: { current: null } };
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const output = { exports: {} as any };
  runInNewContext(ts.transpileModule(readFileSync(new URL('../components/stock-search-modal.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports: output.exports, module: output,
    require(name: string) {
      if (name === 'react') return {
        useState(initial: unknown) {
          const index = cursor++;
          if (!(index in slots)) slots[index] = initial;
          return [slots[index], (value: any) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
        },
        useRef: () => ({ current: null }), useEffect() {}, useLayoutEffect() {},
        useMemo: (callback: () => unknown) => callback(),
      };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'lucide-react') return { X: 'X' };
      if (name.endsWith('searchAutoComplete')) return { __esModule: true, default: 'Autocomplete' };
      if (name.endsWith('SearchGuide')) return { SearchGuide: 'Guide' };
      if (name.endsWith('stockSearchData')) return { loadStaticStockData() { throw new Error('Unexpected load'); } };
      if (name.endsWith('stock-search-guidance')) return { STOCK_SEARCH_GUIDANCE };
      if (name.endsWith('back-swipe')) return { backSwipe };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  function render() { cursor = 0; tree = output.exports.StockSearchModal(props); }
  function walk(node: any): any[] {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(walk);
    return [node, ...walk(node.props?.children)];
  }
  const nodes = () => walk(tree);
  const autocomplete = () => nodes().find(node => node.type === 'Autocomplete').props;
  render();
  return {
    selected, nodes,
    choose(value: string) { autocomplete().onSearchButton(value); render(); },
    type(value: string) { autocomplete().onQueryChange(value); render(); },
    setOptions(value: string[]) { props.options = value; render(); },
    disable() { props.disabled = true; render(); },
    click(label: string) { nodes().find(node => node.type === 'button' && node.props.children === label).props.onClick(); render(); },
    recent: () => nodes().filter(node => node.type === 'li').map(node => node.props.children.props.children),
  };
}

test('최근 검색은 중복 없이 최신 5개를 보여주며 다시 선택하거나 지울 수 있다', () => {
  const app = harness(['A', 'B', 'C', 'D', 'E', 'F']);
  for (const value of ['A', 'B', 'C', 'D', 'E', 'F', 'C']) app.choose(value);
  assert.deepEqual(app.recent(), ['C', 'F', 'E', 'D', 'B']);
  app.click('F');
  assert.equal(app.selected.at(-1), 'F');
  assert.deepEqual(app.recent(), ['F', 'C', 'E', 'D', 'B']);
  app.click('기록 지우기');
  assert.deepEqual(app.recent(), []);
});

test('현재 허용 목록 밖의 최근 검색과 선택 제한 중의 최근 검색은 숨긴다', () => {
  const app = harness(['AAPL', '삼성전자']);
  app.choose('AAPL');
  app.choose('삼성전자');
  app.setOptions(['AAPL']);
  assert.deepEqual(app.recent(), ['AAPL']);
  app.choose('삼성전자');
  assert.deepEqual(app.selected, ['AAPL', '삼성전자']);
  app.disable();
  assert.deepEqual(app.recent(), []);
});

test('입력 중에는 최근 검색과 예시 가이드를 숨겨 자동완성 후보에 집중한다', () => {
  const app = harness(['AAPL']);
  app.choose('AAPL');
  app.type('AA');
  assert.deepEqual(app.recent(), []);
  app.type('');
  assert.deepEqual(app.recent(), ['AAPL']);
  const general = harness();
  assert.ok(general.nodes().some(node => node.type === 'Guide'));
  general.type('AA');
  assert.ok(!general.nodes().some(node => node.type === 'Guide'));
});
