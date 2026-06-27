"use client";

import { useState, useCallback, memo } from "react";
import {
  Loader2, X, Check, AlertCircle,
  CheckCircle2, Clock, ArrowUpRight, ArrowDownRight,
  RefreshCw, Activity, InboxIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =========================================================================
// 유틸
// =========================================================================
export function formatTime(timeStr?: string) {
  if (!timeStr) return "원주문";
  const s = timeStr.replace(/[^0-9]/g, "");
  return s.length === 6 ? `${s.slice(0, 2)}:${s.slice(2, 4)}:${s.slice(4, 6)}` : timeStr;
}

export function fmtUsd(v: number | string) {
  const n = Number(v);
  if (isNaN(n)) return "$0.00";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtKrw(v: number | string) {
  const n = Number(v);
  if (isNaN(n)) return "₩0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) {
    return `${sign}₩${(abs / 1_000_000_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}조`;
  }
  return `${sign}₩${Math.round(abs).toLocaleString()}`;
}

// =========================================================================
// Toast 시스템
// =========================================================================
export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  return { toasts, addToast, removeToast };
}

export const ToastNotification = memo(({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) => {
  const colorMap: Record<ToastType, string> = {
    success: "bg-emerald-50/95 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300",
    error: "bg-red-50/95 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300",
    info: "bg-[#f0fdf4]/95 dark:bg-[#052e16]/60 border-[#bbf7d0] dark:border-[#166534] text-[#166534] dark:text-[#86efac]",
    warning: "bg-amber-50/95 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300",
  };
  const IconMap: Record<ToastType, React.ReactNode> = {
    success: <Check size={13} />,
    error: <AlertCircle size={13} />,
    info: <AlertCircle size={13} />,
    warning: <AlertCircle size={13} />,
  };
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md",
      "animate-in slide-in-from-right-4 fade-in duration-300 pointer-events-auto max-w-sm",
      colorMap[toast.type]
    )}>
      <span className="shrink-0">{IconMap[toast.type]}</span>
      <span className="text-xs font-bold flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
      >
        <X size={11} />
      </button>
    </div>
  );
});
ToastNotification.displayName = "ToastNotification";

export function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <ToastNotification key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// =========================================================================
// 공용 서브 컴포넌트
// =========================================================================
export function LoadingState({ message = "계좌 데이터를 불러오는 중..." }: { message?: string }) {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#fcfaf7] dark:bg-[#1a1915] gap-3">
      <div className="p-4 rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] shadow-sm">
        <Loader2 className="w-7 h-7 text-[#16a34a] animate-spin" />
      </div>
      <p className="text-sm font-bold text-neutral-400">{message}</p>
    </div>
  );
}

export function SectionHeader({
  icon, title, subtitle, badge, action,
}: {
  icon: React.ReactNode; title: string; subtitle?: string;
  badge?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-neutral-100 dark:border-[#35332e]/80">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#faf9f7] dark:bg-[#35332e] rounded-xl text-neutral-600 dark:text-neutral-400 shrink-0">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-base text-neutral-900 dark:text-neutral-100 tracking-tight">{title}</h3>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 self-start sm:self-center">{action}</div>}
    </div>
  );
}

export function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap",
        active
          ? "bg-white dark:bg-[#1a1915] text-neutral-950 dark:text-white shadow-sm"
          : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
      )}
    >
      {children}
    </button>
  );
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <div className="p-3 rounded-2xl bg-[#faf9f7] dark:bg-[#35332e]">
            <InboxIcon size={20} className="text-neutral-400" />
          </div>
          <p className="text-sm text-neutral-400 font-medium">{message}</p>
        </div>
      </td>
    </tr>
  );
}

// =========================================================================
// 상세 지표 칩 (스크롤 스트립용 — KR/US 공용)
// =========================================================================
export function MetricChip({ label, value, valueClass = "text-neutral-900 dark:text-neutral-100" }: {
  label: string; value: string; valueClass?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] rounded-xl px-4 py-2.5 flex flex-col gap-0.5 shrink-0">
      <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest whitespace-nowrap">{label}</span>
      <span className={cn("text-xs font-mono font-black whitespace-nowrap", valueClass)}>{value}</span>
    </div>
  );
}

// =========================================================================
// KPI 카드 (단일값 — KR)
// =========================================================================
export function KpiCard({ label, value, sub, icon, iconBg, valueColor = "text-neutral-900 dark:text-white", accentColor = "bg-neutral-200 dark:bg-[#4a4641]" }: {
  label: string; value: string | null; sub: string;
  icon: React.ReactNode; iconBg: string; valueColor?: string; accentColor?: string;
}) {
  if (value === null) return <KpiCardSkeleton />;

  return (
    <div className="relative bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] shadow-sm overflow-hidden flex flex-col justify-between gap-3 p-4 sm:p-5">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5", accentColor)} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider leading-tight">{label}</span>
        <div className={cn("p-2 rounded-xl shrink-0", iconBg)}>{icon}</div>
      </div>
      <div>
        <div className={cn("text-xl sm:text-2xl font-black tracking-tight font-mono", valueColor)}>{value}</div>
        <p className="text-[10px] text-neutral-400 mt-1 leading-tight">{sub}</p>
      </div>
    </div>
  );
}

// =========================================================================
// KPI 카드 (USD + KRW 이중 표시 — US)
// =========================================================================
export function UsdKpiCard({
  label, mainValue, mainColor = "text-neutral-900 dark:text-white",
  subLabel, subValue, subColor = "text-neutral-800 dark:text-neutral-200",
  icon, iconBg, loading, accentColor = "bg-neutral-200 dark:bg-[#4a4641]",
}: {
  label: string; mainValue: string | null; mainColor?: string;
  subLabel: string; subValue: string | null; subColor?: string;
  icon: React.ReactNode; iconBg: string; loading: boolean; accentColor?: string;
}) {
  if (loading || mainValue === null) return <UsdKpiCardSkeleton />;

  return (
    <div className="relative bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] rounded-2xl p-4 sm:p-5 shadow-sm overflow-hidden flex flex-col justify-between gap-3">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5", accentColor)} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider leading-tight">{label}</span>
        <div className={cn("p-2 rounded-xl shrink-0", iconBg)}>{icon}</div>
      </div>
      <div>
        <div className={cn("text-xl sm:text-2xl font-black tracking-tight font-mono", mainColor)}>{mainValue}</div>
        <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-[#35332e] flex items-center justify-between text-[10px] font-bold text-neutral-400">
          <span>{subLabel}</span>
          <span className={cn("font-mono", subColor)}>{subValue}</span>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 주문 내역 탭 액션 바 (체결 / 미체결 공용)
// =========================================================================
export function OrderTabAction({
  viewerTab, setViewerTab,
  ccnlCount, nccsCount,
  isPending,
  onRefresh,
}: {
  viewerTab: "ccnl" | "nccs";
  setViewerTab: (tab: "ccnl" | "nccs") => void;
  ccnlCount: number; nccsCount: number;
  isPending: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-[#faf9f7] dark:bg-[#35332e] p-1 rounded-xl">
      <TabButton active={viewerTab === "ccnl"} onClick={() => setViewerTab("ccnl")}>
        체결 ({ccnlCount})
      </TabButton>
      <TabButton active={viewerTab === "nccs"} onClick={() => setViewerTab("nccs")}>
        미체결 ({nccsCount})
      </TabButton>
      <button
        onClick={onRefresh}
        disabled={isPending}
        className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors disabled:opacity-40 rounded-lg hover:bg-white dark:hover:bg-[#4a4641]"
        title="새로고침"
      >
        <RefreshCw size={13} className={cn(isPending && "animate-spin")} />
      </button>
    </div>
  );
}

// =========================================================================
// 주문 섹션 SectionHeader 아이콘
// =========================================================================
export function OrderSectionIcon({ viewerTab }: { viewerTab: "ccnl" | "nccs" }) {
  return viewerTab === "ccnl"
    ? <CheckCircle2 size={16} className="text-emerald-500" />
    : <Clock size={16} className="text-amber-500" />;
}

// =========================================================================
// 자동갱신 / 새로고침 헤더 버튼 그룹
// =========================================================================
export function BalanceHeaderActions({
  autoRefresh, onToggleAutoRefresh,
  isLoading, onRefresh,
  extra,
}: {
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  isLoading: boolean;
  onRefresh: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {extra}
      <button
        onClick={onToggleAutoRefresh}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
          autoRefresh
            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
            : "bg-white dark:bg-[#242320] text-neutral-500 border-neutral-200 dark:border-[#35332e] hover:border-neutral-400"
        )}
      >
        <Activity size={13} className={autoRefresh ? "animate-pulse text-emerald-500" : ""} />
        {autoRefresh ? "자동갱신 ON" : "자동갱신"}
      </button>
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 transition-all disabled:opacity-50"
      >
        <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
        새로고침
      </button>
    </div>
  );
}

// =========================================================================
// 손익 방향 헬퍼
// =========================================================================
export function PnlIcon({ positive, size = 15 }: { positive: boolean; size?: number }) {
  return positive ? <ArrowUpRight size={size} /> : <ArrowDownRight size={size} />;
}

export function pnlIconBg(positive: boolean) {
  return positive
    ? "bg-red-50 dark:bg-red-950/40 text-red-500"
    : "bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a]";
}

export function pnlValueColor(positive: boolean) {
  return positive ? "text-red-500" : "text-[#16a34a]";
}

export function pnlAccentColor(positive: boolean) {
  return positive ? "bg-red-400 dark:bg-red-600" : "bg-[#16a34a] dark:bg-[#16a34a]";
}

// =========================================================================
// 스켈레톤 로딩 컴포넌트
// =========================================================================
export function KpiCardSkeleton() {
  return (
    <div className="relative bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] shadow-sm overflow-hidden flex flex-col justify-between gap-3 p-4 sm:p-5">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-neutral-200 dark:bg-[#4a4641] animate-pulse" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 bg-neutral-200 dark:bg-[#4a4641] rounded animate-pulse" />
        <div className="h-8 w-8 bg-[#faf9f7] dark:bg-[#35332e] rounded-xl animate-pulse" />
      </div>
      <div>
        <div className="h-7 w-32 bg-neutral-200 dark:bg-[#4a4641] rounded-lg animate-pulse mb-2" />
        <div className="h-3 w-24 bg-[#faf9f7] dark:bg-[#35332e] rounded animate-pulse" />
      </div>
    </div>
  );
}

export function UsdKpiCardSkeleton() {
  return (
    <div className="relative bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] rounded-2xl p-4 sm:p-5 shadow-sm overflow-hidden flex flex-col justify-between gap-3">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-neutral-200 dark:bg-[#4a4641] animate-pulse" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 bg-neutral-200 dark:bg-[#4a4641] rounded animate-pulse" />
        <div className="h-8 w-8 bg-[#faf9f7] dark:bg-[#35332e] rounded-xl animate-pulse" />
      </div>
      <div>
        <div className="h-7 w-32 bg-neutral-200 dark:bg-[#4a4641] rounded-lg animate-pulse mb-2" />
        <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-[#35332e]">
          <div className="h-3 w-24 bg-[#faf9f7] dark:bg-[#35332e] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function ChartSectionSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-6 items-center py-8">
      <div className="w-48 h-48 rounded-full bg-[#faf9f7] dark:bg-[#35332e] animate-pulse shrink-0" />
      <div className="flex-1 space-y-3 w-full">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-neutral-200 dark:bg-[#4a4641] animate-pulse shrink-0" />
            <div className="h-3 flex-1 bg-[#faf9f7] dark:bg-[#35332e] rounded animate-pulse" />
            <div className="h-3 w-16 bg-neutral-200 dark:bg-[#4a4641] rounded animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// 섹션 패널 래퍼
// =========================================================================
export function SectionPanel({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section
      id={id}
      className={cn(
        "bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] shadow-sm p-5 md:p-6",
        "animate-in fade-in duration-500",
        className
      )}
    >
      {children}
    </section>
  );
}

// =========================================================================
// 테이블 헤더 셀
// =========================================================================
export function TableHeader({ headers }: { headers: { label: string; align?: string }[] }) {
  return (
    <thead>
      <tr className="bg-[#fcfaf7] dark:bg-[#35332e]/60 border-b border-neutral-100 dark:border-[#35332e]">
        {headers.map(h => (
          <th
            key={h.label}
            className={cn(
              "py-3 px-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest",
              h.align
            )}
          >
            {h.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}
