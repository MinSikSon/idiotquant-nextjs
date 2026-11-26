import assert from "node:assert/strict";
import { test } from "node:test";
import { latestCompletedQuarter, mergeValuationSnapshots, newsletterUrl, parseStockKey, scanPath, scanSnapshot, seoulDate, valuationQuarters } from "../lib/utils/newsletterValuation.ts";
import { sampleSnapshots, sampleStocks } from "../app/(profile)/newsletter/historySample.ts";

const stock = { market: "KR", ticker: "005930" } as const;
const archived = {
    ticker: "005930", name: "삼성전자", period_end_date: "20250630", last_price: 59000,
    eps: 5600, bps: 63000, ncav_ratio: 0.95,
};

test("history uses the financial data stored at each date, and prefers a daily source for duplicates", () => {
    const monthly = scanSnapshot(archived, stock)!;
    const daily = scanSnapshot({ ...archived, scan_date: "2025-06-30", last_price: 60000, eps: 4800 }, stock)!;
    const earlier = scanSnapshot({ ...archived, period_end_date: "2025-06-27" }, stock)!;
    assert.equal(monthly.date, "2025-06-30");
    assert.equal(monthly.models.find(model => model.label === "SRIM")?.targetPrice, 70000);
    assert.equal(daily.models.find(model => model.label === "SRIM")?.targetPrice, 60000);
    assert.equal(daily.models.find(model => model.label === "PER")?.gapPercent?.toFixed(1), "-20.0");
    assert.deepEqual(mergeValuationSnapshots([[monthly, earlier], [daily]]), [earlier, daily]);
});

test("stock keys and scan snapshots reject invalid or mismatched data", () => {
    assert.deepEqual(parseStockKey("US:BRK.B"), { market: "US", ticker: "BRK.B" });
    assert.equal(parseStockKey("KR:005930:US"), null);
    assert.equal(parseStockKey("US:../AAPL"), null);
    assert.equal(scanSnapshot({ ...archived, country: "US" }, stock), null);
    assert.equal(scanSnapshot({ ...archived, period_end_date: "20250230" }, stock), null);
    assert.equal(scanSnapshot({ ...archived, last_price: null }, stock), null);
    assert.equal(newsletterUrl("history", stock), "/newsletter?step=history&stock=KR%3A005930");
    assert.equal(scanPath(stock, "preview"), "/scan/archive/ticker/005930?country=KR&period_type=monthly&limit=1");
});

test("missing fundamentals leave a gap instead of carrying a later value back in time", () => {
    const result = scanSnapshot({ ...archived, eps: null, bps: null, ncav_ratio: null }, stock)!;
    assert.ok(result.models.every(model => model.targetPrice === null));
});

test("the six public examples contain twenty quarters through the latest completed quarter in Seoul", () => {
    assert.equal(latestCompletedQuarter(seoulDate(Date.parse("2026-09-30T14:59:59Z"))), "2026-06-30");
    assert.equal(latestCompletedQuarter(seoulDate(Date.parse("2026-09-30T15:00:00Z"))), "2026-09-30");
    assert.equal(latestCompletedQuarter(seoulDate(Date.parse("2026-12-31T15:00:00Z"))), "2026-12-31");
    assert.deepEqual(sampleStocks.map(item => item.ticker), ["005930", "000660", "005380", "NVDA", "TSLA", "GOOGL"]);
    for (const item of sampleStocks) {
        const snapshots = sampleSnapshots(item, "2026-09-30");
        assert.equal(snapshots.length, 20);
        assert.equal(snapshots[0].date, "2021-12-31");
        assert.equal(snapshots.at(-1)?.date, "2026-09-30");
        assert.equal(new Set(snapshots.map(snapshot => snapshot.date)).size, 20);
        assert.ok(snapshots.every(snapshot => snapshot.models.length === 3));
    }
});

test("live history uses only the latest saved scan in each of 20 quarters, including the current quarter", () => {
    const snapshot = (date: string) => scanSnapshot({ ...archived, scan_date: date }, stock)!;
    const dates = ["2026-11-10", "2021-12-31", "2022-01-01", "2026-09-28", "2026-09-29", "2026-11-12"];
    const through = seoulDate(Date.parse("2026-11-10T15:00:00Z"));
    assert.equal(through, "2026-11-11");
    const quarters = valuationQuarters(dates.map(snapshot), through);
    assert.equal(quarters.length, 20);
    assert.equal(quarters[0].end, "2022-03-31");
    assert.equal(quarters.at(-1)?.end, "2026-12-31");
    assert.deepEqual(quarters.flatMap(item => item.snapshot?.date ?? []),
        ["2022-01-01", "2026-09-29", "2026-11-10"]);
    assert.equal(quarters[1].snapshot, undefined);
    assert.equal(valuationQuarters([], through).length, 20);
});
