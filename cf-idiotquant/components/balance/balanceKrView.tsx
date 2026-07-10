"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, ChevronRight, MapPin,
  Wallet, Coins, Percent,
  Database, User, PieChart, BarChart3, ClipboardList, Power, SlidersHorizontal, Activity,
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
import {
  reqGetCapitalToken,
  reqFetchTradingStatus,
  reqSetTradingActive,
  selectTradingStatus,
} from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import {
  reqGetKakaoMemberList, selectKakaoMemberList,
  selectKakaoTotal, KakaoTotal
} from "@/lib/features/kakao/kakaoSlice";
import {
  KrUsCapitalType, QuantRule, reqGetKrCapital,
  reqPostKrCapitalTokenMinusAll, reqPostKrCapitalTokenMinusOne,
  reqPostKrCapitalTokenPlusAll, reqPostKrCapitalTokenPlusOne,
  selectKrCapital, selectKrCapitalTokenMinusAll,
  selectKrCapitalTokenMinusOne, selectKrCapitalTokenPlusAll,
  selectKrCapitalTokenPlusOne,
  reqPostKrCapitalTokenResetAll, reqPostKrCapitalTokenResetOne,
  selectKrCapitalTokenResetAll, selectKrCapitalTokenResetOne,
  reqPostKrCapitalGroupCreate, reqPostKrCapitalGroupUpdate,
  reqPostKrCapitalGroupDelete, reqPostKrCapitalStockGroup, reqPostKrCapitalStocksGroup, reqPostKrCapitalLikesCopy,
  reqPostKrCapitalStockRemove, reqPostKrCapitalStocksRemove,
  selectKrGroupOp,
  reqGetKrQuantRule, reqPostKrQuantRule, selectKrQuantRule,
  reqGetKrCapitalBudget, reqPostKrCapitalBudget, selectKrBudget,
  reqGetKrTradingActivity, selectKrActivity,
} from "@/lib/features/capital/capitalSlice";
import { reqGetMyLikes, selectLikedList } from "@/lib/features/stockLikes/stockLikesSlice";
import { getInquirePrice } from "@/lib/features/koreaInvestment/koreaInvestmentAPI";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import StockListTable from "@/components/balance/stockListTable";
import QuantRuleEditor from "@/components/balance/quantRuleEditor";
import RefillSettings from "@/components/balance/refillSettings";
import TradingFlowSummary from "@/components/balance/tradingFlowSummary";
import TradingActivityPanel from "@/components/balance/tradingActivityPanel";
import dynamic from "next/dynamic";
import { ChartSectionSkeleton } from "@/components/balance/shared";
// recharts(무거움)를 초기 번들에서 제외 — 차트 섹션 표시 시점에 로드
const PortfolioChartSection = dynamic(
  () => import("@/components/balance/portfolioChart").then(m => ({ default: m.PortfolioChartSection })),
  { ssr: false, loading: () => <ChartSectionSkeleton /> }
);
import { type NavSection } from "@/components/balance/sectionNav";
import { BalanceShell } from "@/components/balance/balanceShell";
import {
  useToast,
  SectionHeader, SectionPanel, EmptyRow, AccountSelector,
  KpiCard, MetricChip, TableHeader, OrderTabAction, OrderSectionIcon,
  PnlIcon, pnlIconBg, pnlValueColor, pnlAccentColor,
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
            : "bg-[#f0fdf4] text-[#16a34a] dark:bg-[#052e16]/40"
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
// 메인 컴포넌트
// =========================================================================
export function BalanceKrView({ countryToggle }: { countryToggle?: React.ReactNode }) {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const kiBalance = useAppSelector(getKoreaInvestmentBalance) as unknown as KoreaInvestmentBalance;
  const krCapital = useAppSelector(selectKrCapital) as KrUsCapitalType;
  const krActivity = useAppSelector(selectKrActivity);
  const kakaoTotal = useAppSelector(selectKakaoTotal) as KakaoTotal;
  const kakaoMemberList = useAppSelector(selectKakaoMemberList);
  const orderCashState = useAppSelector(getKoreaInvestmentOrderCash) as KoreaInvestmentOrderCash;
  const krCcnl = useAppSelector(getKoreaInvestmentInquireKrCcnl) as KoreaInvestmentInquireCcnl;
  const krNccs = useAppSelector(getKoreaInvestmentInquireKrNccs) as KoreaInvestmentInquireNccs;
  const krCapitalPlusAll = useAppSelector(selectKrCapitalTokenPlusAll);
  const krCapitalPlusOne = useAppSelector(selectKrCapitalTokenPlusOne);
  const krCapitalMinusAll = useAppSelector(selectKrCapitalTokenMinusAll);
  const krCapitalMinusOne = useAppSelector(selectKrCapitalTokenMinusOne);
  const krCapitalResetAll = useAppSelector(selectKrCapitalTokenResetAll);
  const krCapitalResetOne = useAppSelector(selectKrCapitalTokenResetOne);
  const krGroupOp = useAppSelector(selectKrGroupOp);
  const krQuantRule = useAppSelector(selectKrQuantRule);
  const krBudget = useAppSelector(selectKrBudget);
  const likedListAll = useAppSelector(selectLikedList);
  const krLikedList = useMemo(() => (likedListAll ?? []).filter((l: any) => !l.is_us), [likedListAll]);
  const isMaster = useMemo(() => session?.user?.name === process.env.NEXT_PUBLIC_MASTER, [session]);

  const tradingStatus = useAppSelector(selectTradingStatus);

  const [balanceKey, setBalanceKey] = useState(searchParams.get("key") || String(session?.user?.id || ""));
  const [viewerTab, setViewerTab] = useState<"ccnl" | "nccs">("ccnl");
  const [mobileTab, setMobileTab] = useState("section-kpi");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetchedKeyRef = useRef<string | null>(null); // 같은 계좌 키로 이미 로드했는지 — 초기 진입 시 중복 refresh 방지
  const { toasts, addToast, removeToast } = useToast();

  // 좋아요 종목 중 stock_data_daily JOIN 이 비어(per/pbr 등 없음) 오는 경우
  // KIS 국내 inquire-price 로 per/pbr/eps/bps 를 보강한다. (US 의 price-detail 보강과 동일 패턴)
  const [krLikeMetrics, setKrLikeMetrics] = useState<Record<string, { per?: number; pbr?: number; eps?: number; bps?: number }>>({});
  const krMetricsFetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const isCode = (t: string) => /^\d{6}$/.test(t); // inquire-price 는 6자리 종목코드만 가능
    const need = new Set<string>();
    (krLikedList ?? []).forEach((l: any) => {
      if (l?.ticker && isCode(String(l.ticker)) && (l.per == null || l.pbr == null)) need.add(String(l.ticker));
    });
    (krCapital?.stock_list ?? []).forEach((s: any) => {
      if (s?.group_id === "__likes__" && s?.symbol && isCode(String(s.symbol))) {
        const c = s.condition ?? {};
        if (c.per == null || c.pbr == null) need.add(String(s.symbol));
      }
    });
    const todo = [...need].filter(t => !krMetricsFetchedRef.current.has(t));
    if (todo.length === 0) return;
    let cancelled = false;
    const num = (v: any) => { const n = Number(v); return (v != null && v !== "" && Number.isFinite(n)) ? n : undefined; };
    (async () => {
      const limit = 3;
      for (let i = 0; i < todo.length; i += limit) {
        const batch = todo.slice(i, i + limit);
        const results = await Promise.all(batch.map(async (t) => {
          krMetricsFetchedRef.current.add(t);
          try {
            const res = await getInquirePrice(t, balanceKey);
            const o = res?.output ?? {};
            return [t, { per: num(o.per), pbr: num(o.pbr), eps: num(o.eps), bps: num(o.bps) }] as const;
          } catch { return [t, {}] as const; }
        }));
        if (cancelled) return;
        setKrLikeMetrics(prev => { const next = { ...prev }; for (const [t, m] of results) next[t] = m; return next; });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [krLikedList, krCapital, balanceKey]);

  const fetchOrderHistory = useCallback((key: string) => {
    if (!key || key === "undefined") return;
    dispatch(reqGetInquireCcnl({ DV: "0", kakaoId: key }));
    dispatch(reqGetInquireNccs({ DV: "1", kakaoId: key }));
  }, [dispatch]);

  const handleOrderResult = useCallback((status: "success" | "error", message: string) => {
    addToast(status, message);
    if (status === "success") {
      setLastUpdated(new Date());
      // 매매 성공 시 잔고·주문내역 1회만 재조회
      dispatch(reqGetInquireBalance(balanceKey));
      fetchOrderHistory(balanceKey);
    }
  }, [balanceKey, dispatch, fetchOrderHistory, addToast]);

  const handleRefresh = useCallback(() => {
    if (!balanceKey || balanceKey === "undefined") return;
    dispatch(reqGetInquireBalance(balanceKey));
    fetchOrderHistory(balanceKey);
    dispatch(reqGetKrCapital(balanceKey));
    dispatch(reqGetKrTradingActivity(balanceKey));
  }, [balanceKey, dispatch, fetchOrderHistory]);

  const handleToggleTrading = useCallback(async () => {
    if (tradingStatus.state === "pending" || tradingStatus.KR === null) return;
    const next = !tradingStatus.KR;
    try {
      await dispatch(reqSetTradingActive({ country: "KR", isActive: next, key: balanceKey })).unwrap();
      addToast("success", `국내 자동매매가 ${next ? "활성화" : "비활성화"}되었습니다.`);
    } catch {
      addToast("error", "자동매매 상태 변경에 실패했습니다.");
    }
  }, [tradingStatus, dispatch, addToast, balanceKey]);

  useEffect(() => {
    const urlKey = searchParams.get("key");
    if (urlKey && urlKey !== balanceKey) setBalanceKey(urlKey);
  }, [searchParams]);

  useEffect(() => {
    if (!balanceKey || balanceKey === "undefined") return;
    if (searchParams.get("key") !== balanceKey) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("key", balanceKey);
      router.replace(`${pathname}?${params.toString()}`);
    }
    // 같은 키로 이미 조회했으면 재조회하지 않음 (URL 동기화/재렌더로 인한 불필요한 반복 refresh 방지)
    if (fetchedKeyRef.current === balanceKey) return;
    fetchedKeyRef.current = balanceKey;
    dispatch(reqGetInquireBalance(balanceKey));
    fetchOrderHistory(balanceKey);
    dispatch(reqGetKrCapital(balanceKey));
    dispatch(reqGetKrTradingActivity(balanceKey));
    dispatch(reqFetchTradingStatus({ country: "KR", key: balanceKey }));
  }, [balanceKey]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any)?.role !== "admin") {
      router.replace("/");
      return;
    }
    if (session.user?.id && !searchParams.get("key")) {
      // 잔고 조회는 balanceKey 확정 후 아래 effect 에서 1회 수행 (여기서 중복 조회하지 않음)
      setBalanceKey(String(session.user.id));
    }
    dispatch(reqGetCapitalToken());
    dispatch(reqGetKakaoMemberList());
    dispatch(reqGetMyLikes());
  }, [session, status, dispatch, router]);

  // 트레이딩 조건(quant_rule) 로드
  useEffect(() => {
    if (balanceKey && balanceKey !== "undefined") {
      dispatch(reqGetKrQuantRule(balanceKey));
      dispatch(reqGetKrCapitalBudget(balanceKey));
    }
  }, [balanceKey, dispatch]);

  // 조건 저장 결과 토스트
  useEffect(() => {
    if (krQuantRule?.saveState === "fulfilled") addToast("success", "트레이딩 조건이 저장되었습니다.");
    else if (krQuantRule?.saveState === "rejected") addToast("error", "조건 저장에 실패했습니다.");
  }, [krQuantRule?.saveState]);

  useEffect(() => {
    if (krCapital.state === "init" && balanceKey) {
      dispatch(reqGetKrCapital(balanceKey));
    }
  }, [krCapital.state, balanceKey]);

  useEffect(() => {
    const states = [krCapitalPlusAll?.state, krCapitalPlusOne?.state, krCapitalMinusAll?.state, krCapitalMinusOne?.state, krCapitalResetAll?.state, krCapitalResetOne?.state];
    if (states.some(s => s === "fulfilled")) {
      dispatch(reqGetKrCapital(balanceKey));
      addToast("success", "토큰 잔액이 업데이트되었습니다.");
    }
  }, [krCapitalPlusAll?.state, krCapitalPlusOne?.state, krCapitalMinusAll?.state, krCapitalMinusOne?.state, krCapitalResetAll?.state, krCapitalResetOne?.state]);

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

  // 그룹 작업 완료 시 capital 재조회
  useEffect(() => {
    if (krGroupOp?.state === "fulfilled") {
      dispatch(reqGetKrCapital(balanceKey));
    }
  }, [krGroupOp?.state]);

  // 그룹 작업 실패 시 사유 노출 (모바일에서 원인 확인용)
  useEffect(() => {
    if (krGroupOp?.state === "rejected") {
      addToast("error", krGroupOp.error || "종목 작업에 실패했습니다.");
    }
  }, [krGroupOp?.state]);

  // StockListTable(memo)에 전달되는 핸들러 — useCallback으로 참조 고정해 잔고 자동새로고침 등에서 테이블 재렌더 방지
  const doTokenPlusAll = useCallback((num: number) => dispatch(reqPostKrCapitalTokenPlusAll({ key: balanceKey, num })), [dispatch, balanceKey]);
  const doTokenPlusOne = useCallback((num: number, ticker: string) => { if (ticker) dispatch(reqPostKrCapitalTokenPlusOne({ key: balanceKey, num, ticker })); }, [dispatch, balanceKey]);
  const doTokenMinusAll = useCallback((num: number) => dispatch(reqPostKrCapitalTokenMinusAll({ key: balanceKey, num })), [dispatch, balanceKey]);
  const doTokenMinusOne = useCallback((num: number, ticker: string) => { if (ticker) dispatch(reqPostKrCapitalTokenMinusOne({ key: balanceKey, num, ticker })); }, [dispatch, balanceKey]);
  const doTokenResetAll = useCallback(() => dispatch(reqPostKrCapitalTokenResetAll({ key: balanceKey })), [dispatch, balanceKey]);
  const doTokenResetOne = useCallback((ticker: string) => { if (ticker) dispatch(reqPostKrCapitalTokenResetOne({ key: balanceKey, ticker })); }, [dispatch, balanceKey]);

  // 그룹 관리 핸들러
  const doCreateGroup = useCallback((name: string, tickers?: string[]) => dispatch(reqPostKrCapitalGroupCreate({ key: balanceKey, name, tickers })), [dispatch, balanceKey]);
  const doRenameGroup = useCallback((groupId: string, name: string) => dispatch(reqPostKrCapitalGroupUpdate({ key: balanceKey, groupId, updates: { name } })), [dispatch, balanceKey]);
  const doToggleGroupTrading = useCallback((groupId: string, isActive: boolean) => dispatch(reqPostKrCapitalGroupUpdate({ key: balanceKey, groupId, updates: { is_trading_active: isActive } })), [dispatch, balanceKey]);
  const doDeleteGroup = useCallback((groupId: string) => dispatch(reqPostKrCapitalGroupDelete({ key: balanceKey, groupId })), [dispatch, balanceKey]);
  const doMoveStock = useCallback((ticker: string, groupId: string | null) => dispatch(reqPostKrCapitalStockGroup({ key: balanceKey, ticker, groupId })), [dispatch, balanceKey]);
  const doBulkMove = useCallback((tickers: string[], groupId: string | null) => dispatch(reqPostKrCapitalStocksGroup({ key: balanceKey, tickers, groupId })), [dispatch, balanceKey]);
  const doCopyLikes = useCallback((tickers: string[], groupId: string | null) => dispatch(reqPostKrCapitalLikesCopy({ key: balanceKey, tickers, groupId })), [dispatch, balanceKey]);
  const doDeleteStock = useCallback((ticker: string) => dispatch(reqPostKrCapitalStockRemove({ key: balanceKey, ticker })), [dispatch, balanceKey]);
  const doBulkRemove = useCallback((tickers: string[]) => dispatch(reqPostKrCapitalStocksRemove({ key: balanceKey, tickers })), [dispatch, balanceKey]);
  const doSaveGroupSettings = useCallback((groupId: string, settings: { quant_rule: QuantRule | null; budget_krw: number | null; side?: "buy" | "sell"; dca?: boolean }) => dispatch(reqPostKrCapitalGroupUpdate({ key: balanceKey, groupId, updates: settings })), [dispatch, balanceKey]);
  const doSaveQuantRule = (rule: any) => dispatch(reqPostKrQuantRule({ key: balanceKey, rule }));
  const doSaveBudget = (monthly_budget_krw: number) => dispatch(reqPostKrCapitalBudget({ key: balanceKey, monthly_budget_krw }));

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
    ...(hasCapital ? [{ id: "section-activity", label: "자동매매 현황", icon: <Activity size={13} /> }] : []),
    ...(hasCapital ? [{ id: "section-conditions", label: "트레이딩 조건", icon: <SlidersHorizontal size={13} /> }] : []),
    { id: "section-orders", label: "주문내역", icon: <ClipboardList size={13} /> },
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
      dividerClass="via-[#86efac] dark:via-[#166534]"
      accountSelector={
        <AccountSelector
          balanceKey={balanceKey}
          setBalanceKey={setBalanceKey}
          kakaoMemberList={kakaoMemberList}
          isMaster={isMaster}
        />
      }
      navSections={navSections}
      mobileTab={mobileTab}
      onMobileTabChange={setMobileTab}
      breadcrumb={
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
      }
      title={
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter bg-gradient-to-r from-neutral-900 to-neutral-500 dark:from-white dark:to-neutral-400 bg-clip-text text-transparent">
            Portfolio Balance
          </h1>
          <span className="text-2xl select-none" aria-hidden>🇰🇷</span>
        </div>
      }
      headerExtra={tradingStatus.KR !== null ? (
        <button
          onClick={handleToggleTrading}
          disabled={tradingStatus.state === "pending"}
          title={tradingStatus.KR ? "자동매매 비활성화" : "자동매매 활성화"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
            tradingStatus.KR
              ? "bg-[#f0fdf4] dark:bg-[#14532d]/30 text-[#16a34a] border-[#86efac] dark:border-[#166534]"
              : "bg-white dark:bg-[#242320] text-neutral-400 border-neutral-200 dark:border-[#35332e] hover:border-neutral-400",
            tradingStatus.state === "pending" && "opacity-60 cursor-not-allowed"
          )}
        >
          <Power size={13} className={tradingStatus.KR ? "text-[#16a34a]" : ""} />
          {tradingStatus.KR ? "자동매매 ON" : "자동매매 OFF"}
        </button>
      ) : undefined}
      footerBadge={
        <span className="text-[10px] font-mono text-neutral-400 bg-[#faf9f7] dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] px-2.5 py-1 rounded-lg">
          ID: {String(balanceKey).slice(0, 8) || "N/A"}
        </span>
      }
      sections={[
        {
          id: "section-kpi",
          node: (
            <>
              <section id="section-kpi" className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <KpiCard
                  label="총 평가 금액"
                  value={isLoading ? null : `${totalEvalAmt.toLocaleString()}원`}
                  sub={isLoading ? "" : `주식 ${sctsEvluAmt.toLocaleString()}원 · CMA ${cmaEvluAmt.toLocaleString()}원`}
                  icon={<Wallet size={15} />}
                  iconBg="bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a]"
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

              {!isLoading && (
                <div className="overflow-x-auto no-scrollbar mt-3">
                  <div className="flex gap-2 min-w-max pb-0.5">
                    <MetricChip
                      label="당일 등락"
                      value={`${isDailyPositive ? "▲ +" : "▼ "}${asstIcdcAmt.toLocaleString()}원`}
                      valueClass={isDailyPositive ? "text-rose-500" : "text-[#16a34a]"}
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
                      valueClass={(thdtBuyAmt - thdtSllAmt) >= 0 ? "text-rose-500" : "text-[#16a34a]"}
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
                isUs={false}
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
                kiBalance={kiBalance as any}
                reqGetInquireBalance={reqGetInquireBalance}
                kakaoMemberList={kakaoMemberList}
                reqPostOrderCash={reqPostOrderCash}
                kiOrderCash={orderCashState}
                capital={krCapital}
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
                subtitle="전략 자동매매 종목 풀 및 토큰(예산) 관리"
                badge={
                  krCapital.state === "pending"
                    ? <span className="text-[10px] font-mono text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">로딩 중</span>
                    : krCapital.stock_list?.length > 0
                    ? <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-[#faf9f7] dark:bg-[#242320] px-2 py-0.5 rounded-full">{krCapital.stock_list.length}종목</span>
                    : null
                }
              />
              <TradingFlowSummary
                country="KR"
                tradingActive={tradingStatus.KR}
                groups={krCapital.groups ?? []}
                stockList={krCapital.stock_list ?? []}
                quantRule={krQuantRule?.rule}
                budget={krBudget}
                onToggleTrading={handleToggleTrading}
                togglePending={tradingStatus.state === "pending"}
                className="mb-5"
              />
              <StockListTable
                data={krCapital}
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
                onBulkRemove={doBulkRemove}
                onSaveGroupSettings={doSaveGroupSettings}
                likedList={krLikedList}
                countryTradingActive={tradingStatus.KR === true}
                quantRule={krQuantRule.rule}
                metricsOverride={krLikeMetrics}
                monthlyPerStock={krBudget?.monthly_per_stock}
              />
            </SectionPanel>
          ) : null,
        },
        {
          id: "section-activity",
          node: hasCapital ? (
            <SectionPanel id="section-activity">
              <SectionHeader
                icon={<Activity size={16} />}
                title="자동매매 현황"
                subtitle="스케줄러(5분마다) 가동 상태 · 토큰 리필 · 최근 자동 체결 내역"
                badge={
                  krActivity.state === "pending"
                    ? <span className="text-[10px] font-mono text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">로딩 중</span>
                    : <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-[#faf9f7] dark:bg-[#242320] px-2 py-0.5 rounded-full">최근 {krActivity.logs.length}건</span>
                }
              />
              <TradingActivityPanel
                country="KR"
                capital={krCapital}
                activity={krActivity}
                onRefresh={() => dispatch(reqGetKrTradingActivity(balanceKey))}
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
                  krQuantRule.state === "pending"
                    ? <span className="text-[10px] font-mono text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">로딩 중</span>
                    : krQuantRule.is_override
                    ? <span className="text-[10px] font-mono text-[#16a34a] bg-[#f0fdf4] dark:bg-[#14532d]/30 px-2 py-0.5 rounded-full">계좌 전용</span>
                    : <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-[#faf9f7] dark:bg-[#242320] px-2 py-0.5 rounded-full">기본값</span>
                }
              />
              <RefillSettings
                data={krBudget}
                isMaster={isMaster}
                onSave={doSaveBudget}
              />
              <div className="h-px bg-neutral-100 dark:bg-[#35332e] my-4" />
              <QuantRuleEditor
                data={krQuantRule}
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
          ),
        },
      ]}
    />
  );
}
