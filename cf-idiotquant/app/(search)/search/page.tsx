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
// Lucide React 아이콘 사용 권장 (혹은 Heroicons)
import { History, AlertCircle, Loader2 } from 'lucide-react';

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
      setFixed(window.scrollY > 400);
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

  if (!hasMounted)
    return (
      <div className="w-full min-h-screen bg-gray-50 dark:bg-zinc-950" />
    );

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-zinc-950">
      <header
        className={`w-full transition-all duration-300 z-[50] ${fixed
          ? 'fixed top-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-b dark:border-zinc-800 shadow-sm'
          : 'relative bg-white dark:bg-zinc-900 border-b dark:border-zinc-800'
          }`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="px-3 py-2">
            <SearchAutocomplete
              placeHolder="🇰🇷 종목명 또는 🇺🇸 티커"
              onSearchButton={handleSearch}
              validCorpNameArray={all_tickers}
            />
          </div>

          {!fixed && (
            <div className="flex flex-col border-t dark:border-zinc-800/50">
              {/* HOT 10 리스트 */}
              <div className="flex items-center gap-3 px-4 py-2 border-b dark:border-zinc-800/30">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                  </span>
                  <span className="text-[9px] font-black text-red-500 italic whitespace-nowrap uppercase">
                    Hot 10
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
                  {popularStocks.map((s: any, i: number) => (
                    <button
                      key={`hot-${i}`}
                      onClick={() => handleSearch(s.ticker)}
                      className="flex-shrink-0 px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/30 text-[11px] font-bold text-red-600 dark:text-red-400 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <span className="mr-1 opacity-50">{i + 1}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* RECENT 검색 리스트 */}
              <div className="flex items-center gap-3 px-4 py-1.5">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <History size={10} className="text-zinc-400" />
                  <span className="text-[9px] font-black text-zinc-400 italic whitespace-nowrap uppercase">
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
                          className="flex-shrink-0 px-2 py-0.5 text-[11px] font-medium text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
                        >
                          {s}
                        </button>
                      ))
                  ) : (
                    <span className="text-[10px] text-zinc-300 italic">
                      No history
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Error Callout 대체 */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {!tickerFromUrl ? (
          <SearchGuide />
        ) : (
          <>
            {/* Spinner 대체 */}
            {waitResponse && !isLoaded && (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-blue-500" size={40} />
                <p className="text-sm text-zinc-500 animate-pulse">데이터를 분석하고 있습니다...</p>
              </div>
            )}
            
            <div className={!isLoaded ? 'hidden' : 'block'}>
              <div className="flex justify-center mb-10">
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

              <StockHeader data={data} isUs={krOrUs === 'US'} isFixed={fixed} />

              <div className={fixed ? 'pt-8 transition-all' : ''}>
                <StockMetrics data={data} isUs={krOrUs === 'US'} />
                <ValuationSection data={data} isUs={krOrUs === 'US'} />
                {krOrUs === 'KR' ? (
                  <FinancialTables kiBS={data.kiBS} kiIS={data.kiIS} />
                ) : (
                  <FinnhubTable data={data.finnhubData.data} />
                )}
                
                {/* Blueprint Card 대체 */}
                {response && (
                  <div className="mt-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md overflow-hidden border-t-4 !border-t-blue-500">
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
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p className="text-sm text-zinc-500">페이지를 준비 중입니다...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}