import { AdditionalHeaders, getKoreaInvestmentRequest, postKoreaInvestmentRequest } from "../koreaInvestment/koreaInvestmentAPI";

export const getUsCapital: any = async (key: string) => {
    const subUrl = `/us/capital/`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

export const postUsCapitalTokenAllPlus: any = async (key: string, num: number) => {
    const subUrl = `/us/capital/token/all/plus/${num}/`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}

export const postUsCapitalTokenAllMinus: any = async (key: string, num: number) => {
    const subUrl = `/us/capital/token/all/minus/${num}/`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}