import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { getInquireBalanceApi, postTokenApi, postApprovalKeyApi, postOrderCash, getInquirePrice, getInquireDailyItemChartPrice, getBalanceSheet, getIncomeStatement, getSearchStockInfo } from "./koreaInvestmentAPI";
import { registerCookie } from "@/components/util";

// rt_cd
const koreaInvestmentErrorCode = {
    "0": "정상",
    "1": "유효하지 않은 token",// {rt_cd: "1", msg_cd: "EGW00121", msg1: "유효하지 않은 token 입니다."}
}
export interface KoreaInvestmentApproval {
    state: "init" | "req" | "pending" | "fulfilled" | "rejected";
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
    state: "init" | "req" | "pending" | "fulfilled" | "rejected";
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
export interface KoreaInvestmentOrderCash {
    state: "init" | "req" | "pending" | "fulfilled";
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    output: KoreaInvestmentOrderCashOutput;
}
interface KoreaInvestmentSearchStockInfoOutput {
    pdno: string; //    #상품번호
    prdt_type_cd: string; //    #상품유형코드
    mket_id_cd: string; //    #시장ID코드
    scty_grp_id_cd: string; //    #증권그룹ID코드
    excg_dvsn_cd: string; //    #거래소구분코드
    setl_mmdd: string; //    #결산월일
    lstg_stqt: string; //    #상장주수
    lstg_cptl_amt: string; //    #상장자본금액
    cpta: string; //    #자본금
    papr: string; //    #액면가
    issu_pric: string; //    #발행가격
    kospi200_item_yn: string; //    #코스피200종목여부
    scts_mket_lstg_dt: string; //    #유가증권시장상장일자
    scts_mket_lstg_abol_dt: string; //    #유가증권시장상장폐지일자
    kosdaq_mket_lstg_dt: string; //    #코스닥시장상장일자
    kosdaq_mket_lstg_abol_dt: string; //    #코스닥시장상장폐지일자
    frbd_mket_lstg_dt: string; //    #프리보드시장상장일자
    frbd_mket_lstg_abol_dt: string; //    #프리보드시장상장폐지일자
    reits_kind_cd: string; //    #리츠종류코드
    etf_dvsn_cd: string; //    #ETF구분코드
    oilf_fund_yn: string; //    #유전펀드여부
    idx_bztp_lcls_cd: string; //    #지수업종대분류코드
    idx_bztp_mcls_cd: string; //    #지수업종중분류코드
    idx_bztp_scls_cd: string; //    #지수업종소분류코드
    stck_kind_cd: string; //    #주식종류코드
    mfnd_opng_dt: string; //    #뮤추얼펀드개시일자
    mfnd_end_dt: string; //    #뮤추얼펀드종료일자
    dpsi_erlm_cncl_dt: string; //    #예탁등록취소일자
    etf_cu_qty: string; //    #ETFCU수량
    prdt_name: string; //    #상품명
    prdt_name120: string; //    #상품명120
    prdt_abrv_name: string; //    #상품약어명
    std_pdno: string; //    #표준상품번호
    prdt_eng_name: string; //    #상품영문명
    prdt_eng_name120: string; //    #상품영문명120
    prdt_eng_abrv_name: string; //    #상품영문약어명
    dpsi_aptm_erlm_yn: string; //    #예탁지정등록여부
    etf_txtn_type_cd: string; //    #ETF과세유형코드
    etf_type_cd: string; //    #ETF유형코드
    lstg_abol_dt: string; //    #상장폐지일자
    nwst_odst_dvsn_cd: string; //    #신주구주구분코드
    sbst_pric: string; //    #대용가격
    thco_sbst_pric: string; //    #당사대용가격
    thco_sbst_pric_chng_dt: string; //    #당사대용가격변경일자
    tr_stop_yn: string; //    #거래정지여부
    admn_item_yn: string; //    #관리종목여부
    thdt_clpr: string; //    #당일종가
    bfdy_clpr: string; //    #전일종가
    clpr_chng_dt: string; //    #종가변경일자
    std_idst_clsf_cd: string; //    #표준산업분류코드
    std_idst_clsf_cd_name: string; //    #표준산업분류코드명
    idx_bztp_lcls_cd_name: string; //    #지수업종대분류코드명
    idx_bztp_mcls_cd_name: string; //    #지수업종중분류코드명
    idx_bztp_scls_cd_name: string; //    #지수업종소분류코드명
    ocr_no: string; //    #OCR번호
    crfd_item_yn: string; //    #크라우드펀딩종목여부
    elec_scty_yn: string; //    #전자증권여부
    issu_istt_cd: string; //    #발행기관코드
    etf_chas_erng_rt_dbnb: string; //    #ETF추적수익율배수
    etf_etn_ivst_heed_item_yn: string; //    #ETFETN투자유의종목여부
    stln_int_rt_dvsn_cd: string; //    #대주이자율구분코드
    frnr_psnl_lmt_rt: string; //    #외국인개인한도비율
    lstg_rqsr_issu_istt_cd: string; //    #상장신청인발행기관코드
    lstg_rqsr_item_cd: string; //    #상장신청인종목코드
    trst_istt_issu_istt_cd: string; //    #신탁기관발행기관코드
    cptt_trad_tr_psbl_yn: string; //    #NXT 거래종목여부
    nxt_tr_stop_yn: string; //    #NXT 거래정지여부
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

export interface KoreaInvestmentSearchStockInfo {
    state: "init" | "req" | "pending" | "fulfilled" | "rejected";
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    output: KoreaInvestmentSearchStockInfoOutput;
}
export interface KoreaInvestmentInquirePrice {
    state: "init" | "req" | "pending" | "fulfilled" | "rejected";
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

interface KoreaInvestmentIncomeStatementOutput {
    stac_yymm: string; //    #결산 년월
    sale_account: string; //    #매출액
    sale_cost: string; //    #매출 원가
    sale_totl_prfi: string; //    #매출 총 이익
    depr_cost: string; //    #감가상각비
    sell_mang: string; //    #판매 및 관리비
    bsop_prti: string; //    #영업 이익
    bsop_non_ernn: string; //    #영업 외 수익
    bsop_non_expn: string; //    #영업 외 비용
    op_prfi: string; //    #경상 이익
    spec_prfi: string; //    #특별 이익
    spec_loss: string; //    #특별 손실
    thtr_ntin: string; //    #당기순이익
}
export interface KoreaInvestmentIncomeStatement {
    state: "init" | "req" | "pending" | "fulfilled";
    rt_cd: string; //    #성공 실패 여부
    msg_cd: string; //    #응답코드
    msg1: string; //    #응답메세지
    output: KoreaInvestmentIncomeStatementOutput[];
}

interface KoreaInvestmentInfo {
    state: "init"
    | "fulfilled"
    | "get-rejected"
    | "loading" | "loaded" | "rejected"
    | "approval"
    | "token"
    | "inquire-balance"
    | "order-cash"
    | "inquire-price"
    | "inquire-daily-itemchartprice"
    | "balance-sheet"
    | "income-statement"
    ;
    id: string;
    nickName: string;
    koreaInvestmentApproval: KoreaInvestmentApproval;
    koreaInvestmentToken: KoreaInvestmentToken;
    koreaInvestmentBalance: KoreaInvestmentBalance;
    koreaInvestmentOrderCash: KoreaInvestmentOrderCash;
    koreaInvestmentSearchStockInfo: KoreaInvestmentSearchStockInfo;
    koreaInvestmentInquirePrice: KoreaInvestmentInquirePrice;
    koreaInvestmentInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice;
    koreaInvestmentBalanceSheet: KoreaInvestmentBalanceSheet;
    koreaInvestmentIncomeStatement: KoreaInvestmentIncomeStatement;
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
    koreaInvestmentSearchStockInfo: {
        state: "init",
        rt_cd: "",
        msg_cd: "",
        msg1: "",
        output: {
            pdno: "",
            prdt_type_cd: "",
            mket_id_cd: "",
            scty_grp_id_cd: "",
            excg_dvsn_cd: "",
            setl_mmdd: "",
            lstg_stqt: "",
            lstg_cptl_amt: "",
            cpta: "",
            papr: "",
            issu_pric: "",
            kospi200_item_yn: "",
            scts_mket_lstg_dt: "",
            scts_mket_lstg_abol_dt: "",
            kosdaq_mket_lstg_dt: "",
            kosdaq_mket_lstg_abol_dt: "",
            frbd_mket_lstg_dt: "",
            frbd_mket_lstg_abol_dt: "",
            reits_kind_cd: "",
            etf_dvsn_cd: "",
            oilf_fund_yn: "",
            idx_bztp_lcls_cd: "",
            idx_bztp_mcls_cd: "",
            idx_bztp_scls_cd: "",
            stck_kind_cd: "",
            mfnd_opng_dt: "",
            mfnd_end_dt: "",
            dpsi_erlm_cncl_dt: "",
            etf_cu_qty: "",
            prdt_name: "",
            prdt_name120: "",
            prdt_abrv_name: "",
            std_pdno: "",
            prdt_eng_name: "",
            prdt_eng_name120: "",
            prdt_eng_abrv_name: "",
            dpsi_aptm_erlm_yn: "",
            etf_txtn_type_cd: "",
            etf_type_cd: "",
            lstg_abol_dt: "",
            nwst_odst_dvsn_cd: "",
            sbst_pric: "",
            thco_sbst_pric: "",
            thco_sbst_pric_chng_dt: "",
            tr_stop_yn: "",
            admn_item_yn: "",
            thdt_clpr: "",
            bfdy_clpr: "",
            clpr_chng_dt: "",
            std_idst_clsf_cd: "",
            std_idst_clsf_cd_name: "",
            idx_bztp_lcls_cd_name: "",
            idx_bztp_mcls_cd_name: "",
            idx_bztp_scls_cd_name: "",
            ocr_no: "",
            crfd_item_yn: "",
            elec_scty_yn: "",
            issu_istt_cd: "",
            etf_chas_erng_rt_dbnb: "",
            etf_etn_ivst_heed_item_yn: "",
            stln_int_rt_dvsn_cd: "",
            frnr_psnl_lmt_rt: "",
            lstg_rqsr_issu_istt_cd: "",
            lstg_rqsr_item_cd: "",
            trst_istt_issu_istt_cd: "",
            cptt_trad_tr_psbl_yn: "",
            nxt_tr_stop_yn: ""
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
    },
    koreaInvestmentIncomeStatement: {
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
                    // console.log(`[reqPostApprovalKey] pending`);
                    state.koreaInvestmentApproval.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqPostApprovalKey] fulfilled`, `action.payload`, action.payload);
                    const json = action.payload;
                    state.koreaInvestmentApproval = { approval_key: json["approval_key"], state: "fulfilled" };
                    state.state = "approval";
                },
                rejected: (state) => {
                    console.log(`[reqPostApprovalKey] rejected`);
                    state.koreaInvestmentApproval.state = "rejected";
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

            registerCookie("koreaInvestmentToken", JSON.stringify(json));
        }),
        reqPostToken: create.asyncThunk(
            async () => {
                return await postTokenApi();
            },
            {
                pending: (state) => {
                    // console.log(`[reqPostToken] pending`);
                    state.koreaInvestmentToken.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqPostToken] fulfilled`, `action.payload`, action.payload);
                    const json = action.payload;
                    // console.log(`json["error_description"]`, !!!json["error_description"], json["error_description"]);
                    if (!!!json["error_description"]) {
                        state.koreaInvestmentToken = {
                            state: "fulfilled",
                            access_token: json["access_token"],
                            access_token_token_expired: json["access_token_token_expired"].replace(" ", "T"),
                            token_type: json["token_type"],
                            expires_in: json["expires_in"],
                        };
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
            async (key?: string) => {
                return await getInquireBalanceApi(key);
            },
            {
                pending: (state) => {
                    // console.log(`[getInquireBalance] pending`);
                    state.koreaInvestmentBalance.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[getInquireBalance] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    if (undefined != action.payload["output1"]) {
                        state.koreaInvestmentBalance = { ...state.koreaInvestmentBalance, ...action.payload, state: "fulfilled" };
                        state.state = "inquire-balance";
                    }
                },
                rejected: (state) => {
                    console.log(`[getInquireBalance] rejected`);
                    state.koreaInvestmentBalance.state = "rejected";
                },
            }
        ),
        reqPostOrderCash: create.asyncThunk(
            async ({ PDNO, buyOrSell, excg_cd, price }: { PDNO: string, buyOrSell: string, excg_cd: string, price: string }) => {
                return await postOrderCash(PDNO, buyOrSell);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostOrderCash] pending`);
                    state.koreaInvestmentOrderCash.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostOrderCash] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    // if (undefined != action.payload["output1"]) 
                    {
                        state.state = "order-cash";
                        state.koreaInvestmentOrderCash = { ...state.koreaInvestmentOrderCash, ...action.payload, state: "fulfilled" };
                    }
                },
                rejected: (state) => {
                    console.log(`[reqPostOrderCash] get-rejected 2`);
                    state.state = "get-rejected";
                },
            }
        ),
        reqGetSearchStockInfo: create.asyncThunk(
            async ({ PDNO }: { PDNO: string }) => {
                return await getSearchStockInfo(PDNO);
            },
            {
                pending: (state) => {
                    console.log(`[reqGetSearchStockInfo] pending`);
                    state.koreaInvestmentSearchStockInfo.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqGetSearchStockInfo] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    if (undefined != action.payload["output"]) {
                        state.koreaInvestmentSearchStockInfo = { ...state.koreaInvestmentSearchStockInfo, ...action.payload, state: "fulfilled" };
                        state.state = "inquire-price";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqGetSearchStockInfo] rejected`);
                    state.koreaInvestmentSearchStockInfo.state = "rejected";
                },
            }
        ),
        reqGetInquirePrice: create.asyncThunk(
            async ({ PDNO }: { PDNO: string }) => {
                return await getInquirePrice(PDNO);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetInquirePrice] pending`);
                    state.koreaInvestmentInquirePrice.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetInquirePrice] fulfilled`,`action.payload`, typeof action.payload, action.payload);
                    if (undefined != action.payload["output"]) {
                        state.koreaInvestmentInquirePrice = { ...state.koreaInvestmentInquirePrice, ...action.payload, state: "fulfilled" };
                        state.state = "inquire-price";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqGetInquirePrice] rejected`);
                    state.koreaInvestmentInquirePrice.state = "rejected";
                },
            }
        ),
        reqGetInquireDailyItemChartPrice: create.asyncThunk(
            async ({ PDNO, FID_INPUT_DATE_1, FID_INPUT_DATE_2 }: { PDNO: string, FID_INPUT_DATE_1: string, FID_INPUT_DATE_2: string }) => {
                return await getInquireDailyItemChartPrice(PDNO, FID_INPUT_DATE_1, FID_INPUT_DATE_2);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetInquireDailyItemChartPrice] pending`);
                    state.koreaInvestmentOrderCash.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetInquireDailyItemChartPrice] fulfilled`,`action.payload`, typeof action.payload, action.payload);
                    if (undefined != action.payload["output1"]) {
                        state.koreaInvestmentInquireDailyItemChartPrice = { ...state.koreaInvestmentInquireDailyItemChartPrice, ...action.payload, state: "fulfilled" };
                        state.state = "inquire-daily-itemchartprice";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqGetInquireDailyItemChartPrice] get-rejected 2`);
                },
            }
        ),
        reqGetBalanceSheet: create.asyncThunk(
            async ({ PDNO }: { PDNO: string }) => {
                return await getBalanceSheet(PDNO);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetBalanceSheet] pending`);
                    state.koreaInvestmentBalanceSheet.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetBalanceSheet] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    if (undefined != action.payload["output"]) {
                        state.koreaInvestmentBalanceSheet = { ...state.koreaInvestmentBalanceSheet, ...action.payload, state: "fulfilled" };
                        state.state = "balance-sheet";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqGet BalanceSheet] get-rejected 2`);
                },
            }
        ),
        reqGetIncomeStatement: create.asyncThunk(
            async ({ PDNO }: { PDNO: string }) => {
                return await getIncomeStatement(PDNO);
            },
            {
                pending: (state) => {
                    // console.log(`[reqGetIncomeStatement] pending`);
                    state.koreaInvestmentIncomeStatement.state = "pending";
                },
                fulfilled: (state, action) => {
                    // console.log(`[reqGetIncomeStatement] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    if (undefined != action.payload["output"]) {
                        state.koreaInvestmentIncomeStatement = { ...state.koreaInvestmentIncomeStatement, ...action.payload, state: "fulfilled" };
                        state.state = "income-statement";
                    }
                },
                rejected: (state) => {
                    // console.log(`[reqGet IncomeStatement] get-rejected 2`);
                },
            }
        ),
    }),
    selectors: {
        getKoreaInvestmentApproval: (state) => state.koreaInvestmentApproval,
        getKoreaInvestmentToken: (state) => state.koreaInvestmentToken,
        getKoreaInvestmentBalance: (state) => state.koreaInvestmentBalance,
        getKoreaInvestmentSearchStockInfo: (state) => state.koreaInvestmentSearchStockInfo,
        getKoreaInvestmentInquirePrice: (state) => state.koreaInvestmentInquirePrice,
        getKoreaInvestmentInquireDailyItemChartPrice: (state) => state.koreaInvestmentInquireDailyItemChartPrice,
        getKoreaInvestmentBalanceSheet: (state) => state.koreaInvestmentBalanceSheet,
        getKoreaInvestmentIncomeStatement: (state) => state.koreaInvestmentIncomeStatement,
        getKoreaInvestmentOrderCash: (state) => state.koreaInvestmentOrderCash,
    }
});

export const { reqPostOrderCash } = koreaInvestmentSlice.actions;
export const { getKoreaInvestmentOrderCash } = koreaInvestmentSlice.selectors;

export const { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqGetSearchStockInfo, reqGetInquirePrice, reqGetInquireDailyItemChartPrice } = koreaInvestmentSlice.actions;
export const { setKoreaInvestmentToken } = koreaInvestmentSlice.actions;
export const { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance, getKoreaInvestmentSearchStockInfo, getKoreaInvestmentInquirePrice, getKoreaInvestmentInquireDailyItemChartPrice } = koreaInvestmentSlice.selectors;

export const { reqGetBalanceSheet } = koreaInvestmentSlice.actions;
export const { getKoreaInvestmentBalanceSheet } = koreaInvestmentSlice.selectors;

export const { reqGetIncomeStatement } = koreaInvestmentSlice.actions;
export const { getKoreaInvestmentIncomeStatement } = koreaInvestmentSlice.selectors;
