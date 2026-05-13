"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  Loader2, 
  Lock, 
  LayoutDashboard, 
  ChevronRight, 
  MapPin, 
  Flag, 
  Activity,
  Layers
} from "lucide-react";
import { useSession } from "next-auth/react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  reqGetInquireBalance,
  getKoreaInvestmentBalance,
  KoreaInvestmentBalance,
  getKoreaInvestmentOrderCash,
  KoreaInvestmentOrderCash,
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

// --- Loading State ---
function LoadingState() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
      <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">데이터를 불러오는 중...</h2>
      <p className="text-zinc-500 dark:text-zinc-400 mt-2">잠시만 기다려 주세요.</p>
    </div>
  );
}

// --- Main Page Export ---
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BalanceKr />
    </Suspense>
  );
}

// --- Component: BalanceKr ---
function BalanceKr() {
  const { data: session } = useSession();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Redux Selectors
  const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
  const krCapital: KrUsCapitalType = useAppSelector(selectKrCapital);
  const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
  const kakaoMemberList = useAppSelector(selectKakaoMemberList);

  const krCapitalTokenPlusAll = useAppSelector(selectKrCapitalTokenPlusAll);
  const krCapitalTokenPlusOne = useAppSelector(selectKrCapitalTokenPlusOne);
  const krCapitalTokenMinusAll = useAppSelector(selectKrCapitalTokenMinusAll);
  const krCapitalTokenMinusOne = useAppSelector(selectKrCapitalTokenMinusOne);

  const [balanceKey, setBalanceKey] = useState(searchParams.get("key") || String(session?.user?.id || ""));

  // 1. URL 파라미터와 balanceKey 상태 동기화
  useEffect(() => {
    const urlKey = searchParams.get("key");
    if (urlKey && urlKey !== balanceKey) setBalanceKey(urlKey);
  }, [searchParams]);

  useEffect(() => {
    if (session?.user?.name === process.env.NEXT_PUBLIC_MASTER) {
      dispatch(reqGetKakaoMemberList());
    }
  }, [session]);

  // 2. balanceKey가 변경될 때마다 URL 업데이트 및 데이터 리프레시
  useEffect(() => {
    if (balanceKey && balanceKey !== "undefined") {
      router.replace(`${pathname}?key=${balanceKey}`);
      dispatch(reqGetInquireBalance(balanceKey));
      if (pathname.includes("kr")) dispatch(reqGetKrCapital(balanceKey));
      else dispatch(reqGetUsCapital(balanceKey));
    }
  }, [balanceKey, pathname, router, dispatch]);

  // 초기 데이터 로딩
  useEffect(() => {
    if (session?.user?.id) {
      dispatch(reqGetInquireBalance(session.user.id));
      setBalanceKey(String(session.user.id));
    }
    dispatch(reqGetCapitalToken());
  }, [dispatch, session]);

  useEffect(() => {
    if (krCapital.state === "init" && session?.user?.id) {
      dispatch(reqGetKrCapital(session.user.id));
    }
  }, [krCapital.state, session, dispatch]);

  const refreshStates = [krCapitalTokenPlusAll, krCapitalTokenPlusOne, krCapitalTokenMinusAll, krCapitalTokenMinusOne];
  useEffect(() => {
    if (refreshStates.some(s => s?.state === "fulfilled")) {
      dispatch(reqGetKrCapital(balanceKey));
    }
  }, [refreshStates, balanceKey, dispatch]);

  // 권한 없음 UI
  if (kiBalance.state === "rejected") {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2">접근 권한 없음</h2>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">
          계좌 조회 권한이 없거나 토큰이 만료되었습니다.<br /> 관리자에게 문의해 주세요.
        </p>
      </div>
    );
  }

  // 핸들러 함수들
  const doTokenPlusAll = (num: number) => dispatch(reqPostKrCapitalTokenPlusAll({ key: balanceKey, num }));
  const doTokenPlusOne = (num: number, ticker: string) => ticker && dispatch(reqPostKrCapitalTokenPlusOne({ key: balanceKey, num, ticker }));
  const doTokenMinusAll = (num: number) => dispatch(reqPostKrCapitalTokenMinusAll({ key: balanceKey, num }));
  const doTokenMinusOne = (num: number, ticker: string) => ticker && dispatch(reqPostKrCapitalTokenMinusOne({ key: balanceKey, num, ticker }));

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
              Real-time Korea Investment Data
            </span>
          </div>
        </header>

        <div className="h-px w-full bg-gradient-to-r from-zinc-200 dark:from-zinc-800 via-transparent to-transparent mb-12" />

        {/* --- Main Content --- */}
        <div className="grid grid-cols-1 gap-12">
          
          {/* Section 1: Balance Result */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <InquireBalanceResult
              balanceKey={balanceKey}
              setBalanceKey={setBalanceKey}
              kiBalance={kiBalance}
              reqGetInquireBalance={reqGetInquireBalance}
              kakaoMemberList={kakaoMemberList}
            />
          </section>

          {/* Section 2: Algorithm Management */}
          <section className="animate-in fade-in slide-in-from-bottom-6 duration-1000 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Layers className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="font-black text-xl text-zinc-900 dark:text-zinc-100">알고리즘 운용 종목 관리</h2>
                  <p className="text-xs text-zinc-500 font-medium">실시간 토큰 배정 및 수량 조절</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
              <StockListTable
                data={krCapital}
                kakaoTotal={kakaoTotal}
                doTokenPlusAll={doTokenPlusAll}
                doTokenMinusAll={doTokenMinusAll}
                doTokenPlusOne={doTokenPlusOne}
                doTokenMinusOne={doTokenMinusOne}
                session={session}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}