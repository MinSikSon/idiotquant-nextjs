import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getInquireBalanceApi, postTokenApi, postApprovalKeyApi } from "./koreaInvestmentAPI";

export interface KoreaInvestmentApproval {
    state: "init" | "req" | "pending" | "fulfilled";
    approval_key: string;
}
export interface KoreaInvestmentToken {
    state: "init" | "req" | "pending" | "fulfilled";
    // NOTE: 분당 1회 발급 가능
    access_token: string;
    access_token_token_expired: string;
    token_type: string;
    expires_in: number;
    // {
    //     "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ0b2tlbiIsImF1ZCI6IjJkOGQxMWIxLTMxYjItNDk0MC1hOTYxLTRlZDE5NGIwNjlkZSIsInByZHRfY2QiOiIiLCJpc3MiOiJ1bm9ndyIsImV4cCI6MTczODkwNjc1MCwiaWF0IjoxNzM4ODIwMzUwLCJqdGkiOiJQUzc3VU1LMHNmNnp2ZURzMzVtQzJlaVZEOVAzcHZzR21ybHgifQ.Bb3NAHnOC6xQ-Opejm9qLbcHmlr8b3fdVni38Y1GyHwZSyqwZRAPfew26bAeh5OEqWK6tsfVKvZE6iUq3yw4Qg",
    //         "access_token_token_expired": "2025-02-07 14:39:10",
    //             "token_type": "Bearer",
    //                 "expires_in": 86400
    // }
}

interface KoreaInvestmentBalanceStockInfo {
    bfdy_buy_qty: string;
    bfdy_cprs_icdc: string;
    bfdy_sll_qty: string;
    evlu_amt: string;
    evlu_erng_rt: string;
    evlu_pfls_amt: string;
    evlu_pfls_rt: string;
    expd_dt: string;
    fltt_rt: string;
    grta_rt_name: string;
    hldg_qty: string;
    item_mgna_rt_name: string;
    loan_amt: string;
    loan_dt: string;
    ord_psbl_qty: string;
    pchs_amt: string;
    pchs_avg_pric: string;
    pdno: string;
    prdt_name: string;
    prpr: string;
    sbst_pric: string;
    stck_loan_unpr: string;
    stln_slng_chgs: string;
    thdt_buyqty: string;
    thdt_sll_qty: string;
    trad_dvsn_name: string;
}
interface KoreaInvestmentBalanceOutput2 {
    asst_icdc_amt: string;
    asst_icdc_erng_rt: string;
    bfdy_buy_amt: string;
    bfdy_sll_amt: string;
    bfdy_tlex_amt: string;
    bfdy_tot_asst_evlu_amt: string;
    cma_evlu_amt: string;
    d2_auto_rdpt_amt: string;
    dnca_tot_amt: string;
    evlu_amt_smtl_amt: string;
    evlu_pfls_smtl_amt: string;
    fncg_gld_auto_rdpt_yn: string;
    nass_amt: string;
    nxdy_auto_rdpt_amt: string;
    nxdy_excc_amt: string;
    pchs_amt_smtl_amt: string;
    prvs_rcdl_excc_amt: string;
    scts_evlu_amt: string;
    thdt_buy_amt: string;
    thdt_sll_amt: string;
    thdt_tlex_amt: string;
    tot_evlu_amt: string;
    tot_loan_amt: string;
    tot_stln_slng_chgs: string;
}
export interface KoreaInvestmentBalance {
    state: "init" | "req" | "pending" | "fulfilled";
    ctx_area_fk100: string;
    ctx_area_nk100: string;
    msg1: string;
    msg_cd: string;
    output1: KoreaInvestmentBalanceStockInfo[];
    output2: KoreaInvestmentBalanceOutput2[];
    rt_cd: string;
}
interface KoreaInvestmentInfo {
    state: "init"
    | "get-rejected"
    | "loading" | "loaded" | "rejected"
    | "approval"
    | "token"
    | "inquire-balance"
    ;
    id: string;
    nickName: string;
    koreaInvestmentApproval: KoreaInvestmentApproval;
    koreaInvestmentToken: KoreaInvestmentToken;
    koreaInvestmentBalance: KoreaInvestmentBalance;
}
const initialState: KoreaInvestmentInfo = {
    state: "init",
    id: "",
    nickName: "",
    koreaInvestmentApproval: {
        state: "init",
        approval_key: ""
    },
    koreaInvestmentToken: {
        state: "init",
        access_token: "",
        access_token_token_expired: "",
        token_type: "",
        expires_in: 0
    },
    koreaInvestmentBalance: {
        state: "init",
        ctx_area_fk100: "",
        ctx_area_nk100: "",
        msg1: "",
        msg_cd: "",
        output1: [],
        output2: [],
        rt_cd: ""
    }
}
export const koreaInvestmentSlice = createAppSlice({
    name: "koreaInvestment",
    initialState,
    reducers: (create) => ({
        reqPostApprovalKey: create.asyncThunk(
            async () => {
                const res = await postApprovalKeyApi();
                if (null == res) {
                    return;
                }
                return res;
            },
            {
                pending: (state) => {
                    console.log(`[reqPostApprovalKey] pending`);
                    state.koreaInvestmentApproval.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostApprovalKey] fulfilled`);
                    // console.log(`[reqPostApprovalKey] action.payload`, action.payload);
                    const json = action.payload;
                    // console.log(`json["approval_key"]`, json["approval_key"]);
                    state.koreaInvestmentApproval.approval_key = json["approval_key"];
                    state.koreaInvestmentApproval.state = "fulfilled";
                    state.state = "approval";
                },
                rejected: (state) => {
                    console.log(`[reqPostApprovalKey] get-rejected 2`);
                },
            }
        ),
        setKoreaInvestmentToken: create.reducer((state, action: PayloadAction<KoreaInvestmentToken>) => {
            // console.log(`[setKoreaInvestmentToken] action.payload`, action.payload);
            const json = action.payload;
            state.koreaInvestmentToken.state = "fulfilled";
            state.koreaInvestmentToken.access_token = json["access_token"];
            state.koreaInvestmentToken.access_token_token_expired = json["access_token_token_expired"];
            state.koreaInvestmentToken.token_type = json["token_type"];
            state.koreaInvestmentToken.expires_in = json["expires_in"];

            localStorage.setItem('koreaInvestmentToken', JSON.stringify(json));
        }),
        reqPostToken: create.asyncThunk(
            async () => {
                return await postTokenApi();
            },
            {
                pending: (state) => {
                    console.log(`[reqPostToken] pending`);
                    state.koreaInvestmentToken.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostToken] action.payload`, action.payload);
                    const json = action.payload;
                    console.log(`json["error_description"]`, !!!json["error_description"], json["error_description"]);
                    if (!!!json["error_description"]) {
                        state.koreaInvestmentToken.state = "fulfilled";
                        state.koreaInvestmentToken.access_token = json["access_token"];
                        state.koreaInvestmentToken.access_token_token_expired = json["access_token_token_expired"];
                        state.koreaInvestmentToken.token_type = json["token_type"];
                        state.koreaInvestmentToken.expires_in = json["expires_in"];

                        localStorage.setItem('koreaInvestmentToken', JSON.stringify(json));

                        state.state = "token";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqPostToken] get-rejected 2`);
                },
            }
        ),
        reqGetInquireBalance: create.asyncThunk(
            async (koreaInvestmentToken: KoreaInvestmentToken) => {
                return await getInquireBalanceApi(koreaInvestmentToken);
            },
            {
                pending: (state) => {
                    console.log(`[getInquireBalance] pending`);
                    state.koreaInvestmentBalance.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[getInquireBalance] fulfilled`);
                    console.log(`[getInquireBalance] action.payload`, typeof action.payload, action.payload);
                    console.log(`[getInquireBalance] action.payload["output1"]`, action.payload["output1"]);
                    if (undefined != action.payload["output1"]) {
                        const newKoreaInvestBalance: KoreaInvestmentBalance = action.payload;
                        // console.log(`[getInquireBalance] newKoreaInvestBalance`, typeof newKoreaInvestBalance, newKoreaInvestBalance);
                        state.koreaInvestmentBalance.state = "fulfilled";
                        state.koreaInvestmentBalance = newKoreaInvestBalance;
                        state.state = "inquire-balance";
                    }
                },
                rejected: (state) => {
                    console.log(`[getInquireBalance] get-rejected 2`);
                },
            }
        ),
    }),
    selectors: {
        getKoreaInvestmentApproval: (state) => state.koreaInvestmentApproval,
        getKoreaInvestmentToken: (state) => state.koreaInvestmentToken,
        getKoreaInvestmentBalance: (state) => state.koreaInvestmentBalance,
    }
});

export const { reqPostApprovalKey, reqPostToken, reqGetInquireBalance } = koreaInvestmentSlice.actions;
export const { setKoreaInvestmentToken } = koreaInvestmentSlice.actions;
export const { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance } = koreaInvestmentSlice.selectors;
