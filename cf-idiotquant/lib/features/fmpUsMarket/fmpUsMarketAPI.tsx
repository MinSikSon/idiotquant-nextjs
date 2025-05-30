// fmp : financial modeling prep (https://site.financialmodelingprep.com/)

import { getCookie } from "@/utils/Cookie";
import { getKoreaInvestmentRequest, postKoreaInvestmentRequest } from "../koreaInvestment/koreaInvestmentAPI";

// const url = `fmp/api/v3/balance-sheet-statement/${symbol}?period=annual&apikey=${key}`;
export const getFmpBalanceSheetStatement: any = async (PDNO: string) => {
    const subUrl = `/fmp/api/v3/balance-sheet-statement`;
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
