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
import { MdTableTemplate } from './components/MdTableTemplate';
import { StockMetrics } from './components/StockMetrics';
import {
  calculateKrNcavRatio,
  calculateKrNcavValue,
  calculateUsNcavRatio,
  calculateUsNcavValue,
  getKrNcavGrade,
  getKrSRIMTargetPrice,
  getUsNcavGrade,
  getUsSRIMTargetPrice,
} from '../../../components/utils/financeCalc';
import { SearchGuide } from './components/SearchGuide';
import { StockCard } from './components/StockCard';
import {
  reqGetSearchLog,
  selectPopularStocks,
} from '@/lib/features/searchLog/searchLogSlice';
import corpCodeJson from '@/public/data/validCorpCode.json';
import { History, AlertCircle, Loader2, Sparkles, Flame } from 'lucide-react';
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
  const { onSearch, krOrUs, response, data, name, waitResponse } =
    useStockSearch();

  const krMarketHistory = useAppSelector(selectKrMarketHistory);
  const popularStocks = useAppSelector(selectPopularStocks) || [];

  const [fixed, setFixed] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🔥 검색창 상태 정밀 추적 (포커스 여부 및 텍스트 공백 여부)
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
      data:
        rawData
          ?.map((i: any) => Number(isUs ? i.clos : i.stck_clpr))
          .reverse() || [],
      categories:
        rawData
          ?.map((i: any) => (isUs ? i.xymd : i.stck_bsop_date))
          .reverse() || [],
      color: isUs ? '#818cf8' : '#6366f1',
    };
  }, [krOrUs, data]);

  // 🔥 핵심 숨김 규칙: 인풋에 포커스가 잡혀있고 '검색어가 입력 중일 때만' 헤더를 가립니다. (빈 검색어일 때는 노출 보장)
  const shouldHideHeader = isSearchFocused && !isQueryEmpty;

  if (!hasMounted)
    return (
      <div className="w-full min-h-screen bg-zinc-50 dark:bg-zinc-950" />
    );

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased selection:bg-blue-500/30">
      
      <header
        className={cn(
          "w-full transition-all duration-300 ease-in-out",
          fixed
            ? "fixed top-0 z-[60] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 shadow-sm"
            : "relative z-[61] bg-white dark:bg-zinc-900 border-b border-zinc-200/60 dark:border-zinc-800/60"
        )}
      >
        <div className="max-w-6xl mx-auto">
          <div className="px-4 py-3">
            <SearchAutocomplete
              placeHolder="🇰🇷 검색할 종목명 또는 🇺🇸 티커명 입력"
              onSearchButton={handleSearch}
              validCorpNameArray={all_tickers}
              // 🔥 하위 컴포넌트로부터 포커스 상태와 쿼리가 비어있는지 상태를 동시에 받아옴
              onSearchStateChange={(focused, isEmpty) => {
                setIsSearchFocused(focused);
                setIsQueryEmpty(isEmpty);
              }}
            />
          </div>

          {!fixed && !isSearchFocused && (
            <div className="flex flex-col border-t border-zinc-100 dark:border-zinc-800/40 animate-in fade-in duration-200">
              {/* HOT 10 */}
              <div className="flex items-center gap-3 px-5 py-2.5 border-b border-zinc-100 dark:border-zinc-800/20">
                <div className="flex items-center gap-1.5 flex-shrink-0 text-rose-500">
                  <Flame size={12} className="animate-pulse fill-rose-500/20" />
                  <span className="text-[10px] font-black tracking-wider whitespace-nowrap uppercase font-sans">
                    Hot 10
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
                  {popularStocks.map((s: any, i: number) => (
                    <button
                      key={`hot-${i}`}
                      onClick={() => handleSearch(s.ticker)}
                      className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-[11px] font-bold text-rose-600 dark:text-rose-400 border border-rose-100/30 dark:border-rose-900/20 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <span className="mr-1 opacity-40 font-mono">{i + 1}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* RECENT */}
              <div className="flex items-center gap-3 px-5 py-2">
                <div className="flex items-center gap-1.5 flex-shrink-0 text-zinc-400 dark:text-zinc-500">
                  <History size={11} />
                  <span className="text-[10px] font-black tracking-wider whitespace-nowrap uppercase font-sans">
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
                          className="flex-shrink-0 px-2 py-0.5 text-[11px] font-bold text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors whitespace-nowrap"
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

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/60 flex items-center gap-3 text-red-700 dark:text-red-400 animate-in slide-in-from-top-2">
            <AlertCircle size={18} />
            <span className="text-sm font-semibold tracking-tight">{error}</span>
          </div>
        )}

        {!tickerFromUrl ? (
          <SearchGuide />
        ) : (
          <>
            {waitResponse && !isLoaded && (
              <div className="py-24 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-blue-500 dark:text-indigo-400" size={36} />
                <p className="text-sm font-bold text-zinc-400 dark:text-zinc-500 animate-pulse tracking-tight">
                  Premium Quant 엔진이 데이터를 정밀 분석하고 있습니다...
                </p>
              </div>
            )}
            
            <div className={!isLoaded ? 'hidden' : 'block'}>
              <div className="flex justify-center mb-8">
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
                        fairValue:
                          '$' +
                          calculateUsNcavValue(
                            data.finnhubData,
                            data.usDetail
                          ),
                        ncavScore: calculateUsNcavRatio(
                          data.finnhubData,
                          data.usDetail
                        ),
                        srimScore: getUsSRIMTargetPrice(data.finnhubData, data.usDetail),
                        per: data?.usDetail?.output?.perx ?? 0,
                        pbr: data?.usDetail?.output?.pbrx ?? 0,
                        eps: "$" + (data?.usDetail?.output?.epsx ?? 0),
                        sector: data?.usDetail?.output?.e_icod ?? "DEFAULT",
                      }
                      : {
                        code: tickerFromUrl,
                        isUs: false,
                        name,
                        ticker:
                          (corpCodeJson as any)?.[name]?.stock_code ?? '',
                        grade: getKrNcavGrade(data.kiBS, data.kiChart),
                        curPrice: data?.kiPrice?.output?.stck_prpr ?? 0,
                        fairValue:
                          '₩' + calculateKrNcavValue(data.kiBS, data.kiChart),
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

              {/* 🔥 최적화 적용 파트: 글자가 채워진 검색 상태일 때만 opacity와 단절 처리를 적용합니다. */}
              <div 
                className={cn(
                  "transition-all duration-300 ease-in-out transform-gpu",
                  shouldHideHeader 
                    ? "opacity-0 scale-95 pointer-events-none select-none z-[10]" 
                    : "opacity-100 scale-100 z-[35]"
                )}
              >
                <StockHeader data={data} isUs={krOrUs === 'US'} isFixed={fixed} />
              </div>

              <div className={cn(
                "transition-all duration-300",
                fixed && !shouldHideHeader ? 'pt-12' : 'pt-2'
              )}>
                <StockMetrics data={data} isUs={krOrUs === 'US'} />
                <ValuationSection data={data} isUs={krOrUs === 'US'} />
                {krOrUs === 'KR' ? (
                  <FinancialTables kiBS={data.kiBS} kiIS={data.kiIS} />
                ) : (
                  <FinnhubTable data={data.finnhubData.data} />
                )}
                
                {response && (
                  <div className="mt-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md overflow-hidden border-t-4 !border-t-blue-500 dark:!border-t-indigo-500">
                    <div className="p-4 md:p-6">
                      <MdTableTemplate content={response} />
                    </div>
                  </div>
                )}
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
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
          <Loader2 className="animate-spin text-blue-500 dark:text-indigo-400" size={32} />
          <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">엔진 시스템 부팅 중...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}