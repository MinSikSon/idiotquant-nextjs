
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
        // "kakaoId": key,
    }
    return getAlgorithmTradeRequest(subUrl, additionalHeaders);
}

export const getUsPurchaseLogLatest: any = async (key?: any) => {
    const subUrl = `/algorithm/trade/us/purchase/log/latest?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": key,
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
