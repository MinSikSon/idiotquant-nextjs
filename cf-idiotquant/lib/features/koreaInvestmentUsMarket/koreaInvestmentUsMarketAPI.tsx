import { getCookie } from "@/components/util";
import { getKoreaInvestmentRequest, postKoreaInvestmentRequest } from "../koreaInvestment/koreaInvestmentAPI";
import { KoreaInvestmentToken } from "../koreaInvestment/koreaInvestmentSlice";


// 계좌 조회
export const getOverseasStockTradingInquireBalance: any = async (koreaInvestmentToken: KoreaInvestmentToken) => {
    // console.log(`[getOverseasStockTradingInquireBalance] koreaInvestmentToken`, koreaInvestmentToken);
    const subUrl = `/uapi/overseas-stock/v1/trading/inquire-balance`;
    const additionalHeaders: AdditionalHeaders = {
        "authorization": koreaInvestmentToken["access_token"],
        "kakaoId": getCookie("kakaoId"),
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

export const getQuotationsPriceDetail: any = async (koreaInvestmentToken: KoreaInvestmentToken, PDNO: string) => {
    const subUrl = `/uapi/overseas-price/v1/quotations/price-detail`;
    const additionalHeaders: AdditionalHeaders = {
        "authorization": koreaInvestmentToken["access_token"],
        "kakaoId": getCookie("kakaoId"),
        "PDNO": PDNO,
        // "buyOrSell": buyOrSell,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

export const getQuotationsSearchInfo: any = async (koreaInvestmentToken: KoreaInvestmentToken, PDNO: string) => {
    const subUrl = `/uapi/overseas-price/v1/quotations/search-info`;
    const additionalHeaders: AdditionalHeaders = {
        "authorization": koreaInvestmentToken["access_token"],
        "kakaoId": getCookie("kakaoId"),
        "PDNO": PDNO,
        // "buyOrSell": buyOrSell,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}



export const getBalanceSheet: any = async (koreaInvestmentToken: KoreaInvestmentToken, PDNO: string) => {
    const subUrl = `/uapi/domestic-stock/v1/finance/balance-sheet`;
    const additionalHeaders: AdditionalHeaders = {
        "authorization": koreaInvestmentToken["access_token"],
        "kakaoId": getCookie("kakaoId"),
        "PDNO": PDNO,
        // "buyOrSell": buyOrSell,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// 국내주식기간별시세(일/주/월/년)[v1_국내주식-016]
export const getInquireDailyItemChartPrice: any = async (koreaInvestmentToken: KoreaInvestmentToken, PDNO: string, FID_INPUT_DATE_1: string, FID_INPUT_DATE_2: string) => {
    const subUrl = `/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`;
    const additionalHeaders: AdditionalHeaders = {
        "authorization": koreaInvestmentToken["access_token"],
        "kakaoId": getCookie("kakaoId"),
        "PDNO": PDNO,
        "FID_INPUT_DATE_1": FID_INPUT_DATE_1,
        "FID_INPUT_DATE_2": FID_INPUT_DATE_2,
        // "buyOrSell": buyOrSell,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// 시세 조회
export const getInquirePrice: any = async (koreaInvestmentToken: KoreaInvestmentToken, PDNO: string) => {
    const subUrl = `/uapi/domestic-stock/v1/quotations/inquire-price`;
    const additionalHeaders: AdditionalHeaders = {
        "authorization": koreaInvestmentToken["access_token"],
        "kakaoId": getCookie("kakaoId"),
        "PDNO": PDNO,
        // "buyOrSell": buyOrSell,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// 주문
export const postOrderCash: any = async (koreaInvestmentToken: KoreaInvestmentToken, PDNO: string, buyOrSell: string) => {
    const subUrl = `/uapi/domestic-stock/v1/trading/order-cash`;
    const additionalHeaders: AdditionalHeaders = {
        "authorization": koreaInvestmentToken["access_token"],
        "kakaoId": getCookie("kakaoId"),
        "PDNO": PDNO,
        "buyOrSell": buyOrSell,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
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

interface AdditionalHeaders {
    authorization?: string;
    kakaoId?: string;
    PDNO?: string; // 종목 번호
    buyOrSell?: string;
    FID_INPUT_DATE_1?: string;
    FID_INPUT_DATE_2?: string;
}
