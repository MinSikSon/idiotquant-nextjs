import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../components/inquireBalanceResult.tsx", import.meta.url), "utf8") + "\nexports.Table = SortableBalanceTable;", {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const exports: any = {};
runInNewContext(source, { exports, Intl, require(name: string) {
  if (name === "react") return { useState: (value: unknown) => [value, () => {}], useMemo: (fn: () => unknown) => fn() };
  if (name === "next/navigation") return { useRouter: () => ({}) };
  if (name.endsWith(".json")) return [];
  if (name.startsWith("@/")) return {};
  return require(name);
} });
const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const text = (node: any): string => typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";

for (const isUs of [false, true]) {
  for (const [group, enabled, expected] of [
    [{ name: "운용", active: true, assigned: true }, true, "자동매매"],
    [{ name: "운용", active: true, assigned: true }, false, "자동매매 OFF"],
    [{ name: "제외 그룹", active: false, assigned: true }, true, "자동매매 제외"],
    [{ name: "미지정", active: false, assigned: false }, true, "자동매매 제외"],
    [undefined, true, ""],
  ] as const) {
    test(`${isUs ? "US" : "KR"}: 접힌 자산 행에 ${expected || "배지 없음"} 표시`, () => {
      const ticker = isUs ? "AAPL" : "005930";
      const item = isUs ? { ovrs_pdno: ticker, ovrs_item_name: "긴 미국 종목명" } : { pdno: ticker, prdt_name: "긴 국내 종목명" };
      const tree = exports.Table({ inventoryData: [item], isUs, onOpenOrder: () => {}, countryTradingActive: enabled, groupByTicker: new Map(group ? [[ticker, group]] : []) });
      const summary = nodes(tree).find(n => n.type === "summary");
      assert.ok(summary);
      if (expected) {
        assert.ok(text(summary).includes(expected));
        assert.ok(nodes(summary).some(n => n.props?.["aria-label"] === `${expected} · ${group!.name}`));
      } else {
        assert.ok(!text(summary).includes("자동매매"));
      }
      const desktop = nodes(tree).find(n => n.type === "table");
      const desktopBadges = nodes(desktop).filter(n => n.props?.["aria-label"]?.startsWith("자동매매"));
      assert.equal(desktopBadges.length, expected ? 1 : 0);
    });
  }
}
