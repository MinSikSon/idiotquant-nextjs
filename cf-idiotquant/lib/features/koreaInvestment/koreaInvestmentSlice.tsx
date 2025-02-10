import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getInquireBalanceApi, postTokenApi, postApprovalKeyApi, postOrderCash, getInquirePrice, getInquireDailyItemChartPrice, getBalanceSheet } from "./koreaInvestmentAPI";
import { registerCookie } from "@/components/util";

// rt_cd
const koreaInvestmentErrorCode = {
    "0": "정상",
    "1": "유효하지 않은 token",// {rt_cd: "1", msg_cd: "EGW00121", msg1: "유효하지 않은 token 입니다."}
}
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

interface KoreaInvestmentOrderCashOutput {
    KRX_FWDG_ORD_ORGNO: string;
    ODNO: string;
    ORD_TMD: string;
}
interface KoreaInvestmentOrderCash {
    state: "init" | "req" | "pending" | "fulfilled";
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    output: KoreaInvestmentOrderCashOutput;
}

interface KoreaInvestmentInquirePriceOutput {
    iscd_stat_cls_code: string;
    marg_rate: string;
    rprs_mrkt_kor_name: string;
    bstp_kor_isnm: string;
    temp_stop_yn: string;
    oprc_rang_cont_yn: string;
    clpr_rang_cont_yn: string;
    crdt_able_yn: string;
    grmn_rate_cls_code: string;
    elw_pblc_yn: string;
    stck_prpr: string;
    prdy_vrss: string;
    prdy_vrss_sign: string;
    prdy_ctrt: string;
    acml_tr_pbmn: string;
    acml_vol: string;
    prdy_vrss_vol_rate: string;
    stck_oprc: string;
    stck_hgpr: string;
    stck_lwpr: string;
    stck_mxpr: string;
    stck_llam: string;
    stck_sdpr: string;
    wghn_avrg_stck_prc: string;
    hts_frgn_ehrt: string;
    frgn_ntby_qty: string;
    pgtr_ntby_qty: string;
    pvt_scnd_dmrs_prc: string;
    pvt_frst_dmrs_prc: string;
    pvt_pont_val: string;
    pvt_frst_dmsp_prc: string;
    pvt_scnd_dmsp_prc: string;
    dmrs_val: string;
    dmsp_val: string;
    cpfn: string;
    rstc_wdth_prc: string;
    stck_fcam: string;
    stck_sspr: string;
    aspr_unit: string;
    hts_deal_qty_unit_val: string;
    lstn_stcn: string;
    hts_avls: string;
    per: string;
    pbr: string;
    stac_month: string;
    vol_tnrt: string;
    eps: string;
    bps: string;
    d250_hgpr: string;
    d250_hgpr_date: string;
    d250_hgpr_vrss_prpr_rate: string;
    d250_lwpr: string;
    d250_lwpr_date: string;
    d250_lwpr_vrss_prpr_rate: string;
    stck_dryy_hgpr: string;
    dryy_hgpr_vrss_prpr_rate: string;
    dryy_hgpr_date: string;
    stck_dryy_lwpr: string;
    dryy_lwpr_vrss_prpr_rate: string;
    dryy_lwpr_date: string;
    w52_hgpr: string;
    w52_hgpr_vrss_prpr_ctrt: string;
    w52_hgpr_date: string;
    w52_lwpr: string;
    w52_lwpr_vrss_prpr_ctrt: string;
    w52_lwpr_date: string;
    whol_loan_rmnd_rate: string;
    ssts_yn: string;
    stck_shrn_iscd: string;
    fcam_cnnm: string;
    cpfn_cnnm: string;
    frgn_hldn_qty: string;
    vi_cls_code: string;
    ovtm_vi_cls_code: string;
    last_ssts_cntg_qty: string;
    invt_caful_yn: string;
    mrkt_warn_cls_code: string;
    short_over_yn: string;
    sltr_yn: string;
}
export interface KoreaInvestmentInquirePrice {
    state: "init" | "req" | "pending" | "fulfilled";
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    output: KoreaInvestmentInquirePriceOutput;
}

interface KoreaInvestmentInqureDailyItemChartPriceOutput1 {
    acml_tr_pbmn: string;
    acml_vol: string;
    askp: string;
    bidp: string;
    cpfn: string;
    eps: string;
    hts_avls: string;
    hts_kor_isnm: string;
    itewhol_loan_rmnd_ratem_name: string;
    lstn_stcn: string;
    pbr: string;
    per: string;
    prdy_ctrt: string;
    prdy_vol: string;
    prdy_vrss: string;
    prdy_vrss_sign: string;
    prdy_vrss_vol: string;
    stck_fcam: string;
    stck_hgpr: string;
    stck_llam: string;
    stck_lwpr: string;
    stck_mxpr: string;
    stck_oprc: string;
    stck_prdy_clpr: string;
    stck_prdy_hgpr: string;
    stck_prdy_lwpr: string;
    stck_prdy_oprc: string;
    stck_prpr: string;
    stck_shrn_iscd: string;
    vol_tnrt: string;
}

interface KoreaInvestmentInqureDailyItemChartPriceOutput2 {
    acml_tr_pbmn: string;
    acml_vol: string;
    flng_cls_code: string;
    mod_yn: string;
    prdy_vrss: string;
    prdy_vrss_sign: string;
    prtt_rate: string;
    revl_issu_reas: string;
    stck_bsop_date: string;
    stck_clpr: string;
    stck_hgpr: string;
    stck_lwpr: string;
    stck_oprc: string;
}

export interface KoreaInvestmentInquireDailyItemChartPrice {
    state: "init" | "req" | "pending" | "fulfilled";
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    output1: KoreaInvestmentInqureDailyItemChartPriceOutput1;
    output2: KoreaInvestmentInqureDailyItemChartPriceOutput2[];
}

interface KoreaInvestmentBalanceSheetOutput {
    stac_yymm: string;
    cras: string;
    fxas: string;
    total_aset: string;
    flow_lblt: string;
    fix_lblt: string;
    total_lblt: string;
    cpfn: string;
    cfp_surp: string;
    prfi_surp: string;
    total_cptl: string;
}
export interface KoreaInvestmentBalanceSheet {
    state: "init" | "req" | "pending" | "fulfilled";
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    output: KoreaInvestmentBalanceSheetOutput[];
}

interface KoreaInvestmentInfo {
    state: "init"
    | "get-rejected"
    | "loading" | "loaded" | "rejected"
    | "approval"
    | "token"
    | "inquire-balance"
    | "order-cash"
    | "inquire-price"
    | "inquire-daily-itemchartprice"
    | "balance-sheet"
    ;
    id: string;
    nickName: string;
    koreaInvestmentApproval: KoreaInvestmentApproval;
    koreaInvestmentToken: KoreaInvestmentToken;
    koreaInvestmentBalance: KoreaInvestmentBalance;
    koreaInvestmentOrderCash: KoreaInvestmentOrderCash;
    koreaInvestmentInquirePrice: KoreaInvestmentInquirePrice;
    koreaInvestmentInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice;
    koreaInvestmentBalanceSheet: KoreaInvestmentBalanceSheet;
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
    },
    koreaInvestmentOrderCash: {
        state: "init",
        rt_cd: "",
        msg_cd: "",
        msg1: "",
        output: {
            KRX_FWDG_ORD_ORGNO: "",
            ODNO: "",
            ORD_TMD: ""
        }
    },
    koreaInvestmentInquirePrice: {
        state: "init",
        rt_cd: "",
        msg_cd: "",
        msg1: "",
        output:
        {
            iscd_stat_cls_code: "",
            marg_rate: "",
            rprs_mrkt_kor_name: "",
            bstp_kor_isnm: "",
            temp_stop_yn: "",
            oprc_rang_cont_yn: "",
            clpr_rang_cont_yn: "",
            crdt_able_yn: "",
            grmn_rate_cls_code: "",
            elw_pblc_yn: "",
            stck_prpr: "",
            prdy_vrss: "",
            prdy_vrss_sign: "",
            prdy_ctrt: "",
            acml_tr_pbmn: "",
            acml_vol: "",
            prdy_vrss_vol_rate: "",
            stck_oprc: "",
            stck_hgpr: "",
            stck_lwpr: "",
            stck_mxpr: "",
            stck_llam: "",
            stck_sdpr: "",
            wghn_avrg_stck_prc: "",
            hts_frgn_ehrt: "",
            frgn_ntby_qty: "",
            pgtr_ntby_qty: "",
            pvt_scnd_dmrs_prc: "",
            pvt_frst_dmrs_prc: "",
            pvt_pont_val: "",
            pvt_frst_dmsp_prc: "",
            pvt_scnd_dmsp_prc: "",
            dmrs_val: "",
            dmsp_val: "",
            cpfn: "",
            rstc_wdth_prc: "",
            stck_fcam: "",
            stck_sspr: "",
            aspr_unit: "",
            hts_deal_qty_unit_val: "",
            lstn_stcn: "",
            hts_avls: "",
            per: "",
            pbr: "",
            stac_month: "",
            vol_tnrt: "",
            eps: "",
            bps: "",
            d250_hgpr: "",
            d250_hgpr_date: "",
            d250_hgpr_vrss_prpr_rate: "",
            d250_lwpr: "",
            d250_lwpr_date: "",
            d250_lwpr_vrss_prpr_rate: "",
            stck_dryy_hgpr: "",
            dryy_hgpr_vrss_prpr_rate: "",
            dryy_hgpr_date: "",
            stck_dryy_lwpr: "",
            dryy_lwpr_vrss_prpr_rate: "",
            dryy_lwpr_date: "",
            w52_hgpr: "",
            w52_hgpr_vrss_prpr_ctrt: "",
            w52_hgpr_date: "",
            w52_lwpr: "",
            w52_lwpr_vrss_prpr_ctrt: "",
            w52_lwpr_date: "",
            whol_loan_rmnd_rate: "",
            ssts_yn: "",
            stck_shrn_iscd: "",
            fcam_cnnm: "",
            cpfn_cnnm: "",
            frgn_hldn_qty: "",
            vi_cls_code: "",
            ovtm_vi_cls_code: "",
            last_ssts_cntg_qty: "",
            invt_caful_yn: "",
            mrkt_warn_cls_code: "",
            short_over_yn: "",
            sltr_yn: "",
        }
    },
    koreaInvestmentInquireDailyItemChartPrice: {
        state: "init",
        rt_cd: "",
        msg_cd: "",
        msg1: "",
        output1: {
            acml_tr_pbmn: "",
            acml_vol: "",
            askp: "",
            bidp: "",
            cpfn: "",
            eps: "",
            hts_avls: "",
            hts_kor_isnm: "",
            itewhol_loan_rmnd_ratem_name: "",
            lstn_stcn: "",
            pbr: "",
            per: "",
            prdy_ctrt: "",
            prdy_vol: "",
            prdy_vrss: "",
            prdy_vrss_sign: "",
            prdy_vrss_vol: "",
            stck_fcam: "",
            stck_hgpr: "",
            stck_llam: "",
            stck_lwpr: "",
            stck_mxpr: "",
            stck_oprc: "",
            stck_prdy_clpr: "",
            stck_prdy_hgpr: "",
            stck_prdy_lwpr: "",
            stck_prdy_oprc: "",
            stck_prpr: "",
            stck_shrn_iscd: "",
            vol_tnrt: "",
        },
        output2: []
    },
    koreaInvestmentBalanceSheet: {
        state: "init",
        rt_cd: "",
        msg_cd: "",
        msg1: "",
        output: []
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
                    state.koreaInvestmentApproval = { approval_key: json["approval_key"], state: "fulfilled" };
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
            state.koreaInvestmentToken = {
                state: "fulfilled",
                access_token: json["access_token"],
                access_token_token_expired: json["access_token_token_expired"].replace(" ", "T"),
                token_type: json["token_type"],
                expires_in: json["expires_in"],
            };

            // sessionStorage.setItem('koreaInvestmentToken', JSON.stringify(json));
            registerCookie("koreaInvestmentToken", JSON.stringify(json));
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
                        state.koreaInvestmentToken = {
                            state: "fulfilled",
                            access_token: json["access_token"],
                            access_token_token_expired: json["access_token_token_expired"].replace(" ", "T"),
                            token_type: json["token_type"],
                            expires_in: json["expires_in"],
                        };
                        // sessionStorage.setItem('koreaInvestmentToken', JSON.stringify(json));
                        registerCookie("koreaInvestmentToken", JSON.stringify(json));

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
                    // console.log(`[getInquireBalance] action.payload["output1"]`, action.payload["output1"]);
                    if (undefined != action.payload["output1"]) {
                        const newKoreaInvestBalance: KoreaInvestmentBalance = action.payload;
                        // console.log(`[getInquireBalance] newKoreaInvestBalance`, typeof newKoreaInvestBalance, newKoreaInvestBalance);
                        state.koreaInvestmentBalance = { ...newKoreaInvestBalance, state: "fulfilled" };
                        state.state = "inquire-balance";
                    }
                },
                rejected: (state) => {
                    console.log(`[getInquireBalance] get-rejected 2`);
                },
            }
        ),
        reqPostOrderCash: create.asyncThunk(
            async ({ koreaInvestmentToken, PDNO, buyOrSell }: { koreaInvestmentToken: KoreaInvestmentToken, PDNO: string, buyOrSell: string }) => {
                return await postOrderCash(koreaInvestmentToken, PDNO, buyOrSell);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostOrderCash] pending`);
                    state.koreaInvestmentOrderCash.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostOrderCash] fulfilled`);
                    console.log(`[reqPostOrderCash] action.payload`, typeof action.payload, action.payload);
                    // console.log(`[reqPostOrderCash] action.payload["output1"]`, action.payload["output1"]);
                    if (undefined != action.payload["output1"]) {
                        const newKoreaInvestmentOrderCash: KoreaInvestmentOrderCash = action.payload;
                        // console.log(`[getInquireBalance] newKoreaInvestBalance`, typeof newKoreaInvestBalance, newKoreaInvestBalance);
                        state.koreaInvestmentOrderCash = { ...newKoreaInvestmentOrderCash, state: "fulfilled" };
                        state.state = "order-cash";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqPostOrderCash] get-rejected 2`);
                },
            }
        ),
        reqGetInquirePrice: create.asyncThunk(
            async ({ koreaInvestmentToken, PDNO }: { koreaInvestmentToken: KoreaInvestmentToken, PDNO: string }) => {
                return await getInquirePrice(koreaInvestmentToken, PDNO);
            },
            {
                pending: (state) => {
                    console.log(`[reqGetInquirePrice] pending`);
                    state.koreaInvestmentOrderCash.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetInquirePrice] fulfilled`);
                    console.log(`[reqGetInquirePrice] action.payload`, typeof action.payload, action.payload);
                    // console.log(`[reqGetInquirePrice] action.payload["output"]`, action.payload["output"]);
                    if (undefined != action.payload["output"]) {
                        const newKoreaInvestmentInquirePrice: KoreaInvestmentInquirePrice = action.payload;
                        // console.log(`[getInquireBalance] newKoreaInvestBalance`, typeof newKoreaInvestBalance, newKoreaInvestBalance);
                        // state.koreaInvestmentInquirePrice.rt_cd = newKoreaInvestmentInquirePrice.rt_cd;
                        // state.koreaInvestmentInquirePrice.msg_cd = newKoreaInvestmentInquirePrice.msg_cd;
                        // state.koreaInvestmentInquirePrice.msg1 = newKoreaInvestmentInquirePrice.msg1;
                        // state.koreaInvestmentInquirePrice.output = newKoreaInvestmentInquirePrice.output;
                        state.koreaInvestmentInquirePrice = { ...newKoreaInvestmentInquirePrice, state: "fulfilled" };
                        state.state = "inquire-price";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqPostOrderCash] get-rejected 2`);
                },
            }
        ),
        reqGetInquireDailyItemChartPrice: create.asyncThunk(
            async ({ koreaInvestmentToken, PDNO, FID_INPUT_DATE_1, FID_INPUT_DATE_2 }: { koreaInvestmentToken: KoreaInvestmentToken, PDNO: string, FID_INPUT_DATE_1: string, FID_INPUT_DATE_2: string }) => {
                return await getInquireDailyItemChartPrice(koreaInvestmentToken, PDNO, FID_INPUT_DATE_1, FID_INPUT_DATE_2);
            },
            {
                pending: (state) => {
                    console.log(`[reqGetInquireDailyItemChartPrice] pending`);
                    state.koreaInvestmentOrderCash.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetInquireDailyItemChartPrice] fulfilled`);
                    console.log(`[reqGetInquireDailyItemChartPrice] action.payload`, typeof action.payload, action.payload);
                    // console.log(`[reqGetInquireDailyItemChartPrice] action.payload["output1"]`, action.payload["output1"]);
                    // console.log(`[reqGetInquireDailyItemChartPrice] action.payload["output2"]`, action.payload["output2"]);
                    if (undefined != action.payload["output1"]) {
                        const newKoreaInvestmentInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice = action.payload;
                        // console.log(`[getInquireBalance] newKoreaInvestBalance`, typeof newKoreaInvestBalance, newKoreaInvestBalance);
                        // state.koreaInvestmentInquireDailyItemChartPrice.rt_cd = newKoreaInvestmentInquireDailyItemChartPrice.rt_cd;
                        // state.koreaInvestmentInquireDailyItemChartPrice.msg_cd = newKoreaInvestmentInquireDailyItemChartPrice.msg_cd;
                        // state.koreaInvestmentInquireDailyItemChartPrice.msg1 = newKoreaInvestmentInquireDailyItemChartPrice.msg1;
                        // state.koreaInvestmentInquireDailyItemChartPrice.output1 = newKoreaInvestmentInquireDailyItemChartPrice.output1;
                        // state.koreaInvestmentInquireDailyItemChartPrice.output2 = newKoreaInvestmentInquireDailyItemChartPrice.output2;
                        state.koreaInvestmentInquireDailyItemChartPrice = { ...newKoreaInvestmentInquireDailyItemChartPrice, state: "fulfilled" };
                        state.state = "inquire-daily-itemchartprice";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqGetInquireDailyItemChartPrice] get-rejected 2`);
                },
            }
        ),
        reqGetBalanceSheet: create.asyncThunk(
            async ({ koreaInvestmentToken, PDNO }: { koreaInvestmentToken: KoreaInvestmentToken, PDNO: string }) => {
                return await getBalanceSheet(koreaInvestmentToken, PDNO);
            },
            {
                pending: (state) => {
                    console.log(`[reqGetBalanceSheet] pending`);
                    state.koreaInvestmentBalanceSheet.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetBalanceSheet] fulfilled`);
                    console.log(`[reqGetBalanceSheet] action.payload`, typeof action.payload, action.payload);
                    console.log(`[reqGetBalanceSheet] action.payload["output"]`, action.payload["output"]);
                    if (undefined != action.payload["output"]) {
                        const newKoreaInvestmentBalanceSheet: KoreaInvestmentBalanceSheet = action.payload;
                        state.koreaInvestmentBalanceSheet = { ...newKoreaInvestmentBalanceSheet, state: "fulfilled" };
                        state.state = "balance-sheet";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqGet BalanceSheet] get-rejected 2`);
                },
            }
        ),
    }),
    selectors: {
        getKoreaInvestmentApproval: (state) => state.koreaInvestmentApproval,
        getKoreaInvestmentToken: (state) => state.koreaInvestmentToken,
        getKoreaInvestmentBalance: (state) => state.koreaInvestmentBalance,
        getKoreaInvestmentInquirePrice: (state) => state.koreaInvestmentInquirePrice,
        getKoreaInvestmentInquireDailyItemChartPrice: (state) => state.koreaInvestmentInquireDailyItemChartPrice,
        getKoreaInvestmentBalanceSheet: (state) => state.koreaInvestmentBalanceSheet,
    }
});

export const { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqPostOrderCash, reqGetInquirePrice, reqGetInquireDailyItemChartPrice } = koreaInvestmentSlice.actions;
export const { setKoreaInvestmentToken } = koreaInvestmentSlice.actions;
export const { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance, getKoreaInvestmentInquirePrice, getKoreaInvestmentInquireDailyItemChartPrice } = koreaInvestmentSlice.selectors;

export const { reqGetBalanceSheet } = koreaInvestmentSlice.actions;
export const { getKoreaInvestmentBalanceSheet } = koreaInvestmentSlice.selectors;
