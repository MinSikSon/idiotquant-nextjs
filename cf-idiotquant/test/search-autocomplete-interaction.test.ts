import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { buildStockSearchIndex, findStockSuggestions } from '../lib/utils/stockSuggestions.ts';

function harness(extra: Record<string, unknown> = {}) {
  const slots: any[] = [];
  let cursor = 0;
  const selected: string[] = [];
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const output = { exports: {} as any };
  const script = ts.transpileModule(readFileSync(new URL('../components/searchAutoComplete.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(script, {
    exports: output.exports, module: output,
    require(name: string) {
      if (name === 'react') return {
        useState(initial: unknown) {
          const index = cursor++;
          if (!(index in slots)) slots[index] = initial;
          return [slots[index], (value: any) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
        },
        useMemo: (callback: () => unknown) => callback(),
        useEffect() {},
        useRef: () => ({ current: null }),
        useId: () => 'search-test',
      };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react-dom') return { createPortal: (children: unknown) => children };
      if (name === '@/lib/ui-controls') return { CONTROL_ICON_BUTTON_CLS: '' };
      if (name === '@/components/pageHeader') return { PAGE_PRIMARY_ACTION_CLS: '' };
      if (name === '@/lib/utils/stockSuggestions') return { buildStockSearchIndex, findStockSuggestions };
      if (name === '@/lib/utils') return { cn: (...values: unknown[]) => values.filter(Boolean).join(' ') };
      if (name === 'lucide-react') return { Search: 'Search', CornerDownLeft: 'Enter', X: 'X' };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  let tree: any;
  const props = { validCorpNameArray: ['삼성전자', '삼성전기', 'AAPL'], onSearchButton: (value: string) => selected.push(value), ...extra };
  function render() { cursor = 0; tree = output.exports.default(props); }
  function nodes(node: any): any[] {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(item => nodes(item));
    return [node, ...nodes(node.props?.children)];
  }
  function input() { return nodes(tree).find(node => node.type === 'input').props; }
  render();
  return {
    selected, nodes: () => nodes(tree),
    type(value: string) { input().onChange({ target: { value } }); render(); },
    key(key: string, composing = false) {
      let prevented = false;
      input().onKeyDown({ key, nativeEvent: { isComposing: composing }, preventDefault() { prevented = true; }, stopPropagation() {} });
      render();
      return prevented;
    },
    input,
    search: () => nodes(tree).find(node => node.type === 'button' && node.props.children === '검색').props,
    setOptions(value: string[]) { props.validCorpNameArray = value; render(); },
  };
}

test('입력 직후 Enter와 검색 버튼은 첫 후보 대신 입력한 검색어를 전달한다', () => {
  for (const method of ['enter', 'click']) {
    const app = harness();
    app.type('삼성');
    assert.equal(app.input()['aria-activedescendant'], undefined);
    if (method === 'enter') app.key('Enter');
    else app.search().onClick();
    assert.deepEqual(app.selected, ['삼성']);
  }
});

test('방향키로 명시적으로 고른 후보를 Enter로 검색하고 입력 변경 시 선택을 초기화한다', () => {
  const app = harness();
  app.type('삼성');
  app.key('ArrowDown');
  assert.equal(app.input()['aria-activedescendant'], 'search-test-suggestion-0');
  app.key('Enter');
  assert.deepEqual(app.selected, ['삼성전자']);
  app.type('AAP');
  assert.equal(app.input()['aria-activedescendant'], undefined);
  app.key('Enter');
  assert.deepEqual(app.selected, ['삼성전자', 'AAP']);
});

test('한글 조합 Enter는 검색하지 않고 Escape는 후보만 닫고 검색어를 유지한다', () => {
  const app = harness();
  app.type('삼성');
  app.key('Enter', true);
  assert.deepEqual(app.selected, []);
  app.key('ArrowDown');
  assert.equal(app.key('Escape'), true);
  assert.equal(app.input()['aria-expanded'], false);
  assert.equal(app.input().value, '삼성');
  assert.equal(app.input()['aria-activedescendant'], undefined);
});

test('제한 목록에서는 불일치 입력을 막고 후보 터치와 대소문자 무관한 정확한 입력을 허용한다', () => {
  const app = harness({ selectionRequired: true });
  app.type('없는종목');
  assert.equal(app.search().disabled, true);
  app.key('Enter');
  assert.deepEqual(app.selected, []);
  app.type('삼성');
  app.nodes().find(node => node.props?.role === 'option').props.onClick();
  assert.deepEqual(app.selected, ['삼성전자']);
  app.type('aapl');
  assert.equal(app.search().disabled, false);
  app.key('Enter');
  assert.deepEqual(app.selected, ['삼성전자', 'aapl']);
});

test('작업 중에는 입력과 검색 버튼 및 콜백을 비활성화한다', () => {
  const app = harness({ disabled: true });
  app.type('AAPL');
  assert.equal(app.input().disabled, true);
  assert.equal(app.search().disabled, true);
  app.key('Enter');
  assert.deepEqual(app.selected, []);
});


test('정확한 미국 회사명은 기존 이름 검색처럼 티커로 전달한다', () => {
  const app = harness({ stockNames: [{ symbol: 'AAPL', name: 'APPLE INC', koreanName: '애플' }] });
  app.type('애플');
  app.key('Enter');
  assert.deepEqual(app.selected, ['AAPL']);
});
