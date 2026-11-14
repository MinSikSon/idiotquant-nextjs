import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { asyncThunkCreator, buildCreateSlice } from '@reduxjs/toolkit';
import ts from 'typescript';

function load(path: string, dependencies: Record<string, unknown> = {}) {
    const output = { exports: {} as any };
    const script = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    runInNewContext(script, {
        exports: output.exports, module: output, URL,
        ...dependencies,
        require(name: string) {
            if (name in dependencies) return dependencies[name];
            if (name === '@/lib/createAppSlice') return { createAppSlice: buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } }) };
            return {};
        },
    });
    return output.exports;
}

const configs = [
    ['koreaInvestment', 'koreaInvestmentSlice', [
        ['reqGetInquireBalance', 'koreaInvestmentBalance', { output1: [], output2: [] }],
        ['reqGetInquireCcnl', 'koreaInvestmentInquireKrCcnl', { output: [] }],
        ['reqGetInquireNccs', 'koreaInvestmentInquireKrNccs', { output: [] }],
    ]],
    ['koreaInvestmentUsMarket', 'koreaInvestmentUsMarketSlice', [
        ['reqGetOverseasStockTradingInquirePresentBalance', 'presentBalance', { output1: [] }],
        ['reqGetOverseasStockTradingInquireBalance', 'balance', { output1: [] }],
        ['reqGetOverseasStockTradingInquireCcnl', 'ccnl', { output: [] }],
        ['reqGetOverseasStockTradingInquireNccs', 'nccs', { output: [] }],
    ]],
    ['capital', 'capitalSlice', [
        ['reqGetKrCapital', 'krCapital', { stock_list: [] }],
        ['reqGetUsCapital', 'usCapital', { stock_list: [] }],
        ['reqGetKrTradingActivity', 'krActivity', { logs: [] }],
        ['reqGetUsTradingActivity', 'usActivity', { logs: [] }],
        ['reqGetKrQuantRule', 'krQuantRule', { rule: {} }],
        ['reqGetUsQuantRule', 'usQuantRule', { rule: {} }],
        ['reqGetKrCapitalBudget', 'krBudget', { monthly_budget_krw: 100 }],
    ]],
] as const;

for (const [folder, exported, requests] of configs) {
    const slice = load(`../lib/features/${folder}/${exported}.tsx`)[exported];
    for (const [name, field, payload] of requests) {
        test(`${name}: A→B→A 전환 후 늦은 성공과 실패를 무시한다`, () => {
            const thunk = slice.actions[name];
            let state = slice.reducer(undefined, { type: 'init' });
            const arg = (key: string) => folder === 'koreaInvestment' && name !== 'reqGetInquireBalance' ? { kakaoId: key } : key;
            state = slice.reducer(state, thunk.pending('A-old', arg('A')));
            state = slice.reducer(state, thunk.pending('B', arg('B')));
            state = slice.reducer(state, thunk.pending('A-new', arg('A')));
            const pending = state;
            state = slice.reducer(state, thunk.fulfilled(payload, 'B', arg('B')));
            state = slice.reducer(state, thunk.rejected(new Error('late'), 'A-old', arg('A')));
            assert.equal(state, pending);
            state = slice.reducer(state, thunk.fulfilled(payload, 'A-new', arg('A')));
            assert.equal(state[field].state, 'fulfilled');
            const settled = state;
            state = slice.reducer(state, thunk.fulfilled(payload, 'A-old', arg('A')));
            state = slice.reducer(state, thunk.rejected(new Error('late'), 'B', arg('B')));
            assert.equal(state, settled);
            state = slice.reducer(state, thunk.pending('retry', arg('A')));
            state = slice.reducer(state, thunk.rejected(new Error('current'), 'retry', arg('A')));
            assert.equal(state[field].state, 'rejected');
        });
    }
}

test('계좌 연속 선택은 URL만 갱신하고 이전 렌더가 선택을 되돌리지 않는다', () => {
    const location = { href: 'https://example.com/balance?country=us&key=A#assets' };
    const effects: (() => void)[] = [];
    let writes = 0;
    const { useBalanceAccount } = load('../components/balance/useBalanceAccount.ts', {
        react: { useCallback: (fn: unknown) => fn, useEffect: (fn: () => void) => effects.push(fn) },
        'next/navigation': { useSearchParams: () => new URL(location.href).searchParams },
        window: { location, history: { replaceState(_state: unknown, _title: string, url: string) { location.href = new URL(url, location.href).href; writes++; } } },
    });
    const [initial, select] = useBalanceAccount('self');
    assert.equal(initial, 'A');
    select('B');
    select('C');
    select('A');
    for (const effect of effects.splice(0)) effect();
    assert.equal(useBalanceAccount('self')[0], 'A');
    assert.equal(writes, 3);
    assert.equal(location.href, 'https://example.com/balance?country=us&key=A#assets');
    select('A');
    select('');
    assert.equal(writes, 3);
    location.href = 'https://example.com/balance?country=kr';
    assert.equal(useBalanceAccount('self')[0], 'self');
    for (const effect of effects.splice(0)) effect();
    assert.equal(new URL(location.href).searchParams.get('key'), 'self');
});

for (const country of ['KR', 'US']) {
    test(`${country}: 이전 계좌의 자동매매 조회·변경 응답을 무시한다`, () => {
        const slice = load('../lib/features/algorithmTrade/algorithmTradeSlice.tsx').algorithmTradeSlice;
        const fetch = slice.actions.reqFetchTradingStatus;
        const save = slice.actions.reqSetTradingActive;
        const oldArg = { country, key: 'A' };
        const oldSave = { country, key: 'A', isActive: true };
        const newArg = { country, key: 'B' };
        let state = slice.reducer(undefined, fetch.pending('old', oldArg));
        state = slice.reducer(state, save.pending('save', oldSave));
        state = slice.reducer(state, fetch.pending('new', newArg));
        state = slice.reducer(state, fetch.fulfilled({ country, value: false }, 'new', newArg));
        const settled = state;
        state = slice.reducer(state, fetch.fulfilled({ country, value: true }, 'old', oldArg));
        state = slice.reducer(state, save.fulfilled({ country, isActive: true }, 'save', oldSave));
        state = slice.reducer(state, fetch.rejected(new Error('late'), 'old', oldArg));
        assert.equal(state, settled);
        assert.equal(state.tradingStatus[country], false);
    });
}
