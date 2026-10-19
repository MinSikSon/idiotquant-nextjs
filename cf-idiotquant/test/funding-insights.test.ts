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
    assert.equal(result.buyTokens, 200);
    assert.equal(result.tokenRatio, 10);
    assert.equal(result.buyPerHour, 120);
    assert.equal(result.tickRatio, 0.5);
    assert.equal(result.hourlyRatio, 6);
    assert.equal(result.sellPerHour, 60);
    assert.equal(fundingMetrics(capital, 500).monthlyRatio, 200);
    assert.equal(fundingMetrics(capital, 0).monthlyRatio, null);
    assert.equal(fundingMetrics(capital, null).tokenRatio, null);
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
