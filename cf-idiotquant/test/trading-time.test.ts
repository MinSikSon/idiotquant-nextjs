import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { formatTradingTime } from "../lib/features/capital/tradingTime.ts";

const legacy = "Wed Nov 18 2026 23:50:00 GMT+0000 (Coordinated Universal Time)";

test("실행 시각은 Worker의 KST 이동을 보정하고 오류 ISO 시각은 한국 시간으로 변환한다", () => {
    assert.equal(formatTradingTime(legacy, true), "2026-11-18 23:50:00 KST");
    assert.equal(formatTradingTime("2026-11-18T14:50:00.000Z"), "2026-11-18 23:50:00 KST");
    assert.equal(formatTradingTime("2026-11-18T14:50:00.000Z", true), "2026-11-18 23:50:00 KST");
    assert.equal(formatTradingTime("2026-11-18T15:00:00Z"), "2026-11-19 00:00:00 KST");
    assert.equal(formatTradingTime("2026-11-18T23:50:00+09:00"), "2026-11-18 23:50:00 KST");
});

test("없는 시각이나 잘못된 시각을 방금으로 표시하지 않는다", () => {
    assert.equal(formatTradingTime(), "기록 없음");
    assert.equal(formatTradingTime(""), "기록 없음");
    assert.equal(formatTradingTime("invalid"), "시각 확인 불가");
});

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../components/balance/tradingActivityPanel.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const output = { exports: {} as { default: React.ComponentType<Record<string, unknown>> } };
runInNewContext(source, { exports: output.exports, Date, require(name: string) {
    if (name === "@/lib/features/capital/tradingTime") return { formatTradingTime };
    if (name === "@/lib/features/capital/tradingSummary") return require("../lib/features/capital/tradingSummary.ts");
    if (name === "@/lib/features/capital/capitalSlice") return { LIKES_GROUP_ID: "likes" };
    if (name === "@/lib/utils") return { cn: (...values: unknown[]) => values.filter(Boolean).join(" ") };
    if (name === "./detailHelp") return { DetailHelp: () => null };
    if (name.startsWith("@/public/data/")) return { default: [] };
    return require(name);
} });

for (const country of ["KR", "US"]) test(`${country}: 실행 시각과 종목별 오류 시각·사유가 title 밖 본문에도 표시된다`, () => {
    const html = renderToStaticMarkup(React.createElement(output.exports.default, {
        country, capital: { groups: [{ id: "g", is_trading_active: true }],
            stock_list: [{ symbol: "AAPL", group_id: "g", action: "active", token: 100,
                last_result: { at: "2026-11-18T14:51:23Z", code: "order_error", msg: "주문가능금액 부족" } }],
            time_stamp: { current: legacy } }, activity: { state: "fulfilled", logs: [] },
    }));
    const body = html.replace(/title="[^"]*"/g, "");
    assert.match(body.replace(/<[^>]*>/g, ""), /마지막 실행2026-11-18 23:50:00 KST/);
    assert.equal((body.match(/결과 시각 · 2026-11-18 23:51:23 KST/g) ?? []).length, 2);
    assert.equal((body.match(/주문가능금액 부족/g) ?? []).length, 2);
    assert.doesNotMatch(body, /방금/);
});
