import { historyQuarterEnds, snapshotModels, valuationDate, valuationQuarters, type Market, type NewsletterStock, type ValuationSnapshot } from "./newsletterValuation.ts";

type HistoryStock = Pick<NewsletterStock, "market" | "ticker">;
type Quote = { date: string; price: number };
type Fact = { concept: string; value: number; unit: string };
type Filing = {
    endDate: string;
    filedDate: string;
    periodType: string;
    shares?: number;
    sharesDate?: string;
    report?: { bs?: Fact[]; ic?: Fact[] };
};

export function historyPricePath(stock: HistoryStock, through: string, adjusted = false) {
    const query = new URLSearchParams({ PDNO: stock.ticker });
    const end = through.replaceAll("-", "");
    if (stock.market === "US") {
        query.set("FID_INPUT_DATE_1", end);
        if (adjusted) query.set("adjusted", "true");
        return `/uapi/overseas-price/v1/quotations/dailyprice?${query}`;
    }
    const firstQuarter = historyQuarterEnds(through)[0];
    const firstMonth = Number(firstQuarter.slice(5, 7)) - 2;
    query.set("FID_INPUT_DATE_1", firstQuarter.slice(0, 4) + String(firstMonth).padStart(2, "0") + "01");
    query.set("FID_INPUT_DATE_2", end);
    return `/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?${query}`;
}

export function historyQuotes(rows: Record<string, unknown>[], market: Market, through: string): Quote[] {
    return rows.flatMap(row => {
        const date = valuationDate(market === "US" ? row?.xymd : row?.stck_bsop_date);
        const price = Number(market === "US" ? row?.clos : row?.stck_clpr);
        return date && date <= through && Number.isFinite(price) && price > 0 ? [{ date, price }] : [];
    }).sort((a, b) => a.date.localeCompare(b.date));
}

function fact(rows: Fact[] | undefined, concept: string) {
    const value = rows?.find(item => item.concept === concept && item.unit === "USD")?.value;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function fillHistoryQuarters(scans: ValuationSnapshot[], quotes: Quote[], through: string, name: string,
    adjusted: Quote[] = [], filings: Filing[] = []): ValuationSnapshot[] {
    const adjustedPrices = new Map(adjusted.map(quote => [quote.date, quote.price]));
    // A change in the raw/adjusted price ratio marks an interval with a corporate action.
    // Only compare per-share fundamentals when both sides of the share count date confirm the same basis.
    const ratios = quotes.flatMap(({ date, price }) => {
        const adjustedPrice = adjustedPrices.get(date);
        return adjustedPrice ? [{ date, ratio: adjustedPrice / price }] : [];
    });
    const history = quotes.map(({ date, price }): ValuationSnapshot => ({
        date, price, name, models: [], source: "kis",
    }));
    const byQuarter = new Map(valuationQuarters(history, through).map(item => [item.end, item.snapshot]));
    return valuationQuarters(scans, through).flatMap(({ end, snapshot }) => {
        if (snapshot) return [snapshot];
        const quote = byQuarter.get(end);
        if (!quote) return [];

        const eligible = filings.filter(filing => valuationDate(filing?.filedDate) && valuationDate(filing.endDate) &&
            filing.filedDate < quote.date && filing.endDate <= filing.filedDate &&
            Date.parse(quote.date) - Date.parse(filing.endDate) <= 460 * 86_400_000)
            .sort((a, b) => b.endDate.localeCompare(a.endDate));
        const filing = eligible[0];
        const shares = filing?.shares;
        const sharesDate = valuationDate(filing?.sharesDate);
        if (!shares || !Number.isFinite(shares) || shares <= 0 || !sharesDate ||
            sharesDate < filing.endDate || sharesDate > filing.filedDate) return [quote];

        const before = ratios.findLast(item => item.date <= sharesDate);
        const after = ratios.find(item => item.date >= sharesDate && item.date <= quote.date);
        const atQuote = ratios.find(item => item.date === quote.date);
        const sameBasis = (left: number, right: number) => Math.abs(Math.log(left / right)) < 0.02;
        if (!before || !after || !atQuote || !sameBasis(before.ratio, after.ratio) ||
            !sameBasis(before.ratio, atQuote.ratio)) return [quote];

        const netIncome = fact(eligible.find(item => item.periodType === "annual")?.report?.ic, "NetIncomeLoss");
        const equity = fact(filing.report?.bs, "StockholdersEquity");
        const assets = fact(filing.report?.bs, "AssetsCurrent");
        const liabilities = fact(filing.report?.bs, "Liabilities");
        const models = snapshotModels(quote.price, "US",
            netIncome === null ? null : netIncome / shares, equity === null ? null : equity / shares,
            assets === null || liabilities === null ? null : (assets - liabilities) / shares / quote.price, netIncome);
        return [{ ...quote, models, filedDate: filing.filedDate }];
    });
}
