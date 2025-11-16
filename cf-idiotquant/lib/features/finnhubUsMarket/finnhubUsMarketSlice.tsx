import { createAppSlice } from "@/lib/createAppSlice";
import { getFinnhubUsFinancialsReported } from "./finnhubUsMarketAPI";

interface FinnhubFinancialsAsReportedDataReportCommonType {
    label: string; // 사람 읽기용 이름. ex: "Total Assets",
    value: string; // 실제 숫자 값. ex: 402123000000,
    unit: string; // 단위 (대부분 USD). ex: "USD",
    concept: string; // XBRL 개념명 (예: Assets, LiabilitiesCurrent 등). ex: "Assets",
    form: string; // 정보가 추출된 공시 종류 (10-K 또는 10-Q). ex: "10-K"
}

interface FinnhubFinancialsAsReportedDataReportType {
    bs: FinnhubFinancialsAsReportedDataReportCommonType[]; // Balance Sheet (대차대조표) — 약 30개 항목
    ic: FinnhubFinancialsAsReportedDataReportCommonType[]; // Income Statement (손익계산서) — 약 22개 항목
    cf: FinnhubFinancialsAsReportedDataReportCommonType[]; // Cash Flow (현금흐름표) — 약 31개 항목
}

interface FinnhubFinancialsAsReportedDataType {
    symbol: number;
    year: number; // 보고 연도 (여기선 2024 회계연도)
    quarter: number; // 10-K는 연간 보고서라 보통 0 또는 4로 표기됨
    startDate: string; // 회계 시작일 (2024-01-01)
    endDate: string; // 회계 종료일 (2024-12-31)
    form: string; // 미국 SEC 공시(10-K)
    accessNumber: string; // SEC에서 부여한 고유한 엑세스 번호 (EDGAR 문서 식별)
    acceptedDate: string; // 시스템이 제출을 수신한 날짜/시간 (filedDate와 거의 동일하지만 더 정확한 timestamp)
    filedDate: string; // SEC에 실제로 제출된 날짜
    cik: string; // SEC 고유 기업 식별 번호
    report: FinnhubFinancialsAsReportedDataReportType;
}


export interface FinnhubFinancialsAsReportedType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    cik: string;
    data: FinnhubFinancialsAsReportedDataType[];
    symbol: string;
}
interface FinnhubUsMaretType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;

    finnhubFinancialsAsReported: FinnhubFinancialsAsReportedType;
}

const initialState: FinnhubUsMaretType = {
    state: "init",
    finnhubFinancialsAsReported: {
        state: "init",
        cik: "",
        data: [],
        symbol: "",
    },
}
export const finnhubUsMarketSlice = createAppSlice({
    name: "finnhubUsMarketSlice",
    initialState,
    reducers: (create) => ({
        reqGetFinnhubUsFinancialsReported: create.asyncThunk(
            async (PDNO: string) => {
                return await getFinnhubUsFinancialsReported(PDNO);
            },
            {
                pending: (state) => {
                    console.log(`[reqGetFinnhubUsFinancialsReported] pending`);
                    state.finnhubFinancialsAsReported.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetFinnhubUsFinancialsReported] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    // if (undefined != action.payload["output1"]) 
                    {
                        state.finnhubFinancialsAsReported = { ...state.finnhubFinancialsAsReported, ...action.payload };
                        state.finnhubFinancialsAsReported.state = "fulfilled";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqGetFinnhubUsFinancialsReported] rejected`);
                    state.finnhubFinancialsAsReported.state = "rejected";
                },
            }
        ),
    }),

    selectors: {
        selectFinnhubFinancialsAsReported: (state) => state.finnhubFinancialsAsReported,
    }
});

export const { reqGetFinnhubUsFinancialsReported } = finnhubUsMarketSlice.actions;
export const { selectFinnhubFinancialsAsReported } = finnhubUsMarketSlice.selectors;