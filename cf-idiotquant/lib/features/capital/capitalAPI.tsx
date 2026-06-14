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

// ============================================================================
// 종목 그룹 관리 API (KR / US)
// ============================================================================
type GroupUpdates = { name?: string; is_trading_active?: boolean };

// KR
export const postKrCapitalGroupCreate: any = async (key: string, name: string) =>
    postKoreaInvestmentRequest(`/kr/capital/groups/create?kakao-id=${key}`, {}, { name });
export const postKrCapitalGroupUpdate: any = async (key: string, groupId: string, updates: GroupUpdates) =>
    postKoreaInvestmentRequest(`/kr/capital/groups/${groupId}/update?kakao-id=${key}`, {}, updates);
export const postKrCapitalGroupDelete: any = async (key: string, groupId: string) =>
    postKoreaInvestmentRequest(`/kr/capital/groups/${groupId}/delete?kakao-id=${key}`, {});
export const postKrCapitalStockGroup: any = async (key: string, ticker: string, groupId: string | null) =>
    postKoreaInvestmentRequest(`/kr/capital/stock/${ticker}/group?kakao-id=${key}`, {}, { group_id: groupId });

// US
export const postUsCapitalGroupCreate: any = async (key: string, name: string) =>
    postKoreaInvestmentRequest(`/us/capital/groups/create?kakao-id=${key}`, {}, { name });
export const postUsCapitalGroupUpdate: any = async (key: string, groupId: string, updates: GroupUpdates) =>
    postKoreaInvestmentRequest(`/us/capital/groups/${groupId}/update?kakao-id=${key}`, {}, updates);
export const postUsCapitalGroupDelete: any = async (key: string, groupId: string) =>
    postKoreaInvestmentRequest(`/us/capital/groups/${groupId}/delete?kakao-id=${key}`, {});
export const postUsCapitalStockGroup: any = async (key: string, ticker: string, groupId: string | null) =>
    postKoreaInvestmentRequest(`/us/capital/stock/${ticker}/group?kakao-id=${key}`, {}, { group_id: groupId });