'use client';

import {
  useState,
  useEffect,
  Suspense,
  useMemo,
  useCallback,
  memo,
  startTransition
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { selectIsLiked, reqGetMyLikes, reqToggleLike } from '@/lib/features/stockLikes/stockLikesSlice';
import dynamic from 'next/dynamic';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { useStockSearch } from '@/app/(search)/search/hooks/useStockSearch';
import { selectKrMarketHistory } from '@/lib/features/searchHistory/searchHistorySlice';
import {
  AlertCircle, Loader2, Flame, Share2, Check, CheckCircle,
  DollarSign, Coins, Heart, X, TrendingUp, ChevronLeft, Lock, ArrowRight, BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =========================================================================
// Dynamic imports
// =========================================================================
const StockCard = dynamic(
  () => import('@/app/(search)/search/components/StockCard').then(mod => ({ default: mod.StockCard })),
  { loading: () => <StockCardSkeleton />, ssr: false }
);

const StockMetrics = dynamic(
  () => import('@/app/(search)/search/components/StockMetrics').then(mod => ({ default: mod.StockMetrics })),
  { loading: () => <MetricsSkeleton />, ssr: false }
);

const ValuationSection = dynamic(
  () => import('@/app/(search)/search/components/ValuationSection').then(mod => ({ default: mod.ValuationSection })),
  { loading: () => <ValuationSkeleton /> }
);

const DelistingRisk = dynamic(
  () => import('@/app/(analyze)/analyze/components/DelistingRisk').then(mod => ({ default: mod.DelistingRisk })),
  { ssr: false }
);

const UsDelistingRisk = dynamic(
  () => import('@/app/(analyze)/analyze/components/UsDelistingRisk').then(mod => ({ default: mod.UsDelistingRisk })),
  { ssr: false }
);

const FinancialTables = dynamic(
  () => import('@/app/(search)/search/components/FinancialTables'),
  { ssr: false }
);

const FinnhubTable = dynamic(
  () => import('@/app/(search)/search/components/FinnhubTable'),
  { ssr: false }
);

const SearchAutocomplete = dynamic(
  () => import('@/components/searchAutoComplete'),
  { loading: () => <SearchSkeleton /> }
);

const SearchGuide = dynamic(
  () => import('@/app/(search)/search/components/SearchGuide').then(mod => ({ default: mod.SearchGuide }))
);

// =========================================================================
// 정적 데이터 싱글톤 로더
// =========================================================================
interface StaticStockData {
  allTickers: string[];
  corpCodeJson: Record<string, any>;
}

let cachedStaticData: StaticStockData | null = null;
let staticDataPromise: Promise<StaticStockData> | null = null;

const loadStaticStockData = (): Promise<StaticStockData> => {
  if (cachedStaticData) return Promise.resolve(cachedStaticData);
  if (staticDataPromise) return staticDataPromise;

  staticDataPromise = Promise.all([
    import('@/public/data/usStockSymbols/nasdaq_tickers.json'),
    import('@/public/data/usStockSymbols/nyse_tickers.json'),
    import('@/public/data/usStockSymbols/amex_tickers.json'),
    import('@/public/data/validCorpCodeArray.json'),
    import('@/public/data/validCorpNameArray.json'),
    import('@/public/data/validCorpCode.json'),
    fetch('/api/proxy/ticker-map?source=overrides&limit=500')
      .then(r => r.json())
      .catch(() => ({ success: false, data: [] })),
  ]).then(([nasdaq, nyse, amex, corpCode, corpName, corpCodeData, overrides]) => {
    // override 항목: KR은 코드+이름 모두, US는 코드만 추가 (검색 유효성 검사 + 자동완성 확장)
    const overrideEntries: string[] = (overrides.data ?? []).flatMap((o: any) =>
      o.country === 'KR' ? [o.ticker, o.name].filter(Boolean) : [o.ticker].filter(Boolean)
    );
    cachedStaticData = {
      allTickers: [
        ...nasdaq.default, ...nyse.default, ...amex.default,
        ...corpCode.default, ...corpName.default,
        ...overrideEntries,
      ],
      corpCodeJson: corpCodeData.default,
    };
    return cachedStaticData;
  });

  return staticDataPromise;
};

import {
  reqGetSearchLog,
  selectPopularStocks,
} from '@/lib/features/searchLog/searchLogSlice';

import {
  calculateKrNcavRatio, calculateKrNcavValue,
  calculateUsNcavRatio, calculateUsNcavValue,
  getKrNcavGrade, getKrSRIMTargetPrice,
  getUsNcavGrade, calculateUsSRIM,
} from '../../../components/utils/financeCalc';

// =========================================================================
// 스켈레톤 컴포넌트
// =========================================================================
const StockCardSkeleton = memo(() => (
  <div className="w-full bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] overflow-hidden animate-pulse">
    <div className="h-[3px] w-full bg-neutral-200 dark:bg-[#35332e]" />
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-[52px] h-[52px] bg-[#faf9f7] dark:bg-[#1a1915] rounded-2xl border border-neutral-100 dark:border-[#35332e] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 bg-neutral-200 dark:bg-[#35332e] rounded w-2/3" />
            <div className="h-6 w-10 bg-neutral-200 dark:bg-[#35332e] rounded-lg" />
          </div>
          <div className="h-3 bg-neutral-200 dark:bg-[#35332e] rounded w-1/3" />
          <div className="h-6 bg-neutral-200 dark:bg-[#35332e] rounded w-1/2 mt-1" />
        </div>
      </div>
      <div className="h-10 bg-[#faf9f7] dark:bg-[#1a1915] rounded-xl border border-neutral-100 dark:border-[#35332e]" />
    </div>
    <div className="px-5 pb-4">
      <div className="h-[68px] bg-[#faf9f7] dark:bg-[#1a1915] rounded-xl border border-neutral-100 dark:border-[#35332e]" />
    </div>
    <div className="border-t border-neutral-100 dark:border-[#35332e] grid grid-cols-3 divide-x divide-neutral-100 dark:divide-[#35332e]">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="py-3 flex flex-col items-center gap-1.5">
          <div className="h-2 w-8 bg-neutral-200 dark:bg-[#35332e] rounded" />
          <div className="h-4 w-12 bg-neutral-200 dark:bg-[#35332e] rounded" />
        </div>
      ))}
    </div>
  </div>
));
StockCardSkeleton.displayName = 'StockCardSkeleton';

const MetricsSkeleton = memo(() => (
  <div className="w-full h-[380px] bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] animate-pulse p-6">
    <div className="h-5 bg-neutral-200 dark:bg-[#242320] rounded w-1/3 mb-5" />
    <div className="grid grid-cols-2 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="p-4 bg-[#faf9f7] dark:bg-[#242320]/50 rounded-xl space-y-2">
          <div className="h-3 bg-neutral-200 dark:bg-[#4a4641] rounded w-1/2" />
          <div className="h-5 bg-neutral-200 dark:bg-[#4a4641] rounded w-3/4" />
        </div>
      ))}
    </div>
  </div>
));
MetricsSkeleton.displayName = 'MetricsSkeleton';

const ValuationSkeleton = memo(() => (
  <div className="w-full h-[280px] bg-white dark:bg-[#242320] rounded-2xl animate-pulse p-6">
    <div className="h-5 bg-neutral-200 dark:bg-[#242320] rounded w-1/3 mb-5" />
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-neutral-200 dark:bg-[#242320] rounded-xl" />)}
    </div>
  </div>
));
ValuationSkeleton.displayName = 'ValuationSkeleton';

const SearchSkeleton = memo(() => (
  <div className="w-full h-11 bg-[#faf9f7] dark:bg-[#242320] rounded-xl animate-pulse" />
));
SearchSkeleton.displayName = 'SearchSkeleton';

const ResultSkeleton = memo(() => (
  <div className="space-y-4 animate-in fade-in duration-300">
    <div className="h-[88px] bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] animate-pulse" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white dark:bg-[#242320] rounded-xl border border-neutral-200 dark:border-[#35332e] animate-pulse" />)}
    </div>
    <div className="h-[420px] bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] animate-pulse" />
  </div>
));
ResultSkeleton.displayName = 'ResultSkeleton';

// =========================================================================
// BlurGate — 비로그인 시 섹션 블러 처리 + 그라디언트 로그인 오버레이
// =========================================================================
const BlurGate = memo(({ children, isLoggedIn, loginHref = "/login" }: {
  children: React.ReactNode;
  isLoggedIn: boolean;
  loginHref?: string;
}) => {
  if (isLoggedIn) return <>{children}</>;
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="blur-sm select-none pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/40 to-white/95 dark:from-[#242320]/40 dark:to-[#242320]/95">
        <Link
          href={loginHref}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold shadow-md shadow-[#16a34a]/20 transition-all"
        >
          <Lock size={13} />
          로그인하여 전체 보기
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
});
BlurGate.displayName = 'BlurGate';

// =========================================================================
// Toast
// =========================================================================
interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

const TOAST_DEFAULT_DURATION = 4000;

const Toast = memo(({ notification, onDismiss }: {
  notification: ToastNotification;
  onDismiss: (id: string) => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), notification.duration || TOAST_DEFAULT_DURATION);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  const colorMap = {
    success: 'bg-emerald-50/95 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400',
    error:   'bg-rose-50/95 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400',
    info:    'bg-[#f0fdf4]/95 dark:bg-[#052e16]/50 border-[#bbf7d0] dark:border-[#14532d]/50 text-[#15803d] dark:text-[#16a34a]',
    warning: 'bg-amber-50/95 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400',
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md",
      "animate-in slide-in-from-top-3 fade-in duration-300 pointer-events-auto",
      colorMap[notification.type]
    )}>
      <span className="text-xs font-bold leading-normal flex-1">{notification.message}</span>
      <button onClick={() => onDismiss(notification.id)}
        className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors shrink-0">
        <X size={14} />
      </button>
    </div>
  );
});
Toast.displayName = 'Toast';

const useToast = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const addToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
    setToasts(prev => [...prev, { ...toast, id: `toast-${Date.now()}-${Math.random()}` }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  return { toasts, addToast, dismissToast };
};

// StockCard에 전달할 기본 XP 프로필
const DEFAULT_XP_PROFILE = { level: 1, xp: 0, maxXp: 100, totalXp: 0, lastGain: 0, awardCount: 0 };

// =========================================================================
// 메인 콘텐츠
// =========================================================================
function AnalyzeContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const { onSearch, krOrUs, data, name, waitResponse } = useStockSearch();

  const krMarketHistory = useAppSelector(selectKrMarketHistory);
  const popularStocks = useAppSelector(selectPopularStocks) || [];

  const { data: session } = useSession();
  const isLoggedIn = !!session;
  const { toasts, addToast, dismissToast } = useToast();

  const fromScreener = searchParams.get('from') === 'screener';

  const [hasMounted, setHasMounted] = useState(false);
  const [staticStockData, setStaticStockData] = useState<StaticStockData>({ allTickers: [], corpCodeJson: {} });
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'analysis' | 'strategy' | 'risk' | 'financials'>('analysis');

  useEffect(() => {
    setHasMounted(true);
    dispatch(reqGetSearchLog('10'));
    dispatch(reqGetMyLikes());
    loadStaticStockData().then(setStaticStockData).catch(() => {
      addToast({ type: 'error', message: '주식 데이터를 불러올 수 없습니다.' });
    });
  }, [dispatch, addToast]);


  const handleSearch = useCallback((stockName: string) => {
    if (!stockName) return;
    if (staticStockData.allTickers.length > 0 &&
        !staticStockData.allTickers.some(t => t.toLowerCase() === stockName.toLowerCase())) {
      addToast({ type: 'error', message: `'${stockName}'은(는) 지원하지 않는 종목입니다.` });
      return;
    }
    startTransition(() => { router.push(`/analyze?ticker=${encodeURIComponent(stockName)}`); });
  }, [router, addToast, staticStockData.allTickers]);

  const handleShareResult = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: name ? `[IdiotQuant] ${name} 분석` : '[IdiotQuant]', url: currentUrl }); return; }
      catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(currentUrl);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch {
      setShareStatus('error');
      addToast({ type: 'error', message: '링크 복사에 실패했습니다.' });
      setTimeout(() => setShareStatus('idle'), 2500);
    }
  }, [name, addToast]);

  useEffect(() => {
    const ticker = searchParams.get('ticker');
    if (ticker && ticker !== name) onSearch(ticker);
  }, [searchParams, name, onSearch]);

  const tickerFromUrl = searchParams.get('ticker');

  const handleToggleLike = useCallback(() => {
    if (!tickerFromUrl) return;
    if (!session?.user) {
      addToast({ type: 'info', message: '로그인 후 관심 종목에 저장됩니다.' });
      return;
    }
    dispatch(reqToggleLike({ ticker: tickerFromUrl, name: name ?? undefined, isUs: krOrUs === 'US' }));
  }, [dispatch, tickerFromUrl, session, name, krOrUs, addToast]);

  const loginHref = tickerFromUrl
    ? `/login?callbackUrl=${encodeURIComponent(`/analyze?ticker=${tickerFromUrl}`)}`
    : '/login';

  // API 응답에서 실제 종목명·종목코드 추출 (검색 입력값과 무관하게 항상 정확한 정보 표시)
  const displayName = krOrUs === 'KR'
    ? (data.kiChart?.output1?.hts_kor_isnm || name)
    : (data.usSearchInfo?.output?.prdt_eng_name || data.usSearchInfo?.output?.ovrs_item_name || name);

  const isLoaded =
    tickerFromUrl === name &&
    (
      (krOrUs === 'KR' && data.kiChart.state === 'fulfilled' && data.kiBS.state === 'fulfilled') ||
      (krOrUs === 'US' && data.usSearchInfo.state === 'fulfilled' && data.finnhubData.state === 'fulfilled')
    );

  const currency = krOrUs === 'US' ? '$' : '₩';
  const isInWatchlist = useAppSelector(state => selectIsLiked(state, tickerFromUrl ?? ''));

  const chartConfig = useMemo(() => {
    const isUs = krOrUs === 'US';
    const raw = isUs ? data.usDaily?.output2 : data.kiChart?.output2;
    return {
      data: raw?.map((i: any) => Number(isUs ? i.clos : i.stck_clpr)).reverse() || [],
      categories: raw?.map((i: any) => (isUs ? i.xymd : i.stck_bsop_date)).reverse() || [],
      color: isUs ? '#3b82f6' : '#6366f1',
    };
  }, [krOrUs, data]);

  // 핵심 지표 + StockCard props 통합 (중복 계산 방지)
  const stockData = useMemo(() => {
    if (!isLoaded) return null;
    if (krOrUs === 'KR') {
      const ncavRatio = calculateKrNcavRatio(data.kiBS, data.kiChart);
      const pbr = Number(data?.kiPrice?.output?.pbr ?? 0);
      const per = Number(data?.kiPrice?.output?.per ?? 0);
      const eps = Number(data?.kiPrice?.output?.eps ?? 0);
      const curPrice = Number(data?.kiPrice?.output?.stck_prpr ?? 0);
      const grade = getKrNcavGrade(data.kiBS, data.kiChart);
      const fairValue = calculateKrNcavValue(data.kiBS, data.kiChart);
      const srimScore = getKrSRIMTargetPrice(data.kiBS, data.kiIS, data.kiChart);
      const stockTicker = (staticStockData.corpCodeJson as any)?.[name]?.stock_code ?? '';
      return { ncavRatio, pbr, per, eps, curPrice, grade, fairValue, srimScore, stockTicker };
    } else {
      const ncavRatio = calculateUsNcavRatio(data.finnhubData, data.usDetail);
      const pbr = Number(data?.usDetail?.output?.pbrx ?? 0);
      const per = Number(data?.usDetail?.output?.perx ?? 0);
      const eps = Number(data?.usDetail?.output?.epsx ?? 0);
      const curPrice = Number(data?.usDetail?.output?.last ?? 0);
      const grade = getUsNcavGrade(data.finnhubData, data.usDetail);
      const fairValue = calculateUsNcavValue(data.finnhubData, data.usDetail);
      const srimScore = calculateUsSRIM(data.finnhubData, data.usDetail);
      return { ncavRatio, pbr, per, eps, curPrice, grade, fairValue, srimScore, stockTicker: '' };
    }
  }, [isLoaded, krOrUs, data, name, staticStockData.corpCodeJson]);

  if (!hasMounted) return <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915]" />;

  return (
    <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] text-neutral-900 dark:text-neutral-100 antialiased">

      {/* ── Toast ── */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <div className="space-y-2 pointer-events-auto">
          {toasts.map(t => <Toast key={t.id} notification={t} onDismiss={dismissToast} />)}
        </div>
      </div>

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#1f1e1b] border-b border-neutral-200 dark:border-[#3a3834] border-t-[3px] border-t-blue-500">
        {/* 페이지 레이블 + 뒤로가기 */}
        <div className="border-b border-neutral-100 dark:border-[#35332e]/60">
          <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BarChart2 size={13} className="text-blue-500 dark:text-blue-400" strokeWidth={2.5} />
              <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                종목 분석
              </span>
            </div>
            {fromScreener && (
              <Link href="/screener"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16a34a] dark:text-[#16a34a] hover:opacity-80 transition-opacity">
                <ChevronLeft size={13} />
                발굴로 돌아가기
              </Link>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-2">
          <div className="flex-1">
            <SearchAutocomplete
              placeHolder="국내 종목명 또는 미국 티커 입력"
              onSearchButton={handleSearch}
              validCorpNameArray={staticStockData.allTickers}
              onSearchStateChange={() => {}}
            />
          </div>

          {isLoaded && (
            <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-200">
              <button
                onClick={handleToggleLike}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition-all",
                  isInWatchlist
                    ? "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/50 dark:text-rose-400"
                    : "text-neutral-500 bg-[#faf9f7] border-neutral-200 hover:text-rose-500 dark:bg-[#242320]/40 dark:border-[#3a3834]"
                )}
              >
                <Heart size={13} fill={isInWatchlist ? "currentColor" : "none"} />
                <span className="hidden sm:inline">{isInWatchlist ? "저장됨" : "관심"}</span>
              </button>
              <button
                onClick={handleShareResult}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition-all",
                  shareStatus === 'copied'
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : shareStatus === 'error'
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "text-neutral-500 bg-[#faf9f7] border-neutral-200 hover:text-neutral-700 dark:bg-[#242320]/40 dark:border-[#3a3834]"
                )}
              >
                {shareStatus === 'copied' ? <Check size={13} /> : shareStatus === 'error' ? <AlertCircle size={13} /> : <Share2 size={13} />}
                <span className="hidden sm:inline">{shareStatus === 'copied' ? '복사됨' : shareStatus === 'error' ? '실패' : '공유'}</span>
              </button>
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider font-mono border",
                krOrUs === 'US'
                  ? "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]/60 dark:bg-[#052e16]/30 dark:text-[#16a34a] dark:border-[#14532d]/40"
                  : "bg-indigo-50 text-indigo-600 border-indigo-200/60 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40"
              )}>
                {krOrUs === 'US' ? <DollarSign size={11} /> : <Coins size={11} />}
                <span>{krOrUs}</span>
              </span>
            </div>
          )}
        </div>

        {/* 인기 종목 + 최근 검색 */}
        {!isLoaded && (
          <div className="border-t border-neutral-100 dark:border-[#35332e]/50 bg-[#faf9f7]/50 dark:bg-[#242320]/30">
            {popularStocks.length > 0 && (
              <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Flame size={11} className="text-amber-500" />
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">인기</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {popularStocks.slice(0, 8).map((s: any, i: number) => (
                    <button key={i} onClick={() => handleSearch(s.ticker)}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#242320] text-xs font-bold text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-[#35332e] hover:border-[#16a34a]/70 hover:text-[#16a34a] dark:hover:text-[#16a34a] transition-all whitespace-nowrap"
                    >
                      <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[#f0fdf4]0 text-white font-black text-[8px] shrink-0">{i + 1}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {krMarketHistory.length > 0 && (
              <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-3 border-t border-neutral-100 dark:border-[#35332e]/40">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">최근 검색</span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {krMarketHistory.slice().reverse().slice(0, 8).map((s, i) => (
                    <button key={i} onClick={() => handleSearch(s)}
                      className="shrink-0 px-2.5 py-1.5 text-xs font-bold text-neutral-500 hover:text-[#16a34a] dark:text-neutral-400 dark:hover:text-[#16a34a] hover:bg-white dark:hover:bg-[#242320]/40 rounded-lg border border-neutral-200/60 dark:border-[#35332e] transition-all whitespace-nowrap"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── 메인 ── */}
      <main className="max-w-4xl mx-auto p-5 sm:p-8">

        {!tickerFromUrl ? (
          <SearchGuide />
        ) : (
          <>
            {waitResponse && !isLoaded && <ResultSkeleton />}

            <div className={cn(!isLoaded ? 'hidden' : 'animate-in fade-in duration-400')}>

              {/* 종목 카드 + 핵심 지표 — 최상단 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
                {/* StockCard */}
                <div className="lg:col-span-5">
                  <StockCard
                    stock={krOrUs === 'US' ? {
                      code: tickerFromUrl, isUs: true, name: displayName, ticker: name,
                      grade: stockData?.grade,
                      curPrice: stockData?.curPrice?.toFixed(2) ?? 0,
                      fairValue: currency + (stockData?.fairValue ?? 0),
                      ncavScore: stockData?.ncavRatio ?? 0,
                      srimScore: stockData?.srimScore,
                      per: stockData?.per ?? 0,
                      pbr: stockData?.pbr ?? 0,
                      eps: currency + (stockData?.eps ?? 0),
                      sector: data?.usDetail?.output?.e_icod ?? "DEFAULT",
                    } : {
                      code: tickerFromUrl, isUs: false, name: displayName,
                      ticker: stockData?.stockTicker ?? '',
                      grade: stockData?.grade,
                      curPrice: stockData?.curPrice ?? 0,
                      fairValue: currency + (stockData?.fairValue ?? 0),
                      ncavScore: stockData?.ncavRatio ?? 0,
                      srimScore: stockData?.srimScore,
                      per: stockData?.per ?? 0,
                      pbr: stockData?.pbr ?? 0,
                      eps: currency + (stockData?.eps ?? 0).toFixed(0),
                      sector: data?.kiPrice?.output?.bstp_kor_isnm ?? "DEFAULT",
                    }}
                    chartConfig={chartConfig}
                    rawData={data}
                    stockXpProfile={DEFAULT_XP_PROFILE}
                  />
                </div>

                {/* 핵심 지표 4개 (항상 공개) */}
                {stockData && (
                  <div className="lg:col-span-7 grid grid-cols-2 gap-4 content-start">
                    {[
                      {
                        label: "NCAV 업사이드",
                        value: stockData.ncavRatio !== 0 ? `${stockData.ncavRatio >= 0 ? '+' : ''}${stockData.ncavRatio.toFixed(1)}%` : "—",
                        desc: "NCAV 기준 업사이드",
                        color: stockData.ncavRatio >= 100
                          ? "text-emerald-600 dark:text-emerald-400"
                          : stockData.ncavRatio >= 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-neutral-500 dark:text-neutral-400",
                      },
                      {
                        label: "PBR",
                        value: stockData.pbr > 0 ? `${stockData.pbr.toFixed(2)}x` : "—",
                        desc: "주가 / 순자산",
                        color: stockData.pbr > 0 && stockData.pbr < 1
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-neutral-700 dark:text-neutral-200",
                      },
                      {
                        label: "PER",
                        value: stockData.per > 0 ? `${stockData.per.toFixed(1)}x` : "—",
                        desc: "주가 / 순이익",
                        color: stockData.per > 0 && stockData.per < 10
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-neutral-700 dark:text-neutral-200",
                      },
                      {
                        label: "EPS",
                        value: stockData.eps !== 0
                          ? `${currency}${Math.abs(stockData.eps) >= 1000
                              ? (stockData.eps / 1000).toFixed(1) + 'K'
                              : stockData.eps.toFixed(stockData.eps < 1 ? 2 : 0)}`
                          : "—",
                        desc: "주당 순이익",
                        color: stockData.eps > 0
                          ? "text-neutral-700 dark:text-neutral-200"
                          : stockData.eps < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-neutral-400",
                      },
                    ].map(m => (
                      <div key={m.label} className="bg-white dark:bg-[#242320] rounded-xl border border-neutral-200 dark:border-[#35332e] p-5 shadow-sm">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">{m.label}</p>
                        <p className={cn("text-2xl font-black font-mono tabular-nums leading-none", m.color)}>{m.value}</p>
                        <p className="text-[10px] text-neutral-400 mt-1.5">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 상세 분석 섹션 */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest font-mono shrink-0">Detail Analysis</p>
                  <div className="flex-1 h-px bg-neutral-100 dark:bg-[#35332e]" />
                  {!isLoggedIn && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 bg-[#faf9f7] dark:bg-[#242320] px-2 py-0.5 rounded-full">
                      <Lock size={9} />
                      일부 로그인 필요
                    </span>
                  )}
                </div>

                {/* Mobile Tab Bar */}
                <div className="flex md:hidden gap-1 p-1 bg-neutral-100 dark:bg-[#2a2825] rounded-xl">
                  {([
                    { key: 'analysis', label: '분석' },
                    { key: 'strategy', label: '전략' },
                    { key: 'risk', label: '위험도' },
                    { key: 'financials', label: '재무' },
                  ] as { key: 'analysis' | 'strategy' | 'risk' | 'financials'; label: string }[]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                        activeTab === key
                          ? "bg-white dark:bg-[#1f1e1b] text-[#16a34a] shadow-sm"
                          : "text-neutral-500 dark:text-neutral-400"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* 상세 지표 (블러) */}
                <div className={cn(activeTab !== 'analysis' && 'hidden md:block')}>
                  <BlurGate isLoggedIn={isLoggedIn}>
                    <StockMetrics data={data} isUs={krOrUs === 'US'} />
                  </BlurGate>
                </div>

                {/* 모델별 요약 (항상 공개) + 세부 카드 (블러) */}
                <div className={cn("bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-1 shadow-sm", activeTab !== 'strategy' && 'hidden md:block')}>
                  <ValuationSection
                    data={data}
                    isUs={krOrUs === 'US'}
                    isLoggedIn={isLoggedIn}
                    loginHref={loginHref}
                  />
                </div>

                {/* 상장폐지 위험도 (블러) */}
                <div className={cn(activeTab !== 'risk' && 'hidden md:block')}>
                  {krOrUs === 'KR' && (
                    <BlurGate isLoggedIn={isLoggedIn} loginHref={loginHref}>
                      <DelistingRisk kiBS={data.kiBS} kiIS={data.kiIS} />
                    </BlurGate>
                  )}
                  {krOrUs === 'US' && (
                    <BlurGate isLoggedIn={isLoggedIn} loginHref={loginHref}>
                      <UsDelistingRisk finnhubData={data.finnhubData} usDetail={data.usDetail} />
                    </BlurGate>
                  )}
                </div>

                {/* 재무제표 (블러) */}
                <div className={cn(activeTab !== 'financials' && 'hidden md:block')}>
                  <BlurGate isLoggedIn={isLoggedIn} loginHref={loginHref}>
                    <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-neutral-100 dark:border-[#35332e]">
                        <h3 className="text-sm font-extrabold text-neutral-800 dark:text-neutral-200">재무제표</h3>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          {krOrUs === 'KR' ? 'DART 공시 기준 (억 원)' : 'US-GAAP 기준 (USD)'}
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        {krOrUs === 'KR'
                          ? <FinancialTables kiBS={data.kiBS} kiIS={data.kiIS} />
                          : <FinnhubTable data={data.finnhubData.data} />
                        }
                      </div>
                    </div>
                  </BlurGate>
                </div>

                {/* 비로그인 로그인 CTA */}
                {!isLoggedIn && (
                  <div className="p-7 bg-gradient-to-br from-[#f0fdf4] to-indigo-50 dark:from-[#052e16]/20 dark:to-indigo-950/20 rounded-2xl border border-[#bbf7d0]/60 dark:border-[#14532d]/40 text-center">
                    <p className="text-sm font-black text-neutral-900 dark:text-white mb-1">
                      {name ? `${name} 상세 분석` : '상세 분석'} 전체 보기
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                      카카오 로그인 30초 · 무료 · 재무제표·상장폐지 위험도·상세 지표 모두 포함
                    </p>
                    <Link
                      href={loginHref}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold shadow-lg shadow-[#16a34a]/20 transition-all"
                    >
                      카카오로 무료 로그인
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── 푸터 ── */}
      <footer className="max-w-4xl mx-auto px-4 pt-8 pb-12 mt-12 border-t border-neutral-200 dark:border-[#35332e]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-[#f0fdf4]0" strokeWidth={2.5} />
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">IdiotQuant</span>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-600 text-center max-w-md leading-relaxed">
            본 서비스의 분석 결과는 투자 참고 목적의 정량적 자료이며, 투자 권유를 목적으로 하지 않습니다.
            실제 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
          </p>
          <span className="text-[10px] font-mono text-neutral-300 dark:text-neutral-700">© 2026 IdiotQuant</span>
        </div>
      </footer>
    </div>
  );
}

// =========================================================================
// 페이지 내보내기
// =========================================================================
export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-40 gap-5 bg-[#faf9f7] dark:bg-[#1a1915] min-h-screen">
        <div className="p-4 bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] shadow-sm">
          <Loader2 className="animate-spin text-[#16a34a] dark:text-[#16a34a]" size={24} />
        </div>
        <p className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-widest font-mono uppercase">
          분석 엔진 초기화 중...
        </p>
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}
