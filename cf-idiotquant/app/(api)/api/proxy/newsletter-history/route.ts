import { auth } from "@/auth";
import { newsletterMarketBase } from "@/lib/server/newsletterMarket";
import { createBackendHeaders } from "@/lib/server/proxyIdentity";
import { fillHistoryQuarters, historyPricePath, historyQuotes, type DartBalance } from "@/lib/utils/newsletterHistory";
import { historyQuarterEnds, mergeValuationSnapshots, parseStockKey, scanPath, scanSnapshot, seoulDate, type ValuationSnapshot } from "@/lib/utils/newsletterValuation";

export const runtime = "edge";
const headers = { "Cache-Control": "private, no-store" };

function failure(error: string, status: number, code?: string) {
    return Response.json({ success: false, error, code }, { status, headers });
}

export async function GET(request: Request) {
    const stock = parseStockKey(new URL(request.url).searchParams.get("stock"));
    if (!stock) return failure("종목을 확인해 주세요.", 400);
    const user = (await auth())?.user;
    if (!user?.id) return failure("로그인이 필요합니다.", 401, "SIGN_IN_REQUIRED");

    const billingBase = process.env.BILLING_WORKER_URL?.replace(/\/$/, "");
    const marketBase = newsletterMarketBase();
    const secret = process.env.BILLING_INTERNAL_JWT_SECRET;
    if (!billingBase || !marketBase || !secret) {
        return failure("이용권과 과거 비교 서버 연결을 확인 중입니다.", 503);
    }

    try {
        const identity = await createBackendHeaders(new Headers(), { id: user.id }, secret, true);
        // Pages rejects redirect: "error". A manual redirect fails the response.ok check below.
        const billingResponse = await fetch(`${billingBase}/billing`, {
            headers: identity, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(8000),
        });
        if (!billingResponse.ok) return failure("이용권 정보를 불러오지 못했습니다.", 502);
        const billing = await billingResponse.json();
        if (billing.success !== true) return failure("이용권 정보를 불러오지 못했습니다.", 502);
        const access = billing.data?.alerts;
        if (access?.status !== "active" || !(Date.parse(access.expiresAt) > Date.now())) {
            return failure("과거 비교에는 활성 이용권이 필요합니다.", 403, "PASS_REQUIRED");
        }

        const now = Date.now();
        const through = seoulDate(now);
        // The quote API can include a still-trading candle on the current calendar day.
        const closedThrough = seoulDate(now - 86_400_000);
        const marketData = async (path: string, timeout = 8000) => {
            const response = await fetch(marketBase + path, {
                cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(timeout),
            });
            if (!response.ok) throw new Error("market source failed");
            return response.json();
        };
        const quotes = async (adjusted = false, unadjusted = false) => {
            const payload = await marketData(historyPricePath(stock, closedThrough, adjusted, unadjusted));
            if (payload.rt_cd !== "0" || !Array.isArray(payload.output2)) throw new Error("invalid quotes");
            return historyQuotes(payload.output2, stock.market, closedThrough);
        };
        const filings = async () => {
            const query = new URLSearchParams({ PDNO: stock.ticker, history: "valuation" });
            const payload = await marketData(`/finnhub/api/v1/stock/financials-reported?${query}`);
            if (!Array.isArray(payload.data)) throw new Error("invalid filings");
            return payload.data;
        };
        const dartHistory = async () => {
            const firstYear = Number(historyQuarterEnds(through)[0].slice(0, 4)) - 1;
            const years = Array.from({ length: Number(through.slice(0, 4)) - firstYear + 1 }, (_, index) => firstYear + index);
            const results = await Promise.allSettled(years.map(async year => {
                const query = new URLSearchParams({ PDNO: stock.ticker, year: String(year) });
                const path = `/uapi/domestic-stock/v1/finance/valuation-history?${query}`;
                const requestYear = async (timeout: number) => {
                    const payload = await marketData(path, timeout);
                    if (payload.rt_cd !== "0" || !Array.isArray(payload.output)) throw new Error("invalid OpenDART history");
                    return { rows: payload.output as DartBalance[], partial: payload.partial === true };
                };
                const initial = await requestYear(26000).catch(() => null);
                if (initial && !initial.partial) return initial;

                // OpenDART can return only some reports when an individual request fails upstream.
                const retry = await requestYear(8000).catch(() => null);
                const filingKey = (row: DartBalance) => `${row.endDate}|${row.filedDate}|${row.fs_div ?? ""}`;
                const reports = new Map(initial?.rows.map(row => [filingKey(row), row]));
                for (const row of retry?.rows ?? []) {
                    const key = filingKey(row);
                    const previous = reports.get(key);
                    if (!previous || (previous.shares == null && row.shares != null)) {
                        reports.set(key, row);
                    }
                }
                if (retry && !retry.partial) return { rows: [...reports.values()], partial: false };
                // Preserve the published balances for local verification when the upstream
                // aggregate omits a filing. OpenDART amounts below are in KRW 100 millions.
                if (process.env.NODE_ENV === "development" && stock.ticker === "000660") {
                    const localFilings = year === 2022 ? [
                        // DART 20220516001502, 20220816001536, 20221114001566.
                        ["2022-03-31", "2022-05-16", 633986.39, 277677.61, 360674.17, null],
                        ["2022-06-30", "2022-08-16", 667601.60, 297192.76, 373874.62, 728002365],
                        ["2022-09-30", "2022-11-14", 687231.86, 318969.13, 408226.14, null],
                    ] as const : year === 2024 ? [
                        // DART 20240516001638, consolidated statements and note 27.
                        ["2024-03-31", "2024-05-16", 555074.02, 330260.65, 476901.13, 728002365],
                    ] as const : [];
                    const periodEnds = new Set([...reports.values()].map(row => row.endDate));
                    for (const [endDate, filedDate, total_cptl, cras, total_lblt, shares] of localFilings) {
                        if (!periodEnds.has(endDate)) {
                            const row = { endDate, filedDate, total_cptl, cras, total_lblt, shares, fs_div: "CFS" };
                            reports.set(filingKey(row), row);
                            periodEnds.add(endDate);
                        }
                    }
                    if (year === 2024 && periodEnds.size === 4 && [...reports.values()].every(row => row.shares != null)) {
                        return { rows: [...reports.values()], partial: false };
                    }
                }
                if (!initial && !retry && !reports.size) throw new Error("OpenDART history unavailable");
                return { rows: [...reports.values()], partial: true };
            }));
            const available = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
            const partial = available.length !== years.length || available.some(result => result.partial);
            if (!available.length) {
                const payload = await marketData(`/uapi/domestic-stock/v1/finance/balance-sheet?PDNO=${stock.ticker}`);
                if (payload.rt_cd !== "0" || !Array.isArray(payload.output)) throw new Error("invalid OpenDART balance sheets");
                return { rows: payload.output as DartBalance[], partial: true };
            }
            return { rows: available.flatMap(result => result.rows), partial };
        };
        const [sources, market] = await Promise.all([
            Promise.allSettled((["monthly", "weekly", "daily"] as const).map(async source => {
                const payload = await marketData(scanPath(stock, source));
                if (payload.success !== true || !Array.isArray(payload.data)) throw new Error("invalid scan data");
                return payload.data.flatMap((row: Record<string, unknown> | null) => {
                    const snapshot = row && scanSnapshot(row, stock);
                    return snapshot ? [snapshot] : [];
                }) as ValuationSnapshot[];
            })),
            Promise.allSettled([quotes(), stock.market === "US" ? quotes(true) : [],
                stock.market === "US" ? filings() : [], stock.market === "KR" ? dartHistory() : null,
                stock.market === "KR" ? quotes(false, true) : []] as const),
        ]);
        const groups = sources.flatMap(source => source.status === "fulfilled" ? [source.value] : []);
        const scans = mergeValuationSnapshots(groups);
        const [prices, adjustedPrices, reports, dart, krRaw] = market;
        const displayPrices = prices.status === "fulfilled" ? prices.value : [];
        const krPairs = krRaw.status === "fulfilled" ? krRaw.value : [];
        const data = fillHistoryQuarters(scans, displayPrices,
            through, scans.at(-1)?.name ?? stock.ticker,
            stock.market === "KR" ? krPairs : adjustedPrices.status === "fulfilled" ? adjustedPrices.value : [],
            reports.status === "fulfilled" ? reports.value : [],
            dart.status === "fulfilled" ? dart.value?.rows : []);
        const partial = groups.length < sources.length || market.some(source => source.status === "rejected") ||
            (dart.status === "fulfilled" && dart.value?.partial);
        if (!data.length && partial) {
            return failure("과거 비교 기록을 불러오지 못했습니다.", 502);
        }
        return Response.json({
            success: true,
            data,
            partial,
        }, { headers });
    } catch {
        return failure("과거 비교를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
    }
}
