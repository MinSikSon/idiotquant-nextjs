'use client';

import { useLocale, useTranslations } from "next-intl";
import { PageSearch } from "@/components/page-search";
import * as Tabs from '@radix-ui/react-tabs';
import * as Popover from '@radix-ui/react-popover';
import TechnicalSummary from '@/components/research/TechnicalSummary';
import { normalizeBars } from '@/lib/research/technical';
import {
  useState,
  useEffect,
  Suspense,
  useMemo,
  useRef,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
  memo,
  startTransition
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useViewAsUser } from '@/lib/viewAsUser';
import Link from 'next/link';
import { selectLikedList, selectTogglePending, selectLikesState, reqGetMyLikes, reqToggleLike, WATCHLIST_MARKET_LIMIT } from '@/lib/features/stockLikes/stockLikesSlice';
import dynamic from 'next/dynamic';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { useStockSearch } from '@/app/(search)/search/hooks/useStockSearch';
import { selectKrMarketHistory } from '@/lib/features/searchHistory/searchHistorySlice';
import {
  AlertCircle, Loader2, Flame, CheckCircle,
  Heart, ChevronDown, FileText, Plus, GitCompareArrows,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader, PAGE_WIDTH, PAGE_ACTION_CLS, PAGE_PRIMARY_ACTION_CLS } from '@/components/pageHeader';
import { GradeHelp } from './components/GradeHelp';
import { FinancialDataEvidence } from '@/components/financial-data-evidence';
import StockLikeStats from '@/components/stockLikeStats';
import FinancialFreshnessNotice from '@/components/financial-freshness';
import { analysisFinancialPeriods } from '@/lib/utils/financialFreshness';
import { usAnalysisAvailability } from '@/lib/utils/usAnalysisAvailability';
import { resolveStockSearchInput } from '@/lib/utils/stockSearchInput';
import { StockLogo } from '@/components/stockLogo';
import { analysisHref, comparisonHref, completeWatchRequest, matchesWatchStock, PENDING_WATCH_KEY, readPendingWatch, screenerReturnPath } from '@/lib/investmentFlow';
import { useToast, ToastContainer } from '@/components/ui/toast';
import { addEtfHoldings, readEtfDraft } from '@/lib/features/communityEtfs/draft';
import { buildKrBars, buildUsBars } from '@/app/(search)/search/components/financialBarsData';
import styles from './analyze.module.css';
import { AnalysisLoginPrompt } from './components/AnalysisLoginPrompt';

const ANALYZE_WIDTH = cn(PAGE_WIDTH.data, styles.container);
const ANALYZE_ACTION_CLS = "whitespace-nowrap md:px-2.5 md:text-sm";
const DESKTOP_ANALYZE_ACTION_CLS = "service-button navigation-action";

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

const FinancialBars = dynamic(
  () => import('@/app/(search)/search/components/FinancialBars').then(mod => ({ default: mod.FinancialBars })),
  { ssr: false }
);

const AnalysisIntro = dynamic(() => import('./components/AnalysisIntro'));

import { krStockCode, krStockDisplayName } from "@/lib/utils/krStockNames";
import { useUsStockDirectory, usStockDisplayName } from "@/lib/utils/usStockNames";
import { loadStaticStockData, type StaticStockData } from '@/lib/utils/stockSearchData';

import {
  reqGetSearchLog,
  selectPopularStocks,
} from '@/lib/features/searchLog/searchLogSlice';

import {
  calculateKrNcavRatio, calculateKrNcavValue,
  calculateUsNcavRatio, calculateUsNcavValue,
  getKrNcavGrade, getKrSRIMTargetPrice,
  getUsNcavGrade, calculateUsSRIM,
} from '@/lib/utils/financeCalc';

// =========================================================================
// 스켈레톤 컴포넌트
// =========================================================================
const StockCardSkeleton = memo(() => (
  <div className="w-full bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark overflow-hidden animate-pulse">
    <div className="h-[3px] w-full bg-neutral-200 dark:bg-surface-dark-muted" />
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-[52px] h-[52px] bg-surface-canvas dark:bg-surface-dark-canvas rounded-2xl border border-neutral-100 dark:border-border-subtle-dark shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 bg-neutral-200 dark:bg-surface-dark-muted rounded w-2/3" />
            <div className="h-6 w-10 bg-neutral-200 dark:bg-surface-dark-muted rounded-lg" />
          </div>
          <div className="h-3 bg-neutral-200 dark:bg-surface-dark-muted rounded w-1/3" />
          <div className="h-6 bg-neutral-200 dark:bg-surface-dark-muted rounded w-1/2 mt-1" />
        </div>
      </div>
      <div className="h-10 bg-surface-canvas dark:bg-surface-dark-canvas rounded-xl border border-neutral-100 dark:border-border-subtle-dark" />
    </div>
    <div className="px-5 pb-4">
      <div className="h-[68px] bg-surface-canvas dark:bg-surface-dark-canvas rounded-xl border border-neutral-100 dark:border-border-subtle-dark" />
    </div>
    {/* 카드의 지표 4칸 + 복사줄과 같은 구성 */}
    <div className="border-t border-neutral-100 dark:border-border-subtle-dark grid grid-cols-2 sm:grid-cols-4 gap-px bg-neutral-100 dark:bg-surface-dark-muted">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-surface-dark-card px-4 py-3.5 flex flex-col gap-1.5">
          <div className="h-2 w-10 bg-neutral-200 dark:bg-surface-dark-muted rounded" />
          <div className="h-4 w-14 bg-neutral-200 dark:bg-surface-dark-muted rounded" />
          <div className="h-2 w-16 bg-neutral-200 dark:bg-surface-dark-muted rounded" />
        </div>
      ))}
    </div>
    <div className="border-t border-neutral-100 dark:border-border-subtle-dark px-4 py-2 flex justify-end">
      <div className="h-5 w-28 bg-neutral-200 dark:bg-surface-dark-muted rounded-md" />
    </div>
  </div>
));
StockCardSkeleton.displayName = 'StockCardSkeleton';

const MetricsSkeleton = memo(() => (
  <div className="w-full h-[380px] bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark animate-pulse p-6">
    <div className="h-5 bg-neutral-200 dark:bg-surface-dark-card rounded w-1/3 mb-5" />
    <div className="grid grid-cols-2 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="p-4 bg-surface-canvas dark:bg-surface-dark-card/50 rounded-xl space-y-2">
          <div className="h-3 bg-neutral-200 dark:bg-surface-dark-elevated rounded w-1/2" />
          <div className="h-5 bg-neutral-200 dark:bg-surface-dark-elevated rounded w-3/4" />
        </div>
      ))}
    </div>
  </div>
));
MetricsSkeleton.displayName = 'MetricsSkeleton';

const ValuationSkeleton = memo(() => (
  <div className="w-full h-[280px] bg-white dark:bg-surface-dark-card rounded-2xl animate-pulse p-6">
    <div className="h-5 bg-neutral-200 dark:bg-surface-dark-card rounded w-1/3 mb-5" />
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-neutral-200 dark:bg-surface-dark-card rounded-xl" />)}
    </div>
  </div>
));
ValuationSkeleton.displayName = 'ValuationSkeleton';

// 실제 화면과 같은 구성·높이로 자리를 잡는다. 모양이 다르면 데이터가 도착할 때 화면이 재배치된다.
const ResultSkeleton = memo(() => (
  <div className="space-y-5 animate-in fade-in duration-300">
    {/* 종합 판단 (레이블 + 결론 + 체크 4개) */}
    <div className="rounded-2xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card p-5 sm:p-6 animate-pulse">
      <div className="h-2.5 w-44 bg-neutral-200 dark:bg-surface-dark-muted rounded mb-3" />
      <div className="h-4 w-2/3 bg-neutral-200 dark:bg-surface-dark-muted rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3.5">
        {[...Array(4)].map((_, i) => <div key={i} className="h-9 rounded-xl bg-surface-canvas dark:bg-surface-dark-canvas border border-neutral-100 dark:border-border-subtle-dark" />)}
      </div>
    </div>
    <StockCardSkeleton />
  </div>
));
ResultSkeleton.displayName = 'ResultSkeleton';

// 작은 화면의 탭과 데스크톱 열 제목이 같은 항목을 사용한다.
const DETAIL_TAB_KEYS = ['strategy', 'metrics', 'risk', 'financials'] as const;
type DetailTab = typeof DETAIL_TAB_KEYS[number];

const DESKTOP_ANALYSIS = '(min-width: 1024px)';
const subscribeToDesktopAnalysis = (onChange: () => void) => {
  const query = window.matchMedia(DESKTOP_ANALYSIS);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const getDesktopAnalysis = () => window.matchMedia(DESKTOP_ANALYSIS).matches;
const getServerDesktopAnalysis = () => false;

function AnalysisSection({ tab, desktop, children }: {
  tab: DetailTab;
  desktop: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("analysis");
  const titleId = `analysis-${tab}-title`;
  return (
    <Tabs.Content value={tab} forceMount asChild
      className={desktop ? styles.analysisSection : styles.tabPanel}
      {...(desktop && { role: 'presentation', 'aria-labelledby': undefined, tabIndex: undefined })}
    >
      <div>
        {desktop && <h2 id={titleId} className={styles.sectionTitle}>{t(tab)}</h2>}
        <div className={desktop ? styles.columnScroll : undefined}
          {...(desktop && { role: 'region', 'aria-labelledby': titleId, tabIndex: 0 })}
        >
          {children}
        </div>
      </div>
    </Tabs.Content>
  );
}

// =========================================================================
// 종합 판단 — 지표 값에서 문장과 색을 생성한다.
// 나열된 지표만 보고 사용자가 결론을 직접 계산하게 두지 않는 것이 목적이다.
// 조건이 나쁠 때도 초록 배너가 나오면 배너 자체를 아무도 믿지 않게 되므로,
// 충족 개수에 따라 톤(초록 / 중립 / 경고)이 반드시 갈리게 한다.
// =========================================================================
interface VerdictMetrics { ncavMultiple: number | null; pbr: number; per: number; roe: number | null }

// 판정 항목 = 종목 카드에 표시하는 지표 4개와 같다. 산문으로 늘어놓으면 어느 지표가
// 걸렸는지 다시 대조해야 하므로, 기준·값·충족 여부를 한 줄씩 세운다.
const VERDICT_LABELS = { ncav: "NCAV", pbr: "PBR", per: "PER", roe: "ROE" } as const;
const VERDICT_CHECKS: {
  label: keyof typeof VERDICT_LABELS;
  criterion: "minimumNcav" | "pbrRange" | "perRange" | "minimumRoe";
  test: (m: VerdictMetrics) => boolean;
  value: (m: VerdictMetrics) => string;
}[] = [
  {
    label: 'ncav',
    criterion: 'minimumNcav',
    test: m => m.ncavMultiple !== null && m.ncavMultiple >= 1,
    value: m => m.ncavMultiple !== null ? `${m.ncavMultiple.toFixed(2)}x` : '—',
  },
  {
    label: 'pbr',
    criterion: 'pbrRange',
    test: m => m.pbr > 0 && m.pbr < 1,
    value: m => m.pbr > 0 ? `${m.pbr.toFixed(2)}x` : '—',
  },
  {
    label: 'per',
    criterion: 'perRange',
    test: m => m.per > 0 && m.per < 10,
    value: m => m.per > 0 ? `${m.per.toFixed(1)}x` : '—',
  },
  {
    label: 'roe',
    criterion: 'minimumRoe',
    test: m => m.roe !== null && m.roe >= 10,
    value: m => m.roe !== null ? `${m.roe.toFixed(1)}%` : '—',
  },
];

function buildVerdict(metrics: VerdictMetrics) {
  const checks = VERDICT_CHECKS.map(check => ({
    label: check.label, criterion: check.criterion, value: check.value(metrics), ok: check.test(metrics),
  }));
  const metCount = checks.filter(check => check.ok).length;
  return { metCount, checks };
}

// =========================================================================
// 메인 콘텐츠
// =========================================================================
function StockName({ name }: { name: string }) {
  const t = useTranslations("analysis");
  const container = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const box = container.current;
    const text = label.current;
    if (!box || !text) return;
    const measure = () => setTruncated(text.scrollWidth > box.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    document.fonts.addEventListener('loadingdone', measure);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', measure);
    };
  }, [name]);

  return (
    <Popover.Root>
      <Popover.Anchor asChild>
        <span ref={container} className={cn(styles.stockName, "relative block")}>
          <span ref={label} className={cn("block truncate", truncated && "mr-5")}>{name}</span>
          {truncated && (
            <Popover.Trigger className="absolute inset-0 flex min-h-11 items-start justify-end rounded-sm pt-1 focus-visible:outline focus-visible:-outline-offset-2 md:min-h-0 md:items-center md:pt-0"
              aria-label={t("fullStockName")}>
              <ChevronDown size={14} aria-hidden="true" />
            </Popover.Trigger>
          )}
        </span>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={10} collisionPadding={12} aria-label={t("fullStockNameDialog")}
          className="z-50 max-w-[min(28rem,calc(100vw-24px))] break-words rounded-lg border border-neutral-200 bg-surface-card px-3 py-2 text-sm text-neutral-900 shadow-md dark:border-neutral-700 dark:bg-surface-dark-card dark:text-white">
          {name}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function AnalyzeContent() {
  const locale = useLocale();
  const t = useTranslations("analysis");
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const { onSearch, krOrUs, data, name, waitResponse } = useStockSearch();

  const krMarketHistory = useAppSelector(selectKrMarketHistory);
  const popularStocks = useAppSelector(selectPopularStocks) || [];

  const { data: session } = useSession();
  const isLoggedIn = !!session;
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';
  const viewAsUser = useViewAsUser();
  const { toasts, addToast, removeToast: dismissToast } = useToast();
  const [etfDraft, setEtfDraft] = useState<ReturnType<typeof readEtfDraft>>(null);

  const returnTo = screenerReturnPath(searchParams.get('returnTo')) ?? (searchParams.get('from') === 'screener' ? '/screener' : null);
  const resumeStarted = useRef(false);
  const [watchSaving, setWatchSaving] = useState(false);
  const likedList = useAppSelector(selectLikedList);
  const togglePending = useAppSelector(selectTogglePending);
  const likesState = useAppSelector(selectLikesState);

  const [hasMounted, setHasMounted] = useState(false);
  const [staticStockData, setStaticStockData] = useState<StaticStockData>({ allTickers: [], krTickers: [], usTickers: [], usStocks: [], krStocks: [], corpCodeJson: {} });
  // 모바일 종합 판단 — 한 줄 요약을 눌러 지표 4개(기준·값·충족 여부)를 펼친다
  const [verdictOpen, setVerdictOpen] = useState(false);
  // 재무 탭 — 추이 그래프와 기간별 숫자표를 전환한다
  const requestedTab = DETAIL_TAB_KEYS.find(tab => tab === searchParams.get('tab')) ?? 'strategy';
  const requestedFinanceView = searchParams.get('finance') === 'table' ? 'table' : 'bars';
  const [financeView, setFinanceView] = useState<'bars' | 'table'>(requestedFinanceView);
  const [detailTab, setDetailTab] = useState<DetailTab>(requestedTab);
  const [visitedTabs, setVisitedTabs] = useState<DetailTab[]>([requestedTab]);
  const detailStart = useRef<HTMLDivElement>(null);
  const isDesktop = useSyncExternalStore(subscribeToDesktopAnalysis, getDesktopAnalysis, getServerDesktopAnalysis);

  const changeDetailTab = (value: string) => {
    const tab = value as DetailTab;
    setDetailTab(tab);
    setVisitedTabs(current => current.includes(tab) ? current : [...current, tab]);
    requestAnimationFrame(() => detailStart.current?.scrollIntoView({ block: 'start' }));
  };
  // 결과를 보는 중에는 검색줄을 접어 헤더가 종목 정보를 대신 보여준다

  useEffect(() => {
    setHasMounted(true);
    dispatch(reqGetSearchLog('10'));
    loadStaticStockData().then(setStaticStockData).catch(() => {
      addToast('error', t("directoryError"));
    });
  }, [dispatch, addToast, t]);


  const handleSearch = useCallback((stockName: string) => {
    if (!stockName.trim()) return;
    const ticker = resolveStockSearchInput(stockName, staticStockData.allTickers);
    if (!ticker) {
      addToast('error', t("invalidStock"));
      return;
    }
    startTransition(() => { router.push(`/analyze?ticker=${encodeURIComponent(ticker)}`); });
  }, [router, addToast, staticStockData.allTickers, t]);

  useEffect(() => {
    const ticker = searchParams.get('ticker');
    if (ticker && ticker !== name) onSearch(ticker);
  }, [searchParams, name, onSearch]);

  const tickerFromUrl = searchParams.get('ticker');

  const analysisIdentity = JSON.stringify([tickerFromUrl, requestedTab, requestedFinanceView]);
  const [previousIdentity, setPreviousIdentity] = useState(analysisIdentity);
  if (previousIdentity !== analysisIdentity) {
    setPreviousIdentity(analysisIdentity);
    setDetailTab(requestedTab);
    setVisitedTabs([requestedTab]);
    setFinanceView(requestedFinanceView);
    setVerdictOpen(false);
  }

  const shareParams = new URLSearchParams();
  if (tickerFromUrl) {
    shareParams.set('ticker', tickerFromUrl);
    if (detailTab !== 'strategy') shareParams.set('tab', detailTab);
    if (financeView === 'table') shareParams.set('finance', financeView);
  }

  // API 응답에서 실제 종목명·종목코드 추출 (검색 입력값과 무관하게 항상 정확한 정보 표시)
  const displayName = krOrUs === 'KR'
    ? (data.kiChart?.output1?.hts_kor_isnm || name)
    : (data.usSearchInfo?.output?.prdt_eng_name || data.usSearchInfo?.output?.ovrs_item_name || name);

  const usAvailability = usAnalysisAvailability(data);
  const isLoaded =
    tickerFromUrl === name &&
    (
      (krOrUs === 'KR' && data.kiChart.state === 'fulfilled' && data.kiBS.state === 'fulfilled' && data.kiIS.state === 'fulfilled') ||
      (krOrUs === 'US' && usAvailability.priceReady && usAvailability.financialsReady)
    );

  // 가격 정보만 필요한 섹션(StockCard·기본 지표)을 위한 조건 — 재무제표 없이도 주가·PBR·PER·EPS 표시
  const isPriceLoaded =
    tickerFromUrl === name &&
    (
      (krOrUs === 'KR' && data.kiPrice.state === 'fulfilled') ||
      (krOrUs === 'US' && usAvailability.priceReady)
    );

  const currency = krOrUs === 'US' ? '$' : '₩';
  const watchStock = useMemo(() => ({ ticker: tickerFromUrl ?? '', name: displayName ?? tickerFromUrl ?? '', isUs: krOrUs === 'US' }), [tickerFromUrl, displayName, krOrUs]);
  const savedWatchStock = isLoggedIn ? likedList.find(item => matchesWatchStock(item, watchStock)) : undefined;
  const isInWatchlist = !!savedWatchStock;
  const likeBusy = watchSaving || (isLoggedIn && likesState === 'pending') || togglePending.some(ticker => ticker === watchStock.ticker || ticker === watchStock.name);
  const analysisPath = tickerFromUrl ? analysisHref(tickerFromUrl, returnTo ?? undefined) : '/analyze';
  const loginHref = `/login?callbackUrl=${encodeURIComponent(analysisPath)}`;

  useEffect(() => {
    if (session?.user?.id) dispatch(reqGetMyLikes());
  }, [session?.user?.id, dispatch]);

  const handleToggleLike = async () => {
    if (!tickerFromUrl || likeBusy) return;
    if (!session?.user) {
      try { sessionStorage.setItem(PENDING_WATCH_KEY, JSON.stringify({ ...watchStock, createdAt: Date.now() })); }
      catch { addToast('info', t("saveAfterSignIn")); }
      router.push(loginHref);
      return;
    }
    setWatchSaving(true);
    try {
      await dispatch(reqToggleLike({ ticker: savedWatchStock?.ticker ?? (watchStock.isUs ? watchStock.ticker : watchStock.name), name: watchStock.name, isUs: watchStock.isUs })).unwrap();
      addToast('success', isInWatchlist ? t("removed") : t("saved"));
    } catch (error) {
      if (error !== WATCHLIST_MARKET_LIMIT) await dispatch(reqGetMyLikes());
      addToast('error', error === WATCHLIST_MARKET_LIMIT ? t("watchlistMarketLimit") : isInWatchlist ? t("removeFailed") : t("saveFailed"));
    } finally { setWatchSaving(false); }
  };

  useEffect(() => {
    if (!session?.user?.id || !isPriceLoaded || resumeStarted.current) return;
    let intent;
    try { intent = readPendingWatch(sessionStorage.getItem(PENDING_WATCH_KEY), watchStock.ticker); }
    catch { return; }
    if (!intent) return;
    resumeStarted.current = true;
    const requested = intent;
    setWatchSaving(true);
    void (async () => {
      try {
        // 토글 API이므로 조회 성공 후 한 번만 소비하고, 기존 저장은 해제하지 않는다.
        await completeWatchRequest(requested,
          async () => (await dispatch(reqGetMyLikes()).unwrap())?.data ?? [],
          () => sessionStorage.removeItem(PENDING_WATCH_KEY),
          stock => dispatch(reqToggleLike({ ticker: stock.isUs ? stock.ticker : stock.name, name: stock.name, isUs: stock.isUs })).unwrap(),
        );
        addToast('success', t("saved"));
      } catch (error) {
        if (error !== WATCHLIST_MARKET_LIMIT) await dispatch(reqGetMyLikes());
        addToast('error', error === WATCHLIST_MARKET_LIMIT ? t("watchlistMarketLimit") : t("saveFailed"));
      } finally { setWatchSaving(false); }
    })();
  }, [session?.user?.id, isPriceLoaded, watchStock.ticker, dispatch, addToast, t]);


  const chartConfig = useMemo(() => {
    const isUs = krOrUs === 'US';
    const raw = isUs ? data.usDaily?.output2 : data.kiChart?.output2;
    return {
      data: raw?.map((i: any) => Number(isUs ? i.clos : i.stck_clpr)).reverse() || [],
      categories: raw?.map((i: any) => (isUs ? i.xymd : i.stck_bsop_date)).reverse() || [],
      color: isUs ? '#3b82f6' : '#6366f1',
    };
  }, [krOrUs, data]);

  const technicalBars = useMemo(() => normalizeBars(
    (krOrUs === 'US' ? data.usDaily?.output2 : data.kiChart?.output2) ?? [], krOrUs
  ), [krOrUs, data]);

  // 차트 데이터가 비어 추이를 그릴 수 없을 때, 실제 종목 상태 플래그로 거래정지/상장폐지가
  // 확인된 경우에만 안내한다. 플래그가 없으면(단순 빈 응답·로딩 등) 오안내를 피하기 위해 표시하지 않음.
  const chartNotice: 'suspended' | 'delisted' | undefined = (() => {
    const dailyState = krOrUs === 'US' ? data.usDaily?.state : data.kiChart?.state;
    const settled = dailyState === 'fulfilled' || dailyState === 'rejected';
    if (!isPriceLoaded || chartConfig.data.length > 0 || !settled) return undefined;
    if (krOrUs === 'KR') {
      const o = data.kiPrice?.output;
      // 58: 거래정지 (iscd_stat_cls_code), temp_stop_yn: 임시정지여부
      if (o?.iscd_stat_cls_code === '58' || o?.temp_stop_yn === 'Y') return 'suspended';
      return undefined;
    } else {
      const o = data.usSearchInfo?.output;
      if (o?.lstg_abol_item_yn === 'Y' || o?.lstg_yn === 'N') return 'delisted';
      if (o?.ovrs_stck_tr_stop_dvsn_cd && o.ovrs_stck_tr_stop_dvsn_cd !== '00') return 'suspended';
      return undefined;
    }
  })();

  // 핵심 지표 + StockCard props 통합 (중복 계산 방지)
  // isPriceLoaded 시점부터 가격·PBR·PER·EPS 표시. NCAV·fairValue·srimScore는 isLoaded 이후에 채워짐.
  const stockData = useMemo(() => {
    if (!isPriceLoaded) return null;
    if (krOrUs === 'KR') {
      const ncavRatio = isLoaded ? calculateKrNcavRatio(data.kiBS, data.kiChart) : 0;
      const pbr = Number(data?.kiPrice?.output?.pbr ?? 0);
      const per = Number(data?.kiPrice?.output?.per ?? 0);
      const eps = Number(data?.kiPrice?.output?.eps ?? 0);
      const curPrice = Number(data?.kiPrice?.output?.stck_prpr ?? 0);
      const grade = isLoaded ? getKrNcavGrade(data.kiBS, data.kiChart) : undefined;
      const fairValue = isLoaded ? calculateKrNcavValue(data.kiBS, data.kiChart) : 0;
      const srimScore = isLoaded ? getKrSRIMTargetPrice(data.kiBS, data.kiIS, data.kiChart) : undefined;
      const stockTicker = data.kiChart?.output1?.stck_shrn_iscd
        || (/^\d{6}$/.test(name) ? name : (staticStockData.corpCodeJson as any)?.[name]?.stock_code ?? '');
      const bps = Number(data?.kiPrice?.output?.bps ?? 0);
      return { ncavRatio, pbr, per, eps, bps, curPrice, grade, fairValue, srimScore, stockTicker };
    } else {
      const ncavRatio = isLoaded ? calculateUsNcavRatio(data.finnhubData, data.usDetail) : 0;
      const pbr = Number(data?.usDetail?.output?.pbrx ?? 0);
      const per = Number(data?.usDetail?.output?.perx ?? 0);
      const eps = Number(data?.usDetail?.output?.epsx ?? 0);
      const curPrice = Number(data?.usDetail?.output?.last ?? 0);
      const grade = isLoaded ? getUsNcavGrade(data.finnhubData, data.usDetail) : undefined;
      const fairValue = isLoaded ? calculateUsNcavValue(data.finnhubData, data.usDetail) : 0;
      const srimScore = isLoaded ? calculateUsSRIM(data.finnhubData, data.usDetail) : undefined;
      const bps = Number(data?.usDetail?.output?.bpsx ?? 0);
      return { ncavRatio, pbr, per, eps, bps, curPrice, grade, fairValue, srimScore, stockTicker: '' };
    }
  }, [isPriceLoaded, isLoaded, krOrUs, data, name, staticStockData.corpCodeJson]);

  // 발굴 목록과 같은 뜻의 지표를 쓴다 — 저기선 "NCAV 1.42x", 여기선 "업사이드 +42%" 처럼
  // 같은 값을 다른 이름으로 부르면 두 화면을 오갈 때마다 환산을 해야 한다.
  const ncavMultiple = stockData && isLoaded && stockData.ncavRatio !== 0
    ? stockData.ncavRatio / 100 + 1
    : null;
  const roe = stockData && stockData.bps > 0 ? (stockData.eps / stockData.bps) * 100 : null;

  // 헤더와 카드가 함께 쓰는 표시용 값 (같은 식을 두 곳에 적으면 한쪽만 고쳐진다)
  const tickerLabel = krOrUs === 'US' ? name : (stockData?.stockTicker || tickerFromUrl || '');
  const usDirectory = useUsStockDirectory(!tickerFromUrl || krOrUs === 'US');
  const localizedDisplayName = krOrUs === 'KR' ? krStockDisplayName(tickerLabel, displayName, locale)
    : usStockDisplayName(usDirectory?.get(tickerLabel.toUpperCase()), displayName, locale);
  const shortcutLabel = (ticker: string, name: string) => {
    const code = krStockCode(ticker) ?? krStockCode(name);
    const localized = code ? krStockDisplayName(code, name, locale)
      : usStockDisplayName(usDirectory?.get(ticker.toUpperCase()), name, locale);
    return locale !== 'ko' && localized !== (code ?? ticker) ? `${localized} · ${code ?? ticker}` : localized;
  };
  const etfMarket = krOrUs === 'US' ? 'US' : 'KR';
  const isInEtfDraft = etfDraft?.market === etfMarket && etfDraft.holdings.some(holding => holding.ticker === tickerLabel);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEtfDraft(readEtfDraft());
  }, []);
  const addToEtfDraft = () => {
    if (!tickerLabel || !displayName) return;
    try {
      const next = addEtfHoldings({ market: etfMarket, holdings: [{ ticker: tickerLabel, name: displayName }] });
      setEtfDraft(next);
      addToast('success', next.holdings.length === 1
        ? t("draftFirst")
        : t("draftSaved", { count: next.holdings.length }));
    } catch (error) {
      addToast('error', error instanceof Error && !(error instanceof DOMException) ? error.message : t("draftFailed"));
    }
  };
  const marketName = krOrUs === 'US'
    ? (data?.usSearchInfo?.output?.tr_mket_name || data?.usSearchInfo?.output?.ovrs_excg_name || '')
    : (data?.kiPrice?.output?.rprs_mrkt_kor_name ?? '');
  const gradeLabel = (() => {
    const g: any = stockData?.grade;
    if (!g) return null;
    return typeof g === 'object' ? (String(g.grade || '') || null) : String(g);
  })();
  const headerPrice = stockData
    ? currency + (krOrUs === 'US'
        ? stockData.curPrice.toFixed(2)
        : Math.round(stockData.curPrice).toLocaleString())
    : '';
  const verdict = stockData
    ? buildVerdict({ ncavMultiple, pbr: stockData.pbr, per: stockData.per, roe })
    : null;

  const financialStatus = !waitResponse ? (
                <div role="alert" className="rounded-xl border border-neutral-200 p-4 text-[15px] dark:border-neutral-700">
                  <p>{t("financialError")}</p>
                  <button type="button" onClick={() => { if (tickerFromUrl) onSearch(tickerFromUrl); }} className={`${PAGE_ACTION_CLS} mt-3`}>{t("retry")}</button>
                </div>
              ) :
              <div role="status" aria-live="polite" className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-border-subtle-dark dark:bg-surface-dark-card">
                <div className="flex items-center gap-2 text-[15px] text-neutral-600 dark:text-neutral-300">
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  {t("financialLoading")}
                </div>
                <div aria-hidden="true" className="mt-4 space-y-3 animate-pulse">
                  <div className="h-3 w-2/3 rounded bg-neutral-100 dark:bg-surface-dark-muted" />
                  <div className="h-3 w-1/2 rounded bg-neutral-100 dark:bg-surface-dark-muted" />
                </div>
              </div>;

  if (!hasMounted) return <div className="min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas" />;

  return (
    <Tabs.Root value={detailTab} onValueChange={changeDetailTab} asChild>
    <div id="analyze-page" className={cn(styles.page, "min-h-screen antialiased")}>

      <ToastContainer toasts={toasts} onRemove={dismissToast} />

      {/* ── 헤더 ── */}
      <PageHeader
        icon={isPriceLoaded ? <StockLogo key={tickerLabel} ticker={tickerLabel} name={displayName} isUs={krOrUs === 'US'} /> : undefined}
        className={cn(styles.header, !tickerFromUrl && styles.emptyHeader)}
        containerClassName={ANALYZE_WIDTH}
        title={isPriceLoaded ? <StockName key={tickerFromUrl} name={localizedDisplayName || tickerLabel} /> : !tickerFromUrl ? t("search") : t("title")}
        description={!tickerFromUrl ? t("description") : undefined}
        meta={tickerFromUrl ? <>
          <div className="flex min-w-0 items-center gap-1.5" aria-label={t("quote")}>
            <span className={styles.quoteTicker}>{isPriceLoaded ? tickerLabel : tickerFromUrl}</span>
            {isPriceLoaded && marketName && <span className={styles.quoteAux}>{marketName}</span>}
            <span className={cn(styles.price, styles.quotePrice)}>{isPriceLoaded ? headerPrice : waitResponse ? t("loadingQuote") : t("noQuote")}</span>
          </div>
        </> : undefined}
        compactMeta={isPriceLoaded ? <>
          <span data-analyze-ticker>{tickerLabel}</span>
          <span className="shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-white">{headerPrice}</span>
        </> : undefined}
        primaryActionInMenu={!isDesktop}
        primaryAction={isPriceLoaded ? <div className="flex flex-col gap-2 lg:mr-1 lg:flex-row lg:items-center">
          {isAdmin && !viewAsUser && (isInEtfDraft
            ? <Link href="/etfs/draft" className={isDesktop ? DESKTOP_ANALYZE_ACTION_CLS : cn(PAGE_ACTION_CLS, ANALYZE_ACTION_CLS)}>
                {isDesktop && <FileText size={17} aria-hidden="true" />}{t("viewDraft")}
              </Link>
            : <button type="button" onClick={addToEtfDraft} className={isDesktop ? DESKTOP_ANALYZE_ACTION_CLS : cn(PAGE_ACTION_CLS, ANALYZE_ACTION_CLS)}>
                {isDesktop && <Plus size={17} aria-hidden="true" />}{t("addEtf")}
              </button>)}
          <Link href={comparisonHref(krOrUs, [tickerLabel], new Date().toLocaleDateString('sv-SE'))}
            className={isDesktop ? DESKTOP_ANALYZE_ACTION_CLS : cn(PAGE_PRIMARY_ACTION_CLS, ANALYZE_ACTION_CLS, "dark:text-neutral-950")}>
            {isDesktop && <GitCompareArrows size={17} aria-hidden="true" />}{t("addCompare")}
          </Link>
        </div> : undefined}
        share={{ path: tickerFromUrl ? `/analyze?${shareParams}` : "/analyze" }}
        actions={isPriceLoaded ? <div className="flex min-w-0 flex-col gap-3">
          <button type="button" onClick={() => void handleToggleLike()} disabled={likeBusy}
            aria-label={isInWatchlist ? t("removeFromWatchlist") : t("addWatchlistButton")} aria-pressed={isInWatchlist}
            className={cn(PAGE_ACTION_CLS, "justify-start aria-pressed:bg-brand-light aria-pressed:text-brand-ink dark:aria-pressed:bg-brand-muted/50")}>
            <Heart size={16} fill={isInWatchlist ? 'currentColor' : 'none'} />{likeBusy ? t("saving") : isInWatchlist ? t("removeWatchlist") : t("addWatchlistButton")}
          </button>
          {gradeLabel && <GradeHelp key={tickerLabel} grade={gradeLabel} upside={stockData?.ncavRatio ?? 0} />}
        </div> : undefined}
        tabs={isPriceLoaded && !isDesktop ? <Tabs.List aria-label={t("title")} className={styles.analysisTabs}>
          {DETAIL_TAB_KEYS.map(tab => <Tabs.Trigger key={tab} value={tab} className={cn("service-button-quiet", styles.analysisTab)}>{t(tab)}</Tabs.Trigger>)}
        </Tabs.List> : undefined}
        mobileCompact
        mobileTitleOnScroll={isPriceLoaded}

      >
        <PageSearch purpose="analyze" onSelect={handleSearch} />

        {/* 인기 종목 + 최근 검색 — 검색 화면에서만 보여준다 */}
        {!isPriceLoaded && (popularStocks.length > 0 || krMarketHistory.length > 0) && (
          <div data-header-detail className={cn(styles.history, "md:border-t")}>
            {popularStocks.length > 0 && (
              <div className={cn(ANALYZE_WIDTH, "py-2 flex items-center gap-3")}>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Flame size={11} className="text-amber-500" />
                  <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-normal" title={t("popularHint")}>{t("popular")}</span>
                </div>
                <div className={styles.historyList}>
                  {popularStocks.slice(0, 8).map((s: any, i: number) => (
                    <button key={s.ticker} type="button" onClick={() => handleSearch(s.ticker)}
                      className={cn("service-button", styles.stockShortcut)}
                    >
                      <span className={cn(styles.rank, "w-3.5 h-3.5 flex items-center justify-center rounded-full text-sm shrink-0")}>{i + 1}</span>
                      {shortcutLabel(s.ticker, s.name)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {krMarketHistory.length > 0 && (
              <div className={cn(ANALYZE_WIDTH, "py-2 flex items-center gap-3", !isPriceLoaded && popularStocks.length > 0 && "border-t border-neutral-100 dark:border-border-subtle-dark/40")}>
                <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-normal shrink-0">{t("recent")}</span>
                <div className={styles.historyList}>
                  {krMarketHistory.slice().reverse().slice(0, 8).map((s, i) => (
                    <button key={i} type="button" onClick={() => handleSearch(s)}
                      className={cn("service-button", styles.stockShortcut)}
                    >
                      {shortcutLabel(s, s)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </PageHeader>

      {/* ── 메인 ── */}
      {/* 좌우 여백은 ANALYZE_WIDTH 하나를 따른다(헤더·푸터도 같은 값).
          원래는 모바일 12px 을 따로 썼다 — 20px 바깥 여백에 카드 자신의 여백이 겹쳐
          글이 시작되는 자리가 390px 화면에서 40px 이 되던 문제를 막으려던 것이다.
          지금 프리셋은 16px 이라 그 합이 36px 이고, 무엇보다 페이지마다 본문
          시작선이 다른 쪽이 더 크게 걸린다. 카드 여백이 다시 두꺼워지면 여기가
          아니라 카드 쪽을 줄인다. */}
      <main className={cn(ANALYZE_WIDTH, styles.content, "pb-8")}>
        {!tickerFromUrl ? (
          <>
            <StockLikeStats />
            <AnalysisIntro />
          </>
        ) : (
          <>
            {waitResponse && !isPriceLoaded && <ResultSkeleton />}
            {!waitResponse && tickerFromUrl === name && krOrUs === 'US' && !isPriceLoaded && (
              <div role="alert" className="rounded-xl border border-neutral-200 p-4 text-[15px] dark:border-neutral-700">
                <p>{t("quoteError")}</p>
                <button type="button" onClick={() => onSearch(tickerFromUrl)} className={`${PAGE_ACTION_CLS} mt-3`}>{t("retry")}</button>
              </div>
            )}

            <div className={cn(!isPriceLoaded && 'hidden', isPriceLoaded && isDesktop && styles.desktopResults)}>
              {krOrUs === 'US' && data.usSearchInfo.state === 'rejected' && (
                <p role="status" className="mb-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                  {t("tickerFallback")}
                </p>
              )}
              {isLoaded && (
                <FinancialFreshnessNotice periods={analysisFinancialPeriods(data, krOrUs)} source={krOrUs === 'US' ? data.finnhubData?.source : undefined} banner />
              )}

              {verdict && (
                <div className={styles.verdict}>
                  <button
                    type="button"
                    onClick={() => setVerdictOpen(open => !open)}
                    aria-expanded={verdictOpen}
                    className="flex min-h-11 w-full items-center justify-between gap-2 text-left font-semibold"
                  >
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span>{t("undervaluation")}</span>
                      <span className={styles.verdictCount}>{t("metCount", { met: verdict.metCount, total: verdict.checks.length })}</span>
                    </span>
                    <ChevronDown size={15} aria-hidden="true" className={cn("shrink-0 transition-transform", verdictOpen && "rotate-180")} />
                  </button>
                  {verdictOpen && (
                    <ul className={styles.verdictChecks}>
                      {verdict.checks.map(check => (
                        <li key={check.label} className={styles.verdictCheck}>
                          <span className="font-semibold">{check.label === "ncav" ? t("ncavMultiple") : VERDICT_LABELS[check.label]}</span>
                          {check.value === '—' ? (
                            <span className={styles.verdictStatus}>{t("noData")}</span>
                          ) : (
                            <div className={styles.verdictReading}>
                              <span className={styles.verdictValue}>{check.value.endsWith("x") ? t("multiple", { value: check.value.slice(0, -1) }) : check.value}</span>
                              <span className={styles.verdictStatus} data-met={check.ok}>{check.ok ? t("met") : t("unmet")}</span>
                            </div>
                          )}
                          <span className={styles.verdictCriterion}>{t("criteria", { value: t(check.criterion) })}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div ref={detailStart} className={styles.detailContent} key={tickerFromUrl}>
                {isLoaded && !isLoggedIn && (
                  <AnalysisLoginPrompt href={loginHref}>{t("detailLogin")}</AnalysisLoginPrompt>
                )}
                <div className={isDesktop ? styles.analysisColumns : undefined}>
                <AnalysisSection tab="strategy" desktop={isDesktop}>
                  {visitedTabs.includes('strategy') && (isLoaded ? (
                  <ValuationSection
                    data={data}
                    isUs={krOrUs === 'US'}
                    isLoggedIn={isLoggedIn}
                  />
                  ) : financialStatus)}
                </AnalysisSection>

                <AnalysisSection tab="metrics" desktop={isDesktop}>
                  {((isDesktop && isPriceLoaded) || visitedTabs.includes('metrics')) && <>
              <div className="mb-2">
                <StockCard
                  stock={{
                    name: localizedDisplayName,
                    ticker: tickerLabel,
                    isUs: krOrUs === 'US',
                    sector: krOrUs === 'KR' ? data?.kiPrice?.output?.bstp_kor_isnm : undefined,
                    ncavMultiple, roe,
                    per: stockData?.per ?? 0,
                    pbr: stockData?.pbr ?? 0,
                  }}
                  chartConfig={chartConfig}
                  chartNotice={chartNotice}
                />
              </div>

                    {isLoaded ? <div className="space-y-2">
                      <TechnicalSummary bars={technicalBars} currency={currency} />
                      <StockMetrics data={data} isUs={krOrUs === 'US'} />
                    </div> : financialStatus}
                  </>}
                </AnalysisSection>

                <AnalysisSection tab="risk" desktop={isDesktop}>
                  {!isLoaded ? financialStatus : (
                    <>
                      <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-300">{t("riskNotice")}</p>
                      {krOrUs === 'KR' ? <DelistingRisk kiBS={data.kiBS} kiIS={data.kiIS} showHistory={isLoggedIn} />
                        : <UsDelistingRisk finnhubData={data.finnhubData} usDetail={data.usDetail} showHistory={isLoggedIn} />}
                    </>
                  )}
                </AnalysisSection>

                <AnalysisSection tab="financials" desktop={isDesktop}>
                  {((isDesktop && isPriceLoaded) || visitedTabs.includes('financials')) && (!isLoaded ? financialStatus : (
                    <div className={cn(styles.panel, styles.financialPanel, "flex min-w-0 flex-col gap-2")}>
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <p className="text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-300">
                          {krOrUs === 'KR' ? t("krFilings") : t("usFilings")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {([['bars', t('chart')], ['table', t('table')]] as const).map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setFinanceView(mode)}
                              aria-pressed={financeView === mode}
                              className={cn("service-button", styles.segmentButton)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {financeView === 'bars' ? (
                        krOrUs === 'KR'
                          ? <FinancialBars {...buildKrBars(data.kiBS, data.kiIS)} unit="eok" showHistory={isLoggedIn} />
                          : <FinancialBars {...buildUsBars(data.finnhubData?.data ?? [])} unit="usd" showHistory={isLoggedIn} />
                      ) : (
                        <div className="min-w-0 overflow-hidden bg-white dark:bg-surface-dark-card sm:rounded-2xl sm:border border-neutral-200 dark:border-border-subtle-dark">
                          {krOrUs === 'KR'
                            ? <FinancialTables kiBS={data.kiBS} kiIS={data.kiIS} showHistory={isLoggedIn} />
                            : <FinnhubTable data={data.finnhubData.data} source={data.finnhubData.source} showHistory={isLoggedIn} />
                          }
                        </div>
                      )}

                      <FinancialDataEvidence key={`${krOrUs}:${name}`} market={krOrUs} kiBS={data.kiBS} kiIS={data.kiIS} finnhubData={data.finnhubData} />

                      <details className={styles.readingNote}>
                        <summary className="flex items-center justify-between gap-2">{t("period")}<ChevronDown size={16} aria-hidden="true" /></summary>
                        <p>{t("periodBalances")}</p>
                        <p>{t("periodModels")}</p>
                      </details>
                    </div>
                  ))}
                </AnalysisSection>

              </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── 푸터 ── */}
      <footer className={cn(ANALYZE_WIDTH, styles.footer, "py-5 border-t")}>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center max-w-md leading-relaxed">
            {t("disclaimer")}
          </p>
          {krOrUs === 'KR' && <p className="text-sm text-neutral-500">{t.rich("krSource", { source: text => <a href="https://opendart.fss.or.kr/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{text}</a> })}</p>}
          {isAdmin && <Link href="/data-sources" className="text-xs text-neutral-500 underline">{t("sourceTerms")}</Link>}
        </div>
      </footer>
    </div>
    </Tabs.Root>
  );
}

// =========================================================================
// 페이지 내보내기
// =========================================================================
export default function AnalyzePage() {
  const t = useTranslations("analysis");
  return (
    <Suspense fallback={
      <p role="status" className="flex items-center gap-2 px-4 py-6 text-sm text-neutral-600 dark:text-neutral-300">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />{t("opening")}
      </p>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}
