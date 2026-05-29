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
  History,
  AlertCircle,
  Loader2,
  Flame,
  Share2,
  Check,
  Globe2,
  DollarSign,
  Coins,
  WifiOff,
  Star,
  X,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===========================
// 🎯 Dynamic Imports (Code Splitting)
// ===========================
const StockCard = dynamic(
  () => import('./components/StockCard').then(mod => ({ default: mod.StockCard })),
  {
    loading: () => <StockCardSkeleton />,
    ssr: false
  }
);

const StockMetrics = dynamic(
  () => import('./components/StockMetrics').then(mod => ({ default: mod.StockMetrics })),
  {
    loading: () => <MetricsSkeleton />,
    ssr: false
  }
);

const ValuationSection = dynamic(
  () => import('./components/ValuationSection').then(mod => ({ default: mod.ValuationSection })),
  {
    loading: () => <ValuationSkeleton />
  }
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
  {
    loading: () => <SearchSkeleton />
  }
);

const SearchGuide = dynamic(
  () => import('./components/SearchGuide').then(mod => ({ default: mod.SearchGuide }))
);

// ===========================
// 정적 데이터 싱글톤 로더 (HMR 재로딩 방지)
// ===========================
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
        ...nasdaq.default,
        ...nyse.default,
        ...amex.default,
        ...corpCode.default,
        ...corpName.default,
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
  calculateKrNcavRatio,
  calculateKrNcavValue,
  calculateUsNcavRatio,
  calculateUsNcavValue,
  getKrNcavGrade,
  getKrSRIMTargetPrice,
  getUsNcavGrade,
  calculateUsSRIM,
} from '../../../components/utils/financeCalc';

// ===========================
// 스켈레톤 컴포넌트
// ===========================
const StockCardSkeleton = memo(() => (
  <div className="w-full h-[420px] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 animate-pulse p-6 shadow-xs">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
      <div className="flex-1 space-y-2">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2"></div>
      </div>
    </div>
    <div className="space-y-4">
      <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
        ))}
      </div>
      <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
    </div>
  </div>
));
StockCardSkeleton.displayName = 'StockCardSkeleton';

const MetricsSkeleton = memo(() => (
  <div className="w-full h-[420px] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 animate-pulse p-6 shadow-xs">
    <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-6"></div>
    <div className="grid grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
          <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2"></div>
          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  </div>
));
MetricsSkeleton.displayName = 'MetricsSkeleton';

const ValuationSkeleton = memo(() => (
  <div className="w-full h-[320px] bg-white dark:bg-zinc-900 rounded-2xl animate-pulse p-6 shadow-xs">
    <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-6"></div>
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-14 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
      ))}
    </div>
  </div>
));
ValuationSkeleton.displayName = 'ValuationSkeleton';

const SearchSkeleton = memo(() => (
  <div className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse"></div>
));
SearchSkeleton.displayName = 'SearchSkeleton';

// ===========================
// 타입 정의
// ===========================
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

// ===========================
// 상수 & 유틸
// ===========================
const STOCK_XP_STORAGE_KEY = 'idiotquant_stock_xp_profiles_v2';
const SEARCH_RESULT_XP_GAIN = 25;
const DWELL_XP_GAIN = 5;
const DWELL_SECONDS_PER_REWARD = 20;
const DWELL_REWARD_COOLDOWN_MS = 15000;
const TOAST_DEFAULT_DURATION = 4000;

const getRequiredXpForLevel = (level: number) => 100 + Math.max(0, level - 1) * 60;

const createDefaultXpProfile = (): StockXpProfile => ({
  level: 1,
  xp: 0,
  maxXp: getRequiredXpForLevel(1),
  totalXp: 0,
  lastGain: 0,
  awardCount: 0,
});

const normalizeXpProfile = (profile: Partial<StockXpProfile> | null | undefined): StockXpProfile => {
  const level = Math.max(1, Math.floor(Number(profile?.level ?? 1)));
  const maxXp = getRequiredXpForLevel(level);
  const xp = Math.max(0, Math.min(maxXp - 1, Math.floor(Number(profile?.xp ?? 0))));

  return {
    level,
    xp,
    maxXp,
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
      const tickerKey = normalizeTickerKey(ticker);
      if (!tickerKey) return acc;
      acc[tickerKey] = normalizeXpProfile(profile);
      return acc;
    },
    {}
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
    level: nextLevel,
    xp: nextXp,
    maxXp: nextMaxXp,
    totalXp: profile.totalXp + gainedXp,
    lastGain: gainedXp,
    awardCount: profile.awardCount + 1,
  };
};

// ===========================
// Toast 컴포넌트
// ===========================
const Toast = memo(({
  notification,
  onDismiss
}: {
  notification: ToastNotification;
  onDismiss: (id: string) => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, notification.duration || TOAST_DEFAULT_DURATION);

    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  const bgColorMap = {
    success: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400 shadow-emerald-100/20 dark:shadow-none',
    error: 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 shadow-rose-100/20 dark:shadow-none',
    info: 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 shadow-blue-100/20 dark:shadow-none',
    warning: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 shadow-amber-100/20 dark:shadow-none'
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-300 pointer-events-auto",
      bgColorMap[notification.type]
    )}>
      <span className="text-xs font-bold leading-normal flex-1">{notification.message}</span>
      <button
        onClick={() => onDismiss(notification.id)}
        className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors shrink-0"
        aria-label="알림 닫기"
      >
        <X size={14} />
      </button>
    </div>
  );
});
Toast.displayName = 'Toast';

// ===========================
// 커스텀 훅
// ===========================
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

function ScrollProgress({ isFixed }: { isFixed: boolean }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <div className={cn(
      "absolute left-0 right-0 h-[2px] bg-zinc-200/50 dark:bg-zinc-800/40",
      isFixed ? "top-0" : "bottom-0"
    )}>
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ===========================
// 메인 콘텐츠
// ===========================
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

  // Refs
  const lastEntryAwardedTickerRef = useRef<string | null>(null);
  const stockCardDwellRef = useRef<HTMLDivElement | null>(null);
  const metricsDwellRef = useRef<HTMLDivElement | null>(null);
  const valuationDwellRef = useRef<HTMLDivElement | null>(null);
  const financialsDwellRef = useRef<HTMLDivElement | null>(null);
  const visibleDwellSectionsRef = useRef<Set<string>>(new Set());
  const dwellSecondsRef = useRef<Record<string, number>>({});
  const dwellRewardedAtRef = useRef<Record<string, number>>({});

  useEffect(() => {
    setHasMounted(true);
    dispatch(reqGetSearchLog('10'));

    // HMR 안전 레이어로 정적 데이터 비동기 적재
    loadStaticStockData().then((loaded) => {
      setStaticStockData(loaded);
    }).catch(err => {
      console.error('Failed to load static stock data:', err);
      addToast({ type: 'error', message: '주식 데이터를 불러올 수 없습니다.' });
    });

    try {
      const savedProfiles = window.localStorage.getItem(STOCK_XP_STORAGE_KEY);
      if (savedProfiles) {
        setStockXpProfiles(normalizeXpProfiles(JSON.parse(savedProfiles)));
      }
    } catch (error) {
      console.error('Failed to load XP profiles:', error);
      addToast({ type: 'error', message: '프로필 로드 실패' });
    }

    try {
      const savedWatchlist = window.localStorage.getItem('idiotquant_watchlist_v1');
      if (savedWatchlist) {
        setWatchlist(JSON.parse(savedWatchlist));
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    }
  }, [dispatch, addToast]);

  const awardStockXp = useCallback((ticker: string, gainedXp: number) => {
    const tickerKey = normalizeTickerKey(ticker);
    if (!tickerKey) return;

    setStockXpProfiles((prev) => {
      const nextProfiles = {
        ...prev,
        [tickerKey]: addStockXp(prev[tickerKey] ?? createDefaultXpProfile(), gainedXp),
      };

      try {
        window.localStorage.setItem(STOCK_XP_STORAGE_KEY, JSON.stringify(nextProfiles));
      } catch (error) {
        console.error('Failed to save XP profiles:', error);
      }

      return nextProfiles;
    });
  }, []);

  const awardEntrySearchXp = useCallback((ticker: string) => {
    const tickerKey = normalizeTickerKey(ticker);
    if (!tickerKey || lastEntryAwardedTickerRef.current === tickerKey) return;

    lastEntryAwardedTickerRef.current = tickerKey;
    awardStockXp(tickerKey, SEARCH_RESULT_XP_GAIN);

    addToast({
      type: 'success',
      message: `+${SEARCH_RESULT_XP_GAIN} XP 획득 | 분석 데이터를 불러옵니다.`
    });
  }, [awardStockXp, addToast]);

  const handleSearch = useCallback((stockName: string) => {
    if (!stockName) return;

    if (staticStockData.allTickers.length > 0 && !staticStockData.allTickers.some((t) => t.toLowerCase() === stockName.toLowerCase())) {
      addToast({
        type: 'error',
        message: `'${stockName}'은(는) 지원하지 않는 종목입니다.`
      });
      return;
    }

    startTransition(() => {
      router.push(`/search?ticker=${encodeURIComponent(stockName)}`);
    });
  }, [router, addToast, staticStockData.allTickers]);

  const handleShareResult = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const currentUrl = window.location.href;
    const stockTitle = name
      ? `[IdiotQuant] ${name} (${krOrUs}) 퀀트 밸류에이션 엔진 리포트`
      : '[IdiotQuant] 고성능 가치투자 분석 솔루션';

    if (navigator.share) {
      try {
        await navigator.share({
          title: stockTitle,
          url: currentUrl,
        });
        addToast({ type: 'success', message: '성공적으로 공유되었습니다!' });
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(currentUrl);
      setShareStatus('copied');
      addToast({ type: 'success', message: '링크가 클립보드에 복사되었습니다.' });
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (error) {
      console.error('Share failed:', error);
      setShareStatus('error');
      addToast({ type: 'error', message: '링크 복사에 실패했습니다.' });
      setTimeout(() => setShareStatus('idle'), 2500);
    }
  }, [name, krOrUs, addToast]);

  const toggleWatchlist = useCallback((ticker: string) => {
    setWatchlist(prev => {
      const isAdded = prev.includes(ticker);
      const newWatchlist = isAdded
        ? prev.filter(t => t !== ticker)
        : [...prev, ticker];

      try {
        window.localStorage.setItem('idiotquant_watchlist_v1', JSON.stringify(newWatchlist));
        addToast({
          type: isAdded ? 'info' : 'success',
          message: isAdded ? '관심 종목에서 제거되었습니다.' : '관심 종목에 추가되었습니다.'
        });
      } catch (error) {
        console.error('Failed to update watchlist:', error);
      }

      return newWatchlist;
    });
  }, [addToast]);

  useEffect(() => {
    const tickerFromUrl = searchParams.get('ticker');
    if (tickerFromUrl && tickerFromUrl !== name) {
      onSearch(tickerFromUrl);
    }
  }, [searchParams, name, onSearch]);

  useEffect(() => {
    const handleScroll = () => {
      setFixed(window.scrollY > 140);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
    if (isLoaded && tickerFromUrl) {
      awardEntrySearchXp(tickerFromUrl);
    }
  }, [isLoaded, tickerFromUrl, awardEntrySearchXp]);

  useEffect(() => {
    visibleDwellSectionsRef.current.clear();
    dwellSecondsRef.current = {};
  }, [activeTickerKey]);

  useEffect(() => {
    if (!isLoaded || !activeTickerKey) return;

    const dwellTargets = [
      { key: 'stock-card', node: stockCardDwellRef.current },
      { key: 'core-metrics', node: metricsDwellRef.current },
      { key: 'valuation', node: valuationDwellRef.current },
      { key: 'financials', node: financialsDwellRef.current },
    ].filter((target): target is { key: string; node: HTMLDivElement } => Boolean(target.node));

    if (dwellTargets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionKey = (entry.target as HTMLElement).dataset.xpSection;
          if (!sectionKey) return;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            visibleDwellSectionsRef.current.add(sectionKey);
          } else {
            visibleDwellSectionsRef.current.delete(sectionKey);
          }
        });
      },
      { threshold: [0, 0.55, 0.8] }
    );

    dwellTargets.forEach(({ key, node }) => {
      node.dataset.xpSection = key;
      observer.observe(node);
    });

    const dwellTimer = window.setInterval(() => {
      if (document.hidden || visibleDwellSectionsRef.current.size === 0) return;

      visibleDwellSectionsRef.current.forEach((sectionKey) => {
        const nextSeconds = (dwellSecondsRef.current[sectionKey] ?? 0) + 1;
        dwellSecondsRef.current[sectionKey] = nextSeconds;

        if (nextSeconds >= DWELL_SECONDS_PER_REWARD) {
          const rewardKey = `${activeTickerKey}:${sectionKey}`;
          const now = Date.now();
          const lastRewardedAt = dwellRewardedAtRef.current[rewardKey] ?? 0;

          if (now - lastRewardedAt < DWELL_REWARD_COOLDOWN_MS) return;

          dwellSecondsRef.current[sectionKey] = 0;
          dwellRewardedAtRef.current[rewardKey] = now;
          awardStockXp(activeTickerKey, DWELL_XP_GAIN);
        }
      });
    }, 1000);

    return () => {
      observer.disconnect();
      window.clearInterval(dwellTimer);
      visibleDwellSectionsRef.current.clear();
    };
  }, [isLoaded, activeTickerKey, awardStockXp]);

  const chartConfig = useMemo(() => {
    const isUs = krOrUs === 'US';
    const rawData = isUs ? data.usDaily?.output2 : data.kiChart?.output2;
    return {
      data: rawData?.map((i: any) => Number(isUs ? i.clos : i.stck_clpr)).reverse() || [],
      categories: rawData?.map((i: any) => (isUs ? i.xymd : i.stck_bsop_date)).reverse() || [],
      color: isUs ? '#3b82f6' : '#6366f1',
    };
  }, [krOrUs, data]);

  const currency = krOrUs === 'US' ? '$' : '₩';
  const isInWatchlist = tickerFromUrl ? watchlist.includes(tickerFromUrl) : false;

  if (!hasMounted) {
    return <div className="w-full min-h-screen bg-slate-50/50 dark:bg-zinc-950" />;
  }

  return (
    <div className="w-full min-h-screen bg-zinc-50/40 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-blue-500/10 transition-colors duration-300">

      {/* ===========================
          🍞 Toast Container
          =========================== */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <div className="space-y-2 pointer-events-auto">
          {toasts.map(toast => (
            <Toast key={toast.id} notification={toast} onDismiss={dismissToast} />
          ))}
        </div>
      </div>

      {/* ===========================
          🌐 Offline Banner
          =========================== */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[90] bg-amber-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-xs font-bold shadow-md animate-in fade-in duration-200">
          <WifiOff size={14} />
          오프라인 상태입니다 — 실시간 데이터를 불러올 수 없습니다.
        </div>
      )}

      {/* ===========================
          🎯 Main Header Navigation
          =========================== */}
      <header
        className={cn(
          "w-full transition-all duration-300 ease-in-out border-b",
          fixed
            ? "fixed top-0 z-[60] bg-white/90 dark:bg-zinc-900/90 border-zinc-200/80 dark:border-zinc-800 shadow-sm backdrop-blur-md"
            : "relative z-[31] bg-white dark:bg-zinc-900 border-zinc-200/60 dark:border-zinc-800/60",
          !isOnline && "mt-8"
        )}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
          
          <div className="w-full flex-1 flex items-center gap-2">
            <div className="w-full">
              <SearchAutocomplete
                placeHolder="🇰🇷 국내 종목명 또는 🇺🇸 미국 티커(Ticker) 입력"
                onSearchButton={handleSearch}
                validCorpNameArray={staticStockData.allTickers}
                onSearchStateChange={(focused) => {
                  setIsSearchFocused(focused);
                }}
              />
            </div>

            {isLoaded && (
              <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => tickerFromUrl && toggleWatchlist(tickerFromUrl)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all duration-200",
                    isInWatchlist
                      ? "text-amber-500 bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 shadow-2xs"
                      : "text-zinc-400 bg-zinc-50 border-zinc-200/80 hover:text-zinc-700 dark:bg-zinc-800/40 dark:border-zinc-800 dark:hover:text-zinc-200"
                  )}
                  aria-label={isInWatchlist ? "관심 종목 제거" : "관심 종목 추가"}
                >
                  <Star size={15} className={isInWatchlist ? "fill-amber-500" : ""} />
                </button>

                <span className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider font-mono border shadow-2xs h-[38px]",
                  krOrUs === 'US'
                    ? "bg-blue-50/60 text-blue-600 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40"
                    : "bg-indigo-50/60 text-indigo-600 border-indigo-200/60 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40"
                )}>
                  {krOrUs === 'US' ? <DollarSign size={12} /> : <Coins size={12} />}
                  <span>{krOrUs}</span>
                </span>
              </div>
            )}
          </div>

          <ScrollProgress isFixed={fixed} />
        </div>

        {!fixed && !isSearchFocused && (
          <div className="w-full flex flex-col border-t border-zinc-100 dark:border-zinc-800/40 bg-zinc-50/30 dark:bg-zinc-950/10 animate-in fade-in duration-300">
            {/* 인기 종목 */}
            <div className="max-w-6xl w-full mx-auto px-4 py-2 flex items-center gap-3 overflow-hidden border-b border-zinc-100 dark:border-zinc-800/30">
              <div className="flex items-center gap-1 shrink-0 text-amber-500 select-none">
                <Flame size={13} className="animate-pulse fill-amber-500/10" />
                <span className="text-[10px] font-black tracking-wider uppercase font-mono text-zinc-400 dark:text-zinc-500">
                  HOT POOL
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap py-0.5 scroll-smooth">
                {popularStocks.map((s: any, i: number) => (
                  <button
                    key={`hot-${i}`}
                    onClick={() => handleSearch(s.ticker)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800/80 shadow-2xs hover:border-blue-500 dark:hover:border-indigo-500 hover:text-zinc-950 dark:hover:text-white transition-all whitespace-nowrap"
                  >
                    <span className="mr-1 font-mono text-blue-500 font-black text-[10px]">{i + 1}</span>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 최근 검색 */}
            <div className="max-w-6xl w-full mx-auto px-4 py-2 flex items-center gap-3 overflow-hidden">
              <div className="flex items-center gap-1 shrink-0 text-zinc-400 dark:text-zinc-500 select-none">
                <History size={13} />
                <span className="text-[10px] font-black tracking-wider uppercase font-mono">
                  RECENT
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap py-0.5 scroll-smooth">
                {krMarketHistory.length > 0 ? (
                  krMarketHistory
                    .slice()
                    .reverse()
                    .map((s, i) => (
                      <button
                        key={`recent-${i}`}
                        onClick={() => handleSearch(s)}
                        className="shrink-0 px-2.5 py-1 text-xs font-medium text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 rounded-lg transition-all whitespace-nowrap"
                      >
                        {s}
                      </button>
                    ))
                ) : (
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-600 italic font-medium py-0.5">
                    최근 검색 기록이 없습니다.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ===========================
          📱 Main Content Area
          =========================== */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 transition-all duration-300">

        {!tickerFromUrl ? (
          <SearchGuide />
        ) : (
          <>
            {/* 로딩 */}
            {waitResponse && !isLoaded && (
              <div className="py-40 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                <div className="relative p-5 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 animate-pulse">
                  <Loader2 className="animate-spin text-blue-600 dark:text-indigo-400" size={28} />
                </div>
                <div className="text-center space-y-1.5 px-4">
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">
                    종목 데이터를 분석하는 중입니다
                  </p>
                  <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 font-mono leading-relaxed max-w-md mx-auto">
                    재무 데이터를 가져오고 밸류에이션 지표를 계산하는 중입니다...
                  </p>
                </div>
              </div>
            )}

            {/* 분석 결과 */}
            <div className={!isLoaded ? 'hidden' : 'block animate-in fade-in zoom-in-99 duration-500'}>

              {/* 결과 상태 배너 */}
              <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-ping" />
                  <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    NCAV 밸류에이션 분석이 완료되었습니다.
                  </span>
                </div>

                <button
                  onClick={handleShareResult}
                  disabled={shareStatus !== 'idle'}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all transform active:scale-98 shadow-2xs w-full sm:w-auto shrink-0",
                    shareStatus === 'copied'
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                      : shareStatus === 'error'
                        ? "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50"
                        : "bg-zinc-950 text-white hover:bg-zinc-900 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
                  )}
                >
                  {shareStatus === 'copied' ? (
                    <>
                      <Check size={14} />
                      <span>링크 복사 완료</span>
                    </>
                  ) : shareStatus === 'error' ? (
                    <>
                      <AlertCircle size={14} />
                      <span>링크 복사 실패</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={14} />
                      <span>분석 결과 공유</span>
                    </>
                  )}
                </button>
              </div>

              {/* 메인 2열 레이아웃 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6 transform-gpu">

                {/* 밸류에이션 카드 */}
                <div ref={stockCardDwellRef} className="lg:col-span-5 flex justify-center w-full">
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
                          fairValue: currency + calculateUsNcavValue(data.finnhubData, data.usDetail),
                          ncavScore: calculateUsNcavRatio(data.finnhubData, data.usDetail),
                          srimScore: calculateUsSRIM(data.finnhubData, data.usDetail),
                          per: data?.usDetail?.output?.perx ?? 0,
                          pbr: data?.usDetail?.output?.pbrx ?? 0,
                          eps: currency + (data?.usDetail?.output?.epsx ?? 0),
                          sector: data?.usDetail?.output?.e_icod ?? "DEFAULT",
                        }
                        : {
                          code: tickerFromUrl,
                          isUs: false,
                          name,
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
                        }
                    }
                    chartConfig={chartConfig}
                    rawData={data}
                    stockXpProfile={activeStockXpProfile}
                  />
                </div>

                {/* 재무 지표 */}
                <div ref={metricsDwellRef} className="lg:col-span-7 w-full h-full flex flex-col justify-between">
                  <StockMetrics data={data} isUs={krOrUs === 'US'} />
                </div>
              </div>

              <div className="transition-all duration-300 space-y-6">
                <div ref={valuationDwellRef} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-1 shadow-2xs">
                  <ValuationSection data={data} isUs={krOrUs === 'US'} />
                </div>

                {/* 재무제표 */}
                <div ref={financialsDwellRef} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs overflow-hidden">
                  <h3 className="text-sm font-bold tracking-tight mb-4 flex items-center gap-2 px-1 text-zinc-800 dark:text-zinc-200">
                    <Globe2 size={15} className="text-zinc-400 shrink-0" />
                    <span>재무제표 (Financial Statements)</span>
                  </h3>
                  <div className="overflow-x-auto w-full rounded-xl border border-zinc-100 dark:border-zinc-800">
                    {krOrUs === 'KR' ? (
                      <FinancialTables kiBS={data.kiBS} kiIS={data.kiIS} />
                    ) : (
                      <FinnhubTable data={data.finnhubData.data} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ===========================
          📄 Footer
          =========================== */}
      <footer className="max-w-6xl mx-auto px-4 py-8 mt-20 border-t border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-400 dark:text-zinc-500">
          <div className="flex items-center gap-2 select-none">
            <BarChart3 size={14} className="text-zinc-400" />
            <span className="font-bold text-zinc-700 dark:text-zinc-300">IdiotQuant Pro</span>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span>Deep Value Investment Analysis Platform</span>
          </div>
          <div className="flex items-center gap-5">
            <span>© 2026 IdiotQuant. All rights reserved.</span>
            <a href="#" className="hover:text-blue-600 dark:hover:text-indigo-400 transition-colors font-medium">
              문의하기
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ===========================
// 페이지 내보내기
// ===========================
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-40 gap-4 bg-slate-50/40 dark:bg-[#09090b] min-h-screen">
          <div className="relative p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 shadow-xs">
            <Loader2 className="animate-spin text-blue-600 dark:text-indigo-400" size={24} />
          </div>
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest font-mono uppercase">
            Initializing Quant Workspace...
          </p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}