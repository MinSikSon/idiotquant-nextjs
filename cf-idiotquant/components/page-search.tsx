"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { useMobilePageHeader } from "@/components/mobile-page-header";
import { NavigationPopover } from "@/components/navigation-popover";

/** 각 페이지의 검색 상태와 동작을 유지하면서 공통 상단바에 표시한다. */
export function PageSearch({ children, label = "종목 검색", defaultOpen = false }: { children: ReactNode; label?: string; defaultOpen?: boolean }) {
  const slots = useMobilePageHeader();
  if (!slots?.searchTarget) return slots ? null : <>{children}</>;
  return createPortal(<div data-page-search>
    <NavigationPopover label={label} defaultOpen={defaultOpen} trigger={
      <button type="button" data-page-input-trigger aria-label={label} aria-keyshortcuts="/" className="navigation-icon text-neutral-600 dark:text-neutral-300">
        <Search size={21} aria-hidden="true" />
      </button>
    }>
      <div data-search-content>{children}</div>
    </NavigationPopover>
  </div>, slots.searchTarget);
}
