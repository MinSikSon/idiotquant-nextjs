"use client";

import { cn } from "@/lib/utils";

// =========================================================================
// 섹션 네비게이션 타입
// =========================================================================
export interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// =========================================================================
// 섹션 네비게이션 컴포넌트
// =========================================================================
export function SectionNav({
  sections,
  mobileTab,
  onMobileTabChange,
}: {
  sections: NavSection[];
  mobileTab?: string;
  onMobileTabChange?: (id: string) => void;
}) {
  return (
    <nav aria-label="포트폴리오 보기" className="sticky top-[var(--topbar-h,48px)] z-30 border-b border-neutral-200 bg-surface-canvas/95 backdrop-blur-md dark:border-neutral-700 dark:bg-surface-dark-canvas/95">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {sections.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            aria-current={mobileTab === id ? "page" : undefined}
            onClick={() => onMobileTabChange?.(id)}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 md:px-4 md:text-sm",
              mobileTab === id
                ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            )}
          >
            <span aria-hidden="true" className="shrink-0">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
