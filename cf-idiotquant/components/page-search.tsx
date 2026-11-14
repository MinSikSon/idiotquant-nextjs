"use client";

import type { ReactNode } from "react";

/** 페이지별 검색은 본문에 두고, 상단 검색 아이콘은 공통 검색 화면으로 이동한다. */
export function PageSearch({ children, label = "종목 검색" }: { children: ReactNode; label?: string }) {
  return <div data-page-search data-search-content role="search" aria-label={label} className="w-full min-w-0">{children}</div>;
}
