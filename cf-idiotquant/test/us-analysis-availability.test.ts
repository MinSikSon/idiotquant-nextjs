import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { usAnalysisAvailability } from '../lib/utils/usAnalysisAvailability.ts';

const financial = JSON.parse(readFileSync(new URL('./fixtures/sec-sohu-2025.json', import.meta.url), 'utf8'));
const sohu = {
  // 운영에서 재현한 EGW00317: 기본정보 API 09:00~09:30 제한, 시세·SEC는 성공.
  usSearchInfo: { state: 'rejected', msg_cd: 'EGW00317' },
  usDetail: { rt_cd: '0', output: { last: '12.7500', shar: '26069020' } },
  finnhubData: { ...financial, state: 'fulfilled' },
};

test('SOHU 기본정보 API가 실패해도 정상 시세와 SEC 재무정보를 표시할 수 있다', () => {
  assert.deepEqual(usAnalysisAvailability(sohu), { priceReady: true, financialsReady: true });
});

test('시세가 실패했거나 유효한 가격이 없으면 준비 완료로 간주하지 않는다', () => {
  for (const last of [undefined, null, '', ' ', '0', '-1', 'invalid', 'Infinity'])
    assert.equal(usAnalysisAvailability({ usDetail: { rt_cd: '0', output: { last } } }).priceReady, false);
  assert.equal(usAnalysisAvailability({ usDetail: { rt_cd: '1', output: { last: '12.75' } } }).priceReady, false);
  assert.equal(usAnalysisAvailability({}).priceReady, false);
});

test('재무정보의 로딩·실패·빈 결과와 무관하게 정상 시세는 표시할 수 있다', () => {
  for (const finnhubData of [{ state: 'pending' }, { state: 'rejected' }, { state: 'fulfilled', data: [] }])
    assert.deepEqual(usAnalysisAvailability({ ...sohu, finnhubData }), { priceReady: true, financialsReady: false });
});

test('다음 미국 종목 조회가 실패해도 이전 종목의 이름·시세가 남지 않는다', () => {
  // 실제 Redux slice의 요청 핸들러를 실행한다. API 경계만 대체한다.
  const source = readFileSync(new URL('../lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice.tsx', import.meta.url), 'utf8');
  const script = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  let config: any, handlers: any;
  const output = { exports: {} };
  runInNewContext(script, {
    exports: output.exports, module: output,
    console: { log() {} },
    require(name: string) {
      if (name === '@/lib/createAppSlice') return { createAppSlice(value: any) {
        config = value;
        handlers = value.reducers({ asyncThunk: (_fn: any, lifecycle: any) => lifecycle });
        return { actions: {}, selectors: {} };
      } };
      return {};
    },
  });
  const state = structuredClone(config.initialState);
  state.searchInfo = { state: 'fulfilled', output: { prdt_eng_name: 'Previous stock' } };
  state.priceDetail = { rt_cd: '0', output: { last: '200' } };
  handlers.reqGetQuotationsSearchInfo.pending(state);
  handlers.reqGetQuotationsPriceDetail.pending(state);
  assert.equal(state.searchInfo.output.prdt_eng_name, '');
  assert.equal(usAnalysisAvailability({ usDetail: state.priceDetail }).priceReady, false);
  handlers.reqGetQuotationsSearchInfo.rejected(state);
  handlers.reqGetQuotationsPriceDetail.fulfilled(state, { payload: sohu.usDetail });
  assert.equal(state.searchInfo.state, 'rejected');
  assert.equal(state.searchInfo.output.prdt_eng_name, '');
  assert.equal(usAnalysisAvailability({ usDetail: state.priceDetail }).priceReady, true);
});
