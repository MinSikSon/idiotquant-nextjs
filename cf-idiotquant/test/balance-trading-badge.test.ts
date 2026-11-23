import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../components/inquireBalanceResult.tsx", import.meta.url), "utf8") + "\nexports.Table = SortableBalanceTable; exports.tickerKey = balanceTickerKey;", {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const exports: any = {};
runInNewContext(source, { exports, Intl, require(name: string) {
  if (name === "react") return { useState: (value: unknown) => [value, () => {}], useMemo: (fn: () => unknown) => fn() };
  if (name === "next/navigation") return { useRouter: () => ({}) };
  if (name.endsWith("validCorpCode.json")) return JSON.parse(readFileSync(new URL(`../public/data/${name.split("/").at(-1)}`, import.meta.url), "utf8"));
  if (name.endsWith(".json")) return [];
  if (name.startsWith("@/")) return {};
  return require(name);
} });
const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const text = (node: any): string => typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";

for (const isUs of [false, true]) {
  for (const [group, enabled, expected, color] of [
    [{ name: "운용", active: true, assigned: true, side: "buy" }, true, "자동매매 · 매수", "text-brand-ink"],
    [{ name: "운용", active: true, assigned: true, side: "sell" }, true, "자동매매 · 매도", "text-rose-600 dark:text-rose-400"],
    [{ name: "운용", active: true, assigned: true }, true, "자동매매 · 매수", "text-brand-ink"],
    [{ name: "운용", active: true, assigned: true, side: "sell" }, false, "자동매매 OFF · 매도", "text-neutral-500 dark:text-neutral-400"],
    [{ name: "제외 그룹", active: false, assigned: true }, true, "자동매매 제외 · 매수", "text-neutral-500 dark:text-neutral-400"],
    [{ name: "미지정", active: false, assigned: false }, true, "자동매매 제외", "text-neutral-500 dark:text-neutral-400"],
    [undefined, true, "", ""],
  ] as const) {
    test(`${isUs ? "US" : "KR"}: ${group?.name ?? "미등록 종목"}의 ${expected || "아이콘 없음"} 표시`, () => {
      const ticker = isUs ? "AAPL" : "005930";
      const item = isUs ? { ovrs_pdno: ticker, ovrs_item_name: "긴 미국 종목명" } : { pdno: ticker, prdt_name: "긴 국내 종목명" };
      const tree = exports.Table({ inventoryData: [item], isUs, onOpenOrder: () => {}, countryTradingActive: enabled, groupByTicker: new Map(group ? [[ticker, group]] : []) });
      const summary = nodes(tree).find(n => n.type === "summary");
      assert.ok(summary);
      assert.ok(!text(summary).includes("자동매매"));
      const nameLine = summary.props.children[0];
      assert.ok(!nameLine.props.className.includes("flex-col"));
      const desktop = nodes(tree).find(n => n.type === "table");
      for (const view of [summary, desktop]) {
        const icons = nodes(view).filter(n => n.props?.["aria-label"]?.startsWith("자동매매"));
        assert.equal(icons.length, group ? 1 : 0);
        if (!group) continue;
        const [icon] = icons;
        const description = `${expected} · ${group.name}`;
        assert.equal(icon.props["aria-label"], description);
        assert.equal(icon.props.title, description);
        assert.equal(icon.props.role, "img");
        assert.equal(icon.props.className, `inline-flex shrink-0 items-center ${color}`);
        assert.equal(text(icon), "");
      }
    });
  }
}

for (const [input, expected] of [["전방", "000950"], [950, "000950"], ["A000950", "000950"], [" 000950 ", "000950"], ["삼정펄프", "009770"], ["디와이파워", "210540"]]) {
  test(`국내 자동매매 ${input}와 잔고 ${expected}를 같은 종목으로 연결`, () => {
    const key = exports.tickerKey(input, false);
    assert.equal(key, expected);
    const tree = exports.Table({ inventoryData: [{ pdno: expected, prdt_name: String(input) }], isUs: false, countryTradingActive: true, groupByTicker: new Map([[key, { name: "11월-04월", active: true, assigned: true }]]) });
    const summary = nodes(tree).find(n => n.type === "summary");
    assert.ok(nodes(summary).some(n => n.props?.["aria-label"] === "자동매매 · 매수 · 11월-04월"));
  });
}

for (const [label, isUs, fields, expected] of [
  ["당일 매수 후 결제 전", true, { cblc_qty13: "0", ccld_qty_smtl1: "7" }, "7"],
  ["당일 전량 매도 후 결제 전", true, { cblc_qty13: "7", ccld_qty_smtl1: "0" }, "0"],
  ["체결 기준 수량 누락", true, { cblc_qty13: "7", ccld_qty_smtl1: " " }, "7"],
  ["소수점 잔고", true, { cblc_qty13: "0.000012", ccld_qty_smtl1: "0.000012" }, "0.000012"],
  ["국내 잔고", false, { hldg_qty: "7", ord_psbl_qty: "3" }, "7"],
] as const) {
  test(`자산 페이지 모바일과 데스크톱의 보유수량: ${label}`, () => {
    const item = { pdno: isUs ? "AAPL" : "005930", prdt_name: "테스트 종목", ...fields };
    const orders: unknown[][] = [];
    const tree = exports.Table({ inventoryData: [item], isUs, onOpenOrder: (...args: unknown[]) => orders.push(args) });
    const mobilePosition = nodes(tree).find(n => n.type === "details");
    const mobileLabel = nodes(mobilePosition).find(n => n.type === "div" && text(n.props.children?.[0]) === "보유수량");
    assert.equal(text(mobileLabel.props.children[1]), expected);
    const desktopPosition = nodes(tree).find(n => n.type === "tbody");
    assert.equal(text(nodes(desktopPosition).filter(n => n.type === "td")[2]), expected);

    for (const position of [mobilePosition, desktopPosition]) {
      const sell = nodes(position).find(n => n.type === "button" && (n.props.title ?? text(n)).trim() === "전량 매도");
      assert.equal(Boolean(sell), expected !== "0");
      sell?.props.onClick();
    }
    assert.deepEqual(orders, expected === "0" ? [] : [[item, "sell", expected], [item, "sell", expected]]);
  });
}

test("미국 티커는 대소문자·공백만 정규화한다", () => {
  assert.equal(exports.tickerKey(" aapl ", true), "AAPL");
  assert.equal(exports.tickerKey("BRK.B", true), "BRK.B");
  assert.equal(exports.tickerKey("950", true), "950");
});

test("자동매매 목록도 종목 마스터의 코드에 맞는 이름을 표시한다", () => {
  const tableSource = ts.transpileModule(readFileSync(new URL("../components/balance/stockListTable.tsx", import.meta.url), "utf8") + "\nexports.displayName = resolveDisplayName;", {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const tableExports: any = {};
  runInNewContext(tableSource, { exports: tableExports, require(name: string) {
    if (name.endsWith("validCorpCode.json")) return JSON.parse(readFileSync(new URL("../public/data/validCorpCode.json", import.meta.url), "utf8"));
    if (name.startsWith("@/") || name.startsWith("./")) return {};
    return require(name);
  } });
  assert.equal(tableExports.displayName("000950"), "전방");
  assert.equal(tableExports.displayName("032850"), "비트컴퓨터");
  assert.equal(tableExports.displayName("210540"), "디와이파워");
  assert.equal(tableExports.displayName("009770"), "삼정펄프");
  assert.equal(tableExports.displayName("079960"), "동양이엔피");
});

test("자산 상단 네 탭의 아이콘을 작은 화면에서도 숨기지 않는다", () => {
  const navSource = ts.transpileModule(readFileSync(new URL("../components/balance/sectionNav.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const navExports: any = {};
  runInNewContext(navSource, { exports: navExports, require(name: string) {
    if (name === "@/lib/utils") return { cn: (...classes: string[]) => classes.join(" ") };
    return require(name);
  } });
  const sections = ["자산", "자동매매", "주문내역", "계정"].map((label, index) => ({ id: String(index), label, icon: `icon-${index}` }));
  const tree = navExports.SectionNav({ sections, mobileTab: "0" });
  const buttons = nodes(tree).filter(n => n.type === "button");
  assert.equal(buttons.length, 4);
  for (const [index, button] of buttons.entries()) {
    const icon = button.props.children[0];
    assert.equal(text(icon), `icon-${index}`);
    assert.ok(!icon.props.className.includes("hidden"));
    assert.ok(button.props.className.includes("min-h-11"));
  }
});
