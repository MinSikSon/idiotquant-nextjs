import { getCookie } from "@/components/util";
import { KoreaInvestmentToken } from "./koreaInvestmentSlice";

export const postApprovalKeyApi: any = async () => {
    const subUrl = `/oauth2/Approval`;
    return postKoreaInvestmentRequest(subUrl);
}

export const postTokenApi: any = async () => {
    const subUrl = `/oauth2/tokenP`;
    return postKoreaInvestmentRequest(subUrl);
}

export const getInquireBalanceApi: any = async (koreaInvestmentToken: KoreaInvestmentToken) => {
    // console.log(`[getInquireBalanceApi] koreaInvestmentToken`, koreaInvestmentToken);
    const subUrl = `/uapi/domestic-stock/trading/inquire-balance`;
    const additionalHeaders: AdditionalHeaders = {
        "authorization": koreaInvestmentToken["access_token"],
        "kakaoId": getCookie("kakaoId"),
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

interface AdditionalHeaders {
    "authorization"?: string;
    "kakaoId"?: string;
}

async function postKoreaInvestmentRequest(subUrl: string, additionalHeaders?: AdditionalHeaders) {
    const url = `${process.env.NEXT_PUBLIC_API_URL}${subUrl}`;
    const options: RequestInit = {
        method: "POST",
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            ...additionalHeaders
        },
    };
    const res = await fetch(url, options);

    return res.json();
}

async function getKoreaInvestmentRequest(subUrl: string, additionalHeaders?: AdditionalHeaders) {
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
