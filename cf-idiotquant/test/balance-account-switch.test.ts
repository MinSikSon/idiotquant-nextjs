import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { asyncThunkCreator, buildCreateSlice, configureStore } from '@reduxjs/toolkit';
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

for (const [market, field] of [['Kr', 'krCapital'], ['Us', 'usCapital']] as const) {
    test(`${market}: 자동매매 데이터가 없거나 그룹만 있는 계좌에서 전환해도 종목 목록이 유지된다`, () => {
        const { capitalSlice: slice } = load('../lib/features/capital/capitalSlice.tsx');
        const fetch = slice.actions[`reqGet${market}Capital`];
        let state = slice.reducer(undefined, fetch.pending('first', 'A'));
        state = slice.reducer(state, fetch.fulfilled(null, 'first', 'A'));
        assert.equal(state[field].stock_list.length, 0);

        state = slice.reducer(state, fetch.pending('second', 'B'));
        state = slice.reducer(state, fetch.fulfilled({ groups: [{ id: 'group' }] }, 'second', 'B'));
        assert.equal(state[field].stock_list.length, 0);
        assert.equal(state[field].groups[0].id, 'group');

        state = slice.reducer(state, fetch.pending('third', 'A'));
        assert.equal(state[field].stock_list.length, 0);
        assert.equal(state[field].groups, undefined);
        state = slice.reducer(state, fetch.fulfilled({ stock_list: [{ symbol: '005930' }] }, 'third', 'A'));
        state = slice.reducer(state, fetch.pending('refresh', 'A'));
        assert.equal(state[field].stock_list[0].symbol, '005930');
    });
}

test('국내 잔고는 계좌 전환 후 오류 응답을 실패 처리하고 새로고침으로 복구한다', async () => {
    const valid = { rt_cd: '0', output1: [{ pdno: '005930' }], output2: [{ tot_evlu_amt: '1000' }] };
    let response: unknown = valid;
    const { koreaInvestmentSlice: slice } = load('../lib/features/koreaInvestment/koreaInvestmentSlice.tsx', {
        './koreaInvestmentAPI': { getInquireBalanceApi: async () => response },
    });
    const store = configureStore({ reducer: slice.reducer });
    const fetch = slice.actions.reqGetInquireBalance;
    const balance = () => store.getState().koreaInvestmentBalance;
    await store.dispatch(fetch('A'));
    assert.equal(balance().output1.length, 1);

    const refresh = store.dispatch(fetch('A'));
    assert.equal(balance().output1.length, 1);
    await refresh;

    response = { rt_cd: '1', msg1: '잔고 조회 실패' };
    const switchAccount = store.dispatch(fetch('B'));
    assert.equal(balance().output1.length, 0);
    assert.equal(balance().output2.length, 0);
    await switchAccount;
    assert.equal(balance().state, 'rejected');
    assert.equal(balance().msg1, '잔고 조회 실패');

    response = valid;
    await store.dispatch(fetch('B'));
    assert.equal(balance().state, 'fulfilled');
    assert.equal(balance().output1.length, 1);
});

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
    for (const oldValue of [true, false]) {
        test(`${country}: 계좌 전환 조회 실패 시 이전 계좌의 ${oldValue ? 'ON' : 'OFF'}를 남기지 않는다`, () => {
            const slice = load('../lib/features/algorithmTrade/algorithmTradeSlice.tsx').algorithmTradeSlice;
            const fetch = slice.actions.reqFetchTradingStatus;
            const oldArg = { country, key: 'A' }, newArg = { country, key: 'B' };
            let state = slice.reducer(undefined, fetch.pending('old', oldArg));
            state = slice.reducer(state, fetch.fulfilled({ country, value: oldValue }, 'old', oldArg));
            assert.equal(state.tradingStatus[country], oldValue);
            state = slice.reducer(state, fetch.pending('new', newArg));
            assert.equal(state.tradingStatus[country], null);
            state = slice.reducer(state, fetch.rejected(new Error('unavailable'), 'new', newArg));
            assert.equal(state.tradingStatus[country], null);
            assert.equal(state.tradingStatus.state, 'rejected');
            state = slice.reducer(state, fetch.fulfilled({ country, value: oldValue }, 'old', oldArg));
            assert.equal(state.tradingStatus[country], null);
        });
    }
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
