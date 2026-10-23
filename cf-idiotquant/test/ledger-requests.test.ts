import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { asyncThunkCreator, buildCreateSlice, isPending, isFulfilled, isRejected } from '@reduxjs/toolkit';
import ts from 'typescript';

// 실제 reducer를 실행한다. JSX 없는 .tsx 파일은 테스트 환경에서만 변환한다.
const output = { exports: {} as any };
const script = ts.transpileModule(readFileSync(new URL('../lib/features/ledger/ledgerSlice.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
runInNewContext(script, {
    exports: output.exports, module: output,
    require(name: string) {
        if (name === '@reduxjs/toolkit') return { isPending, isFulfilled, isRejected };
        if (name === '@/lib/createAppSlice') return { createAppSlice: buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } }) };
        return {};
    },
});
const { ledgerSlice } = output.exports;
const { reqGetLedger, reqGetLedgerCategories, reqGetLedgerBalances, reqAddLedgerEntry, setActiveOwner, setLedgerMonth } = ledgerSlice.actions;
const reduce = ledgerSlice.reducer;

test('공유 가계부 전환 후 이전 내역·항목·잔액·저장 응답을 반영하지 않는다', () => {
    let state = reduce(undefined, { type: 'init' });
    const month = state.month;
    state = reduce(state, setActiveOwner('A'));
    const requests = [
        [reqGetLedger, month, { data: [{ id: 1, entry_date: `${month}-01` }] }],
        [reqGetLedgerCategories, undefined, { data: [{ id: 1, label: 'A 항목' }] }],
        [reqGetLedgerBalances, { month, months: 6 }, { data: { balances: [{ month, assets: 100 }] } }],
        [reqAddLedgerEntry, {}, { data: { id: 2, entry_date: `${month}-01` } }],
    ];
    for (const [thunk, arg] of requests) state = reduce(state, thunk.pending(thunk.typePrefix, arg));
    state = reduce(state, setActiveOwner('B'));
    state = reduce(state, setActiveOwner('A'));
    for (const [thunk, arg, result] of requests) state = reduce(state, thunk.fulfilled(result, thunk.typePrefix, arg));
    assert.equal(state.entries.length, 0);
    assert.equal(state.categories.length, 0);
    assert.equal(state.balances.length, 0);
    assert.equal(state.mutating, false);
});

test('같은 달의 중복 조회는 마지막 요청만 반영하고 이전 오류도 무시한다', () => {
    let state = reduce(undefined, { type: 'init' });
    const month = state.month;
    state = reduce(state, reqGetLedger.pending('old', month));
    state = reduce(state, reqGetLedger.pending('new', month));
    state = reduce(state, reqGetLedger.fulfilled({ data: [{ id: 2 }] }, 'new', month));
    state = reduce(state, reqGetLedger.rejected(new Error('늦은 오류'), 'old', month));
    assert.equal(state.entries[0].id, 2);
    assert.equal(state.state, 'fulfilled');
    assert.equal(state.error, null);
});

test('달을 바꿨다가 돌아와도 이전 조회를 반영하지 않는다', () => {
    let state = reduce(undefined, { type: 'init' });
    const month = state.month;
    state = reduce(state, reqGetLedger.pending('old', month));
    state = reduce(state, setLedgerMonth('2020-01'));
    state = reduce(state, setLedgerMonth(month));
    state = reduce(state, reqGetLedger.fulfilled({ data: [{ id: 1 }] }, 'old', month));
    assert.equal(state.entries.length, 0);
});
