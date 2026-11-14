import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { backSwipe } from '../lib/back-swipe.ts';
import { STOCK_SEARCH_GUIDANCE, type StockSearchPurpose } from '../lib/stock-search-guidance.ts';

function modal(purpose: StockSearchPurpose = 'analyze') {
  let closed = 0;
  const selected: string[] = [];
  const jsx = (type: unknown, props: any) => ({ type, props });
  const output = { exports: {} as any };
  class Element {
    private interactive: boolean;
    constructor(interactive = false) { this.interactive = interactive; }
    closest() { return this.interactive ? this : null; }
  }
  const source = readFileSync(new URL('../components/stock-search-modal.tsx', import.meta.url), 'utf8');
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    module: output, exports: output.exports, Element,
    window: { matchMedia: () => ({ matches: true }) },
    require(name: string) {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return {
        useEffect() {}, useLayoutEffect() {},
        useMemo: (callback: () => unknown) => callback(),
        useRef: (value: unknown) => ({ current: value }),
        useState: (value: unknown) => [value, () => {}],
      };
      if (name === 'lucide-react') return { ChevronLeft: 'ChevronLeft' };
      if (name.endsWith('searchAutoComplete')) return { __esModule: true, default: 'Autocomplete' };
      if (name.endsWith('SearchGuide')) return { SearchGuide: 'Guide' };
      if (name.endsWith('stockSearchData')) return { loadStaticStockData() {} };
      if (name.endsWith('back-swipe')) return { backSwipe };
      if (name.endsWith('stock-search-guidance')) return { STOCK_SEARCH_GUIDANCE };
      throw new Error(`예상하지 못한 import: ${name}`);
    },
  });
  const tree = output.exports.StockSearchModal({
    open: true, label: '종목 검색', purpose, options: ['AAPL'], requireSelection: true,
    onClose: () => closed++, onSelect: (value: string) => selected.push(value), trigger: { current: null },
  });
  function find(type: string, node: any): any {
    if (!node || typeof node !== 'object') return undefined;
    if (node.type === type) return node;
    const children = node.props?.children;
    if (children == null) return undefined;
    for (const child of Array.isArray(children) ? children : [children]) {
      const match = Array.isArray(child) ? child.map(item => find(type, item)).find(Boolean) : find(type, child);
      if (match) return match;
    }
  }
  const target = { clientWidth: 390, dataset: {}, setPointerCapture() {}, style: { setProperty() {} } };
  const event = (x: number, y: number, timeStamp: number, interactive = false, pointerType = 'touch') => ({
    clientX: x, clientY: y, timeStamp, pointerType, pointerId: 1, isPrimary: true,
    target: new Element(interactive), currentTarget: target,
  });
  return { find: (type: string) => find(type, tree), surface: tree.props.children.props, event, closed: () => closed, selected };
}

test('모바일에서 오른쪽으로 충분히 스와이프하면 모달을 닫는다', () => {
  const ui = modal();
  ui.surface.onPointerDownCapture(ui.event(40, 200, 0));
  ui.surface.onPointerMoveCapture(ui.event(180, 207, 400));
  ui.surface.onPointerUpCapture(ui.event(180, 207, 450));
  assert.equal(ui.closed(), 1);
});

for (const [label, endX, endY] of [['세로 스크롤', 50, 350], ['짧은 이동', 65, 205], ['왼쪽 이동', 0, 205], ['대각선 스크롤', 140, 280]] as const) {
  test(`${label}은 모달을 닫지 않는다`, () => {
    const ui = modal();
    ui.surface.onPointerDownCapture(ui.event(40, 200, 0));
    ui.surface.onPointerMoveCapture(ui.event(endX, endY, 400));
    ui.surface.onPointerUpCapture(ui.event(endX, endY, 450));
    assert.equal(ui.closed(), 0);
  });
}

test('입력·선택 요소 위의 드래그, 마우스 드래그와 취소된 제스처는 닫지 않는다', () => {
  for (const [interactive, pointerType] of [[true, 'touch'], [false, 'mouse']] as const) {
    const ui = modal();
    ui.surface.onPointerDownCapture(ui.event(40, 200, 0, interactive, pointerType));
    ui.surface.onPointerUpCapture(ui.event(250, 205, 100));
    assert.equal(ui.closed(), 0);
  }
  const ui = modal();
  ui.surface.onPointerDownCapture(ui.event(40, 200, 0));
  ui.surface.onPointerCancelCapture();
  ui.surface.onPointerUpCapture(ui.event(250, 205, 100));
  assert.equal(ui.closed(), 0);
});

test('빠른 오른쪽 스와이프도 인식하되 짧은 흔들림은 무시한다', () => {
  const start = { x: 0, y: 0, time: 0 };
  assert.equal(backSwipe(start, { x: 60, y: 3, time: 150 }, 390).dismiss, true);
  assert.equal(backSwipe(start, { x: 30, y: 3, time: 150 }, 390).dismiss, false);
});

for (const purpose of Object.keys(STOCK_SEARCH_GUIDANCE) as StockSearchPurpose[]) {
  test(`${purpose}: 해당 페이지 안내와 주의 문구를 표시한다`, () => {
    const ui = modal(purpose);
    assert.equal(ui.find('footer').props.children.props.children, STOCK_SEARCH_GUIDANCE[purpose].note);
    assert.equal(ui.find('Guide').props.showAnalysis, purpose === 'analyze');
    assert.equal(ui.find('Autocomplete').props.placeHolder, STOCK_SEARCH_GUIDANCE[purpose].placeholder);
  });
}

test('뒤로가기와 검색 필드는 같은 상단 행에 있고 닫기 버튼은 선택을 실행하지 않는다', () => {
  const ui = modal();
  const header = ui.find('header');
  assert.equal(header.props.children[0].props['aria-label'], '검색창 닫기');
  assert.equal(header.props.children[1].props.children.type, 'Autocomplete');
  header.props.children[0].props.onClick();
  assert.equal(ui.closed(), 1);
  assert.deepEqual(ui.selected, []);
});
