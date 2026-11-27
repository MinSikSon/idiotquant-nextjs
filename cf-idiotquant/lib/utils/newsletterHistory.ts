import { historyQuarterEnds, snapshotModels, valuationDate, valuationQuarters, type Market, type NewsletterStock, type ValuationSnapshot } from "./newsletterValuation.ts";

type HistoryStock = Pick<NewsletterStock, "market" | "ticker">;
type Quote = { date: string; price: number };
export type DartBalance = { endDate: string; filedDate: string; total_cptl?: number; cras?: number; total_lblt?: number };
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
    adjusted: Quote[] = [], filings: Filing[] = [], dart: DartBalance[] = []): ValuationSnapshot[] {
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
        const point = snapshot ?? byQuarter.get(end);
        if (!point) return [];
        const publishedBefore = (report: { endDate: string; filedDate: string }) =>
            valuationDate(report?.filedDate) && valuationDate(report.endDate) &&
            report.filedDate < point.date && report.endDate <= report.filedDate &&
            Date.parse(point.date) - Date.parse(report.endDate) <= 460 * 86_400_000;
        const latestFirst = (a: { endDate: string; filedDate: string }, b: typeof a) =>
            b.endDate.localeCompare(a.endDate) || b.filedDate.localeCompare(a.filedDate);
        const krReport = dart.filter(publishedBefore).sort(latestFirst)[0];
        if (krReport) {
            const won = (value: number | undefined) => typeof value === "number" && Number.isFinite(value) ? value * 100_000_000 : null;
            return [{ ...point, financials: { source: "OpenDART", endDate: krReport.endDate, filedDate: krReport.filedDate,
                equity: won(krReport.total_cptl), currentAssets: won(krReport.cras), liabilities: won(krReport.total_lblt) } }];
        }

        const eligible = filings.filter(publishedBefore).sort(latestFirst);
        const filing = eligible[0];
        if (!filing) return [point];
        const equity = fact(filing.report?.bs, "StockholdersEquity");
        const assets = fact(filing.report?.bs, "AssetsCurrent");
        const liabilities = fact(filing.report?.bs, "Liabilities");
        const withFinancials: ValuationSnapshot = { ...point, financials: {
            source: "SEC", endDate: filing.endDate, filedDate: filing.filedDate,
            equity, currentAssets: assets, liabilities,
        } };
        if (snapshot?.models.some(model => model.targetPrice !== null)) return [withFinancials];

        const shares = filing.shares;
        const sharesDate = valuationDate(filing?.sharesDate);
        if (!shares || !Number.isFinite(shares) || shares <= 0 || !sharesDate ||
            sharesDate < filing.endDate || sharesDate > filing.filedDate) return [withFinancials];

        const before = ratios.findLast(item => item.date <= sharesDate);
        const after = ratios.find(item => item.date >= sharesDate && item.date <= point.date);
        const atQuote = ratios.find(item => item.date === point.date);
        // The scan and the paired quote must use the same unadjusted price basis.
        if (snapshot && !quotes.some(item => item.date === point.date && item.price === point.price)) return [withFinancials];
        const sameBasis = (left: number, right: number) => Math.abs(Math.log(left / right)) < 0.02;
        if (!before || !after || !atQuote || !sameBasis(before.ratio, after.ratio) ||
            !sameBasis(before.ratio, atQuote.ratio)) return [withFinancials];

        const netIncome = fact(eligible.find(item => item.periodType === "annual")?.report?.ic, "NetIncomeLoss");
        const models = snapshotModels(point.price, "US",
            netIncome === null ? null : netIncome / shares, equity === null ? null : equity / shares,
            assets === null || liabilities === null ? null : (assets - liabilities) / shares / point.price, netIncome);
        return [{ ...withFinancials, models, filedDate: filing.filedDate }];
    });
}
