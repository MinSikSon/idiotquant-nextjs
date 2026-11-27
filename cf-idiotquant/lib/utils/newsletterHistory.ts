import { historyQuarterEnds, isValuationLoss, snapshotModels, valuationDate, valuationQuarters, type Market, type NewsletterStock, type ValuationSnapshot } from "./newsletterValuation.ts";

type HistoryStock = Pick<NewsletterStock, "market" | "ticker">;
type Quote = { date: string; price: number };
const DAY = 86_400_000;
const NEARBY_REPORT_DAYS = 220;
export type DartBalance = { endDate: string; filedDate: string; total_cptl?: number | null; cras?: number | null; total_lblt?: number | null;
    shares?: number | null; annualNetIncome?: number | null; fs_div?: string };
type Fact = { concept: string; value: number; unit: string };
type Filing = {
    endDate: string;
    filedDate: string;
    periodType: string;
    shares?: number;
    sharesDate?: string;
    report?: { bs?: Fact[]; ic?: Fact[] };
};

export function historyPricePath(stock: HistoryStock, through: string, adjusted = false, unadjusted = false) {
    const query = new URLSearchParams({ PDNO: stock.ticker });
    const end = through.replaceAll("-", "");
    if (stock.market === "US") {
        query.set("FID_INPUT_DATE_1", end);
        if (adjusted) query.set("adjusted", "true");
        return `/uapi/overseas-price/v1/quotations/dailyprice?${query}`;
    }
    const firstQuarter = historyQuarterEnds(through)[0];
    // Load two earlier quarters so the oldest chart point can verify the share-count price basis.
    const from = new Date(Date.UTC(Number(firstQuarter.slice(0, 4)), Number(firstQuarter.slice(5, 7)) - 9, 1));
    query.set("FID_INPUT_DATE_1", from.toISOString().slice(0, 10).replaceAll("-", ""));
    query.set("FID_INPUT_DATE_2", end);
    if (unadjusted) query.set("unadjusted", "true");
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
        const hasEarningsTarget = point.models.some(model =>
            (model.label === "PER" || model.label === "SRIM") && model.targetPrice !== null);
        const publishedBefore = (report: { endDate: string; filedDate: string }) =>
            valuationDate(report?.filedDate) && valuationDate(report.endDate) &&
            report.filedDate < point.date && report.endDate <= report.filedDate &&
            Date.parse(point.date) - Date.parse(report.endDate) <= 460 * DAY;
        const latestFirst = (a: { endDate: string; filedDate: string }, b: typeof a) =>
            b.endDate.localeCompare(a.endDate) || b.filedDate.localeCompare(a.filedDate);
        const krReports = dart.filter(publishedBefore).sort(latestFirst);
        const balanceCoverage = (report: DartBalance) =>
            [report.total_cptl, report.cras, report.total_lblt].filter(Number.isFinite).length;
        const latestKr = krReports[0];
        const krReport = krReports.reduce<DartBalance | undefined>((best, report) => {
            const nearby = Date.parse(point.date) - Date.parse(report.endDate) <= NEARBY_REPORT_DAYS * DAY;
            return best && nearby && report.fs_div === latestKr.fs_div && balanceCoverage(report) > balanceCoverage(best)
                ? report : best;
        }, latestKr);
        if (krReport) {
            const won = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value * 100_000_000 : null;
            const equity = won(krReport.total_cptl);
            const currentAssets = won(krReport.cras);
            const liabilities = won(krReport.total_lblt);
            const annual = krReports.find(item => item.fs_div === krReport.fs_div && item.endDate.endsWith("-12-31") &&
                typeof item.annualNetIncome === "number");
            const netIncome = won(annual?.annualNetIncome);
            const withFinancials: ValuationSnapshot = { ...point, lossMaking: point.lossMaking || (!hasEarningsTarget && isValuationLoss(null, netIncome)), financials: {
                source: "OpenDART", endDate: krReport.endDate, filedDate: krReport.filedDate, equity, currentAssets, liabilities,
            } };
            if (point.models.some(model => model.targetPrice !== null)) return [withFinancials];
            const pairedQuote = quotes.find(item => item.date === point.date);
            if (pairedQuote?.price !== point.price) return [withFinancials];
            const usableShares = (report: DartBalance) => {
                if (report.fs_div !== krReport.fs_div || !report.shares || !Number.isSafeInteger(report.shares) ||
                    report.shares < 1 || Date.parse(point.date) - Date.parse(report.endDate) > NEARBY_REPORT_DAYS * DAY) return false;
                const before = ratios.findLast(item => item.date <= report.endDate);
                const after = ratios.filter(item => item.date > report.endDate && item.date <= point.date);
                return !!before && after.at(-1)?.date === point.date &&
                    [before, ...after].every(item => Math.abs(item.ratio - 1) < 0.002);
            };
            const shareReport = krReports.find(usableShares);
            const shares = shareReport?.shares;
            if (!shares) return [withFinancials];
            const models = snapshotModels(point.price, "KR", withFinancials.lossMaking || netIncome === null ? null : netIncome / shares,
                equity === null ? null : equity / shares,
                currentAssets === null || liabilities === null ? null : (currentAssets - liabilities) / shares / point.price,
                netIncome);
            return [{ ...withFinancials, models, filedDate: krReport.filedDate,
                sharesEndDate: shareReport.endDate === krReport.endDate ? undefined : shareReport.endDate }];
        }

        const eligible = filings.filter(publishedBefore).sort(latestFirst);
        const filing = eligible[0];
        if (!filing) return [point];
        const equity = fact(filing.report?.bs, "StockholdersEquity");
        const assets = fact(filing.report?.bs, "AssetsCurrent");
        const liabilities = fact(filing.report?.bs, "Liabilities");
        const netIncome = fact(eligible.find(item => item.periodType === "annual")?.report?.ic, "NetIncomeLoss");
        const withFinancials: ValuationSnapshot = { ...point, lossMaking: point.lossMaking || (!hasEarningsTarget && isValuationLoss(null, netIncome)), financials: {
            source: "SEC", endDate: filing.endDate, filedDate: filing.filedDate,
            equity, currentAssets: assets, liabilities,
        } };
        if (snapshot?.models.some(model => model.targetPrice !== null)) return [withFinancials];

        if (snapshot && !quotes.some(item => item.date === point.date && item.price === point.price)) return [withFinancials];
        const atQuote = ratios.find(item => item.date === point.date);
        if (!atQuote) return [withFinancials];
        const sameBasis = (left: number, right: number) => Math.abs(Math.log(left / right)) < 0.02;
        const shareFiling = eligible.find(candidate => {
            const sharesDate = valuationDate(candidate.sharesDate);
            if (!candidate.shares || !Number.isFinite(candidate.shares) || candidate.shares <= 0 || !sharesDate ||
                sharesDate < candidate.endDate || sharesDate > candidate.filedDate ||
                Date.parse(point.date) - Date.parse(sharesDate) > NEARBY_REPORT_DAYS * DAY) return false;
            const before = ratios.findLast(item => item.date <= sharesDate);
            const after = ratios.find(item => item.date >= sharesDate && item.date <= point.date);
            return !!before && !!after && sameBasis(before.ratio, after.ratio) &&
                ratios.filter(item => item.date > sharesDate && item.date <= point.date)
                    .every(item => sameBasis(before.ratio, item.ratio));
        });
        const shares = shareFiling?.shares;
        if (!shares) return [withFinancials];

        const models = snapshotModels(point.price, "US",
            withFinancials.lossMaking || netIncome === null ? null : netIncome / shares, equity === null ? null : equity / shares,
            assets === null || liabilities === null ? null : (assets - liabilities) / shares / point.price, netIncome);
        return [{ ...withFinancials, models, filedDate: filing.filedDate,
            sharesEndDate: shareFiling.endDate === filing.endDate ? undefined : shareFiling.sharesDate }];
    });
}
