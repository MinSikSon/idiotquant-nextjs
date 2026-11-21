import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as filters from '@/app/(screener)/screener/filters';
import * as strategies from '@/lib/constants/strategies';
import * as worldcup from '@/app/(screener)/screener/worldcup';
import * as investmentFlow from '@/lib/investmentFlow';

// 페이지의 필터·결과·이벤트를 실행하고 React/세션/네트워크 경계만 대체한다.
function screen(query = '', loggedIn = false, savedFilters = {}) {
  const states: any[] = [];
  let cursor = 0;
  const pushes: string[] = [];
  const requests: any[] = [];
  const effects: (() => unknown)[] = [];
  const items = Array.from({ length: 45 }, (_, index) => ({
    ticker: String(index).padStart(6, '0'), name: `종목 ${index}`,
    ncav_ratio: 45 - index, pbr: index < 20 ? 2 : 0.5, per: 10,
    eps: 100, bps: 1000, market: 'KOSPI', sector: '제조', strategies: [],
  }));
  const element = (type: any, props: any) => ({ type, props });
  const stub = new Proxy({}, { get: (_, name) => name === '__esModule' ? true : String(name) });
  const modules: Record<string, any> = {
    react: {
      memo: (component: any) => component, Suspense: 'Suspense',
      useMemo: (fn: () => unknown) => fn(), useCallback: (fn: unknown) => fn,
      useEffect: (fn: () => unknown) => effects.push(fn),
      useState: (initial: any) => {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
        return [states[index], (value: any) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      },
    },
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'Fragment' },
    'next/navigation': { useRouter: () => ({ push: (url: string) => pushes.push(url) }), useSearchParams: () => new URLSearchParams(query) },
    'next-auth/react': { useSession: () => ({ data: loggedIn ? { user: { id: 'user' } } : null, status: loggedIn ? 'authenticated' : 'unauthenticated' }) },
    '@/lib/investmentFlow': investmentFlow,
    '@/lib/viewAsUser': { useViewAsUser: () => false },
    '@/lib/hooks': {
      useAppDispatch: () => (request: unknown) => requests.push(request),
      useAppSelector: (selector: string) => ({
        selectNcavDailyList: { list: items, state: 'fulfilled', country: 'KR', scanDate: '20261118' },
        selectLikedTickers: [], selectLikedList: [], selectLikesState: 'fulfilled',
      } as Record<string, unknown>)[selector],
    },
    '@/lib/features/algorithmTrade/algorithmTradeSlice': { selectNcavDailyList: 'selectNcavDailyList', reqGetNcavDailyList: (args: unknown) => ({ scan: args }) },
    '@/lib/utils': { cn: (...args: unknown[]) => args.filter(Boolean).join(' ') },
    '@/lib/utils/scanFinancials': { scanTradingAmount: () => 0 },
    '@/lib/constants/strategies': strategies,
    './filters': filters,
    './worldcup': worldcup,
    './components/LiquidityBadge': { LiquidityBadge: 'LiquidityBadge', w52Position: () => null },
    '@/components/research/FactorWorkbench': { __esModule: true, default: 'FactorWorkbench' },
    './components/GroupedResults': { GroupedResults: 'GroupedResults', buildGroups: (rows: unknown[], mode: string) => mode === 'none' ? null : [{ key: 'group', items: rows }], defaultOpenGroups: () => new Set() },
  };
  const source = readFileSync(new URL('../app/(screener)/screener/page.tsx', import.meta.url), 'utf8');
  const script = ts.transpileModule(`${source}\nexport { ScreenerContent };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const output = { exports: {} as { ScreenerContent: () => any } };
  runInNewContext(script, {
    module: output, exports: output.exports, URLSearchParams, console,
    window: { location: { search: query } },
    localStorage: { getItem: (key: string) => key === 'screener:filters' ? JSON.stringify(savedFilters) : null },
    require: (name: string) => modules[name] ?? stub,
  });
  let nodes: any[] = [];
  function render() {
    cursor = 0;
    effects.length = 0;
    nodes = [];
    function visit(node: any) {
      if (Array.isArray(node)) { node.forEach(visit); return; }
      if (!node || typeof node !== 'object') return;
      nodes.push(node);
      visit(node.props?.children);
    }
    visit(output.exports.ScreenerContent());
  }
  render();
  return { render, pushes, requests, effects, nodes: () => nodes, find: (type: string) => nodes.find(node => node.type === type) };
}

test('비로그인도 전체 종목을 필터·정렬한 상위 10개를 보고 현재 조건을 공유한다', () => {
  const page = screen('maxpbr=1&sort=ncav_ratio&order=asc&view=card');
  page.effects.slice(0, 4).forEach(effect => effect());
  assert.equal(page.requests.length, 1);
  assert.equal(page.requests[0].scan.limit, undefined);
  const cards = page.nodes().filter(node => node.type === 'StockGridCard');
  assert.equal(cards.length, 10);
  assert.equal(cards[0].props.item.ticker, '000044');
  assert.equal(cards[9].props.item.ticker, '000035');
  const shareUrl = new URL(page.find('PageHeader').props.share.path, 'https://idiotquant.com');
  for (const [key, value] of Object.entries({ maxpbr: '1', order: 'asc', from: 'share' })) {
    assert.equal(shareUrl.searchParams.get(key), value);
  }
  assert.equal(shareUrl.searchParams.get('sort'), null, '기본 정렬은 짧은 주소에서 생략한다');
  const reopened = screen(shareUrl.search.slice(1), false, { country: 'US', view: 'table', maxpbr: 0 });
  assert.equal(reopened.nodes().filter(node => node.type === 'StockGridCard')[0].props.item.ticker, '000044');
  assert.equal(page.find('FactorWorkbench'), undefined);
  const filterButton = page.nodes().find(node => node.type === 'button' && node.props.children?.some?.((child: any) => child === '필터'));
  filterButton.props.onClick();
  page.render();
  assert.ok(page.nodes().some(node => node.props?.['aria-label'] === '상세 필터'));
  assert.equal(page.pushes.length, 0);
  page.nodes().find(node => node.type === 'button' && node.props.children === '결과 해석').props.onClick();
  page.render();
  assert.equal(page.find('ResultSummary').props.list.length, 10);
});

test('묶어 보기와 저장된 관심 필터로 비로그인 제한을 벗어나거나 빈 목록이 되지 않는다', () => {
  const page = screen('group=sector&filter=liked');
  assert.equal(page.find('PageHeader').props.title, '종목 발굴');
  assert.equal(page.find('GroupedResults').props.groups[0].items.length, 10);
  const shareUrl = new URL(page.find('PageHeader').props.share.path, 'https://idiotquant.com');
  assert.equal(shareUrl.searchParams.get('filter'), null);
  assert.equal(shareUrl.searchParams.get('group'), 'sector');
});

test('로그인 사용자는 전체 목록의 묶기와 팩터 실험실을 유지한다', () => {
  const page = screen('group=sector', true);
  assert.equal(page.find('GroupedResults').props.groups[0].items.length, 45);
  assert.equal(page.find('FactorWorkbench').props.items.length, 45);
});

test('비로그인 비교는 4종목까지 선택한다', () => {
  const page = screen();
  page.nodes().find(node => node.type === 'button' && node.props.children === '비교할 종목 선택').props.onClick();
  page.render();
  for (let index = 0; index < 4; index++) {
    page.nodes().filter(node => node.type === 'StockGridCard')[index].props.comparison.toggle();
    page.render();
  }
  const cards = page.nodes().filter(node => node.type === 'StockGridCard');
  assert.equal(cards[4].props.comparison.disabled, true);
  assert.equal(cards[0].props.comparison.disabled, false);
  cards[4].props.comparison.toggle();
  page.render();
  assert.equal(page.nodes().filter(node => node.type === 'StockGridCard' && node.props.comparison.selected).length, 4);
});


test('짧은 월드컵 링크로 들어오면 선택 결과와 필터를 복원하고 복귀 주소도 짧게 유지한다', () => {
  const page = screen('w=kaabu', false, { maxper: 5, sectors: ['없는 업종'], filter: 'liked', country: 'US' });
  assert.deepEqual(Array.from(page.find('FilterWorldcup').props.initialAnswers), ['a', 'a', 'b', 'unknown']);
  assert.equal(page.find('FilterWorldcup').props.country, 'KR');
  assert.equal(page.find('FilterWorldcup').props.previewCount(worldcup.worldcupFilters(['a', 'a', 'b', 'unknown'], 'KR')), 45);
  assert.equal(page.find('PageHeader').props.share.path, '/screener?w=kaabu');
  page.find('FilterWorldcup').props.onSharePathChange('/screener?w=kbbbb');
  page.render();
  assert.equal(page.find('PageHeader').props.share.path, '/screener?w=kbbbb');
  const applied = screen('w=kaabu&from=share');
  assert.equal(applied.nodes().find(node => node.props?.['aria-label'] === '필터 설정 방식').props.children[1].props['aria-pressed'], true);
  assert.equal(applied.find('PageHeader').props.share.path, '/screener?w=kaabu&from=share');
  assert.equal(page.nodes().find(node => node.props?.['aria-label'] === '필터 설정 방식').props.children[0].props['aria-pressed'], true);
});
