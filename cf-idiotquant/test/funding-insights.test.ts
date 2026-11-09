import test from "node:test";
import assert from "node:assert/strict";
import { tradingCash, fundingMetrics, refillBuckets, refillWindowOpen } from "../lib/features/capital/fundingInsights.ts";
import type { KrUsCapitalType } from "../lib/features/capital/capitalSlice";

test("예수금 0과 미조회 값을 구분하고 실패 응답을 잔고로 표시하지 않는다", () => {
    assert.equal(tradingCash("KR", { state: "fulfilled", output2: [{ dnca_tot_amt: "0" }] }).amount, 0);
    assert.equal(tradingCash("KR", { state: "pending", output2: [] }).amount, null);
    assert.equal(tradingCash("KR", { state: "rejected", output2: [{ dnca_tot_amt: "100" }] }).amount, null);
});
test("미국은 USD 행만 선택하고 같은 행의 환율로 원화 비교한다", () => {
    const rows = [{ crcy_cd: "EUR", frcr_dncl_amt_2: "99999", frst_bltn_exrt: "1600" }, { crcy_cd: "USD", frcr_dncl_amt_2: "1000", frst_bltn_exrt: "1500" }];
    assert.equal(tradingCash("US", { state: "fulfilled", output2: rows }).krw, 1500000);
    assert.equal(tradingCash("US", { state: "fulfilled", output2: rows.slice(0, 1) }).amount, null);
    const noRate = tradingCash("US", { state: "fulfilled", output2: [{ crcy_cd: "USD", frcr_dncl_amt_2: "100" }] });
    assert.equal(noRate.amount, 100);
    assert.equal(noRate.krw, null);
});
const capital = {
    groups: [{ id: "a", side: "buy" }, { id: "b", side: "sell" }],
    stock_list: [{ symbol: "A", group_id: "a", token: 200 }, { symbol: "B", group_id: "b", token: 99999 }, { symbol: "C", group_id: "__likes__", token: 99999 }],
    refill_plan: { at: 1, period_minutes: 5, account_monthly_krw: 1500, groups: [
        { group_id: "a", side: "buy", monthly_budget_krw: 1000, stock_count: 1, per_stock_krw: 10, per_tick_krw: 10 },
        { group_id: "b", side: "sell", monthly_budget_krw: 500, stock_count: 1, per_stock_krw: 5, per_tick_krw: 5 },
    ] },
} as KrUsCapitalType;

test("충전 비중은 활성 매수 월 예산만 포함하고 매도 포인트·좋아요를 제외한다", () => {
    const result = fundingMetrics(capital, 2000);
    assert.equal(result.monthlyRatio, 50);
    assert.equal(result.buyPerHour, 120);
    assert.equal(result.tickRatio, 0.5);
    assert.equal(result.hourlyRatio, 6);
    assert.equal(result.sellPerHour, 60);
    assert.equal(fundingMetrics(capital, 500).monthlyRatio, 200);
    assert.equal(fundingMetrics(capital, 0).monthlyRatio, null);
    assert.equal(fundingMetrics(capital, null).budgetRatio, null);
    assert.equal(fundingMetrics({ ...capital, refill_plan: undefined }, 2000).monthlyRatio, null);
});
test("충전 그래프는 실제 기록만 합산하고 미래·범위 밖·음수 기록을 제외한다", () => {
    const now = Date.UTC(2026, 9, 19, 2, 30);
    const buckets = refillBuckets([
        { at: now, buy_krw: 10, sell_krw: 2 },
        { at: now - 5 * 60000, buy_krw: 20, sell_krw: 3 },
        { at: now + 1000, buy_krw: 999, sell_krw: 0 },
        { at: now - 3600000, buy_krw: 999, sell_krw: 0 },
        { at: now, buy_krw: -1, sell_krw: 0 },
    ], now, 60);
    assert.equal(buckets.length, 12);
    assert.equal(buckets[0].at, now - 3600000);
    assert.equal(buckets.reduce((sum, bucket) => sum + bucket.buy, 0), 30);
    assert.equal(buckets.reduce((sum, bucket) => sum + bucket.count, 0), 2);
    assert.equal(buckets.at(-1)?.sell, 2);
    assert.equal(refillBuckets([], now, 1440).length, 24);
    assert.ok(refillBuckets([], now, 60).every(bucket => bucket.count === 0));
});
test("국장·미장 스케줄을 한국 시간으로 구분하고 미국 자정 이후를 포함한다", () => {
    assert.equal(refillWindowOpen("KR", Date.parse("2026-10-19T09:00:00+09:00")), true);
    assert.equal(refillWindowOpen("KR", Date.parse("2026-10-19T20:00:00+09:00")), false);
    assert.equal(refillWindowOpen("US", Date.parse("2026-10-20T02:00:00+09:00")), true);
    assert.equal(refillWindowOpen("US", Date.parse("2026-10-20T06:01:00+09:00")), false);
});


test("잔여 예산은 선정 상태·풀 ON/OFF와 무관하게 운용 풀별로 합산한다", () => {
    const current = {
        ...capital,
        groups: [{ id: "a", is_trading_active: true }, { id: "b", side: "sell", is_trading_active: true }, { id: "off", is_trading_active: false }, { id: "__likes__", is_trading_active: true }],
        stock_list: [
            { symbol: "A", group_id: "a", action: "active", token: 300 },
            { symbol: "B", group_id: "a", action: "active", token: 200 },
            { symbol: "C", group_id: "b", action: "active", token: 100 },
            { symbol: "D", group_id: "a", action: "inactive", token: 9000 },
            { symbol: "E", group_id: "off", action: "active", token: 9000 },
            { symbol: "F", group_id: "__likes__", action: "active", token: 9000 },
            { symbol: "G", group_id: null, action: "active", token: 9000 },
            { symbol: "H", group_id: "deleted", action: "active", token: 9000 },
        ],
    } as KrUsCapitalType;
    const result = fundingMetrics(current, 1000);
    assert.equal(result.budgetBuy, 18500);
    assert.equal(result.budgetSell, 100);
    assert.equal(result.budgetTotal, 18600);
    assert.ok(Math.abs(result.budgetRatio! - 1860) < 1e-9);
    assert.equal(result.budgetBuyRatio, 1850);
    assert.equal(result.budgetSellRatio, 10);
    assert.equal(result.budgetStocks, 5);
    assert.equal(result.budgetPools, 3);
    // 풀을 꺼도 적립된 예산은 사라지지 않는다.
    const paused = fundingMetrics({ ...current, groups: current.groups!.map(group => ({ ...group, is_trading_active: false })) }, 1000);
    assert.equal(paused.budgetTotal, 18600);
    assert.equal(paused.budgetPools, 3);
    assert.equal(paused.budgetStocks, 5);
});

test("잔여 예산은 음수·미확인 포인트를 제외하고 예수금 초과 비율을 그대로 제공한다", () => {
    const current = { ...capital, stock_list: [
        { symbol: "A", group_id: "a", action: "active", token: 1500 },
        { symbol: "B", group_id: "a", action: "active", token: -100 },
        { symbol: "C", group_id: "a", action: "active" },
    ] } as KrUsCapitalType;
    assert.equal(fundingMetrics(current, 1000).budgetRatio, 150);
    assert.equal(fundingMetrics(current, 0).budgetRatio, null);
    assert.equal(fundingMetrics(current, null).budgetRatio, null);
    assert.equal(fundingMetrics({ ...current, refill_plan: undefined }, 1000).budgetTotal, 1500);
    assert.equal(fundingMetrics({ ...current, stock_list: [] }, 1000).budgetTotal, 0);
    const usdCash = tradingCash("US", {state: "fulfilled", output2: [{crcy_cd: "USD", frcr_dncl_amt_2: "2", frst_bltn_exrt: "1500"}]});
    assert.equal(fundingMetrics(current, usdCash.krw).budgetRatio, 50);
});


test("선정 대기·OFF 풀에도 남은 매도 예산을 누락하지 않는다", () => {
    const current = {
        groups: [
            { id: "buy", side: "buy", is_trading_active: true },
            { id: "sell", side: "sell", is_trading_active: true },
            { id: "paused-sell", side: "sell", is_trading_active: false },
            { id: "__likes__", side: "sell", is_trading_active: true },
        ],
        stock_list: [
            { symbol: "A", group_id: "buy", action: "active", token: 158853 },
            { symbol: "B", group_id: "sell", action: "inactive", token: 200000 },
            { symbol: "C", group_id: "paused-sell", action: "inactive", token: 300000 },
            { symbol: "D", group_id: "sell", action: "init", token: 100000 },
            { symbol: "E", group_id: "__likes__", token: 900000 },
            { symbol: "F", group_id: "deleted", token: 900000 },
            { symbol: "G", token: 900000 },
        ],
    } as KrUsCapitalType;
    const result = fundingMetrics(current, 1000000);
    assert.equal(result.budgetBuy, 158853);
    assert.equal(result.budgetSell, 600000);
    assert.equal(result.budgetTotal, 758853);
    assert.equal(result.budgetSellRatio, 60);
    assert.equal(result.budgetStocks, 4);
    assert.equal(result.budgetPools, 3);
});
