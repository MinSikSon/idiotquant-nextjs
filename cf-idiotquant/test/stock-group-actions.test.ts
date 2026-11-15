import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../components/balance/stockListTable.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function table(overrides: Record<string, unknown>) {
  const states: any[] = [];
  let cursor = 0;
  const props = { session: { user: { name: "master" } }, data: { groups: [{ id: "g", name: "운용" }], stock_list: [{ symbol: "A", group_id: "g" }, { symbol: "B", group_id: "g" }] },
    likedList: [{ ticker: "A", stock_name: "A" }, { ticker: "B", stock_name: "B" }], ...overrides };
  const exports: any = {};
  runInNewContext(source, { exports, process: { env: { NEXT_PUBLIC_MASTER: "master" } }, window: { confirm: () => true, prompt: () => "새 그룹" }, require(name: string) {
    if (name === "react") return { memo: (fn: unknown) => fn, useMemo: (fn: () => unknown) => fn(),
      useRef(initial: unknown) { return states[cursor++] ??= { current: initial }; },
      useState(initial: unknown) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], (next: any) => { states[i] = typeof next === "function" ? next(states[i]) : next; }]; } };
    if (name === "@/lib/features/capital/tradingSummary") return { tradingCursorIndex: () => null };
    if (name === "@/lib/features/capital/capitalSlice") return { LIKES_GROUP_ID: "__likes__" };
    if (name.endsWith(".json")) return [];
    if (name.startsWith("./") || name.startsWith("@/")) return {};
    return require(name);
  } });
  const render = () => { cursor = 0; return exports.default(props); };
  const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const text = (node: any): string => typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
  const section = (key = "__likes__") => nodes(render()).find(n => n.props?.sectionKey === key);
  const pick = (symbol: string, key = "__likes__") => section(key).props.onTogglePick(key, symbol);
  const selected = () => Array.from(section().props.picked);
  const change = (label: string, value: string) => {
    const wrapper = nodes(render()).find(n => n.type === "label" && text(n).includes(label));
    assert.ok(wrapper, label);
    nodes(wrapper).find(n => n.type === "select").props.onChange({ target: { value } });
  };
  const click = (label: string) => {
    const action = ({ "복사": "copy", "이동": "move", "삭제": "remove", "새 그룹": "create" } as Record<string, string>)[label];
    change("1. 할 작업", action);
    if (action === "copy" || action === "move") change("2. 대상 그룹", "g");
    const button = nodes(render()).find(n => n.type === "button" && text(n).includes("3."));
    assert.ok(button, label);
    return button.props.onClick();
  };
  return { pick, selected, click, render, text };
}

for (const [label, callback] of [["복사", "onCopyLikes"], ["이동", "onBulkMove"], ["삭제", "onBulkRemove"], ["새 그룹", "onCreateGroup"]]) {
  test(`${label}: 실패하면 선택 유지, 성공한 종목만 선택 해제`, async () => {
    let fail = true;
    const h = table({ [callback]: async () => { if (fail) throw Error("계좌 주문 처리 중입니다."); } });
    h.pick("A", label === "복사" ? "__likes__" : "g");
    await h.click(label);
    assert.deepEqual(h.selected(), [label === "복사" ? "__likes__::A" : "g::A"]);
    assert.match(h.text(h.render()), /계좌 주문 처리 중/);
    fail = false;
    await h.click(label);
    assert.deepEqual(h.selected(), []);
  });
}

test("복사 처리 중 중복 요청을 막고 처리 중 새로 선택한 종목을 보존한다", async () => {
  let finish!: () => void, calls = 0;
  const h = table({ onCopyLikes: () => { calls++; return new Promise<void>(resolve => { finish = resolve; }); } });
  h.pick("A");
  const pending = h.click("복사");
  await h.click("복사");
  assert.equal(calls, 1);
  h.pick("B");
  finish();
  await pending;
  assert.deepEqual(h.selected(), ["__likes__::B"]);
});

for (const action of ["복사", "이동"]) {
  test(`${action}: 관심·운용 혼합 선택에서 처리하지 않은 섹션의 선택 유지`, async () => {
    const h = table({ onCopyLikes: async () => {}, onBulkMove: async () => {} });
    h.pick("A");
    h.pick("B", "g");
    await h.click(action);
    assert.deepEqual(h.selected(), action === "복사" ? ["g::B"] : ["__likes__::A"]);
  });
}
