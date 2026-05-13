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
    RefreshCw,
    Loader2
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

function formatNumber(num: number) {
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

    const exRate = kiBalance?.output2?.[0]?.frst_bltn_exrt;

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

                    {exRate && (
                        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 px-5 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                                환율 정보
                            </span>
                            <span className="text-xl font-mono font-black text-blue-600 dark:text-blue-400">
                                ₩{formatNumber(Number(exRate))}
                            </span>
                        </div>
                    )}
                </header>

                <div className="h-px bg-zinc-200 dark:bg-zinc-800 mb-12" />

                {/* Main Grid */}
                <div className="space-y-16">
                    
                    {/* 1. Real-time Balance Result */}
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <InquireBalanceResult
                            balanceKey={balanceKey}
                            setBalanceKey={setBalanceKey}
                            kiBalance={kiBalance}
                            reqGetInquireBalance={reqGetOverseasStockTradingInquirePresentBalance}
                            // reqGetInquireCcnl={reqGetOverseasStockTradingInquireCcnl}
                            // reqGetInquireNccs={reqGetOverseasStockTradingInquireNccs}
                            reqGetUsCapital={reqGetUsCapital}
                            // kiOrderCash={kiUsOrder}
                            // reqPostOrderCash={reqPostOrderUs}
                            // kakaoTotal={kakaoTotal}
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