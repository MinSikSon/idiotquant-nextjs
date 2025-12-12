import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getOverseasPriceQuotationsDailyPrice, getOverseasStockTradingInquireBalance, getOverseasStockTradingInquireNccs, getOverseasStockTradingInquireCcnl, getOverseasStockTradingInquirePresentBalance, getQuotationsPriceDetail, getQuotationsSearchInfo, postOrderUs } from "./koreaInvestmentUsMarketAPI";

export interface KoreaInvestmentOverseasSearchInfoOutput {
    std_pdno: string;
    prdt_eng_name: string;
    natn_cd: string;
    natn_name: string;
    tr_mket_cd: string;
    tr_mket_name: string;
    ovrs_excg_cd: string;
    ovrs_excg_name: string;
    tr_crcy_cd: string;
    ovrs_papr: string;
    crcy_name: string;
    ovrs_stck_dvsn_cd: string;
    prdt_clsf_cd: string;
    prdt_clsf_name: string;
    sll_unit_qty: string;
    buy_unit_qty: string;
    tr_unit_amt: string;
    lstg_stck_num: string;
    lstg_dt: string;
    ovrs_stck_tr_stop_dvsn_cd: string;
    lstg_abol_item_yn: string;
    ovrs_stck_prdt_grp_no: string;
    lstg_yn: string;
    tax_levy_yn: string;
    ovrs_stck_erlm_rosn_cd: string;
    ovrs_stck_hist_rght_dvsn_cd: string;
    chng_bf_pdno: string;
    prdt_type_cd_2: string;
    ovrs_item_name: string;
    sedol_no: string;
    blbg_tckr_text: string;
    ovrs_stck_etf_risk_drtp_cd: string;
    etp_chas_erng_rt_dbnb: string;
    istt_usge_isin_cd: string;
    mint_svc_yn: string;
    mint_svc_yn_chng_dt: string;
    prdt_name: string;
    lei_cd: string;
    ovrs_stck_stop_rson_cd: string;
    lstg_abol_dt: string;
    mini_stk_tr_stat_dvsn_cd: string;
    mint_frst_svc_erlm_dt: string;
    mint_dcpt_trad_psbl_yn: string;
    mint_fnum_trad_psbl_yn: string;
    mint_cblc_cvsn_ipsb_yn: string;
    ptp_item_yn: string;
    ptp_item_trfx_exmt_yn: string;
    ptp_item_trfx_exmt_strt_dt: string;
    ptp_item_trfx_exmt_end_dt: string;
    dtm_tr_psbl_yn: string;
    sdrf_stop_ecls_yn: string;
    sdrf_stop_ecls_erlm_dt: string;
}
export interface KoreaInvestmentOverseasSearchInfo {
    state: "init" | "req" | "pending" | "fulfilled" | "rejected";
    output: KoreaInvestmentOverseasSearchInfoOutput
    rt_cd: string;
    msg_cd: string;
    msg1: string;
}

export interface KoreaInvestmentOverseasPriceDetailOutput {
    rsym: string;
    zdiv: string;
    curr: string;
    vnit: string;
    open: string;
    high: string;
    low: string;
    last: string;
    base: string;
    pvol: string;
    pamt: string;
    uplp: string;
    dnlp: string;
    h52p: string;
    h52d: string;
    l52p: string;
    l52d: string;
    perx: string;
    pbrx: string;
    epsx: string;
    bpsx: string;
    shar: string;
    mcap: string;
    tomv: string;
    t_xprc: string;
    t_xdif: string;
    t_xrat: string;
    p_xprc: string;
    p_xdif: string;
    p_xrat: string;
    t_rate: string;
    p_rate: string;
    t_xsgn: string;
    p_xsng: string;
    e_ordyn: string;
    e_hogau: string;
    e_icod: string;
    e_parp: string;
    tvol: string;
    tamt: string;
    etyp_nm: string;
}

export interface KoreaInvestmentOverseasPriceDetail {
    output: KoreaInvestmentOverseasPriceDetailOutput;
    rt_cd: string;
    msg_cd: string;
    msg1: string;
}

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

export interface KoreaInvestmentOverseasCcnlOutput {
    ord_dt: string;
    ord_gno_brno: string;
    odno: string;
    orgn_odno: string;
    sll_buy_dvsn_cd: string;
    sll_buy_dvsn_cd_name: string;
    rvse_cncl_dvsn: string;
    rvse_cncl_dvsn_name: string;
    pdno: string;
    prdt_name: string;
    ft_ord_qty: string;
    ft_ord_unpr3: string;
    ft_ccld_qty: string;
    ft_ccld_unpr3: string;
    ft_ccld_amt3: string;
    nccs_qty: string;
    prcs_stat_name: string;
    rjct_rson: string;
    rjct_rson_name: string;
    ord_tmd: string;
    tr_mket_name: string;
    tr_natn: string;
    tr_natn_name: string;
    ovrs_excg_cd: string;
    tr_crcy_cd: string;
    dmst_ord_dt: string;
    thco_ord_tmd: string;
    loan_type_cd: string;
    loan_dt: string;
    mdia_dvsn_name: string;
    usa_amk_exts_rqst_yn: string;
    splt_buy_attr_name: string;
}


export interface KoreaInvestmentOverseasCcnl {
    state: "init" | "req" | "pending" | "fulfilled" | "rejected";
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    ctx_area_fk200: string;
    ctx_area_nk200: string;
    output: KoreaInvestmentOverseasCcnlOutput[];
}

export interface KoreaInvestmentOverseasNccsOutput {
    ord_dt: string; // #주문일자
    ord_gno_brno: string; // #주문채번지점번호
    odno: string; // #주문번호
    orgn_odno: string; // #원주문번호
    pdno: string; // #상품번호
    prdt_name: string; // #상품명
    sll_buy_dvsn_cd: string; // #매도매수구분코드
    sll_buy_dvsn_cd_name: string; // #매도매수구분코드명
    rvse_cncl_dvsn_cd: string; // #정정취소구분코드
    rvse_cncl_dvsn_cd_name: string; // #정정취소구분코드명
    rjct_rson: string; // #거부사유
    rjct_rson_name: string; // #거부사유명
    ord_tmd: string; // #주문시각
    tr_mket_name: string; // #거래시장명
    tr_crcy_cd: string; // #거래통화코드
    natn_cd: string; // #국가코드
    natn_kor_name: string; // #국가한글명
    ft_ord_qty: string; // #FT주문수량
    ft_ccld_qty: string; // #FT체결수량
    nccs_qty: string; // #미체결수량
    ft_ord_unpr3: string; // #FT주문단가3
    ft_ccld_unpr3: string; // #FT체결단가3
    ft_ccld_amt3: string; // #FT체결금액3
    ovrs_excg_cd: string; // #해외거래소코드
    prcs_stat_name: string; // #처리상태명
    loan_type_cd: string; // #대출유형코드
    loan_dt: string; // #대출일자
    usa_amk_exts_rqst_yn: string; // #미국애프터마켓연장신청여부
    splt_buy_attr_name: string; // #분할매수속성명
}

export interface KoreaInvestmentOverseasNccs {
    state: "init" | "req" | "pending" | "fulfilled" | "rejected";
    rt_cd: string; // #성공 실패 여부
    msg_cd: string; // #응답코드
    msg1: string; // #응답메세지
    ctx_area_fk200: string; // #연속조회검색조건200
    ctx_area_nk200: string; // #연속조회키200
    output: KoreaInvestmentOverseasNccsOutput[]; // #응답상세
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

interface KoreaInvestmentOverseasPriceQuotationsInquireDailyChartPriceOutput1 {
    "acml_vol": string;
    "hts_kor_isnm": string;
    "ovrs_nmix_prdy_clpr": string;
    "ovrs_nmix_prdy_vrss": string;
    "ovrs_nmix_prpr": string;
    "ovrs_prod_hgpr": string;
    "ovrs_prod_lwpr": string;
    "ovrs_prod_oprc": string;
    "prdy_ctrt": string;
    "prdy_vrss_sign": string;
    "stck_shrn_iscd": string;
}
interface KoreaInvestmentOverseasPriceQuotationsInquireDailyChartPriceOutput2 {
    "acml_vol": string;
    "mod_yn": string;
    "ovrs_nmix_hgpr": string;
    "ovrs_nmix_lwpr": string;
    "ovrs_nmix_oprc": string;
    "ovrs_nmix_prpr": string;
    "stck_bsop_date": string;
}
export interface KoreaInvestmentOverseasPriceQuotationsInquireDailyChartPrice {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;
    "output1": KoreaInvestmentOverseasPriceQuotationsInquireDailyChartPriceOutput1;
    "output2": KoreaInvestmentOverseasPriceQuotationsInquireDailyChartPriceOutput2[];
}

interface KoreaInvestmentOverseasPriceQuotationsDailyPriceOutput1 {
    "rsym": string;
    "zdiv": string;
    "nrec": string;
}

interface KoreaInvestmentOverseasPriceQuotationsDailyPriceOutput2 {
    "xymd": string;
    "clos": string;
    "sign": string;
    "diff": string;
    "rate": string;
    "open": string;
    "high": string;
    "low": string;
    "tvol": string;
    "tamt": string;
    "pbid": string;
    "vbid": string;
    "pask": string;
    "vask": string;
}

export interface KoreaInvestmentOverseasPriceQuotationsDailyPrice {
    state: "init" | "pending" | "fulfilled" | "rejected";
    "output1": KoreaInvestmentOverseasPriceQuotationsDailyPriceOutput1;
    "output2": KoreaInvestmentOverseasPriceQuotationsDailyPriceOutput2[];
}
interface KoreaInvestmentUsMaretType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    | "order-cash"
    ;
    searchInfo: KoreaInvestmentOverseasSearchInfo;
    priceDetail: KoreaInvestmentOverseasPriceDetail;
    balance: KoreaInvestmentOverseasBalance;
    ccnl: KoreaInvestmentOverseasCcnl;
    nccs: KoreaInvestmentOverseasNccs;
    presentBalance: KoreaInvestmentOverseasPresentBalance;
    usOrder: KoreaInvestmentUsOrder;

    dailyChartPrice: KoreaInvestmentOverseasPriceQuotationsInquireDailyChartPrice; // not used

    dailyPrice: KoreaInvestmentOverseasPriceQuotationsDailyPrice;
}

const initialState: KoreaInvestmentUsMaretType = {
    state: "init",
    searchInfo: {
        state: "init",
        output: {
            std_pdno: "",
            prdt_eng_name: "",
            natn_cd: "",
            natn_name: "",
            tr_mket_cd: "",
            tr_mket_name: "",
            ovrs_excg_cd: "",
            ovrs_excg_name: "",
            tr_crcy_cd: "",
            ovrs_papr: "",
            crcy_name: "",
            ovrs_stck_dvsn_cd: "",
            prdt_clsf_cd: "",
            prdt_clsf_name: "",
            sll_unit_qty: "",
            buy_unit_qty: "",
            tr_unit_amt: "",
            lstg_stck_num: "",
            lstg_dt: "",
            ovrs_stck_tr_stop_dvsn_cd: "",
            lstg_abol_item_yn: "",
            ovrs_stck_prdt_grp_no: "",
            lstg_yn: "",
            tax_levy_yn: "",
            ovrs_stck_erlm_rosn_cd: "",
            ovrs_stck_hist_rght_dvsn_cd: "",
            chng_bf_pdno: "",
            prdt_type_cd_2: "",
            ovrs_item_name: "",
            sedol_no: "",
            blbg_tckr_text: "",
            ovrs_stck_etf_risk_drtp_cd: "",
            etp_chas_erng_rt_dbnb: "",
            istt_usge_isin_cd: "",
            mint_svc_yn: "",
            mint_svc_yn_chng_dt: "",
            prdt_name: "",
            lei_cd: "",
            ovrs_stck_stop_rson_cd: "",
            lstg_abol_dt: "",
            mini_stk_tr_stat_dvsn_cd: "",
            mint_frst_svc_erlm_dt: "",
            mint_dcpt_trad_psbl_yn: "",
            mint_fnum_trad_psbl_yn: "",
            mint_cblc_cvsn_ipsb_yn: "",
            ptp_item_yn: "",
            ptp_item_trfx_exmt_yn: "",
            ptp_item_trfx_exmt_strt_dt: "",
            ptp_item_trfx_exmt_end_dt: "",
            dtm_tr_psbl_yn: "",
            sdrf_stop_ecls_yn: "",
            sdrf_stop_ecls_erlm_dt: "",
        },
        rt_cd: "",
        msg_cd: "",
        msg1: "",
    },
    priceDetail: {
        output: {
            rsym: "",
            zdiv: "",
            curr: "",
            vnit: "",
            open: "",
            high: "",
            low: "",
            last: "",
            base: "",
            pvol: "",
            pamt: "",
            uplp: "",
            dnlp: "",
            h52p: "",
            h52d: "",
            l52p: "",
            l52d: "",
            perx: "",
            pbrx: "",
            epsx: "",
            bpsx: "",
            shar: "",
            mcap: "",
            tomv: "",
            t_xprc: "",
            t_xdif: "",
            t_xrat: "",
            p_xprc: "",
            p_xdif: "",
            p_xrat: "",
            t_rate: "",
            p_rate: "",
            t_xsgn: "",
            p_xsng: "",
            e_ordyn: "",
            e_hogau: "",
            e_icod: "",
            e_parp: "",
            tvol: "",
            tamt: "",
            etyp_nm: "",
        },
        rt_cd: "",
        msg_cd: "",
        msg1: "",
    },
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
    ccnl: {
        state: "init",
        rt_cd: "",
        msg_cd: "",
        msg1: "",
        ctx_area_fk200: "",
        ctx_area_nk200: "",
        output: []
    },
    nccs: {
        state: "init",
        rt_cd: "",
        msg_cd: "",
        msg1: "",
        ctx_area_fk200: "",
        ctx_area_nk200: "",
        output: [],
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
    },
    dailyChartPrice: {
        state: "init",
        output1: {
            "acml_vol": "",
            "hts_kor_isnm": "",
            "ovrs_nmix_prdy_clpr": "",
            "ovrs_nmix_prdy_vrss": "",
            "ovrs_nmix_prpr": "",
            "ovrs_prod_hgpr": "",
            "ovrs_prod_lwpr": "",
            "ovrs_prod_oprc": "",
            "prdy_ctrt": "",
            "prdy_vrss_sign": "",
            "stck_shrn_iscd": ""
        },
        output2: []
    },
    dailyPrice: {
        state: "init",
        output1: {
            "rsym": "",
            "zdiv": "",
            "nrec": "",
        },
        output2: []
    }
}
export const koreaInvestmentUsMarketSlice = createAppSlice({
    name: "koreaInvestmentUsMarket",
    initialState,
    reducers: (create) => ({
        reqGetOverseasPriceQuotationsDailyPrice: create.asyncThunk(
            async ({ PDNO, FID_INPUT_DATE_1 }: { PDNO: string, FID_INPUT_DATE_1: string }) => {
                return await getOverseasPriceQuotationsDailyPrice(PDNO, FID_INPUT_DATE_1);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetOverseasPriceQuotationsDailyPrice] pending`);
                    state.dailyPrice.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetOverseasPriceQuotationsDailyPrice] fulfilled`, `action.payload`, action.payload);
                    const json = action.payload;
                    state.dailyPrice = { ...json, state: "fulfilled" };
                },
                rejected: (state) => {
                    // console.log(`[reqGetOverseasPriceQuotationsDailyPrice] rejected`);
                    state.dailyPrice.state = "rejected";
                },
            }
        ),
        // reqGetOverseasPriceQuotationsInquireDailyChartPrice: create.asyncThunk(
        //     async ({ koreaInvestmentToken, PDNO, FID_INPUT_DATE_1, FID_INPUT_DATE_2 }: { koreaInvestmentToken: KoreaInvestmentToken, PDNO: string, FID_INPUT_DATE_1: string, FID_INPUT_DATE_2: string }) => {
        //         return await getOverseasPriceQuotationsInquireDailyChartPrice(koreaInvestmentToken, PDNO, FID_INPUT_DATE_1, FID_INPUT_DATE_2);
        //     },
        //     {
        //         pending: (state) => {
        //             // console.log(`[reqGetOverseasPriceQuotationsInquireDailyChartPrice] pending`);
        //             state.dailyChartPrice.state = "pending";
        //         },
        //         fulfilled: (state, action) => {
        //             console.log(`[reqGetOverseasPriceQuotationsInquireDailyChartPrice] fulfilled`, `action.payload`, action.payload);
        //             const json = action.payload;
        //             state.dailyChartPrice = { ...json, state: "fulfilled" };
        //         },
        //         rejected: (state) => {
        //             console.log(`[reqGetOverseasPriceQuotationsInquireDailyChartPrice] rejected`);
        //             state.dailyChartPrice.state = "rejected";
        //         },
        //     }
        // ),
        reqPostOrderUs: create.asyncThunk(
            async ({ PDNO, buyOrSell, excg_cd, price }: { PDNO: string, buyOrSell: string, excg_cd: string, price: string }) => {
                return await postOrderUs(PDNO, buyOrSell, excg_cd, price);
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
            async (key?: string) => {
                return await getOverseasStockTradingInquirePresentBalance(key);
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
            async (key?: string) => {
                return await getOverseasStockTradingInquireBalance(key);
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
        reqGetOverseasStockTradingInquireCcnl: create.asyncThunk(
            async (key?: string) => {
                return await getOverseasStockTradingInquireCcnl(key);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetOverseasStockTradingInquireCcnl] pending`);
                    state.ccnl.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetOverseasStockTradingInquireCcnl] fulfilled`, `action.payload`, action.payload);
                    state.ccnl = { ...action.payload, state: "fulfilled" };
                },
                rejected: (state) => {
                    // console.log(`[reqGetOverseasStockTradingInquireCcnl] rejected`);
                    state.ccnl.state = "rejected";
                },
            }
        ),
        reqGetOverseasStockTradingInquireNccs: create.asyncThunk(
            async (key?: string) => {
                return await getOverseasStockTradingInquireNccs(key);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetOverseasStockTradingInquireNccs] pending`);
                    state.nccs.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetOverseasStockTradingInquireNccs] fulfilled`, `action.payload`, action.payload);
                    state.nccs = { ...action.payload, state: "fulfilled" };
                },
                rejected: (state) => {
                    // console.log(`[reqGetOverseasStockTradingInquireNccs] rejected`);
                    state.nccs.state = "rejected";
                },
            }
        ),
        reqGetQuotationsSearchInfo: create.asyncThunk(
            async ({ PDNO }: { PDNO: string }) => {
                return await getQuotationsSearchInfo(PDNO);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetQuotationsSearchInfo] pending`);
                    state.searchInfo.state = "pending";
                    // state.koreaInvestmentApproval.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetQuotationsSearchInfo] fulfilled`, `action.payload`, action.payload);
                    const json = action.payload;
                    state.searchInfo = { ...json, state: "fulfilled" };
                },
                rejected: (state) => {
                    console.log(`[reqGetQuotationsSearchInfo] rejected`);
                    state.searchInfo.state = "rejected";
                },
            }
        ),
        reqGetQuotationsPriceDetail: create.asyncThunk(
            async ({ PDNO }: { PDNO: string }) => {
                return await getQuotationsPriceDetail(PDNO);
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

        getKoreaInvestmentUsMaretCcnl: (state) => state.ccnl,
        getKoreaInvestmentUsMaretNccs: (state) => state.nccs,

        getKoreaInvestmentUsMaretPresentBalance: (state) => state.presentBalance,

        getKoreaInvestmentUsOrder: (state) => state.usOrder,

        // getKoreaInvestmentUsMarketDailyChartPrice: (state) => state.dailyChartPrice,
        getKoreaInvestmentUsMarketDailyPrice: (state) => state.dailyPrice,
    }
});
export const { reqGetOverseasPriceQuotationsDailyPrice } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMarketDailyPrice } = koreaInvestmentUsMarketSlice.selectors;

// export const { reqGetOverseasPriceQuotationsInquireDailyChartPrice } = koreaInvestmentUsMarketSlice.actions;
// export const { getKoreaInvestmentUsMarketDailyChartPrice } = koreaInvestmentUsMarketSlice.selectors;

export const { reqPostOrderUs } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsOrder } = koreaInvestmentUsMarketSlice.selectors;

export const { reqGetOverseasStockTradingInquirePresentBalance } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretPresentBalance } = koreaInvestmentUsMarketSlice.selectors;

export const { reqGetOverseasStockTradingInquireBalance } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretBalance } = koreaInvestmentUsMarketSlice.selectors;

export const { reqGetOverseasStockTradingInquireCcnl } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretCcnl } = koreaInvestmentUsMarketSlice.selectors;

export const { reqGetOverseasStockTradingInquireNccs } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretNccs } = koreaInvestmentUsMarketSlice.selectors;

export const { reqGetQuotationsSearchInfo } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretSearchInfo } = koreaInvestmentUsMarketSlice.selectors;

export const { reqGetQuotationsPriceDetail } = koreaInvestmentUsMarketSlice.actions;
export const { getKoreaInvestmentUsMaretPriceDetail } = koreaInvestmentUsMarketSlice.selectors;
