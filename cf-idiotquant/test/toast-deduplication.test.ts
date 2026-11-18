import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(readFileSync(new URL("../components/ui/toast.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

test("같은 주문 잠금 오류는 한 번만 표시하고 만료·닫기 후 다시 표시할 수 있다", () => {
  let toasts: any[] = [];
  const timers: (() => void)[] = [];
  const exports: any = {};
  runInNewContext(source, { exports, setTimeout(fn: () => void) { timers.push(fn); }, require(name: string) {
    if (name === "react") return { memo: (fn: unknown) => fn, useCallback: (fn: unknown) => fn,
      useState: () => [toasts, (update: (prev: any[]) => any[]) => { toasts = update(toasts); }] };
    return name === "react/jsx-runtime" ? { jsx: () => null } : {};
  } });
  const { addToast, removeToast } = exports.useToast();
  addToast("error", "계좌 주문 처리 중입니다.");
  addToast("error", "계좌 주문 처리 중입니다.");
  assert.equal(toasts.length, 1);
  addToast("error", "다른 오류");
  assert.equal(toasts.length, 2);
  timers[1](); // 중복 호출의 타이머가 기존 알림을 지우지 않는다.
  assert.equal(toasts.length, 2);
  timers[0]();
  assert.equal(toasts.length, 1);
  addToast("error", "계좌 주문 처리 중입니다.");
  assert.equal(toasts.length, 2);
  removeToast(toasts[1].id);
  assert.equal(toasts.length, 1);
  addToast("error", "계좌 주문 처리 중입니다.");
  assert.equal(toasts.length, 2);
});
