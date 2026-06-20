import { PayloadAction } from "@reduxjs/toolkit";
import { createAppSlice } from "@/lib/createAppSlice";
import { registerCookie } from "@/components/util";
import {
  getInquireBalanceApi,
  postTokenApi,
  postApprovalKeyApi,
  postOrderCash,
  getInquirePrice,
  getInquireDailyItemChartPrice,
  getBalanceSheet,
  getIncomeStatement,
  getSearchStockInfo,
  getInquireBalanceRlzPl,
  getInquireNccsApi,
  getInquireCcnlApi,
} from "./koreaInvestmentAPI";

// =========================================================================
// 1. 한국투자증권 에러 코드 및 공통 데이터 인터페이스 정의 연동
// =========================================================================

const koreaInvestmentErrorCode = {
  "0": "정상",
  "1": "유효하지 않은 token" // {rt_cd: "1", msg_cd: "EGW00121", msg1: "유효하지 않은 token 입니다."}
} as const;

type ApiState = "init" | "req" | "pending" | "fulfilled" | "rejected";

export interface KoreaInvestmentApproval {
  state: ApiState;
  approval_key: string;
}

export interface KoreaInvestmentToken {
  state: Extract<ApiState, "init" | "req" | "pending" | "fulfilled" | "rejected">; // 토큰 발급은 분당 1회 제한
  access_token: string;
  access_token_token_expired: string;
  token_type: string;
  expires_in: number;
}

interface KoreaInvestmentBalanceStockInfo {
  bfdy_buy_qty: string;     // 전일매수수량
  bfdy_cprs_icdc: string;   // 전일대비증감
  bfdy_sll_qty: string;     // 전일매도수량
  evlu_amt: string;         // 평가금액
  evlu_erng_rt: string;     // 평가수익율
  evlu_pfls_amt: string;    // 평가손익금액
  evlu_pfls_rt: string;     // 평가손익율
  expd_dt: string;          // 만기일자
  fltt_rt: string;          // 등락율
  grta_rt_name: string;     // 보증비율명
  hldg_qty: string;         // 보유수량
  item_mgna_rt_name: string;// 종목증거금율명
  loan_amt: string;         // 대출금액
  loan_dt: string;          // 대출일자
  ord_psbl_qty: string;     // 주문가능수량
  pchs_amt: string;         // 매입금액
  pchs_avg_pric: string;    // 매입평균가격
  pdno: string;             // 상품번호
  prdt_name: string;        // 상품명
  prpr: string;             // 현재가
  sbst_pric: string;        // 대용가격
  stck_loan_unpr: string;   // 주식대출단가
  stln_slng_chgs: string;   // 대주매각대금
  thdt_buyqty: string;      // 금일매수수량
  thdt_sll_qty: string;     // 금일매도수량
  trad_dvsn_name: string;   // 매매구분명
}

interface KoreaInvestmentBalanceOutput2 {
  asst_icdc_amt: string;           // 자산증감액
  asst_icdc_erng_rt: string;       // 자산증감수익율
  bfdy_buy_amt: string;            // 전일매수금액
  bfdy_sll_amt: string;            // 전일매도금액
  bfdy_tlex_amt: string;           // 전일제비용금액
  bfdy_tot_asst_evlu_amt: string;  // 전일총자산평가금액
  cma_evlu_amt: string;            // CMA평가금액
  d2_auto_rdpt_amt: string;        // D+2자동상환금액
  dnca_tot_amt: string;            // 예수금총금액
  evlu_amt_smtl_amt: string;       // 평가금액합계금액
  evlu_pfls_smtl_amt: string;      // 평가손익합계금액
  fncg_gld_auto_rdpt_yn: string;   // 융자금자동상환여부
  nass_amt: string;                // 순자산금액
  nxdy_auto_rdpt_amt: string;      // 익일자동상환금액
  nxdy_excc_amt: string;           // 익일정산금액
  pchs_amt_smtl_amt: string;       // 매입금액합계금액
  prvs_rcdl_excc_amt: string;      // 가수도정산금액
  scts_evlu_amt: string;           // 유가평가금액
  thdt_buy_amt: string;            // 금일매수금액
  thdt_sll_amt: string;            // 금일매도금액
  thdt_tlex_amt: string;           // 금일제비용금액
  tot_evlu_amt: string;            // 총평가금액
  tot_loan_amt: string;            // 총대출금액
  tot_stln_slng_chgs: string;      // 총대주매각대금
}

export interface KoreaInvestmentBalance {
  state: ApiState;
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
  state: Extract<ApiState, "init" | "req" | "pending" | "fulfilled" | "rejected">;
  error: any;
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output: KoreaInvestmentOrderCashOutput;
}

interface KoreaInvestmentSearchStockInfoOutput {
  pdno: string;                        // 상품번호
  prdt_type_cd: string;                 // 상품유형코드
  mket_id_cd: string;                   // 시장ID코드
  scty_grp_id_cd: string;               // 증권그룹ID코드
  excg_dvsn_cd: string;                 // 거래소구분코드
  setl_mmdd: string;                    // 결산월일
  lstg_stqt: string;                    // 상장주수
  lstg_cptl_amt: string;                // 상장자본금액
  cpta: string;                         // 자본금
  papr: string;                         // 액면가
  issu_pric: string;                    // 발행가격
  kospi200_item_yn: string;             // 코스피200종목여부
  scts_mket_lstg_dt: string;            // 유가증권시장상장일자
  scts_mket_lstg_abol_dt: string;       // 유가증권시장상장폐지일자
  kosdaq_mket_lstg_dt: string;          // 코스닥시장상장일자
  kosdaq_mket_lstg_abol_dt: string;     // 코스닥시장상장폐지일자
  frbd_mket_lstg_dt: string;            // 프리보드시장상장일자
  frbd_mket_lstg_abol_dt: string;       // 프리보드시장상장폐지일자
  reits_kind_cd: string;                // 리츠종류코드
  etf_dvsn_cd: string;                  // ETF구분코드
  oilf_fund_yn: string;                 // 유전펀드여부
  idx_bztp_lcls_cd: string;             // 지수업종대분류코드
  idx_bztp_mcls_cd: string;             // 지수업종중분류코드
  idx_bztp_scls_cd: string;             // 지수업종소분류코드
  stck_kind_cd: string;                 // 주식종류코드
  mfnd_opng_dt: string;                 // 뮤추얼펀드개시일자
  mfnd_end_dt: string;                  // 뮤추얼펀드종료일자
  dpsi_erlm_cncl_dt: string;            // 예탁등록취소일자
  etf_cu_qty: string;                   // ETFCU수량
  prdt_name: string;                    // 상품명
  prdt_name120: string;                 // 상품명120
  prdt_abrv_name: string;               // 상품약어명
  std_pdno: string;                     // 표준상품번호
  prdt_eng_name: string;                // 상품영문명
  prdt_eng_name120: string;             // 상품영문명120
  prdt_eng_abrv_name: string;           // 상품영문약어명
  dpsi_aptm_erlm_yn: string;            // 예탁지정등록여부
  etf_txtn_type_cd: string;             // ETF과세유형코드
  etf_type_cd: string;                  // ETF유형코드
  lstg_abol_dt: string;                 // 상장폐지일자
  nwst_odst_dvsn_cd: string;            // 신주구주구분코드
  sbst_pric: string;                    // 대용가격
  thco_sbst_pric: string;               // 당사대용가격
  thco_sbst_pric_chng_dt: string;       // 당사대용가격변경일자
  tr_stop_yn: string;                   // 거래정지여부
  admn_item_yn: string;                 // 관리종목여부
  thdt_clpr: string;                    // 당일종가
  bfdy_clpr: string;                    // 전일종가
  clpr_chng_dt: string;                 // 종가변경일자
  std_idst_clsf_cd: string;             // 표준산업분류코드
  std_idst_clsf_cd_name: string;        // 표준산업분류코드명
  idx_bztp_lcls_cd_name: string;        // 지수업종대분류코드명
  idx_bztp_mcls_cd_name: string;        // 지수업종중분류코드명
  idx_bztp_scls_cd_name: string;        // 지수업종소분류코드명
  ocr_no: string;                       // OCR번호
  crfd_item_yn: string;                 // 크라우드펀딩종목여부
  elec_scty_yn: string;                 // 전자증권여부
  issu_istt_cd: string;                 // 발행기관코드
  etf_chas_erng_rt_dbnb: string;        // ETF추적수익율배수
  etf_etn_ivst_heed_item_yn: string;    // ETFETN투자유의종목여부
  stln_int_rt_dvsn_cd: string;          // 대주이자율구분코드
  frnr_psnl_lmt_rt: string;             // 외국인개인한도비율
  lstg_rqsr_issu_istt_cd: string;       // 상장신청인발행기관코드
  lstg_rqsr_item_cd: string;            // 상장신청인종목코드
  trst_istt_issu_istt_cd: string;       // 신탁기관발행기관코드
  cptt_trad_tr_psbl_yn: string;         // NXT 거래종목여부
  nxt_tr_stop_yn: string;               // NXT 거래정지여부
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
  state: ApiState;
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output: KoreaInvestmentSearchStockInfoOutput;
}

export interface KoreaInvestmentInquirePrice {
  state: ApiState;
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
  lstn_stcn: string;
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
  state: Extract<ApiState, "init" | "req" | "pending" | "fulfilled" | "rejected">;
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
  state: Extract<ApiState, "init" | "req" | "pending" | "fulfilled" | "rejected">;
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output: KoreaInvestmentBalanceSheetOutput[];
}

interface KoreaInvestmentIncomeStatementOutput {
  stac_yymm: string;     // 결산 년월
  sale_account: string;  // 매출액
  sale_cost: string;     // 매출 원가
  sale_totl_prfi: string; // 매출 총 이익
  depr_cost: string;     // 감가상각비
  sell_mang: string;     // 판매 및 관리비
  bsop_prti: string;     // 영업 이익
  bsop_non_ernn: string; // 영업 외 수익
  bsop_non_expn: string; // 영업 외 비용
  op_prfi: string;       // 경상 이익
  spec_prfi: string;     // 특별 이익
  spec_loss: string;     // 특별 손실
  thtr_ntin: string;     // 당기순이익
}

export interface KoreaInvestmentIncomeStatement {
  state: Extract<ApiState, "init" | "req" | "pending" | "fulfilled" | "rejected">;
  rt_cd: string;         // 성공 실패 여부
  msg_cd: string;        // 응답코드
  msg1: string;          // 응답메세지
  output: KoreaInvestmentIncomeStatementOutput[];
}

export interface KiInquireBalanceRlzPlResponseBodyOutput1 {
  pdno: string;           // 상품번호
  prdt_name: string;      // 상품명
  trad_dvsn_name: string; // 매매구분명
  bfdy_buy_qty: string;   // 전일매수수량
  bfdy_sll_qty: string;   // 전일매도수량
  thdt_buyqty: string;    // 금일매수수량
  thdt_sll_qty: string;   // 금일매도수량
  hldg_qty: string;       // 보유수량
  ord_psbl_qty: string;   // 주문가능수량
  pchs_avg_pric: string;  // 매입평균가격
  pchs_amt: string;       // 매입금액
  prpr: string;           // 현재가
  evlu_amt: string;       // 평가금액
  evlu_pfls_amt: string;  // 평가손익금액
  evlu_pfls_rt: string;   // 평가손익율
  evlu_erng_rt: string;   // 평가수익율
  loan_dt: string;        // 대출일자
  loan_amt: string;       // 대출금액
  stln_slng_chgs: string; // 대주매각대금
  expd_dt: string;        // 만기일자
  stck_loan_unpr: string; // 주식대출단가
  bfdy_cprs_icdc: string; // 전일대비증감
  fltt_rt: string;        // 등락율
}

export interface KiInquireBalanceRlzPlResponseBodyOutput2 {
  dnca_tot_amt: string;               // 예수금총금액
  nxdy_excc_amt: string;              // 익일정산금액
  prvs_rcdl_excc_amt: string;         // 가수도정산금액
  cma_evlu_amt: string;               // CMA평가금액
  bfdy_buy_amt: string;               // 전일매수금액
  thdt_buy_amt: string;               // 금일매수금액
  nxdy_auto_rdpt_amt: string;         // 익일자동상환금액
  bfdy_sll_amt: string;               // 전일매도금액
  thdt_sll_amt: string;               // 금일매도금액
  d2_auto_rdpt_amt: string;           // D+2자동상환금액
  bfdy_tlex_amt: string;              // 전일제비용금액
  thdt_tlex_amt: string;              // 금일제비용금액
  tot_loan_amt: string;               // 총대출금액
  scts_evlu_amt: string;              // 유가평가금액
  tot_evlu_amt: string;               // 총평가금액
  nass_amt: string;                   // 순자산금액
  fncg_gld_auto_rdpt_yn: string;      // 융자금자동상환여부
  pchs_amt_smtl_amt: string;          // 매입금액합계금액
  evlu_amt_smtl_amt: string;          // 평가금액합계금액
  evlu_pfls_smtl_amt: string;         // 평가손익합계금액
  tot_stln_slng_chgs: string;          // 총대주매각대금
  bfdy_tot_asst_evlu_amt: string;     // 전일총자산평가금액
  asst_icdc_amt: string;              // 자산증감액
  asst_icdc_erng_rt: string;          // 자산증감수익율
  rlzt_pfls: string;                  // 실현손익
  rlzt_erng_rt: string;               // 실현수익율
  real_evlu_pfls: string;             // 실평가손익
  real_evlu_pfls_erng_rt: string;     // 실평가손익수익율
}

export interface KiInquireBalanceRlzPlResponseBody {
  state: ApiState;
  rt_cd: string;          // 성공 실패 여부
  msg_cd: string;         // 응답코드
  msg1: string;           // 응답메세지
  output1: KiInquireBalanceRlzPlResponseBodyOutput1[];
  output2: KiInquireBalanceRlzPlResponseBodyOutput2[];
}
/**
 * 한국투자증권 국내주식 체결/미체결 상세 내역 데이터 인터페이스 (output1 / output)
 * 💡 한투 공식 가이드 기준 국내주식 당일 체결/미체결 데이터 필드는 소문자로 리턴됩니다.
 */
export interface KoreaInvestmentInquireCcnlOutput {
  ord_gno: string;              // 주문원번호 (주문 발생 시점의 고유 그룹 번호)
  odno: string;                 // 주문번호 (당일 발급된 해당 주문의 고유 번호)
  orgn_odno: string;            // 원주문번호 (정정/취소 주문 시 기준이 되는 직전 주문번호)
  ord_dvsn_name: string;        // 주문구분명 (예: 현금매수, 현금매도, 정정, 취소 등)
  pdno: string;                 // 상품번호 (종목코드 6자리)
  prdt_name: string;            // 상품명 (종목명)
  rvse_cncl_dvsn_name: string;   // 정정취소구분명 (예: 정상, 정정, 취소)
  ord_qty: string;              // 주문수량
  ord_unpr: string;             // 주문단가 (지정가 금액, 시장가 주문 시 "0" 혹은 공백 가능)
  tot_ccld_qty: string;         // 총체결수량
  tot_ccld_amt: string;         // 총체결금액 (총 체결수량 * 체결단가의 합산액)
  ccld_nyqty: string;           // 체결잔량 (총 주문수량 중 아직 체결되지 않고 대기 중인 잔량)
  not_ccld_qty: string;         // 미체결수량 (당일 미체결 내역 조회 시 핵심 지표)
  rmnd_qty: string;             // 잔여수량
  ccld_unpr: string;            // 체결단가 (실제 매칭되어 체결된 가격, 미체결 시 "0")
  ccld_time: string;            // 체결시간 또는 주문시간 (HHMMSS 형식)
}

/**
 * 🛠️ 국내주식 당일 주문 체결 내역 조회 API 응답 래퍼 인터페이스
 */
export interface KoreaInvestmentInquireCcnl {
  state: ApiState;              // 클라이언트 사이드 데이터 fetching 상태 관리 플래그
  error: any;                   // 에러 발생 시 Error 객체 또는 백엔드 커스텀 에러 페이로드 저장
  rt_cd: string;                // 성공/실패 여부 (0: 성공, 0 이외의 값: 실패)
  msg_cd: string;               // 응답 메시지 코드
  msg1: string;                 // 응답 메시지 내용 (한투 서버에서 전달한 한글 안내 문구)
  output: KoreaInvestmentInquireCcnlOutput[]; // 체결 데이터 리스트 배열
}

/**
 * 🛠️ 국내주식 당일 미체결 내역 조회 API 응답 래퍼 인터페이스
 */
export interface KoreaInvestmentInquireNccs {
  state: ApiState;              // 클라이언트 사이드 데이터 fetching 상태 관리 플래그
  error: any;                   // 에러 발생 시 데이터 구조화 캐싱
  rt_cd: string;                // 성공/실패 여부 (0: 성공, 0 이외의 값: 실패)
  msg_cd: string;               // 응답 메시지 코드
  msg1: string;                 // 응답 메시지 내용
  output: KoreaInvestmentInquireCcnlOutput[]; // 동일한 미체결 데이터 명세 바인딩
}
// =========================================================================
// 2. Global State 인터페이스 및 초기 값 선언
// =========================================================================

interface KoreaInvestmentInfo {
  state: "init"
  | "fulfilled"
  | "get-rejected"
  | "loading"
  | "loaded"
  | "rejected"
  | "approval"
  | "token"
  | "inquire-balance"
  | "order-cash"
  | "inquire-price"
  | "inquire-daily-itemchartprice"
  | "balance-sheet"
  | "income-statement"
  | "inquire-kr-ccnl" // 💡 추가: 당일 체결 상태
  | "inquire-kr-nccs"; // 💡 추가: 당일 미체결 상태
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
  kiInquireBalanceRlzPlResponseBody: KiInquireBalanceRlzPlResponseBody;
  koreaInvestmentInquireKrCcnl: KoreaInvestmentInquireCcnl;
  koreaInvestmentInquireKrNccs: KoreaInvestmentInquireNccs;
}

const initialState: KoreaInvestmentInfo = {
  state: "init",
  id: "",
  nickName: "",
  koreaInvestmentApproval: { state: "init", approval_key: "" },
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
    error: "",
    rt_cd: "",
    msg_cd: "",
    msg1: "",
    output: { KRX_FWDG_ORD_ORGNO: "", ODNO: "", ORD_TMD: "" }
  },
  koreaInvestmentSearchStockInfo: {
    state: "init",
    rt_cd: "",
    msg_cd: "",
    msg1: "",
    output: {
      pdno: "", prdt_type_cd: "", mket_id_cd: "", scty_grp_id_cd: "", excg_dvsn_cd: "",
      setl_mmdd: "", lstg_stqt: "", lstg_cptl_amt: "", cpta: "", papr: "", issu_pric: "",
      kospi200_item_yn: "", scts_mket_lstg_dt: "", scts_mket_lstg_abol_dt: "", kosdaq_mket_lstg_dt: "",
      kosdaq_mket_lstg_abol_dt: "", frbd_mket_lstg_dt: "", frbd_mket_lstg_abol_dt: "", reits_kind_cd: "",
      etf_dvsn_cd: "", oilf_fund_yn: "", idx_bztp_lcls_cd: "", idx_bztp_mcls_cd: "", idx_bztp_scls_cd: "",
      stck_kind_cd: "", mfnd_opng_dt: "", mfnd_end_dt: "", dpsi_erlm_cncl_dt: "", etf_cu_qty: "",
      prdt_name: "", prdt_name120: "", prdt_abrv_name: "", std_pdno: "", prdt_eng_name: "",
      prdt_eng_name120: "", prdt_eng_abrv_name: "", dpsi_aptm_erlm_yn: "", etf_txtn_type_cd: "",
      etf_type_cd: "", lstg_abol_dt: "", nwst_odst_dvsn_cd: "", sbst_pric: "", thco_sbst_pric: "",
      thco_sbst_pric_chng_dt: "", tr_stop_yn: "", admn_item_yn: "", thdt_clpr: "", bfdy_clpr: "",
      clpr_chng_dt: "", std_idst_clsf_cd: "", std_idst_clsf_cd_name: "", idx_bztp_lcls_cd_name: "",
      idx_bztp_mcls_cd_name: "", idx_bztp_scls_cd_name: "", ocr_no: "", crfd_item_yn: "",
      elec_scty_yn: "", issu_istt_cd: "", etf_chas_erng_rt_dbnb: "", etf_etn_ivst_heed_item_yn: "",
      stln_int_rt_dvsn_cd: "", frnr_psnl_lmt_rt: "", lstg_rqsr_issu_istt_cd: "", lstg_rqsr_item_cd: "",
      trst_istt_issu_istt_cd: "", cptt_trad_tr_psbl_yn: "", nxt_tr_stop_yn: ""
    }
  },
  koreaInvestmentInquirePrice: {
    state: "init",
    rt_cd: "",
    msg_cd: "",
    msg1: "",
    output: {
      iscd_stat_cls_code: "", marg_rate: "", rprs_mrkt_kor_name: "", bstp_kor_isnm: "",
      temp_stop_yn: "", oprc_rang_cont_yn: "", clpr_rang_cont_yn: "", crdt_able_yn: "",
      grmn_rate_cls_code: "", elw_pblc_yn: "", stck_prpr: "", prdy_vrss: "", prdy_vrss_sign: "",
      prdy_ctrt: "", acml_tr_pbmn: "", acml_vol: "", prdy_vrss_vol_rate: "", stck_oprc: "",
      stck_hgpr: "", stck_lwpr: "", stck_mxpr: "", stck_llam: "", stck_sdpr: "",
      wghn_avrg_stck_prc: "", hts_frgn_ehrt: "", frgn_ntby_qty: "", pgtr_ntby_qty: "",
      pvt_scnd_dmrs_prc: "", pvt_frst_dmrs_prc: "", pvt_pont_val: "", pvt_frst_dmsp_prc: "",
      pvt_scnd_dmsp_prc: "", dmrs_val: "", dmsp_val: "", cpfn: "", rstc_wdth_prc: "",
      stck_fcam: "", stck_sspr: "", aspr_unit: "", hts_deal_qty_unit_val: "", lstn_stcn: "",
      hts_avls: "", per: "", pbr: "", stac_month: "", vol_tnrt: "", eps: "", bps: "",
      d250_hgpr: "", d250_hgpr_date: "", d250_hgpr_vrss_prpr_rate: "", d250_lwpr: "",
      d250_lwpr_date: "", d250_lwpr_vrss_prpr_rate: "", stck_dryy_hgpr: "",
      dryy_hgpr_vrss_prpr_rate: "", dryy_hgpr_date: "", stck_dryy_lwpr: "",
      dryy_lwpr_vrss_prpr_rate: "", dryy_lwpr_date: "", w52_hgpr: "", w52_hgpr_vrss_prpr_ctrt: "",
      w52_hgpr_date: "", w52_lwpr: "", w52_lwpr_vrss_prpr_ctrt: "", w52_lwpr_date: "",
      whol_loan_rmnd_rate: "", ssts_yn: "", stck_shrn_iscd: "", fcam_cnnm: "", cpfn_cnnm: "",
      frgn_hldn_qty: "", vi_cls_code: "", ovtm_vi_cls_code: "", last_ssts_cntg_qty: "",
      invt_caful_yn: "", mrkt_warn_cls_code: "", short_over_yn: "", sltr_yn: ""
    }
  },
  koreaInvestmentInquireDailyItemChartPrice: {
    state: "init",
    rt_cd: "",
    msg_cd: "",
    msg1: "",
    output1: {
      acml_tr_pbmn: "", acml_vol: "", askp: "", bidp: "", cpfn: "", eps: "", hts_avls: "",
      hts_kor_isnm: "", itewhol_loan_rmnd_ratem_name: "", lstn_stcn: "", pbr: "", per: "",
      prdy_ctrt: "", prdy_vol: "", prdy_vrss: "", prdy_vrss_sign: "", prdy_vrss_vol: "",
      stck_fcam: "", stck_hgpr: "", stck_llam: "", stck_lwpr: "", stck_mxpr: "", stck_oprc: "",
      stck_prdy_clpr: "", stck_prdy_hgpr: "", stck_prdy_lwpr: "", stck_prdy_oprc: "",
      stck_prpr: "", stck_shrn_iscd: "", vol_tnrt: ""
    },
    output2: []
  },
  koreaInvestmentBalanceSheet: { state: "init", rt_cd: "", msg_cd: "", msg1: "", output: [] },
  koreaInvestmentIncomeStatement: { state: "init", rt_cd: "", msg_cd: "", msg1: "", output: [] },
  kiInquireBalanceRlzPlResponseBody: { state: "init", rt_cd: "", msg_cd: "", msg1: "", output1: [], output2: [] },
  koreaInvestmentInquireKrCcnl: {
    state: "init",
    error: null,
    rt_cd: "",
    msg_cd: "",
    msg1: "",
    output: []
  },
  koreaInvestmentInquireKrNccs: {
    state: "init",
    error: null,
    rt_cd: "",
    msg_cd: "",
    msg1: "",
    output: []
  },
};

// =========================================================================
// 3. Slice 생성 및 비동기 액션(Thunk) / 셀렉터 정의
// =========================================================================

export const koreaInvestmentSlice = createAppSlice({
  name: "koreaInvestment",
  initialState,
  reducers: (create) => ({

    // 실시간 웹소켓용 Approval Key 발급
    reqPostApprovalKey: create.asyncThunk(
      async () => {
        const res = await postApprovalKeyApi();
        return res ?? null;
      },
      {
        pending: (state) => {
          state.koreaInvestmentApproval.state = "pending";
        },
        fulfilled: (state, action) => {
          if (action.payload) {
            state.koreaInvestmentApproval = {
              approval_key: action.payload.approval_key,
              state: "fulfilled"
            };
            state.state = "approval";
          }
        },
        rejected: (state) => {
          state.koreaInvestmentApproval.state = "rejected";
        }
      }
    ),

    // 종목 조회 결과 초기화 (stale data 방지)
    resetKrStockData: create.reducer((state) => {
      state.koreaInvestmentInquirePrice.state = "init";
      state.koreaInvestmentInquireDailyItemChartPrice.state = "init";
      state.koreaInvestmentBalanceSheet.state = "init";
      state.koreaInvestmentIncomeStatement.state = "init";
    }),

    // 로컬 스토리지/쿠키 동기화용 동기 리듀서
    setKoreaInvestmentToken: create.reducer((state, action: PayloadAction<KoreaInvestmentToken>) => {
      const json = action.payload;
      state.koreaInvestmentToken = {
        state: "fulfilled",
        access_token: json.access_token,
        access_token_token_expired: json.access_token_token_expired.replace(" ", "T"),
        token_type: json.token_type,
        expires_in: json.expires_in,
      };
      registerCookie("koreaInvestmentToken", JSON.stringify(json));
    }),

    // API 접근용 Access Token 발급
    reqPostToken: create.asyncThunk(
      async () => {
        return await postTokenApi();
      },
      {
        pending: (state) => {
          state.koreaInvestmentToken.state = "pending";
        },
        fulfilled: (state, action) => {
          const json = action.payload;
          if (json && !json.error_description) {
            state.koreaInvestmentToken = {
              state: "fulfilled",
              access_token: json.access_token,
              access_token_token_expired: json.access_token_token_expired.replace(" ", "T"),
              token_type: json.token_type,
              expires_in: json.expires_in,
            };
            registerCookie("koreaInvestmentToken", JSON.stringify(json));
            state.state = "token";
          }
        },
        rejected: (state) => {
          state.koreaInvestmentToken.state = "rejected";
        }
      }
    ),

    // 주식 잔고 및 계좌 평가현황 조회
    reqGetInquireBalance: create.asyncThunk(
      async (key: string) => {
        return await getInquireBalanceApi(key);
      },
      {
        pending: (state) => {
          state.koreaInvestmentBalance.state = "pending";
        },
        fulfilled: (state, action) => {
          if (action.payload?.output1 !== undefined) {
            state.koreaInvestmentBalance = {
              ...state.koreaInvestmentBalance,
              ...action.payload,
              state: "fulfilled"
            };
            state.state = "inquire-balance";
          }
        },
        rejected: (state) => {
          state.koreaInvestmentBalance.state = "rejected";
        }
      }
    ),

    // 기간별 실현손익 및 투자수익률 조회
    reqGetInquireBalanceRlzPl: create.asyncThunk(
      async (key?: string) => {
        return await getInquireBalanceRlzPl(key);
      },
      {
        pending: (state) => {
          state.kiInquireBalanceRlzPlResponseBody.state = "pending";
        },
        fulfilled: (state, action) => {
          if (action.payload?.output !== undefined) {
            state.kiInquireBalanceRlzPlResponseBody = {
              ...state.kiInquireBalanceRlzPlResponseBody,
              ...action.payload,
              state: "fulfilled"
            };
            state.state = "income-statement";
          }
        },
        rejected: (state) => {
          state.kiInquireBalanceRlzPlResponseBody.state = "rejected";
        }
      }
    ),

    // 현금 주문 제어 (매수/매도 고도화)
    reqPostOrderCash: create.asyncThunk<
      any, // 성공 시 반환 타입 (필요시 구체적인 타입 지정 가능)
      {
        PDNO: string;
        buyOrSell: string;
        excg_cd: string;
        price: string;
        qty: string;
        kakaoId: string;
      },
      { rejectValue: string } // rejectWithValue 사용을 위한 타입 지정
    >(
      async ({ PDNO, buyOrSell, excg_cd, price, qty, kakaoId }, { rejectWithValue }) => {
        try {
          // 내부 API 함수인 postOrderCash가 객체나 확장된 인자들을 받을 수 있도록 매개변수를 그대로 넘겨줍니다.
          const response = await postOrderCash({ PDNO, buyOrSell, excg_cd, price, qty, kakaoId });

          // 💡 한국투자증권 응답 스펙상 성공(200) 형태 내부에서 비즈니스 에러(rt_cd !== '0')가 오는 경우가 있으므로 검증 단계를 추가합니다.
          if (response && response.rt_cd && response.rt_cd !== "0") {
            return rejectWithValue(response.msg1 || "주문 처리 중 증권사 내부 에러 발생");
          }

          return response;
        } catch (error: any) {
          // postKoreaInvestmentRequest에서 throw한 에러 메시지를 catch하여 리덕스 페이로드로 토스합니다.
          return rejectWithValue(error.message || "주문 API 프록시 통신 실패");
        }
      },
      {
        pending: (state) => {
          state.koreaInvestmentOrderCash.state = "pending";
          state.koreaInvestmentOrderCash.error = null; // 💡 새로운 요청 시 기존 에러 초기화
        },
        fulfilled: (state, action) => {
          state.state = "order-cash";
          state.koreaInvestmentOrderCash = {
            ...state.koreaInvestmentOrderCash,
            ...action.payload,
            state: "fulfilled",
            error: null
          };
        },
        rejected: (state, action) => {
          state.koreaInvestmentOrderCash.state = "rejected";
          state.state = "get-rejected";
          // 💡 컴포넌트단(UI)에서 어떤 사유로 거부되었는지 렌더링할 수 있도록 에러 메시지 저장
          state.koreaInvestmentOrderCash.error = action.payload || "알 수 없는 주문 에러";
        }
      }
    ),

    // 종목 기본 정보 마스터 검색
    reqGetSearchStockInfo: create.asyncThunk(
      async ({ PDNO }: { PDNO: string }) => {
        return await getSearchStockInfo(PDNO);
      },
      {
        pending: (state) => {
          state.koreaInvestmentSearchStockInfo.state = "pending";
        },
        fulfilled: (state, action) => {
          if (action.payload?.output !== undefined) {
            state.koreaInvestmentSearchStockInfo = {
              ...state.koreaInvestmentSearchStockInfo,
              ...action.payload,
              state: "fulfilled"
            };
            state.state = "inquire-price";
          }
        },
        rejected: (state) => {
          state.koreaInvestmentSearchStockInfo.state = "rejected";
        }
      }
    ),

    // 주식 현재가 정보 조회
    reqGetInquirePrice: create.asyncThunk(
      async ({ PDNO }: { PDNO: string }) => {
        return await getInquirePrice(PDNO);
      },
      {
        pending: (state) => {
          state.koreaInvestmentInquirePrice.state = "pending";
        },
        fulfilled: (state, action) => {
          if (action.payload?.output !== undefined) {
            state.koreaInvestmentInquirePrice = {
              ...state.koreaInvestmentInquirePrice,
              ...action.payload,
              state: "fulfilled"
            };
            state.state = "inquire-price";
          }
        },
        rejected: (state) => {
          state.koreaInvestmentInquirePrice.state = "rejected";
        }
      }
    ),

    // 주식 일별/차트 데이터 조회
    reqGetInquireDailyItemChartPrice: create.asyncThunk(
      async ({ PDNO, FID_INPUT_DATE_1, FID_INPUT_DATE_2 }: { PDNO: string; FID_INPUT_DATE_1: string; FID_INPUT_DATE_2: string }) => {
        return await getInquireDailyItemChartPrice(PDNO, FID_INPUT_DATE_1, FID_INPUT_DATE_2);
      },
      {
        pending: (state) => {
          // 버그 수정: 오동작하던 OrderCash 타겟팅을 자기 자신인 InquireDailyItemChartPrice 상태 변경으로 교정했습니다.
          state.koreaInvestmentInquireDailyItemChartPrice.state = "pending";
        },
        fulfilled: (state, action) => {
          // 에러 응답(output1 없음)이어도 항상 settle 시킨다. pending에 머물면 차트도 안내도 안 나옴.
          state.koreaInvestmentInquireDailyItemChartPrice = {
            ...state.koreaInvestmentInquireDailyItemChartPrice,
            ...action.payload,
            state: "fulfilled"
          };
          state.state = "inquire-daily-itemchartprice";
        },
        rejected: (state) => {
          state.koreaInvestmentInquireDailyItemChartPrice.state = "rejected";
        }
      }
    ),

    // 기업 재무제표 대조표 조회
    reqGetBalanceSheet: create.asyncThunk(
      async ({ PDNO }: { PDNO: string }) => {
        return await getBalanceSheet(PDNO);
      },
      {
        pending: (state) => {
          state.koreaInvestmentBalanceSheet.state = "pending";
        },
        fulfilled: (state, action) => {
          if (action.payload?.["output"] !== undefined) {
            state.koreaInvestmentBalanceSheet = {
              ...state.koreaInvestmentBalanceSheet,
              ...action.payload,
              state: "fulfilled"
            };
            state.state = "balance-sheet";
          }
        },
        rejected: (state) => {
          state.koreaInvestmentBalanceSheet.state = "rejected";
        }
      }
    ),

    // 기업 손익계산서 조회
    reqGetIncomeStatement: create.asyncThunk(
      async ({ PDNO }: { PDNO: string }) => {
        return await getIncomeStatement(PDNO);
      },
      {
        pending: (state) => {
          state.koreaInvestmentIncomeStatement.state = "pending";
        },
        fulfilled: (state, action) => {
          if (action.payload?.["output"] !== undefined) {
            state.koreaInvestmentIncomeStatement = {
              ...state.koreaInvestmentIncomeStatement,
              ...action.payload,
              state: "fulfilled"
            };
            state.state = "income-statement";
          }
        },
        rejected: (state) => {
          state.koreaInvestmentIncomeStatement.state = "rejected";
        }
      }
    ),
    // 💡 추가: 국내주식 당일 체결 내역 조회 비동기 액션
    reqGetInquireCcnl: create.asyncThunk<any, { DV?: string, kakaoId?: string }, { rejectValue: string }>(
      async (params, { rejectWithValue }) => {
        try {
          const response = await getInquireCcnlApi(params?.DV, params?.kakaoId);
          if (response && response.rt_cd && response.rt_cd !== "0") {
            return rejectWithValue(response.msg1 || "체결 내역 조회 실패 (증권사 오류)");
          }
          return response;
        } catch (error: any) {
          return rejectWithValue(error.message || "체결 내역 네트워크 통신 실패");
        }
      },
      {
        pending: (state) => {
          state.koreaInvestmentInquireKrCcnl.state = "pending";
          state.koreaInvestmentInquireKrCcnl.error = null;
        },
        fulfilled: (state, action) => {
          state.state = "inquire-kr-ccnl";
          state.koreaInvestmentInquireKrCcnl = {
            ...state.koreaInvestmentInquireKrCcnl,
            ...action.payload,
            state: "fulfilled",
            error: null
          };
        },
        rejected: (state, action) => {
          state.koreaInvestmentInquireKrCcnl.state = "rejected";
          state.koreaInvestmentInquireKrCcnl.error = action.payload || "알 수 없는 에러";
        }
      }
    ),

    // 💡 추가: 국내주식 당일 미체결 내역 조회 비동기 액션
    reqGetInquireNccs: create.asyncThunk<any, { DV?: string, kakaoId?: string }, { rejectValue: string }>(
      async (params, { rejectWithValue }) => {
        try {
          const response = await getInquireNccsApi(params?.DV, params?.kakaoId);
          if (response && response.rt_cd && response.rt_cd !== "0") {
            return rejectWithValue(response.msg1 || "미체결 내역 조회 실패 (증권사 오류)");
          }
          return response;
        } catch (error: any) {
          return rejectWithValue(error.message || "미체결 내역 네트워크 통신 실패");
        }
      },
      {
        pending: (state) => {
          state.koreaInvestmentInquireKrNccs.state = "pending";
          state.koreaInvestmentInquireKrNccs.error = null;
        },
        fulfilled: (state, action) => {
          state.state = "inquire-kr-nccs";
          state.koreaInvestmentInquireKrNccs = {
            ...state.koreaInvestmentInquireKrNccs,
            ...action.payload,
            state: "fulfilled",
            error: null
          };
        },
        rejected: (state, action) => {
          state.koreaInvestmentInquireKrNccs.state = "rejected";
          state.koreaInvestmentInquireKrNccs.error = action.payload || "알 수 없는 에러";
        }
      }
    )
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
    getKiInquireBalanceRlzPlResponseBody: (state) => state.kiInquireBalanceRlzPlResponseBody,
    getKoreaInvestmentInquireKrCcnl: (state) => state.koreaInvestmentInquireKrCcnl,
    getKoreaInvestmentInquireKrNccs: (state) => state.koreaInvestmentInquireKrNccs,
  }
});

// =========================================================================
// 4. Export 구조화 및 통합 관리
// =========================================================================

export const {
  // 4-1. 비동기/동기 액션 디스패처 (Actions)
  reqPostApprovalKey,
  reqPostToken,
  setKoreaInvestmentToken,
  reqGetInquireBalance,
  reqGetInquireBalanceRlzPl,
  reqGetSearchStockInfo,
  reqGetInquirePrice,
  reqGetInquireDailyItemChartPrice,
  reqGetBalanceSheet,
  reqGetIncomeStatement,
  reqPostOrderCash,
  reqGetInquireCcnl,
  reqGetInquireNccs,
  resetKrStockData,
} = koreaInvestmentSlice.actions;

export const {
  // 4-2. 컴포넌트 구독용 데이터 선택자 (Selectors)
  getKoreaInvestmentApproval,
  getKoreaInvestmentToken,
  getKoreaInvestmentBalance,
  getKiInquireBalanceRlzPlResponseBody,
  getKoreaInvestmentSearchStockInfo,
  getKoreaInvestmentInquirePrice,
  getKoreaInvestmentInquireDailyItemChartPrice,
  getKoreaInvestmentBalanceSheet,
  getKoreaInvestmentIncomeStatement,
  getKoreaInvestmentOrderCash,
  getKoreaInvestmentInquireKrCcnl,
  getKoreaInvestmentInquireKrNccs,

} = koreaInvestmentSlice.selectors;