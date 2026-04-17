import { AdditionalHeaders, getKoreaInvestmentRequest, postKoreaInvestmentRequest } from "../koreaInvestment/koreaInvestmentAPI";

// KR Capital API
export const getKrCapital: any = async (key: string) => {
    const subUrl = `/kr/capital?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": key,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}
export const postKrCapitalTokenPlusAll: any = async (key: string, num: number) => {
    const subUrl = `/kr/capital/token/plus/${num}/all?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}
export const postKrCapitalTokenPlusOne: any = async (key: string, num: number, ticker: string) => {
    const subUrl = `/kr/capital/token/plus/${num}/ticker/${ticker}?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}
export const postKrCapitalTokenMinusAll: any = async (key: string, num: number) => {
    const subUrl = `/kr/capital/token/minus/${num}/all?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}
export const postKrCapitalTokenMinusOne: any = async (key: string, num: number, ticker: string) => {
    const subUrl = `/kr/capital/token/minus/${num}/ticker/${ticker}?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}

// US Capital API
export const getUsCapital: any = async (key: string) => {
    const subUrl = `/us/capital?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": key,
    }
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
}
export const postUsCapitalTokenPlusAll: any = async (key: string, num: number) => {
    const subUrl = `/us/capital/token/plus/${num}/all?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}
export const postUsCapitalTokenPlusOne: any = async (key: string, num: number, ticker: string) => {
    const subUrl = `/us/capital/token/plus/${num}/ticker/${ticker}?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}
export const postUsCapitalTokenMinusAll: any = async (key: string, num: number) => {
    const subUrl = `/us/capital/token/minus/${num}/all?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}
export const postUsCapitalTokenMinusOne: any = async (key: string, num: number, ticker: string) => {
    const subUrl = `/us/capital/token/minus/${num}/ticker/${ticker}?kakao-id=${key}`;
    const additionalHeaders: AdditionalHeaders = {
        // "kakaoId": key,
    }
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
}