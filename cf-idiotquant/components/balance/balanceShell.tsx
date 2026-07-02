"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionNav, type NavSection } from "@/components/balance/sectionNav";
import {
  ToastContainer, BalanceHeaderActions, type ToastItem,
} from "@/components/balance/shared";

// =========================================================================
// 통합 잔고 페이지 공용 스캐폴드
// =========================================================================
// KR / US 두 뷰가 공유하는 레이아웃·헤더·섹션 네비게이션 골격.
// 국가별로 다른 부분(브레드크럼/타이틀/KPI/주문 등)은 노드로 주입한다.

export interface BalanceSection {
  id: string;
  node: React.ReactNode;
}

export function BalanceShell({
  toasts, onRemoveToast,
  breadcrumb, title, lastUpdated,
  countryToggle, autoRefresh, onToggleAutoRefresh, isLoading, onRefresh, headerExtra, footerBadge,
  dividerClass,
  accountSelector,
  navSections, mobileTab, onMobileTabChange,
  sections,
}: {
  toasts: ToastItem[];
  onRemoveToast: (id: string) => void;
  breadcrumb: React.ReactNode;
  title: React.ReactNode;
  lastUpdated: Date | null;
  countryToggle?: React.ReactNode;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  isLoading: boolean;
  onRefresh: () => void;
  headerExtra?: React.ReactNode;
  footerBadge?: React.ReactNode;
  dividerClass: string;
  accountSelector?: React.ReactNode;
  navSections: NavSection[];
  mobileTab: string;
  onMobileTabChange: (id: string) => void;
  sections: BalanceSection[];
}) {
  return (
    <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] transition-colors duration-300">

      <ToastContainer toasts={toasts} onRemove={onRemoveToast} />

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-10 space-y-6">

        {/* 헤더 */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="space-y-2.5 min-w-0">
            {breadcrumb}
            {title}
            {lastUpdated ? (
              <p className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
                <Clock size={11} />
                {lastUpdated.toLocaleTimeString("ko-KR")} 기준
              </p>
            ) : (
              <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-[#242320] animate-pulse" />
            )}
          </div>

          <div className="flex flex-col items-stretch md:items-end gap-2">
            {countryToggle}
            <BalanceHeaderActions
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={onToggleAutoRefresh}
              isLoading={isLoading}
              onRefresh={onRefresh}
              extra={headerExtra}
            />
            {footerBadge}
          </div>
        </header>

        <div className={cn("h-px bg-gradient-to-r from-transparent to-transparent opacity-60", dividerClass)} />

        {/* 계좌 선택 (탭 위 최상단) */}
        {accountSelector}

        {/* 섹션 네비게이션 */}
        <SectionNav sections={navSections} mobileTab={mobileTab} onMobileTabChange={onMobileTabChange} />

        {/* 섹션 본문 (모바일은 탭 단위로 표시) */}
        {sections.map(s => (
          <div key={s.id} className={cn(mobileTab !== s.id && "hidden md:block")}>
            {s.node}
          </div>
        ))}

      </div>
    </div>
  );
}
