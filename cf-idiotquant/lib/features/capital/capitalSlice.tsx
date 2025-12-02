import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getCapitalUs } from "./capitalAPI";

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

export interface CapitalUsStockItem {
    symbol: string;
    key: string;
    condition?: StockCondition;
    ncavRatio?: string;
    token?: number;
    action?: string;
}

export interface CapitalUsType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    time_stamp: { current: string; prev: string; prevPrev: string };
    token_info: { token_per_stock: number; refill_stock_index: number };
    charge_info: { capital_charge_per_year: string; capital_charge_per_month: number; capital_charge_rate: number };
    stock_list: CapitalUsStockItem[];
    corp_scan_index: number;
    frst_bltn_exrt: number;
}

export interface CapitalType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    capitalUs: CapitalUsType;
}

const initialState: CapitalType = {
    state: "init",
    capitalUs: {
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
    }
}

export const capitalSlice = createAppSlice({
    name: "capital",
    initialState,
    reducers: (create) => ({
        reqGetCapitalUs: create.asyncThunk(
            async (key?: string) => {
                return await getCapitalUs(key);
            },
            {
                pending: (state) => {
                    console.log(`[getCapitalUs] pending`);
                    state.capitalUs.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[getCapitalUs] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    const json = action.payload;
                    state.capitalUs = { ...json, state: "fulfilled" };
                },
                rejected: (state) => {
                    console.log(`[getCapitalUs] rejected`);
                    state.capitalUs.state = "rejected"
                }
            }
        ),
    }),
    selectors: {
        selectCapitalUs: (state) => state.capitalUs,
    }
});

export const { reqGetCapitalUs } = capitalSlice.actions;
export const { selectCapitalUs } = capitalSlice.selectors;
