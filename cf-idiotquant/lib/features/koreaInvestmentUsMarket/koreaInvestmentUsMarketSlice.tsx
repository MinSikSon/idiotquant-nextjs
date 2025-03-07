import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { registerCookie } from "@/components/util";
import { getOverseasStockTradingInquireBalance, getOverseasStockTradingInquirePresentBalance, getQuotationsPriceDetail, getQuotationsSearchInfo, postOrderUs } from "./koreaInvestmentUsMarketAPI";
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

interface KoreaInvestmentOverseasPresentBalanceOutput1 {
    prdt_name: string;
    cblc_qty13: string;
    thdt_buy_ccld_qty1: string;
    thdt_sll_ccld_qty1: string;
    ccld_qty_smtl1: string;
    ord_psbl_qty1: string;
    frcr_pchs_amt: string;
    frcr_evlu_amt2: string;
    evlu_pfls_amt2: string;
    evlu_pfls_rt1: string;
    pdno: string;
    bass_exrt: string;
    buy_crcy_cd: string;
    ovrs_now_pric1: string;
    avg_unpr3: string;
    tr_mket_name: string;
    natn_kor_name: string;
    pchs_rmnd_wcrc_amt: string;
    thdt_buy_ccld_frcr_amt: string;
    thdt_sll_ccld_frcr_amt: string;
    unit_amt: string;
    std_pdno: string;
    prdt_type_cd: string;
    scts_dvsn_name: string;
    loan_rmnd: string;
    loan_dt: string;
    loan_expd_dt: string;
    ovrs_excg_cd: string;
    item_lnkg_excg_cd: string;
    prdt_dvsn: string;
}
interface KoreaInvestmentOverseasPresentBalanceOutput2 {
    crcy_cd: string;
    crcy_cd_name: string;
    frcr_buy_amt_smtl: string;
    frcr_sll_amt_smtl: string;
    frcr_dncl_amt_2: string;
    frst_bltn_exrt: string;
    frcr_buy_mgn_amt: string;
    frcr_etc_mgna: string;
    frcr_drwg_psbl_amt_1: string;
    frcr_evlu_amt2: string;
    acpl_cstd_crcy_yn: string;
    nxdy_frcr_drwg_psbl_amt: string;
}
interface KoreaInvestmentOverseasPresentBalanceOutput3 {
    pchs_amt_smtl: string;
    evlu_amt_smtl: string;
    evlu_pfls_amt_smtl: string;
    dncl_amt: string;
    cma_evlu_amt: string;
    tot_dncl_amt: string;
    etc_mgna: string;
    wdrw_psbl_tot_amt: string;
    frcr_evlu_tota: string;
    evlu_erng_rt1: string;
    pchs_amt_smtl_amt: string;
    evlu_amt_smtl_amt: string;
    tot_evlu_pfls_amt: string;
    tot_asst_amt: string;
    buy_mgn_amt: string;
    mgna_tota: string;
    frcr_use_psbl_amt: string;
    ustl_sll_amt_smtl: string;
    ustl_buy_amt_smtl: string;
    tot_frcr_cblc_smtl: string;
    tot_loan_amt: string;
}
export interface KoreaInvestmentOverseasPresentBalance {
    state: "init" | "req" | "pending" | "fulfilled" | "rejected";
    output1: KoreaInvestmentOverseasPresentBalanceOutput1[];
    output2: KoreaInvestmentOverseasPresentBalanceOutput2[];
    output3: KoreaInvestmentOverseasPresentBalanceOutput3;
    rt_cd: string;
    msg_cd: string;
    msg1: string;
}

interface KoreaInvestmentUsOrderOutput {
    "KRX_FWDG_ORD_ORGNO": string;
    "ODNO": string;
    "ORD_TMD": string;
}
export interface KoreaInvestmentUsOrder {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
    "rt_cd": string;
    "msg_cd": string;
    "msg1": string;
    "output": KoreaInvestmentUsOrderOutput;
}
interface KoreaInvestmentUsMaretType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    | "order-cash"
    ;
    searchInfo: any;
    priceDetail: any;
    balance: KoreaInvestmentOverseasBalance;
    presentBalance: KoreaInvestmentOverseasPresentBalance;
    usOrder: KoreaInvestmentUsOrder;
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
    },
    presentBalance: {
        state: "init",
        output1: [],
        output2: [],
        output3: {
            pchs_amt_smtl: "",
            evlu_amt_smtl: "",
            evlu_pfls_amt_smtl: "",
            dncl_amt: "",
            cma_evlu_amt: "",
            tot_dncl_amt: "",
            etc_mgna: "",
            wdrw_psbl_tot_amt: "",
            frcr_evlu_tota: "",
            evlu_erng_rt1: "",
            pchs_amt_smtl_amt: "",
            evlu_amt_smtl_amt: "",
            tot_evlu_pfls_amt: "",
            tot_asst_amt: "",
            buy_mgn_amt: "",
            mgna_tota: "",
            frcr_use_psbl_amt: "",
            ustl_sll_amt_smtl: "",
            ustl_buy_amt_smtl: "",
            tot_frcr_cblc_smtl: "",
            tot_loan_amt: "",
        },
        rt_cd: "",
        msg_cd: "",
        msg1: "",
    },
    usOrder: {
        state: "init",
        rt_cd: "",
        msg_cd: "",
        msg1: "",
        output: {
            "KRX_FWDG_ORD_ORGNO": "",
            "ODNO": "",
            "ORD_TMD": "",
        },
    }
}
export const koreaInvestmentUsMarketSlice = createAppSlice({
    name: "koreaInvestmentUsMarket",
    initialState,
    reducers: (create) => ({
        reqPostOrderUs: create.asyncThunk(
            async ({ koreaInvestmentToken, PDNO, buyOrSell, excg_cd, price }: { koreaInvestmentToken: KoreaInvestmentToken, PDNO: string, buyOrSell: string, excg_cd: string, price: string }) => {
                return await postOrderUs(koreaInvestmentToken, PDNO, buyOrSell, excg_cd, price);
            },
            {
                pending: (state) => {
                    // console.log(`[reqPostOrderUs] pending`);
                    state.usOrder.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqPostOrderUs] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    // if (undefined != action.payload["output1"]) 
                    {
                        state.state = "order-cash";
                        state.usOrder = { ...state.usOrder, ...action.payload, state: "fulfilled" };
                    }
                },
                rejected: (state) => {
                    console.log(`[reqPostOrderUs] rejected`);
                    state.state = "rejected";
                },
            }
        ),
        reqGetOverseasStockTradingInquirePresentBalance: create.asyncThunk(
            async (koreaInvestmentToken: KoreaInvestmentToken) => {
                return await getOverseasStockTradingInquirePresentBalance(koreaInvestmentToken);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetOverseasStockTradingInquirePresentBalance] pending`);
                    state.presentBalance.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetOverseasStockTradingInquirePresentBalance] fulfilled`, `action.payload`, action.payload);
                    state.presentBalance = { ...action.payload, state: "fulfilled" };
                },
                rejected: (state) => {
                    console.log(`[reqGetOverseasStockTradingInquirePresentBalance] rejected`);
                    state.presentBalance.state = "rejected";
                },
            }
        ),
        reqGetOverseasStockTradingInquireBalance: create.asyncThunk(
            async (koreaInvestmentToken: KoreaInvestmentToken) => {
                return await getOverseasStockTradingInquireBalance(koreaInvestmentToken);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetOverseasStockTradingInquireBalance] pending`);
                    state.balance.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetOverseasStockTradingInquireBalance] fulfilled`, `action.payload`, action.payload);
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
                    // console.log(`[reqGetQuotationsSearchInfo] pending`);
                    state.state = "pending";
                    // state.koreaInvestmentApproval.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetQuotationsSearchInfo] fulfilled`, `action.payload`, action.payload);
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
                    // console.log(`[reqGetQuotationsPriceDetail] pending`);
                    state.state = "pending";
                    // state.koreaInvestmentApproval.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetQuotationsPriceDetail] fulfilled`, `action.payload`, action.payload);
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
        getKoreaInvestmentUsMaretPresentBalance: (state) => state.presentBalance,

        getKoreaInvestmentUsOrder: (state) => state.usOrder,
    }
});

export const { reqPostOrderUs } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsOrder } = koreaInvestmentUsMarketSlice.selectors;

export const { reqGetOverseasStockTradingInquirePresentBalance } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretPresentBalance } = koreaInvestmentUsMarketSlice.selectors;

export const { reqGetOverseasStockTradingInquireBalance } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretBalance } = koreaInvestmentUsMarketSlice.selectors;

export const { reqGetQuotationsSearchInfo } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretSearchInfo } = koreaInvestmentUsMarketSlice.selectors;

export const { reqGetQuotationsPriceDetail } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretPriceDetail } = koreaInvestmentUsMarketSlice.selectors;
