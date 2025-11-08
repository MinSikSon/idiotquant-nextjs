import { getCookie } from "@/components/util";

export const getBalanceSheet: any = async (PDNO: string) => {
    const subUrl = `/uapi/domestic-stock/v1/finance/balance-sheet`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": getCookie("kakaoId"),
        "PDNO": PDNO,
        // "buyOrSell": buyOrSell,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}
export const getIncomeStatement: any = async (PDNO: string) => {
    const subUrl = `/uapi/domestic-stock/v1/finance/income-statement`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": getCookie("kakaoId"),
        "PDNO": PDNO,
        // "buyOrSell": buyOrSell,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// 국내주식기간별시세(일/주/월/년)[v1_국내주식-016]
export const getInquireDailyItemChartPrice: any = async (PDNO: string, FID_INPUT_DATE_1: string, FID_INPUT_DATE_2: string) => {
    const subUrl = `/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": getCookie("kakaoId"),
        "PDNO": PDNO,
        "FID_INPUT_DATE_1": FID_INPUT_DATE_1,
        "FID_INPUT_DATE_2": FID_INPUT_DATE_2,
        // "buyOrSell": buyOrSell,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// 시세 조회
export const getInquirePrice: any = async (PDNO: string) => {
    const subUrl = `/uapi/domestic-stock/v1/quotations/inquire-price`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": getCookie("kakaoId"),
        "PDNO": PDNO,
        // "buyOrSell": buyOrSell,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// 주문
export const postOrderCash: any = async (PDNO: string, buyOrSell: string) => {
    const subUrl = `/uapi/domestic-stock/v1/trading/order-cash`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": getCookie("kakaoId"),
        "PDNO": PDNO,
        "buyOrSell": buyOrSell,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// 계좌 조회
export const getInquireBalanceApi: any = async (key: string) => {
    // console.log(`[getInquireBalanceApi]`);
    const subUrl = `/uapi/domestic-stock/v1/trading/inquire-balance`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// 인증 및 토큰 요청
export const postApprovalKeyApi: any = async () => {
    const subUrl = `/oauth2/Approval`;
    return postKoreaInvestmentRequest(subUrl);
}

export const postTokenApi: any = async () => {
    const subUrl = `/oauth2/tokenP`;
    return postKoreaInvestmentRequest(subUrl);
}

export interface AdditionalHeaders {
    authorization?: string;
    kakaoId?: string;
    PDNO?: string; // 종목 번호
    PDNOs?: any; // 종목 번호
    buyOrSell?: string;
    FID_INPUT_DATE_1?: string;
    FID_INPUT_DATE_2?: string;
}

export async function postKoreaInvestmentRequest(subUrl: string, additionalHeaders?: AdditionalHeaders) {
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

export async function getKoreaInvestmentRequest(subUrl: string, additionalHeaders?: AdditionalHeaders) {
    const url = `${process.env.NEXT_PUBLIC_API_URL}${subUrl}`;
    const options: RequestInit = {
        method: "GET",
        credentials: "include",  // include credentials (like cookies) in the request
        headers: {
            "content-type": "application/json; utf-8",
            ...additionalHeaders,
            "authToken": getCookie("authToken"),
        },
    };
    const res = await fetch(url, options);
    // console.log(`getKoreaInvestmentRequest`, `subUrl`, subUrl, res);
    return res.json();
}
