import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import {
    getCapitalToken,
    getKrPurchaseLogLatest,
    getQuantRule,
    getQuantRuleDesc,
    getUsCapitalToken,
    getUsPurchaseLogLatest,
    getScanDailyList,
    getScanDailyDates,
    checkScanDailyDate,
} from "./algorithmTradeAPI";

const DEBUG = false;

function normalizeDate(d: string): string {
    return d.replace(/-/g, "");
}

function addDays(dateStr: string, days: number): string {
    const y = parseInt(dateStr.slice(0, 4));
    const m = parseInt(dateStr.slice(4, 6)) - 1;
    const d = parseInt(dateStr.slice(6, 8));
    const dt = new Date(y, m, d + days);
    return [
        dt.getFullYear(),
        String(dt.getMonth() + 1).padStart(2, '0'),
        String(dt.getDate()).padStart(2, '0'),
    ].join('');
}

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

// --- 다중 종목 및 리스트 관리를 위한 인터페이스 ---
export interface StockDetailData {
    ticker: string;
    name: string;
    isUs: boolean;
    state: "init" | "pending" | "fulfilled" | "rejected";
    
    kiPrice?: any;
    kiBS?: any;
    kiIS?: any;
    kiChart?: any;

    finnhubData?: any; 
    usDetail?: any;
    usSearchInfo?: any;
    usDaily?: any;

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
    id: string;               
    title: string;            
    tickers: string[];        
    updatedAt: string;
}

// --- D1 stock_data_daily 인터페이스 ---
export interface NcavDailyItem {
    ticker: string;
    name: string;
    scan_date: string;
    ncav_ratio: number;
    current_assets: number;
    total_liabilities: number;
    market_cap: number;
    last_price: number;
    net_income: number;
    per: number;
    pbr: number;
    eps: number;
    bps: number;
    roe: number | null;
    strategies: string[];
}

export interface NcavDailyDateItem {
    scan_date: string;
    cnt: number;
    total_cnt: number;
    ncav_cnt: number;
    low_pbr_cnt: number;
    low_per_cnt: number;
    s_rim_cnt: number;
}

export interface NcavDailyState {
    state: "init" | "pending" | "fulfilled" | "rejected";
    list: NcavDailyItem[];
    scanDate: string | null;
    total: number;
    scanningInProgress: boolean;
    error: string | null;
}

export interface NcavDailyDatesState {
    state: "init" | "pending" | "fulfilled" | "rejected";
    dates: NcavDailyDateItem[];
    selectedDate: string;
    error: string | null;
}

interface AlgorithmTradeType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    capital_token: CapitalTokenType;
    krPurchaseLog: PurchaseLogType;
    usPurchaseLog: PurchaseLogType;
    us_capital_token: CapitalTokenType;
    quant_rule: QuantRule;
    quant_rule_desc: QuantRule;
    
    stockDetails: Record<string, StockDetailData>;
    strategyLists: Record<string, StrategyList>;
    
    inquire_price_multi: any;
    purchase_log: any;

    ncavDailyDates: NcavDailyDatesState;
    ncavDailyList: NcavDailyState;
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
    stockDetails: {},
    strategyLists: {},
    ncavDailyDates: { state: "init", dates: [], selectedDate: "latest", error: null },
    ncavDailyList: { state: "init", list: [], scanDate: null, total: 0, scanningInProgress: false, error: null },
}

export const algorithmTradeSlice = createAppSlice({
    name: "algorithmTrade",
    initialState,
    reducers: (create) => ({
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

        setStockState: create.reducer((
            state, 
            action: PayloadAction<{ ticker: string; status: StockDetailData["state"] }>
        ) => {
            if (state.stockDetails[action.payload.ticker]) {
                state.stockDetails[action.payload.ticker].state = action.payload.status;
            }
        }),

        registerStrategyList: create.reducer((state, action: PayloadAction<StrategyList>) => {
            state.strategyLists[action.payload.id] = action.payload;
        }),

        setNcavDailySelectedDate: create.reducer((state, action: PayloadAction<string>) => {
            state.ncavDailyDates.selectedDate = action.payload;
        }),

        reqGetCapitalToken: create.asyncThunk(
            async () => await getCapitalToken(),
            {
                pending: (state) => {
                    state.state = "pending";
                    state.capital_token.state = "pending";
                },
                fulfilled: (state, action) => {
                    state.capital_token = { state: "fulfilled", value: action.payload };
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
                    state.us_capital_token = { state: "fulfilled", value: action.payload };
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
                    state.quant_rule = { state: "fulfilled", value: action.payload };
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
                    state.quant_rule_desc = { state: "fulfilled", value: action.payload };
                    state.state = "fulfilled";
                },
                rejected: (state) => { state.state = "rejected"; },
            }
        ),
        reqGetNcavDailyDates: create.asyncThunk(
            async () => {
                const result = await getScanDailyDates();
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                pending: (state) => { state.ncavDailyDates.state = "pending"; state.ncavDailyDates.error = null; },
                fulfilled: (state, action) => {
                    const raw: any[] = action.payload?.data ?? [];
                    const seen = new Set<string>();
                    state.ncavDailyDates.dates = raw
                        .map(d => ({
                            scan_date: normalizeDate(d.scan_date),
                            cnt: d.total_cnt ?? d.cnt ?? 0,
                            total_cnt: d.total_cnt ?? d.cnt ?? 0,
                            ncav_cnt: d.ncav_cnt ?? 0,
                            low_pbr_cnt: d.low_pbr_cnt ?? 0,
                            low_per_cnt: d.low_per_cnt ?? 0,
                            s_rim_cnt: d.s_rim_cnt ?? 0,
                        }))
                        .filter(d => { if (seen.has(d.scan_date)) return false; seen.add(d.scan_date); return true; })
                        .sort((a, b) => b.scan_date.localeCompare(a.scan_date));
                    state.ncavDailyDates.state = "fulfilled";
                },
                rejected: (state, action) => {
                    state.ncavDailyDates.state = "rejected";
                    state.ncavDailyDates.error = action.error?.message ?? null;
                },
            }
        ),
        reqGetNcavDailyList: create.asyncThunk(
            async (date?: string) => {
                const result = await getScanDailyList(date);
                if (result?.success === false) throw new Error(result?.error ?? "API error");
                return result;
            },
            {
                pending: (state) => { state.ncavDailyList.state = "pending"; state.ncavDailyList.error = null; },
                fulfilled: (state, action) => {
                    const raw: any[] = action.payload?.data ?? [];
                    state.ncavDailyList.list = raw.map(item => ({
                        ...item,
                        strategies: Array.isArray(item.strategies)
                            ? item.strategies
                            : (() => { try { return JSON.parse(item.strategies ?? "[]"); } catch { return []; } })(),
                    }));
                    state.ncavDailyList.total = action.payload?.meta?.total ?? 0;
                    state.ncavDailyList.scanningInProgress = action.payload?.meta?.scanningInProgress ?? false;
                    state.ncavDailyList.state = "fulfilled";
                    const rawScanDate = action.payload?.meta?.scanDate;
                    const scanDate = rawScanDate ? normalizeDate(rawScanDate) : null;
                    if (scanDate) {
                        state.ncavDailyList.scanDate = scanDate;
                        if (!state.ncavDailyDates.dates.find(d => d.scan_date === scanDate)) {
                            const total = action.payload?.meta?.total ?? 0;
                            const merged = [...state.ncavDailyDates.dates, {
                                scan_date: scanDate,
                                cnt: total,
                                total_cnt: total,
                                ncav_cnt: 0,
                                low_pbr_cnt: 0,
                                low_per_cnt: 0,
                                s_rim_cnt: 0,
                            }];
                            state.ncavDailyDates.dates = merged.sort((a, b) => b.scan_date.localeCompare(a.scan_date));
                        }
                    }
                },
                rejected: (state, action) => {
                    state.ncavDailyList.state = "rejected";
                    state.ncavDailyList.error = action.error?.message ?? null;
                },
            }
        ),
        reqDiscoverNcavDates: create.asyncThunk(
            async (baseDate: string) => {
                const datesToProbe = Array.from({ length: 7 }, (_, i) => addDays(baseDate, -(i + 1)));
                const results = await Promise.allSettled(datesToProbe.map(d => checkScanDailyDate(d)));
                const found: NcavDailyDateItem[] = [];
                for (let i = 0; i < results.length; i++) {
                    const r = results[i];
                    if (r.status === 'fulfilled' && r.value?.success && r.value?.data?.length > 0) {
                        const sd = r.value.meta?.scanDate ?? datesToProbe[i];
                        const total = r.value.meta?.total ?? r.value.data.length;
                        found.push({
                            scan_date: normalizeDate(sd),
                            cnt: total,
                            total_cnt: total,
                            ncav_cnt: 0,
                            low_pbr_cnt: 0,
                            low_per_cnt: 0,
                            s_rim_cnt: 0,
                        });
                    }
                }
                return found;
            },
            {
                pending: () => {},
                fulfilled: (state, action) => {
                    const existing = state.ncavDailyDates.dates;
                    const added = action.payload.filter(d => !existing.find(e => e.scan_date === d.scan_date));
                    if (added.length > 0) {
                        state.ncavDailyDates.dates = [...existing, ...added].sort((a, b) => b.scan_date.localeCompare(a.scan_date));
                    }
                },
                rejected: () => {},
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
        
        selectStockDetails: (state) => state.stockDetails,
        selectStockByTicker: (state, ticker: string) => state.stockDetails[ticker],
        selectStrategyLists: (state) => state.strategyLists,
        selectTickersByStrategyId: (state, strategyId: string) => state.strategyLists[strategyId]?.tickers || [],

        selectNcavDailyDates: (state) => state.ncavDailyDates,
        selectNcavDailyList: (state) => state.ncavDailyList,
    }
});

export const { 
    reqGetCapitalToken, 
    reqGetUsCapitalToken, 
    reqGetQuantRule, 
    reqGetQuantRuleDesc, 
    reqGetKrPurchaseLogLatest, 
    reqGetUsPurchaseLogLatest,
    updateStockDetail,    
    setStockState,        
    registerStrategyList,
    setNcavDailySelectedDate,
    reqGetNcavDailyDates,
    reqGetNcavDailyList,
    reqDiscoverNcavDates,
} = algorithmTradeSlice.actions;

export const { 
    selectAlgorithmTraceState, 
    selectCapitalToken, 
    selectUsCapitalToken, 
    selectQuantRule, 
    selectQuantRuleDesc, 
    selectkrPurchaseLogLatest, 
    selectusPurchaseLogLatest,
    selectStockDetails,   
    selectStockByTicker,  
    selectStrategyLists,   
    selectTickersByStrategyId,
    selectNcavDailyDates,
    selectNcavDailyList,
} = algorithmTradeSlice.selectors;
