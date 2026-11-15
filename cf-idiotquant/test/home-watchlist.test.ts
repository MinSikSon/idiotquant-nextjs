import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as changes from '../lib/features/stockLikes/changes.ts';

const item = { ticker: '005930', stock_name: '삼성전자', is_us: 0, scan_date: '20261115', strategies: ['ncav'], last_price: 66000, per: 10, pbr: 1, ncav_ratio: 1.2 };
const baseline = { revision: 1, confirmedAt: 1, items: [{ ...changes.watchSnapshot([item])[0], price: 60000, scanDate: '20261114' }] };
const source = ts.transpileModule(readFileSync(new URL('../components/home-watchlist.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

// 홈 컴포넌트를 실행하고 네트워크와 React 상태 경계만 제어한다.
function harness(initialBaseline = baseline) {
    const slots: any[] = [];
    let cursor = 0;
    let tree: any;
    const effects: (() => unknown)[] = [];
    const listeners = new Map<string, () => void>();
    const posts: any[] = [];
    let saved = structuredClone(initialBaseline);
    let failure = 0;
    let get = async () => ({ success: true, data: { items: [item], baseline: saved } });
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
    const jsx = (type: unknown, props: unknown) => ({ type, props });
    const output = { exports: {} as { HomeWatchlist: () => any } };
    runInNewContext(source, { exports: output.exports, module: output,
        window: { addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) },
        require(name: string) {
            if (name === 'react') return react;
            if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
            if (name === 'next/link') return { __esModule: true, default: 'a' };
            if (name === 'lucide-react') return {};
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
    const render = () => { cursor = 0; tree = output.exports.HomeWatchlist(); return tree; };
    const text = (node: any): string => node == null || typeof node === 'boolean' ? ''
        : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : typeof node.type === 'function' ? text(node.type(node.props)) : text(node.props?.children);
    const nodes = (node: any): any[] => node == null || typeof node !== 'object' ? []
        : Array.isArray(node) ? node.flatMap(nodes) : typeof node.type === 'function' ? nodes(node.type(node.props)) : [node, ...nodes(node.props?.children)];
    const settle = async () => { while (effects.length) effects.shift()!(); await new Promise(resolve => setImmediate(resolve)); render(); };
    const button = () => nodes(tree).find(node => node.type === 'button' && text(node).includes('확인 완료'));
    render();
    return { render, settle, text: () => text(tree), nodes: () => nodes(tree), button, posts,
        focus: () => listeners.get('focus')?.(), fail: (status: number) => { failure = status; },
        saved: () => saved,
        getWith: (fn: typeof get) => { get = fn; },
    };
}

test('홈 조회와 재조회는 기준을 바꾸지 않고 명시적 완료만 표시한 값을 저장한다', async () => {
    const h = harness();
    await h.settle();
    assert.match(h.text(), /지난 확인 이후 변화 · 1종목/);
    h.focus(); await h.settle();
    assert.equal(h.posts.length, 0);
    assert.equal(h.saved().revision, 1);
    h.button().props.onClick(); h.button().props.onClick();
    await h.settle();
    assert.equal(h.posts.length, 1);
    assert.equal(h.posts[0].items[0].price, 66000);
    assert.match(h.text(), /달라진 내용이 없습니다/);
    const returning = harness(h.saved());
    await returning.settle();
    assert.match(returning.text(), /달라진 내용이 없습니다/);
});

test('저장 실패는 기존 변화와 기준을 유지하고 재조회 뒤 다시 확인할 수 있다', async () => {
    const h = harness(); await h.settle(); h.fail(503);
    h.button().props.onClick(); await h.settle();
    assert.equal(h.saved().revision, 1);
    assert.match(h.text(), /지난 확인 이후 변화 · 1종목/);
    assert.equal(h.button().props.disabled, true);
    h.focus(); await h.settle(); h.fail(0);
    assert.equal(h.button().props.disabled, false);
    h.button().props.onClick(); await h.settle();
    assert.equal(h.saved().revision, 2);
});

test('충돌은 최신 기준을 읽고 자동으로 다시 저장하지 않는다', async () => {
    const h = harness(); await h.settle(); h.fail(409);
    h.button().props.onClick(); await h.settle();
    assert.equal(h.posts.length, 1);
    assert.equal(h.saved().revision, 2);
    assert.match(h.text(), /저장 실패/);
});

test('늦게 도착한 이전 조회는 새 응답을 덮어쓰지 못한다', async () => {
    const h = harness(); await h.settle();
    const pending: ((value: any) => void)[] = [];
    h.getWith(() => new Promise(resolve => pending.push(resolve)));
    h.focus(); h.render();
    assert.equal(h.button().props.disabled, true);
    h.focus();
    pending[1]({ success: true, data: { items: [{ ...item, last_price: 70000 }], baseline } });
    await h.settle();
    pending[0]({ success: true, data: { items: [item], baseline } });
    await h.settle();
    h.button().props.onClick(); await h.settle();
    assert.equal(h.posts[0].items[0].price, 70000);
});


test('빈 관심목록에는 저장 동작 없는 가상 샘플을 보여준다', async () => {
    const h = harness();
    h.getWith(async () => ({ success: true, data: { items: [], baseline } }));
    await h.settle();
    assert.match(h.text(), /사용 방법을 보여주는 가상 종목/);
    assert.match(h.text(), /가격 ₩12,000 → ₩12,500/);
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
    const stockLinks = () => h.nodes().filter(node => node.type === 'a' && node.props.href === '/analyze?ticker=005930' && node.props.className?.includes('py-1.5'));
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
