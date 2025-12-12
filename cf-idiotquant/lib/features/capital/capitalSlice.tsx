import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getUsCapital, postUsCapitalTokenMinusAll, postUsCapitalTokenMinusOne, postUsCapitalTokenPlusAll, postUsCapitalTokenPlusOne } from "./capitalAPI";

export interface StockCondition {
    AssetsCurrent: number;
    LastPrice: string;
    LiabilitiesCurrent: number;
    MarketCapitalization: number;
    NetIncome: number;
    bps: number;
    date: string;
    eps: number;
    pbr: number;
    per: number;
}

export interface UsCapitalStockItem {
    symbol: string;
    key: string;
    condition?: StockCondition;
    ncavRatio?: string;
    token?: number;
    action?: string;
}

export interface UsCapitalType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    time_stamp: { current: string; prev: string; prevPrev: string };
    token_info: { token_per_stock: number; refill_stock_index: number };
    charge_info: { capital_charge_per_year: string; capital_charge_per_month: number; capital_charge_rate: number };
    stock_list: UsCapitalStockItem[];
    corp_scan_index: number;
    frst_bltn_exrt: number;
}

interface UsCapitalTokenRefillType {
    state: "init" | "pending" | "fulfilled" | "rejected";
}

export interface CapitalType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    usCapital: UsCapitalType;
    usCapitalTokenPlusAll: UsCapitalTokenRefillType;
    usCapitalTokenPlusOne: UsCapitalTokenRefillType;
    usCapitalTokenMinusAll: UsCapitalTokenRefillType;
    usCapitalTokenMinusOne: UsCapitalTokenRefillType;
}

const initialState: CapitalType = {
    state: "init",
    usCapital: {
        state: "init",
        time_stamp: {
            current: "",
            prev: "",
            prevPrev: ""
        },
        token_info: {
            token_per_stock: 0,
            refill_stock_index: 0
        },
        charge_info: {
            capital_charge_per_year: "",
            capital_charge_per_month: 0,
            capital_charge_rate: 0
        },
        stock_list: [],
        corp_scan_index: 0,
        frst_bltn_exrt: 0
    },
    usCapitalTokenPlusAll: {
        state: "init"
    },
    usCapitalTokenPlusOne: {
        state: "init"
    },
    usCapitalTokenMinusAll: {
        state: "init"
    },
    usCapitalTokenMinusOne: {
        state: "init"
    }
}

export const capitalSlice = createAppSlice({
    name: "capital",
    initialState,
    reducers: (create) => ({
        reqGetUsCapital: create.asyncThunk(
            async (key?: string) => {
                return await getUsCapital(key);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetUsCapital] pending`);
                    state.usCapital.state = "pending"
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetUsCapital] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    const json = action.payload;
                    state.usCapital = { ...json, state: "fulfilled" };
                },
                rejected: (state) => {
                    // console.log(`[reqGetUsCapital] rejected`);
                    state.usCapital.state = "rejected"
                }
            }
        ),
        reqPostUsCapitalTokenPlusAll: create.asyncThunk(
            async ({ key, num }: { key?: string, num: number }) => {
                return await postUsCapitalTokenPlusAll(key, num);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostUsCapitalTokenPlusAll] pending`);
                    state.usCapitalTokenPlusAll.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostUsCapitalTokenPlusAll] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    // const json = action.payload;
                    state.usCapitalTokenPlusAll.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqPostUsCapitalTokenPlusAll] rejected`);
                    state.usCapitalTokenPlusAll.state = "rejected"
                }
            }
        ),

        reqPostUsCapitalTokenPlusOne: create.asyncThunk(
            async ({ key, num, ticker }: { key?: string, num: number, ticker: string }) => {
                return await postUsCapitalTokenPlusOne(key, num, ticker);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostUsCapitalTokenPlusOne] pending`);
                    state.usCapitalTokenPlusOne.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostUsCapitalTokenPlusOne] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    // const json = action.payload;
                    state.usCapitalTokenPlusOne.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqPostUsCapitalTokenPlusOne] rejected`);
                    state.usCapitalTokenPlusOne.state = "rejected"
                }
            }
        ),
        reqPostUsCapitalTokenMinusAll: create.asyncThunk(
            async ({ key, num }: { key?: string, num: number }) => {
                return await postUsCapitalTokenMinusAll(key, num);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostUsCapitalTokenMinusAll] pending`);
                    state.usCapitalTokenMinusAll.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostUsCapitalTokenMinusAll] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    // const json = action.payload;
                    state.usCapitalTokenMinusAll.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqPostUsCapitalTokenMinusAll] rejected`);
                    state.usCapitalTokenMinusAll.state = "rejected"
                }
            }
        ),
        reqPostUsCapitalTokenMinusOne: create.asyncThunk(
            async ({ key, num, ticker }: { key?: string, num: number, ticker: string }) => {
                return await postUsCapitalTokenMinusOne(key, num, ticker);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostUsCapitalTokenMinusOne] pending`);
                    state.usCapitalTokenMinusOne.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostUsCapitalTokenMinusOne] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    // const json = action.payload;
                    state.usCapitalTokenMinusOne.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqPostUsCapitalTokenMinusOne] rejected`);
                    state.usCapitalTokenMinusOne.state = "rejected"
                }
            }
        ),
    }),
    selectors: {
        selectUsCapital: (state) => state.usCapital,
        selectUsCapitalTokenPlusAll: (state) => state.usCapitalTokenPlusAll,
        selectUsCapitalTokenPlusOne: (state) => state.usCapitalTokenPlusOne,
        selectUsCapitalTokenMinusAll: (state) => state.usCapitalTokenMinusAll,
        selectUsCapitalTokenMinusOne: (state) => state.usCapitalTokenMinusOne,
    }
});

export const { reqGetUsCapital, reqPostUsCapitalTokenPlusAll, reqPostUsCapitalTokenPlusOne, reqPostUsCapitalTokenMinusAll, reqPostUsCapitalTokenMinusOne } = capitalSlice.actions;
export const { selectUsCapital, selectUsCapitalTokenPlusAll, selectUsCapitalTokenPlusOne, selectUsCapitalTokenMinusAll, selectUsCapitalTokenMinusOne } = capitalSlice.selectors;
