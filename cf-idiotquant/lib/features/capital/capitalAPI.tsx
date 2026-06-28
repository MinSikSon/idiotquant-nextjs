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
export const postKrCapitalGroupCreate: any = async (key: string, name: string, tickers?: string[]) =>
    postKoreaInvestmentRequest(`/kr/capital/groups/create?kakao-id=${key}`, {}, { name, tickers });
export const postKrCapitalGroupUpdate: any = async (key: string, groupId: string, updates: GroupUpdates) =>
    postKoreaInvestmentRequest(`/kr/capital/groups/${groupId}/update?kakao-id=${key}`, {}, updates);
export const postKrCapitalGroupDelete: any = async (key: string, groupId: string) =>
    postKoreaInvestmentRequest(`/kr/capital/groups/${groupId}/delete?kakao-id=${key}`, {});
export const postKrCapitalStockGroup: any = async (key: string, ticker: string, groupId: string | null) =>
    postKoreaInvestmentRequest(`/kr/capital/stock/${ticker}/group?kakao-id=${key}`, {}, { group_id: groupId });
export const postKrCapitalStocksGroup: any = async (key: string, tickers: string[], groupId: string | null) =>
    postKoreaInvestmentRequest(`/kr/capital/stocks/group?kakao-id=${key}`, {}, { tickers, group_id: groupId });
export const postKrCapitalLikesCopy: any = async (key: string, tickers: string[], groupId: string | null) =>
    postKoreaInvestmentRequest(`/kr/capital/likes/copy?kakao-id=${key}`, {}, { tickers, group_id: groupId });

// US
export const postUsCapitalGroupCreate: any = async (key: string, name: string, tickers?: string[]) =>
    postKoreaInvestmentRequest(`/us/capital/groups/create?kakao-id=${key}`, {}, { name, tickers });
export const postUsCapitalGroupUpdate: any = async (key: string, groupId: string, updates: GroupUpdates) =>
    postKoreaInvestmentRequest(`/us/capital/groups/${groupId}/update?kakao-id=${key}`, {}, updates);
export const postUsCapitalGroupDelete: any = async (key: string, groupId: string) =>
    postKoreaInvestmentRequest(`/us/capital/groups/${groupId}/delete?kakao-id=${key}`, {});
export const postUsCapitalStockGroup: any = async (key: string, ticker: string, groupId: string | null) =>
    postKoreaInvestmentRequest(`/us/capital/stock/${ticker}/group?kakao-id=${key}`, {}, { group_id: groupId });
export const postUsCapitalStocksGroup: any = async (key: string, tickers: string[], groupId: string | null) =>
    postKoreaInvestmentRequest(`/us/capital/stocks/group?kakao-id=${key}`, {}, { tickers, group_id: groupId });
export const postUsCapitalLikesCopy: any = async (key: string, tickers: string[], groupId: string | null) =>
    postKoreaInvestmentRequest(`/us/capital/likes/copy?kakao-id=${key}`, {}, { tickers, group_id: groupId });

// ============================================================================
// 계좌별 트레이딩 조건 (quant_rule) API (KR / US)
// 백엔드는 인증된 user.id 기준으로 trading_accounts.quant_rule_json 을 조회/수정한다.
// (kakao-id 쿼리는 무시되지만 일관성을 위해 전달)
// ============================================================================
export const getKrQuantRule: any = async (key: string) =>
    getKoreaInvestmentRequest(`/kr/capital/quant-rule?kakao-id=${key}`, {});
export const postKrQuantRule: any = async (key: string, rule: object) =>
    postKoreaInvestmentRequest(`/kr/capital/quant-rule?kakao-id=${key}`, {}, { rule });
export const getUsQuantRule: any = async (key: string) =>
    getKoreaInvestmentRequest(`/us/capital/quant-rule?kakao-id=${key}`, {});
export const postUsQuantRule: any = async (key: string, rule: object) =>
    postKoreaInvestmentRequest(`/us/capital/quant-rule?kakao-id=${key}`, {}, { rule });

// ============================================================================
// 자동매매 월 예산(= 총 리필량) API (KR)
// ============================================================================
export const getKrCapitalBudget: any = async (key: string) =>
    getKoreaInvestmentRequest(`/kr/capital/budget?kakao-id=${key}`, {});
export const postKrCapitalBudget: any = async (key: string, monthly_budget_krw: number) =>
    postKoreaInvestmentRequest(`/kr/capital/budget?kakao-id=${key}`, {}, { monthly_budget_krw });

// ============================================================================
// 토큰 리셋 API (KR / US)
// ============================================================================
export const postKrCapitalTokenResetAll: any = async (key: string) =>
    postKoreaInvestmentRequest(`/kr/capital/token/reset/all?kakao-id=${key}`, {});
export const postKrCapitalTokenResetOne: any = async (key: string, ticker: string) =>
    postKoreaInvestmentRequest(`/kr/capital/token/reset/ticker/${ticker}?kakao-id=${key}`, {});
export const postUsCapitalTokenResetAll: any = async (key: string) =>
    postKoreaInvestmentRequest(`/us/capital/token/reset/all?kakao-id=${key}`, {});
export const postUsCapitalTokenResetOne: any = async (key: string, ticker: string) =>
    postKoreaInvestmentRequest(`/us/capital/token/reset/ticker/${ticker}?kakao-id=${key}`, {});