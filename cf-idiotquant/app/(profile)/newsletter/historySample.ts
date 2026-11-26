import { historyQuarterEnds, type NewsletterStock, type ValuationSnapshot } from "../../../lib/utils/newsletterValuation.ts";

type SampleStock = NewsletterStock & {
    prices: readonly number[];
    targets: readonly [srim: number, per: number, ncav: number];
};

// Fictional prices in each stock's native currency, ordered from oldest to newest.
export const sampleStocks: readonly SampleStock[] = [
    { market: "KR", ticker: "005930", name: "삼성전자", prices: [67700, 70100, 68400, 62100, 57300, 60100, 65300, 71500, 72800, 75900, 79200, 64200, 57100, 55300, 59000, 67100, 71600, 73700, 69500, 76100], targets: [78000, 72000, 57000] },
    { market: "KR", ticker: "000660", name: "SK하이닉스", prices: [103000, 113000, 105500, 94300, 87600, 102500, 111000, 126500, 139000, 163000, 208500, 184000, 172500, 201000, 224000, 239500, 252000, 282500, 265000, 304000], targets: [326000, 296000, 143000] },
    { market: "KR", ticker: "005380", name: "현대차", prices: [174500, 185000, 167500, 153000, 164500, 181000, 195000, 201500, 192000, 227500, 260000, 241500, 212000, 199000, 217000, 205500, 223500, 239000, 253000, 237500], targets: [264000, 251000, 170000] },
    { market: "US", ticker: "NVDA", name: "엔비디아", prices: [29.4, 26.2, 19.1, 16.4, 22.6, 28.8, 41.1, 46.2, 49.52, 82.5, 119.35, 126.64, 135.4, 111.3, 149.6, 166.8, 180.2, 159.5, 175.8, 187.6], targets: [203.5, 179, 92.8] },
    { market: "US", ticker: "TSLA", name: "테슬라", prices: [289, 338, 242, 229, 153, 203, 247, 261, 244, 174, 193, 258, 372, 259, 315, 402, 426, 389, 341, 367], targets: [345, 308.5, 123.5] },
    { market: "US", ticker: "GOOGL", name: "구글", prices: [131.4, 137.6, 113.2, 99.7, 91.8, 105.6, 123.3, 132.4, 140.2, 149.5, 174.7, 166.1, 188.3, 157.8, 179.4, 201.5, 226.7, 217.3, 235.5, 249.4], targets: [268.2, 253.7, 136.5] },
];

export function sampleSnapshots(stock: SampleStock, endDate: string): ValuationSnapshot[] {
    const dates = historyQuarterEnds(endDate);
    const reportAdjustments = [
        0.63, 0.63, 0.66, 0.66, 0.7, 0.7, 0.73, 0.73,
        0.76, 0.76, 0.81, 0.81, 0.86, 0.86, 0.9, 0.9, 0.94, 0.94, 1, 1,
    ];
    return stock.prices.map((price, index) => {
        const date = dates[index];
        const precision = stock.market === "US" ? 0.01 : 100;
        const models = ["SRIM", "PER", "NCAV"].map((label, modelIndex) => {
            const targetPrice = Number((Math.round(stock.targets[modelIndex] * reportAdjustments[index] / precision) * precision).toFixed(2));
            return { label, basis: ["Ke 8%", "10배", "1배"][modelIndex], targetPrice, gapPercent: (targetPrice / price - 1) * 100 };
        });
        return { name: stock.name, date, price, models };
    });
}
