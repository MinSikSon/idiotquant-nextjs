'use client';

import React, { useState, useEffect, Suspense, useId, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { useStockSearch } from './hooks/useStockSearch';
import { StockHeader } from './components/StockHeader';
import { ValuationSection } from './components/ValuationSection';
import { FinancialTables } from './components/FinancialTables';
import FinnhubTable from './components/FinnhubTable';
import SearchAutocomplete from '@/components/searchAutoComplete';
import { selectKrMarketHistory } from '@/lib/features/searchHistory/searchHistorySlice';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorFallback } from './components/ErrorFallback';
import nasdaq_tickers from '@/public/data/usStockSymbols/nasdaq_tickers.json';
import nyse_tickers from '@/public/data/usStockSymbols/nyse_tickers.json';
import amex_tickers from '@/public/data/usStockSymbols/amex_tickers.json';
import validCorpCodeArray from '@/public/data/validCorpCodeArray.json';
import validCorpNameArray from '@/public/data/validCorpNameArray.json';
import { StockMetrics } from './components/StockMetrics';
import {
  calculateKrNcavRatio,
  calculateKrNcavValue,
  calculateUsNcavRatio,
  calculateUsNcavValue,
  getKrNcavGrade,
  getKrSRIMTargetPrice,
  getUsNcavGrade,
  calculateUsSRIM,
} from '../../../components/utils/financeCalc';
import { SearchGuide } from './components/SearchGuide';
import { StockCard } from './components/StockCard';
import {
  reqGetSearchLog,
  selectPopularStocks,
} from '@/lib/features/searchLog/searchLogSlice';
import corpCodeJson from '@/public/data/validCorpCode.json';
import { History, AlertCircle, Loader2, Sparkles, Flame, HelpCircle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const all_tickers = [
  ...nasdaq_tickers,
  ...nyse_tickers,
  ...amex_tickers,
  ...validCorpCodeArray,
  ...validCorpNameArray,
];

function SearchContent() {
  const sectionId = useId();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const { onSearch, krOrUs, response, data, name, waitResponse } = useStockSearch();

  const krMarketHistory = useAppSelector(selectKrMarketHistory);
  const popularStocks = useAppSelector(selectPopularStocks) || [];

  const [fixed, setFixed] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 검색창 상태 정밀 추적 (포커스 여부 및 텍스트 공백 여부)
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isQueryEmpty, setIsQueryEmpty] = useState(true);

  useEffect(() => {
    setHasMounted(true);
    dispatch(reqGetSearchLog('10'));
  }, [dispatch]);

  const handleSearch = (stockName: string) => {
    if (!stockName) return;
    if (!all_tickers.some((t) => t.toLowerCase() === stockName.toLowerCase())) {
      setError(`'${stockName}'은(는) 목록에 없는 종목입니다.`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    router.push(`/search?ticker=${encodeURIComponent(stockName)}`);
  };

  useEffect(() => {
    const tickerFromUrl = searchParams.get('ticker');
    if (tickerFromUrl && tickerFromUrl !== name) onSearch(tickerFromUrl);
  }, [searchParams, name, onSearch]);

  useEffect(() => {
    const handleScroll = () => {
      setFixed(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const tickerFromUrl = searchParams.get('ticker');
  const isLoaded =
    tickerFromUrl === name &&
    (data.kiChart.state === 'fulfilled' ||
      data.usSearchInfo.state === 'fulfilled');

  const chartConfig = useMemo(() => {
    const isUs = krOrUs === 'US';
    const rawData = isUs ? data.usDaily?.output2 : data.kiChart?.output2;
    return {
      data: rawData?.map((i: any) => Number(isUs ? i.clos : i.stck_clpr)).reverse() || [],
      categories: rawData?.map((i: any) => (isUs ? i.xymd : i.stck_bsop_date)).reverse() || [],
      color: isUs ? '#3b82f6' : '#6366f1',
    };
  }, [krOrUs, data]);

  // 핵심 숨김 규칙: 인풋에 포커스가 잡혀있고 '검색어가 입력 중일 때만' 헤더를 가립니다.
  const shouldHideHeader = isSearchFocused && !isQueryEmpty;

  if (!hasMounted) return <div className="w-full min-h-screen bg-zinc-50 dark:bg-zinc-950" />;

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased selection:bg-blue-500/30 transition-colors duration-300">
      
      {/* 바 브라우저 상단 고정 및 인터페이스 레이어 */}
      <header
        className={cn(
          "w-full transition-all duration-300 ease-in-out",
          fixed
            ? "fixed top-0 z-[60] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 shadow-md"
            : "relative z-[31] bg-white dark:bg-zinc-900 border-b border-zinc-200/60 dark:border-zinc-800/60"
        )}
      >
        <div className="max-w-6xl mx-auto">
          <div className="px-4 py-3.5">
            <SearchAutocomplete
              placeHolder="🇰🇷 검색할 종목명 또는 🇺🇸 티커명 입력"
              onSearchButton={handleSearch}
              validCorpNameArray={all_tickers}
              onSearchStateChange={(focused, isEmpty) => {
                setIsSearchFocused(focused);
                setIsQueryEmpty(isEmpty);
              }}
            />
          </div>

          {!fixed && !isSearchFocused && (
            <div className="flex flex-col border-t border-zinc-100 dark:border-zinc-800/40 animate-in fade-in duration-200">
              {/* 인기 실시간 검색 종목 배너 */}
              <div className="flex items-center gap-3 px-5 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/10 border-b border-zinc-100 dark:border-zinc-800/20">
                <div className="flex items-center gap-1.5 flex-shrink-0 text-rose-500">
                  <Flame size={13} className="animate-pulse fill-rose-500/20" />
                  <span className="text-[10px] font-black tracking-wider whitespace-nowrap uppercase font-mono">
                    Hot 10
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
                  {popularStocks.map((s: any, i: number) => (
                    <button
                      key={`hot-${i}`}
                      onClick={() => handleSearch(s.ticker)}
                      className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800 shadow-sm hover:border-rose-400 dark:hover:border-rose-500/50 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <span className="mr-1.5 opacity-40 font-mono text-rose-500 font-black">{i + 1}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 최근 탐색 히스토리 아카이브 */}
              <div className="flex items-center gap-3 px-5 py-2.5">
                <div className="flex items-center gap-1.5 flex-shrink-0 text-zinc-400 dark:text-zinc-500">
                  <History size={12} />
                  <span className="text-[10px] font-black tracking-wider whitespace-nowrap uppercase font-mono">
                    Recent
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
                  {krMarketHistory.length > 0 ? (
                    krMarketHistory
                      .slice()
                      .reverse()
                      .map((s, i) => (
                        <button
                          key={`recent-${i}`}
                          onClick={() => handleSearch(s)}
                          className="flex-shrink-0 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors whitespace-nowrap font-sans"
                        >
                          {s}
                        </button>
                      ))
                  ) : (
                    <span className="text-[10px] text-zinc-300 dark:text-zinc-700 italic font-medium">
                      No history items
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 대시보드 메인 메트릭 바디 스페이스 */}
      <main className="max-w-6xl mx-auto p-4 md:p-6 transition-all duration-300">
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/50 flex items-center gap-3 text-red-700 dark:text-red-400 shadow-sm animate-in slide-in-from-top-2">
            <AlertCircle size={16} className="shrink-0" />
            <span className="text-xs font-bold tracking-tight">{error}</span>
          </div>
        )}

        {!tickerFromUrl ? (
          <SearchGuide />
        ) : (
          <>
            {/* 트랜잭션 수신 대기 대형 인디케이터 */}
            {waitResponse && !isLoaded && (
              <div className="py-32 flex flex-col items-center justify-center gap-4">
                <div className="relative p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800">
                  <Loader2 className="animate-spin text-blue-500 dark:text-indigo-400" size={32} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 tracking-tight">퀀트 엔진 인텔리전스 가동 중</p>
                  <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 animate-pulse font-mono">
                    Fetching and verifying financial data statements...
                  </p>
                </div>
              </div>
            )}
            
            {/* 가치분석 대시보드 본문 스트럭처 */}
            <div className={!isLoaded ? 'hidden' : 'block animate-in fade-in duration-500'}>
              
              {/* TCG 카드 프리뷰 앵커 프레임 */}
              <div className="flex justify-center mb-10 transform-gpu">
                <StockCard
                  stock={
                    krOrUs === 'US'
                      ? {
                        code: tickerFromUrl,
                        isUs: true,
                        name,
                        ticker: name,
                        grade: getUsNcavGrade(data.finnhubData, data.usDetail),
                        curPrice: Number(data?.usDetail?.output?.last ?? 0).toFixed(2),
                        fairValue: '$' + calculateUsNcavValue(data.finnhubData, data.usDetail),
                        ncavScore: calculateUsNcavRatio(data.finnhubData, data.usDetail),
                        srimScore: calculateUsSRIM(data.finnhubData, data.usDetail),
                        per: data?.usDetail?.output?.perx ?? 0,
                        pbr: data?.usDetail?.output?.pbrx ?? 0,
                        eps: "$" + (data?.usDetail?.output?.epsx ?? 0),
                        sector: data?.usDetail?.output?.e_icod ?? "DEFAULT",
                      }
                      : {
                        code: tickerFromUrl,
                        isUs: false,
                        name,
                        ticker: (corpCodeJson as any)?.[name]?.stock_code ?? '',
                        grade: getKrNcavGrade(data.kiBS, data.kiChart),
                        curPrice: data?.kiPrice?.output?.stck_prpr ?? 0,
                        fairValue: '₩' + calculateKrNcavValue(data.kiBS, data.kiChart),
                        ncavScore: calculateKrNcavRatio(data.kiBS, data.kiChart),
                        srimScore: getKrSRIMTargetPrice(data.kiBS, data.kiIS, data.kiChart),
                        per: data?.kiPrice?.output?.per ?? 0,
                        pbr: data?.kiPrice?.output?.pbr ?? 0,
                        eps: "₩" + Number(data?.kiPrice?.output?.eps ?? 0).toFixed(0),
                        sector: data?.kiPrice?.output?.bstp_kor_isnm ?? "DEFAULT",
                      }
                  }
                  chartConfig={chartConfig}
                  rawData={data}
                />
              </div>

              {/* 검색어 타이핑 시 스무스 헤더 히든 트리거 플레이스 */}
              <div 
                className={cn(
                  "transition-all duration-300 ease-in-out transform-gpu",
                  shouldHideHeader 
                    ? "opacity-0 scale-95 pointer-events-none select-none z-[10]" 
                    : "opacity-100 scale-100 z-[35]"
                )}
              >
                {/* <StockHeader data={data} isUs={krOrUs === 'US'} isFixed={fixed} /> */}
              </div>

              {/* 하위 정밀 서브 재무 도표 트랙 */}
              <div className={cn(
                "transition-all duration-300 space-y-8",
                fixed && !shouldHideHeader ? 'pt-2' : 'pt-2'
              )}>
                <StockMetrics data={data} isUs={krOrUs === 'US'} />
                
                <ValuationSection data={data} isUs={krOrUs === 'US'} />
                
                {krOrUs === 'KR' ? (
                  <FinancialTables kiBS={data.kiBS} kiIS={data.kiIS} />
                ) : (
                  <FinnhubTable data={data.finnhubData.data} />
                )}

                {/* 💡 정밀 가독성 강화: 가치투자 코어 지표 및 리포팅 가이드 서브 섹션 */}
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-100 p-6 rounded-2xl border border-zinc-800 shadow-xl space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider font-mono text-zinc-200">IdiotQuant 핵심 가치지표 해설서</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-zinc-400">
                    <p>
                      <strong className="text-zinc-200 block mb-1">1. 벤자민 그레이엄 NCAV (청산가치 공식)</strong>
                      순유동자산(유동자산 - 총부채)을 시가총액과 비교하여 기업이 영업을 중단하고 당장 청산했을 때의 가치를 산출합니다. NCAV Index 지표가 <span className="text-emerald-400 font-bold font-mono">1.0</span>을 상회한다는 것은 현재 주가보다 회사 통장에 들어있는 순자산 규모가 더 크다는 절대적 안전마진을 뜻합니다.
                    </p>
                    <p>
                      <strong className="text-zinc-200 block mb-1">2. S-RIM 사경인 회계사 적정주가 모델</strong>
                      자기자본(자본총계)에 기업의 기대 초과수익률(ROE)과 주주 요구수익률(회사채 BBB- 5년물 금리 등)을 대입하여 미래 가치를 현재 가치로 할인하는 고도화된 적정주가 밸류에이션 기법입니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-32 gap-4 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
          <Loader2 className="animate-spin text-blue-500 dark:text-indigo-400" size={32} />
          <p className="text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-widest font-mono uppercase">System Booting...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}