
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

export const getNcavDailyList: any = async (date?: string) => {
    const dateParam = date ?? "latest";
    const subUrl = `/ncav/daily?date=${encodeURIComponent(dateParam)}&min_ratio=0&limit=200`;
    return getAlgorithmTradeRequest(subUrl);
}

export const getNcavDailyDates: any = async () => {
    const subUrl = `/ncav/daily/dates`;
    return getAlgorithmTradeRequest(subUrl);
}

export const checkNcavDailyDate: any = async (date: string) => {
    const subUrl = `/ncav/daily?date=${encodeURIComponent(date)}&min_ratio=0&limit=1`;
    return getAlgorithmTradeRequest(subUrl);
}

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
