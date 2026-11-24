import assert from 'node:assert/strict';
import { koreanIntl } from './intl-mock.ts';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { navigationScroll } from '../lib/navigation-scroll.ts';

function header(initialY = 0, pathname = '/analyze', role?: 'user' | 'admin', viewAsUser = false) {
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
    document: {
      body: {},
      querySelector: () => ({ getBoundingClientRect: () => ({ bottom: 48 }) }),
      documentElement: { scrollHeight: 3000, classList: { add() {}, remove() {} } },
    },
    localStorage: { getItem: () => 'light' },
    ResizeObserver: class { observe() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    require(name: string) {
      if (name === 'next-intl') return koreanIntl;
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
      if (name === 'next/navigation') return { usePathname: () => pathname };
      if (name === 'next-auth/react') return { useSession: () => ({
        status: role ? 'authenticated' : 'unauthenticated',
        data: role ? { user: { role } } : null,
      }) };
      if (name === '@/lib/viewAsUser') return { useViewAsUser: () => viewAsUser };
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
    const header = tree.find(node => 'data-navigation-header' in (node.props ?? {}));
    const identity = tree.find(node => node.props?.className?.includes('navigation-identity'));
    if (identity) identity.props.ref.current = { getBoundingClientRect: () => ({ bottom: 92 - window.scrollY }) };
    return {
      identity: tree.find(node => node.props?.className?.includes('navigation-analysis-identity')),
      header,
      desktopNav: tree.find(node => node.props?.['aria-label'] === '주요 서비스'),
      bottomNav: tree.find(node => node.props?.['aria-label'] === '하단 메뉴'),
      serviceMenus: tree.filter(node => ['추가 서비스', '전체 서비스'].includes(node.props?.['aria-label'])),
      fixedLogo: nodes(header).find(node => node.props?.['aria-label'] === 'idiotquant 홈'),
      identityLogoRow: identity?.props.children,
      title: tree.find(node => 'data-navigation-scroll-title' in (node.props ?? {})),
    };
  }
  render();
  for (const effect of effects) effect();
  return { render, scroll(y: number) { window.scrollY = y; listeners.get('scroll')!(); return render(); } };
}

test('주요 메뉴는 발굴과 분석을 순서대로 표시하고 현재 경로의 항목을 선택한다', () => {
  for (const pathname of ['/screener', '/analyze']) {
    const { desktopNav, bottomNav } = header(0, pathname).render();
    const desktopLinks = desktopNav.props.children[0];
    const bottomTabs = bottomNav.props.children[0];
    assert.deepEqual(Array.from(desktopLinks, (node: any) => node.props.children), ['오늘', '발굴', '분석']);
    assert.deepEqual(Array.from(bottomTabs, (node: any) => node.props.label), ['오늘', '발굴', '분석']);
    assert.equal(desktopLinks.find((node: any) => node.props['aria-current'] === 'page')?.props.href, pathname);
    assert.equal(bottomTabs.find((node: any) => node.props.isActive)?.props.href, pathname);
  }
});

test('데스크톱과 모바일 더 보기에서 기타 서비스는 관리자에게만 표시한다', () => {
  const sessions = [
    { role: undefined, viewAsUser: false },
    { role: 'user', viewAsUser: false },
    { role: 'admin', viewAsUser: false },
    { role: 'admin', viewAsUser: true },
  ] as const;
  for (const { role, viewAsUser } of sessions) {
    const { serviceMenus } = header(0, '/', role, viewAsUser).render();
    assert.equal(serviceMenus.length, 2);
    for (const menu of serviceMenus) {
      const section = (label: string) => menu.props.children.find((item: any) => item.props['aria-label'] === label);
      const linksIn = (item: any) => Array.from(item.props.children[1], (link: any) => link.props.href);
      assert.deepEqual(linksIn(section('종목 리서치')), role ? ['/compare', '/screener?filter=liked'] : ['/compare']);
      const otherServices = section('기타 서비스');
      if (role === 'admin' && !viewAsUser) {
        assert.deepEqual(linksIn(otherServices), ['/calculator', '/etfs', '/ledger', '/games']);
      } else {
        assert.equal(otherServices, undefined);
      }
    }
  }
});

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
  assert.ok(collapsed.fixedLogo.props.className.split(' ').includes('inline-flex'));
  assert.equal(app.scroll(500).identity.props.style.height, 0);
  const restored = app.scroll(0);
  assert.equal(restored.identity.props.style.height, 56);
  assert.equal(restored.title.props.hidden, true);
  assert.ok(restored.fixedLogo.props.className.split(' ').includes('hidden'));
});

test('스크롤 위치를 복원해 진입하면 처음부터 종목 정보를 상단에 표시한다', () => {
  const app = header(300);
  assert.equal(app.render().identity.props.style.height, 0);
  assert.equal(app.render().title.props.hidden, false);
  assert.equal(app.scroll(-10).identity.props.style.height, 56);
});


test('모바일 발굴: 로고·페이지 제목이 시장 탭보다 먼저 표시되고 스크롤 시 상단 요약으로 이어진다', () => {
  const app = header(0, '/screener');
  const initial = app.render();
  const children = initial.header.props.children.flat(Infinity).filter(Boolean);
  const identityIndex = children.findIndex((node: any) => node.props?.className?.includes('navigation-analysis-identity'));
  const tabsIndex = children.findIndex((node: any) => 'data-navigation-tabs' in (node.props ?? {}));
  assert.ok(identityIndex >= 0);
  assert.ok(tabsIndex > identityIndex);
  assert.equal(initial.identity.props.style.height, 56);
  assert.equal(initial.title.props.hidden, true);
  assert.equal(app.scroll(28).identity.props.style.height, 28);
  const scrolled = app.scroll(100);
  assert.equal(scrolled.identity.props.style.height, 0);
  assert.equal(scrolled.title.props.hidden, false);
  assert.equal(app.scroll(0).title.props.hidden, true);
});

test('모바일 발굴: 스크롤을 복원해 돌아와도 고정 요약을 바로 표시한다', () => {
  const app = header(300, '/screener');
  assert.equal(app.render().identity.props.style.height, 0);
  assert.equal(app.render().title.props.hidden, false);
});

test('공통 모바일 헤더: 스크롤로 로고 행이 가려지면 고정 상단에 홈 링크를 표시한다', () => {
  for (const pathname of ['/', '/compare', '/balance']) {
    const app = header(0, pathname);
    assert.ok(app.render().fixedLogo.props.className.split(' ').includes('hidden'));
    const scrolled = app.scroll(44);
    assert.ok(scrolled.fixedLogo.props.className.split(' ').includes('inline-flex'));
    assert.equal(scrolled.identityLogoRow.props['aria-hidden'], true);
    assert.equal(app.scroll(0).identityLogoRow.props['aria-hidden'], undefined);
  }
});

test('모바일 ETF 피드와 게임: 이미 고정 상단에 있는 홈 링크는 스크롤 후에도 표시한다', () => {
  for (const pathname of ['/etfs', '/games']) {
    const app = header(0, pathname);
    assert.ok(app.render().fixedLogo.props.className.split(' ').includes('inline-flex'));
    assert.ok(app.scroll(100).fixedLogo.props.className.split(' ').includes('inline-flex'));
  }
});
