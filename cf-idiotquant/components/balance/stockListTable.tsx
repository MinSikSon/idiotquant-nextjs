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
  Heart,
  Trash2,
  Pencil,
  Power,
  Plus,
  Check,
} from "lucide-react";
import { UsCapitalStockItem, KrUsCapitalType, StockGroup, LIKES_GROUP_ID } from "@/lib/features/capital/capitalSlice";
import { LikedStockItem } from "@/lib/features/stockLikes/stockLikesSlice";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind 클래스 병합 유틸리티 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 그룹 섹션·찜 섹션이 공통으로 쓰는 정규화된 행 */
interface DisplayRow {
  symbol: string;
  per?: number | string | null;
  pbr?: number | string | null;
  bps?: number | null;
  eps?: number | null;
  marketCap?: number | null;
  ncavRatio?: number | string | null;
  token?: number | null;
  movable: boolean;        // 운용 종목(true) vs 찜 종목(읽기 전용, false)
  raw: any;                // 상세 모달용
}

interface Props {
  data?: KrUsCapitalType;
  kakaoTotal: any;
  doTokenPlusAll: (val: number) => void;
  doTokenPlusOne: (val: number, sym: string) => void;
  doTokenMinusAll: (val: number) => void;
  doTokenMinusOne: (val: number, sym: string) => void;
  className?: string;
  session: any;
  // 그룹 관리
  onCreateGroup?: (name: string) => void;
  onRenameGroup?: (groupId: string, name: string) => void;
  onToggleGroupTrading?: (groupId: string, isActive: boolean) => void;
  onDeleteGroup?: (groupId: string) => void;
  onMoveStock?: (ticker: string, groupId: string | null) => void;
  // 좋아요(찜) 그룹
  likedList?: LikedStockItem[];
  onToggleLikesTrading?: (isActive: boolean) => void;
}

const tokenAmounts = [10000, 100000, 1000000];

function normalizeCapital(row: UsCapitalStockItem): DisplayRow {
  return {
    symbol: row.symbol,
    per: row.condition?.per,
    pbr: row.condition?.pbr,
    bps: row.condition?.bps,
    eps: row.condition?.eps,
    marketCap: row.condition?.MarketCapitalization,
    ncavRatio: row.ncavRatio,
    token: row.token,
    movable: true,
    raw: row,
  };
}

function normalizeLiked(lk: LikedStockItem): DisplayRow {
  return {
    symbol: lk.ticker,
    per: lk.per,
    pbr: lk.pbr,
    bps: lk.bps,
    eps: lk.eps,
    marketCap: lk.market_cap,
    ncavRatio: lk.ncav_ratio,
    token: null,
    movable: false,
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
  className = "",
  session,
  onCreateGroup,
  onRenameGroup,
  onToggleGroupTrading,
  onDeleteGroup,
  onMoveStock,
  likedList = [],
  onToggleLikesTrading,
}: Props) {
  const stockList = data?.stock_list ?? [];
  const groups: StockGroup[] = data?.groups ?? [];

  const [selected, setSelected] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // 관리자 여부 확인 (기존 로직 유지)
  const isMaster = useMemo(() =>
    session?.user?.name === process.env.NEXT_PUBLIC_MASTER,
    [session]);

  // 실제(사용자) 그룹과 좋아요 그룹 분리
  const realGroups = useMemo(() => groups.filter(g => g.id !== LIKES_GROUP_ID), [groups]);
  const likesGroup = useMemo(() => groups.find(g => g.id === LIKES_GROUP_ID), [groups]);
  const likesActive = likesGroup?.is_trading_active ?? false;

  // 종목을 그룹별 버킷으로 분류
  const { byGroup, unassigned } = useMemo(() => {
    const groupIds = new Set(realGroups.map(g => g.id));
    const byGroup = new Map<string, DisplayRow[]>();
    realGroups.forEach(g => byGroup.set(g.id, []));
    const unassigned: DisplayRow[] = [];
    for (const s of stockList) {
      const row = normalizeCapital(s);
      if (s.group_id && groupIds.has(s.group_id)) byGroup.get(s.group_id)!.push(row);
      else unassigned.push(row);
    }
    return { byGroup, unassigned };
  }, [stockList, realGroups]);

  const likedRows = useMemo(() => (likedList ?? []).map(normalizeLiked), [likedList]);

  const closeModal = () => { setIsOpen(false); setSelected(null); };
  const openDetail = (raw: any) => { setSelected(raw); setIsOpen(true); };

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

  const colCount = 6 + (isMaster ? 1 : 0) + (isMaster ? 1 : 0); // 종목/PER·PBR/BPS·EPS/시총/NCAV/Token + (Refill) + (그룹)

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* 1. Global Token Control + 새 그룹 추가 (Master) */}
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

      {/* 2. 좋아요(찜) 그룹 섹션 — 예약 그룹 */}
      <GroupSection
        title="좋아요 종목"
        icon={<Heart className="w-4 h-4 text-rose-500" />}
        accent="rose"
        count={likedRows.length}
        rows={likedRows}
        isMaster={isMaster}
        tradingActive={likesActive}
        onToggleTrading={isMaster && onToggleLikesTrading ? () => onToggleLikesTrading(!likesActive) : undefined}
        emptyText="좋아요한 종목이 없습니다. 검색·분석 페이지에서 ♥ 를 눌러 추가하세요."
        realGroups={realGroups}
        onMoveStock={onMoveStock}
        doTokenPlusOne={doTokenPlusOne}
        doTokenMinusOne={doTokenMinusOne}
        openDetail={openDetail}
      />

      {/* 3. 사용자 그룹 섹션들 */}
      {realGroups.map((g) => (
        <GroupSection
          key={g.id}
          title={g.name}
          icon={<FolderOpen className="w-4 h-4 text-[#16a34a]" />}
          accent="green"
          count={(byGroup.get(g.id) ?? []).length}
          rows={byGroup.get(g.id) ?? []}
          isMaster={isMaster}
          tradingActive={g.is_trading_active !== false}
          onToggleTrading={isMaster && onToggleGroupTrading ? () => onToggleGroupTrading(g.id, !(g.is_trading_active !== false)) : undefined}
          editing={editingGroupId === g.id}
          editingName={editingName}
          onEditNameChange={setEditingName}
          onStartRename={isMaster && onRenameGroup ? () => startRename(g) : undefined}
          onCommitRename={commitRename}
          onDelete={isMaster && onDeleteGroup ? () => {
            if (window.confirm(`'${g.name}' 그룹을 삭제할까요? 소속 종목은 '미지정'으로 이동합니다.`)) onDeleteGroup(g.id);
          } : undefined}
          emptyText="이 그룹에 종목이 없습니다."
          realGroups={realGroups}
          currentGroupId={g.id}
          onMoveStock={onMoveStock}
          doTokenPlusOne={doTokenPlusOne}
          doTokenMinusOne={doTokenMinusOne}
          openDetail={openDetail}
        />
      ))}

      {/* 4. 미지정 섹션 */}
      <GroupSection
        title="미지정"
        icon={<FolderOpen className="w-4 h-4 text-neutral-400" />}
        accent="neutral"
        count={unassigned.length}
        rows={unassigned}
        isMaster={isMaster}
        tradingActive={true}
        emptyText="미지정 종목이 없습니다."
        realGroups={realGroups}
        currentGroupId={null}
        onMoveStock={onMoveStock}
        doTokenPlusOne={doTokenPlusOne}
        doTokenMinusOne={doTokenMinusOne}
        openDetail={openDetail}
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
                  Strategy Analysis: <span className="text-[#16a34a]">{selected?.symbol}</span>
                </h2>
              </div>
              <button onClick={closeModal} className="rounded-full p-2 text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#35332e] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatItem label="유동자산" value={`${(selected?.condition?.AssetsCurrent || 0).toLocaleString()}억`} icon={<Box className="w-3.5 h-3.5" />} />
                <StatItem label="유동부채" value={`${(selected?.condition?.LiabilitiesCurrent || 0).toLocaleString()}억`} icon={<ClipboardCheck className="w-3.5 h-3.5" />} />
                <StatItem label="당기순이익" value={`${(selected?.condition?.NetIncome || 0).toLocaleString()}억`} icon={<Wallet className="w-3.5 h-3.5" />} />
                <StatItem label="현재가" value={`₩${Number(selected?.condition?.LastPrice || 0).toLocaleString()}`} icon={<TrendingUp className="w-3.5 h-3.5" />} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                  <Info className="w-3 h-3" />
                  <span>Technical Metadata</span>
                </div>
                <div className="relative group">
                  <pre className="max-h-[300px] overflow-auto rounded-xl border border-neutral-200 bg-[#fcfaf7] p-4 font-mono text-[11px] leading-relaxed dark:border-[#35332e] dark:bg-[#1a1915] dark:text-neutral-400">
                    {JSON.stringify(selected, null, 2)}
                  </pre>
                  <button onClick={() => navigator.clipboard.writeText(JSON.stringify(selected))} className="absolute right-3 top-3 rounded-md bg-white p-2 shadow-sm border border-neutral-200 opacity-0 group-hover:opacity-100 hover:bg-[#f0fdf4] transition-all dark:bg-[#35332e] dark:border-[#4a4641]">
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
  title: string;
  icon: React.ReactNode;
  accent: "rose" | "green" | "neutral";
  count: number;
  rows: DisplayRow[];
  isMaster: boolean;
  tradingActive: boolean;
  onToggleTrading?: () => void;
  editing?: boolean;
  editingName?: string;
  onEditNameChange?: (v: string) => void;
  onStartRename?: () => void;
  onCommitRename?: () => void;
  onDelete?: () => void;
  emptyText: string;
  realGroups: StockGroup[];
  currentGroupId?: string | null;
  onMoveStock?: (ticker: string, groupId: string | null) => void;
  doTokenPlusOne: (val: number, sym: string) => void;
  doTokenMinusOne: (val: number, sym: string) => void;
  openDetail: (raw: any) => void;
}

function GroupSection({
  title, icon, accent, count, rows, isMaster, tradingActive, onToggleTrading,
  editing, editingName, onEditNameChange, onStartRename, onCommitRename, onDelete,
  emptyText, realGroups, currentGroupId, onMoveStock,
  doTokenPlusOne, doTokenMinusOne, openDetail,
}: GroupSectionProps) {
  const showRefill = isMaster && rows.some(r => r.movable);
  const showGroupSelect = isMaster && !!onMoveStock && rows.some(r => r.movable);
  const baseCols = 6;
  const colSpan = baseCols + (showRefill ? 1 : 0) + (showGroupSelect ? 1 : 0);

  const accentBorder = accent === "rose" ? "border-rose-200 dark:border-rose-900/30"
    : accent === "green" ? "border-[#16a34a]/20 dark:border-[#16a34a]/20"
    : "border-neutral-200 dark:border-[#35332e]";

  return (
    <section className={cn("overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-[#1a1915]", accentBorder)}>
      {/* 헤더 */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-neutral-100 dark:border-[#35332e] bg-neutral-50/60 dark:bg-[#242320]/40">
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
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* 자동매매 토글 */}
          {onToggleTrading ? (
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

      {/* 테이블 */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead className="bg-neutral-50/80 text-neutral-500 dark:bg-[#242320]/50 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">종목</th>
              <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-center">PER / PBR</th>
              <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">BPS / EPS</th>
              <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">시가총액</th>
              <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-center">NCAV 비율</th>
              <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-right">Token</th>
              {showGroupSelect && <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-center">그룹</th>}
              {showRefill && <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-right">Refill</th>}
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
                <tr key={`${title}-${row.symbol}-${idx}`} className="group hover:bg-[#f0fdf4]/30 dark:hover:bg-[#14532d]/10 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(row.raw)} className="flex items-center gap-2 group/btn">
                      <div className="p-1.5 rounded-md bg-[#faf9f7] dark:bg-[#35332e] transition-all">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100 group-hover/btn:text-[#16a34a] transition-colors tracking-tight">
                        {row.symbol}
                      </span>
                    </button>
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
                    {row.movable ? (row.token?.toLocaleString() ?? 0) : "-"}
                  </td>
                  {showGroupSelect && (
                    <td className="px-4 py-3 text-center">
                      {row.movable ? (
                        <select
                          value={currentGroupId ?? ""}
                          onChange={(e) => onMoveStock?.(row.symbol, e.target.value || null)}
                          className="rounded-md border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] px-2 py-1 text-[11px]"
                        >
                          <option value="">미지정</option>
                          {realGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-neutral-300">-</span>
                      )}
                    </td>
                  )}
                  {showRefill && (
                    <td className="px-4 py-3">
                      {row.movable ? (
                        <div className="flex justify-end gap-1.5">
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
                        </div>
                      ) : (
                        <span className="block text-right text-neutral-300">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
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
