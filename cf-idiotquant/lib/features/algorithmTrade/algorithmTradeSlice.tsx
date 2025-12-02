import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getCapitalToken, getInquirePriceMulti, getKrPurchaseLogLatest, getQuantRule, getQuantRuleDesc, getUsCapitalToken, getUsPurchaseLogLatest } from "./algorithmTradeAPI";
import { KoreaInvestmentToken } from "../koreaInvestment/koreaInvestmentSlice";

const DEBUG = false;

interface CapitalTokenTypeValueTimestamp {
    "current": string;
    "prev": string;
    "prevPrev": string;
}

interface CapitalTokenTypeValueStock {
    "name": string; //"전방"
    "PDNO": string; // "000950"
    "token": number; // 292
    "output_inquirePrice"?: any;
    "output_balanceSheet"?: any;
}

interface CapitalTokenTypeValuePurchaseLogStockList {
    "stock_name": string;// "동일제강",
    "stock_code": string;//"002690",
    "remaining_token": string;// "10320",
    "stck_prpr": string;//"1239",
    "ORD_QTY": string; //"8"
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
    "corp_scan_index": number;// 1169,
    "token_per_stock": number;//27
    "frst_bltn_exrt"?: any;
}

export interface CapitalTokenType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
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
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
    value: QuantRuleValue;
}
interface AlgorithmTradeType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
    capital_token: CapitalTokenType;
    krPurchaseLog: PurchaseLogType;
    usPurchaseLog: PurchaseLogType;
    inquire_price_multi: any;
    purchase_log: any;
    us_capital_token: CapitalTokenType;
    quant_rule: QuantRule;
    quant_rule_desc: QuantRule;
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
    krPurchaseLog: {
        state: "init",
        value: []
    },
    usPurchaseLog: {
        state: "init",
        value: []
    },
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
            max_pbr: "",
            min_tomv: "",
            min_tomv_nasdaq: "",
            min_eps: "",
            ncav_ratio: "",
            portfolio_weight: "",
            exclude_call_warrants: "",
        }
    }
}
export const algorithmTradeSlice = createAppSlice({
    name: "algorithmTrade",
    initialState,
    reducers: (create) => ({
        reqGetInquirePriceMulti: create.asyncThunk(
            async ({ koreaInvestmentToken, PDNOs }: { koreaInvestmentToken: KoreaInvestmentToken, PDNOs: string[] }) => {
                return await getInquirePriceMulti(koreaInvestmentToken, PDNOs);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetInquirePriceMulti] pending`);
                    state.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetInquirePriceMulti] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    // const json = JSON.parse(action.payload);
                    // console.log(`[reqGetInquirePriceMulti] fulfilled json`, json);
                    state.inquire_price_multi = { ...state.inquire_price_multi, ...action.payload };
                    // state.inquire_price_multi = json["stock_list"];
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqGetInquirePriceMulti] rejected`);
                    state.state = "rejected";
                },
            }
        ),
        reqGetCapitalToken: create.asyncThunk(
            async () => {
                return await getCapitalToken();
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetCapitalToken] pending`);
                    state.state = "pending";
                    state.capital_token.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetCapitalToken] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    const json = JSON.parse(action.payload);
                    // console.log(`[reqGetCapitalToken] fulfilled json`, json);
                    state.capital_token = { state: "fulfilled", value: json };
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    // console.log(`[reqGetCapitalToken] rejected`);
                    state.state = "rejected";
                },
            }
        ),
        reqGetUsCapitalToken: create.asyncThunk(
            async () => {
                return await getUsCapitalToken();
            },
            {
                pending: (state) => {
                    if (DEBUG) console.log(`[reqGetCapitalToken] pending`);
                    state.state = "pending";
                    state.us_capital_token.state = "pending";
                },
                fulfilled: (state, action) => {
                    if (DEBUG) console.log(`[reqGetCapitalToken] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    const json = JSON.parse(action.payload);
                    if (DEBUG) console.log(`[reqGetCapitalToken] fulfilled json`, json);
                    state.us_capital_token = { state: "fulfilled", value: json };
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    if (DEBUG) console.log(`[reqGetCapitalToken] rejected`);
                    state.state = "rejected";
                },
            }
        ),
        reqGetKrPurchaseLogLatest: create.asyncThunk(
            async (key?: string) => {
                return await getKrPurchaseLogLatest(key);
            },
            {
                pending: (state) => {
                    if (DEBUG) console.log(`[reqGetKrPurchaseLogLatest] pending`);
                    state.krPurchaseLog.state = "pending";
                },
                fulfilled: (state, action) => {
                    if (DEBUG) console.log(`[reqGetKrPurchaseLogLatest] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    // const json = JSON.parse(action.payload);
                    // state.krPurchaseLog.value = json;
                    state.krPurchaseLog.value = action.payload;
                    state.krPurchaseLog.state = "fulfilled";
                },
                rejected: (state) => {
                    if (DEBUG) console.log(`[reqGetKrPurchaseLogLatest] rejected`);
                    state.krPurchaseLog.state = "rejected";
                },
            }
        ),
        reqGetUsPurchaseLogLatest: create.asyncThunk(
            async (key?: string) => {
                return await getUsPurchaseLogLatest(key);
            },
            {
                pending: (state) => {
                    if (DEBUG) console.log(`[reqGetUsPurchaseLogLatest] pending`);
                    state.usPurchaseLog.state = "pending";
                },
                fulfilled: (state, action) => {
                    if (DEBUG) console.log(`[reqGetUsPurchaseLogLatest] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    // const json = JSON.parse(action.payload);
                    // state.krPurchaseLog.value = json;
                    state.usPurchaseLog.value = action.payload;
                    state.usPurchaseLog.state = "fulfilled";
                },
                rejected: (state) => {
                    if (DEBUG) console.log(`[reqGetUsPurchaseLogLatest] rejected`);
                    state.usPurchaseLog.state = "rejected";
                },
            }
        ),
        reqGetQuantRule: create.asyncThunk(
            async () => {
                return await getQuantRule();
            },
            {
                pending: (state) => {
                    if (DEBUG) console.log(`[reqGetQuantRule] pending`);
                    state.state = "pending";
                    state.quant_rule.state = "pending";
                },
                fulfilled: (state, action) => {
                    if (DEBUG) console.log(`[reqGetQuantRule] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    const json = JSON.parse(action.payload);
                    if (DEBUG) console.log(`[reqGetQuantRule] fulfilled json`, json);
                    state.quant_rule = { state: "fulfilled", value: json };
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    if (DEBUG) console.log(`[reqGetQuantRule] rejected`);
                    state.state = "rejected";
                },
            }
        ),
        reqGetQuantRuleDesc: create.asyncThunk(
            async () => {
                return await getQuantRuleDesc();
            },
            {
                pending: (state) => {
                    if (DEBUG) console.log(`[reqGetQuantRuleDesc] pending`);
                    state.state = "pending";
                    state.quant_rule_desc.state = "pending";
                },
                fulfilled: (state, action) => {
                    if (DEBUG) console.log(`[reqGetQuantRuleDesc] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    const json = JSON.parse(action.payload);
                    if (DEBUG) console.log(`[reqGetQuantRuleDesc] fulfilled json`, json);
                    state.quant_rule_desc = { state: "fulfilled", value: json };
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    if (DEBUG) console.log(`[reqGetQuantRuleDesc] rejected`);
                    state.state = "rejected";
                },
            }
        ),

    }),
    selectors: {
        selectAlgorithmTraceState: (state) => state.state,
        selectCapitalToken: (state) => state.capital_token,
        selectkrPurchaseLogLatest: (state) => state.krPurchaseLog,
        selectusPurchaseLogLatest: (state) => state.usPurchaseLog,
        selectUsCapitalToken: (state) => state.us_capital_token,
        selectInquirePriceMulti: (state) => state.inquire_price_multi,
        selectQuantRule: (state) => state.quant_rule,
        selectQuantRuleDesc: (state) => state.quant_rule_desc,
    }
});

export const { reqGetInquirePriceMulti, reqGetCapitalToken, reqGetUsCapitalToken, reqGetQuantRule, reqGetQuantRuleDesc, reqGetKrPurchaseLogLatest, reqGetUsPurchaseLogLatest } = algorithmTradeSlice.actions;
export const { selectAlgorithmTraceState, selectCapitalToken, selectInquirePriceMulti, selectUsCapitalToken, selectQuantRule, selectQuantRuleDesc, selectkrPurchaseLogLatest, selectusPurchaseLogLatest } = algorithmTradeSlice.selectors;
