import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { asyncThunkCreator, buildCreateSlice, configureStore } from "@reduxjs/toolkit";

const require = createRequire(import.meta.url);
const compile = (path: string) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const editorScript = compile("../components/balance/groupStrategyEditor.tsx");

// 실제 편집 컴포넌트를 실행하고 React 훅과 저장 경계만 대체한다.
function editor(overrides: Record<string, unknown> = {}) {
  const states: any[] = [];
  const calls: any[] = [];
  let cursor = 0, closed = 0;
  const props = { groupDca: false, groupSide: "buy", tradingActive: true,
    groupBudget: 100000, groupQuantRule: { active_count: 20, ncav_ratio: 1.5, max_pbr: 2 },
    onApply: async (settings: unknown) => { calls.push(settings); }, onClose: () => { closed++; }, ...overrides };
  const output = { exports: {} as any };
  runInNewContext(editorScript, { exports: output.exports, require(name: string) {
    if (name === "./weightStrategyEditor") return { default: () => null };
    if (name !== "react") return require(name);
    return {
      useState(initial: unknown) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (next: any) => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; },
      useRef(initial: unknown) { const index = cursor++; return states[index] ??= { current: initial }; },
    };
  } });
  const render = () => { cursor = 0; return output.exports.default(props); };
  function nodes(node: any): any[] { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
  const text = (node: any): string => typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
  const button = (label: string) => { const found = nodes(render()).find(node => node.type === "button" && text(node) === label); assert.ok(found, label); return found; };
  const click = (label: string) => { const node = button(label); if (!node.props.disabled) return node.props.onClick(); };
  const change = (label: string, value: string) => { const wrapper = nodes(render()).find(node => node.type === "label" && text(node).startsWith(label)); assert.ok(wrapper, label); const input = nodes(wrapper).find(node => node.type === "input" || node.type === "select"); input.props.onChange({ target: { value } }); };
  return { calls, props, render, nodes, text, button, click, change, closed: () => closed };
}

test("탭 선택은 저장하지 않고 편집값을 유지하며 적용 버튼만 한 번 저장한다", async () => {
  const h = editor();
  assert.equal(h.button("변경사항 적용").props.disabled, true);
  h.change("월 적립 예산", "200000");
  h.click("정액 적립적립 포인트를 모아 1주 단위로 주문합니다.");
  h.click("퀀트적용 중재무·NCAV 조건을 확인해 매매합니다.");
  h.click("정액 적립적립 포인트를 모아 1주 단위로 주문합니다.");
  assert.equal(h.calls.length, 0);
  await h.click("이 전략으로 적용");
  assert.equal(h.calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])), { quant_rule: { active_count: 20, ncav_ratio: 1.5, max_pbr: 2 }, budget_krw: 200000, side: "buy", dca: true });
  assert.equal(h.closed(), 1);
});

test("변경 취소와 기본값 선택은 요청하지 않으며 목표 비중은 별도 편집기로 연다", () => {
  const h = editor();
  h.change("방향", "sell");
  h.click("변경 취소");
  assert.equal(h.button("변경사항 적용").props.disabled, true);
  h.click("조건·예산 기본값");
  assert.equal(h.calls.length, 0);
  assert.equal(h.button("변경사항 적용").props.disabled, false);
  h.click("목표 비중보유 평가액을 목표 비중에 맞게 조정합니다.");
  assert.equal(h.nodes(h.render()).filter(node => node.type === "button").some(node => h.text(node).includes("준비 중")), false);
  assert.equal(h.calls.length, 0);
});

test("저장 중 중복 적용을 차단하고 실패 시 편집값과 재시도 버튼을 유지한다", async () => {
  let reject!: (reason: Error) => void, calls = 0;
  const h = editor({ onApply: () => { calls++; return new Promise((_, r) => { reject = r; }); } });
  h.change("월 적립 예산", "300000");
  const apply = h.button("변경사항 적용").props.onClick;
  const pending = apply();
  await apply();
  assert.equal(calls, 1);
  assert.equal(h.button("적용 중…").props.disabled, true);
  assert.ok(h.nodes(h.render()).some(node => node.type === "fieldset" && node.props.disabled));
  reject(new Error("network"));
  await pending;
  assert.equal(h.closed(), 0);
  assert.match(h.text(h.render()), /편집값은 유지됩니다/);
  assert.ok(h.nodes(h.render()).some(node => node.type === "input" && node.props.value === "300000"));
  assert.equal(h.button("변경사항 적용").props.disabled, false);
});

test("숫자 범위·정수를 검증하고 0원은 기존 API의 기본예산 의미를 유지한다", async () => {
  const h = editor();
  for (const [label, value] of [["월 적립 예산", "-1"], ["월 적립 예산", "1000000001"], ["월 적립 예산", "1.5"], ["활성 종목 수", "201"], ["활성 종목 수", "2.5"], ["NCAV 비율", "-0.1"]]) {
    h.change(label, value);
    assert.equal(h.button("변경사항 적용").props.disabled, true, `${label}: ${value}`);
    h.click("변경 취소");
  }
  h.change("월 적립 예산", "0");
  await h.click("변경사항 적용");
  assert.equal(h.calls[0].budget_krw, null);
});

test("편집 중 서버 설정이 바뀌면 오래된 값으로 덮어쓰지 않는다", () => {
  const h = editor();
  h.change("월 적립 예산", "300000");
  h.props.groupDca = true;
  assert.equal(h.button("변경사항 적용").props.disabled, true);
  assert.match(h.text(h.render()), /다른 곳에서 설정이 변경/);
});

test("기본값 복원은 명시적 적용에서만 전체 그룹 조건을 지우고 방향·전략을 보존한다", async () => {
  const h = editor({ groupDca: true, groupSide: "sell" });
  h.click("조건·예산 기본값");
  assert.equal(h.calls.length, 0);
  await h.click("변경사항 적용");
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])), { quant_rule: null, budget_krw: null, side: "sell", dca: true });
});

test("KR·US 그룹 저장 API의 success:false를 rejected로 전달한다", async () => {
  const output = { exports: {} as any };
  const createAppSlice = buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } });
  let response: any = { success: false, error: "저장 실패" };
  runInNewContext(compile("../lib/features/capital/capitalSlice.tsx"), { exports: output.exports, require(name: string) {
    if (name === "@/lib/createAppSlice") return { createAppSlice };
    if (name === "./capitalAPI") return new Proxy({}, { get: () => async () => response });
    return require(name);
  } });
  const store = configureStore({ reducer: { capital: output.exports.capitalSlice.reducer } });
  for (const market of ["Kr", "Us"]) {
    const action = output.exports[`reqPost${market}CapitalGroupUpdate`];
    await assert.rejects(store.dispatch(action({ groupId: "group", updates: { dca: true } })).unwrap(), { message: "저장 실패" });
    assert.equal((store.getState().capital as any)[`${market.toLowerCase()}GroupOp`].state, "rejected");
    response = { groups: [] };
    await store.dispatch(action({ groupId: "group", updates: { dca: true } })).unwrap();
    assert.equal((store.getState().capital as any)[`${market.toLowerCase()}GroupOp`].state, "fulfilled");
    response = { success: false, error: "저장 실패" };
  }
});

test("목표 비중에서 퀀트 전환 시 기존 정책을 명시적으로 해제한다", async () => {
  const h = editor({ groupRebalancing: { execution: "buy_only", cash_bp: 10000, tolerance_bp: 0, cash_minor: 0, min_order_minor: 0, targets: [] } });
  h.click("퀀트재무·NCAV 조건을 확인해 매매합니다.");
  await h.click("이 전략으로 적용");
  assert.equal(h.calls[0].rebalancing, null);
  assert.equal(h.calls[0].dca, false);
});
