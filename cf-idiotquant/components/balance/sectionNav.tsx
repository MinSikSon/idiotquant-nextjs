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
    <nav data-compact-tabs aria-label="포트폴리오 보기" className="sticky top-[var(--topbar-h,48px)] z-30 border-b border-neutral-200 bg-surface-canvas/95 backdrop-blur-md dark:border-neutral-700 dark:bg-surface-dark-canvas/95">
      <div className="mx-2 my-1 flex items-center gap-1 overflow-x-auto rounded-xl bg-surface-muted/70 p-1 scrollbar-hide dark:bg-surface-dark-muted md:mx-0 md:my-0 md:gap-2 md:overflow-x-auto md:rounded-none md:bg-transparent md:p-0 md:py-1 md:dark:bg-transparent">
        {sections.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            aria-current={mobileTab === id ? "page" : undefined}
            onClick={() => onMobileTabChange?.(id)}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent px-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 md:flex-none md:gap-2 md:rounded-none md:border-x-0 md:border-t-0 md:border-b-2 md:px-6 md:py-2 md:text-sm",
              mobileTab === id
                ? "bg-white text-neutral-900 shadow-sm dark:bg-surface-dark-card dark:text-neutral-50 md:bg-transparent md:shadow-none md:border-neutral-900 md:text-neutral-900 dark:md:border-neutral-100 dark:md:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            )}
          >
            <span aria-hidden="true" className="hidden min-[400px]:inline-flex shrink-0">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
