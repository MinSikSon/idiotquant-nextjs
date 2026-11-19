import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as changes from '../lib/features/stockLikes/changes.ts';
import { scanValuationSummary } from '../lib/utils/valuationSummary.ts';

const item = { ticker: '005930', stock_name: '삼성전자', is_us: 0, scan_date: '20261115', strategies: ['ncav'], last_price: 66000, per: 10, pbr: 1, ncav_ratio: 1.2, eps: 1000, bps: 5000, current_assets: 200, total_liabilities: 100, lstn_stcn: 1000000 };
const baseline = { revision: 1, confirmedAt: 1, items: [{ ...changes.watchSnapshot([item])[0], price: 60000, scanDate: '20261114' }] };
const source = ts.transpileModule(readFileSync(new URL('../components/home-watchlist.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

// 홈 컴포넌트를 실행하고 네트워크와 React 상태 경계만 제어한다.
function harness(initialBaseline = baseline, sampleRoot = false) {
    const slots: any[] = [];
    let cursor = 0;
    let tree: any;
    const effects: (() => unknown)[] = [];
    const listeners = new Map<string, () => void>();
    const posts: any[] = [];
    let saved = structuredClone(initialBaseline);
    let failure = 0;
    let sample = async (): Promise<any> => ({ items: [item], failed: 0 });
    let get = async (): Promise<any> => ({ success: true, data: { items: [item], baseline: saved } });
    const equal = (a: any[], b: any[]) => a?.length === b?.length && a.every((value, index) => value === b[index]);
    const memo = (fn: () => unknown, deps: any[]) => {
        const index = cursor++;
        if (!slots[index] || !equal(slots[index].deps, deps)) slots[index] = { value: fn(), deps };
        return slots[index].value;
    };
    const react = {
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
        useMemo: memo,
        useCallback: (fn: () => unknown, deps: any[]) => memo(() => fn, deps),
        useEffect(fn: () => unknown, deps: any[]) {
            const index = cursor++;
            if (!slots[index] || !equal(slots[index], deps)) { slots[index] = deps; effects.push(fn); }
        },
    };
    const jsx = (type: any, props: unknown): any => typeof type === 'function' ? type(props) : ({ type, props });
    const output = { exports: {} as { HomeWatchlist: () => any; WatchlistSample: () => any } };
    runInNewContext(source, { exports: output.exports, module: output,
        window: { addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) },
        require(name: string) {
            if (name === 'react') return react;
            if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
            if (name === 'next/link') return { __esModule: true, default: 'a' };
            if (name === 'lucide-react') return {};
            if (name.endsWith('/valuationSummary')) return { scanValuationSummary };
            if (name.endsWith('/sample')) return { getWatchlistSample: () => sample() };
            if (name.endsWith('/changes')) return changes;
            if (name.endsWith('/investmentFlow')) return { analysisHref: (ticker: string) => `/analyze?ticker=${ticker}`, WATCHLIST_HREF: '/screener?filter=liked' };
            if (name.endsWith('/strategies')) return { STRATEGY_LABEL: {} };
            if (name.endsWith('/stock-search-provider')) return { useStockSearchModal: () => ({ openSearch() {} }) };
            if (name.endsWith('/review')) return {
                getWatchReview: () => get(),
                confirmWatchReview: async (revision: number, items: any[]) => {
                    posts.push({ revision, items });
                    if (failure) {
                        if (failure === 409) saved = { ...saved, revision: saved.revision + 1 };
                        return { success: false, status: failure, error: '저장 실패' };
                    }
                    saved = { revision: revision + 1, confirmedAt: 2, items };
                    return { success: true, data: saved };
                },
            };
            throw new Error(`Unexpected module: ${name}`);
        },
    });
    const render = () => { cursor = 0; tree = sampleRoot ? output.exports.WatchlistSample() : output.exports.HomeWatchlist(); return tree; };
    const text = (node: any): string => node == null || typeof node === 'boolean' ? ''
        : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : typeof node.type === 'function' ? text(node.type(node.props)) : text(node.props?.children);
    const nodes = (node: any): any[] => node == null || typeof node !== 'object' ? []
        : Array.isArray(node) ? node.flatMap(nodes) : typeof node.type === 'function' ? nodes(node.type(node.props)) : [node, ...nodes(node.props?.children)];
    const settle = async () => { do { while (effects.length) effects.shift()!(); await new Promise(resolve => setImmediate(resolve)); render(); } while (effects.length); };
    const button = () => nodes(tree).find(node => node.type === 'button' && text(node).includes('확인 완료'));
    render();
    return { render, settle, text: () => text(tree), nodes: () => nodes(tree), button, posts,
        focus: () => listeners.get('focus')?.(), fail: (status: number) => { failure = status; },
        saved: () => saved,
        getWith: (fn: typeof get) => { get = fn; },
        sampleWith: (fn: typeof sample) => { sample = fn; },
    };
}

test('홈은 변화 확인과 수동 새로고침 없이 관심종목을 바로 보여준다', async () => {
    const h = harness();
    await h.settle();
    assert.match(h.text(), /내 관심종목 · 1/);
    assert.match(h.text(), /삼성전자/);
    assert.doesNotMatch(h.text(), /지난 확인|확인 완료|새로고침|내 관심종목, 매일 짧게/);
    assert.equal(h.nodes().find(node => node.type === 'section').props['aria-labelledby'], 'watchlist-title');
    h.focus(); await h.settle();
    assert.equal(h.posts.length, 0);
    assert.equal(h.saved().revision, 1);
});

test('조회 실패 시에만 재시도 버튼을 보여주고 목록을 복구한다', async () => {
    const h = harness();
    h.getWith(async () => ({ success: false, error: '조회 실패' }));
    await h.settle();
    assert.match(h.text(), /조회 실패/);
    h.getWith(async () => ({ success: true, data: { items: [item], baseline } }));
    h.nodes().find(node => node.type === 'button').props.onClick();
    await h.settle();
    assert.match(h.text(), /삼성전자/);
    assert.doesNotMatch(h.text(), /조회 실패|다시 불러오기/);
});

test('늦게 도착한 이전 조회는 새 응답을 덮어쓰지 못한다', async () => {
    const h = harness(); await h.settle();
    const pending: ((value: any) => void)[] = [];
    h.getWith(() => new Promise(resolve => pending.push(resolve)));
    h.focus(); h.render();
    h.focus();
    pending[1]({ success: true, data: { items: [{ ...item, last_price: 70000 }], baseline } });
    await h.settle();
    pending[0]({ success: true, data: { items: [item], baseline } });
    await h.settle();
    assert.match(h.text(), /₩70,000/);
    assert.doesNotMatch(h.text(), /₩66,000/);
    assert.equal(h.posts.length, 0);
});


test('빈 관심목록에는 저장 동작 없는 실제 데이터 예시를 보여준다', async () => {
    const h = harness();
    h.getWith(async () => ({ success: true, data: { items: [], baseline } }));
    await h.settle();
    assert.match(h.text(), /실제 스캔 데이터/);
    assert.match(h.text(), /전략별 적정주가/);
    assert.match(h.text(), /PER 10배₩10,000/);
    assert.doesNotMatch(h.text(), /최근 두 스캔 사이 변화/);
    assert.equal(h.nodes().some(node => node.type === 'a' && node.props.href?.includes('SAMPLE')), false);
    assert.equal(h.button(), undefined);
    h.focus(); await h.settle();
    assert.equal(h.posts.length, 0);
});

test('시장별 분류에서 전략별 분류로 전환하고 복수 전략과 미분류 종목을 포함한다', async () => {
    const h = harness();
    h.getWith(async () => ({ success: true, data: { items: [
        { ...item, strategies: ['ncav', 'low_pbr'] },
        { ...item, ticker: 'US-TEST', stock_name: '미국 샘플', is_us: 1, strategies: [] },
    ], baseline } }));
    await h.settle();
    const stockLinks = () => h.nodes().filter(node => node.type === 'a' && node.props.href === '/analyze?ticker=005930' && node.props.className?.includes('block min-h-11'));
    assert.equal(stockLinks().length, 1);
    assert.match(h.text(), /국내1종목/);
    assert.match(h.text(), /미국1종목/);
    h.nodes().find(node => node.type === 'select').props.onChange({ target: { value: 'strategy' } });
    h.render();
    assert.equal(stockLinks().length, 2);
    assert.match(h.text(), /해당 전략 없음1종목/);
    assert.match(h.text(), /여러 전략에 해당하면 중복 표시됩니다/);
    assert.equal(h.posts.length, 0);
});


test('실제 예시는 API의 종목·날짜·기준가와 세 전략의 적정주가를 표시한다', async () => {
    const h = harness(baseline, true);
    assert.match(h.text(), /불러오는 중/);
    await h.settle();
    assert.match(h.text(), /삼성전자/);
    assert.match(h.text(), /스캔 2026.11.15/);
    assert.match(h.text(), /스캔 기준가₩66,000/);
    assert.match(h.text(), /NCAV 1배₩10,000/);
    assert.match(h.text(), /PER 10배₩10,000/);
    assert.match(h.text(), /PBR 1배₩5,000/);
    assert.match(h.text(), /-84.8%/);
    assert.ok(h.nodes().some(node => node.type === 'a' && node.props.href === '/analyze?ticker=005930'));
    assert.equal(h.posts.length, 0);
});

test('예시 조회 실패는 재시도하고 재무 수치 부재를 계산 불가로 표시한다', async () => {
    const h = harness(baseline, true);
    h.sampleWith(async () => ({ items: [], failed: 2 }));
    await h.settle();
    assert.match(h.text(), /불러오지 못했습니다/);
    assert.doesNotMatch(h.text(), /가격.*%/);
    h.sampleWith(async () => ({ items: [{ ...item, eps: null, bps: null, lstn_stcn: null, ncav_ratio: null }], failed: 0 }));
    h.nodes().find(node => node.type === 'button').props.onClick();
    h.render(); await h.settle();
    assert.equal((h.text().match(/계산 불가/g) ?? []).length, 3);
    assert.doesNotMatch(h.text(), /가격.*%/);
    assert.equal(h.posts.length, 0);
});

test('스캔이 비어 있으면 빈 상태를 보여준다', async () => {
    const h = harness(baseline, true);
    h.sampleWith(async () => ({ items: [], failed: 0 }));
    await h.settle();
    assert.match(h.text(), /아직 표시할 스캔 데이터가 없습니다/);
    assert.equal(h.posts.length, 0);
});


test('로그인 관심목록에도 추가 조회 없이 NCAV 비율·EPS·BPS로 세 평가액을 표시한다', async () => {
    const h = harness();
    const liked = { ...item, lstn_stcn: undefined };
    h.getWith(async () => ({ success: true, data: { items: [liked], baseline } }));
    await h.settle();
    assert.match(h.text(), /NCAV₩79,200/);
    assert.match(h.text(), /PER₩10,000/);
    assert.match(h.text(), /PBR₩5,000/);
    assert.match(h.text(), /NCAV 1배 \/ PER 10배 \/ PBR 1배/);
    assert.equal(h.posts.length, 0);
});

test('미국 관심종목은 달러 소수점으로 표시하고 모든 모델이 결측·적자이면 안내로 묶는다', async () => {
    const h = harness();
    h.getWith(async () => ({ success: true, data: { items: [{
        ...item, ticker: 'US-TEST', stock_name: '미국 예시', is_us: 1,
        last_price: 20, ncav_ratio: 0.625, eps: 1.234, bps: 8.76, net_income: 100,
    }], baseline } }));
    await h.settle();
    assert.match(h.text(), /NCAV\$12.5/);
    assert.match(h.text(), /PER\$12.34/);
    assert.match(h.text(), /PBR\$8.76/);
    h.getWith(async () => ({ success: true, data: { items: [{
        ...item, ticker: 'US-TEST', is_us: 1, last_price: 20, ncav_ratio: null,
        eps: 1.234, net_income: -100, bps: null,
    }], baseline } }));
    h.focus(); await h.settle();
    assert.match(h.text(), /평가에 필요한 재무 수치 부족/);
    assert.equal(h.nodes().filter(node => node.type === 'dl' && node.props['aria-label'] === '전략별 적정주가').length, 0);
});


test('필터는 평가 가능한 종목과 스캔 없는 종목을 구분하고 저장하지 않는다', async () => {
    const h = harness();
    h.getWith(async () => ({ success: true, data: { items: [item,
        { ...item, ticker: 'ETF', stock_name: '스캔 없는 ETF', scan_date: null },
        { ...item, ticker: 'NO-VALUATION', stock_name: '재무 부족 종목', eps: null, bps: null, ncav_ratio: null, lstn_stcn: null },
    ], baseline } }));
    await h.settle();
    const selectFilter = (label: string) => {
        h.nodes().find(node => node.type === 'button' && node.props.children?.[0]?.startsWith(label)).props.onClick();
        h.render();
    };
    selectFilter('평가 가능');
    assert.match(h.text(), /삼성전자/);
    assert.doesNotMatch(h.text(), /스캔 없는 ETF|재무 부족 종목/);
    assert.equal(h.nodes().filter(node => node.props?.['aria-pressed'] === true).length, 1);
    selectFilter('스캔 없음');
    assert.match(h.text(), /스캔 없는 ETF/);
    assert.doesNotMatch(h.text(), /삼성전자|재무 부족 종목|₩66,000/);
    selectFilter('전체');
    assert.match(h.text(), /삼성전자/);
    assert.match(h.text(), /재무 부족 종목/);
    assert.equal(h.posts.length, 0);
});

test('각 시장에서 최신 스캔 다섯 종목부터 보여주고 나머지는 펼치고 접는다', async () => {
    const h = harness();
    h.getWith(async () => ({ success: true, data: { items: [
        { ...item, ticker: 'ETF', stock_name: '스캔 없는 ETF', scan_date: null },
        ...Array.from({ length: 6 }, (_, index) => ({ ...item, ticker: `KR${index}`, stock_name: `국내 예시 ${index}`, scan_date: `2026111${index}` })),
        { ...item, ticker: 'US', is_us: 1, stock_name: '미국 예시' },
    ], baseline } }));
    await h.settle();
    const links = () => h.nodes().filter(node => node.type === 'a' && node.props.href?.startsWith('/analyze?'));
    assert.equal(links().length, 6);
    assert.equal(links()[0].props.href, '/analyze?ticker=KR5');
    assert.match(h.text(), /미국 예시/);
    assert.doesNotMatch(h.text(), /스캔 없는 ETF/);
    h.nodes().find(node => node.type === 'button' && node.props['aria-expanded'] === false).props.onClick();
    h.render();
    assert.equal(links().length, 8);
    assert.match(h.text(), /스캔 없는 ETF/);
    h.nodes().find(node => node.type === 'button' && node.props['aria-expanded'] === true).props.onClick();
    h.render();
    assert.equal(links().length, 6);
    assert.equal(h.posts.length, 0);
});

test('평가 가능 필터가 빈 경우 목록 복귀가 가능한 빈 상태를 표시한다', async () => {
    const h = harness();
    h.getWith(async () => ({ success: true, data: { items: [{ ...item, scan_date: null }], baseline } }));
    await h.settle();
    h.nodes().find(node => node.type === 'button' && node.props.children?.[0]?.startsWith('평가 가능')).props.onClick();
    h.render();
    assert.match(h.text(), /평가 가능한 종목이 없습니다/);
    assert.ok(h.nodes().some(node => node.type === 'button' && node.props.children?.[0]?.startsWith('전체')));
    assert.doesNotMatch(h.text(), /먼저 관심종목을 담아보세요/);
});

test('백그라운드 조회가 실패해도 기존 목록을 유지한다', async () => {
    const h = harness();
    await h.settle();
    h.getWith(async () => ({ success: false, error: '일시적인 조회 실패' }));
    h.focus(); await h.settle();
    assert.match(h.text(), /일시적인 조회 실패/);
    assert.match(h.text(), /삼성전자/);
    assert.match(h.text(), /다시 불러오기/);
});
