import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { parseScaled } from "../lib/features/capital/rebalancing.ts";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../components/balance/weightStrategyEditor.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const policy = { execution: "buy_only", cash_bp: 1000, cash_minor: 100000, min_order_minor: 0, tolerance_bp: 100, targets: [{ symbol: "A", weight_bp: 5000 }, { symbol: "B", weight_bp: 4000 }] };
const result = { total_minor: 1000000, target_cash_minor: 100000, observed_at: "2026-11-07T00:00:00Z", rows: [{ symbol: "A", current_minor: 400000, target_minor: 500000, current_bp: 4000, target_bp: 5000, difference_bp: -1000, side: "buy", quantity: 1, amount_minor: 100000, reason: "planned" }] };
function editor(overrides: Record<string, unknown> = {}) {
  const states: any[] = [], saves: any[] = [], previews: any[] = [];
  let cursor = 0;
  const props = { policy, stocks: [{ symbol: "A", name: "삼성" }, { symbol: "B", name: "현대" }], currency: "KRW", stale: false,
    onApply: async (value: unknown) => { saves.push(value); }, onPreview: async (value: unknown) => { previews.push(value); return result; }, onClose() {}, ...overrides };
  const output = { exports: {} as any };
  runInNewContext(source, { exports: output.exports, require(name: string) {
    if (name === "./rebalancingExecutionPanel") return { default: () => null };
    if (name === "@/lib/features/capital/rebalancing") return { parseScaled };
    if (name !== "react") return require(name);
    return { useEffect(fn: () => void) { fn(); }, useState(initial: any) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial; return [states[index], (next: any) => states[index] = typeof next === "function" ? next(states[index]) : next]; }, useRef(initial: unknown) { return states[cursor++] ??= { current: initial }; } };
  } });
  const render = () => { cursor = 0; return output.exports.default(props); };
  const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const text = (node: any): string => typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
  const button = (label: string) => { const node = nodes(render()).find(n => n.type === "button" && text(n) === label); assert.ok(node, label); return node; };
  const click = (label: string) => { const b = button(label); if (!b.props.disabled) return b.props.onClick(); };
  const change = (label: string, value: string) => { const wrapper = nodes(render()).find(n => n.type === "label" && text(n).startsWith(label)); assert.ok(wrapper, label); nodes(wrapper).find(n => n.type === "input" || n.type === "select").props.onChange({ target: { value } }); };
  return { props, saves, previews, render, text, button, click, change };
}

test("비중은 정수 bp로 파싱하고 반올림·지수·무효 입력을 거부", () => {
  assert.equal(parseScaled("33.33"), 3333);
  assert.equal(parseScaled("0.01"), 1);
  for (const value of ["", " ", "1e2", "-1", "1.001", "NaN", "Infinity"]) assert.equal(parseScaled(value), null, value);
});

test("KR 목표 합계와 통화 단위 검증 후 정책만 저장", async () => {
  const h = editor();
  h.change("삼성 목표", "50.001");
  assert.equal(h.button("목표 비중 적용").props.disabled, true);
  h.change("삼성 목표", "50");
  h.change("그룹 배정 현금", "500000.1");
  assert.equal(h.button("목표 비중 적용").props.disabled, true);
  h.change("그룹 배정 현금", "500000");
  await h.click("목표 비중 적용");
  assert.equal(h.saves.length, 1);
  assert.equal(h.saves[0].cash_minor, 500000);
  assert.equal(h.saves[0].targets[0].weight_bp, 5000);
});

test("US 달러 입력은 센트로 저장하고 빈 그룹은 저장·조회 차단", async () => {
  const h = editor({ currency: "USD" });
  h.change("그룹 배정 현금", "123.45");
  await h.click("목표 비중 적용");
  assert.equal(h.saves[0].cash_minor, 12345);
  const empty = editor({ stocks: [], policy: null });
  assert.equal(empty.button("목표 비중 적용").props.disabled, true);
  assert.equal(empty.button("주문 미리보기").props.disabled, true);
});

test("미리보기는 저장하지 않으며 입력 변경·서버 변경 시 이전 결과를 숨김", async () => {
  const h = editor();
  await h.click("주문 미리보기");
  assert.equal(h.previews.length, 1);
  assert.equal(h.saves.length, 0);
  assert.match(h.text(h.render()), /운용자산/);
  assert.match(h.text(h.render()), /매수 1주/);
  h.change("허용 오차", "2");
  assert.doesNotMatch(h.text(h.render()), /운용자산/);
  await h.click("주문 미리보기");
  h.props.stale = true;
  assert.doesNotMatch(h.text(h.render()), /운용자산/);
  assert.equal(h.button("목표 비중 적용").props.disabled, true);
});

test("중복 조회·지연 응답을 막고 실패 후 편집값과 재시도 유지", async () => {
  let resolve!: (value: unknown) => void;
  const h = editor({ onPreview: () => new Promise(r => { resolve = r; }) });
  const click = h.button("주문 미리보기").props.onClick;
  const pending = click();
  await click();
  assert.equal(h.button("잔고 조회 중…").props.disabled, true);
  h.props.stale = true;
  h.render();
  resolve(result);
  await pending;
  assert.doesNotMatch(h.text(h.render()), /운용자산/);
  const failed = editor({ onApply: async () => { throw Error("network"); } });
  failed.change("그룹 배정 현금", "999");
  await failed.click("목표 비중 적용");
  assert.match(failed.text(failed.render()), /저장하지 못했습니다/);
  assert.equal(failed.button("목표 비중 적용").props.disabled, false);
});

test("예약 일시는 한국 시간으로 검증하고 UTC로 저장한다", async () => {
  const h = editor();
  h.change("예약 실행", "weekly");
  assert.equal(h.button("목표 비중 적용").props.disabled,true);
  h.change("첫 예약 일시", "2026-11-09T10:00");
  await h.click("목표 비중 적용");
  assert.equal(h.saves[0].schedule.start_at,"2026-11-09T01:00:00.000Z");
  assert.equal(h.saves[0].schedule.frequency,"weekly");
  const monthly = editor();monthly.change("예약 실행","monthly");monthly.change("첫 예약 일시","2026-11-29T10:00");
  assert.equal(monthly.button("목표 비중 적용").props.disabled,true);
});
