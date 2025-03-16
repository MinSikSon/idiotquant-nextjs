// import { getCookie } from "@/components/util";
// import { KoreaInvestmentToken } from "./algorithmTradeSlice";

import { getCookie } from "@/components/util";
import { KoreaInvestmentToken } from "../koreaInvestment/koreaInvestmentSlice";
import { AdditionalHeaders, getKoreaInvestmentRequest } from "../koreaInvestment/koreaInvestmentAPI";

export const getInquirePriceMulti: any = async (koreaInvestmentToken: KoreaInvestmentToken, PDNOs: string[]) => {
    const subUrl = `/uapi/domestic-stock/v1/quotations/inquire-price-multi`;
    const additionalHeaders: AdditionalHeaders = {
        "authorization": koreaInvestmentToken["access_token"],
        "kakaoId": getCookie("kakaoId"),
        "PDNOs": JSON.stringify(PDNOs),
        // "buyOrSell": buyOrSell,
    };
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

export const getCapitalToken: any = async () => {
    const subUrl = `/algorithm-trade/capital-token`;
    const additionalHeaders: AdditionalHeaders = {
    }
    return getAlgorithmTradeRequest(subUrl, additionalHeaders);
}

export const getUsCapitalToken: any = async () => {
    const subUrl = `/algorithm-trade/us-capital-token`;
    const additionalHeaders: AdditionalHeaders = {
    }
    return getAlgorithmTradeRequest(subUrl, additionalHeaders);
}

async function getAlgorithmTradeRequest(subUrl: string, additionalHeaders?: AdditionalHeaders) {
    const url = `${process.env.NEXT_PUBLIC_API_URL}${subUrl}`;
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
