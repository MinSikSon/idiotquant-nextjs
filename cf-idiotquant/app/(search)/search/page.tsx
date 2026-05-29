'use client';

import {
  useState,
  useEffect,
  Suspense,
  useMemo,
  useRef,
  useCallback,
  memo,
  startTransition
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { useStockSearch } from './hooks/useStockSearch';
import { selectKrMarketHistory } from '@/lib/features/searchHistory/searchHistorySlice';
import {
  History, AlertCircle, Loader2, Flame, Share2, Check, CheckCircle,
  Globe2, DollarSign, Coins, WifiOff, Star, X, TrendingUp, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =========================================================================
// Dynamic imports (코드 스플리팅)
// =========================================================================
const StockCard = dynamic(
  () => import('./components/StockCard').then(mod => ({ default: mod.StockCard })),
  { loading: () => <StockCardSkeleton />, ssr: false }
);

const StockMetrics = dynamic(
  () => import('./components/StockMetrics').then(mod => ({ default: mod.StockMetrics })),
  { loading: () => <MetricsSkeleton />, ssr: false }
);

const ValuationSection = dynamic(
  () => import('./components/ValuationSection').then(mod => ({ default: mod.ValuationSection })),
  { loading: () => <ValuationSkeleton /> }
);

const FinancialTables = dynamic(
  () => import('./components/FinancialTables'),
  { ssr: false }
);

const FinnhubTable = dynamic(
  () => import('./components/FinnhubTable'),
  { ssr: false }
);

const SearchAutocomplete = dynamic(
  () => import('@/components/searchAutoComplete'),
  { loading: () => <SearchSkeleton /> }
);

const SearchGuide = dynamic(
  () => import('./components/SearchGuide').then(mod => ({ default: mod.SearchGuide }))
);

// =========================================================================
// 정적 데이터 싱글톤 로더 (HMR 재로딩 방지)
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
  ]).then(([nasdaq, nyse, amex, corpCode, corpName, corpCodeData]) => {
    cachedStaticData = {
      allTickers: [
        ...nasdaq.default, ...nyse.default, ...amex.default,
        ...corpCode.default, ...corpName.default,
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

const GRADE_PILL: Record<string, string> = {
  SSS: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white",
  SS:  "bg-amber-500 text-white",
  S:   "bg-emerald-500 text-white",
  A:   "bg-slate-500 text-white",
  B:   "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
  F:   "bg-red-500 text-white",
};

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

// =========================================================================
// 스켈레톤 컴포넌트
// =========================================================================
const StockCardSkeleton = memo(() => (
  <div className="w-full h-[420px] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-pulse p-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
      </div>
    </div>
    <div className="space-y-4">
      <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />)}
      </div>
      <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
    </div>
  </div>
));
StockCardSkeleton.displayName = 'StockCardSkeleton';

const MetricsSkeleton = memo(() => (
  <div className="w-full h-[420px] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-pulse p-6">
    <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-6" />
    <div className="grid grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
          <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
        </div>
      ))}
    </div>
  </div>
));
MetricsSkeleton.displayName = 'MetricsSkeleton';

const ValuationSkeleton = memo(() => (
  <div className="w-full h-[320px] bg-white dark:bg-zinc-900 rounded-2xl animate-pulse p-6">
    <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-6" />
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />)}
    </div>
  </div>
));
ValuationSkeleton.displayName = 'ValuationSkeleton';

const SearchSkeleton = memo(() => (
  <div className="w-full h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
));
SearchSkeleton.displayName = 'SearchSkeleton';

// 분석 결과 전체 레이아웃 스켈레톤
const ResultSkeleton = memo(() => (
  <div className="animate-in fade-in duration-300 space-y-6">
    {/* 종목 헤더 스켈레톤 */}
    <div className="w-full flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl shrink-0" />
        <div className="space-y-2">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-28" />
          <div className="h-3 bg-zinc-100 dark:bg-zinc-700 rounded w-20" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    </div>
    {/* 2열 그리드 스켈레톤 */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5"><StockCardSkeleton /></div>
      <div className="lg:col-span-7"><MetricsSkeleton /></div>
    </div>
    {/* 밸류에이션 스켈레톤 */}
    <ValuationSkeleton />
  </div>
));
ResultSkeleton.displayName = 'ResultSkeleton';

// =========================================================================
// 타입 정의
// =========================================================================
interface StockXpProfile {
  level: number;
  xp: number;
  maxXp: number;
  totalXp: number;
  lastGain: number;
  awardCount: number;
}

type StockXpProfiles = Record<string, StockXpProfile>;

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

// =========================================================================
// 상수 & 유틸
// =========================================================================
const STOCK_XP_STORAGE_KEY = 'idiotquant_stock_xp_profiles_v2';
const SEARCH_RESULT_XP_GAIN = 25;
const DWELL_XP_GAIN = 5;
const DWELL_SECONDS_PER_REWARD = 20;
const DWELL_REWARD_COOLDOWN_MS = 15000;
const TOAST_DEFAULT_DURATION = 4000;

const getRequiredXpForLevel = (level: number) => 100 + Math.max(0, level - 1) * 60;

const createDefaultXpProfile = (): StockXpProfile => ({
  level: 1, xp: 0, maxXp: getRequiredXpForLevel(1), totalXp: 0, lastGain: 0, awardCount: 0,
});

const normalizeXpProfile = (profile: Partial<StockXpProfile> | null | undefined): StockXpProfile => {
  const level = Math.max(1, Math.floor(Number(profile?.level ?? 1)));
  const maxXp = getRequiredXpForLevel(level);
  const xp = Math.max(0, Math.min(maxXp - 1, Math.floor(Number(profile?.xp ?? 0))));
  return {
    level, xp, maxXp,
    totalXp: Math.max(0, Math.floor(Number(profile?.totalXp ?? xp))),
    lastGain: Math.max(0, Math.floor(Number(profile?.lastGain ?? 0))),
    awardCount: Math.max(0, Math.floor(Number(profile?.awardCount ?? 0))),
  };
};

const normalizeTickerKey = (ticker: string | null | undefined) => ticker?.trim().toUpperCase() ?? '';

const normalizeXpProfiles = (profiles: unknown): StockXpProfiles => {
  if (!profiles || typeof profiles !== 'object') return {};
  return Object.entries(profiles as Record<string, Partial<StockXpProfile>>).reduce<StockXpProfiles>(
    (acc, [ticker, profile]) => {
      const key = normalizeTickerKey(ticker);
      if (!key) return acc;
      acc[key] = normalizeXpProfile(profile);
      return acc;
    }, {}
  );
};

const addStockXp = (profile: StockXpProfile, gainedXp: number): StockXpProfile => {
  let nextLevel = profile.level;
  let nextXp = profile.xp + gainedXp;
  let nextMaxXp = getRequiredXpForLevel(nextLevel);
  while (nextXp >= nextMaxXp) {
    nextXp -= nextMaxXp;
    nextLevel += 1;
    nextMaxXp = getRequiredXpForLevel(nextLevel);
  }
  return {
    level: nextLevel, xp: nextXp, maxXp: nextMaxXp,
    totalXp: profile.totalXp + gainedXp,
    lastGain: gainedXp, awardCount: profile.awardCount + 1,
  };
};

// =========================================================================
// Toast 컴포넌트
// =========================================================================
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
    info:    'bg-blue-50/95 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400',
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
        className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors shrink-0"
        aria-label="알림 닫기"
      >
        <X size={14} />
      </button>
    </div>
  );
});
Toast.displayName = 'Toast';

// =========================================================================
// 커스텀 훅
// =========================================================================
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    if (typeof navigator !== 'undefined') setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return isOnline;
};

const useToast = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const addToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  return { toasts, addToast, dismissToast };
};

// 스크롤 진행률 표시기
function ScrollProgress({ isFixed }: { isFixed: boolean }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (el.scrollTop / total) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <div className={cn("absolute left-0 right-0 h-[2px]", isFixed ? "top-0" : "bottom-0")}>
      <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-[width] duration-150"
        style={{ width: `${progress}%` }} />
    </div>
  );
}

// =========================================================================
// 메인 콘텐츠
// =========================================================================
function SearchContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const { onSearch, krOrUs, data, name, waitResponse } = useStockSearch();

  const krMarketHistory = useAppSelector(selectKrMarketHistory);
  const popularStocks = useAppSelector(selectPopularStocks) || [];

  const isOnline = useOnlineStatus();
  const { toasts, addToast, dismissToast } = useToast();

  const [fixed, setFixed] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [staticStockData, setStaticStockData] = useState<StaticStockData>({ allTickers: [], corpCodeJson: {} });
  const [stockXpProfiles, setStockXpProfiles] = useState<StockXpProfiles>({});
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const lastEntryAwardedTickerRef = useRef<string | null>(null);
  const stockCardDwellRef   = useRef<HTMLDivElement | null>(null);
  const metricsDwellRef     = useRef<HTMLDivElement | null>(null);
  const valuationDwellRef   = useRef<HTMLDivElement | null>(null);
  const financialsDwellRef  = useRef<HTMLDivElement | null>(null);
  const visibleDwellSectionsRef = useRef<Set<string>>(new Set());
  const dwellSecondsRef     = useRef<Record<string, number>>({});
  const dwellRewardedAtRef  = useRef<Record<string, number>>({});

  useEffect(() => {
    setHasMounted(true);
    dispatch(reqGetSearchLog('10'));

    loadStaticStockData().then(setStaticStockData).catch(err => {
      console.error('Failed to load static stock data:', err);
      addToast({ type: 'error', message: '주식 데이터를 불러올 수 없습니다.' });
    });

    try {
      const saved = window.localStorage.getItem(STOCK_XP_STORAGE_KEY);
      if (saved) setStockXpProfiles(normalizeXpProfiles(JSON.parse(saved)));
    } catch (e) { console.error('Failed to load XP profiles:', e); }

    try {
      const wl = window.localStorage.getItem('idiotquant_watchlist_v1');
      if (wl) setWatchlist(JSON.parse(wl));
    } catch (e) { console.error('Failed to load watchlist:', e); }
  }, [dispatch, addToast]);

  const awardStockXp = useCallback((ticker: string, gainedXp: number) => {
    const key = normalizeTickerKey(ticker);
    if (!key) return;
    setStockXpProfiles(prev => {
      const next = { ...prev, [key]: addStockXp(prev[key] ?? createDefaultXpProfile(), gainedXp) };
      try { window.localStorage.setItem(STOCK_XP_STORAGE_KEY, JSON.stringify(next)); } catch { }
      return next;
    });
  }, []);

  const awardEntrySearchXp = useCallback((ticker: string) => {
    const key = normalizeTickerKey(ticker);
    if (!key || lastEntryAwardedTickerRef.current === key) return;
    lastEntryAwardedTickerRef.current = key;
    awardStockXp(key, SEARCH_RESULT_XP_GAIN);
    addToast({ type: 'success', message: `+${SEARCH_RESULT_XP_GAIN} XP 획득 | 분석 데이터를 불러옵니다.` });
  }, [awardStockXp, addToast]);

  const handleSearch = useCallback((stockName: string) => {
    if (!stockName) return;
    if (staticStockData.allTickers.length > 0 &&
        !staticStockData.allTickers.some(t => t.toLowerCase() === stockName.toLowerCase())) {
      addToast({ type: 'error', message: `'${stockName}'은(는) 지원하지 않는 종목입니다.` });
      return;
    }
    startTransition(() => { router.push(`/search?ticker=${encodeURIComponent(stockName)}`); });
  }, [router, addToast, staticStockData.allTickers]);

  const handleShareResult = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    const stockTitle = name
      ? `[IdiotQuant] ${name} (${krOrUs}) 밸류에이션 분석 리포트`
      : '[IdiotQuant] 퀀트 가치투자 분석';

    if (navigator.share) {
      try {
        await navigator.share({ title: stockTitle, url: currentUrl });
        addToast({ type: 'success', message: '성공적으로 공유되었습니다!' });
        return;
      } catch (e) { if ((e as Error).name === 'AbortError') return; }
    }

    try {
      await navigator.clipboard.writeText(currentUrl);
      setShareStatus('copied');
      addToast({ type: 'success', message: '링크가 클립보드에 복사되었습니다.' });
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch {
      setShareStatus('error');
      addToast({ type: 'error', message: '링크 복사에 실패했습니다.' });
      setTimeout(() => setShareStatus('idle'), 2500);
    }
  }, [name, krOrUs, addToast]);

  const toggleWatchlist = useCallback((ticker: string) => {
    setWatchlist(prev => {
      const isAdded = prev.includes(ticker);
      const next = isAdded ? prev.filter(t => t !== ticker) : [...prev, ticker];
      try {
        window.localStorage.setItem('idiotquant_watchlist_v1', JSON.stringify(next));
        addToast({ type: isAdded ? 'info' : 'success', message: isAdded ? '관심 종목에서 제거되었습니다.' : '관심 종목에 추가되었습니다.' });
      } catch { }
      return next;
    });
  }, [addToast]);

  useEffect(() => {
    const ticker = searchParams.get('ticker');
    if (ticker && ticker !== name) onSearch(ticker);
  }, [searchParams, name, onSearch]);

  useEffect(() => {
    const onScroll = () => setFixed(window.scrollY > 140);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tickerFromUrl = searchParams.get('ticker');
  const activeTickerKey = normalizeTickerKey(tickerFromUrl);
  const activeStockXpProfile = activeTickerKey
    ? stockXpProfiles[activeTickerKey] ?? createDefaultXpProfile()
    : createDefaultXpProfile();

  const isLoaded =
    tickerFromUrl === name &&
    (data.kiChart.state === 'fulfilled' || data.usSearchInfo.state === 'fulfilled');

  useEffect(() => {
    if (isLoaded && tickerFromUrl) awardEntrySearchXp(tickerFromUrl);
  }, [isLoaded, tickerFromUrl, awardEntrySearchXp]);

  useEffect(() => {
    visibleDwellSectionsRef.current.clear();
    dwellSecondsRef.current = {};
  }, [activeTickerKey]);

  useEffect(() => {
    if (!isLoaded || !activeTickerKey) return;
    const targets = [
      { key: 'stock-card', node: stockCardDwellRef.current },
      { key: 'core-metrics', node: metricsDwellRef.current },
      { key: 'valuation', node: valuationDwellRef.current },
      { key: 'financials', node: financialsDwellRef.current },
    ].filter((t): t is { key: string; node: HTMLDivElement } => Boolean(t.node));
    if (!targets.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const key = (entry.target as HTMLElement).dataset.xpSection;
        if (!key) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) visibleDwellSectionsRef.current.add(key);
        else visibleDwellSectionsRef.current.delete(key);
      });
    }, { threshold: [0, 0.55, 0.8] });

    targets.forEach(({ key, node }) => { node.dataset.xpSection = key; observer.observe(node); });

    const timer = window.setInterval(() => {
      if (document.hidden || !visibleDwellSectionsRef.current.size) return;
      visibleDwellSectionsRef.current.forEach(key => {
        const next = (dwellSecondsRef.current[key] ?? 0) + 1;
        dwellSecondsRef.current[key] = next;
        if (next >= DWELL_SECONDS_PER_REWARD) {
          const rk = `${activeTickerKey}:${key}`;
          const now = Date.now();
          if (now - (dwellRewardedAtRef.current[rk] ?? 0) < DWELL_REWARD_COOLDOWN_MS) return;
          dwellSecondsRef.current[key] = 0;
          dwellRewardedAtRef.current[rk] = now;
          awardStockXp(activeTickerKey, DWELL_XP_GAIN);
        }
      });
    }, 1000);

    return () => { observer.disconnect(); window.clearInterval(timer); visibleDwellSectionsRef.current.clear(); };
  }, [isLoaded, activeTickerKey, awardStockXp]);

  const chartConfig = useMemo(() => {
    const isUs = krOrUs === 'US';
    const raw = isUs ? data.usDaily?.output2 : data.kiChart?.output2;
    return {
      data: raw?.map((i: any) => Number(isUs ? i.clos : i.stck_clpr)).reverse() || [],
      categories: raw?.map((i: any) => (isUs ? i.xymd : i.stck_bsop_date)).reverse() || [],
      color: isUs ? '#3b82f6' : '#6366f1',
    };
  }, [krOrUs, data]);

  const currency = krOrUs === 'US' ? '$' : '₩';
  const isInWatchlist = tickerFromUrl ? watchlist.includes(tickerFromUrl) : false;

  // 헤더 등급 배지 전용 — 상세 데이터는 ValuationSection · StockCard 에서 표시
  const gradeDisplay = useMemo(() => {
    if (!isLoaded || !tickerFromUrl) return null;
    const rawGrade = krOrUs === 'US'
      ? getUsNcavGrade(data.finnhubData, data.usDetail)
      : getKrNcavGrade(data.kiBS, data.kiChart);
    if (!rawGrade) return null;
    const g = rawGrade && typeof rawGrade === 'object'
      ? String((rawGrade as any).grade || '')
      : String(rawGrade || '');
    return g && g !== 'N/A' ? g : null;
  }, [isLoaded, tickerFromUrl, krOrUs, data]);

  if (!hasMounted) return <div className="w-full min-h-screen bg-zinc-50 dark:bg-zinc-950" />;

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased selection:bg-blue-500/10 transition-colors duration-300">

      {/* Toast */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <div className="space-y-2 pointer-events-auto">
          {toasts.map(t => <Toast key={t.id} notification={t} onDismiss={dismissToast} />)}
        </div>
      </div>

      {/* 오프라인 배너 */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[90] bg-amber-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-xs font-bold shadow-md animate-in fade-in duration-200">
          <WifiOff size={14} />
          오프라인 상태입니다 — 실시간 데이터를 불러올 수 없습니다.
        </div>
      )}

      {/* ── 헤더 (검색 + 인기/최근) ── */}
      <header className={cn(
        "w-full transition-all duration-300 border-b",
        fixed
          ? "fixed top-0 z-[60] bg-white/92 dark:bg-zinc-900/92 border-zinc-200 dark:border-zinc-800 shadow-sm backdrop-blur-md"
          : "relative z-[31] bg-white dark:bg-zinc-900 border-zinc-200/60 dark:border-zinc-800/60",
        !isOnline && "mt-8"
      )}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 relative">
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1">
              <SearchAutocomplete
                placeHolder="🇰🇷 국내 종목명 또는 🇺🇸 미국 티커(Ticker) 입력"
                onSearchButton={handleSearch}
                validCorpNameArray={staticStockData.allTickers}
                onSearchStateChange={(focused) => setIsSearchFocused(focused)}
              />
            </div>

            {/* 검색 결과 로드 후 마켓 배지 + 관심 종목 버튼 */}
            {isLoaded && (
              <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => tickerFromUrl && toggleWatchlist(tickerFromUrl)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all duration-200",
                    isInWatchlist
                      ? "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/50 dark:text-amber-400"
                      : "text-zinc-500 bg-zinc-50 border-zinc-200 hover:text-zinc-800 dark:bg-zinc-800/40 dark:border-zinc-700 dark:hover:text-zinc-200"
                  )}
                  aria-label={isInWatchlist ? "관심 종목 제거" : "관심 종목 추가"}
                >
                  <Star size={14} className={isInWatchlist ? "fill-amber-500" : ""} />
                  <span className="hidden sm:inline">{isInWatchlist ? "저장됨" : "관심"}</span>
                </button>

                <span className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider font-mono border h-[38px]",
                  krOrUs === 'US'
                    ? "bg-blue-50 text-blue-600 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40"
                    : "bg-indigo-50 text-indigo-600 border-indigo-200/60 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40"
                )}>
                  {krOrUs === 'US' ? <DollarSign size={11} /> : <Coins size={11} />}
                  <span>{krOrUs}</span>
                </span>
              </div>
            )}
          </div>
          <ScrollProgress isFixed={fixed} />
        </div>

        {/* 인기 / 최근 검색 — 헤더 고정 전에만 표시 */}
        {!fixed && !isSearchFocused && (
          <div className="border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30 animate-in fade-in duration-200">
            {/* 인기 종목 */}
            {popularStocks.length > 0 && (
              <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3 overflow-hidden border-b border-zinc-100 dark:border-zinc-800/40">
                <div className="flex items-center gap-1.5 shrink-0 text-zinc-500 dark:text-zinc-400 select-none">
                  <Flame size={12} className="text-amber-500" />
                  <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-zinc-400 dark:text-zinc-500">인기 종목</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
                  {popularStocks.map((s: any, i: number) => (
                    <button key={`hot-${i}`} onClick={() => handleSearch(s.ticker)}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800 hover:border-blue-400/70 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all whitespace-nowrap"
                    >
                      <span className="w-4 h-4 flex items-center justify-center rounded-full bg-blue-500 text-white font-black text-[9px] shrink-0 tabular-nums">{i + 1}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 최근 검색 */}
            <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3 overflow-hidden">
              <div className="flex items-center gap-1.5 shrink-0 text-zinc-400 dark:text-zinc-500 select-none">
                <History size={12} />
                <span className="text-[10px] font-bold tracking-wider uppercase font-mono">최근 검색</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
                {krMarketHistory.length > 0 ? (
                  krMarketHistory.slice().reverse().map((s, i) => (
                    <button key={`recent-${i}`} onClick={() => handleSearch(s)}
                      className="shrink-0 px-2.5 py-1.5 text-xs font-bold text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-zinc-800/40 rounded-lg border border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all whitespace-nowrap"
                    >
                      {s}
                    </button>
                  ))
                ) : (
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-600 italic font-medium">최근 검색 기록이 없습니다.</span>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── 메인 콘텐츠 ── */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6">

        {!tickerFromUrl ? (
          <SearchGuide />
        ) : (
          <>
            {/* 로딩 스켈레톤 */}
            {waitResponse && !isLoaded && <ResultSkeleton />}

            {/* 분석 결과 */}
            <div className={cn(!isLoaded ? 'hidden' : 'block animate-in fade-in duration-400')}>

              {/* 종목 정체성 헤더 */}
              <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 bg-white dark:bg-zinc-900 px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className={cn("absolute top-0 left-0 right-0 h-0.5", krOrUs === 'US' ? "bg-gradient-to-r from-blue-500 to-sky-400" : "bg-gradient-to-r from-indigo-500 to-purple-400")} />
                <div className="flex items-center gap-3 min-w-0">
                  {/* 티커 이니셜 아바타 */}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0",
                    krOrUs === 'US'
                      ? "bg-gradient-to-tr from-blue-500 to-sky-400"
                      : "bg-gradient-to-tr from-indigo-500 to-purple-400"
                  )}>
                    {(name || tickerFromUrl || '?').substring(0, 1).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-zinc-900 dark:text-white text-sm tracking-tight">{name}</span>
                      <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500">{tickerFromUrl}</span>
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0",
                        krOrUs === 'US'
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                          : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                      )}>
                        {krOrUs}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                      NCAV 밸류에이션 분석 완료
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <button
                    onClick={() => tickerFromUrl && toggleWatchlist(tickerFromUrl)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                      isInWatchlist
                        ? "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/50 dark:text-amber-400"
                        : "text-zinc-600 bg-zinc-50 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800/30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
                    )}
                  >
                    <Star size={13} className={isInWatchlist ? "fill-amber-500" : ""} />
                    {isInWatchlist ? "저장됨" : "관심 종목"}
                  </button>

                  <button
                    onClick={handleShareResult}
                    disabled={shareStatus !== 'idle'}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                      shareStatus === 'copied'
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                        : shareStatus === 'error'
                        ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400"
                        : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white hover:bg-zinc-800 dark:hover:bg-zinc-100"
                    )}
                  >
                    {shareStatus === 'copied' ? <Check size={13} /> : shareStatus === 'error' ? <AlertCircle size={13} /> : <Share2 size={13} />}
                    <span>{shareStatus === 'copied' ? '복사 완료' : shareStatus === 'error' ? '실패' : '공유'}</span>
                  </button>

                  {gradeDisplay && (
                    <span className={cn(
                      "flex items-center justify-center min-w-[2.5rem] px-3.5 py-2 rounded-xl text-sm font-black font-mono shadow-sm",
                      GRADE_PILL[gradeDisplay] ?? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                    )}>
                      {gradeDisplay}
                    </span>
                  )}
                </div>
              </div>

              {/* ── 인터랙티브 카드 + 상세 재무 지표 ── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
                <div ref={stockCardDwellRef} className="lg:col-span-5 flex justify-center w-full">
                  <StockCard
                    stock={krOrUs === 'US' ? {
                      code: tickerFromUrl, isUs: true, name, ticker: name,
                      grade: getUsNcavGrade(data.finnhubData, data.usDetail),
                      curPrice: Number(data?.usDetail?.output?.last ?? 0).toFixed(2),
                      fairValue: currency + calculateUsNcavValue(data.finnhubData, data.usDetail),
                      ncavScore: calculateUsNcavRatio(data.finnhubData, data.usDetail),
                      srimScore: calculateUsSRIM(data.finnhubData, data.usDetail),
                      per: data?.usDetail?.output?.perx ?? 0,
                      pbr: data?.usDetail?.output?.pbrx ?? 0,
                      eps: currency + (data?.usDetail?.output?.epsx ?? 0),
                      sector: data?.usDetail?.output?.e_icod ?? "DEFAULT",
                    } : {
                      code: tickerFromUrl, isUs: false, name,
                      ticker: (staticStockData.corpCodeJson as any)?.[name]?.stock_code ?? '',
                      grade: getKrNcavGrade(data.kiBS, data.kiChart),
                      curPrice: data?.kiPrice?.output?.stck_prpr ?? 0,
                      fairValue: currency + calculateKrNcavValue(data.kiBS, data.kiChart),
                      ncavScore: calculateKrNcavRatio(data.kiBS, data.kiChart),
                      srimScore: getKrSRIMTargetPrice(data.kiBS, data.kiIS, data.kiChart),
                      per: data?.kiPrice?.output?.per ?? 0,
                      pbr: data?.kiPrice?.output?.pbr ?? 0,
                      eps: currency + Number(data?.kiPrice?.output?.eps ?? 0).toFixed(0),
                      sector: data?.kiPrice?.output?.bstp_kor_isnm ?? "DEFAULT",
                    }}
                    chartConfig={chartConfig}
                    rawData={data}
                    stockXpProfile={activeStockXpProfile}
                  />
                </div>

                <div ref={metricsDwellRef} className="lg:col-span-7 w-full h-full flex flex-col">
                  <StockMetrics data={data} isUs={krOrUs === 'US'} />
                </div>
              </div>

              {/* 하단 섹션: 밸류에이션 + 재무제표 */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono shrink-0">Valuation & Financials</p>
                <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800/70" />
              </div>
              <div className="space-y-5">

                {/* 밸류에이션 모델 결과 */}
                <div ref={valuationDwellRef} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-1 shadow-sm">
                  <ValuationSection data={data} isUs={krOrUs === 'US'} />
                </div>

                {/* 재무제표 */}
                <div ref={financialsDwellRef} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                    <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
                      <Globe2 size={14} className="text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 tracking-tight leading-tight">재무제표</h3>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                        Financial Statements · {krOrUs === 'KR' ? 'DART 공시 기준 (억 원)' : 'US-GAAP 기준 (USD)'}
                      </p>
                    </div>
                    <span className="ml-auto text-[9px] font-mono font-black text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg uppercase tracking-wider">
                      {krOrUs === 'KR' ? 'KRX' : 'US'}
                    </span>
                  </div>
                  <div className="overflow-x-auto w-full">
                    {krOrUs === 'KR'
                      ? <FinancialTables kiBS={data.kiBS} kiIS={data.kiIS} />
                      : <FinnhubTable data={data.finnhubData.data} />
                    }
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── 푸터 ── */}
      <footer className="max-w-6xl mx-auto px-4 pt-8 pb-12 mt-16 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col items-center gap-5">

          {/* 데이터 출처 */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-zinc-400 dark:text-zinc-600 font-mono">
            {[
              "Korea Investment API",
              "Finnhub US Market",
              "DART 공시 연동",
            ].map(s => (
              <span key={s} className="flex items-center gap-1.5 font-bold">
                <CheckCircle size={12} className="text-emerald-500 shrink-0" />{s}
              </span>
            ))}
          </div>

          {/* 면책 */}
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600 text-center max-w-lg leading-relaxed">
            본 서비스의 분석 결과는 <strong className="font-semibold text-zinc-500 dark:text-zinc-500">투자 참고 목적</strong>의 정량적 자료이며,
            투자 권유를 목적으로 하지 않습니다. 실제 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
          </p>

          {/* 하단 브랜딩 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full text-xs text-zinc-400 dark:text-zinc-600">
            <div className="flex items-center gap-2 select-none">
              <TrendingUp size={13} className="text-blue-500 shrink-0" strokeWidth={2.5} />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">IdiotQuant</span>
              <span className="text-zinc-200 dark:text-zinc-700">·</span>
              <span className="font-medium">Deep Value Investment Platform</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-300 dark:text-zinc-700">© 2026 IdiotQuant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// =========================================================================
// 페이지 내보내기
// =========================================================================
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="relative flex flex-col items-center justify-center py-40 gap-5 bg-zinc-50 dark:bg-zinc-950 min-h-screen overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={24} />
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-zinc-700 dark:text-zinc-300 tracking-tight mb-1">IdiotQuant</p>
          <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest font-mono uppercase">
            분석 엔진 초기화 중...
          </p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
