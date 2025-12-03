import { AdditionalHeaders, getKoreaInvestmentRequest } from "../koreaInvestment/koreaInvestmentAPI";

// 해외주식 미체결내역[v1_해외주식-005]
export const getCapitalUs: any = async (key: string) => {
    const subUrl = `/us/capital/`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}