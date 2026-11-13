import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { asyncThunkCreator, buildCreateSlice, configureStore } from '@reduxjs/toolkit';
import ts from 'typescript';

function harness(response: unknown) {
    const output = { exports: {} as any };
    const script = ts.transpileModule(readFileSync(new URL('../lib/features/koreaInvestment/koreaInvestmentSlice.tsx', import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    runInNewContext(script, {
        exports: output.exports, module: output,
        require(name: string) {
            if (name === '@/lib/createAppSlice') return { createAppSlice: buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } }) };
            if (name === './koreaInvestmentAPI') return {
                getBalanceSheet: async () => response,
                getIncomeStatement: async () => response,
            };
            return {};
        },
    });
    const slice = output.exports.koreaInvestmentSlice;
    return { store: configureStore({ reducer: slice.reducer }), actions: slice.actions };
}

for (const [action, field] of [
    ['reqGetBalanceSheet', 'koreaInvestmentBalanceSheet'],
    ['reqGetIncomeStatement', 'koreaInvestmentIncomeStatement'],
]) {
    for (const response of [
        { rt_cd: '1', msg_cd: 'OPSQ0001', msg1: '호출 전처리 오류 입니다.' },
        { rt_cd: '1', output: [] },
        { success: false, error: '서버 오류' },
        {}, null,
    ]) {
        test(`${action}: HTTP 200 오류·잘못된 응답은 pending에 남지 않는다 (${JSON.stringify(response)})`, async () => {
            const { store, actions } = harness(response);
            const work = store.dispatch(actions[action]({ PDNO: '005930' }));
            assert.equal(store.getState()[field].state, 'pending');
            const result = await work;
            assert.equal(result.meta.requestStatus, 'rejected');
            assert.equal(store.getState()[field].state, 'rejected');
        });
    }
    test(`${action}: 정상 재무제표는 화면에 전달하고 빈 자료도 로딩을 종료한다`, async () => {
        for (const output of [[], [{ stac_yymm: '202606' }]]) {
            const { store, actions } = harness({ rt_cd: '0', output });
            await store.dispatch(actions[action]({ PDNO: '005930' }));
            assert.equal(store.getState()[field].state, 'fulfilled');
            assert.deepEqual(store.getState()[field].output, output);
        }
    });
}
