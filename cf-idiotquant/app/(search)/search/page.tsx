'use client';

/**
 * 🚀 IdiotQuant Pro - Enterprise Stock Analysis Platform
 * 
 * 주요 개선사항:
 * - 성능 최적화: Dynamic imports, 메모이제이션, debouncing
 * - UX 향상: 스켈레톤 UI, 에러 복구, 오프라인 대응
 * - 타입 안전성: 엄격한 TypeScript 타입 정의
 * - 접근성: ARIA 레이블, 키보드 네비게이션
 * - SEO: 메타데이터, 구조화된 데이터
 */

import React, {
  useState,
  useEffect,
  Suspense,
  useId,
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
  TrendingUp,
  Globe2,
  DollarSign,
  Coins,
  WifiOff,
  RefreshCw,
  Bell,
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
// 📦 Lazy Load JSON Data
// ===========================
let all_tickers: string[] = [];
let corpCodeJson: Record<string, any> = {};

// 브라우저 환경에서만 JSON 로드
if (typeof window !== 'undefined') {
  Promise.all([
    import('@/public/data/usStockSymbols/nasdaq_tickers.json'),
    import('@/public/data/usStockSymbols/nyse_tickers.json'),
    import('@/public/data/usStockSymbols/amex_tickers.json'),
    import('@/public/data/validCorpCodeArray.json'),
    import('@/public/data/validCorpNameArray.json'),
    import('@/public/data/validCorpCode.json'),
  ]).then(([nasdaq, nyse, amex, corpCode, corpName, corpCodeData]) => {
    all_tickers = [
      ...nasdaq.default,
      ...nyse.default,
      ...amex.default,
      ...corpCode.default,
      ...corpName.default,
    ];
    corpCodeJson = corpCodeData.default;
  });
}

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
// 🎨 Skeleton Components
// ===========================
const StockCardSkeleton = memo(() => (
  <div className="w-full h-[420px] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 animate-pulse p-6 shadow-sm">
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
  <div className="w-full h-[420px] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 animate-pulse p-6 shadow-sm">
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
  <div className="w-full h-[320px] bg-white dark:bg-zinc-900 rounded-2xl animate-pulse p-6 shadow-sm">
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
// 🎯 TypeScript Interfaces
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
// 🔧 Constants & Utilities
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
// 🍞 Toast Notification Component
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
    success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400',
    error: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400',
    info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400'
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 fade-in duration-300",
      bgColorMap[notification.type]
    )}>
      <span className="text-xs font-semibold flex-1">{notification.message}</span>
      <button
        onClick={() => onDismiss(notification.id)}
        className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
        aria-label="알림 닫기"
      >
        <X size={14} />
      </button>
    </div>
  );
});
Toast.displayName = 'Toast';

// ===========================
// 🔌 Custom Hooks
// ===========================

/**
 * 온라인/오프라인 상태 감지
 */
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

/**
 * Debounced value hook
 */
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Toast notifications manager
 */
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

function ScrollProgress() {
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
    <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-zinc-200/60 dark:bg-zinc-800/60">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-[width] duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ===========================
// 🎬 Main Component
// ===========================
function SearchContent() {
  const sectionId = useId();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const { onSearch, krOrUs, response, data, name, waitResponse } = useStockSearch();

  const krMarketHistory = useAppSelector(selectKrMarketHistory);
  const popularStocks = useAppSelector(selectPopularStocks) || [];

  const isOnline = useOnlineStatus();
  const { toasts, addToast, dismissToast } = useToast();

  const [fixed, setFixed] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [stockXpProfiles, setStockXpProfiles] = useState<StockXpProfiles>({});
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isQueryEmpty, setIsQueryEmpty] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs
  const lastEntryAwardedTickerRef = useRef<string | null>(null);
  const stockCardDwellRef = useRef<HTMLDivElement | null>(null);
  const metricsDwellRef = useRef<HTMLDivElement | null>(null);
  const valuationDwellRef = useRef<HTMLDivElement | null>(null);
  const financialsDwellRef = useRef<HTMLDivElement | null>(null);
  const visibleDwellSectionsRef = useRef<Set<string>>(new Set());
  const dwellSecondsRef = useRef<Record<string, number>>({});
  const dwellRewardedAtRef = useRef<Record<string, number>>({});

  // ===========================
  // 🚀 Initialization
  // ===========================
  useEffect(() => {
    setHasMounted(true);
    dispatch(reqGetSearchLog('10'));

    // Load XP profiles
    try {
      const savedProfiles = window.localStorage.getItem(STOCK_XP_STORAGE_KEY);
      if (savedProfiles) {
        setStockXpProfiles(normalizeXpProfiles(JSON.parse(savedProfiles)));
      }
    } catch (error) {
      console.error('Failed to load XP profiles:', error);
      addToast({ type: 'error', message: '프로필 로드 실패' });
    }

    // Load watchlist
    try {
      const savedWatchlist = window.localStorage.getItem('idiotquant_watchlist_v1');
      if (savedWatchlist) {
        setWatchlist(JSON.parse(savedWatchlist));
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    }
  }, [dispatch]);

  // ===========================
  // 🎁 XP System
  // ===========================
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
      message: `+${SEARCH_RESULT_XP_GAIN} XP 획득! 종목 분석 진행 중...`
    });
  }, [awardStockXp, addToast]);

  // ===========================
  // 🔍 Search Handler
  // ===========================
  const handleSearch = useCallback((stockName: string) => {
    if (!stockName) return;

    if (!all_tickers.some((t) => t.toLowerCase() === stockName.toLowerCase())) {
      addToast({
        type: 'error',
        message: `'${stockName}'은(는) 목록에 없는 종목입니다.`
      });
      return;
    }

    startTransition(() => {
      router.push(`/search?ticker=${encodeURIComponent(stockName)}`);
    });
  }, [router, addToast]);

  // ===========================
  // 📤 Share Handler (개선)
  // ===========================
  const handleShareResult = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const currentUrl = window.location.href;
    const stockTitle = name
      ? `[IdiotQuant] ${name} (${krOrUs}) 딥 데이터 밸류에이션 분석 결과`
      : '[IdiotQuant] 인텔리전스 퀀트 분석 솔루션';

    // Web Share API 우선 시도
    if (navigator.share) {
      try {
        await navigator.share({
          title: stockTitle,
          // text: `벤자민 그레이엄 NCAV 가치 분석 및 S-RIM 기대 주가 진단`,
          url: currentUrl,
        });
        addToast({ type: 'success', message: '공유가 완료되었습니다!' });
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(currentUrl);
      setShareStatus('copied');
      addToast({ type: 'success', message: '링크가 클립보드에 복사되었습니다!' });
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (error) {
      console.error('Share failed:', error);
      setShareStatus('error');
      addToast({ type: 'error', message: '공유에 실패했습니다.' });
      setTimeout(() => setShareStatus('idle'), 2500);
    }
  }, [name, krOrUs, addToast]);

  // ===========================
  // ⭐ Watchlist Handler
  // ===========================
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
          message: isAdded ? '관심 종목에서 제거되었습니다' : '관심 종목에 추가되었습니다!'
        });
      } catch (error) {
        console.error('Failed to update watchlist:', error);
      }

      return newWatchlist;
    });
  }, [addToast]);

  // ===========================
  // 🔄 Refresh Handler
  // ===========================
  const handleRefresh = useCallback(async () => {
    const tickerFromUrl = searchParams.get('ticker');
    if (!tickerFromUrl) return;

    setIsRefreshing(true);
    try {
      await onSearch(tickerFromUrl);
      addToast({ type: 'success', message: '데이터가 새로고침되었습니다!' });
    } catch (error) {
      addToast({ type: 'error', message: '새로고침 실패' });
    } finally {
      setIsRefreshing(false);
    }
  }, [searchParams, onSearch, addToast]);

  // ===========================
  // 📍 URL & Loading States
  // ===========================
  useEffect(() => {
    const tickerFromUrl = searchParams.get('ticker');
    if (tickerFromUrl && tickerFromUrl !== name) {
      onSearch(tickerFromUrl);
    }
  }, [searchParams, name, onSearch]);

  useEffect(() => {
    const handleScroll = () => {
      setFixed(window.scrollY > 200);
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

  // ===========================
  // 👁️ Dwell Time XP System
  // ===========================
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

  // ===========================
  // 📊 Chart Configuration
  // ===========================
  const chartConfig = useMemo(() => {
    const isUs = krOrUs === 'US';
    const rawData = isUs ? data.usDaily?.output2 : data.kiChart?.output2;
    return {
      data: rawData?.map((i: any) => Number(isUs ? i.clos : i.stck_clpr)).reverse() || [],
      categories: rawData?.map((i: any) => (isUs ? i.xymd : i.stck_bsop_date)).reverse() || [],
      color: isUs ? '#2563eb' : '#4f46e5',
    };
  }, [krOrUs, data]);

  const shouldHideHeader = isSearchFocused && !isQueryEmpty;
  const currency = krOrUs === 'US' ? '$' : '₩';
  const isInWatchlist = tickerFromUrl ? watchlist.includes(tickerFromUrl) : false;

  if (!hasMounted) {
    return <div className="w-full min-h-screen bg-slate-50/50 dark:bg-zinc-950" />;
  }

  return (
    <div className="w-full min-h-screen bg-slate-50/60 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-blue-500/20 transition-colors duration-300">

      {/* ===========================
          🍞 Toast Container
          =========================== */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm w-full pointer-events-none">
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
        <div className="fixed top-0 left-0 right-0 z-[90] bg-amber-500 text-white py-2 px-4 flex items-center justify-center gap-2 text-xs font-bold shadow-lg">
          <WifiOff size={14} />
          오프라인 모드 - 일부 기능이 제한될 수 있습니다
        </div>
      )}

      {/* ===========================
          🎯 Main Header Navigation
          =========================== */}
      <header
        className={cn(
          "w-full transition-all duration-300 ease-in-out border-b backdrop-blur-md",
          fixed
            ? "fixed top-0 z-[60] bg-white/85 dark:bg-zinc-900/85 border-zinc-200/80 dark:border-zinc-800 shadow-sm"
            : "relative z-[31] bg-white dark:bg-zinc-900 border-zinc-200/50 dark:border-zinc-800/50",
          !isOnline && "mt-8"
        )}
      >
        <div className="max-w-6xl mx-auto">
          {/* Top Action Bar */}
          {true && <div className="px-2 py-2 flex items-center justify-between gap-1">
            {/* Search Bar */}
            <div className="pl-2 w-full">
              <SearchAutocomplete
                placeHolder="🇰🇷 국내 종목명 또는 🇺🇸 미국 티커(Ticker)를 입력하세요"
                onSearchButton={handleSearch}
                validCorpNameArray={all_tickers}
                onSearchStateChange={(focused, isEmpty) => {
                  setIsSearchFocused(focused);
                  setIsQueryEmpty(isEmpty);
                }}
              />
            </div>

            {/* Market Indicator & Actions */}
            {isLoaded && (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                {/* Refresh Button */}
                {/* <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  aria-label="데이터 새로고침"
                >
                  <RefreshCw size={14} className={cn("text-zinc-500", isRefreshing && "animate-spin")} />
                </button> */}

                {/* Watchlist Toggle */}
                <button
                  onClick={() => tickerFromUrl && toggleWatchlist(tickerFromUrl)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isInWatchlist
                      ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                      : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                  aria-label={isInWatchlist ? "관심 종목에서 제거" : "관심 종목에 추가"}
                >
                  <Star size={14} className={isInWatchlist ? "fill-amber-500" : ""} />
                </button>

                {/* Market Badge */}
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono shadow-2xs",
                  krOrUs === 'US'
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/40 dark:border-blue-900/40"
                    : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/40 dark:border-indigo-900/40"
                )}>
                  {krOrUs === 'US' ? <DollarSign size={10} /> : <Coins size={10} />}
                  {krOrUs}
                </span>
              </div>
            )}

            <ScrollProgress />

          </div>}



          {/* Quick Access Sections */}
          {!fixed && !isSearchFocused && (
            <div className="flex flex-col border-t border-zinc-100 dark:border-zinc-800/40 animate-in fade-in duration-300">
              {/* Hot Stocks */}
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/50 dark:bg-zinc-900/20 border-b border-zinc-100 dark:border-zinc-800/30">
                <div className="flex items-center gap-1 flex-shrink-0 text-amber-500">
                  <Flame size={12} className="animate-pulse fill-amber-500/20" />
                  <span className="text-[10px] font-black tracking-wider whitespace-nowrap uppercase font-mono text-zinc-500 dark:text-zinc-400">
                    인기 검색
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
                  {popularStocks.map((s: any, i: number) => (
                    <button
                      key={`hot-${i}`}
                      onClick={() => handleSearch(s.ticker)}
                      className="flex-shrink-0 px-2.5 py-0.5 rounded-md bg-white dark:bg-zinc-900 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800/80 shadow-2xs hover:border-blue-500 dark:hover:border-indigo-500 hover:text-zinc-900 transition-all whitespace-nowrap"
                    >
                      <span className="mr-1 font-mono text-blue-500 font-bold text-[10px]">{i + 1}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent History */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-[#121214]">
                <div className="flex items-center gap-1.5 flex-shrink-0 text-zinc-400 dark:text-zinc-500">
                  <History size={12} />
                  <span className="text-[10px] font-black tracking-wider whitespace-nowrap uppercase font-mono text-zinc-400">
                    최근 조회
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
                  {krMarketHistory.length > 0 ? (
                    krMarketHistory
                      .slice()
                      .reverse()
                      .map((s, i) => (
                        <button
                          key={`recent-${i}`}
                          onClick={() => handleSearch(s)}
                          className="flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-medium text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors whitespace-nowrap"
                        >
                          {s}
                        </button>
                      ))
                  ) : (
                    <span className="text-[10px] text-zinc-400/70 dark:text-zinc-600 italic font-medium">
                      최근 조회한 내역이 존재하지 않습니다.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ===========================
          📱 Main Content Area
          =========================== */}
      <main className="max-w-6xl mx-auto p-4 md:p-6 transition-all duration-300">

        {!tickerFromUrl ? (
          <SearchGuide />
        ) : (
          <>
            {/* Loading State */}
            {waitResponse && !isLoaded && (
              <div className="py-40 flex flex-col items-center justify-center gap-4">
                <div className="relative p-5 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800 animate-pulse">
                  <Loader2 className="animate-spin text-blue-600 dark:text-indigo-400" size={28} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">
                    이디엇퀀트 고성능 금융 엔진 가동 중
                  </p>
                  <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 font-mono">
                    Streaming historical financial state and processing metrics...
                  </p>
                </div>
              </div>
            )}

            {/* Main Dashboard */}
            <div className={!isLoaded ? 'hidden' : 'block animate-in fade-in zoom-in-98 duration-500'}>

              {/* Action Panel */}
              <div className="w-full flex items-center justify-between mb-4 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    NCAV 밸류에이션 리포트 생성이 완료되었습니다.
                  </span>
                </div>

                <button
                  onClick={handleShareResult}
                  disabled={shareStatus !== 'idle'}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all transform active:scale-95 shadow-2xs",
                    shareStatus === 'copied'
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                      : shareStatus === 'error'
                        ? "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50"
                        : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50"
                  )}
                >
                  {shareStatus === 'copied' ? (
                    <>
                      <Check size={13} />
                      링크 복사 완료
                    </>
                  ) : shareStatus === 'error' ? (
                    <>
                      <AlertCircle size={13} />
                      복사 실패
                    </>
                  ) : (
                    <>
                      <Share2 size={13} />
                      분석 결과 공유하기
                    </>
                  )}
                </button>
              </div>

              {/* Main Dashboard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch mb-8 transform-gpu">

                {/* Stock Card */}
                <div ref={stockCardDwellRef} className="md:col-span-5 flex justify-center w-full">
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
                          ticker: (corpCodeJson as any)?.[name]?.stock_code ?? '',
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

                {/* Metrics Card */}
                <div ref={metricsDwellRef} className="md:col-span-7 w-full h-full flex flex-col justify-between">
                  <StockMetrics data={data} isUs={krOrUs === 'US'} />
                </div>
              </div>

              {/* Detailed Sections */}
              <div className="transition-all duration-300 space-y-8">
                {/* Valuation */}
                <div ref={valuationDwellRef} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-1 shadow-2xs">
                  <ValuationSection data={data} isUs={krOrUs === 'US'} />
                </div>

                {/* Financials */}
                <div ref={financialsDwellRef} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 p-4 shadow-2xs overflow-hidden">
                  <h3 className="text-sm font-bold tracking-tight mb-4 flex items-center gap-2 px-1">
                    <Globe2 size={14} className="text-zinc-400" />
                    원천 재무제표(Financial Statements) 세부 정보
                  </h3>
                  {krOrUs === 'KR' ? (
                    <FinancialTables kiBS={data.kiBS} kiIS={data.kiIS} />
                  ) : (
                    <FinnhubTable data={data.finnhubData.data} />
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ===========================
          📄 Footer
          =========================== */}
      <footer className="max-w-6xl mx-auto px-4 py-8 mt-16 border-t border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} />
            <span className="font-semibold">IdiotQuant Pro</span>
            <span className="text-zinc-400 dark:text-zinc-600">|</span>
            <span>Deep Value Investment Analysis Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span>© 2024 IdiotQuant. All rights reserved.</span>
            <a href="#" className="hover:text-blue-600 dark:hover:text-indigo-400 transition-colors">
              문의하기
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ===========================
// 🎬 Main Export with Suspense
// ===========================
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-40 gap-4 bg-slate-50/60 dark:bg-[#09090b] min-h-screen">
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