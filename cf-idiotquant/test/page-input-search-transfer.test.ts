import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function navigationHarness(pathname: string) {
  let onClick: (event: unknown) => void;
  let transfer: () => void;
  let effectIndex = 0;
  let opened = false;
  let temporary: any;
  let removed = false;
  let focused = '';
  let disconnected = false;
  const location = { pathname, href: `https://example.com${pathname}`, origin: 'https://example.com' };
  class Element {
    getClientRects() { return [{}]; }
    closest() { return null; }
  }
  class Input extends Element {
    storedValue = '';
    get value() { return this.storedValue; }
    set value(value: string) { this.storedValue = value; }
    style = {};
    setAttribute() {}
    dispatchEvent() {}
    focus() { focused = this === temporary ? 'temporary' : 'search'; }
    remove() { removed = true; }
  }
  const input = new Input();
  const trigger = new class extends Element {
    getAttribute() { return String(opened); }
    click() { opened = true; }
  }();
  const document = {
    body: { append() {} },
    addEventListener(name: string, handler: any) { if (name === 'click') onClick = handler; },
    removeEventListener() {},
    createElement() { temporary = new Input(); return temporary; },
    querySelector(selector: string) {
      if (selector === '[data-page-search-trigger]') return trigger;
      return opened ? input : null;
    },
  };
  const source = readFileSync(new URL('../components/page-input-shortcuts.tsx', import.meta.url), 'utf8');
  const output = { exports: {} as any };
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    module: output, exports: output.exports, document, Element, HTMLElement: Element, HTMLInputElement: Input,
    URL, Event, getComputedStyle: () => ({ visibility: 'visible' }),
    window: { location, matchMedia: () => ({ matches: true }) },
    setTimeout: () => 1, clearTimeout() {},
    MutationObserver: class {
      constructor(callback: () => void) { transfer = callback; }
      observe() {}
      disconnect() { disconnected = true; }
    },
    require(name: string) {
      if (name === 'react') return { useEffect(callback: () => void) { if (effectIndex++ === 0) callback(); } };
      if (name === 'next/navigation') return { usePathname: () => pathname };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  output.exports.default();
  return {
    click(href = '/analyze') {
      const link = { href: `https://example.com${href}`, hasAttribute: () => false };
      const target = new class extends Element { closest() { return link as any; } }();
      onClick({ target, button: 0 });
    },
    arrive() { location.pathname = '/analyze'; transfer(); },
    type(value: string) { temporary.value = value; },
    state: () => ({ opened, focused, removed, disconnected, query: input.value, temporary: Boolean(temporary) }),
  };
}

test('모바일 분석 메뉴 이동 후 모달을 열고 임시 입력과 포커스를 실제 검색창으로 전달한다', () => {
  const app = navigationHarness('/screener');
  app.click();
  assert.equal(app.state().focused, 'temporary');
  app.type('삼성');
  app.arrive();
  assert.deepEqual(app.state(), {
    opened: true, focused: 'search', removed: true, disconnected: true, query: '삼성', temporary: true,
  });
});

test('이미 분석 화면이면 숨김 입력을 만들지 않고 검색 모달을 즉시 연다', () => {
  const app = navigationHarness('/analyze');
  app.click();
  assert.equal(app.state().opened, true);
  assert.equal(app.state().focused, 'search');
  assert.equal(app.state().temporary, false);
});

test('특정 종목으로 이동할 때는 검색 모달이나 임시 키보드를 열지 않는다', () => {
  const app = navigationHarness('/screener');
  app.click('/analyze?ticker=AAPL');
  assert.equal(app.state().opened, false);
  assert.equal(app.state().temporary, false);
});
