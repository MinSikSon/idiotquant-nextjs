import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getUsCapital, postUsCapitalTokenAllMinus, postUsCapitalTokenAllPlus } from "./capitalAPI";

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

interface UsCapitalTokenAllType {
    state: "init" | "pending" | "fulfilled" | "rejected";
}

export interface CapitalType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    usCapital: UsCapitalType;
    usCapitalTokenAllPlus: UsCapitalTokenAllType;
    usCapitalTokenAllMinus: UsCapitalTokenAllType;
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
    usCapitalTokenAllPlus: {
        state: "init"
    },
    usCapitalTokenAllMinus: {
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
                    console.log(`[reqGetUsCapital] pending`);
                    state.usCapital.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetUsCapital] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    const json = action.payload;
                    state.usCapital = { ...json, state: "fulfilled" };
                },
                rejected: (state) => {
                    console.log(`[reqGetUsCapital] rejected`);
                    state.usCapital.state = "rejected"
                }
            }
        ),
        reqPostUsCapitalTokenAllPlus: create.asyncThunk(
            async ({ key, num }: { key?: string, num: number }) => {
                return await postUsCapitalTokenAllPlus(key, num);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostUsCapitalTokenAllPlus] pending`);
                    state.usCapitalTokenAllPlus.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostUsCapitalTokenAllPlus] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    // const json = action.payload;
                    state.usCapitalTokenAllPlus.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqPostUsCapitalTokenAllPlus] rejected`);
                    state.usCapitalTokenAllPlus.state = "rejected"
                }
            }
        ),
        reqPostUsCapitalTokenAllMinus: create.asyncThunk(
            async ({ key, num }: { key?: string, num: number }) => {
                return await postUsCapitalTokenAllMinus(key, num);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostUsCapitalTokenAllMinus] pending`);
                    state.usCapitalTokenAllMinus.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostUsCapitalTokenAllMinus] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    // const json = action.payload;
                    state.usCapitalTokenAllMinus.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqPostUsCapitalTokenAllMinus] rejected`);
                    state.usCapitalTokenAllMinus.state = "rejected"
                }
            }
        ),
    }),
    selectors: {
        selectUsCapital: (state) => state.usCapital,
        selectUsCapitalTokenAllPlus: (state) => state.usCapitalTokenAllPlus,
        selectUsCapitalTokenAllMinus: (state) => state.usCapitalTokenAllMinus,
    }
});

export const { reqGetUsCapital, reqPostUsCapitalTokenAllPlus, reqPostUsCapitalTokenAllMinus } = capitalSlice.actions;
export const { selectUsCapital, selectUsCapitalTokenAllPlus, selectUsCapitalTokenAllMinus } = capitalSlice.selectors;
