"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Lock,
  LayoutDashboard,
  ChevronRight,
  MapPin,
  Activity,
  Layers,
  ShoppingBag,
  TrendingUp,
  X,
  CheckCircle2,
  Clock,
  RefreshCw,
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Percent
} from "lucide-react";
import { useSession } from "next-auth/react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  reqGetInquireBalance,
  getKoreaInvestmentBalance,
  getKoreaInvestmentOrderCash,
  KoreaInvestmentOrderCash,
  reqPostOrderCash,
  getKoreaInvestmentInquireKrCcnl,
  getKoreaInvestmentInquireKrNccs,
  KoreaInvestmentInquireCcnl,
  KoreaInvestmentInquireNccs,
  reqGetInquireCcnl,
  reqGetInquireNccs
} from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqGetCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import {
  reqGetKakaoMemberList,
  selectKakaoMemberList,
  selectKakaoTotal,
  KakaoTotal
} from "@/lib/features/kakao/kakaoSlice";
import {
  KrUsCapitalType,
  reqGetKrCapital,
  reqGetUsCapital,
  reqPostKrCapitalTokenMinusAll,
  reqPostKrCapitalTokenMinusOne,
  reqPostKrCapitalTokenPlusAll,
  reqPostKrCapitalTokenPlusOne,
  selectKrCapital,
  selectKrCapitalTokenMinusAll,
  selectKrCapitalTokenMinusOne,
  selectKrCapitalTokenPlusAll,
  selectKrCapitalTokenPlusOne
} from "@/lib/features/capital/capitalSlice";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import StockListTable from "@/components/balance/stockListTable";
import { cn } from "@/lib/utils";

// =========================================================================
// 한국투자증권 실시간 계좌 조회 API 응답 명세 인터페이스 정의
// =========================================================================

const koreaInvestmentErrorCode = {
  "0": "정상",
  "1": "유효하지 않은 토큰 세션"
} as const;

type ApiState = "init" | "req" | "pending" | "fulfilled" | "rejected";

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

function LoadingState() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
      <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">데이터를 불러오는 중...</h2>
      <p className="text-zinc-500 dark:text-zinc-400 mt-2">잠시만 기다려 주세요.</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BalanceKr />
    </Suspense>
  );
}

function BalanceKr() {
  const { data: session } = useSession();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance) as unknown as KoreaInvestmentBalance;
  const krCapital: KrUsCapitalType = useAppSelector(selectKrCapital);
  const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
  const kakaoMemberList = useAppSelector(selectKakaoMemberList);
  const orderCashState: KoreaInvestmentOrderCash = useAppSelector(getKoreaInvestmentOrderCash);

  const krCcnl: KoreaInvestmentInquireCcnl = useAppSelector(getKoreaInvestmentInquireKrCcnl);
  const krNccs: KoreaInvestmentInquireNccs = useAppSelector(getKoreaInvestmentInquireKrNccs);

  const krCapitalTokenPlusAll = useAppSelector(selectKrCapitalTokenPlusAll);
  const krCapitalTokenPlusOne = useAppSelector(selectKrCapitalTokenPlusOne);
  const krCapitalTokenMinusAll = useAppSelector(selectKrCapitalTokenMinusAll);
  const krCapitalTokenMinusOne = useAppSelector(selectKrCapitalTokenMinusOne);

  // 현재 조회 및 트레이딩 동작의 기준이 되는 Kakao ID 상태 (우선순위: URL 쿼리스트링 -> 세션 유저 ID)
  const [balanceKey, setBalanceKey] = useState(searchParams.get("key") || String(session?.user?.id || ""));

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ pdno: string; name: string; price: string } | null>(null);
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [customPrice, setCustomPrice] = useState("");
  const [orderQty, setOrderQty] = useState("1");

  const [viewerTab, setViewerTab] = useState<"ccnl" | "nccs">("ccnl");

  // 중복 알림 팝업 노출 차단을 위한 이미 처리된 주문 상태 추적 락(Lock) 변수
  const [processedOrderNo, setProcessedOrderNo] = useState<string | null>(null);

  // URL에서 key가 변경되면 대시보드 타겟 Kakao ID 상태 동기화
  useEffect(() => {
    const urlKey = searchParams.get("key");
    if (urlKey && urlKey !== balanceKey) setBalanceKey(urlKey);
  }, [searchParams]);

  // 마스터 계정일 경우 전체 카카오 회원 목록 로드
  useEffect(() => {
    if (session?.user?.name === process.env.NEXT_PUBLIC_MASTER) {
      dispatch(reqGetKakaoMemberList());
    }
  }, [session, dispatch]);

  // 해당 Kakao ID 기반 당일 체결/미체결 내역 조회
  const fetchOrderHistory = (key: string) => {
    if (!key || key === "undefined") return;
    if (typeof reqGetInquireCcnl === "function") {
      dispatch(reqGetInquireCcnl({ DV: "0", kakaoId: key }));
    }
    if (typeof reqGetInquireNccs === "function") {
      dispatch(reqGetInquireNccs({ DV: "1", kakaoId: key }));
    }
  };

  // balanceKey(Kakao ID) 변경 감지 시 전체 데이터 재배포 및 라우터 주소 갱신
  useEffect(() => {
    if (balanceKey && balanceKey !== "undefined") {
      router.replace(`${pathname}?key=${balanceKey}`);
      dispatch(reqGetInquireBalance(balanceKey));
      fetchOrderHistory(balanceKey);

      if (pathname.includes("kr")) dispatch(reqGetKrCapital(balanceKey));
      else dispatch(reqGetUsCapital(balanceKey));
    }
  }, [balanceKey, pathname, router, dispatch]);

  // 초기 로드 시 초기화 세팅
  useEffect(() => {
    if (session?.user?.id && !searchParams.get("key")) {
      dispatch(reqGetInquireBalance(session.user.id));
      setBalanceKey(String(session.user.id));
    }
    dispatch(reqGetCapitalToken());
  }, [dispatch, session, searchParams]);

  // 자산 현황 초기화 처리
  useEffect(() => {
    if (krCapital.state === "init" && balanceKey) {
      dispatch(reqGetKrCapital(balanceKey));
    }
  }, [krCapital.state, balanceKey, dispatch]);

  // 토큰 제어 동작 완료 후 상태 리프레시
  const refreshStates = [krCapitalTokenPlusAll, krCapitalTokenPlusOne, krCapitalTokenMinusAll, krCapitalTokenMinusOne];
  useEffect(() => {
    if (refreshStates.some(s => s?.state === "fulfilled")) {
      dispatch(reqGetKrCapital(balanceKey));
    }
  }, [refreshStates, balanceKey, dispatch]);

  // 주문 성공/실패 팝업 알림 스토어 구독 핸들러
  useEffect(() => {
    if (orderCashState.state === "fulfilled") {
      const orderNo = orderCashState.output?.ODNO || "SUCCESS_WITHOUT_NO";

      if (processedOrderNo === orderNo) return;

      alert(`주문 성공 완료!\n주문번호: ${orderCashState.output?.ODNO || "N/A"}\n메시지: ${orderCashState.msg1 || "성공적으로 접수되었습니다."}`);
      setProcessedOrderNo(orderNo);

      // 주문 완료 후 현재 제어 중인 Kakao ID 기반으로 데이터 동기화 리프레시
      dispatch(reqGetInquireBalance(balanceKey));
      fetchOrderHistory(balanceKey);
      setIsOrderModalOpen(false);
    } else if (orderCashState.state === "rejected") {
      const errorMsg = (orderCashState as any).error || "내부 서버 오류 또는 파라미터 규격 제한을 확인하세요.";
      const errorIdentifier = `ERROR_${errorMsg}`;

      if (processedOrderNo === errorIdentifier) return;

      alert(`주문 실패 안내:\n${errorMsg}`);
      setProcessedOrderNo(errorIdentifier);
    }
  }, [orderCashState.state, dispatch, balanceKey, orderCashState.output?.ODNO, processedOrderNo]);

  const doTokenPlusAll = (num: number) => dispatch(reqPostKrCapitalTokenPlusAll({ key: balanceKey, num }));
  const doTokenPlusOne = (num: number, ticker: string) => ticker && dispatch(reqPostKrCapitalTokenPlusOne({ key: balanceKey, num, ticker }));
  const doTokenMinusAll = (num: number) => dispatch(reqPostKrCapitalTokenMinusAll({ key: balanceKey, num }));
  const doTokenMinusOne = (num: number, ticker: string) => ticker && dispatch(reqPostKrCapitalTokenMinusOne({ key: balanceKey, num, ticker }));

  const handleOpenOrderModal = (pdno: string, name: string, currentPrice: string, type: "BUY" | "SELL") => {
    setSelectedStock({ pdno, name, price: currentPrice });
    setOrderType(type);
    setCustomPrice(currentPrice.replace(/[^0-9]/g, ""));
    setOrderQty("1");
    setIsOrderModalOpen(true);
  };

  // [핵심 변경 사항] 선택된 balanceKey(kakao id 기반)를 매수/매도 요청 시 파라미터에 명시적으로 추가
  const handleExecuteOrder = () => {
    if (!selectedStock) return;
    if (Number(orderQty) <= 0) {
      alert("주문 수량은 1주 이상이어야 합니다.");
      return;
    }

    setProcessedOrderNo(null);

    const buyOrSellParam = orderType === "BUY" ? "buy" : "sell";

    dispatch(reqPostOrderCash({
      kakaoId: balanceKey, // 전달받은 카카오 ID를 API 파라미터 컨텍스트에 바인딩
      PDNO: selectedStock.pdno,
      buyOrSell: buyOrSellParam,
      excg_cd: "01",
      price: customPrice,
      qty: orderQty
    }));
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "원주문";
    const cleanStr = timeStr.replace(/[^0-9]/g, "");
    if (cleanStr.length === 6) {
      return `${cleanStr.slice(0, 2)}:${cleanStr.slice(2, 4)}:${cleanStr.slice(4, 6)}`;
    }
    return timeStr;
  };

  // --- 한국투자증권 실규격 데이터 가공 연산 레이어 ---
  const summary = kiBalance.output2?.[0] || {};
  const totalEvalAmt = Number(summary.tot_evlu_amt || 0);
  const d2Deposit = Number(summary.dnca_tot_amt || 0);
  const totalPnl = Number(summary.evlu_pfls_smtl_amt || 0);
  const pnlRate = Number(summary.evlu_amt_smtl_amt || 0) > 0
    ? (totalPnl / Number(summary.pchs_amt_smtl_amt || 1)) * 100
    : Number(summary.asst_icdc_erng_rt || 0);
  const isPnlPositive = totalPnl >= 0;

  // 현재 선택된 카카오 회원의 이름 찾기 (UX 향상용)
const currentKakaoUser = Array.isArray(kakaoMemberList)
    ? kakaoMemberList.find((user: any) => String(user.id) === String(balanceKey))
    : Array.isArray((kakaoMemberList as any)?.list)
    ? (kakaoMemberList as any).list.find((user: any) => String(user.id) === String(balanceKey))
    : null;
    
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">

        {/* --- Header & Breadcrumbs --- */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <nav className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>투자 현황</span>
              <ChevronRight className="w-3 h-3" />
              <div className="flex items-center gap-1 text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                <MapPin className="w-3 h-3" />
                <span>한국(KR) 계좌</span>
              </div>
              {currentKakaoUser && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-zinc-600 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono">
                    개별 제어: {currentKakaoUser.name || balanceKey}
                  </span>
                </>
              )}
            </nav>

            <div className="flex items-center gap-4">
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic">
                Portfolio Balance
              </h1>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 text-2xl">
                🇰🇷
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800">
            <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
              ID: {balanceKey || "N/A"} 계좌 트레이딩 활성화됨
            </span>
          </div>
        </header>

        <div className="h-px w-full bg-gradient-to-r from-zinc-200 dark:from-zinc-800 via-transparent to-transparent mb-12" />

        {/* --- 계좌 실시간 핵심 예수금 및 자산 평가 현황 위젯 스냅샷 --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 animate-in fade-in slide-in-from-bottom-3 duration-500">
          {/* 카드 1: 총 평가 자산 */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">총 평가 금액</span>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-500">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h4 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight font-mono">
                {kiBalance.state === "pending" ? "---" : `${totalEvalAmt.toLocaleString()}원`}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1">유가증권 평가액 + CMA 자산 합산</p>
            </div>
          </div>

          {/* 카드 2: D+2 예수금 */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">예수금 총 금액 (D+2)</span>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-500">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h4 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight font-mono">
                {kiBalance.state === "pending" ? "---" : `${d2Deposit.toLocaleString()}원`}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1">국내 주식 주문 가능 예수금 잔액</p>
            </div>
          </div>

          {/* 카드 3: 평가손익 합계금액 */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">평가손익 합계</span>
              <div className={cn(
                "p-2 rounded-xl text-xs font-black flex items-center gap-0.5",
                isPnlPositive
                  ? "bg-red-50 dark:bg-red-950/40 text-red-500"
                  : "bg-blue-50 dark:bg-blue-950/40 text-blue-500"
              )}>
                {isPnlPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              </div>
            </div>
            <div>
              <h4 className={cn(
                "text-2xl font-black tracking-tight font-mono",
                isPnlPositive ? "text-red-500" : "text-blue-500"
              )}>
                {kiBalance.state === "pending" ? "---" : `${isPnlPositive ? "+" : ""}${totalPnl.toLocaleString()}원`}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1">전체 보유종목 누적 평가손익</p>
            </div>
          </div>

          {/* 카드 4: 총 수익률 */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">자산 증감 수익률</span>
              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h4 className={cn(
                "text-2xl font-black tracking-tight font-mono",
                isPnlPositive ? "text-red-500" : "text-blue-500"
              )}>
                {kiBalance.state === "pending" ? "---" : `${isPnlPositive ? "+" : ""}${pnlRate.toFixed(2)}%`}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1">매입금액 대비 실시간 자산 등락 변동률</p>
            </div>
          </div>
        </section>

        {/* --- Main Content 부 --- */}
        <div className="grid grid-cols-1 gap-12">

          {/* Section 1: Balance Result */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <InquireBalanceResult
              balanceKey={balanceKey}
              setBalanceKey={setBalanceKey}
              kiBalance={kiBalance as any}
              reqGetInquireBalance={reqGetInquireBalance}
              kakaoMemberList={kakaoMemberList}
              reqPostOrderCash={reqPostOrderCash}
            />
          </section>

          {/* Section 2: Realtime Trading Panel */}
          <section className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100">보유 종목 실시간 트레이딩 패널</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 text-xs font-black uppercase tracking-wider">
                    <th className="py-3 px-4">종목명</th>
                    <th className="py-3 px-4">종목코드</th>
                    <th className="py-3 px-4 text-right">보유수량 (주문가능)</th>
                    <th className="py-3 px-4 text-right">평가손익 (수익률)</th>
                    <th className="py-3 px-4 text-right">현재가 / 매입가</th>
                    <th className="py-3 px-4 text-center">즉시 주문 제어</th>
                  </tr>
                </thead>
                <tbody>
                  {kiBalance.output1 && kiBalance.output1.length > 0 ? (
                    kiBalance.output1.map((stock, idx) => {
                      const stockPnl = Number(stock.evlu_pfls_amt || 0);
                      const stockPnlRate = Number(stock.evlu_erng_rt || 0);
                      return (
                        <tr key={idx} className="border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                          <td className="py-4 px-4 font-bold text-zinc-800 dark:text-zinc-200">{stock.prdt_name}</td>
                          <td className="py-4 px-4 font-mono text-xs text-zinc-500">{stock.pdno}</td>
                          <td className="py-4 px-4 text-right font-semibold">
                            <div>{stock.hldg_qty}주</div>
                            <div className="text-xs text-zinc-400">가능: {stock.ord_psbl_qty}주</div>
                          </td>
                          <td className={cn("py-4 px-4 text-right font-mono font-bold", stockPnl >= 0 ? "text-red-500" : "text-blue-500")}>
                            <div>{stockPnl >= 0 ? "+" : ""}{stockPnl.toLocaleString()}원</div>
                            <div className="text-xs">{stockPnlRate >= 0 ? "+" : ""}{stockPnlRate.toFixed(2)}%</div>
                          </td>
                          <td className="py-4 px-4 text-right font-mono">
                            <div className="font-black text-zinc-900 dark:text-white">{Number(stock.prpr).toLocaleString()}원</div>
                            <div className="text-xs text-zinc-400">평균: {Number(stock.pchs_avg_pric).toLocaleString()}원</div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenOrderModal(stock.pdno, stock.prdt_name, stock.prpr, "BUY")}
                                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl transition-all shadow-sm shadow-red-500/20"
                              >
                                즉시매수
                              </button>
                              <button
                                onClick={() => handleOpenOrderModal(stock.pdno, stock.prdt_name, stock.prpr, "SELL")}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-sm shadow-blue-500/20"
                              >
                                즉시매도
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400 font-medium">
                        계좌 내 실시간 보유 종목 데이터가 존재하지 않습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2.5: 당일 주문 체결/미체결 여부 뷰어 */}
          <section className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                  {viewerTab === "ccnl" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100">당일 주거래 체결 및 미체결 내역</h3>
                  <p className="text-xs text-zinc-500">한국투자증권 실시간 오더 트래킹</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl self-start sm:self-center">
                <button
                  onClick={() => setViewerTab("ccnl")}
                  className={cn(
                    "px-4 py-2 rounded-lg font-black text-xs transition-all",
                    viewerTab === "ccnl"
                      ? "bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  )}
                >
                  당일 체결 내역 ({krCcnl.output?.length || 0})
                </button>
                <button
                  onClick={() => setViewerTab("nccs")}
                  className={cn(
                    "px-4 py-2 rounded-lg font-black text-xs transition-all",
                    viewerTab === "nccs"
                      ? "bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  )}
                >
                  당일 미체결 내역 ({krNccs.output?.length || 0})
                </button>
                <button
                  onClick={() => fetchOrderHistory(balanceKey)}
                  disabled={krCcnl.state === "pending" || krNccs.state === "pending"}
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors disabled:opacity-40"
                  title="새로고침"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", (krCcnl.state === "pending" || krNccs.state === "pending") && "animate-spin")} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 text-xs font-black uppercase tracking-wider">
                    <th className="py-3 px-4">주문시간/번호</th>
                    <th className="py-3 px-4">구분</th>
                    <th className="py-3 px-4">종목명</th>
                    <th className="py-3 px-4 text-right">주문가격/수량</th>
                    <th className="py-3 px-4 text-right">체결가격/수량</th>
                    <th className="py-3 px-4 text-right">미체결잔량</th>
                  </tr>
                </thead>
                <tbody>
                  {viewerTab === "ccnl" ? (
                    krCcnl.output && krCcnl.output.length > 0 ? (
                      krCcnl.output.map((item, idx) => (
                        <tr key={idx} className="border-b border-zinc-50 dark:border-zinc-900/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="py-4 px-4">
                            <span className="block font-semibold text-zinc-700 dark:text-zinc-300">
                              {formatTime(item.ccld_time)}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">No. {item.odno}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-black uppercase",
                              item.ord_dvsn_name?.includes("매수")
                                ? "bg-red-50 text-red-500 dark:bg-red-950/40"
                                : "bg-blue-50 text-blue-500 dark:bg-blue-950/40"
                            )}>
                              {item.ord_dvsn_name || "현금"}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-zinc-900 dark:text-white block">{item.prdt_name}</span>
                            <span className="text-xs font-mono text-zinc-400">{item.pdno}</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="block font-medium">{Number(item.ord_unpr).toLocaleString()}원</span>
                            <span className="text-xs text-zinc-500">{item.ord_qty}주</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="block font-black text-zinc-900 dark:text-white">
                              {Number(item.ccld_unpr) > 0 ? `${Number(item.ccld_unpr).toLocaleString()}원` : "-"}
                            </span>
                            <span className="text-xs font-bold text-emerald-500">{item.tot_ccld_qty}주 체결</span>
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-xs text-zinc-500">
                            {item.not_ccld_qty}주
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-400 font-medium">
                          금일 거래된 거래 내역이 존재하지 않습니다.
                        </td>
                      </tr>
                    )
                  ) : (
                    krNccs.output && krNccs.output.length > 0 ? (
                      krNccs.output.map((item, idx) => (
                        <tr key={idx} className="border-b border-zinc-50 dark:border-zinc-900/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="py-4 px-4">
                            <span className="block font-semibold text-zinc-700 dark:text-zinc-300">대기 중</span>
                            <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">No. {item.odno}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-black uppercase",
                              item.ord_dvsn_name?.includes("매수")
                                ? "bg-red-50 text-red-500 dark:bg-red-950/40"
                                : "bg-blue-50 text-blue-500 dark:bg-blue-950/40"
                            )}>
                              {item.ord_dvsn_name || "대기"}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-zinc-900 dark:text-white block">{item.prdt_name}</span>
                            <span className="text-xs font-mono text-zinc-400">{item.pdno}</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="block font-medium">{Number(item.ord_unpr).toLocaleString()}원</span>
                            <span className="text-xs text-zinc-500">{item.ord_qty}주</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="block text-zinc-400">-</span>
                            <span className="text-xs text-zinc-400">{item.tot_ccld_qty}주 완료</span>
                          </td>
                          <td className="py-4 px-4 text-right font-black text-amber-500 font-mono">
                            {item.ccld_nyqty || item.not_ccld_qty}주 남음
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-400 font-medium">
                          금일 남아있는 미체결 주문이 없습니다. 깨끗합니다!
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>

      {/* --- 수량 및 가격 조절 트레이딩 오더 레이어 모달(Modal) --- */}
      {isOrderModalOpen && selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2.5 py-1 rounded-xl text-xs font-black tracking-wider uppercase",
                  orderType === "BUY" ? "bg-red-500 text-white" : "bg-blue-600 text-white"
                )}>
                  {orderType === "BUY" ? "매수 주문 가동" : "매도 주문 가동"}
                </span>
                <span className="text-xs text-zinc-400 font-mono">ID: {balanceKey}</span>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-xl font-black text-zinc-900 dark:text-white mb-1">{selectedStock.name}</h4>
              <p className="text-xs font-mono text-zinc-400">{selectedStock.pdno}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">주문 가격 (원)</label>
                <input
                  type="text"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-right font-mono font-bold text-lg focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="가격을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">주문 수량 (주)</label>
                <input
                  type="number"
                  min="1"
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-right font-mono font-bold text-lg focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="1"
                />
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-sm font-medium space-y-2">
                <div className="flex justify-between text-zinc-500">
                  <span>예상 총액</span>
                  <span className="font-mono text-zinc-900 dark:text-white font-bold">
                    {(Number(customPrice || 0) * Number(orderQty || 0)).toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="flex-1 py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-sm rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleExecuteOrder}
                disabled={orderCashState.state === "pending"}
                className={cn(
                  "flex-1 py-3.5 text-white font-black text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2",
                  orderType === "BUY"
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20",
                  orderCashState.state === "pending" && "opacity-50 pointer-events-none"
                )}
              >
                {orderCashState.state === "pending" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : orderType === "BUY" ? (
                  "매수 전송"
                ) : (
                  "매도 전송"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}