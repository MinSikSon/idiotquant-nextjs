import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { registerCookie } from "@/components/util";
import { getOverseasStockTradingInquireBalance, getQuotationsPriceDetail, getQuotationsSearchInfo } from "./koreaInvestmentUsMarketAPI";
import { KoreaInvestmentToken } from "../koreaInvestment/koreaInvestmentSlice";

interface KoreaInvestmentOverseasBalanceOutput1 {
    cano: string;
    acnt_prdt_cd: string;
    prdt_type_cd: string;
    ovrs_pdno: string;
    ovrs_item_name: string;
    frcr_evlu_pfls_amt: string;
    evlu_pfls_rt: string;
    pchs_avg_pric: string;
    ovrs_cblc_qty: string;
    ord_psbl_qty: string;
    frcr_pchs_amt1: string;
    ovrs_stck_evlu_amt: string;
    now_pric2: string;
    tr_crcy_cd: string;
    ovrs_excg_cd: string;
    loan_type_cd: string;
    loan_dt: string;
    expd_dt: string;
}

interface KoreaInvestmentOverseasBalanceOutput2 {
    frcr_pchs_amt1: string;
    ovrs_rlzt_pfls_amt: string;
    ovrs_tot_pfls: string;
    rlzt_erng_rt: string;
    tot_evlu_pfls_amt: string;
    tot_pftrt: string;
    frcr_buy_amt_smtl1: string;
    ovrs_rlzt_pfls_amt2: string;
    frcr_buy_amt_smtl2: string;
}

export interface KoreaInvestmentOverseasBalance {
    state: "init" | "req" | "pending" | "fulfilled" | "rejected";
    ctx_area_fk200: string;
    ctx_area_nk200: string;
    output1: KoreaInvestmentOverseasBalanceOutput1[];
    output2: KoreaInvestmentOverseasBalanceOutput2;
    rt_cd: string;
    msg_cd: string;
    msg1: string;
}

interface KoreaInvestmentUsMaretType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
    searchInfo: any;
    priceDetail: any;
    balance: KoreaInvestmentOverseasBalance;
}
const initialState: KoreaInvestmentUsMaretType = {
    state: "init",
    searchInfo: {},
    priceDetail: {},
    balance: {
        state: "init",
        ctx_area_fk200: "",
        ctx_area_nk200: "",
        output1: [],
        output2: {
            frcr_pchs_amt1: "",
            ovrs_rlzt_pfls_amt: "",
            ovrs_tot_pfls: "",
            rlzt_erng_rt: "",
            tot_evlu_pfls_amt: "",
            tot_pftrt: "",
            frcr_buy_amt_smtl1: "",
            ovrs_rlzt_pfls_amt2: "",
            frcr_buy_amt_smtl2: "",
        },
        rt_cd: "",
        msg_cd: "",
        msg1: "",
    }
}
export const koreaInvestmentUsMarketSlice = createAppSlice({
    name: "koreaInvestmentUsMarket",
    initialState,
    reducers: (create) => ({
        reqGetOverseasStockTradingInquireBalance: create.asyncThunk(
            async ({ koreaInvestmentToken }: { koreaInvestmentToken: KoreaInvestmentToken }) => {
                return await getOverseasStockTradingInquireBalance(koreaInvestmentToken);
            },
            {
                pending: (state) => {
                    console.log(`[reqGetOverseasStockTradingInquireBalance] pending`);
                    state.balance.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetOverseasStockTradingInquireBalance] fulfilled`, `action.payload`, action.payload);
                    state.balance = { ...action.payload, state: "fulfilled" };
                },
                rejected: (state) => {
                    console.log(`[reqGetOverseasStockTradingInquireBalance] rejected`);
                    state.balance.state = "rejected";
                },
            }
        ),
        reqGetQuotationsSearchInfo: create.asyncThunk(
            async ({ koreaInvestmentToken, PDNO }: { koreaInvestmentToken: KoreaInvestmentToken, PDNO: string }) => {
                return await getQuotationsSearchInfo(koreaInvestmentToken, PDNO);
            },
            {
                pending: (state) => {
                    console.log(`[reqGetQuotationsSearchInfo] pending`);
                    state.state = "pending";
                    // state.koreaInvestmentApproval.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetQuotationsSearchInfo] fulfilled`, `action.payload`, action.payload);
                    const json = action.payload;
                    state.searchInfo = json;
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqGetQuotationsSearchInfo] rejected`);
                    state.state = "rejected";
                },
            }
        ),
        reqGetQuotationsPriceDetail: create.asyncThunk(
            async ({ koreaInvestmentToken, PDNO }: { koreaInvestmentToken: KoreaInvestmentToken, PDNO: string }) => {
                return await getQuotationsPriceDetail(koreaInvestmentToken, PDNO);
            },
            {
                pending: (state) => {
                    console.log(`[reqGetQuotationsPriceDetail] pending`);
                    state.state = "pending";
                    // state.koreaInvestmentApproval.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetQuotationsPriceDetail] fulfilled`, `action.payload`, action.payload);
                    const json = action.payload;
                    state.priceDetail = json;
                    state.state = "fulfilled";
                },
                rejected: (state) => {
                    console.log(`[reqGetQuotationsPriceDetail] rejected`);
                    state.state = "rejected";
                },
            }
        ),
    }),

    selectors: {
        // getKoreaInvestmentBalanceSheet: (state) => state.koreaInvestmentBalanceSheet,
        getKoreaInvestmentUsMaretSearchInfo: (state) => state.searchInfo,
        getKoreaInvestmentUsMaretPriceDetail: (state) => state.priceDetail,
        getKoreaInvestmentUsMaretBalance: (state) => state.balance,


    }
});

export const { reqGetOverseasStockTradingInquireBalance } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretBalance } = koreaInvestmentUsMarketSlice.selectors;

export const { reqGetQuotationsSearchInfo } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretSearchInfo } = koreaInvestmentUsMarketSlice.selectors;

export const { reqGetQuotationsPriceDetail } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretPriceDetail } = koreaInvestmentUsMarketSlice.selectors;
// export const { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqPostOrderCash, reqGetInquirePrice, reqGetInquireDailyItemChartPrice } = koreaInvestmentSlice.actions;
// export const { setKoreaInvestmentToken } = koreaInvestmentSlice.actions;
// export const { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance, getKoreaInvestmentInquirePrice, getKoreaInvestmentInquireDailyItemChartPrice } = koreaInvestmentSlice.selectors;

// export const { reqGetBalanceSheet } = koreaInvestmentSlice.actions;
// export const { getKoreaInvestmentBalanceSheet } = koreaInvestmentSlice.selectors;
