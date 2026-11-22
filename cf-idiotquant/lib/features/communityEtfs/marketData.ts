import { historicalPrice } from "@/app/(compare)/compare/historicalPrice";
import { getInquireDailyItemChartPrice, getInquirePrice } from "@/lib/features/koreaInvestment/koreaInvestmentAPI";
import { getOverseasPriceQuotationsDailyPrice, getQuotationsPriceDetail } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketAPI";
import { createPublicRequestCache } from "@/lib/utils/publicRequestCache";
import { isValuationEligible } from "@/lib/utils/stockValuationEligibility";
import { PER_VALUATION_MULTIPLE, perTargetPrice } from "@/lib/utils/valuationSummary";
import type { CommunityEtf, EtfMarket } from "./api";

type ClosingPrice = ReturnType<typeof historicalPrice>;

export type EtfHoldingPrices = {
    ticker: string;
    current: number | null;
    target: number | null;
    baseline: ClosingPrice | null;
};

export const etfExpectedReturnBasis = `PER ${PER_VALUATION_MULTIPLE}배`;

const marketDates = {
    KR: new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "Asia/Seoul" }),
    US: new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "America/New_York" }),
};
const quoteCache = createPublicRequestCache<{ current: number; eps: number | null }>(60_000, 160);
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
        return { current, eps: positivePrice(isUs ? row?.epsx : row?.eps) };
    });
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
            const target = quote && isValuationEligible({ ...holding, last_price: quote.current }, market)
                ? perTargetPrice(quote.eps) : null;
            return { ticker: holding.ticker, current: quote?.current ?? null, target, baseline };
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

export function etfHoldingsText(holdings: CommunityEtf["holdings"]) {
    return holdings.map(holding => `${holding.name} (${holding.ticker})`).join("\n");
}
