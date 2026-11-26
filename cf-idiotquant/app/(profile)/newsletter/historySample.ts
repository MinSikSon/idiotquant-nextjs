import type { NewsletterStock, ValuationSnapshot } from "@/lib/utils/newsletterValuation";

type SampleStock = NewsletterStock & {
    prices: readonly number[];
    targets: readonly [srim: number, per: number, ncav: number];
};

// Fictional prices in each stock's native currency, ordered from oldest to newest.
export const sampleStocks: readonly SampleStock[] = [
    { market: "KR", ticker: "005930", name: "삼성전자", prices: [72800, 75900, 79200, 64200, 57100, 55300, 59000, 67100, 71600, 73700, 69500, 76100], targets: [78000, 72000, 57000] },
    { market: "KR", ticker: "000660", name: "SK하이닉스", prices: [139000, 163000, 208500, 184000, 172500, 201000, 224000, 239500, 252000, 282500, 265000, 304000], targets: [326000, 296000, 143000] },
    { market: "KR", ticker: "005380", name: "현대차", prices: [192000, 227500, 260000, 241500, 212000, 199000, 217000, 205500, 223500, 239000, 253000, 237500], targets: [264000, 251000, 170000] },
    { market: "US", ticker: "NVDA", name: "엔비디아", prices: [49.52, 82.5, 119.35, 126.64, 135.4, 111.3, 149.6, 166.8, 180.2, 159.5, 175.8, 187.6], targets: [203.5, 179, 92.8] },
    { market: "US", ticker: "TSLA", name: "테슬라", prices: [244, 174, 193, 258, 372, 259, 315, 402, 426, 389, 341, 367], targets: [345, 308.5, 123.5] },
    { market: "US", ticker: "GOOGL", name: "구글", prices: [140.2, 149.5, 174.7, 166.1, 188.3, 157.8, 179.4, 201.5, 226.7, 217.3, 235.5, 249.4], targets: [268.2, 253.7, 136.5] },
];

export function latestSampleQuarter(now = Date.now()) {
    const seoul = new Date(now + 9 * 60 * 60 * 1000);
    return new Date(Date.UTC(seoul.getUTCFullYear(), Math.floor(seoul.getUTCMonth() / 3) * 3, 0))
        .toISOString().slice(0, 10);
}

export function sampleSnapshots(stock: SampleStock, endDate: string): ValuationSnapshot[] {
    const end = new Date(endDate);
    const reportAdjustments = [0.76, 0.76, 0.81, 0.81, 0.86, 0.86, 0.9, 0.9, 0.94, 0.94, 1, 1];
    return stock.prices.map((price, index) => {
        const month = end.getUTCMonth() + 1 - (stock.prices.length - 1 - index) * 3;
        const date = new Date(Date.UTC(end.getUTCFullYear(), month, 0)).toISOString().slice(0, 10);
        const precision = stock.market === "US" ? 0.01 : 100;
        const models = ["SRIM", "PER", "NCAV"].map((label, modelIndex) => {
            const targetPrice = Number((Math.round(stock.targets[modelIndex] * reportAdjustments[index] / precision) * precision).toFixed(2));
            return { label, basis: ["Ke 8%", "10배", "1배"][modelIndex], targetPrice, gapPercent: (targetPrice / price - 1) * 100 };
        });
        return { name: stock.name, date, price, models };
    });
}
