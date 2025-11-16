// fmp : financial modeling prep (https://site.financialmodelingprep.com/)

import { getCookie } from "@/components/util";
import { getKoreaInvestmentRequest, postKoreaInvestmentRequest } from "../koreaInvestment/koreaInvestmentAPI";

export const getFinnhubUsFinancialsReported: any = async (PDNO: string) => {
    const subUrl = `/finnhub/api/v1/stock/financials-reported`;
    const additionalHeaders: AdditionalHeaders = {
        // "authorization": koreaInvestmentToken["access_token"],
        "kakaoId": getCookie("kakaoId"),
        "PDNO": PDNO,
        // "buyOrSell": buyOrSell,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
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
