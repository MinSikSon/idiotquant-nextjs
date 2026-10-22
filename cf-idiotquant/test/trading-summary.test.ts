import test from "node:test";
import assert from "node:assert/strict";
import { currentLogGroup, executionAmount, executionTotals, numericValue, stockBudgetProgress } from "../lib/features/capital/tradingSummary.ts";

const buy = { ts: 1, buyOrSell: "buy", stck_prpr: "12500", ORD_QTY: "3" };

test("체결금은 가격 × 수량이며 누락·잘못된 값은 미확인으로 남긴다", () => {
    assert.equal(executionAmount(buy), 37500);
    for (const value of [undefined, "", " ", "invalid", -1, 0, Infinity]) {
        assert.equal(executionAmount({ ...buy, stck_prpr: value }), null);
        assert.equal(executionAmount({ ...buy, ORD_QTY: value }), null);
    }
    assert.equal(numericValue("0"), 0);
    assert.equal(numericValue(undefined), null);
    assert.equal(numericValue(null), null);
    assert.equal(executionAmount({ ...buy, stck_prpr: 1e308, ORD_QTY: 3 }), null);
});

test("매수·매도를 분리하고 금액 미확인·방향 미확인 로그를 제외한다", () => {
    assert.deepEqual(executionTotals([
        buy,
        { ...buy, buyOrSell: "sell", stck_prpr: 100, ORD_QTY: 2 },
        { ...buy, stck_prpr: undefined },
        { ...buy, buyOrSell: undefined },
    ]), { buy: 37500, sell: 200, missing: 2 });
    assert.deepEqual(executionTotals([]), { buy: 0, sell: 0, missing: 0 });
});

test("현재 소속이 유일한 종목만 풀에 집계하고 중복 소속은 연결하지 않는다", () => {
    const stocks = [
        { symbol: "005930", key: "a", group_id: "pool-a" },
        { symbol: "AAPL", key: "b", group_id: "pool-b" },
    ];
    assert.equal(currentLogGroup({ ...buy, stock_code: "005930", symbol: "other" }, stocks, "KR"), "pool-a");
    assert.equal(currentLogGroup({ ...buy, symbol: "AAPL" }, stocks, "US"), "pool-b");
    assert.equal(currentLogGroup({ ...buy, symbol: "removed" }, stocks, "US"), null);
    assert.equal(currentLogGroup(buy, stocks, "KR"), null);
    assert.equal(currentLogGroup({ ...buy, symbol: "AAPL" }, [...stocks, { symbol: "AAPL", key: "c", group_id: "pool-c" }], "US"), null);
});

test("1주 적립 진행률은 각 종목의 포인트와 시세를 비교한다", () => {
    const stock = { symbol: "005930", key: "a", token: 7500, condition: { LastPrice: "10000" } } as import("../lib/features/capital/capitalSlice").UsCapitalStockItem;
    assert.deepEqual(stockBudgetProgress(stock, "KR"), { unitKrw: 10000, points: 7500, percent: 75, shares: 0, missing: 2500 });
    assert.deepEqual(stockBudgetProgress({ ...stock, token: 25000 }, "KR"), { unitKrw: 10000, points: 25000, percent: 100, shares: 2, missing: 0 });
    assert.equal(stockBudgetProgress({ ...stock, token: -1 }, "KR")?.points, 0);
});

test("미국 적립 진행률은 환율을 반영하고 결측 시세·환율은 추정하지 않는다", () => {
    const stock = { symbol: "AAPL", key: "a", token: 150000, condition: { LastPrice: "200" } } as import("../lib/features/capital/capitalSlice").UsCapitalStockItem;
    assert.equal(stockBudgetProgress(stock, "US", 1500)?.percent, 50);
    assert.equal(stockBudgetProgress(stock, "US"), null);
    assert.equal(stockBudgetProgress(stock, "US", 0), null);
    assert.equal(stockBudgetProgress({ ...stock, condition: undefined }, "KR"), null);
    assert.equal(stockBudgetProgress(stock, "US", 1e308), null);
});
