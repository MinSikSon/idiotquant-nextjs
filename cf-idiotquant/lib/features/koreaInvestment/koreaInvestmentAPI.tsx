export interface AdditionalHeaders {
    authorization?: string;
    kakaoId?: string;
    PDNO?: string; // 종목 번호
    PDNOs?: any;   // 다중 종목 번호
    buyOrSell?: string;
    FID_INPUT_DATE_1?: string;
    FID_INPUT_DATE_2?: string;
    INQR_STRT_DT?: string;     // 일별 체결 조회용 시작일
    INQR_END_DT?: string;       // 일별 체결 조회용 종료일
    SLL_BUY_DVSN_CD?: string;   // 매도매수구분 (00:전체, 01:매도, 02:매수)
}

// ============================================================================
// [1] 시세 및 재무 정보 조회 API (GET)
// ============================================================================

/**
 * 대차대조표 조회
 */
export const getBalanceSheet = async (PDNO: string, kakaoId?: string) => {
    const subUrl = `/uapi/domestic-stock/v1/finance/balance-sheet?PDNO=${PDNO}`;
    const additionalHeaders: AdditionalHeaders = { kakaoId };
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
};

/**
 * 손익계산서 조회
 */
export const getIncomeStatement = async (PDNO: string, kakaoId?: string) => {
    const subUrl = `/uapi/domestic-stock/v1/finance/income-statement?PDNO=${PDNO}`;
    const additionalHeaders: AdditionalHeaders = { kakaoId };
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
};

/**
 * 국내주식 기간별 시세 (일/주/월/년) 조회 [v1_국내주식-016]
 */
export const getInquireDailyItemChartPrice = async (
    PDNO: string, 
    FID_INPUT_DATE_1: string, 
    FID_INPUT_DATE_2: string,
    kakaoId?: string
) => {
    const subUrl = `/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?PDNO=${PDNO}&FID_INPUT_DATE_1=${FID_INPUT_DATE_1}&FID_INPUT_DATE_2=${FID_INPUT_DATE_2}`;
    const additionalHeaders: AdditionalHeaders = { kakaoId };
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
};

/**
 * 주식 기본 정보 조회 [v1_국내주식-067]
 */
export const getSearchStockInfo = async (PDNO: string, kakaoId?: string) => {
    const subUrl = `/uapi/domestic-stock/v1/quotations/search-stock-info?PDNO=${PDNO}`;
    const additionalHeaders: AdditionalHeaders = { kakaoId };
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
};

/**
 * 현재가/시세 조회
 */
export const getInquirePrice = async (PDNO: string, kakaoId?: string) => {
    const subUrl = `/uapi/domestic-stock/v1/quotations/inquire-price?PDNO=${PDNO}`;
    const additionalHeaders: AdditionalHeaders = { kakaoId };
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
};


// ============================================================================
// [2] 주문 및 계좌/체결 내역 조회 API (GET / POST)
// ============================================================================

/**
 * 주식 현금 매수/매도 주문 실행 API 호출 (POST)
 */
export const postOrderCash = async ({ 
    PDNO, 
    buyOrSell, 
    qty,
    kakaoId
}: { 
    PDNO: string; 
    buyOrSell: string; 
    excg_cd?: string; 
    price?: string;   
    qty: string; 
    kakaoId?: string;
}) => {
    const subUrl = `/uapi/domestic-stock/v1/trading/order-cash?kakao-id=${kakaoId || ""}`;
    const additionalHeaders: AdditionalHeaders = { kakaoId };
    
    return postKoreaInvestmentRequest(subUrl, additionalHeaders, { 
        PDNO, 
        buyOrSell, 
        ORD_QTY: qty 
    });
};

/**
 * 잔고/계좌 조회
 * 💡 백엔드 호환성을 위해 쿼리 스트링(?kakao-id)과 헤더 양쪽에 모두 적용되도록 맞췄습니다.
 */
export const getInquireBalanceApi = async (key?: string) => {
    const subUrl = `/uapi/domestic-stock/v1/trading/inquire-balance?kakao-id=${key || ""}`;
    const additionalHeaders: AdditionalHeaders = { kakaoId: key };
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
};

/**
 * 주식 잔고 조회 (실현손익) [v1_국내주식-041]
 */
export const getInquireBalanceRlzPl = async (key?: string) => {
    const subUrl = `/uapi/domestic-stock/v1/trading/inquire-balance-rlz-pl?kakao-id=${key || ""}`;
    const additionalHeaders: AdditionalHeaders = { kakaoId: key };
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
};

/**
 * 💡 [수정] 국내주식 당일 주식체결조회 API
 * KIS 공식 엔드포인트인 주식당일주문체결조회(인증 필수) API로 변경되었습니다.
 */
export const getInquireCcnlApi = async (DV?: string, kakaoId?: string) => {
    const queryParams = new URLSearchParams({
        THIST_DV: DV || "0",       // 0: 당일전체, 1: 당일체결, 2: 당일미체결
        SMRY_YN: "N",              // 집계여부 (N: 일반 상세내역)
        EXCH_CD: "01",             // 거래소코드 (01: 본장 기본값)
        CTX_AREA_NK: "",           // 연속조회 키 (초기 조회 시 공백)
        CTX_AREA_FK: ""            // 연속조회 키 (초기 조회 시 공백)
    });
    const subUrl = `/uapi/domestic-stock/v1/trading/inquire-psbl-rvsecncl?${queryParams.toString()}`;
    const additionalHeaders: AdditionalHeaders = { kakaoId };
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
};

/**
 * 💡 [수정] 국내주식 당일 미체결내역조회 API
 * 미체결 및 정정/취소 가능 수량 조회를 위해 KIS 정정취소가능주문조회 엔드포인트로 매핑합니다.
 */
export const getInquireNccsApi = async (DV?: string, kakaoId?: string) => {
    const queryParams = new URLSearchParams({
        THIST_DV: DV || "1",       // 기본값 대기 조회 구분 번호
        SMRY_YN: "N",
        EXCH_CD: "01",
        CTX_AREA_NK: "",
        CTX_AREA_FK: ""
    });
    // 미체결 잔량 조회를 위해 KIS 공식 실시간 주문 취소/정정 가능 내역 풀링 엔드포인트 매핑
    const subUrl = `/uapi/domestic-stock/v1/trading/inquire-psbl-rvsecncl?${queryParams.toString()}`;
    const additionalHeaders: AdditionalHeaders = { kakaoId };
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
};

/**
 * 국내주식 일별 주문체결조회 (과거 기간 내 체결 내역 조회)
 */
export const getInquireDailyCcld = async ({
    INQR_STRT_DT,
    INQR_END_DT,
    SLL_BUY_DVSN_CD = "00",
    kakaoId
}: {
    INQR_STRT_DT: string;
    INQR_END_DT: string;
    SLL_BUY_DVSN_CD?: string;
    kakaoId?: string;
}) => {
    const queryParams = new URLSearchParams({
        INQR_STRT_DT,
        INQR_END_DT,
        SLL_BUY_DVSN_CD,
        SMRY_YN: "N", 
        TM_DVSN_XCL_YN: "N"
    });
    const subUrl = `/uapi/domestic-stock/v1/trading/inquire-daily-ccld?${queryParams.toString()}`;
    const additionalHeaders: AdditionalHeaders = { kakaoId };
    return getKoreaInvestmentRequest(subUrl, additionalHeaders);
};


// ============================================================================
// [3] OAuth 인증 토큰 인프라 API
// ============================================================================

/**
 * 웹소켓 실시간 시세용 고유 웹소켓 Approval 키 발급
 */
export const postApprovalKeyApi = async (kakaoId?: string) => {
    const subUrl = `/oauth2/Approval`;
    const additionalHeaders: AdditionalHeaders = { kakaoId };
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
};

/**
 * REST API 접근용 토큰 발급 (tokenP)
 */
export const postTokenApi = async (kakaoId?: string) => {
    const subUrl = `/oauth2/tokenP`;
    const additionalHeaders: AdditionalHeaders = { kakaoId };
    return postKoreaInvestmentRequest(subUrl, additionalHeaders);
};


// ============================================================================
// [4] 한국투자증권 Next.js 프록시 네트워크 통신 공통 핸들러
// ============================================================================

/**
 * 한국투자증권 프록시 요청 공통 처리 함수 (POST)
 */
export async function postKoreaInvestmentRequest(
    subUrl: string, 
    additionalHeaders?: AdditionalHeaders, 
    body: object = {}
) {
    const url = `/api/proxy${subUrl}`;
    const options: RequestInit = {
        method: "POST",
        credentials: "include",
        headers: {
            "content-type": "application/json; charset=utf-8",
            ...additionalHeaders
        },
        body: JSON.stringify(body)
    };
    
    const res = await fetch(url, options);
    const text = await res.text();

    if (!res.ok) {
        let message = text;
        try { message = JSON.parse(text)?.message || text; } catch { /* 평문 응답 */ }
        throw new Error(message || `프록시 서버 통신 실패 (POST: ${res.status})`);
    }

    try {
        return JSON.parse(text);
    } catch {
        // 백엔드가 JSON이 아닌 평문(예: 권한 거부 'need to valid id')을 200으로 반환한 경우
        throw new Error(text || "서버 응답을 해석할 수 없습니다.");
    }
}

/**
 * 한국투자증권 프록시 요청 공통 처리 함수 (GET)
 */
export async function getKoreaInvestmentRequest(
    subUrl: string, 
    additionalHeaders?: AdditionalHeaders
) {
    const url = `/api/proxy${subUrl}`;
    const options: RequestInit = {
        method: "GET",
        credentials: "include",
        headers: {
            "content-type": "application/json; charset=utf-8",
            ...additionalHeaders,
        },
    };
    
    const res = await fetch(url, options);

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "프록시 서버 통신 실패 (GET: 500)");
    }
    
    return res.json();
}