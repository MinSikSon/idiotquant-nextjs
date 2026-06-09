"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, ChevronRight, MapPin,
  Clock, Wallet, Coins, Percent,
  Database, User, PieChart, BarChart3, ClipboardList, Power,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  reqGetInquireBalance, getKoreaInvestmentBalance,
  getKoreaInvestmentOrderCash, KoreaInvestmentOrderCash,
  reqPostOrderCash, getKoreaInvestmentInquireKrCcnl,
  getKoreaInvestmentInquireKrNccs, KoreaInvestmentInquireCcnl,
  KoreaInvestmentInquireNccs, reqGetInquireCcnl, reqGetInquireNccs
} from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqGetCapitalToken } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { fetchTradingStatus, setTradingActive } from "@/lib/features/algorithmTrade/tradingStatusAPI";
import {
  reqGetKakaoMemberList, selectKakaoMemberList,
  selectKakaoTotal, KakaoTotal
} from "@/lib/features/kakao/kakaoSlice";
import {
  KrUsCapitalType, reqGetKrCapital,
  reqPostKrCapitalTokenMinusAll, reqPostKrCapitalTokenMinusOne,
  reqPostKrCapitalTokenPlusAll, reqPostKrCapitalTokenPlusOne,
  selectKrCapital, selectKrCapitalTokenMinusAll,
  selectKrCapitalTokenMinusOne, selectKrCapitalTokenPlusAll,
  selectKrCapitalTokenPlusOne
} from "@/lib/features/capital/capitalSlice";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import StockListTable from "@/components/balance/stockListTable";
import { PortfolioChartSection } from "@/components/balance/portfolioChart";
import { SectionNav, type NavSection } from "@/components/balance/sectionNav";
import {
  useToast, ToastContainer,
  LoadingState, SectionHeader, SectionPanel, EmptyRow,
  KpiCard, TableHeader, OrderTabAction, OrderSectionIcon,
  BalanceHeaderActions, PnlIcon, pnlIconBg, pnlValueColor, pnlAccentColor,
  formatTime,
} from "@/components/balance/shared";
import { cn } from "@/lib/utils";

// =========================================================================
// 타입 정의
// =========================================================================
type ApiState = "init" | "req" | "pending" | "fulfilled" | "rejected";

interface KoreaInvestmentBalanceStockInfo {
  bfdy_buy_qty: string; bfdy_cprs_icdc: string; bfdy_sll_qty: string;
  evlu_amt: string; evlu_erng_rt: string; evlu_pfls_amt: string;
  evlu_pfls_rt: string; expd_dt: string; fltt_rt: string;
  grta_rt_name: string; hldg_qty: string; item_mgna_rt_name: string;
  loan_amt: string; loan_dt: string; ord_psbl_qty: string;
  pchs_amt: string; pchs_avg_pric: string; pdno: string;
  prdt_name: string; prpr: string; sbst_pric: string;
  stck_loan_unpr: string; stln_slng_chgs: string; thdt_buyqty: string;
  thdt_sll_qty: string; trad_dvsn_name: string;
}

interface KoreaInvestmentBalanceOutput2 {
  asst_icdc_amt: string; asst_icdc_erng_rt: string; bfdy_buy_amt: string;
  bfdy_sll_amt: string; bfdy_tlex_amt: string; bfdy_tot_asst_evlu_amt: string;
  cma_evlu_amt: string; d2_auto_rdpt_amt: string; dnca_tot_amt: string;
  evlu_amt_smtl_amt: string; evlu_pfls_smtl_amt: string;
  fncg_gld_auto_rdpt_yn: string; nass_amt: string; nxdy_auto_rdpt_amt: string;
  nxdy_excc_amt: string; pchs_amt_smtl_amt: string; prvs_rcdl_excc_amt: string;
  scts_evlu_amt: string; thdt_buy_amt: string; thdt_sll_amt: string;
  thdt_tlex_amt: string; tot_evlu_amt: string; tot_loan_amt: string;
  tot_stln_slng_chgs: string;
}

export interface KoreaInvestmentBalance {
  state: ApiState;
  ctx_area_fk100: string; ctx_area_nk100: string;
  msg1: string; msg_cd: string;
  output1: KoreaInvestmentBalanceStockInfo[];
  output2: KoreaInvestmentBalanceOutput2[];
  rt_cd: string;
}

// =========================================================================
// 상세 지표 칩 (스크롤 스트립용)
// =========================================================================
function MetricChip({ label, value, valueClass = "text-neutral-900 dark:text-neutral-100" }: {
  label: string; value: string; valueClass?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] rounded-xl px-4 py-2.5 flex flex-col gap-0.5 shrink-0">
      <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest whitespace-nowrap">{label}</span>
      <span className={cn("text-xs font-mono font-black whitespace-nowrap", valueClass)}>{value}</span>
    </div>
  );
}

// =========================================================================
// 체결/미체결 행
// =========================================================================
function OrderRow({ item, isNccs }: { item: any; isNccs: boolean }) {
  const isBuy = item.ord_dvsn_name?.includes("매수") || item.sll_buy_dvsn_cd === "02";
  return (
    <tr className="hover:bg-[#f5f0e8] dark:hover:bg-[#242320]/40 transition-colors group">
      <td className="py-3.5 px-4">
        <span className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          {isNccs ? "대기 중" : formatTime(item.ccld_time)}
        </span>
        <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">No. {item.odno}</span>
      </td>
      <td className="py-3.5 px-4">
        <span className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide",
          isBuy
            ? "bg-red-50 text-red-500 dark:bg-red-950/40"
            : "bg-[#f0fdf4] text-[#f0fdf4]0 dark:bg-[#052e16]/40"
        )}>
          {item.ord_dvsn_name || (isNccs ? "대기" : "현금")}
        </span>
      </td>
      <td className="py-3.5 px-4">
        <span className="font-bold text-neutral-900 dark:text-white text-xs block">{item.prdt_name}</span>
        <span className="text-[10px] font-mono text-neutral-400">{item.pdno}</span>
      </td>
      <td className="py-3.5 px-4 text-right">
        <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {Number(item.ord_unpr).toLocaleString()}원
        </span>
        <span className="text-[10px] text-neutral-400">{item.ord_qty}주</span>
      </td>
      <td className="py-3.5 px-4 text-right">
        {isNccs ? (
          <>
            <span className="block text-xs text-neutral-400">-</span>
            <span className="text-[10px] text-neutral-400">{item.tot_ccld_qty}주 완료</span>
          </>
        ) : (
          <>
            <span className="block text-xs font-black text-neutral-900 dark:text-white">
              {Number(item.ccld_unpr) > 0 ? `${Number(item.ccld_unpr).toLocaleString()}원` : "-"}
            </span>
            <span className="text-[10px] font-bold text-emerald-500">{item.tot_ccld_qty}주</span>
          </>
        )}
      </td>
      <td className="py-3.5 px-4 text-right">
        <span className={cn(
          "text-xs font-mono font-black px-2 py-0.5 rounded-full",
          isNccs
            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30"
            : "text-neutral-400"
        )}>
          {(item.ccld_nyqty || item.not_ccld_qty || 0)}주
        </span>
      </td>
    </tr>
  );
}

// =========================================================================
// 페이지 내보내기
// =========================================================================
export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="계좌 데이터를 불러오는 중..." />}>
      <BalanceKr />
    </Suspense>
  );
}

// =========================================================================
// 메인 컴포넌트
// =========================================================================
function BalanceKr() {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const kiBalance = useAppSelector(getKoreaInvestmentBalance) as unknown as KoreaInvestmentBalance;
  const krCapital = useAppSelector(selectKrCapital) as KrUsCapitalType;
  const kakaoTotal = useAppSelector(selectKakaoTotal) as KakaoTotal;
  const kakaoMemberList = useAppSelector(selectKakaoMemberList);
  const orderCashState = useAppSelector(getKoreaInvestmentOrderCash) as KoreaInvestmentOrderCash;
  const krCcnl = useAppSelector(getKoreaInvestmentInquireKrCcnl) as KoreaInvestmentInquireCcnl;
  const krNccs = useAppSelector(getKoreaInvestmentInquireKrNccs) as KoreaInvestmentInquireNccs;
  const krCapitalPlusAll = useAppSelector(selectKrCapitalTokenPlusAll);
  const krCapitalPlusOne = useAppSelector(selectKrCapitalTokenPlusOne);
  const krCapitalMinusAll = useAppSelector(selectKrCapitalTokenMinusAll);
  const krCapitalMinusOne = useAppSelector(selectKrCapitalTokenMinusOne);

  const [balanceKey, setBalanceKey] = useState(searchParams.get("key") || String(session?.user?.id || ""));
  const [viewerTab, setViewerTab] = useState<"ccnl" | "nccs">("ccnl");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tradingActive, setTradingActiveState] = useState<boolean | null>(null);
  const [tradingLoading, setTradingLoading] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const fetchOrderHistory = useCallback((key: string) => {
    if (!key || key === "undefined") return;
    dispatch(reqGetInquireCcnl({ DV: "0", kakaoId: key }));
    dispatch(reqGetInquireNccs({ DV: "1", kakaoId: key }));
  }, [dispatch]);

  const handleOrderResult = useCallback((status: "success" | "error", message: string) => {
    addToast(status, message);
    if (status === "success") {
      dispatch(reqGetInquireBalance(balanceKey));
      fetchOrderHistory(balanceKey);
      setLastUpdated(new Date());
      // KIS API 체결 반영 지연 대비 2초 후 재조회
      setTimeout(() => {
        dispatch(reqGetInquireBalance(balanceKey));
        fetchOrderHistory(balanceKey);
      }, 2000);
    }
  }, [balanceKey, dispatch, fetchOrderHistory, addToast]);

  const handleRefresh = useCallback(() => {
    if (!balanceKey || balanceKey === "undefined") return;
    dispatch(reqGetInquireBalance(balanceKey));
    fetchOrderHistory(balanceKey);
    dispatch(reqGetKrCapital(balanceKey));
  }, [balanceKey, dispatch, fetchOrderHistory]);

  const handleToggleTrading = useCallback(async () => {
    if (tradingLoading || tradingActive === null) return;
    setTradingLoading(true);
    const next = !tradingActive;
    const ok = await setTradingActive("KR", next);
    if (ok) {
      setTradingActiveState(next);
      addToast("success", `국내 자동매매가 ${next ? "활성화" : "비활성화"}되었습니다.`);
    } else {
      addToast("error", "자동매매 상태 변경에 실패했습니다.");
    }
    setTradingLoading(false);
  }, [tradingActive, tradingLoading, addToast]);

  useEffect(() => {
    const urlKey = searchParams.get("key");
    if (urlKey && urlKey !== balanceKey) setBalanceKey(urlKey);
  }, [searchParams]);

  useEffect(() => {
    if (!balanceKey || balanceKey === "undefined") return;
    router.replace(`${pathname}?key=${balanceKey}`);
    dispatch(reqGetInquireBalance(balanceKey));
    fetchOrderHistory(balanceKey);
    dispatch(reqGetKrCapital(balanceKey));
  }, [balanceKey]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any)?.role !== "admin") {
      router.replace("/");
      return;
    }
    if (session.user?.id && !searchParams.get("key")) {
      dispatch(reqGetInquireBalance(String(session.user.id)));
      setBalanceKey(String(session.user.id));
    }
    dispatch(reqGetCapitalToken());
    dispatch(reqGetKakaoMemberList());
    fetchTradingStatus("KR").then(v => { if (v !== null) setTradingActiveState(v); });
  }, [session, status, dispatch, router]);

  useEffect(() => {
    if (krCapital.state === "init" && balanceKey) {
      dispatch(reqGetKrCapital(balanceKey));
    }
  }, [krCapital.state, balanceKey]);

  useEffect(() => {
    const states = [krCapitalPlusAll?.state, krCapitalPlusOne?.state, krCapitalMinusAll?.state, krCapitalMinusOne?.state];
    if (states.some(s => s === "fulfilled")) {
      dispatch(reqGetKrCapital(balanceKey));
      addToast("success", "토큰 잔액이 업데이트되었습니다.");
    }
  }, [krCapitalPlusAll?.state, krCapitalPlusOne?.state, krCapitalMinusAll?.state, krCapitalMinusOne?.state]);

  useEffect(() => {
    if (kiBalance.state === "fulfilled") setLastUpdated(new Date());
  }, [kiBalance.state]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (balanceKey) dispatch(reqGetInquireBalance(balanceKey));
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, balanceKey, dispatch]);

  const doTokenPlusAll = (num: number) => dispatch(reqPostKrCapitalTokenPlusAll({ key: balanceKey, num }));
  const doTokenPlusOne = (num: number, ticker: string) => ticker && dispatch(reqPostKrCapitalTokenPlusOne({ key: balanceKey, num, ticker }));
  const doTokenMinusAll = (num: number) => dispatch(reqPostKrCapitalTokenMinusAll({ key: balanceKey, num }));
  const doTokenMinusOne = (num: number, ticker: string) => ticker && dispatch(reqPostKrCapitalTokenMinusOne({ key: balanceKey, num, ticker }));

  const summary = kiBalance.output2?.[0] || {};
  const totalEvalAmt = Number(summary.tot_evlu_amt || 0);
  const d2Deposit = Number(summary.dnca_tot_amt || 0);
  const totalPnl = Number(summary.evlu_pfls_smtl_amt || 0);
  const pchs = Number(summary.pchs_amt_smtl_amt || 1);
  const pnlRate = pchs > 0 ? (totalPnl / pchs) * 100 : Number(summary.asst_icdc_erng_rt || 0);
  const isPnlPositive = totalPnl >= 0;
  const isLoading = kiBalance.state === "pending";
  const hasCapital = krCapital.state === "fulfilled" || krCapital.state === "pending";

  // 추가 지표
  const sctsEvluAmt = Number(summary.scts_evlu_amt || 0);
  const cmaEvluAmt = Number(summary.cma_evlu_amt || 0);
  const nassAmt = Number(summary.nass_amt || 0);
  const asstIcdcAmt = Number(summary.asst_icdc_amt || 0);
  const asstIcdcErngRt = Number(summary.asst_icdc_erng_rt || 0);
  const thdtBuyAmt = Number(summary.thdt_buy_amt || 0);
  const thdtSllAmt = Number(summary.thdt_sll_amt || 0);
  const totLoanAmt = Number(summary.tot_loan_amt || 0);
  const isDailyPositive = asstIcdcAmt >= 0;

  const currentKakaoUser = (() => {
    const list = Array.isArray(kakaoMemberList)
      ? kakaoMemberList
      : Array.isArray((kakaoMemberList as any)?.list)
      ? (kakaoMemberList as any).list
      : [];
    return list.find((u: any) => String(u.id) === String(balanceKey)) ?? null;
  })();

  // 섹션 네비게이션 구성
  const navSections: NavSection[] = [
    { id: "section-kpi", label: "KPI", icon: <Wallet size={13} /> },
    { id: "section-portfolio", label: "포트폴리오", icon: <PieChart size={13} /> },
    { id: "section-balance", label: "잔고", icon: <BarChart3 size={13} /> },
    ...(hasCapital ? [{ id: "section-stocks", label: "종목관리", icon: <Database size={13} /> }] : []),
    { id: "section-orders", label: "주문내역", icon: <ClipboardList size={13} /> },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] transition-colors duration-300">

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-10 space-y-6">

        {/* 헤더 */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="space-y-2.5">
            {/* 브레드크럼 */}
            <nav className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 flex-wrap">
              <span className="flex items-center gap-1">
                <LayoutDashboard size={12} />
                투자 현황
              </span>
              <ChevronRight size={11} className="text-neutral-300 dark:text-neutral-600" />
              <span className="flex items-center gap-1 text-[#16a34a] dark:text-[#16a34a] bg-[#f0fdf4] dark:bg-[#14532d]/20 px-2 py-0.5 rounded-md">
                <MapPin size={11} />한국(KR)
              </span>
              {currentKakaoUser && (
                <>
                  <ChevronRight size={11} className="text-neutral-300 dark:text-neutral-600" />
                  <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-300 bg-neutral-200/60 dark:bg-[#242320] px-2 py-0.5 rounded-md">
                    <User size={10} />
                    {currentKakaoUser.name || balanceKey}
                  </span>
                </>
              )}
            </nav>

            {/* 타이틀 */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter bg-gradient-to-r from-neutral-900 to-neutral-500 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
                Portfolio Balance
              </h1>
              <span className="text-2xl select-none" aria-hidden>🇰🇷</span>
              {!isLoading && totalEvalAmt > 0 && (
                <span className="text-sm font-mono font-black text-neutral-400 dark:text-neutral-500 bg-[#faf9f7] dark:bg-[#242320] px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-[#3a3834]">
                  {totalEvalAmt.toLocaleString()}원
                </span>
              )}
            </div>

            {/* 마지막 업데이트 */}
            {lastUpdated ? (
              <p className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
                <Clock size={11} />
                {lastUpdated.toLocaleTimeString("ko-KR")} 기준
              </p>
            ) : (
              <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-[#242320] animate-pulse" />
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <BalanceHeaderActions
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={() => setAutoRefresh(v => !v)}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              extra={tradingActive !== null ? (
                <button
                  onClick={handleToggleTrading}
                  disabled={tradingLoading}
                  title={tradingActive ? "자동매매 비활성화" : "자동매매 활성화"}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                    tradingActive
                      ? "bg-[#f0fdf4] dark:bg-[#14532d]/30 text-[#16a34a] border-[#86efac] dark:border-[#166534]"
                      : "bg-white dark:bg-[#242320] text-neutral-400 border-neutral-200 dark:border-[#35332e] hover:border-neutral-400",
                    tradingLoading && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <Power size={13} className={tradingActive ? "text-[#16a34a]" : ""} />
                  {tradingActive ? "자동매매 ON" : "자동매매 OFF"}
                </button>
              ) : undefined}
            />
            <span className="text-[10px] font-mono text-neutral-400 bg-[#faf9f7] dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] px-2.5 py-1 rounded-lg">
              ID: {String(balanceKey).slice(0, 8) || "N/A"}
            </span>
          </div>
        </header>

        <div className="h-px bg-gradient-to-r from-transparent via-[#86efac] dark:via-[#166534] to-transparent opacity-60" />

        {/* 섹션 네비게이션 */}
        <SectionNav sections={navSections} />

        {/* KPI 카드 */}
        <section id="section-kpi" className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <KpiCard
            label="총 평가 금액"
            value={isLoading ? null : `${totalEvalAmt.toLocaleString()}원`}
            sub={isLoading ? "" : `주식 ${sctsEvluAmt.toLocaleString()}원 · CMA ${cmaEvluAmt.toLocaleString()}원`}
            icon={<Wallet size={15} />}
            iconBg="bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#f0fdf4]0"
            accentColor="bg-[#16a34a] dark:bg-[#16a34a]"
          />
          <KpiCard
            label="예수금 (D+2)"
            value={isLoading ? null : `${d2Deposit.toLocaleString()}원`}
            sub={isLoading ? "" : `순자산 ${nassAmt.toLocaleString()}원`}
            icon={<Coins size={15} />}
            iconBg="bg-amber-50 dark:bg-amber-950/40 text-amber-500"
            accentColor="bg-amber-400 dark:bg-amber-600"
          />
          <KpiCard
            label="평가손익 합계"
            value={isLoading ? null : `${isPnlPositive ? "▲ +" : "▼ "}${totalPnl.toLocaleString()}원`}
            sub={isLoading ? "" : `매입원금 ${pchs.toLocaleString()}원`}
            icon={<PnlIcon positive={isPnlPositive} />}
            iconBg={pnlIconBg(isPnlPositive)}
            valueColor={pnlValueColor(isPnlPositive)}
            accentColor={pnlAccentColor(isPnlPositive)}
          />
          <KpiCard
            label="자산 수익률"
            value={isLoading ? null : `${isPnlPositive ? "▲ +" : "▼ "}${pnlRate.toFixed(2)}%`}
            sub={isLoading ? "" : `당일 증감 ${isDailyPositive ? "+" : ""}${asstIcdcErngRt.toFixed(2)}%`}
            icon={<Percent size={15} />}
            iconBg="bg-[#faf9f7] dark:bg-[#242320] text-neutral-500"
            valueColor={pnlValueColor(isPnlPositive)}
            accentColor={pnlAccentColor(isPnlPositive)}
          />
        </section>

        {/* 상세 지표 스트립 */}
        {!isLoading && (
          <div className="overflow-x-auto no-scrollbar -mt-1">
            <div className="flex gap-2 min-w-max pb-0.5">
              <MetricChip
                label="당일 등락"
                value={`${isDailyPositive ? "▲ +" : "▼ "}${asstIcdcAmt.toLocaleString()}원`}
                valueClass={isDailyPositive ? "text-rose-500" : "text-[#f0fdf4]0"}
              />
              <MetricChip
                label="금일 매수"
                value={`${thdtBuyAmt.toLocaleString()}원`}
                valueClass="text-rose-400 dark:text-rose-400"
              />
              <MetricChip
                label="금일 매도"
                value={`${thdtSllAmt.toLocaleString()}원`}
                valueClass="text-[#16a34a] dark:text-[#16a34a]"
              />
              <MetricChip
                label="금일 매수 - 매도"
                value={`${(thdtBuyAmt - thdtSllAmt) >= 0 ? "+" : ""}${(thdtBuyAmt - thdtSllAmt).toLocaleString()}원`}
                valueClass={(thdtBuyAmt - thdtSllAmt) >= 0 ? "text-rose-500" : "text-[#f0fdf4]0"}
              />
              <MetricChip
                label="CMA 평가"
                value={`${cmaEvluAmt.toLocaleString()}원`}
              />
              <MetricChip
                label="유가증권 평가"
                value={`${sctsEvluAmt.toLocaleString()}원`}
                valueClass="text-indigo-600 dark:text-indigo-400"
              />
              {totLoanAmt > 0 && (
                <MetricChip
                  label="대출 잔고"
                  value={`${totLoanAmt.toLocaleString()}원`}
                  valueClass="text-orange-500"
                />
              )}
            </div>
          </div>
        )}

        {/* 포트폴리오 자산 구성 */}
        <SectionPanel id="section-portfolio">
          <SectionHeader
            icon={<PieChart size={16} />}
            title="포트폴리오 자산 구성"
            subtitle="보유 종목별 평가금액 및 수익률 시각화"
          />
          <PortfolioChartSection
            output1={kiBalance.output1 || []}
            isUs={false}
            isLoading={isLoading}
          />
        </SectionPanel>

        {/* 잔고 조회 패널 */}
        <SectionPanel id="section-balance">
          <InquireBalanceResult
            balanceKey={balanceKey}
            setBalanceKey={setBalanceKey}
            kiBalance={kiBalance as any}
            reqGetInquireBalance={reqGetInquireBalance}
            kakaoMemberList={kakaoMemberList}
            reqPostOrderCash={reqPostOrderCash}
            kiOrderCash={orderCashState}
            onOrderResult={handleOrderResult}
          />
        </SectionPanel>

        {/* NCAV 운용 종목 관리 패널 */}
        {hasCapital && (
          <SectionPanel id="section-stocks">
            <SectionHeader
              icon={<Database size={16} />}
              title="NCAV 운용 종목 관리"
              subtitle="전략 자동매매 종목 풀 및 토큰(예산) 관리"
              badge={
                krCapital.state === "pending"
                  ? <span className="text-[10px] font-mono text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">로딩 중</span>
                  : krCapital.stock_list?.length > 0
                  ? <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-[#faf9f7] dark:bg-[#242320] px-2 py-0.5 rounded-full">{krCapital.stock_list.length}종목</span>
                  : null
              }
            />
            <StockListTable
              data={krCapital}
              kakaoTotal={kakaoTotal}
              doTokenPlusAll={doTokenPlusAll}
              doTokenPlusOne={doTokenPlusOne}
              doTokenMinusAll={doTokenMinusAll}
              doTokenMinusOne={doTokenMinusOne}
              session={session}
            />
          </SectionPanel>
        )}

        {/* 체결 / 미체결 내역 */}
        <SectionPanel id="section-orders">
          <SectionHeader
            icon={<OrderSectionIcon viewerTab={viewerTab} />}
            title="당일 주문 내역"
            subtitle="한국투자증권 실시간 체결 및 미체결 조회"
            action={
              <OrderTabAction
                viewerTab={viewerTab}
                setViewerTab={setViewerTab}
                ccnlCount={krCcnl.output?.length || 0}
                nccsCount={krNccs.output?.length || 0}
                isPending={krCcnl.state === "pending" || krNccs.state === "pending"}
                onRefresh={() => fetchOrderHistory(balanceKey)}
              />
            }
          />

          <div className="overflow-x-auto rounded-xl border border-neutral-100 dark:border-[#35332e]">
            <table className="w-full text-sm text-left min-w-[600px]">
              <TableHeader headers={[
                { label: "주문시간 / 번호" },
                { label: "구분" },
                { label: "종목" },
                { label: "주문가 / 수량", align: "text-right" },
                { label: "체결가 / 수량", align: "text-right" },
                { label: "미체결", align: "text-right" },
              ]} />
              <tbody className="divide-y divide-neutral-50 dark:divide-[#35332e]/40">
                {viewerTab === "ccnl" ? (
                  krCcnl.output?.length > 0
                    ? krCcnl.output.map((item, i) => (
                        <OrderRow key={i} item={item} isNccs={false} />
                      ))
                    : <EmptyRow colSpan={6} message="금일 체결된 거래 내역이 없습니다." />
                ) : (
                  krNccs.output?.length > 0
                    ? krNccs.output.map((item, i) => (
                        <OrderRow key={i} item={item} isNccs={true} />
                      ))
                    : <EmptyRow colSpan={6} message="금일 미체결 주문이 없습니다." />
                )}
              </tbody>
            </table>
          </div>
        </SectionPanel>

      </div>
    </div>
  );
}
