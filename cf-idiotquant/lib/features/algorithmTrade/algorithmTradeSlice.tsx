import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getCapitalToken, getInquirePriceMulti, getUsCapitalToken } from "./algorithmTradeAPI";
import { registerCookie } from "@/components/util";
import { KoreaInvestmentToken } from "../koreaInvestment/koreaInvestmentSlice";
import { string } from "three/tsl";

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

interface AlgorithmTradeType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
    capital_token: CapitalTokenType;
    inquire_price_multi: any;
    purchase_log: any;
    us_capital_token: CapitalTokenType;
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
            async ({ koreaInvestmentToken }: { koreaInvestmentToken: KoreaInvestmentToken }) => {
                return await getCapitalToken(koreaInvestmentToken);
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
                    console.log(`[reqGetCapitalToken] fulfilled json`, json);
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
            async ({ koreaInvestmentToken }: { koreaInvestmentToken: KoreaInvestmentToken }) => {
                return await getUsCapitalToken(koreaInvestmentToken);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetCapitalToken] pending`);
                    state.state = "pending";
                    state.us_capital_token.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetCapitalToken] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    const json = JSON.parse(action.payload);
                    console.log(`[reqGetCapitalToken] fulfilled json`, json);
                    state.us_capital_token = { state: "fulfilled", value: json };
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    // console.log(`[reqGetCapitalToken] rejected`);
                    state.state = "rejected";
                },
            }
        ),
    }),
    selectors: {
        selectAlgorithmTraceState: (state) => state.state,
        selectCapitalToken: (state) => state.capital_token,
        selectUsCapitalToken: (state) => state.us_capital_token,
        selectInquirePriceMulti: (state) => state.inquire_price_multi,
    }
});

export const { reqGetInquirePriceMulti, reqGetCapitalToken, reqGetUsCapitalToken } = algorithmTradeSlice.actions;
export const { selectAlgorithmTraceState, selectCapitalToken, selectInquirePriceMulti, selectUsCapitalToken } = algorithmTradeSlice.selectors;
