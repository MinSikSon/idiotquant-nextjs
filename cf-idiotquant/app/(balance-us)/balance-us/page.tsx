"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Globe, ChevronRight, DollarSign, Building2,
  Wallet, TrendingUp, BarChart3, RefreshCw,
  Clock, AlertCircle, Database,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { useSession } from "next-auth/react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
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
  selectUsCapitalTokenMinusOne
} from "@/lib/features/capital/capitalSlice";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import StockListTable from "@/components/balance/stockListTable";
import {
  useToast, ToastContainer,
  LoadingState, SectionHeader, SectionPanel, EmptyRow,
  UsdKpiCard, TableHeader, OrderTabAction, OrderSectionIcon,
  BalanceHeaderActions, pnlIconBg, pnlValueColor, pnlAccentColor,
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
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group">
      <td className="py-3.5 px-4">
        <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {formatTime(item.ord_tmd)}
        </span>
        <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">No. {item.odno}</span>
      </td>
      <td className="py-3.5 px-4">
        <span className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide",
          isBuy ? "bg-red-50 text-red-500 dark:bg-red-950/40" : "bg-blue-50 text-blue-500 dark:bg-blue-950/40"
        )}>
          {item.sll_buy_dvsn_cd_name || (isBuy ? "매수" : "매도")}
        </span>
      </td>
      <td className="py-3.5 px-4">
        <span className="font-bold text-zinc-900 dark:text-white text-xs block">{item.prdt_name}</span>
        <span className="text-[10px] font-mono text-zinc-400 uppercase">{item.tr_mket_name || item.tr_crcy_cd}</span>
      </td>
      <td className="py-3.5 px-4 text-right font-mono">
        <span className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">{item.ft_ord_qty || "-"}</span>
        <span className="text-[10px] text-zinc-400">주문</span>
      </td>
      <td className="py-3.5 px-4 text-right font-mono">
        {hasPartialFill ? (
          <>
            <span className="block text-xs font-black text-zinc-900 dark:text-white">{item.ft_ccld_qty}</span>
            <span className="text-[10px] font-bold text-emerald-500">체결</span>
          </>
        ) : (
          <span className="text-xs text-zinc-400">-</span>
        )}
      </td>
      <td className="py-3.5 px-4 text-right font-mono">
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
          {Number(item.ft_ord_unpr3 || 0) > 0 ? fmtUsd(item.ft_ord_unpr3) : "-"}
        </span>
        {hasPartialFill && (
          <span className="text-[10px] text-zinc-400">{fmtUsd(item.ft_ccld_unpr3)} 체결가</span>
        )}
      </td>
      <td className="py-3.5 px-4 text-right font-mono">
        {hasPartialFill && Number(item.ft_ccld_amt3 || 0) > 0
          ? <span className="text-xs font-black text-zinc-900 dark:text-white">{fmtUsd(item.ft_ccld_amt3)}</span>
          : <span className="text-xs text-zinc-400">-</span>
        }
      </td>
      <td className="py-3.5 px-4 text-center">
        <span className={cn(
          "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide",
          item.prcs_stat_name?.includes("체결") || item.prcs_stat_name?.includes("완료")
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
            : isNccs
            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
        )}>
          {item.prcs_stat_name || (isNccs ? "대기" : "-")}
        </span>
      </td>
      <td className="py-3.5 px-4 text-right font-mono">
        <span className={cn(
          "text-xs font-black px-2 py-0.5 rounded-full",
          Number(item.nccs_qty || 0) > 0
            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30"
            : "text-zinc-400"
        )}>
          {item.nccs_qty || 0}주
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
    <Suspense fallback={<LoadingState message="미국 계좌 데이터를 불러오는 중..." />}>
      <BalanceUs />
    </Suspense>
  );
}

// =========================================================================
// 메인 컴포넌트
// =========================================================================
function BalanceUs() {
  const { data: session } = useSession();
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

  const [balanceKey, setBalanceKey] = useState(searchParams.get("key") || "");
  const [viewerTab, setViewerTab] = useState<"ccnl" | "nccs">("ccnl");
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

  const handleOrderResult = useCallback((status: "success" | "error", message: string) => {
    addToast(status, message);
    if (status === "success") {
      dispatch(reqGetOverseasStockTradingInquirePresentBalance(balanceKey));
      dispatch(reqGetOverseasStockTradingInquireCcnl(balanceKey));
      dispatch(reqGetOverseasStockTradingInquireNccs(balanceKey));
      setLastUpdated(new Date());
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
    if (session?.user?.name === process.env.NEXT_PUBLIC_MASTER) {
      dispatch(reqGetKakaoMemberList());
    }
  }, [session, dispatch]);

  useEffect(() => {
    if (!balanceKey || balanceKey === "undefined") return;
    if (searchParams.get("key") !== balanceKey) {
      router.replace(`${pathname}?key=${balanceKey}`);
    }
    fetchAll(balanceKey);
  }, [balanceKey]);

  useEffect(() => {
    const states = [usCapitalPlusAll?.state, usCapitalPlusOne?.state, usCapitalMinusAll?.state, usCapitalMinusOne?.state];
    if (states.some(s => s === "fulfilled")) {
      dispatch(reqGetUsCapital(balanceKey));
      addToast("success", "토큰 잔액이 업데이트되었습니다.");
    }
  }, [usCapitalPlusAll?.state, usCapitalPlusOne?.state, usCapitalMinusAll?.state, usCapitalMinusOne?.state]);

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

  const doTokenPlusAll = (num: number) => dispatch(reqPostUsCapitalTokenPlusAll({ key: balanceKey, num }));
  const doTokenPlusOne = (num: number, ticker: string) => ticker && dispatch(reqPostUsCapitalTokenPlusOne({ key: balanceKey, num, ticker }));
  const doTokenMinusAll = (num: number) => dispatch(reqPostUsCapitalTokenMinusAll({ key: balanceKey, num }));
  const doTokenMinusOne = (num: number, ticker: string) => ticker && dispatch(reqPostUsCapitalTokenMinusOne({ key: balanceKey, num, ticker }));

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

  if (kiBalance.state === "rejected") {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl mb-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-black mb-2 dark:text-white">미국 계좌 조회 권한 없음</h2>
        <p className="text-sm text-zinc-500 mb-5 max-w-xs">해외 주식 API 권한 또는 접근 토큰을 확인해 주세요.</p>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-black rounded-xl"
        >
          <RefreshCw size={13} /> 다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-10 space-y-6">

        {/* 헤더 */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="space-y-2.5">
            {/* 브레드크럼 */}
            <nav className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Globe size={12} />
                해외 투자
              </span>
              <ChevronRight size={11} className="text-zinc-300 dark:text-zinc-600" />
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
                <Building2 size={11} />미국(US)
              </span>
            </nav>

            {/* 타이틀 */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
                US Portfolio
              </h1>
              <span className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm shadow-blue-600/30">
                <DollarSign size={11} /> USD Account
              </span>
            </div>

            {/* 마지막 업데이트 */}
            {lastUpdated ? (
              <p className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                <Clock size={11} />
                {lastUpdated.toLocaleTimeString("ko-KR")} 기준
              </p>
            ) : (
              <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <BalanceHeaderActions
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={() => setAutoRefresh(v => !v)}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              extra={
                exRate > 0 ? (
                  <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">고시환율</span>
                    <span className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">
                      {exRate.toLocaleString()}원
                    </span>
                  </div>
                ) : undefined
              }
            />
          </div>
        </header>

        <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />

        {/* KPI 카드 */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <UsdKpiCard
            label="총 자산 (USD)"
            mainValue={isLoading ? null : fmtUsd(totalAssetUsd)}
            mainColor="text-blue-600 dark:text-blue-400"
            subLabel="원화 평가액"
            subValue={isLoading ? null : fmtKrw(totalAssetKrw)}
            icon={<BarChart3 size={15} />}
            iconBg="bg-blue-50 dark:bg-blue-950/40 text-blue-500"
            accentColor="bg-blue-400 dark:bg-blue-600"
            loading={isLoading}
          />
          <UsdKpiCard
            label="외화 예수금 (USD)"
            mainValue={isLoading ? null : fmtUsd(depositUsd)}
            subLabel="원화 환산액"
            subValue={isLoading ? null : fmtKrw(depositKrw)}
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
            mainValue={isLoading ? null : `${isPnlPositive ? "+" : ""}${totalPnlRate.toFixed(2)}%`}
            mainColor={pnlValueColor(isPnlPositive)}
            subLabel="손익 합계"
            subValue={isLoading ? null : fmtKrw(totalPnlKrw)}
            subColor={pnlValueColor(isPnlPositive)}
            icon={isPnlPositive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
            iconBg={pnlIconBg(isPnlPositive)}
            accentColor={pnlAccentColor(isPnlPositive)}
            loading={isLoading}
          />
        </section>

        {/* 잔고 조회 패널 */}
        <SectionPanel>
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
            onOrderResult={handleOrderResult}
          />
        </SectionPanel>

        {/* NCAV 운용 종목 관리 패널 */}
        {hasCapital && (
          <SectionPanel>
            <SectionHeader
              icon={<Database size={16} />}
              title="NCAV 운용 종목 관리"
              subtitle="미국 전략 자동매매 종목 풀 및 토큰(예산) 관리"
              badge={
                usCapital.state === "pending"
                  ? <span className="text-[10px] font-mono text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">로딩 중</span>
                  : usCapital.stock_list?.length > 0
                  ? <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{usCapital.stock_list.length}종목</span>
                  : null
              }
            />
            <StockListTable
              data={usCapital}
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
        <SectionPanel>
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

          <div className="overflow-x-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
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
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
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

      </div>
    </div>
  );
}
