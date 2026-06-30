"use client";

import React, { useState, useMemo } from "react";
import {
  Key,
  Minus,
  Search,
  Info,
  Copy,
  X,
  BarChart3,
  Box,
  ClipboardCheck,
  Wallet,
  TrendingUp,
  FolderOpen,
  FolderPlus,
  Heart,
  Trash2,
  Pencil,
  Power,
  Plus,
  Check,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  CircleCheck,
  CircleSlash,
  CircleDashed,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { UsCapitalStockItem, KrUsCapitalType, StockGroup, LIKES_GROUP_ID, QuantRule } from "@/lib/features/capital/capitalSlice";
import { LikedStockItem } from "@/lib/features/stockLikes/stockLikesSlice";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import validCorpCodeArray from "@/public/data/validCorpCodeArray.json";
import validCorpNameArray from "@/public/data/validCorpNameArray.json";
import { CopyStockButtons, type CopyStock } from "@/components/copyStockButtons";

/** Tailwind 클래스 병합 유틸리티 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// KR 종목코드(6자리) → 종목명 매핑. validCorpCodeArray / validCorpNameArray 는 같은 순서의 병렬 배열.
const KR_CODE_TO_NAME: Record<string, string> = (() => {
  const codes = validCorpCodeArray as string[];
  const names = validCorpNameArray as string[];
  const map: Record<string, string> = {};
  for (let i = 0; i < codes.length; i++) map[codes[i]] = names[i];
  return map;
})();

/** symbol/ticker 에 대응하는 표시용 종목명 결정. 백엔드 name 우선, 없으면 KR 코드맵으로 보강. */
function resolveDisplayName(symbol: string, rawName?: string | null): string | undefined {
  const n = (rawName ?? "").trim();
  if (n && n !== symbol) return n;
  const kr = KR_CODE_TO_NAME[symbol];
  return kr && kr !== symbol ? kr : undefined;
}

/** 선택 상태 키: 섹션별로 독립 선택되도록 (section + symbol) 형태로 보관 */
const PICK_SEP = "::";
const pickKey = (section: string, symbol: string) => `${section}${PICK_SEP}${symbol}`;

type Tone = "active" | "idle" | "excluded" | "off";
interface EffStatus { label: string; tone: Tone; }

/** 종목의 실제 자동매매 상태(최근 스케줄 실행 + 현재 토글 기준) */
function capitalStatus(action: string | undefined | null, groupActive: boolean, countryActive: boolean): EffStatus {
  if (!countryActive) return { label: "자동매매 OFF", tone: "off" };
  if (!groupActive) return { label: "제외", tone: "excluded" };
  if (action === "active") return { label: "매매중", tone: "active" };
  return { label: "대기", tone: "idle" };
}
// 좋아요는 관심목록 전용(자동매매 대상 아님). 매매하려면 '복사'로 실제 그룹에 넣는다.
const WATCH_STATUS: EffStatus = { label: "관심", tone: "off" };

function StatusBadge({ status }: { status?: EffStatus }) {
  if (!status) return <span className="text-neutral-300">-</span>;
  const map: Record<Tone, string> = {
    active: "bg-[#16a34a] text-white",
    idle: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    excluded: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    off: "bg-neutral-200 text-neutral-500 dark:bg-[#35332e] dark:text-neutral-400",
  };
  const Icon = status.tone === "active" ? CircleCheck : status.tone === "excluded" ? CircleSlash : CircleDashed;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", map[status.tone])}>
      <Icon className="w-3 h-3" /> {status.label}
    </span>
  );
}

/** quant_rule 을 사람이 읽는 조건 칩 목록으로 변환 */
function formatConditions(r?: QuantRule): string[] {
  if (!r) return [];
  const out: string[] = [];
  if (r.ncav_ratio != null) out.push(`NCAV ≥ ${r.ncav_ratio}`);
  if (r.active_count != null) out.push(`상위 ${r.active_count}종목만`);
  if (r.max_pbr != null && Number(r.max_pbr) < 100) out.push(`PBR ≤ ${r.max_pbr}`);
  if (Number(r.min_pbr) > 0) out.push(`PBR ≥ ${r.min_pbr}`);
  if (Number(r.min_per) > 0) out.push(`PER ≥ ${r.min_per}`);
  if (Number(r.min_eps) > 0) out.push(`EPS ≥ ${r.min_eps}`);
  if (Number(r.min_bps) > 0) out.push(`BPS ≥ ${r.min_bps}`);
  if (Array.isArray(r.exclude_key_word) && r.exclude_key_word.length) out.push(`제외: ${r.exclude_key_word.join(", ")}`);
  return out;
}

/** 그룹 섹션·찜 섹션이 공통으로 쓰는 정규화된 행 */
interface DisplayRow {
  symbol: string;
  name?: string;           // 표시용 종목명 (있으면 symbol 과 함께 노출)
  per?: number | string | null;
  pbr?: number | string | null;
  bps?: number | null;
  eps?: number | null;
  marketCap?: number | null;
  ncavRatio?: number | string | null;
  token?: number | null;
  movable: boolean;        // 운용 종목(true) vs 찜 종목(읽기 전용, false)
  status?: EffStatus;
  raw: any;                // 상세 모달용
}

interface Props {
  data?: KrUsCapitalType;
  kakaoTotal: any;
  doTokenPlusAll: (val: number) => void;
  doTokenPlusOne: (val: number, sym: string) => void;
  doTokenMinusAll: (val: number) => void;
  doTokenMinusOne: (val: number, sym: string) => void;
  doTokenResetAll?: () => void;
  doTokenResetOne?: (sym: string) => void;
  className?: string;
  session: any;
  // 그룹 관리
  onCreateGroup?: (name: string, tickers?: string[]) => void;
  onRenameGroup?: (groupId: string, name: string) => void;
  onToggleGroupTrading?: (groupId: string, isActive: boolean) => void;
  onDeleteGroup?: (groupId: string) => void;
  onMoveStock?: (ticker: string, groupId: string | null) => void;
  onBulkMove?: (tickers: string[], groupId: string | null) => void;
  onCopyLikes?: (tickers: string[], groupId: string | null) => void;
  onDeleteStock?: (ticker: string) => void;
  onBulkRemove?: (tickers: string[]) => void;
  onSaveGroupQuantRule?: (groupId: string, rule: QuantRule | null) => void;
  onSaveGroupBudget?: (groupId: string, budget: number | null) => void;
  // 좋아요(찜) 그룹
  likedList?: LikedStockItem[];
  onToggleLikesTrading?: (isActive: boolean) => void;
  // 자동매매 컨텍스트
  countryTradingActive?: boolean;
  quantRule?: QuantRule;
  // 지표 보강 (예: US 좋아요 종목은 stock_data_daily 에 없어 KIS price-detail 로 보강)
  metricsOverride?: Record<string, { per?: number | null; pbr?: number | null; bps?: number | null; eps?: number | null; marketCap?: number | null }>;
  // 종목당 월 예산 (토큰 충전 진행 막대 기준값)
  monthlyPerStock?: number;
}

const tokenAmounts = [10000, 100000, 1000000];

function normalizeCapital(row: UsCapitalStockItem, status?: EffStatus): DisplayRow {
  return {
    symbol: row.symbol,
    name: resolveDisplayName(row.symbol, row.name),
    per: row.condition?.per,
    pbr: row.condition?.pbr,
    bps: row.condition?.bps,
    eps: row.condition?.eps,
    marketCap: row.condition?.MarketCapitalization,
    ncavRatio: row.ncavRatio,
    token: row.token,
    movable: true,
    status,
    raw: row,
  };
}

function normalizeLiked(lk: LikedStockItem, status?: EffStatus): DisplayRow {
  return {
    symbol: lk.ticker,
    name: resolveDisplayName(lk.ticker, lk.stock_name),
    per: lk.per,
    pbr: lk.pbr,
    bps: lk.bps,
    eps: lk.eps,
    marketCap: lk.market_cap,
    ncavRatio: lk.ncav_ratio,
    token: null,
    movable: false,
    status,
    raw: {
      symbol: lk.ticker,
      ncavRatio: lk.ncav_ratio != null ? String(lk.ncav_ratio) : undefined,
      condition: {
        AssetsCurrent: lk.current_assets,
        LiabilitiesCurrent: lk.total_liabilities,
        MarketCapitalization: lk.market_cap,
        NetIncome: lk.net_income,
        LastPrice: lk.last_price,
        bps: lk.bps, eps: lk.eps, pbr: lk.pbr, per: lk.per,
      },
    },
  };
}

export default function StockListTable({
  data,
  doTokenPlusAll,
  doTokenPlusOne,
  doTokenMinusAll,
  doTokenMinusOne,
  doTokenResetAll,
  doTokenResetOne,
  className = "",
  session,
  onCreateGroup,
  onRenameGroup,
  onToggleGroupTrading,
  onDeleteGroup,
  onMoveStock,
  onBulkMove,
  onCopyLikes,
  onDeleteStock,
  onBulkRemove,
  onSaveGroupQuantRule,
  onSaveGroupBudget,
  likedList = [],
  onToggleLikesTrading,
  countryTradingActive = false,
  quantRule,
  metricsOverride,
  monthlyPerStock = 0,
}: Props) {
  const stockList = data?.stock_list ?? [];
  const groups: StockGroup[] = data?.groups ?? [];

  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [showLegend, setShowLegend] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<string>("");

  // 관리자 여부 확인 (기존 로직 유지)
  const isMaster = useMemo(() =>
    session?.user?.name === process.env.NEXT_PUBLIC_MASTER,
    [session]);

  // 실제(사용자) 그룹과 좋아요 그룹 분리
  const realGroups = useMemo(() => groups.filter(g => g.id !== LIKES_GROUP_ID), [groups]);
  const likesGroup = useMemo(() => groups.find(g => g.id === LIKES_GROUP_ID), [groups]);
  const likesActive = likesGroup?.is_trading_active ?? false;

  // 종목을 그룹별 버킷으로 분류 + 상태 계산
  // group_id === "__likes__" 인 운용 종목은 '미지정'이 아니라 좋아요 섹션으로 보낸다.
  const { byGroup, unassigned, likesPoolRows } = useMemo(() => {
    const gmap = new Map(realGroups.map(g => [g.id, g]));
    const byGroup = new Map<string, DisplayRow[]>();
    realGroups.forEach(g => byGroup.set(g.id, []));
    const unassigned: DisplayRow[] = [];
    const likesPoolRows: DisplayRow[] = [];
    for (const s of stockList) {
      if (s.group_id === LIKES_GROUP_ID) {
        // 레거시 좋아요(__likes__) 운용 종목 → 좋아요 섹션에서 관리(관심)
        likesPoolRows.push(normalizeCapital(s, WATCH_STATUS));
        continue;
      }
      const g = s.group_id ? gmap.get(s.group_id) : null;
      const groupActive = g ? g.is_trading_active !== false : false;
      const status = capitalStatus(s.action, groupActive, countryTradingActive);
      const row = normalizeCapital(s, status);
      if (s.group_id && gmap.has(s.group_id)) byGroup.get(s.group_id)!.push(row);
      else unassigned.push(row);
    }
    return { byGroup, unassigned, likesPoolRows };
  }, [stockList, realGroups, countryTradingActive, likesActive]);

  // 좋아요 섹션 = 운용 중인 좋아요 종목(토큰/상태) + 아직 운용 풀에 없는 찜(읽기 전용 워치리스트)
  // metricsOverride 로 비어있는 지표(US 등)를 보강한다.
  const likedRows = useMemo(() => {
    const poolSymbols = new Set(likesPoolRows.map(r => r.symbol));
    const applyOverride = (row: DisplayRow): DisplayRow => {
      const o = metricsOverride?.[row.symbol];
      if (!o) return row;
      return {
        ...row,
        per: row.per ?? o.per,
        pbr: row.pbr ?? o.pbr,
        bps: row.bps ?? o.bps,
        eps: row.eps ?? o.eps,
        marketCap: row.marketCap ?? o.marketCap,
      };
    };
    const watchlistRows = (likedList ?? [])
      .filter(lk => !poolSymbols.has(lk.ticker))
      .map(lk => normalizeLiked(lk, WATCH_STATUS));
    return [...likesPoolRows, ...watchlistRows].map(applyOverride);
  }, [likesPoolRows, likedList, likesActive, countryTradingActive, metricsOverride]);

  // 요약 카운트 (좋아요(__likes__) 레거시 항목은 관심목록이라 매매 집계에서 제외)
  const summary = useMemo(() => {
    let active = 0, idle = 0, excluded = 0, total = 0;
    const gmap = new Map(realGroups.map(g => [g.id, g]));
    for (const s of stockList) {
      if (s.group_id === LIKES_GROUP_ID) continue;
      total++;
      const g = s.group_id ? gmap.get(s.group_id) : null;
      const groupActive = g ? g.is_trading_active !== false : false;
      const st = capitalStatus(s.action, groupActive, countryTradingActive);
      if (st.tone === "active") active++;
      else if (st.tone === "excluded") excluded++;
      else if (st.tone === "idle") idle++;
    }
    return { active, idle, excluded, total };
  }, [stockList, realGroups, countryTradingActive]);

  const conditionChips = useMemo(() => formatConditions(quantRule), [quantRule]);

  const closeModal = () => { setIsOpen(false); setSelectedDetail(null); };
  const openDetail = (raw: any) => { setSelectedDetail(raw); setIsOpen(true); };

  const startRename = (g: StockGroup) => { setEditingGroupId(g.id); setEditingName(g.name); };
  const commitRename = () => {
    if (editingGroupId && editingName.trim()) onRenameGroup?.(editingGroupId, editingName.trim());
    setEditingGroupId(null);
    setEditingName("");
  };
  const commitCreate = () => {
    if (newGroupName.trim()) onCreateGroup?.(newGroupName.trim());
    setNewGroupName("");
    setCreating(false);
  };

  const toggleCollapse = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  // 선택은 섹션별로 독립적이다. 같은 종목이 좋아요·그룹에 동시에 나타나도
  // 한 섹션에서 고른 게 다른 섹션까지 선택되지 않도록 키에 섹션을 포함한다.
  const togglePick = (section: string, ticker: string) =>
    setPicked(prev => {
      const next = new Set(prev);
      const k = pickKey(section, ticker);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  const pickMany = (section: string, tickers: string[], select: boolean) =>
    setPicked(prev => {
      const next = new Set(prev);
      tickers.forEach(t => { const k = pickKey(section, t); select ? next.add(k) : next.delete(k); });
      return next;
    });
  const clearPick = () => setPicked(new Set());

  // 선택된 키에서 종목(symbol)만 추출(섹션 간 중복 제거) — 일괄 작업용
  const pickedSymbols = useMemo(
    () => Array.from(new Set(Array.from(picked).map(k => k.split(PICK_SEP)[1]))),
    [picked]
  );

  const doBulkMove = (groupId: string | null) => {
    const tickers = pickedSymbols;
    if (tickers.length === 0) return;
    if (onBulkMove) onBulkMove(tickers, groupId);
    else tickers.forEach(t => onMoveStock?.(t, groupId)); // 폴백
    clearPick();
  };
  const doCopyToGroup = (groupId: string | null) => {
    const tickers = pickedSymbols;
    if (tickers.length === 0) return;
    onCopyLikes?.(tickers, groupId);
    clearPick();
  };
  const doBulkRemove = () => {
    const tickers = pickedSymbols;
    if (tickers.length === 0) return;
    if (window.confirm(`선택한 ${tickers.length}개 종목을 제거할까요?`)) {
      onBulkRemove?.(tickers);
      clearPick();
    }
  };
  const doCreateGroupFromPicked = () => {
    const tickers = pickedSymbols;
    if (tickers.length === 0) return;
    const name = window.prompt(`선택한 ${tickers.length}개 종목으로 만들 그룹 이름을 입력하세요`);
    if (name && name.trim()) {
      onCreateGroup?.(name.trim(), tickers);
      clearPick();
    }
  };

  return (
    <div className={cn("w-full space-y-5", className)}>
      {/* ===== 0. 자동매매 요약 대시보드 ===== */}
      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[#35332e] dark:bg-[#1a1915]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold",
              countryTradingActive ? "bg-[#16a34a] text-white" : "bg-neutral-200 text-neutral-500 dark:bg-[#35332e] dark:text-neutral-400"
            )}>
              <Power className="w-3.5 h-3.5" /> 자동매매 {countryTradingActive ? "ON" : "OFF"}
            </span>
            {countryTradingActive ? (
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                현재 <span className="text-[#16a34a]">{summary.active}종목</span> 매매중
                <span className="ml-1 text-xs font-normal text-neutral-400">/ 운용 {summary.total}종목</span>
              </span>
            ) : (
              <span className="text-sm font-medium text-neutral-500">자동매매가 꺼져 있어 어떤 종목도 매매되지 않습니다.</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="rounded-md bg-[#16a34a]/10 px-2 py-1 font-bold text-[#16a34a]">매매중 {summary.active}</span>
            <span className="rounded-md bg-amber-100 px-2 py-1 font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">대기 {summary.idle}</span>
            <span className="rounded-md bg-red-100 px-2 py-1 font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">제외 {summary.excluded}</span>
          </div>
        </div>

        {/* 적용 조건 */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-neutral-100 pt-3 dark:border-[#35332e]">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">적용 조건</span>
          {conditionChips.length > 0 ? conditionChips.map((c, i) => (
            <span key={i} className="rounded-full bg-[#faf9f7] px-2 py-0.5 text-[11px] font-mono text-neutral-600 dark:bg-[#242320] dark:text-neutral-300">{c}</span>
          )) : (
            <span className="text-[11px] text-neutral-400">조건 정보를 불러오는 중…</span>
          )}
        </div>

        {/* 동작 안내 */}
        <p className="mt-2 flex items-start gap-1 text-[10px] leading-relaxed text-neutral-400">
          <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
          매매 흐름: <b className="font-bold text-neutral-500">자동매매 ON</b> → <b className="font-bold text-neutral-500">그룹 ON</b> → 위 조건 충족 + NCAV 상위 종목이 <b className="font-bold text-[#16a34a]">매매중</b>이 됩니다. <b className="font-bold text-rose-500">좋아요</b>는 관심목록이며, 매매하려면 <b className="font-bold text-[#16a34a]">복사</b>로 그룹에 넣으세요.
        </p>

        {/* 상태 설명 토글 */}
        <button
          onClick={() => setShowLegend(v => !v)}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          {showLegend ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} 종목 상태 설명
        </button>
        {showLegend && (
          <div className="mt-2 grid grid-cols-1 gap-1.5 rounded-lg border border-neutral-100 bg-[#fcfaf7] p-3 sm:grid-cols-2 dark:border-[#35332e] dark:bg-[#242320]">
            {([
              { s: { label: "매매중", tone: "active" as Tone }, d: "현재 자동매매 대상. 마지막 실행에서 활성 종목으로 선정됨." },
              { s: { label: "대기", tone: "idle" as Tone }, d: "운용 목록엔 있으나 이번엔 미선정 (NCAV 상위 N 밖 / 조건 미달 / 다음 실행 대기)." },
              { s: { label: "후보(찜)", tone: "idle" as Tone }, d: "좋아요 종목. 찜 그룹 자동매매 ON이면 다음 실행 때 후보로 합류 (아직 운용 목록 아님)." },
              { s: { label: "제외", tone: "excluded" as Tone }, d: "속한 그룹(또는 찜)의 자동매매가 OFF라 매매에서 제외됨." },
              { s: { label: "자동매매 OFF", tone: "off" as Tone }, d: "국가 자동매매가 꺼져 있어 어떤 종목도 매매되지 않음." },
            ]).map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <StatusBadge status={row.s} />
                <span className="text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">{row.d}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== 1. Global Token Control + 새 그룹 추가 (Master) ===== */}
      {isMaster && (
        <section className="overflow-hidden rounded-xl border border-red-200 bg-red-50/30 p-1 dark:border-red-900/30 dark:bg-red-900/10">
          <div className="flex items-center justify-between px-4 py-3 border-b border-red-100 dark:border-red-900/20">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-bold text-red-900 dark:text-red-400">Global Token Master Control</h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-600 text-white rounded uppercase tracking-wider">
              Master Only
            </span>
          </div>
          <div className="p-4 flex flex-wrap items-center gap-4">
            <span className="text-[10px] font-bold text-red-800/60 dark:text-red-400/60 uppercase">Batch Refill</span>
            <div className="flex flex-wrap gap-2">
              {[50000, 100000, 500000, 1000000].map(amt => (
                <div key={`batch-${amt}`} className="inline-flex rounded-lg shadow-sm border border-red-200 dark:border-red-800 overflow-hidden">
                  <button
                    onClick={() => doTokenPlusAll(amt)}
                    className="bg-white dark:bg-[#242320] hover:bg-red-50 dark:hover:bg-red-950 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors border-r border-red-100 dark:border-red-800"
                  >
                    +{amt / 10000}만
                  </button>
                  <button
                    onClick={() => doTokenMinusAll(amt)}
                    className="bg-white dark:bg-[#242320] hover:bg-red-50 dark:hover:bg-red-950 px-2 py-1.5 text-red-600 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {doTokenResetAll && (
                <button
                  onClick={() => { if (window.confirm("전체 활성 종목의 토큰을 0으로 리셋할까요?")) doTokenResetAll(); }}
                  title="전체 종목 토큰 리셋"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-[#242320] px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 전체 리셋
                </button>
              )}
            </div>
            {/* 새 그룹 추가 */}
            <div className="ml-auto flex items-center gap-2">
              {creating ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitCreate(); if (e.key === "Escape") { setCreating(false); setNewGroupName(""); } }}
                    placeholder="그룹 이름"
                    className="w-28 rounded-md border border-neutral-300 dark:border-[#4a4641] bg-white dark:bg-[#1a1915] px-2 py-1 text-xs"
                  />
                  <button onClick={commitCreate} className="rounded-md bg-[#16a34a] p-1.5 text-white hover:bg-[#15803d]">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setCreating(false); setNewGroupName(""); }} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#35332e]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#16a34a]/40 bg-[#16a34a]/10 px-3 py-1.5 text-xs font-bold text-[#16a34a] hover:bg-[#16a34a]/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> 새 그룹
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== 선택 작업 바 (이동 / 복사) ===== */}
      {isMaster && picked.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-[#16a34a]/40 bg-[#f0fdf4] px-3 py-2.5 shadow-md dark:border-[#16a34a]/40 dark:bg-[#14532d]/30 sm:px-4">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#16a34a]">
            <ArrowRightLeft className="w-3.5 h-3.5" /> {pickedSymbols.length}개 선택
          </span>
          <button onClick={clearPick} className="rounded-md p-1 text-neutral-400 hover:bg-white/60 dark:hover:bg-[#1a1915] sm:order-last sm:ml-auto">
            <X className="w-4 h-4" />
          </button>
          <select
            value={bulkTarget}
            onChange={(e) => setBulkTarget(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-[#16a34a]/40 bg-white px-2 py-1.5 text-xs font-medium dark:bg-[#1a1915] sm:flex-none"
          >
            <option value="">미지정</option>
            {realGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {onCopyLikes && (
            <button
              onClick={() => doCopyToGroup(bulkTarget || null)}
              title="좋아요 종목을 선택한 그룹의 운용 종목으로 복사 (원본 좋아요 유지)"
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#16a34a] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#15803d]"
            >
              <Copy className="w-3.5 h-3.5" /> 복사
            </button>
          )}
          <button
            onClick={() => doBulkMove(bulkTarget || null)}
            title="운용 종목을 선택한 그룹으로 이동"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#16a34a]/40 bg-white px-2.5 py-1.5 text-xs font-bold text-[#16a34a] hover:bg-[#16a34a]/10 dark:bg-[#1a1915]"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> 이동
          </button>
          <button
            onClick={doCreateGroupFromPicked}
            title="선택한 운용 종목으로 새 그룹 생성(이동)"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-bold text-neutral-500 hover:bg-neutral-50 dark:border-[#35332e] dark:bg-[#242320]"
          >
            <FolderPlus className="w-3.5 h-3.5" /> 새 그룹
          </button>
          {onBulkRemove && (
            <button
              onClick={doBulkRemove}
              title="선택한 종목을 운용 목록에서 제거"
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:border-red-900 dark:bg-[#1a1915] dark:hover:bg-red-950"
            >
              <Trash2 className="w-3.5 h-3.5" /> 삭제
            </button>
          )}
        </div>
      )}

      {/* ===== 2. 좋아요(찜) 그룹 섹션 — 예약 그룹 ===== */}
      <GroupSection
        sectionKey={LIKES_GROUP_ID}
        title="좋아요 종목"
        subtitle="관심목록 — 매매하려면 선택 후 '복사'로 그룹에 넣으세요"
        icon={<Heart className="w-4 h-4 text-rose-500" />}
        accent="rose"
        count={likedRows.length}
        rows={likedRows}
        isMaster={isMaster}
        tradingActive={false}
        hideTrading
        emptyText="좋아요한 종목이 없습니다. 검색·분석 페이지에서 ♥ 를 눌러 추가하세요."
        collapsed={collapsed.has(LIKES_GROUP_ID)}
        onToggleCollapse={() => toggleCollapse(LIKES_GROUP_ID)}
        picked={picked}
        onTogglePick={togglePick}
        onPickMany={pickMany}
        doTokenPlusOne={doTokenPlusOne}
        doTokenMinusOne={doTokenMinusOne}
        doTokenResetOne={doTokenResetOne}
        openDetail={openDetail}
        monthlyPerStock={monthlyPerStock}
      />

      {/* ===== 3. 사용자 그룹 섹션들 ===== */}
      {realGroups.map((g) => (
        <GroupSection
          key={g.id}
          sectionKey={g.id}
          title={g.name}
          icon={<FolderOpen className="w-4 h-4 text-[#16a34a]" />}
          accent="green"
          count={(byGroup.get(g.id) ?? []).length}
          rows={byGroup.get(g.id) ?? []}
          isMaster={isMaster}
          tradingActive={g.is_trading_active !== false}
          onToggleTrading={isMaster && onToggleGroupTrading ? () => onToggleGroupTrading(g.id, !(g.is_trading_active !== false)) : undefined}
          conditionChips={g.is_trading_active !== false ? formatConditions(g.quant_rule ?? quantRule).slice(0, 2) : []}
          editing={editingGroupId === g.id}
          editingName={editingName}
          onEditNameChange={setEditingName}
          onStartRename={isMaster && onRenameGroup ? () => startRename(g) : undefined}
          onCommitRename={commitRename}
          onDelete={isMaster && onDeleteGroup ? () => {
            if (window.confirm(`'${g.name}' 그룹을 삭제할까요? 소속 종목은 '미지정'으로 이동합니다.`)) onDeleteGroup(g.id);
          } : undefined}
          emptyText="이 그룹에 종목이 없습니다."
          collapsed={collapsed.has(g.id)}
          onToggleCollapse={() => toggleCollapse(g.id)}
          picked={picked}
          onTogglePick={togglePick}
          onPickMany={pickMany}
          doTokenPlusOne={doTokenPlusOne}
          doTokenMinusOne={doTokenMinusOne}
          doTokenResetOne={doTokenResetOne}
          openDetail={openDetail}
          monthlyPerStock={monthlyPerStock}
          groupQuantRule={g.quant_rule}
          groupBudget={g.budget_krw}
          onSaveGroupQuantRule={isMaster && onSaveGroupQuantRule ? (rule) => onSaveGroupQuantRule(g.id, rule) : undefined}
          onSaveGroupBudget={isMaster && onSaveGroupBudget ? (budget) => onSaveGroupBudget(g.id, budget) : undefined}
        />
      ))}

      {/* ===== 4. 미지정 섹션 ===== */}
      <GroupSection
        sectionKey="__unassigned__"
        title="미지정"
        subtitle="그룹 미지정 종목 — 자동매매 OFF. 그룹에 추가하면 ON/OFF 설정 가능"
        icon={<FolderOpen className="w-4 h-4 text-neutral-400" />}
        accent="neutral"
        count={unassigned.length}
        rows={unassigned}
        isMaster={isMaster}
        tradingActive={false}
        emptyText="미지정 종목이 없습니다."
        collapsed={collapsed.has("__unassigned__")}
        onToggleCollapse={() => toggleCollapse("__unassigned__")}
        picked={picked}
        onTogglePick={togglePick}
        onPickMany={pickMany}
        doTokenPlusOne={doTokenPlusOne}
        doTokenMinusOne={doTokenMinusOne}
        doTokenResetOne={doTokenResetOne}
        openDetail={openDetail}
        monthlyPerStock={monthlyPerStock}
        onDeleteStock={onDeleteStock}
      />

      {/* 상세 분석 모달 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={closeModal} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#242320] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b border-neutral-100 p-4 dark:border-[#35332e]">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#16a34a] p-1.5 text-white">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Strategy Analysis: <span className="text-[#16a34a]">{selectedDetail?.symbol}</span>
                </h2>
              </div>
              <button onClick={closeModal} className="rounded-full p-2 text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#35332e] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatItem label="유동자산" value={`${(selectedDetail?.condition?.AssetsCurrent || 0).toLocaleString()}억`} icon={<Box className="w-3.5 h-3.5" />} />
                <StatItem label="유동부채" value={`${(selectedDetail?.condition?.LiabilitiesCurrent || 0).toLocaleString()}억`} icon={<ClipboardCheck className="w-3.5 h-3.5" />} />
                <StatItem label="당기순이익" value={`${(selectedDetail?.condition?.NetIncome || 0).toLocaleString()}억`} icon={<Wallet className="w-3.5 h-3.5" />} />
                <StatItem label="현재가" value={`₩${Number(selectedDetail?.condition?.LastPrice || 0).toLocaleString()}`} icon={<TrendingUp className="w-3.5 h-3.5" />} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                  <Info className="w-3 h-3" />
                  <span>Technical Metadata</span>
                </div>
                <div className="relative group">
                  <pre className="max-h-[300px] overflow-auto rounded-xl border border-neutral-200 bg-[#fcfaf7] p-4 font-mono text-[11px] leading-relaxed dark:border-[#35332e] dark:bg-[#1a1915] dark:text-neutral-400">
                    {JSON.stringify(selectedDetail, null, 2)}
                  </pre>
                  <button onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedDetail))} className="absolute right-3 top-3 rounded-md bg-white p-2 shadow-sm border border-neutral-200 opacity-0 group-hover:opacity-100 hover:bg-[#f0fdf4] transition-all dark:bg-[#35332e] dark:border-[#4a4641]">
                    <Copy className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-neutral-100 bg-neutral-50/50 p-4 dark:border-[#35332e] dark:bg-[#242320]/50">
              <button onClick={closeModal} className="rounded-lg bg-[#16a34a] px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#16a34a]/20 hover:bg-[#15803d] active:scale-95 transition-all">
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 그룹 섹션
// =========================================================================
interface GroupSectionProps {
  sectionKey: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: "rose" | "green" | "neutral";
  count: number;
  rows: DisplayRow[];
  isMaster: boolean;
  tradingActive: boolean;
  onToggleTrading?: () => void;
  hideTrading?: boolean;
  conditionChips?: string[];
  editing?: boolean;
  editingName?: string;
  onEditNameChange?: (v: string) => void;
  onStartRename?: () => void;
  onCommitRename?: () => void;
  onDelete?: () => void;
  emptyText: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  picked: Set<string>;
  onTogglePick: (section: string, ticker: string) => void;
  onPickMany?: (section: string, tickers: string[], select: boolean) => void;
  doTokenPlusOne: (val: number, sym: string) => void;
  doTokenMinusOne: (val: number, sym: string) => void;
  doTokenResetOne?: (sym: string) => void;
  openDetail: (raw: any) => void;
  monthlyPerStock?: number;
  onDeleteStock?: (ticker: string) => void;
  groupQuantRule?: QuantRule;
  groupBudget?: number;
  onSaveGroupQuantRule?: (rule: QuantRule | null) => void;
  onSaveGroupBudget?: (budget: number | null) => void;
}

function GroupSection({
  sectionKey, title, subtitle, icon, accent, count, rows, isMaster, tradingActive, onToggleTrading, hideTrading,
  conditionChips, editing, editingName, onEditNameChange, onStartRename, onCommitRename, onDelete,
  emptyText, collapsed, onToggleCollapse, picked, onTogglePick, onPickMany,
  doTokenPlusOne, doTokenMinusOne, doTokenResetOne, openDetail, monthlyPerStock = 0, onDeleteStock,
  groupQuantRule, groupBudget, onSaveGroupQuantRule, onSaveGroupBudget,
}: GroupSectionProps) {
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [draftActiveCount, setDraftActiveCount] = useState<string>("");
  const [draftNcavRatio, setDraftNcavRatio] = useState<string>("");
  const [draftBudget, setDraftBudget] = useState<string>("");
  const showRefill = isMaster && rows.some(r => r.movable);
  const showCheck = isMaster && rows.length > 0; // 모든 행 선택 가능(좋아요는 복사용)
  const selectableTickers = useMemo(() => rows.map(r => r.symbol), [rows]);
  // 복사용 행: 종목명/티커 + 지표(ROE는 EPS/BPS로 계산)
  const copyRows = useMemo<CopyStock[]>(() => rows.map(r => ({
    name: r.name || r.symbol,
    ticker: r.symbol,
    ncav: r.ncavRatio,
    pbr: r.pbr,
    per: r.per,
    roe: Number(r.bps) > 0 ? (Number(r.eps) / Number(r.bps)) * 100 : null,
  })), [rows]);
  // 그룹 예산(토큰) 합계 — 그룹 단위 운용 현황을 헤더에 표시
  const tokenTotal = useMemo(() => rows.reduce((s, r) => s + (r.movable ? (Number(r.token) || 0) : 0), 0), [rows]);
  // 선택 여부는 이 섹션 키 기준으로만 판단(다른 섹션의 동일 종목과 분리)
  const isPicked = (sym: string) => picked.has(pickKey(sectionKey, sym));
  const allChecked = selectableTickers.length > 0 && selectableTickers.every(isPicked);
  const someChecked = selectableTickers.some(isPicked);
  const baseCols = 6; // 종목/상태/PER·PBR/BPS·EPS/시총/NCAV
  const colSpan = baseCols + 1 /*token*/ + (showCheck ? 1 : 0) + (showRefill ? 1 : 0) + (onDeleteStock ? 1 : 0);

  const accentBorder = accent === "rose" ? "border-rose-200 dark:border-rose-900/30"
    : accent === "green" ? "border-[#16a34a]/20 dark:border-[#16a34a]/20"
    : "border-neutral-200 dark:border-[#35332e]";

  return (
    <section className={cn("overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-[#1a1915]", accentBorder)}>
      {/* 헤더 */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-neutral-100 dark:border-[#35332e] bg-neutral-50/60 dark:bg-[#242320]/40">
        <button onClick={onToggleCollapse} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" title={collapsed ? "펼치기" : "접기"}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          {editing ? (
            <input
              autoFocus
              value={editingName}
              onChange={(e) => onEditNameChange?.(e.target.value)}
              onBlur={onCommitRename}
              onKeyDown={(e) => { if (e.key === "Enter") onCommitRename?.(); }}
              className="rounded-md border border-neutral-300 dark:border-[#4a4641] bg-white dark:bg-[#1a1915] px-2 py-0.5 text-sm font-bold"
            />
          ) : (
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{title}</h3>
          )}
          {onStartRename && !editing && (
            <button onClick={onStartRename} className="text-neutral-300 hover:text-neutral-600 dark:hover:text-neutral-200">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-neutral-100 text-neutral-500 dark:bg-[#35332e] dark:text-neutral-400 rounded-full">
            {count}종목
          </span>
          {tokenTotal > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#f0fdf4] text-[#16a34a] dark:bg-[#14532d]/30 rounded-full" title="이 그룹 예산(토큰) 합계">
              예산 ₩{Math.round(tokenTotal).toLocaleString("ko-KR")}
            </span>
          )}
          {/* 그룹 전체선택 (데스크탑·모바일 공통) */}
          {showCheck && !collapsed && (
            <label className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
                onChange={() => onPickMany?.(sectionKey, selectableTickers, !allChecked)}
                className="h-3.5 w-3.5 rounded border-neutral-300 text-[#16a34a] focus:ring-[#16a34a]"
              />
              전체
            </label>
          )}
          {subtitle && <span className="hidden sm:inline text-[11px] text-neutral-400">{subtitle}</span>}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* 종목 목록 복사 (종목명만 / 상세) */}
          <CopyStockButtons rows={copyRows} label={title} />
          {/* 적용 조건 칩 (그룹 ON 일 때) */}
          {conditionChips && conditionChips.length > 0 && (
            <div className="hidden md:flex items-center gap-1">
              {conditionChips.map((c, i) => (
                <span key={i} className="rounded-full bg-[#16a34a]/10 px-2 py-0.5 text-[10px] font-mono text-[#16a34a]">{c}</span>
              ))}
            </div>
          )}
          {/* 그룹별 트레이딩 조건 편집 버튼 */}
          {onSaveGroupQuantRule && tradingActive && (
            <button
              onClick={() => {
                setDraftActiveCount(String(groupQuantRule?.active_count ?? ""));
                setDraftNcavRatio(String(groupQuantRule?.ncav_ratio ?? ""));
                setDraftBudget(groupBudget != null ? String(groupBudget) : "");
                setShowRuleEditor(v => !v);
              }}
              title="이 그룹의 트레이딩 조건 설정"
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                showRuleEditor
                  ? "bg-[#16a34a]/10 text-[#16a34a]"
                  : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-[#35332e] dark:hover:text-neutral-200"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
          {/* 자동매매 토글 (좋아요 섹션은 hideTrading 으로 숨기고 '관심목록' 표시) */}
          {hideTrading ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-500 dark:bg-rose-900/20">
              <Heart className="w-3.5 h-3.5" /> 관심목록
            </span>
          ) : onToggleTrading ? (
            <button
              onClick={onToggleTrading}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                tradingActive
                  ? "bg-[#16a34a] text-white hover:bg-[#15803d]"
                  : "bg-neutral-200 text-neutral-500 hover:bg-neutral-300 dark:bg-[#35332e] dark:text-neutral-400"
              )}
            >
              <Power className="w-3.5 h-3.5" />
              자동매매 {tradingActive ? "ON" : "OFF"}
            </button>
          ) : (
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold",
              tradingActive ? "bg-[#16a34a]/10 text-[#16a34a]" : "bg-neutral-100 text-neutral-400 dark:bg-[#35332e]"
            )}>
              <Power className="w-3.5 h-3.5" />
              자동매매 {tradingActive ? "ON" : "OFF"}
            </span>
          )}
          {/* 삭제 */}
          {onDelete && (
            <button onClick={onDelete} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 그룹별 트레이딩 조건 인라인 편집 패널 */}
      {showRuleEditor && onSaveGroupQuantRule && (
        <div className="border-b border-neutral-100 dark:border-[#35332e] bg-[#f8fdf9] dark:bg-[#1a2a1a]/50 px-4 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <span className="text-[11px] font-bold text-[#16a34a] uppercase tracking-wider shrink-0">그룹 조건 설정</span>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-neutral-500 shrink-0">활성 종목 수</label>
              <input
                type="number"
                min={1}
                max={200}
                step={1}
                value={draftActiveCount}
                onChange={e => setDraftActiveCount(e.target.value)}
                placeholder="계좌 기본값"
                className="w-20 rounded border border-neutral-300 dark:border-[#4a4641] bg-white dark:bg-[#1a1915] px-2 py-1 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-neutral-500 shrink-0">NCAV 비율</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={draftNcavRatio}
                onChange={e => setDraftNcavRatio(e.target.value)}
                placeholder="계좌 기본값"
                className="w-20 rounded border border-neutral-300 dark:border-[#4a4641] bg-white dark:bg-[#1a1915] px-2 py-1 text-xs"
              />
            </div>
            {onSaveGroupBudget && (
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-neutral-500 shrink-0">월 예산(원)</label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={draftBudget}
                  onChange={e => setDraftBudget(e.target.value)}
                  placeholder="계좌예산 분배"
                  className="w-28 rounded border border-neutral-300 dark:border-[#4a4641] bg-white dark:bg-[#1a1915] px-2 py-1 text-xs"
                />
              </div>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              {(groupQuantRule || groupBudget != null) && (
                <button
                  onClick={() => { onSaveGroupQuantRule(null); onSaveGroupBudget?.(null); setShowRuleEditor(false); }}
                  className="rounded px-2.5 py-1 text-xs text-neutral-500 hover:text-red-600 border border-neutral-200 dark:border-[#4a4641]"
                >
                  초기화
                </button>
              )}
              <button
                onClick={() => setShowRuleEditor(false)}
                className="rounded px-2.5 py-1 text-xs text-neutral-500 border border-neutral-200 dark:border-[#4a4641]"
              >
                취소
              </button>
              <button
                onClick={() => {
                  const rule: QuantRule = {};
                  const ac = parseInt(draftActiveCount, 10);
                  if (!isNaN(ac) && ac > 0) rule.active_count = ac;
                  const nr = parseFloat(draftNcavRatio);
                  if (!isNaN(nr)) rule.ncav_ratio = nr;
                  onSaveGroupQuantRule(Object.keys(rule).length > 0 ? rule : null);
                  if (onSaveGroupBudget) {
                    const b = parseInt(draftBudget, 10);
                    onSaveGroupBudget(!isNaN(b) && b > 0 ? b : null);
                  }
                  setShowRuleEditor(false);
                }}
                className="rounded px-2.5 py-1 text-xs font-bold bg-[#16a34a] text-white hover:bg-[#15803d]"
              >
                저장
              </button>
            </div>
          </div>
          {groupQuantRule && (
            <p className="mt-1.5 text-[10px] text-neutral-400">
              현재 그룹 조건: {formatConditions(groupQuantRule).join(" · ")}
            </p>
          )}
        </div>
      )}

      {/* 본문 — 데스크탑: 테이블 / 모바일: 카드 */}
      {!collapsed && (
        <>
        <div className="hidden md:block relative overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead className="bg-neutral-50/80 text-neutral-500 dark:bg-[#242320]/50 dark:text-neutral-400">
              <tr>
                {showCheck && (
                  <th className="px-3 py-2.5 w-8">
                    <input
                      type="checkbox"
                      aria-label="이 그룹 전체 선택"
                      title="이 그룹 전체 선택"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
                      onChange={() => onPickMany?.(sectionKey, selectableTickers, !allChecked)}
                      className="h-4 w-4 rounded border-neutral-300 text-[#16a34a] focus:ring-[#16a34a]"
                    />
                  </th>
                )}
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">종목</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-center">상태</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-center">PER / PBR</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">BPS / EPS</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">시가총액</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-center">NCAV 비율</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-right">Token</th>
                {showRefill && <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-right">Refill</th>}
                {onDeleteStock && <th className="px-4 py-2.5 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-[#35332e]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <Search className="w-8 h-8" />
                      <p className="text-xs">{emptyText}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={`${sectionKey}-${row.symbol}-${idx}`} className={cn(
                    "group transition-colors",
                    isPicked(row.symbol) ? "bg-[#f0fdf4] dark:bg-[#14532d]/20" : "hover:bg-[#f0fdf4]/30 dark:hover:bg-[#14532d]/10"
                  )}>
                    {showCheck && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isPicked(row.symbol)}
                          onChange={() => onTogglePick(sectionKey, row.symbol)}
                          className="h-4 w-4 rounded border-neutral-300 text-[#16a34a] focus:ring-[#16a34a]"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(row.raw)} className="flex items-center gap-2 group/btn min-w-0">
                        <div className="shrink-0 p-1.5 rounded-md bg-[#faf9f7] dark:bg-[#35332e] transition-all">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <span className="flex min-w-0 flex-col items-start leading-tight">
                          {row.name ? (
                            <>
                              <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100 group-hover/btn:text-[#16a34a] transition-colors tracking-tight truncate max-w-[180px]">
                                {row.name}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono tracking-wider">{row.symbol}</span>
                            </>
                          ) : (
                            <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100 group-hover/btn:text-[#16a34a] transition-colors tracking-tight">
                              {row.symbol}
                            </span>
                          )}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center font-mono">
                        <span className="text-neutral-700 dark:text-neutral-300">{row.per ?? "-"}</span>
                        <span className="text-[10px] text-neutral-400">{row.pbr ?? "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono leading-tight">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-700 dark:text-neutral-300">B: {row.bps?.toLocaleString() ?? "-"}</span>
                        <span className="text-[10px] text-neutral-400">E: {row.eps?.toLocaleString() ?? "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-600 dark:text-neutral-400">
                      ₩{(row.marketCap || 0).toLocaleString()}억
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono transition-colors",
                        Number(row.ncavRatio) > 1
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-[#faf9f7] text-neutral-500 dark:bg-[#35332e] dark:text-neutral-500"
                      )}>
                        {row.ncavRatio ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-[#16a34a] dark:text-[#16a34a]">
                      {row.movable ? (
                        <div className="flex flex-col items-end gap-1">
                          <span>{row.token?.toLocaleString() ?? 0}</span>
                          {monthlyPerStock > 0 && (
                            <div className="w-16 h-1 rounded-full bg-neutral-100 dark:bg-[#35332e] overflow-hidden" title={`종목당 월 예산 대비 ${Math.round(Math.min(1, (Number(row.token) || 0) / monthlyPerStock) * 100)}%`}>
                              <div className="h-full bg-[#16a34a] rounded-full" style={{ width: `${Math.min(100, ((Number(row.token) || 0) / monthlyPerStock) * 100)}%` }} />
                            </div>
                          )}
                        </div>
                      ) : "-"}
                    </td>
                    {showRefill && (
                      <td className="px-4 py-3">
                        {row.movable ? (
                          <div className="flex justify-end gap-1.5 flex-wrap">
                            {tokenAmounts.map(amt => (
                              <div key={`indiv-${amt}`} className="flex items-center rounded-md border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] overflow-hidden shadow-xs">
                                <button onClick={() => doTokenPlusOne(amt, row.symbol)} className="px-2 py-1 hover:bg-[#f5f1eb] dark:hover:bg-[#35332e] text-[10px] font-bold border-r border-neutral-100 dark:border-[#35332e]">
                                  {amt / 10000}만
                                </button>
                                <button onClick={() => doTokenMinusOne(amt, row.symbol)} className="px-1.5 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                                  <Minus className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            {doTokenResetOne && Number(row.token) > 0 && (
                              <button onClick={() => doTokenResetOne(row.symbol)} title="토큰 0으로 리셋" className="flex items-center rounded-md border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] px-1.5 py-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="block text-right text-neutral-300">-</span>
                        )}
                      </td>
                    )}
                    {onDeleteStock && (
                      <td className="px-2 py-3 text-right">
                        <button
                          onClick={() => { if (window.confirm(`'${row.name || row.symbol}' 종목을 제거할까요?`)) onDeleteStock(row.symbol); }}
                          title="종목 제거"
                          className="rounded-md p-1 text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 뷰 */}
        <div className="md:hidden divide-y divide-neutral-100 dark:divide-[#35332e]">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 opacity-40">
              <Search className="w-8 h-8" />
              <p className="text-xs">{emptyText}</p>
            </div>
          ) : (
            rows.map((row, idx) => (
              <div
                key={`m-${sectionKey}-${row.symbol}-${idx}`}
                className={cn("p-3", isPicked(row.symbol) && "bg-[#f0fdf4] dark:bg-[#14532d]/20")}
              >
                {/* 상단: 체크 + 종목 + 상태 */}
                <div className="flex items-center gap-2">
                  {showCheck && (
                    <input
                      type="checkbox"
                      checked={isPicked(row.symbol)}
                      onChange={() => onTogglePick(sectionKey, row.symbol)}
                      className="h-5 w-5 shrink-0 rounded border-neutral-300 text-[#16a34a] focus:ring-[#16a34a]"
                    />
                  )}
                  <button onClick={() => openDetail(row.raw)} className="flex min-w-0 items-center gap-1.5">
                    <div className="shrink-0 rounded-md bg-[#faf9f7] p-1.5 dark:bg-[#35332e]">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    {row.name ? (
                      <span className="flex min-w-0 flex-col items-start leading-tight">
                        <span className="truncate max-w-[160px] text-sm font-bold text-neutral-900 dark:text-neutral-100">{row.name}</span>
                        <span className="text-[10px] text-neutral-400 font-mono tracking-wider">{row.symbol}</span>
                      </span>
                    ) : (
                      <span className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{row.symbol}</span>
                    )}
                  </button>
                  <div className="ml-auto shrink-0 flex items-center gap-1">
                    <StatusBadge status={row.status} />
                    {onDeleteStock && (
                      <button
                        onClick={() => { if (window.confirm(`'${row.name || row.symbol}' 종목을 제거할까요?`)) onDeleteStock(row.symbol); }}
                        title="종목 제거"
                        className="rounded-md p-1 text-neutral-300 active:text-red-500 active:bg-red-50 dark:active:bg-red-950 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 지표 4열 */}
                <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                  <MiniStat label="PER/PBR" value={`${row.per ?? "-"} / ${row.pbr ?? "-"}`} />
                  <MiniStat label="BPS/EPS" value={`${row.bps?.toLocaleString() ?? "-"} / ${row.eps?.toLocaleString() ?? "-"}`} />
                  <MiniStat label="시총(억)" value={(row.marketCap || 0).toLocaleString()} />
                  <MiniStat label="NCAV" value={row.ncavRatio ?? "-"} highlight={Number(row.ncavRatio) > 1} />
                </div>

                {/* 예산 + Refill (운용 종목만) */}
                {row.movable && (
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                      <span>예산 <b className="font-mono font-black text-[#16a34a]">{row.token?.toLocaleString() ?? 0}</b></span>
                      {monthlyPerStock > 0 && (
                        <span className="w-14 h-1 rounded-full bg-neutral-100 dark:bg-[#35332e] overflow-hidden inline-block" title={`종목당 월 예산 대비 ${Math.round(Math.min(1, (Number(row.token) || 0) / monthlyPerStock) * 100)}%`}>
                          <span className="block h-full bg-[#16a34a] rounded-full" style={{ width: `${Math.min(100, ((Number(row.token) || 0) / monthlyPerStock) * 100)}%` }} />
                        </span>
                      )}
                    </span>
                    {showRefill && (
                      <div className="flex flex-wrap justify-end gap-1">
                        {tokenAmounts.map(amt => (
                          <div key={`m-indiv-${amt}`} className="flex items-center overflow-hidden rounded-md border border-neutral-200 dark:border-[#35332e]">
                            <button onClick={() => doTokenPlusOne(amt, row.symbol)} className="px-2.5 py-1.5 text-[11px] font-bold text-[#16a34a] active:bg-[#f0fdf4] dark:active:bg-[#14532d]/30">
                              +{amt / 10000}만
                            </button>
                            <button onClick={() => doTokenMinusOne(amt, row.symbol)} className="border-l border-neutral-200 px-2 py-1.5 text-red-500 active:bg-red-50 dark:border-[#35332e] dark:active:bg-red-950">
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {doTokenResetOne && Number(row.token) > 0 && (
                          <button onClick={() => doTokenResetOne(row.symbol)} title="리셋" className="flex items-center rounded-md border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] px-2 py-1.5 text-neutral-400 active:text-red-500 active:bg-red-50 dark:active:bg-red-950">
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        </>
      )}
    </section>
  );
}

/** 모바일 카드용 지표 칩 */
function MiniStat({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-[#faf9f7] px-1.5 py-1 dark:bg-[#242320]">
      <div className="text-[8px] font-black uppercase tracking-tight text-neutral-400">{label}</div>
      <div className={cn("truncate font-mono text-[11px] font-bold", highlight ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300")}>
        {value}
      </div>
    </div>
  );
}

/** 상세 페이지용 스탯 컴포넌트 */
function StatItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#fcfaf7] border border-neutral-100 dark:bg-[#242320] dark:border-[#35332e]">
      <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
      </div>
      <p className="text-base font-mono font-black text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  );
}
