import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getKrCapital, getUsCapital, postKrCapitalTokenMinusAll, postKrCapitalTokenMinusOne, postKrCapitalTokenPlusAll, postKrCapitalTokenPlusOne, postUsCapitalTokenMinusAll, postUsCapitalTokenMinusOne, postUsCapitalTokenPlusAll, postUsCapitalTokenPlusOne, postKrCapitalGroupCreate, postKrCapitalGroupUpdate, postKrCapitalGroupDelete, postKrCapitalStockGroup, postKrCapitalStocksGroup, postUsCapitalGroupCreate, postUsCapitalGroupUpdate, postUsCapitalGroupDelete, postUsCapitalStockGroup, postUsCapitalStocksGroup, getKrQuantRule, postKrQuantRule, getUsQuantRule, postUsQuantRule } from "./capitalAPI";

/** 예약(가상) 그룹 id — 좋아요(찜) 종목 그룹 */
export const LIKES_GROUP_ID = "__likes__";

/** 트레이딩 조건 (quant_rule) */
export interface QuantRule {
    ncav_ratio?: number;
    max_pbr?: number;
    min_pbr?: number;
    min_per?: number;
    min_eps?: number;
    min_bps?: number;
    portfolio_weight?: number;
    active_count?: number;
    exclude_call_warrants?: boolean;
    exclude_key_word?: string[];
    [key: string]: any;
}

export interface QuantRuleFieldMeta {
    label: string;
    desc: string;
    type: "number" | "int" | "boolean" | "string[]";
    step?: number;
}

export interface QuantRuleState {
    state: "init" | "pending" | "fulfilled" | "rejected";
    saveState: "init" | "pending" | "fulfilled" | "rejected";
    has_account: boolean;
    is_override: boolean;
    rule: QuantRule;
    default: QuantRule;
    desc: Record<string, QuantRuleFieldMeta>;
}

const initialQuantRuleState: QuantRuleState = {
    state: "init",
    saveState: "init",
    has_account: false,
    is_override: false,
    rule: {},
    default: {},
    desc: {},
};

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

export interface StockGroup {
    id: string;
    name: string;
    is_trading_active: boolean;
}

export interface UsCapitalStockItem {
    symbol: string;
    key: string;
    condition?: StockCondition;
    ncavRatio?: string;
    token?: number;
    action?: string;
    group_id?: string | null;
    name?: string;
}

export interface KrUsCapitalType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    time_stamp: { current: string; prev: string; prevPrev: string };
    token_info: { token_per_stock: number; refill_stock_index: number };
    charge_info: { capital_charge_per_year: string; capital_charge_per_month: number; capital_charge_rate: number };
    stock_list: UsCapitalStockItem[];
    groups?: StockGroup[];
    corp_scan_index: number;
    action: string;
    frst_bltn_exrt: number;
}

interface CapitalTokenRefillType {
    state: "init" | "pending" | "fulfilled" | "rejected";
}

export interface CapitalType {
    state: "init" | "pending" | "fulfilled" | "rejected";
    krCapital: KrUsCapitalType;
    usCapital: KrUsCapitalType;
    krCapitalTokenPlusAll: CapitalTokenRefillType;
    krCapitalTokenPlusOne: CapitalTokenRefillType;
    krCapitalTokenMinusAll: CapitalTokenRefillType;
    krCapitalTokenMinusOne: CapitalTokenRefillType;
    usCapitalTokenPlusAll: CapitalTokenRefillType;
    usCapitalTokenPlusOne: CapitalTokenRefillType;
    usCapitalTokenMinusAll: CapitalTokenRefillType;
    usCapitalTokenMinusOne: CapitalTokenRefillType;
    krGroupOp: CapitalTokenRefillType;
    usGroupOp: CapitalTokenRefillType;
    krQuantRule: QuantRuleState;
    usQuantRule: QuantRuleState;
}

const initialState: CapitalType = {
    state: "init",
    krCapital: {
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
        action: "",
        frst_bltn_exrt: 0
    },
    krCapitalTokenPlusAll: {
        state: "init"
    },
    krCapitalTokenPlusOne: {
        state: "init"
    },
    krCapitalTokenMinusAll: {
        state: "init"
    },
    krCapitalTokenMinusOne: {
        state: "init"
    },
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
        action: "",
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
    },
    krGroupOp: {
        state: "init"
    },
    usGroupOp: {
        state: "init"
    },
    krQuantRule: { ...initialQuantRuleState },
    usQuantRule: { ...initialQuantRuleState }
}

export const capitalSlice = createAppSlice({
    name: "capital",
    initialState,
    reducers: (create) => ({
        // KR
        reqGetKrCapital: create.asyncThunk(
            async (key?: string) => {
                return await getKrCapital(key);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetKrCapital] pending`);
                    state.krCapital.state = "pending"
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetKrCapital] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    const json = action.payload;
                    state.krCapital = { ...json, state: "fulfilled" };
                },
                rejected: (state) => {
                    // console.log(`[reqGetKrCapital] rejected`);
                    state.krCapital.state = "rejected"
                }
            }
        ),
        reqPostKrCapitalTokenPlusAll: create.asyncThunk(
            async ({ key, num }: { key?: string, num: number }) => {
                return await postKrCapitalTokenPlusAll(key, num);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostKrCapitalTokenPlusAll] pending`);
                    state.krCapitalTokenPlusAll.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostKrCapitalTokenPlusAll] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    // const json = action.payload;
                    state.krCapitalTokenPlusAll.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqPostKrCapitalTokenPlusAll] rejected`);
                    state.krCapitalTokenPlusAll.state = "rejected"
                }
            }
        ),
        reqPostKrCapitalTokenPlusOne: create.asyncThunk(
            async ({ key, num, ticker }: { key?: string, num: number, ticker: string }) => {
                return await postKrCapitalTokenPlusOne(key, num, ticker);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostKrCapitalTokenPlusOne] pending`);
                    state.krCapitalTokenPlusOne.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostKrCapitalTokenPlusOne] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    // const json = action.payload;
                    state.krCapitalTokenPlusOne.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqPostKrCapitalTokenPlusOne] rejected`);
                    state.krCapitalTokenPlusOne.state = "rejected"
                }
            }
        ),
        reqPostKrCapitalTokenMinusAll: create.asyncThunk(
            async ({ key, num }: { key?: string, num: number }) => {
                return await postKrCapitalTokenMinusAll(key, num);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostKrCapitalTokenMinusAll] pending`);
                    state.krCapitalTokenMinusAll.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostKrCapitalTokenMinusAll] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    // const json = action.payload;
                    state.krCapitalTokenMinusAll.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqPostKrCapitalTokenMinusAll] rejected`);
                    state.krCapitalTokenMinusAll.state = "rejected"
                }
            }
        ),
        reqPostKrCapitalTokenMinusOne: create.asyncThunk(
            async ({ key, num, ticker }: { key?: string, num: number, ticker: string }) => {
                return await postKrCapitalTokenMinusOne(key, num, ticker);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostKrCapitalTokenMinusOne] pending`);
                    state.krCapitalTokenMinusOne.state = "pending"
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostKrCapitalTokenMinusOne] fulfilled`, `, typeof action.payload:`, typeof action.payload, `, action.payload:`, action.payload);
                    // const json = action.payload;
                    state.krCapitalTokenMinusOne.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqPostKrCapitalTokenMinusOne] rejected`);
                    state.krCapitalTokenMinusOne.state = "rejected"
                }
            }
        ),

        // US
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

        // ── 종목 그룹 관리 (KR) ──
        reqPostKrCapitalGroupCreate: create.asyncThunk(
            async ({ key, name, tickers }: { key?: string, name: string, tickers?: string[] }) => postKrCapitalGroupCreate(key, name, tickers),
            {
                pending: (state) => { state.krGroupOp.state = "pending"; },
                fulfilled: (state) => { state.krGroupOp.state = "fulfilled"; },
                rejected: (state) => { state.krGroupOp.state = "rejected"; },
            }
        ),
        reqPostKrCapitalStocksGroup: create.asyncThunk(
            async ({ key, tickers, groupId }: { key?: string, tickers: string[], groupId: string | null }) => postKrCapitalStocksGroup(key, tickers, groupId),
            {
                pending: (state) => { state.krGroupOp.state = "pending"; },
                fulfilled: (state) => { state.krGroupOp.state = "fulfilled"; },
                rejected: (state) => { state.krGroupOp.state = "rejected"; },
            }
        ),
        reqPostKrCapitalGroupUpdate: create.asyncThunk(
            async ({ key, groupId, updates }: { key?: string, groupId: string, updates: { name?: string, is_trading_active?: boolean } }) => postKrCapitalGroupUpdate(key, groupId, updates),
            {
                pending: (state) => { state.krGroupOp.state = "pending"; },
                fulfilled: (state) => { state.krGroupOp.state = "fulfilled"; },
                rejected: (state) => { state.krGroupOp.state = "rejected"; },
            }
        ),
        reqPostKrCapitalGroupDelete: create.asyncThunk(
            async ({ key, groupId }: { key?: string, groupId: string }) => postKrCapitalGroupDelete(key, groupId),
            {
                pending: (state) => { state.krGroupOp.state = "pending"; },
                fulfilled: (state) => { state.krGroupOp.state = "fulfilled"; },
                rejected: (state) => { state.krGroupOp.state = "rejected"; },
            }
        ),
        reqPostKrCapitalStockGroup: create.asyncThunk(
            async ({ key, ticker, groupId }: { key?: string, ticker: string, groupId: string | null }) => postKrCapitalStockGroup(key, ticker, groupId),
            {
                pending: (state) => { state.krGroupOp.state = "pending"; },
                fulfilled: (state) => { state.krGroupOp.state = "fulfilled"; },
                rejected: (state) => { state.krGroupOp.state = "rejected"; },
            }
        ),

        // ── 종목 그룹 관리 (US) ──
        reqPostUsCapitalGroupCreate: create.asyncThunk(
            async ({ key, name, tickers }: { key?: string, name: string, tickers?: string[] }) => postUsCapitalGroupCreate(key, name, tickers),
            {
                pending: (state) => { state.usGroupOp.state = "pending"; },
                fulfilled: (state) => { state.usGroupOp.state = "fulfilled"; },
                rejected: (state) => { state.usGroupOp.state = "rejected"; },
            }
        ),
        reqPostUsCapitalStocksGroup: create.asyncThunk(
            async ({ key, tickers, groupId }: { key?: string, tickers: string[], groupId: string | null }) => postUsCapitalStocksGroup(key, tickers, groupId),
            {
                pending: (state) => { state.usGroupOp.state = "pending"; },
                fulfilled: (state) => { state.usGroupOp.state = "fulfilled"; },
                rejected: (state) => { state.usGroupOp.state = "rejected"; },
            }
        ),
        reqPostUsCapitalGroupUpdate: create.asyncThunk(
            async ({ key, groupId, updates }: { key?: string, groupId: string, updates: { name?: string, is_trading_active?: boolean } }) => postUsCapitalGroupUpdate(key, groupId, updates),
            {
                pending: (state) => { state.usGroupOp.state = "pending"; },
                fulfilled: (state) => { state.usGroupOp.state = "fulfilled"; },
                rejected: (state) => { state.usGroupOp.state = "rejected"; },
            }
        ),
        reqPostUsCapitalGroupDelete: create.asyncThunk(
            async ({ key, groupId }: { key?: string, groupId: string }) => postUsCapitalGroupDelete(key, groupId),
            {
                pending: (state) => { state.usGroupOp.state = "pending"; },
                fulfilled: (state) => { state.usGroupOp.state = "fulfilled"; },
                rejected: (state) => { state.usGroupOp.state = "rejected"; },
            }
        ),
        reqPostUsCapitalStockGroup: create.asyncThunk(
            async ({ key, ticker, groupId }: { key?: string, ticker: string, groupId: string | null }) => postUsCapitalStockGroup(key, ticker, groupId),
            {
                pending: (state) => { state.usGroupOp.state = "pending"; },
                fulfilled: (state) => { state.usGroupOp.state = "fulfilled"; },
                rejected: (state) => { state.usGroupOp.state = "rejected"; },
            }
        ),

        // ── 계좌별 트레이딩 조건 (quant_rule) ──
        reqGetKrQuantRule: create.asyncThunk(
            async (key?: string) => getKrQuantRule(key),
            {
                pending: (state) => { state.krQuantRule.state = "pending"; },
                fulfilled: (state, action) => {
                    const p = action.payload ?? {};
                    state.krQuantRule = {
                        ...state.krQuantRule,
                        state: "fulfilled",
                        has_account: !!p.has_account,
                        is_override: !!p.is_override,
                        rule: p.rule ?? {},
                        default: p.default ?? {},
                        desc: p.desc ?? {},
                    };
                },
                rejected: (state) => { state.krQuantRule.state = "rejected"; },
            }
        ),
        reqPostKrQuantRule: create.asyncThunk(
            async ({ key, rule }: { key?: string, rule: QuantRule }) => postKrQuantRule(key, rule),
            {
                pending: (state) => { state.krQuantRule.saveState = "pending"; },
                fulfilled: (state, action) => {
                    const p = action.payload ?? {};
                    state.krQuantRule.saveState = p.success === false ? "rejected" : "fulfilled";
                    if (p.rule) state.krQuantRule.rule = p.rule;
                    if (p.is_override != null) state.krQuantRule.is_override = !!p.is_override;
                },
                rejected: (state) => { state.krQuantRule.saveState = "rejected"; },
            }
        ),
        reqGetUsQuantRule: create.asyncThunk(
            async (key?: string) => getUsQuantRule(key),
            {
                pending: (state) => { state.usQuantRule.state = "pending"; },
                fulfilled: (state, action) => {
                    const p = action.payload ?? {};
                    state.usQuantRule = {
                        ...state.usQuantRule,
                        state: "fulfilled",
                        has_account: !!p.has_account,
                        is_override: !!p.is_override,
                        rule: p.rule ?? {},
                        default: p.default ?? {},
                        desc: p.desc ?? {},
                    };
                },
                rejected: (state) => { state.usQuantRule.state = "rejected"; },
            }
        ),
        reqPostUsQuantRule: create.asyncThunk(
            async ({ key, rule }: { key?: string, rule: QuantRule }) => postUsQuantRule(key, rule),
            {
                pending: (state) => { state.usQuantRule.saveState = "pending"; },
                fulfilled: (state, action) => {
                    const p = action.payload ?? {};
                    state.usQuantRule.saveState = p.success === false ? "rejected" : "fulfilled";
                    if (p.rule) state.usQuantRule.rule = p.rule;
                    if (p.is_override != null) state.usQuantRule.is_override = !!p.is_override;
                },
                rejected: (state) => { state.usQuantRule.saveState = "rejected"; },
            }
        ),
    }),
    selectors: {
        selectKrCapital: (state) => state.krCapital,
        selectKrCapitalTokenPlusAll: (state) => state.krCapitalTokenPlusAll,
        selectKrCapitalTokenPlusOne: (state) => state.krCapitalTokenPlusOne,
        selectKrCapitalTokenMinusAll: (state) => state.krCapitalTokenMinusAll,
        selectKrCapitalTokenMinusOne: (state) => state.krCapitalTokenMinusOne,
        selectUsCapital: (state) => state.usCapital,
        selectUsCapitalTokenPlusAll: (state) => state.usCapitalTokenPlusAll,
        selectUsCapitalTokenPlusOne: (state) => state.usCapitalTokenPlusOne,
        selectUsCapitalTokenMinusAll: (state) => state.usCapitalTokenMinusAll,
        selectUsCapitalTokenMinusOne: (state) => state.usCapitalTokenMinusOne,
        selectKrGroupOp: (state) => state.krGroupOp,
        selectUsGroupOp: (state) => state.usGroupOp,
        selectKrQuantRule: (state) => state.krQuantRule,
        selectUsQuantRule: (state) => state.usQuantRule,
    }
});

export const { reqGetKrCapital, reqPostKrCapitalTokenPlusAll, reqPostKrCapitalTokenPlusOne, reqPostKrCapitalTokenMinusAll, reqPostKrCapitalTokenMinusOne } = capitalSlice.actions;
export const { selectKrCapital, selectKrCapitalTokenPlusAll, selectKrCapitalTokenPlusOne, selectKrCapitalTokenMinusAll, selectKrCapitalTokenMinusOne } = capitalSlice.selectors;
export const { reqPostKrCapitalGroupCreate, reqPostKrCapitalGroupUpdate, reqPostKrCapitalGroupDelete, reqPostKrCapitalStockGroup, reqPostKrCapitalStocksGroup } = capitalSlice.actions;
export const { reqPostUsCapitalGroupCreate, reqPostUsCapitalGroupUpdate, reqPostUsCapitalGroupDelete, reqPostUsCapitalStockGroup, reqPostUsCapitalStocksGroup } = capitalSlice.actions;
export const { selectKrGroupOp, selectUsGroupOp } = capitalSlice.selectors;
export const { reqGetKrQuantRule, reqPostKrQuantRule, reqGetUsQuantRule, reqPostUsQuantRule } = capitalSlice.actions;
export const { selectKrQuantRule, selectUsQuantRule } = capitalSlice.selectors;
export const { reqGetUsCapital, reqPostUsCapitalTokenPlusAll, reqPostUsCapitalTokenPlusOne, reqPostUsCapitalTokenMinusAll, reqPostUsCapitalTokenMinusOne } = capitalSlice.actions;
export const { selectUsCapital, selectUsCapitalTokenPlusAll, selectUsCapitalTokenPlusOne, selectUsCapitalTokenMinusAll, selectUsCapitalTokenMinusOne } = capitalSlice.selectors;
