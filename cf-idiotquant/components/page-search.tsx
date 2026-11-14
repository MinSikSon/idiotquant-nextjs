"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMobilePageHeader } from "@/components/mobile-page-header";

/** 페이지의 검색 상태와 동작을 유지하면서 입력창을 공통 검색 메뉴로 보낸다. */
export function PageSearch({ children, label = "종목 검색" }: { children: ReactNode; label?: string }) {
  const slots = useMobilePageHeader();
  const setSearchLabel = slots?.setSearchLabel;
  useEffect(() => {
    setSearchLabel?.(label);
    return () => setSearchLabel?.(null);
  }, [label, setSearchLabel]);

  const content = <div data-page-search data-search-content role="search" aria-label={label} className="w-full min-w-0">{children}</div>;
  if (!slots) return content;
  return slots.searchTarget ? createPortal(content, slots.searchTarget) : null;
}
