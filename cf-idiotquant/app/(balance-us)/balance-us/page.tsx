"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
    Globe, 
    ChevronRight, 
    DollarSign, 
    History, 
    Clock, 
    AlertCircle, 
    Building2,
    Loader2,
    Wallet,
    TrendingUp,
    BarChart3
} from "lucide-react";

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
    KakaoTotal,
    reqGetKakaoMemberList,
    selectKakaoMemberList,
    selectKakaoTotal
} from "@/lib/features/kakao/kakaoSlice";
import {
    KrUsCapitalType,
    reqGetUsCapital,
    reqPostUsCapitalTokenPlusAll,
    reqPostUsCapitalTokenPlusOne,
    reqPostUsCapitalTokenMinusAll,
    reqPostUsCapitalTokenMinusOne,
    selectUsCapital,
    selectUsCapitalTokenMinusAll,
    selectUsCapitalTokenPlusAll,
    selectUsCapitalTokenPlusOne,
    selectUsCapitalTokenMinusOne
} from "@/lib/features/capital/capitalSlice";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import OverseasCcnlTable from "@/components/balance/ccnlTable";
import OverseasNccsTable from "@/components/balance/nccsTable";
import StockListTable from "@/components/balance/stockListTable";
import { useSession } from "next-auth/react";

// 국장 스타일의 엄격한 통화 단위 포맷터
function formatCurrency(value: number | string, type: "KRW" | "USD" | "RAW" = "RAW") {
    const num = Number(value);
    if (isNaN(num)) return "0";

    if (type === "KRW") {
        // 원화는 소수점 없이 정수형태로 포맷팅
        return `₩${Math.floor(num).toLocaleString()}`;
    }
    if (type === "USD") {
        // 달러는 소수점 2자리 유지
        return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    // 일반 수량 및 소수점 가변 처리
    return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
}

export default function Page() {
    return (
        <Suspense fallback={<LoadingState />}>
            <BalanceUs />
        </Suspense>
    );
}

function LoadingState() {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black text-zinc-500">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600" />
            <h2 className="text-lg font-bold">데이터를 불러오는 중...</h2>
            <p className="text-sm opacity-70">잠시만 기다려 주세요.</p>
        </div>
    );
}

function BalanceUs() {
    const { data: session } = useSession();
    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Redux Selectors
    const kiBalance: KoreaInvestmentOverseasPresentBalance = useAppSelector(getKoreaInvestmentUsMaretPresentBalance);
    const kiCcnl: KoreaInvestmentOverseasCcnl = useAppSelector(getKoreaInvestmentUsMaretCcnl);
    const kiNccs: KoreaInvestmentOverseasNccs = useAppSelector(getKoreaInvestmentUsMaretNccs);
    const kiUsOrder: KoreaInvestmentUsOrder = useAppSelector(getKoreaInvestmentUsOrder);
    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
    const kakaoMemberList = useAppSelector(selectKakaoMemberList);
    const usCapital: KrUsCapitalType = useAppSelector(selectUsCapital);

    const [balanceKey, setBalanceKey] = useState(searchParams.get("key") || "");

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

        dispatch(reqGetOverseasStockTradingInquirePresentBalance(balanceKey));
        dispatch(reqGetOverseasStockTradingInquireCcnl(balanceKey));
        dispatch(reqGetOverseasStockTradingInquireNccs(balanceKey));
        dispatch(reqGetUsCapital(balanceKey));
    }, [balanceKey, dispatch, pathname, router, searchParams]);

    const refreshStates = [
        useAppSelector(selectUsCapitalTokenPlusAll),
        useAppSelector(selectUsCapitalTokenPlusOne),
        useAppSelector(selectUsCapitalTokenMinusAll),
        useAppSelector(selectUsCapitalTokenMinusOne)
    ];

    useEffect(() => {
        if (refreshStates.some(s => s?.state === "fulfilled")) {
            dispatch(reqGetUsCapital(balanceKey));
        }
    }, [refreshStates, balanceKey, dispatch]);

    if (kiBalance.state === "rejected") {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center text-center p-6">
                <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4">
                    <AlertCircle className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-black mb-2 dark:text-white">미국 계좌 조회 권한 없음</h2>
                <p className="text-zinc-500 mb-6 max-w-xs">해외 주식 API 권한 또는 접근 토큰을 확인해 주세요.</p>
                <span className="px-4 py-2 bg-red-600 text-white text-xs font-black rounded-lg tracking-widest uppercase">
                    Access Denied
                </span>
            </div>
        );
    }

    const doTokenPlusAll = (num: number) => dispatch(reqPostUsCapitalTokenPlusAll({ key: balanceKey, num }));
    const doTokenPlusOne = (num: number, ticker: string) => ticker && dispatch(reqPostUsCapitalTokenPlusOne({ key: balanceKey, num, ticker }));
    const doTokenMinusAll = (num: number) => dispatch(reqPostUsCapitalTokenMinusAll({ key: balanceKey, num }));
    const doTokenMinusOne = (num: number, ticker: string) => ticker && dispatch(reqPostUsCapitalTokenMinusOne({ key: balanceKey, num, ticker }));

    // --- 📊 제공된 계좌 잔고 인터페이스 기반 정밀 가공 엔진 ---
    const out2 = kiBalance?.output2?.[0];
    const out3 = kiBalance?.output3;

    // 1. 고시 환율 파싱 (output2.frst_bltn_exrt)
    const exRate = Number(out2?.frst_bltn_exrt || 0);

    // 2. 총 자산 금액 설정 (output3.tot_asst_amt)
    const totalAssetKrw = Number(out3?.tot_asst_amt || 0);
    const totalAssetUsd = exRate > 0 ? totalAssetKrw / exRate : 0;

    // 3. 외화 예수금 설정 (output2.frcr_dncl_amt_2: 외화D+2예수금금액)
    const depositUsd = Number(out2?.frcr_dncl_amt_2 || out2?.frcr_drwg_psbl_amt_1 || 0);
    const depositKrw = depositUsd * exRate;

    // 4. 주식 평가금액 총액 설정 (output3.evlu_amt_smtl_amt 또는 원화기반 차액 산출)
    const stockEvaluationKrw = Number(out3?.evlu_amt_smtl_amt || (totalAssetKrw - depositKrw));
    const stockEvaluationUsd = exRate > 0 ? stockEvaluationKrw / exRate : 0;

    // 5. 총 평가 손익 및 손익률 설정 (output3.tot_evlu_pfls_amt, output3.evlu_erng_rt1)
    const totalProfitLossKrw = Number(out3?.tot_evlu_pfls_amt || 0);
    const totalProfitRate = Number(out3?.evlu_erng_rt1 || 0);

    return (
        <div className="bg-zinc-50 dark:bg-black min-h-screen transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
                
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div className="space-y-4">
                        {/* Breadcrumbs */}
                        <nav className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 hover:text-zinc-600 transition-colors">
                                <Globe size={14} /> 해외 투자
                            </span>
                            <ChevronRight size={12} />
                            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                <Building2 size={14} /> 미국(US) 시장
                            </span>
                        </nav>

                        <div className="flex flex-wrap items-center gap-4">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter dark:text-white">
                                US PORTFOLIO
                            </h1>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black tracking-widest uppercase shadow-lg shadow-blue-600/20">
                                <DollarSign size={12} /> USD Account
                            </div>
                        </div>
                    </div>

                    {exRate > 0 && (
                        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 px-5 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                                현재 고시 환율 (원/달러)
                            </span>
                            <span className="text-xl font-mono font-black text-blue-600 dark:text-blue-400">
                                {formatCurrency(exRate, "RAW")}원
                            </span>
                        </div>
                    )}
                </header>

                <div className="h-px bg-zinc-200 dark:bg-zinc-800 mb-12" />

                {/* 📊 상단 핵심 잔고 요약 대시보드 카드 그리드 */}
                <section className="mb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in duration-500">
                    
                    {/* 카드 1: 총 자산 */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">총 자산 (USD)</span>
                                <BarChart3 size={14} className="text-blue-500" />
                            </div>
                            <div className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400 font-mono">
                                {formatCurrency(totalAssetUsd, "USD")}
                            </div>
                        </div>
                        <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs font-bold text-zinc-400 dark:text-zinc-500 flex justify-between">
                            <span>원화 평가액</span>
                            <span className="font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(totalAssetKrw, "KRW")}</span>
                        </div>
                    </div>

                    {/* 카드 2: 외화 예수금 */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">외화 예수금 (USD)</span>
                                <Wallet size={14} className="text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <div className="text-2xl font-black tracking-tight text-zinc-800 dark:text-white font-mono">
                                {formatCurrency(depositUsd, "USD")}
                            </div>
                        </div>
                        <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs font-bold text-zinc-400 dark:text-zinc-500 flex justify-between">
                            <span>원화 환산액</span>
                            <span className="font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(depositKrw, "KRW")}</span>
                        </div>
                    </div>

                    {/* 카드 3: 주식 평가총액 */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">주식 평가총액</span>
                                <TrendingUp size={14} className="text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <div className="text-2xl font-black tracking-tight text-zinc-800 dark:text-white font-mono">
                                {formatCurrency(stockEvaluationUsd, "USD")}
                            </div>
                        </div>
                        <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs font-bold text-zinc-400 dark:text-zinc-500 flex justify-between">
                            <span>원화 환산액</span>
                            <span className="font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(stockEvaluationKrw, "KRW")}</span>
                        </div>
                    </div>

                    {/* 카드 4: 총 평가 손익 */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
                        <div>
                            <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">총 수익률</span>
                            <div className={`text-2xl font-black tracking-tight font-mono ${totalProfitLossKrw >= 0 ? "text-rose-500" : "text-blue-500"}`}>
                                {totalProfitLossKrw >= 0 ? "+" : ""}{totalProfitRate.toFixed(2)}%
                            </div>
                        </div>
                        <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs font-bold text-zinc-400 dark:text-zinc-500 flex justify-between">
                            <span>손익 합계</span>
                            <span className={`font-mono font-bold ${totalProfitLossKrw >= 0 ? "text-rose-500" : "text-blue-500"}`}>
                                {formatCurrency(totalProfitLossKrw, "KRW")}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Main Grid */}
                <div className="space-y-16">
                    
                    {/* 1. Real-time Balance Result & Order Panel */}
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                        />
                    </section>

                    {/* 2. Algorithm Strategy Section */}
                    <CustomSection 
                        title="Algorithm Management" 
                        subtitle="알고리즘 운용 전략"
                        icon={<Globe className="text-blue-500" size={20} />}
                    >
                        <StockListTable
                            data={usCapital}
                            kakaoTotal={kakaoTotal}
                            doTokenPlusAll={doTokenPlusAll}
                            doTokenMinusAll={doTokenMinusAll}
                            doTokenPlusOne={doTokenPlusOne}
                            doTokenMinusOne={doTokenMinusOne}
                            session={session}
                        />
                    </CustomSection>

                    {/* 3. History & Open Orders Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <CustomSection 
                            title="Executed History" 
                            subtitle="최근 체결 내역"
                            icon={<History className="text-emerald-500" size={20} />}
                        >
                            <div className="min-h-[300px]">
                                <OverseasCcnlTable data={kiCcnl} />
                            </div>
                        </CustomSection>

                        <CustomSection 
                            title="Open Orders" 
                            subtitle="미체결 주문"
                            icon={<Clock className="text-amber-500" size={20} />}
                        >
                            <div className="min-h-[300px]">
                                <OverseasNccsTable data={kiNccs} />
                            </div>
                        </CustomSection>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Reusable Layout Components ---

function CustomSection({ title, subtitle, icon, children }: { title: string, subtitle: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-sm font-black dark:text-white uppercase tracking-tighter leading-none mb-1">{title}</h2>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{subtitle}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-sm">
                {children}
            </div>
        </section>
    );
}