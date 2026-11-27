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

test("registered price API fills missing quarters without replacing saved scans", async () => {
    const { fillHistoryQuarters, historyPricePath, historyQuotes } = await import("../lib/utils/newsletterHistory.ts");
    const through = "2026-11-27";
    assert.match(historyPricePath(stock, through), /FID_INPUT_DATE_1=20210701/);
    assert.match(historyPricePath({ market: "US", ticker: "LGCL" }, through, true), /adjusted=true/);
    const prices = historyQuotes([
        { xymd: "20260930", clos: "2.36" },
        { xymd: "20260929", clos: "2.11" },
        { xymd: "20261128", clos: "2.15" },
        { xymd: "20260230", clos: "5.09" },
        { xymd: "20240328", clos: "2.92" },
    ], "US", through);
    const scan = scanSnapshot({ ...archived, scan_date: "2026-09-20" }, stock)!;
    assert.deepEqual(fillHistoryQuarters([scan], prices, through, "LGCL"), [
        { date: "2024-03-28", price: 2.92, name: "LGCL", source: "kis", models: [] },
        scan,
    ]);
});

test("SEC estimates use only earlier filings and matching share-price units across corporate actions", async () => {
    const { fillHistoryQuarters } = await import("../lib/utils/newsletterHistory.ts");
    const quotes = [
        { date: "2024-08-30", price: 3 },
        { date: "2024-09-30", price: 4 },
        { date: "2024-12-31", price: 5 },
    ];
    const usd = (concept: string, value: number) => ({ concept, value, unit: "USD" });
    const filing = {
        endDate: "2023-12-31", filedDate: "2024-09-20", sharesDate: "2024-09-15",
        periodType: "annual", shares: 100,
        report: { bs: [usd("StockholdersEquity", 600), usd("AssetsCurrent", 300), usd("Liabilities", 100)],
            ic: [usd("NetIncomeLoss", 50)] },
    };
    const points = fillHistoryQuarters([], quotes, "2024-12-31", "Example",
        [...quotes.slice(0, 2), { date: "2024-12-31", price: 0.5 }],
        [filing, { ...filing, endDate: "2024-09-30", filedDate: "2024-09-30", shares: 10 }]);
    assert.equal(points[0].filedDate, "2024-09-20");
    assert.equal(points[0].models.find(item => item.label === "PER")?.targetPrice, 5);
    assert.equal(points[0].models.find(item => item.label === "PBR")?.targetPrice, 6);
    assert.equal(points[1].models.length, 0);
    assert.equal(points[1].financials?.equity, 600);
    const acrossSplit = fillHistoryQuarters([], quotes, "2024-12-31", "Example",
        [...quotes.slice(0, 2), { date: "2024-12-31", price: 0.5 }], [filing]);
    assert.equal(acrossSplit[1].models.length, 0);
    const sameBasis = fillHistoryQuarters([], quotes, "2024-12-31", "Example", quotes, [filing]);
    assert.equal(sameBasis[1].models.find(item => item.label === "PER")?.targetPrice, 5);
    const [scan] = fillHistoryQuarters([{ ...points[0], models: [], source: undefined }], quotes,
        "2024-12-31", "Example", quotes, [filing]);
    assert.equal(scan.models.find(item => item.label === "PBR")?.targetPrice, 6);
});

test("Korean history shows published OpenDART balances in won for the matching periods", async () => {
    const { fillHistoryQuarters } = await import("../lib/utils/newsletterHistory.ts");
    const points = fillHistoryQuarters([], [
        { date: "2024-06-28", price: 65000 },
        { date: "2024-09-30", price: 70000 },
    ], "2024-09-30", "Example", [], [], [
        { endDate: "2024-03-31", filedDate: "2024-07-01", total_cptl: 50, cras: 20, total_lblt: 10 },
        { endDate: "2024-06-30", filedDate: "2024-09-30", total_cptl: 60 },
    ]);
    assert.equal(points[0].financials, undefined);
    assert.deepEqual(points[1].financials, {
        source: "OpenDART", endDate: "2024-03-31", filedDate: "2024-07-01",
        equity: 5_000_000_000, currentAssets: 2_000_000_000, liabilities: 1_000_000_000,
    });
    assert.deepEqual(points[1].models, []);
});

test("Korean backfill values June 2025 using the March filing and prior annual earnings", async () => {
    const { fillHistoryQuarters } = await import("../lib/utils/newsletterHistory.ts");
    const quotes = [
        { date: "2025-03-31", price: 58000 }, { date: "2025-04-30", price: 56000 },
        { date: "2025-06-30", price: 59800 },
    ];
    const reports = [
        { endDate: "2024-12-31", filedDate: "2025-03-11", annualNetIncome: 300_000, fs_div: "CFS" },
        { endDate: "2025-03-31", filedDate: "2025-05-15", shares: 6_000_000_000, total_cptl: 3_600_000,
            cras: 2_200_000, total_lblt: 1_000_000, fs_div: "CFS" },
        { endDate: "2025-06-30", filedDate: "2025-08-14", shares: 6_000_000_000, total_cptl: 3_900_000, fs_div: "CFS" },
    ];
    const [june] = fillHistoryQuarters([], quotes, "2025-06-30", "Example", quotes, [], reports).slice(-1);
    assert.equal(june.financials?.endDate, "2025-03-31");
    assert.equal(june.models.find(model => model.label === "PBR")?.targetPrice, 60000);
    assert.equal(june.models.find(model => model.label === "PER")?.targetPrice, 50000);
    assert.equal(june.models.find(model => model.label === "SRIM")?.targetPrice, 62500);
    const shifted = [{ ...quotes[0], price: quotes[0].price * 2 }, ...quotes.slice(1)];
    const split = fillHistoryQuarters([], quotes, "2025-06-30", "Example", shifted, [], reports).at(-1);
    assert.equal(split?.models.length, 0);
    assert.equal(split?.financials?.endDate, "2025-03-31");
});


test("Missing quarterly shares use an earlier compatible filing while keeping the newer balance sheet", async () => {
    const { fillHistoryQuarters } = await import("../lib/utils/newsletterHistory.ts");
    const quotes = [
        { date: "2024-12-30", price: 53000 }, { date: "2025-01-31", price: 54000 },
        { date: "2025-03-31", price: 58000 }, { date: "2025-06-30", price: 59800 },
    ];
    const reports = [
        { endDate: "2024-12-31", filedDate: "2025-03-11", shares: 6_000_000_000, annualNetIncome: 300_000, fs_div: "CFS" },
        { endDate: "2025-03-31", filedDate: "2025-05-15", shares: null, total_cptl: 3_600_000,
            cras: 2_200_000, total_lblt: 1_000_000, fs_div: "CFS" },
        { endDate: "2025-06-30", filedDate: "2025-08-14", shares: 3_000_000_000, total_cptl: 1, fs_div: "CFS" },
    ];
    const point = fillHistoryQuarters([], quotes, "2025-06-30", "Example", quotes, [], reports).at(-1);
    assert.equal(point?.financials?.endDate, "2025-03-31");
    assert.equal(point?.sharesEndDate, "2024-12-31");
    assert.equal(point?.models.find(model => model.label === "PBR")?.targetPrice, 60000);
    assert.equal(point?.models.find(model => model.label === "NCAV")?.targetPrice, 20000);
    const adjusted = quotes.map(quote => quote.date < "2025-03-31" ? { ...quote, price: quote.price * 2 } : quote);
    assert.deepEqual(fillHistoryQuarters([], quotes, "2025-06-30", "Example", adjusted, [], reports).at(-1)?.models, []);
});

test("losses suppress earnings-based targets while zero and missing earnings are distinct from losses", () => {
    const loss = scanSnapshot({ ...archived, eps: -100, net_income: -1000 }, stock)!;
    assert.equal(loss.lossMaking, true);
    assert.equal(loss.models.find(model => model.label === "PER")?.targetPrice, null);
    assert.equal(loss.models.some(model => model.label === "SRIM"), false);
    assert.equal(loss.models.find(model => model.label === "PBR")?.targetPrice, 63000);
    assert.notEqual(loss.models.find(model => model.label === "NCAV")?.targetPrice, null);

    const negativeIncome = scanSnapshot({ ...archived, net_income: -1000 }, stock)!;
    assert.equal(negativeIncome.lossMaking, true);
    assert.equal(negativeIncome.models.find(model => model.label === "PER")?.targetPrice, null);
    for (const eps of [0, null]) {
        const noTarget = scanSnapshot({ ...archived, eps }, stock)!;
        assert.equal(noTarget.lossMaking, false);
        assert.equal(noTarget.models.find(model => model.label === "PER")?.targetPrice, null);
    }
});

test("quarterly history marks losses only after the report is published, even without a share count", async () => {
    const { fillHistoryQuarters } = await import("../lib/utils/newsletterHistory.ts");
    const quotes = [{ date: "2025-03-31", price: 10000 }, { date: "2025-06-30", price: 11000 }];
    const reports = [{ endDate: "2024-12-31", filedDate: "2025-04-01", annualNetIncome: -25, fs_div: "CFS" }];
    const [before, after] = fillHistoryQuarters([], quotes, "2025-06-30", "Example", [], [], reports);
    assert.equal(before.lossMaking ?? false, false);
    assert.equal(after.lossMaking, true);
    assert.deepEqual(after.models, []);
});
