import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { asyncThunkCreator, buildCreateSlice, configureStore } from "@reduxjs/toolkit";

function fixture() {
  let reply: unknown;
  const output = { exports: {} as any };
  const source = ts.transpileModule(readFileSync(new URL("../lib/features/capital/capitalSlice.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, { exports: output.exports, require(name: string) {
    if (name === "@/lib/createAppSlice") return { createAppSlice: buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } }) };
    if (name === "./capitalAPI") return new Proxy({}, { get: () => async () => reply });
    return {};
  } });
  const slice = output.exports.capitalSlice;
  return { actions: slice.actions, store: configureStore({ reducer: slice.reducer }), reply(value: unknown) { reply = value; } };
}

const stocks = ["SOHU", "CAAS", "TIGR", "RLYB", "QFIN"];
const capital = (symbols: string[]) => ({ groups: [{ id: "g" }], stock_list: symbols.map(symbol => ({ symbol, group_id: "g", token: 100 })), candidate_pool: [] });

for (const market of ["Kr", "Us"]) for (const bulk of [false, true]) {
  test(`${market} ${bulk ? "일괄" : "단일"} 제거: 성공 응답 즉시 목록 반영, 이전 조회 응답은 종목을 복원하지 않는다`, async () => {
    const h = fixture(), field = `${market.toLowerCase()}Capital`;
    const get = h.actions[`reqGet${market}Capital`], remove = h.actions[`reqPost${market}CapitalStock${bulk ? "s" : ""}Remove`];
    h.store.dispatch(get.pending("initial", "A"));
    h.store.dispatch(get.fulfilled(capital(stocks), "initial", "A"));
    h.store.dispatch(get.pending("old-fetch", "A"));
    const deleted = bulk ? stocks.slice(0, 4) : ["CAAS"];
    const remaining = stocks.filter(symbol => !deleted.includes(symbol));
    h.reply({ ...capital(remaining), user_excluded: deleted });
    await h.store.dispatch(remove({ key: "A", ...(bulk ? { tickers: deleted } : { ticker: "CAAS" }) })).unwrap();
    assert.deepEqual(h.store.getState()[field].stock_list.map((s: any) => s.symbol), remaining);
    h.store.dispatch(get.fulfilled(capital(stocks), "old-fetch", "A"));
    assert.deepEqual(h.store.getState()[field].stock_list.map((s: any) => s.symbol), remaining);
  });

  test(`${market} ${bulk ? "일괄" : "단일"} 제거: 서버가 실패를 반환하면 성공으로 처리하지 않는다`, async () => {
    const h = fixture(), field = `${market.toLowerCase()}Capital`;
    const get = h.actions[`reqGet${market}Capital`], remove = h.actions[`reqPost${market}CapitalStock${bulk ? "s" : ""}Remove`];
    h.store.dispatch(get.pending("initial", "A"));
    h.store.dispatch(get.fulfilled(capital(stocks), "initial", "A"));
    h.reply({ success: false, error: "계좌 주문 처리 중입니다." });
    await assert.rejects(h.store.dispatch(remove({ key: "A", ticker: "CAAS", tickers: ["CAAS"] })).unwrap(), { message: "계좌 주문 처리 중입니다." });
    assert.deepEqual(h.store.getState()[field].stock_list.map((s: any) => s.symbol), stocks);
  });

  test(`${market} ${bulk ? "일괄" : "단일"} 제거: 계좌 전환 전 요청의 응답은 현재 계좌를 변경하지 않는다`, () => {
    const h = fixture(), get = h.actions[`reqGet${market}Capital`], remove = h.actions[`reqPost${market}CapitalStock${bulk ? "s" : ""}Remove`];
    const arg = { key: "A", ticker: "CAAS", tickers: ["CAAS"] };
    h.store.dispatch(get.pending("A", "A"));
    h.store.dispatch(remove.pending("remove-A", arg));
    h.store.dispatch(get.pending("B", "B"));
    h.store.dispatch(get.fulfilled(capital(["B-STOCK"]), "B", "B"));
    h.store.dispatch(remove.fulfilled(capital(["QFIN"]), "remove-A", arg));
    assert.deepEqual(h.store.getState()[`${market.toLowerCase()}Capital`].stock_list.map((s: any) => s.symbol), ["B-STOCK"]);
  });
}
