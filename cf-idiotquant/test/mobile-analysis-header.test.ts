import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { navigationScroll } from '../lib/navigation-scroll.ts';

function header(initialY = 0) {
  const states: unknown[] = [];
  let cursor = 0;
  let effects: (() => unknown)[] = [];
  const listeners = new Map<string, () => void>();
  const window = {
    scrollY: initialY, innerHeight: 800,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
    addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
    removeEventListener: (name: string) => listeners.delete(name),
  };
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const output = { exports: {} as any };
  const script = ts.transpileModule(readFileSync(new URL('../components/navigation.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(script, {
    exports: output.exports, module: output, window, process: { env: {} },
    document: { body: {}, querySelector: () => null, documentElement: { scrollHeight: 3000, classList: { add() {}, remove() {} } } },
    localStorage: { getItem: () => 'light' },
    ResizeObserver: class { observe() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    require(name: string) {
      if (name === 'react') return {
        useState(initial: unknown) {
          const index = cursor++;
          if (!(index in states)) states[index] = initial;
          return [states[index], (value: any) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
        },
        useRef(initial: unknown) {
          const index = cursor++;
          if (!(index in states)) states[index] = { current: initial };
          return states[index];
        },
        useEffect: (callback: () => unknown) => effects.push(callback),
      };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'next/navigation') return { usePathname: () => '/analyze' };
      if (name === 'next-auth/react') return { useSession: () => ({ status: 'unauthenticated' }) };
      if (name === '@/lib/viewAsUser') return { useViewAsUser: () => false };
      if (name === '@/lib/utils') return { cn: (...values: unknown[]) => values.filter(Boolean).join(' ') };
      if (name === '@/lib/navigation-scroll') return { navigationScroll };
      if (name === '@/components/mobile-page-header') return { useMobilePageHeader: () => ({ active: true }) };
      return {};
    },
  });
  const nodes = (node: any): any[] => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  function render() {
    cursor = 0;
    effects = [];
    const tree = nodes(output.exports.default());
    return {
      identity: tree.find(node => node.props?.className?.includes('navigation-analysis-identity')),
      title: tree.find(node => 'data-navigation-scroll-title' in (node.props ?? {})),
    };
  }
  render();
  for (const effect of effects) effect();
  return { render, scroll(y: number) { window.scrollY = y; listeners.get('scroll')!(); return render(); } };
}

test('모바일 분석: 로고 행이 스크롤만큼 접히고 종목 정보가 고정 상단으로 이동한다', () => {
  const app = header();
  assert.equal(app.render().identity.props.style.height, 56);
  assert.equal(app.render().title.props.hidden, true);
  const halfway = app.scroll(28);
  assert.equal(halfway.identity.props.style.height, 28);
  assert.equal(halfway.title.props.hidden, true);
  const collapsed = app.scroll(56);
  assert.equal(collapsed.identity.props.style.height, 0);
  assert.equal(collapsed.title.props.hidden, false);
  assert.equal(app.scroll(500).identity.props.style.height, 0);
  const restored = app.scroll(0);
  assert.equal(restored.identity.props.style.height, 56);
  assert.equal(restored.title.props.hidden, true);
});

test('스크롤 위치를 복원해 진입하면 처음부터 종목 정보를 상단에 표시한다', () => {
  const app = header(300);
  assert.equal(app.render().identity.props.style.height, 0);
  assert.equal(app.render().title.props.hidden, false);
  assert.equal(app.scroll(-10).identity.props.style.height, 56);
});
