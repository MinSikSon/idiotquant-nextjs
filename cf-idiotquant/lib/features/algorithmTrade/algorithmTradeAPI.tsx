
import { AdditionalHeaders } from "../koreaInvestment/koreaInvestmentAPI";

export const getCapitalToken: any = async () => {
    const subUrl = `/algorithm/trade/kr/capital/token`;
    const additionalHeaders: AdditionalHeaders = {
    }
    return getAlgorithmTradeRequest(subUrl, additionalHeaders);
}

export const getKrPurchaseLogLatest: any = async (key?: any) => {
    const subUrl = `/algorithm/trade/kr/purchase/log/latest?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
    }
    return getAlgorithmTradeRequest(subUrl, additionalHeaders);
}

export const getUsPurchaseLogLatest: any = async (key?: any) => {
    const subUrl = `/algorithm/trade/us/purchase/log/latest?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
    }
    return getAlgorithmTradeRequest(subUrl, additionalHeaders);
}


export const getUsCapitalToken: any = async () => {
    const subUrl = `/algorithm/trade/us/capital/token`;
    const additionalHeaders: AdditionalHeaders = {
    }
    return getAlgorithmTradeRequest(subUrl, additionalHeaders);
}

export const getQuantRule: any = async () => {
    const subUrl = `/algorithm/trade/quant-rule`;
    const additionalHeaders: AdditionalHeaders = {
    }
    return getAlgorithmTradeRequest(subUrl, additionalHeaders);
}
export const getQuantRuleDesc: any = async () => {
    const subUrl = `/algorithm/trade/quant-rule-desc`;
    const additionalHeaders: AdditionalHeaders = {
    }
    return getAlgorithmTradeRequest(subUrl, additionalHeaders);
}

export const getScanDailyList: any = async (date?: string, strategy?: string) => {
    const dateParam = date ?? "latest";
    const strategyParam = strategy ?? "all";
    const subUrl = `/scan/daily?date=${encodeURIComponent(dateParam)}&strategy=${strategyParam}&limit=2000&sort=ncav_ratio&order=desc`;
    return getAlgorithmTradeRequest(subUrl);
}

export const getScanDailyDates: any = async () => {
    const subUrl = `/scan/daily/dates`;
    return getAlgorithmTradeRequest(subUrl);
}

export const checkScanDailyDate: any = async (date: string) => {
    const subUrl = `/scan/daily?date=${encodeURIComponent(date)}&strategy=all&limit=1`;
    return getAlgorithmTradeRequest(subUrl);
}

export const getScanDailyByTicker = async (ticker: string, limit = 30) =>
    getAlgorithmTradeRequest(`/scan/daily/ticker/${encodeURIComponent(ticker)}?limit=${limit}`);

export const getScanDailyAll = async (date: string) =>
    getAlgorithmTradeRequest(`/scan/daily?date=${encodeURIComponent(date)}&strategy=all&limit=2000`);

export const getPortfolioSimulation = async (startDate: string, strategy: string) =>
    getAlgorithmTradeRequest(`/scan/portfolio?start_date=${encodeURIComponent(startDate)}&strategy=${encodeURIComponent(strategy)}`);

export const getPortfolioOverview = async (strategy: string) =>
    getAlgorithmTradeRequest(`/scan/portfolio/overview?strategy=${encodeURIComponent(strategy)}`);

async function getAlgorithmTradeRequest(subUrl: string, additionalHeaders?: AdditionalHeaders) {
    const url = `/api/proxy${subUrl}`;
    const options: RequestInit = {
        method: "GET",
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            ...additionalHeaders,
        },
    };
    const res = await fetch(url, options);

    return res.json();
}
