import { getCookie } from "@/components/util";
import { getKoreaInvestmentRequest, postKoreaInvestmentRequest } from "../koreaInvestment/koreaInvestmentAPI";
import { KoreaInvestmentToken } from "../koreaInvestment/koreaInvestmentSlice";

export const getOverseasPriceQuotationsDailyPrice: any = async (PDNO: string, FID_INPUT_DATE_1: string) => {
    const subUrl = `/uapi/overseas-price/v1/quotations/dailyprice?PDNO=${PDNO}&FID_INPUT_DATE_1=${FID_INPUT_DATE_1}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": getCookie("kakaoId"),
        // "PDNO": PDNO,
        // "FID_INPUT_DATE_1": FID_INPUT_DATE_1,
        // "buyOrSell": buyOrSell,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// export const getOverseasPriceQuotationsInquireDailyChartPrice: any = async (koreaInvestmentToken: KoreaInvestmentToken, PDNO: string, FID_INPUT_DATE_1: string, FID_INPUT_DATE_2: string) => {
//     const subUrl = `/uapi/overseas-price/v1/quotations/inquire-daily-chartprice`;
//     const additionalHeaders: AdditionalHeaders = {
//         "authorization": koreaInvestmentToken["access_token"],
//         "kakaoId": getCookie("kakaoId"),
//         "PDNO": PDNO,
//         "FID_INPUT_DATE_1": FID_INPUT_DATE_1,
//         "FID_INPUT_DATE_2": FID_INPUT_DATE_2,
//         // "buyOrSell": buyOrSell,
//     }
//     return getKoreaInvestmentRequest(subUrl, additionalHeaders);
// }

// 주문
export const postOrderUs: any = async (PDNO: string, buyOrSell: string, excg_cd: string, price: string) => {
    const subUrl = `/uapi/overseas-stock/v1/trading/order?PDNO=${PDNO}&buyOrSell=${buyOrSell}&excg_cd=${excg_cd}&price=${price}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": getCookie("kakaoId"),
        // "PDNO": PDNO,
        // "buyOrSell": buyOrSell,
        // "excg_cd": excg_cd,
        // "price": price,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}

export const getOverseasStockTradingInquirePresentBalance: any = async (key: string) => {
    // console.log(`[getOverseasStockTradingInquireBalance] koreaInvestmentToken`, koreaInvestmentToken);
    const subUrl = `/uapi/overseas-stock/v1/trading/inquire-present-balance`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}
export const getkiOverseasInquirePeriodProfit: any = async (key: string) => {
    // console.log(`[getOverseasStockTradingInquireBalance] koreaInvestmentToken`, koreaInvestmentToken);
    const subUrl = `/uapi/overseas-stock/v1/trading/inquire-period-profit`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// 계좌 조회
export const getOverseasStockTradingInquireBalance: any = async (key: string) => {
    // console.log(`[getOverseasStockTradingInquireBalance] koreaInvestmentToken`, koreaInvestmentToken);
    const subUrl = `/uapi/overseas-stock/v1/trading/inquire-balance`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// 해외주식 미체결내역[v1_해외주식-005]
export const getOverseasStockTradingInquireCcnl: any = async (key: string) => {
    const subUrl = `/uapi/overseas-stock/v1/trading/inquire-ccnl`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// 해외주식 미체결내역[v1_해외주식-005]
export const getOverseasStockTradingInquireNccs: any = async (key: string) => {
    // console.log(`[getOverseasStockTradingInquireBalance] koreaInvestmentToken`, koreaInvestmentToken);
    const subUrl = `/uapi/overseas-stock/v1/trading/inquire-nccs`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

export const getQuotationsPriceDetail: any = async (PDNO: string) => {
    const subUrl = `/uapi/overseas-price/v1/quotations/price-detail?PDNO=${PDNO}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": getCookie("kakaoId"),
        // "PDNO": PDNO,
        // "buyOrSell": buyOrSell,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

export const getQuotationsSearchInfo: any = async (PDNO: string) => {
    const subUrl = `/uapi/overseas-price/v1/quotations/search-info?PDNO=${PDNO}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": getCookie("kakaoId"),
        // "PDNO": PDNO,
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
    excg_cd?: string;
    price?: string;
}
