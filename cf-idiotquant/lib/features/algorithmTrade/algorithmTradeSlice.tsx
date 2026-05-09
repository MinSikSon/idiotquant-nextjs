import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { 
    getCapitalToken, 
    getKrPurchaseLogLatest, 
    getQuantRule, 
    getQuantRuleDesc, 
    getUsCapitalToken, 
    getUsPurchaseLogLatest 
} from "./algorithmTradeAPI";

const DEBUG = false;

// --- 기존 인터페이스 유지 ---
interface CapitalTokenTypeValueTimestamp {
    "current": string;
    "prev": string;
    "prevPrev": string;
}

export interface CapitalTokenTypeValueStock {
    "name": string;
    "PDNO": string;
    "token": number;
    "output_inquirePrice"?: any;
    "output_balanceSheet"?: any;
}

interface CapitalTokenTypeValuePurchaseLogStockList {
    "stock_name": string;
    "stock_code": string;
    "remaining_token": string;
    "stck_prpr": string;
    "ORD_QTY": string;
    "buyOrSell"?: string;
}

interface CapitalTokenTypeValuePurchaseLog {
    "time_stamp": string;
    "stock_list": CapitalTokenTypeValuePurchaseLogStockList[];
}

export interface CapitalTokenTypeValue {
    "time_stamp": CapitalTokenTypeValueTimestamp;
    "capital_charge_per_year": number;
    "capital_charge_rate": number;
    "refill_stock_index": number;
    "stock_list": CapitalTokenTypeValueStock[];
    "purchase_log": CapitalTokenTypeValuePurchaseLog[];
    "corp_scan_index": number;
    "token_per_stock": number;
    "frst_bltn_exrt"?: any;
}

export interface CapitalTokenType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    value: CapitalTokenTypeValue;
}

export interface PurchaseLogType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    value: any[];
}

export interface QuantRuleValue {
    max_pbr: string;
    min_tomv: string;
    min_tomv_nasdaq: string;
    min_eps: string;
    ncav_ratio: string;
    portfolio_weight: string;
    exclude_call_warrants: string;
}

export interface QuantRule {
    state: "init" | "pending" | "fulfilled" | "rejected";
    value: QuantRuleValue;
}

// --- [신규 추가] 다중 종목 및 리스트 관리를 위한 인터페이스 ---

export interface StockDetailData {
    ticker: string;
    name: string;
    isUs: boolean;
    state: "init" | "pending" | "fulfilled" | "rejected";
    
    // [추가] 한국 주식 데이터 필드
    kiPrice?: any;
    kiBS?: any;
    kiIS?: any;
    kiChart?: any;

    // [추가] 미국 주식 데이터 필드
    finnhubData?: any; // FinnhubFinancialsAsReportedType
    usDetail?: any;
    usSearchInfo?: any;
    usDaily?: any;

    // 상세 지표 데이터 (선택 사항)
    financials?: {
        per?: number;
        pbr?: number;
        bps?: number;
        eps?: number;
        ncavValue?: number;
    };
    rawSnapshot?: any;
}

interface StrategyList {
    id: string;               // 전략 고유 ID (예: "ncav_top_20")
    title: string;            // 전략명
    tickers: string[];        // 해당 전략에 포함된 티커 리스트
    updatedAt: string;
}

interface AlgorithmTradeType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    capital_token: CapitalTokenType;
    krPurchaseLog: PurchaseLogType;
    usPurchaseLog: PurchaseLogType;
    us_capital_token: CapitalTokenType;
    quant_rule: QuantRule;
    quant_rule_desc: QuantRule;
    
    // [신규] 여러 종목의 상세 정보를 티커별로 저장 (Key: Ticker)
    stockDetails: Record<string, StockDetailData>;
    
    // [신규] 여러 전략 리스트 관리 (Key: StrategyID)
    strategyLists: Record<string, StrategyList>;
    
    // 기존 호환성 유지용 (필요시 사용)
    inquire_price_multi: any;
    purchase_log: any;
}

const initialState: AlgorithmTradeType = {
    state: "init",
    capital_token: {
        state: "init",
        value: {
            time_stamp: { current: "", prev: "", prevPrev: "" },
            capital_charge_per_year: 0,
            capital_charge_rate: 0,
            refill_stock_index: 0,
            stock_list: [],
            purchase_log: [],
            corp_scan_index: 0,
            token_per_stock: 0,
        }
    },
    krPurchaseLog: { state: "init", value: [] },
    usPurchaseLog: { state: "init", value: [] },
    inquire_price_multi: {},
    purchase_log: {},
    us_capital_token: {
        state: "init",
        value: {
            time_stamp: { current: "", prev: "", prevPrev: "" },
            capital_charge_per_year: 0,
            capital_charge_rate: 0,
            refill_stock_index: 0,
            stock_list: [],
            purchase_log: [],
            corp_scan_index: 0,
            token_per_stock: 0,
            frst_bltn_exrt: 0,
        }
    },
    quant_rule: {
        state: "init",
        value: {
            max_pbr: "1",
            min_tomv: "5000000000",
            min_tomv_nasdaq: "35000000",
            min_eps: "1",
            ncav_ratio: "1.5",
            portfolio_weight: "5",
            exclude_call_warrants: "true",
        }
    },
    quant_rule_desc: {
        state: "init",
        value: {
            max_pbr: "", min_tomv: "", min_tomv_nasdaq: "", 
            min_eps: "", ncav_ratio: "", portfolio_weight: "", 
            exclude_call_warrants: "",
        }
    },
    // 신규 초기값
    stockDetails: {},
    strategyLists: {}
}

export const algorithmTradeSlice = createAppSlice({
    name: "algorithmTrade",
    initialState,
    reducers: (create) => ({
        // [신규] 개별 종목 데이터 업데이트 리듀서
        // 개별 Fetcher 컴포넌트에서 데이터를 가져온 후 호출합니다.
        updateStockDetail: create.reducer((
            state, 
            action: PayloadAction<{ ticker: string; data: Partial<StockDetailData> }>
        ) => {
            const { ticker, data } = action.payload;
            if (!state.stockDetails[ticker]) {
                state.stockDetails[ticker] = {
                    ticker,
                    name: data.name || "",
                    isUs: data.isUs || false,
                    state: "init"
                } as StockDetailData;
            }
            state.stockDetails[ticker] = {
                ...state.stockDetails[ticker],
                ...data
            };
        }),

        // [신규] 특정 종목 로딩 상태 변경
        setStockState: create.reducer((
            state, 
            action: PayloadAction<{ ticker: string; status: StockDetailData["state"] }>
        ) => {
            if (state.stockDetails[action.payload.ticker]) {
                state.stockDetails[action.payload.ticker].state = action.payload.status;
            }
        }),

        // [신규] 전략 리스트 등록/업데이트
        registerStrategyList: create.reducer((state, action: PayloadAction<StrategyList>) => {
            state.strategyLists[action.payload.id] = action.payload;
        }),

        // --- 기존 AsyncThunks 유지 ---
        reqGetCapitalToken: create.asyncThunk(
            async () => await getCapitalToken(),
            {
                pending: (state) => {
                    state.state = "pending";
                    state.capital_token.state = "pending";
                },
                fulfilled: (state, action) => {
                    const json = JSON.parse(action.payload);
                    state.capital_token = { state: "fulfilled", value: json };
                    state.state = "fulfilled";
                },
                rejected: (state) => { state.state = "rejected"; },
            }
        ),
        reqGetUsCapitalToken: create.asyncThunk(
            async () => await getUsCapitalToken(),
            {
                pending: (state) => {
                    state.state = "pending";
                    state.us_capital_token.state = "pending";
                },
                fulfilled: (state, action) => {
                    const json = JSON.parse(action.payload);
                    state.us_capital_token = { state: "fulfilled", value: json };
                    state.state = "fulfilled";
                },
                rejected: (state) => { state.state = "rejected"; },
            }
        ),
        reqGetKrPurchaseLogLatest: create.asyncThunk(
            async (key?: string) => await getKrPurchaseLogLatest(key),
            {
                pending: (state) => { state.krPurchaseLog.state = "pending"; },
                fulfilled: (state, action) => {
                    state.krPurchaseLog.value = action.payload;
                    state.krPurchaseLog.state = "fulfilled";
                },
                rejected: (state) => { state.krPurchaseLog.state = "rejected"; },
            }
        ),
        reqGetUsPurchaseLogLatest: create.asyncThunk(
            async (key?: string) => await getUsPurchaseLogLatest(key),
            {
                pending: (state) => { state.usPurchaseLog.state = "pending"; },
                fulfilled: (state, action) => {
                    state.usPurchaseLog.value = action.payload;
                    state.usPurchaseLog.state = "fulfilled";
                },
                rejected: (state) => { state.usPurchaseLog.state = "rejected"; },
            }
        ),
        reqGetQuantRule: create.asyncThunk(
            async () => await getQuantRule(),
            {
                pending: (state) => {
                    state.state = "pending";
                    state.quant_rule.state = "pending";
                },
                fulfilled: (state, action) => {
                    const json = JSON.parse(action.payload);
                    state.quant_rule = { state: "fulfilled", value: json };
                    state.state = "fulfilled";
                },
                rejected: (state) => { state.state = "rejected"; },
            }
        ),
        reqGetQuantRuleDesc: create.asyncThunk(
            async () => await getQuantRuleDesc(),
            {
                pending: (state) => {
                    state.state = "pending";
                    state.quant_rule_desc.state = "pending";
                },
                fulfilled: (state, action) => {
                    const json = JSON.parse(action.payload);
                    state.quant_rule_desc = { state: "fulfilled", value: json };
                    state.state = "fulfilled";
                },
                rejected: (state) => { state.state = "rejected"; },
            }
        ),
    }),
    selectors: {
        selectAlgorithmTraceState: (state) => state.state,
        selectCapitalToken: (state) => state.capital_token,
        selectkrPurchaseLogLatest: (state) => state.krPurchaseLog,
        selectusPurchaseLogLatest: (state) => state.usPurchaseLog,
        selectUsCapitalToken: (state) => state.us_capital_token,
        selectQuantRule: (state) => state.quant_rule,
        selectQuantRuleDesc: (state) => state.quant_rule_desc,
        
        // [신규 셀렉터]
        selectStockDetails: (state) => state.stockDetails,
        // 특정 티커 정보만 안전하게 가져오기
        selectStockByTicker: (state, ticker: string) => state.stockDetails[ticker],
        selectStrategyLists: (state) => state.strategyLists,
        // 특정 전략 ID에 해당하는 티커 목록 가져오기
        selectTickersByStrategyId: (state, strategyId: string) => state.strategyLists[strategyId]?.tickers || [],
    }
});

export const { 
    reqGetCapitalToken, 
    reqGetUsCapitalToken, 
    reqGetQuantRule, 
    reqGetQuantRuleDesc, 
    reqGetKrPurchaseLogLatest, 
    reqGetUsPurchaseLogLatest,
    updateStockDetail,    // 추가
    setStockState,        // 추가
    registerStrategyList  // 추가
} = algorithmTradeSlice.actions;

export const { 
    selectAlgorithmTraceState, 
    selectCapitalToken, 
    selectUsCapitalToken, 
    selectQuantRule, 
    selectQuantRuleDesc, 
    selectkrPurchaseLogLatest, 
    selectusPurchaseLogLatest,
    selectStockDetails,   // 추가
    selectStockByTicker,  // 추가
    selectStrategyLists,   // 추가
    selectTickersByStrategyId // 추가
} = algorithmTradeSlice.selectors;