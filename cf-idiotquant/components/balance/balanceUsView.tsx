"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Globe, ChevronRight, DollarSign, Building2,
  Wallet, TrendingUp, BarChart3, RefreshCw,
  AlertCircle, Database,
  ArrowDownRight, PieChart, ClipboardList, TrendingDown, Power, SlidersHorizontal,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  reqFetchTradingStatus,
  reqSetTradingActive,
  selectTradingStatus,
} from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import {
  reqGetOverseasStockTradingInquirePresentBalance,
  getKoreaInvestmentUsMaretPresentBalance,
  reqPostOrderUs,
  getKoreaInvestmentUsOrder,
  getKoreaInvestmentUsMaretNccs,
  reqGetOverseasStockTradingInquireNccs,
  getKoreaInvestmentUsMaretCcnl,
  reqGetOverseasStockTradingInquireCcnl,
  KoreaInvestmentOverseasPresentBalance,
  KoreaInvestmentOverseasCcnl,
  KoreaInvestmentOverseasNccs,
  KoreaInvestmentUsOrder
} from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import {
  KakaoTotal, reqGetKakaoMemberList,
  selectKakaoMemberList, selectKakaoTotal
} from "@/lib/features/kakao/kakaoSlice";
import {
  KrUsCapitalType, reqGetUsCapital,
  reqPostUsCapitalTokenPlusAll, reqPostUsCapitalTokenPlusOne,
  reqPostUsCapitalTokenMinusAll, reqPostUsCapitalTokenMinusOne,
  selectUsCapital, selectUsCapitalTokenMinusAll,
  selectUsCapitalTokenPlusAll, selectUsCapitalTokenPlusOne,
  selectUsCapitalTokenMinusOne,
  reqPostUsCapitalTokenResetAll, reqPostUsCapitalTokenResetOne,
  selectUsCapitalTokenResetAll, selectUsCapitalTokenResetOne,
  reqPostUsCapitalGroupCreate, reqPostUsCapitalGroupUpdate,
  reqPostUsCapitalGroupDelete, reqPostUsCapitalStockGroup, reqPostUsCapitalStocksGroup, reqPostUsCapitalLikesCopy,
  reqPostUsCapitalStockRemove,
  selectUsGroupOp,
  reqGetUsQuantRule, reqPostUsQuantRule, selectUsQuantRule,
} from "@/lib/features/capital/capitalSlice";
import { reqGetMyLikes, selectLikedList } from "@/lib/features/stockLikes/stockLikesSlice";
import { getQuotationsPriceDetail } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketAPI";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import QuantRuleEditor from "@/components/balance/quantRuleEditor";
import TradingFlowSummary from "@/components/balance/tradingFlowSummary";
import StockListTable from "@/components/balance/stockListTable";
import { PortfolioChartSection } from "@/components/balance/portfolioChart";
import { type NavSection } from "@/components/balance/sectionNav";
import { BalanceShell } from "@/components/balance/balanceShell";
import {
  useToast,
  SectionHeader, SectionPanel, EmptyRow,
  UsdKpiCard, MetricChip, TableHeader, OrderTabAction, OrderSectionIcon,
  PnlIcon, pnlIconBg, pnlValueColor, pnlAccentColor,
  fmtUsd, fmtKrw, formatTime,
} from "@/components/balance/shared";
import { cn } from "@/lib/utils";

// =========================================================================
// 해외 주문 행
// =========================================================================
function OverseasOrderRow({ item, isNccs }: { item: any; isNccs: boolean }) {
  const isBuy = item.sll_buy_dvsn_cd_name?.includes("매수") || item.sll_buy_dvsn_cd === "02";
  const hasPartialFill = Number(item.ft_ccld_qty || 0) > 0;

  return (
    <tr className="hover:bg-[#f5f0e8] dark:hover:bg-[#242320]/40 transition-colors group">
      <td className="py-3.5 px-4">
        <span className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          {formatTime(item.ord_tmd)}
        </span>
        <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">No. {item.odno}</span>
      </td>
      <td className="py-3.5 px-4">
        <span className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide",
          isBuy ? "bg-red-50 text-red-500 dark:bg-red-950/40" : "bg-[#f0fdf4] text-[#16a34a] dark:bg-[#052e16]/40"
        )}>
          {item.sll_buy_dvsn_cd_name || (isBuy ? "매수" : "매도")}
        </span>
      </td>
      <td className="py-3.5 px-4">
        <span className="font-bold text-neutral-900 dark:text-white text-xs block">{item.prdt_name}</span>
        <span className="text-[10px] font-mono text-neutral-400 uppercase">{item.tr_mket_name || item.tr_crcy_cd}</span>
      </td>
      <td className="py-3.5 px-4 text-right font-mono">
        <span className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">{item.ft_ord_qty || "-"}</span>
        <span className="text-[10px] text-neutral-400">주문</span>
      </td>
      <td className="py-3.5 px-4 text-right font-mono">
        {hasPartialFill ? (
          <>
            <span className="block text-xs font-black text-neutral-900 dark:text-white">{item.ft_ccld_qty}</span>
            <span className="text-[10px] font-bold text-emerald-500">체결</span>
          </>
        ) : (
          <span className="text-xs text-neutral-400">-</span>
        )}
      </td>
      <td className="py-3.5 px-4 text-right font-mono">
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
          {Number(item.ft_ord_unpr3 || 0) > 0 ? fmtUsd(item.ft_ord_unpr3) : "-"}
        </span>
        {hasPartialFill && (
          <span className="text-[10px] text-neutral-400">{fmtUsd(item.ft_ccld_unpr3)} 체결가</span>
        )}
      </td>
      <td className="py-3.5 px-4 text-right font-mono">
        {hasPartialFill && Number(item.ft_ccld_amt3 || 0) > 0
          ? <span className="text-xs font-black text-neutral-900 dark:text-white">{fmtUsd(item.ft_ccld_amt3)}</span>
          : <span className="text-xs text-neutral-400">-</span>
        }
      </td>
      <td className="py-3.5 px-4 text-center">
        <span className={cn(
          "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide",
          item.prcs_stat_name?.includes("체결") || item.prcs_stat_name?.includes("완료")
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
            : isNccs
            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
            : "bg-[#faf9f7] text-neutral-500 dark:bg-[#242320]"
        )}>
          {item.prcs_stat_name || (isNccs ? "대기" : "-")}
        </span>
      </td>
      <td className="py-3.5 px-4 text-right font-mono">
        <span className={cn(
          "text-xs font-black px-2 py-0.5 rounded-full",
          Number(item.nccs_qty || 0) > 0
            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30"
            : "text-neutral-400"
        )}>
          {item.nccs_qty || 0}주
        </span>
      </td>
    </tr>
  );
}

// =========================================================================
// 메인 컴포넌트
// =========================================================================
export function BalanceUsView({ countryToggle }: { countryToggle?: React.ReactNode }) {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const kiBalance = useAppSelector(getKoreaInvestmentUsMaretPresentBalance) as KoreaInvestmentOverseasPresentBalance;
  const kiCcnl = useAppSelector(getKoreaInvestmentUsMaretCcnl) as KoreaInvestmentOverseasCcnl;
  const kiNccs = useAppSelector(getKoreaInvestmentUsMaretNccs) as KoreaInvestmentOverseasNccs;
  const kiUsOrder = useAppSelector(getKoreaInvestmentUsOrder) as KoreaInvestmentUsOrder;
  const kakaoTotal = useAppSelector(selectKakaoTotal) as KakaoTotal;
  const kakaoMemberList = useAppSelector(selectKakaoMemberList);
  const usCapital = useAppSelector(selectUsCapital) as KrUsCapitalType;
  const usCapitalPlusAll = useAppSelector(selectUsCapitalTokenPlusAll);
  const usCapitalPlusOne = useAppSelector(selectUsCapitalTokenPlusOne);
  const usCapitalMinusAll = useAppSelector(selectUsCapitalTokenMinusAll);
  const usCapitalMinusOne = useAppSelector(selectUsCapitalTokenMinusOne);
  const usCapitalResetAll = useAppSelector(selectUsCapitalTokenResetAll);
  const usCapitalResetOne = useAppSelector(selectUsCapitalTokenResetOne);
  const usGroupOp = useAppSelector(selectUsGroupOp);
  const usQuantRule = useAppSelector(selectUsQuantRule);
  const likedListAll = useAppSelector(selectLikedList);
  const usLikedList = useMemo(() => (likedListAll ?? []).filter((l: any) => !!l.is_us), [likedListAll]);
  const isMaster = useMemo(() => session?.user?.name === process.env.NEXT_PUBLIC_MASTER, [session]);

  // US 좋아요 종목은 stock_data_daily(KR 전용)에 없어 지표가 비어온다.
  // KIS overseas price-detail 로 per/pbr/eps/bps 를 보강한다.
  const [usLikeMetrics, setUsLikeMetrics] = useState<Record<string, { per?: number; pbr?: number; eps?: number; bps?: number }>>({});
  const metricsFetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const tickers = new Set<string>();
    (usLikedList ?? []).forEach((l: any) => { if (l?.ticker) tickers.add(String(l.ticker)); });
    (usCapital?.stock_list ?? []).forEach((s: any) => { if (s?.group_id === "__likes__" && s?.symbol) tickers.add(String(s.symbol)); });
    const todo = [...tickers].filter(t => !metricsFetchedRef.current.has(t));
    if (todo.length === 0) return;
    let cancelled = false;
    const num = (v: any) => { const n = Number(v); return (v != null && v !== "" && Number.isFinite(n)) ? n : undefined; };
    (async () => {
      const limit = 3;
      for (let i = 0; i < todo.length; i += limit) {
        const batch = todo.slice(i, i + limit);
        const results = await Promise.all(batch.map(async (t) => {
          metricsFetchedRef.current.add(t);
          try {
            const res = await getQuotationsPriceDetail(t);
            const o = res?.output ?? {};
            return [t, { per: num(o.perx), pbr: num(o.pbrx), eps: num(o.epsx), bps: num(o.bpsx) }] as const;
          } catch { return [t, {}] as const; }
        }));
        if (cancelled) return;
        setUsLikeMetrics(prev => { const next = { ...prev }; for (const [t, m] of results) next[t] = m; return next; });
      }
    })();
    return () => { cancelled = true; };
  }, [usLikedList, usCapital]);

  const tradingStatus = useAppSelector(selectTradingStatus);

  const [balanceKey, setBalanceKey] = useState(searchParams.get("key") || "");
  const [viewerTab, setViewerTab] = useState<"ccnl" | "nccs">("ccnl");
  const [mobileTab, setMobileTab] = useState("section-kpi");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const fetchAll = useCallback((key: string) => {
    if (!key || key === "undefined") return;
    dispatch(reqGetOverseasStockTradingInquirePresentBalance(key));
    dispatch(reqGetOverseasStockTradingInquireCcnl(key));
    dispatch(reqGetOverseasStockTradingInquireNccs(key));
    dispatch(reqGetUsCapital(key));
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    fetchAll(balanceKey);
  }, [balanceKey, fetchAll]);

  const handleToggleTrading = useCallback(async () => {
    if (tradingStatus.state === "pending" || tradingStatus.US === null) return;
    const next = !tradingStatus.US;
    try {
      await dispatch(reqSetTradingActive({ country: "US", isActive: next, key: balanceKey })).unwrap();
      addToast("success", `미국 자동매매가 ${next ? "활성화" : "비활성화"}되었습니다.`);
    } catch {
      addToast("error", "자동매매 상태 변경에 실패했습니다.");
    }
  }, [tradingStatus, dispatch, addToast, balanceKey]);

  const handleOrderResult = useCallback((status: "success" | "error", message: string) => {
    addToast(status, message);
    if (status === "success") {
      setLastUpdated(new Date());
      // 매매 성공 시 잔고·체결·미체결 1회만 재조회
      dispatch(reqGetOverseasStockTradingInquirePresentBalance(balanceKey));
      dispatch(reqGetOverseasStockTradingInquireCcnl(balanceKey));
      dispatch(reqGetOverseasStockTradingInquireNccs(balanceKey));
    }
  }, [balanceKey, dispatch, addToast]);

  useEffect(() => {
    const urlKey = searchParams.get("key");
    if (urlKey) {
      setBalanceKey(urlKey);
    } else if (session?.user?.id) {
      setBalanceKey(String(session.user.id));
    }
  }, [session?.user?.id, searchParams]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any)?.role !== "admin") {
      router.replace("/");
      return;
    }
    dispatch(reqGetKakaoMemberList());
    dispatch(reqGetMyLikes());
  }, [session, status, dispatch, router]);

  // 트레이딩 조건(quant_rule) 로드
  useEffect(() => {
    if (balanceKey && balanceKey !== "undefined") {
      dispatch(reqGetUsQuantRule(balanceKey));
      dispatch(reqFetchTradingStatus({ country: "US", key: balanceKey }));
    }
  }, [balanceKey, dispatch]);

  // 조건 저장 결과 토스트
  useEffect(() => {
    if (usQuantRule?.saveState === "fulfilled") addToast("success", "트레이딩 조건이 저장되었습니다.");
    else if (usQuantRule?.saveState === "rejected") addToast("error", "조건 저장에 실패했습니다.");
  }, [usQuantRule?.saveState]);

  useEffect(() => {
    if (!balanceKey || balanceKey === "undefined") return;
    if (searchParams.get("key") !== balanceKey) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("key", balanceKey);
      router.replace(`${pathname}?${params.toString()}`);
    }
    fetchAll(balanceKey);
  }, [balanceKey]);

  useEffect(() => {
    const states = [usCapitalPlusAll?.state, usCapitalPlusOne?.state, usCapitalMinusAll?.state, usCapitalMinusOne?.state, usCapitalResetAll?.state, usCapitalResetOne?.state];
    if (states.some(s => s === "fulfilled")) {
      dispatch(reqGetUsCapital(balanceKey));
      addToast("success", "토큰 잔액이 업데이트되었습니다.");
    }
  }, [usCapitalPlusAll?.state, usCapitalPlusOne?.state, usCapitalMinusAll?.state, usCapitalMinusOne?.state, usCapitalResetAll?.state, usCapitalResetOne?.state]);

  useEffect(() => {
    if (kiBalance.state === "fulfilled") setLastUpdated(new Date());
  }, [kiBalance.state]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (balanceKey) dispatch(reqGetOverseasStockTradingInquirePresentBalance(balanceKey));
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, balanceKey, dispatch]);

  // 그룹 작업 완료 시 capital 재조회
  useEffect(() => {
    if (usGroupOp?.state === "fulfilled") {
      dispatch(reqGetUsCapital(balanceKey));
    }
  }, [usGroupOp?.state]);

  const doTokenPlusAll = (num: number) => dispatch(reqPostUsCapitalTokenPlusAll({ key: balanceKey, num }));
  const doTokenPlusOne = (num: number, ticker: string) => ticker && dispatch(reqPostUsCapitalTokenPlusOne({ key: balanceKey, num, ticker }));
  const doTokenMinusAll = (num: number) => dispatch(reqPostUsCapitalTokenMinusAll({ key: balanceKey, num }));
  const doTokenMinusOne = (num: number, ticker: string) => ticker && dispatch(reqPostUsCapitalTokenMinusOne({ key: balanceKey, num, ticker }));
  const doTokenResetAll = () => dispatch(reqPostUsCapitalTokenResetAll({ key: balanceKey }));
  const doTokenResetOne = (ticker: string) => ticker && dispatch(reqPostUsCapitalTokenResetOne({ key: balanceKey, ticker }));

  // 그룹 관리 핸들러
  const doCreateGroup = (name: string, tickers?: string[]) => dispatch(reqPostUsCapitalGroupCreate({ key: balanceKey, name, tickers }));
  const doRenameGroup = (groupId: string, name: string) => dispatch(reqPostUsCapitalGroupUpdate({ key: balanceKey, groupId, updates: { name } }));
  const doToggleGroupTrading = (groupId: string, isActive: boolean) => dispatch(reqPostUsCapitalGroupUpdate({ key: balanceKey, groupId, updates: { is_trading_active: isActive } }));
  const doDeleteGroup = (groupId: string) => dispatch(reqPostUsCapitalGroupDelete({ key: balanceKey, groupId }));
  const doMoveStock = (ticker: string, groupId: string | null) => dispatch(reqPostUsCapitalStockGroup({ key: balanceKey, ticker, groupId }));
  const doBulkMove = (tickers: string[], groupId: string | null) => dispatch(reqPostUsCapitalStocksGroup({ key: balanceKey, tickers, groupId }));
  const doCopyLikes = (tickers: string[], groupId: string | null) => dispatch(reqPostUsCapitalLikesCopy({ key: balanceKey, tickers, groupId }));
  const doDeleteStock = (ticker: string) => dispatch(reqPostUsCapitalStockRemove({ key: balanceKey, ticker }));
  const doSaveQuantRule = (rule: any) => dispatch(reqPostUsQuantRule({ key: balanceKey, rule }));

  const out2 = kiBalance?.output2?.[0];
  const out3 = kiBalance?.output3;
  const exRate = Number(out2?.frst_bltn_exrt || 0);
  const totalAssetKrw = Number(out3?.tot_asst_amt || 0);
  const totalAssetUsd = exRate > 0 ? totalAssetKrw / exRate : 0;
  const depositUsd = Number(out2?.frcr_dncl_amt_2 || out2?.frcr_drwg_psbl_amt_1 || 0);
  const depositKrw = depositUsd * exRate;
  const stockEvalKrw = Number(out3?.evlu_amt_smtl_amt || Math.max(0, totalAssetKrw - depositKrw));
  const stockEvalUsd = exRate > 0 ? stockEvalKrw / exRate : 0;
  const totalPnlKrw = Number(out3?.tot_evlu_pfls_amt || 0);
  const totalPnlRate = Number(out3?.evlu_erng_rt1 || 0);
  const isPnlPositive = totalPnlKrw >= 0;
  const isLoading = kiBalance.state === "pending";
  const hasCapital = usCapital.state === "fulfilled" || usCapital.state === "pending";

  // 추가 지표
  const pchsAmtKrw = Number(out3?.pchs_amt_smtl_amt || 0);
  const pchsAmtUsd = exRate > 0 ? pchsAmtKrw / exRate : 0;
  const wdrwPsblKrw = Number(out3?.wdrw_psbl_tot_amt || 0);
  const wdrwPsblUsd = exRate > 0 ? wdrwPsblKrw / exRate : 0;
  const frcr_buy_smtl = Number(out2?.frcr_buy_amt_smtl || 0);
  const frcr_sll_smtl = Number(out2?.frcr_sll_amt_smtl || 0);
  const nxdyFrcrDrwg = Number(out2?.nxdy_frcr_drwg_psbl_amt || 0);
  const totLoanAmtUs = Number(out3?.tot_loan_amt || 0);
  const cmaEvluAmtUs = Number(out3?.cma_evlu_amt || 0);

  // 포지션
  const positions = kiBalance.output1 || [];
  const stockWeight = totalAssetKrw > 0 ? (stockEvalKrw / totalAssetKrw) * 100 : 0;

  if (kiBalance.state === "rejected") {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl mb-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-black mb-2 dark:text-white">미국 계좌 조회 권한 없음</h2>
        <p className="text-sm text-neutral-500 mb-5 max-w-xs">해외 주식 API 권한 또는 접근 토큰을 확인해 주세요.</p>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-black rounded-xl"
        >
          <RefreshCw size={13} /> 다시 시도
        </button>
        {countryToggle && <div className="mt-5">{countryToggle}</div>}
      </div>
    );
  }

  // 섹션 네비게이션 구성
  const navSections: NavSection[] = [
    { id: "section-kpi", label: "KPI", icon: <Wallet size={13} /> },
    { id: "section-portfolio", label: "포트폴리오", icon: <PieChart size={13} /> },
    { id: "section-balance", label: "잔고", icon: <BarChart3 size={13} /> },
    ...(hasCapital ? [{ id: "section-stocks", label: "종목관리", icon: <Database size={13} /> }] : []),
    ...(hasCapital ? [{ id: "section-conditions", label: "트레이딩 조건", icon: <SlidersHorizontal size={13} /> }] : []),
    { id: "section-orders", label: "해외주문", icon: <ClipboardList size={13} /> },
  ];

  return (
    <BalanceShell
      toasts={toasts}
      onRemoveToast={removeToast}
      lastUpdated={lastUpdated}
      countryToggle={countryToggle}
      autoRefresh={autoRefresh}
      onToggleAutoRefresh={() => setAutoRefresh(v => !v)}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      dividerClass="via-[#16a34a] dark:via-[#15803d]"
      navSections={navSections}
      mobileTab={mobileTab}
      onMobileTabChange={setMobileTab}
      breadcrumb={
        <nav className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Globe size={12} />
            해외 투자
          </span>
          <ChevronRight size={11} className="text-neutral-300 dark:text-neutral-600" />
          <span className="flex items-center gap-1 text-[#16a34a] dark:text-[#16a34a] bg-[#f0fdf4] dark:bg-[#14532d]/20 px-2 py-0.5 rounded-md">
            <Building2 size={11} />미국(US)
          </span>
        </nav>
      }
      title={
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter bg-gradient-to-r from-[#16a34a] to-indigo-500 dark:from-[#16a34a] dark:to-indigo-400 bg-clip-text text-transparent">
            US Portfolio
          </h1>
          <span className="flex items-center gap-1 px-3 py-1.5 bg-[#16a34a] text-white rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm shadow-[#16a34a]/30">
            <DollarSign size={11} /> USD Account
          </span>
        </div>
      }
      headerExtra={
        <>
          {tradingStatus.US !== null && (
            <button
              onClick={handleToggleTrading}
              disabled={tradingStatus.state === "pending"}
              title={tradingStatus.US ? "자동매매 비활성화" : "자동매매 활성화"}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                tradingStatus.US
                  ? "bg-[#f0fdf4] dark:bg-[#14532d]/30 text-[#16a34a] border-[#86efac] dark:border-[#166534]"
                  : "bg-white dark:bg-[#242320] text-neutral-400 border-neutral-200 dark:border-[#35332e] hover:border-neutral-400",
                tradingStatus.state === "pending" && "opacity-60 cursor-not-allowed"
              )}
            >
              <Power size={13} className={tradingStatus.US ? "text-[#16a34a]" : ""} />
              {tradingStatus.US ? "자동매매 ON" : "자동매매 OFF"}
            </button>
          )}
          {exRate > 0 && (
            <div className="flex items-center gap-2 bg-white dark:bg-[#242320] px-3 py-2 rounded-xl border border-neutral-200 dark:border-[#35332e] shadow-sm">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">고시환율</span>
              <span className="text-sm font-mono font-black text-[#16a34a] dark:text-[#16a34a]">
                {exRate.toLocaleString()}원
              </span>
            </div>
          )}
        </>
      }
      sections={[
        {
          id: "section-kpi",
          node: (
            <>
              <section id="section-kpi" className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <UsdKpiCard
                  label="총 자산 (USD)"
                  mainValue={isLoading ? null : fmtUsd(totalAssetUsd)}
                  mainColor="text-[#16a34a] dark:text-[#16a34a]"
                  subLabel="원화 평가액"
                  subValue={isLoading ? null : fmtKrw(totalAssetKrw)}
                  icon={<BarChart3 size={15} />}
                  iconBg="bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a]"
                  accentColor="bg-[#16a34a] dark:bg-[#16a34a]"
                  loading={isLoading}
                />
                <UsdKpiCard
                  label="외화 예수금 (USD)"
                  mainValue={isLoading ? null : fmtUsd(depositUsd)}
                  subLabel="익일 출금 가능"
                  subValue={isLoading ? null : fmtUsd(nxdyFrcrDrwg)}
                  icon={<Wallet size={15} />}
                  iconBg="bg-amber-50 dark:bg-amber-950/40 text-amber-500"
                  accentColor="bg-amber-400 dark:bg-amber-600"
                  loading={isLoading}
                />
                <UsdKpiCard
                  label="주식 평가총액"
                  mainValue={isLoading ? null : fmtUsd(stockEvalUsd)}
                  subLabel="원화 환산액"
                  subValue={isLoading ? null : fmtKrw(stockEvalKrw)}
                  icon={<TrendingUp size={15} />}
                  iconBg="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500"
                  accentColor="bg-indigo-400 dark:bg-indigo-600"
                  loading={isLoading}
                />
                <UsdKpiCard
                  label="총 수익률"
                  mainValue={isLoading ? null : `${isPnlPositive ? "▲ +" : "▼ "}${totalPnlRate.toFixed(2)}%`}
                  mainColor={pnlValueColor(isPnlPositive)}
                  subLabel="손익 합계"
                  subValue={isLoading ? null : fmtKrw(totalPnlKrw)}
                  subColor={pnlValueColor(isPnlPositive)}
                  icon={<PnlIcon positive={isPnlPositive} />}
                  iconBg={pnlIconBg(isPnlPositive)}
                  accentColor={pnlAccentColor(isPnlPositive)}
                  loading={isLoading}
                />
                <UsdKpiCard
                  label="매입원금 (USD)"
                  mainValue={isLoading ? null : fmtUsd(pchsAmtUsd)}
                  subLabel="원화 환산액"
                  subValue={isLoading ? null : fmtKrw(pchsAmtKrw)}
                  icon={<DollarSign size={15} />}
                  iconBg="bg-[#faf9f7] dark:bg-[#242320] text-neutral-500"
                  accentColor="bg-neutral-400 dark:bg-neutral-600"
                  loading={isLoading}
                />
                <UsdKpiCard
                  label="출금 가능"
                  mainValue={isLoading ? null : fmtUsd(wdrwPsblUsd)}
                  subLabel="원화 환산액"
                  subValue={isLoading ? null : fmtKrw(wdrwPsblKrw)}
                  icon={<ArrowDownRight size={15} />}
                  iconBg="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500"
                  accentColor="bg-emerald-400 dark:bg-emerald-600"
                  loading={isLoading}
                />
              </section>

              {!isLoading && (
                <div className="overflow-x-auto no-scrollbar mt-3">
                  <div className="flex gap-2 min-w-max pb-0.5">
                    <MetricChip
                      label="금일 매수 (USD)"
                      value={fmtUsd(frcr_buy_smtl)}
                      valueClass="text-rose-400"
                    />
                    <MetricChip
                      label="금일 매도 (USD)"
                      value={fmtUsd(frcr_sll_smtl)}
                      valueClass="text-[#16a34a]"
                    />
                    <MetricChip
                      label="금일 순매수"
                      value={fmtUsd(frcr_buy_smtl - frcr_sll_smtl)}
                      valueClass={(frcr_buy_smtl - frcr_sll_smtl) >= 0 ? "text-rose-500" : "text-[#16a34a]"}
                    />
                    {cmaEvluAmtUs > 0 && (
                      <MetricChip
                        label="CMA 평가 (KRW)"
                        value={fmtKrw(cmaEvluAmtUs)}
                        valueClass="text-indigo-500 dark:text-indigo-400"
                      />
                    )}
                    {positions.length > 0 && (
                      <MetricChip
                        label="보유 종목 수"
                        value={`${positions.length}종목`}
                        valueClass="text-neutral-700 dark:text-neutral-300"
                      />
                    )}
                    {positions.length > 0 && totalAssetKrw > 0 && (
                      <MetricChip
                        label="주식 비중"
                        value={`${stockWeight.toFixed(1)}%`}
                        valueClass="text-indigo-500 dark:text-indigo-400"
                      />
                    )}
                    {totLoanAmtUs > 0 && (
                      <MetricChip
                        label="대출 잔고 (KRW)"
                        value={fmtKrw(totLoanAmtUs)}
                        valueClass="text-orange-500"
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          ),
        },
        {
          id: "section-portfolio",
          node: (
            <SectionPanel id="section-portfolio">
              <SectionHeader
                icon={<PieChart size={16} />}
                title="포트폴리오 자산 구성"
                subtitle="보유 종목별 비중·수익률 한눈에 보기 (상세·주문은 잔고 패널)"
              />
              <PortfolioChartSection
                output1={kiBalance.output1 || []}
                isUs={true}
                isLoading={isLoading}
              />
            </SectionPanel>
          ),
        },
        {
          id: "section-balance",
          node: (
            <SectionPanel id="section-balance">
              <InquireBalanceResult
                balanceKey={balanceKey}
                setBalanceKey={setBalanceKey}
                kiBalance={kiBalance}
                reqGetInquireBalance={reqGetOverseasStockTradingInquirePresentBalance}
                reqGetInquireCcnl={reqGetOverseasStockTradingInquireCcnl}
                reqGetInquireNccs={reqGetOverseasStockTradingInquireNccs}
                reqGetUsCapital={reqGetUsCapital}
                kiOrderCash={kiUsOrder}
                reqPostOrderCash={reqPostOrderUs}
                kakaoTotal={kakaoTotal}
                kakaoMemberList={kakaoMemberList}
                capital={usCapital}
                onOrderResult={handleOrderResult}
              />
            </SectionPanel>
          ),
        },
        {
          id: "section-stocks",
          node: hasCapital ? (
            <SectionPanel id="section-stocks">
              <SectionHeader
                icon={<Database size={16} />}
                title="NCAV 운용 종목 관리"
                subtitle="미국 전략 자동매매 종목 풀 및 토큰(예산) 관리"
                badge={
                  usCapital.state === "pending"
                    ? <span className="text-[10px] font-mono text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">로딩 중</span>
                    : usCapital.stock_list?.length > 0
                    ? <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-[#faf9f7] dark:bg-[#242320] px-2 py-0.5 rounded-full">{usCapital.stock_list.length}종목</span>
                    : null
                }
              />
              <TradingFlowSummary
                country="US"
                tradingActive={tradingStatus.US}
                groups={usCapital.groups ?? []}
                stockList={usCapital.stock_list ?? []}
                quantRule={usQuantRule?.rule}
                onToggleTrading={handleToggleTrading}
                togglePending={tradingStatus.state === "pending"}
                className="mb-5"
              />
              <StockListTable
                data={usCapital}
                kakaoTotal={kakaoTotal}
                doTokenPlusAll={doTokenPlusAll}
                doTokenPlusOne={doTokenPlusOne}
                doTokenMinusAll={doTokenMinusAll}
                doTokenMinusOne={doTokenMinusOne}
                doTokenResetAll={doTokenResetAll}
                doTokenResetOne={doTokenResetOne}
                session={session}
                onCreateGroup={doCreateGroup}
                onRenameGroup={doRenameGroup}
                onToggleGroupTrading={doToggleGroupTrading}
                onDeleteGroup={doDeleteGroup}
                onMoveStock={doMoveStock}
                onBulkMove={doBulkMove}
                onCopyLikes={doCopyLikes}
                onDeleteStock={doDeleteStock}
                likedList={usLikedList}
                countryTradingActive={tradingStatus.US === true}
                quantRule={usQuantRule.rule}
                metricsOverride={usLikeMetrics}
              />
            </SectionPanel>
          ) : null,
        },
        {
          id: "section-conditions",
          node: hasCapital ? (
            <SectionPanel id="section-conditions">
              <SectionHeader
                icon={<SlidersHorizontal size={16} />}
                title="자동매매 트레이딩 조건"
                subtitle="백엔드 quant rule(NCAV 비율·필터·활성 종목 수 등) 조회 및 수정"
                badge={
                  usQuantRule.state === "pending"
                    ? <span className="text-[10px] font-mono text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">로딩 중</span>
                    : usQuantRule.is_override
                    ? <span className="text-[10px] font-mono text-[#16a34a] bg-[#f0fdf4] dark:bg-[#14532d]/30 px-2 py-0.5 rounded-full">계좌 전용</span>
                    : <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-[#faf9f7] dark:bg-[#242320] px-2 py-0.5 rounded-full">기본값</span>
                }
              />
              <QuantRuleEditor
                data={usQuantRule}
                isMaster={isMaster}
                onSave={doSaveQuantRule}
              />
            </SectionPanel>
          ) : null,
        },
        {
          id: "section-orders",
          node: (
            <SectionPanel id="section-orders">
              <SectionHeader
                icon={<OrderSectionIcon viewerTab={viewerTab} />}
                title="해외 주문 내역"
                subtitle="한국투자증권 미국 주식 체결 및 미체결 조회"
                action={
                  <OrderTabAction
                    viewerTab={viewerTab}
                    setViewerTab={setViewerTab}
                    ccnlCount={kiCcnl.output?.length || 0}
                    nccsCount={kiNccs.output?.length || 0}
                    isPending={kiCcnl.state === "pending" || kiNccs.state === "pending"}
                    onRefresh={() => {
                      dispatch(reqGetOverseasStockTradingInquireCcnl(balanceKey));
                      dispatch(reqGetOverseasStockTradingInquireNccs(balanceKey));
                    }}
                  />
                }
              />

              <div className="overflow-x-auto rounded-xl border border-neutral-100 dark:border-[#35332e]">
                <table className="w-full text-sm text-left min-w-[860px]">
                  <TableHeader headers={[
                    { label: "주문시각 / 번호" },
                    { label: "구분" },
                    { label: "종목 / 시장" },
                    { label: "주문수량", align: "text-right" },
                    { label: "체결수량", align: "text-right" },
                    { label: "주문가 / 체결가", align: "text-right" },
                    { label: "체결금액", align: "text-right" },
                    { label: "처리상태", align: "text-center" },
                    { label: "미체결", align: "text-right" },
                  ]} />
                  <tbody className="divide-y divide-neutral-50 dark:divide-[#35332e]/40">
                    {viewerTab === "ccnl" ? (
                      kiCcnl.output?.length > 0
                        ? kiCcnl.output.map((item, i) => (
                            <OverseasOrderRow key={i} item={item} isNccs={false} />
                          ))
                        : <EmptyRow colSpan={9} message="금일 해외 체결 내역이 없습니다." />
                    ) : (
                      kiNccs.output?.length > 0
                        ? kiNccs.output.map((item, i) => (
                            <OverseasOrderRow key={i} item={item} isNccs={true} />
                          ))
                        : <EmptyRow colSpan={9} message="현재 미체결 해외 주문이 없습니다." />
                    )}
                  </tbody>
                </table>
              </div>
            </SectionPanel>
          ),
        },
      ]}
    />
  );
}
