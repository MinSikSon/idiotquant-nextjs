import { AdditionalHeaders, getKoreaInvestmentRequest, postKoreaInvestmentRequest } from "../koreaInvestment/koreaInvestmentAPI";

export const getUsCapital: any = async (key: string) => {
    const subUrl = `/us/capital/`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}

export const postUsCapitalTokenPlusAll: any = async (key: string, num: number) => {
    const subUrl = `/us/capital/token/plus/${num}/all/`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}

export const postUsCapitalTokenPlusOne: any = async (key: string, num: number, ticker: string) => {
    const subUrl = `/us/capital/token/plus/${num}/ticker/${ticker}/`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}

export const postUsCapitalTokenMinusAll: any = async (key: string, num: number) => {
    const subUrl = `/us/capital/token/minus/${num}/all/`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}


export const postUsCapitalTokenMinusOne: any = async (key: string, num: number, ticker: string) => {
    const subUrl = `/us/capital/token/minus/${num}/ticker/${ticker}/`;
    const additionalHeaders: AdditionalHeaders = {
        "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}