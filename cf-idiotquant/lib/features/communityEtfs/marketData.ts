import { historicalPrice } from "@/app/(compare)/compare/historicalPrice";
import { getFinnhubUsFinancialsReported } from "@/lib/features/finnhubUsMarket/finnhubUsMarketAPI";
import { getBalanceSheet, getIncomeStatement, getInquireDailyItemChartPrice, getInquirePrice } from "@/lib/features/koreaInvestment/koreaInvestmentAPI";
import { getOverseasPriceQuotationsDailyPrice, getQuotationsPriceDetail } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketAPI";
import { createPublicRequestCache } from "@/lib/utils/publicRequestCache";
import { isValuationEligible } from "@/lib/utils/stockValuationEligibility";
import { valuationModels } from "@/lib/utils/valuationModels";
import { valuationComparisonAxis, valuationSummary } from "@/lib/utils/valuationSummary";
import type { CommunityEtf, EtfMarket } from "./api";

type ClosingPrice = ReturnType<typeof historicalPrice>;

export type EtfHoldingPrices = {
    ticker: string;
    current: number | null;
    targets: Record<string, number>;
    valuationFailed: boolean;
    baseline: ClosingPrice | null;
};

export const etfValuationModels = {
    KR: ["PER", "NCAV", "PBR", "SRIM"],
    US: ["PER", "NCAV", "SRIM", "PEG", "DCF"],
} as const;

const marketDates = {
    KR: new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "Asia/Seoul" }),
    US: new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "America/New_York" }),
};
const quoteCache = createPublicRequestCache<{ current: number; detail: Awaited<ReturnType<typeof getQuotationsPriceDetail>> }>(60_000, 160);
const financialCache = createPublicRequestCache<unknown>(300_000, 480);
const baselineCache = createPublicRequestCache<ClosingPrice>(300_000, 160);

export function etfCreationDate(createdAt: number, market: EtfMarket = "KR") {
    // Existing feed entries store Unix seconds.
    return marketDates[market].format(createdAt * 1000);
}

function positivePrice(value: unknown) {
    const number = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
    return Number.isFinite(number) && number > 0 ? number : null;
}

function loadQuote(ticker: string, market: EtfMarket) {
    return quoteCache(`${market}:${ticker}`, async () => {
        const isUs = market === "US";
        const code = encodeURIComponent(ticker);
        const response = isUs ? await getQuotationsPriceDetail(code) : await getInquirePrice(code);
        const row = response?.output ?? response?.output1;
        const current = positivePrice(isUs ? row?.last : row?.stck_prpr);
        if (response?.rt_cd !== "0" || current === null) throw new Error("현재가를 불러오지 못했습니다.");
        return { current, detail: response };
    });
}

async function loadValuationTargets(ticker: string, market: EtfMarket, detail: Awaited<ReturnType<typeof getQuotationsPriceDetail>>) {
    const code = encodeURIComponent(ticker);
    const isUs = market === "US";
    const getRows = (source: string, request: () => Promise<any>, field: "output" | "output1" | "data") =>
        financialCache(`${market}:${ticker}:${source}`, async () => {
            const result = await request();
            if (result?.success === false || (result?.rt_cd !== undefined && result.rt_cd !== "0") ||
                (field === "output1" ? !positivePrice(result?.output1?.lstn_stcn) : !Array.isArray(result?.[field]))) {
                throw new Error("평가에 필요한 재무 자료를 불러오지 못했습니다.");
            }
            return result;
        });

    const sources = isUs ? [
        ["finnhubData", getRows("report", () => getFinnhubUsFinancialsReported(code), "data")],
    ] as const : [
        ["kiBS", getRows("balance", () => getBalanceSheet(code), "output")],
        ["kiIS", getRows("income", () => getIncomeStatement(code), "output")],
        ["kiChart", getRows("chart", () => getInquireDailyItemChartPrice(code, "20170101", new Date().toISOString().slice(0, 10).replaceAll("-", "")), "output1")],
    ] as const;
    const results = await Promise.allSettled(sources.map(([, request]) => request));
    const data = Object.fromEntries(results.flatMap((result, index) =>
        result.status === "fulfilled" ? [[sources[index][0], result.value]] : []
    ));
    if (isUs) data.usDetail = detail;
    const targets = Object.fromEntries(valuationSummary(valuationModels(data, isUs)).flatMap(({ type, targetPrice }) =>
        targetPrice === null ? [] : [[type, targetPrice]]
    ));
    return { targets, valuationFailed: results.some(result => result.status === "rejected") };
}

async function loadBaseline(ticker: string, market: EtfMarket, date: string): Promise<ClosingPrice | null> {
    const today = marketDates[market].format(new Date());
    if (date > today) return null;
    // Today’s daily candle can still be moving. Use the last completed date.
    const cutoff = new Date(`${date}T00:00:00Z`);
    if (date === today) cutoff.setUTCDate(cutoff.getUTCDate() - 1);
    const end = cutoff.toISOString().slice(0, 10).replaceAll("-", "");
    const earliest = new Date(`${date}T00:00:00Z`);
    earliest.setUTCDate(earliest.getUTCDate() - 7);
    const start = earliest.toISOString().slice(0, 10).replaceAll("-", "");

    return baselineCache(`${market}:${ticker}:${end}`, async () => {
        const code = encodeURIComponent(ticker);
        const response = market === "KR"
            ? await getInquireDailyItemChartPrice(code, start, end)
            : await getOverseasPriceQuotationsDailyPrice(code, end);
        const price = historicalPrice(response, market, end);
        if (price.priceDate < start) throw new Error("생성일 근처의 종가가 없습니다.");
        return price;
    });
}

export async function loadEtfHoldingPrices(item: Pick<CommunityEtf, "createdAt" | "market" | "holdings">, isActive: () => boolean): Promise<EtfHoldingPrices[]> {
    const { market } = item;
    const date = etfCreationDate(item.createdAt, market);
    const prices: EtfHoldingPrices[] = [];

    // Bound simultaneous quote and history requests as more cards scroll into view.
    for (let offset = 0; offset < item.holdings.length && isActive(); offset += 3) {
        const batch = await Promise.all(item.holdings.slice(offset, offset + 3).map(async holding => {
            const [quote, baseline] = await Promise.all([
                loadQuote(holding.ticker, market).catch(() => null),
                loadBaseline(holding.ticker, market, date).catch(() => null),
            ]);
            const valuation = quote && isValuationEligible({ ...holding, last_price: quote.current }, market)
                ? await loadValuationTargets(holding.ticker, market, quote.detail).catch(() => ({ targets: {}, valuationFailed: true }))
                : { targets: {}, valuationFailed: false };
            return { ticker: holding.ticker, current: quote?.current ?? null, baseline, ...valuation };
        }));
        prices.push(...batch);
    }
    return prices;
}

export function etfReturnPercent(start: number | null, end: number | null) {
    if (start === null || end === null || start <= 0 || end <= 0) return null;
    const change = (end / start - 1) * 100;
    return Number.isFinite(change) ? change : null;
}

export function averageEtfReturn(values: (number | null)[]) {
    const available = values.filter((value): value is number => value !== null);
    return {
        percent: available.length ? available.reduce((total, value) => total + value, 0) / available.length : null,
        count: available.length,
    };
}

export function averageEtfValuationReturn(prices: EtfHoldingPrices[], model: string) {
    return averageEtfReturn(prices.map(({ current, targets }) =>
        valuationComparisonAxis(current ?? 0, []).difference(targets[model] ?? null)
    ));
}

export function etfHoldingsText(holdings: CommunityEtf["holdings"]) {
    return holdings.map(holding => `${holding.name} (${holding.ticker})`).join("\n");
}
