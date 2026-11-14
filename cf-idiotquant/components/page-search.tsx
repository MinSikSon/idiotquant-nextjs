"use client";

import { useLayoutEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useStockSearchModal, type PageSearchConfig } from "@/components/stock-search-provider";

/** 페이지의 선택 동작을 등록하고 입력 UI는 공통 모달에서 제공한다. */
export function PageSearch({ label = "종목 검색", onSelect, market, options, stockNames, requireSelection, disabled = false }: PageSearchConfig) {
  const { register, openSearch, open } = useStockSearchModal();
  const callback = useRef(onSelect);
  useLayoutEffect(() => { callback.current = onSelect; }, [onSelect]);
  useLayoutEffect(() => register({ label, market, options, stockNames, requireSelection, disabled, onSelect: value => callback.current(value) }),
    [register, label, market, options, stockNames, requireSelection, disabled]);

  return <button type="button" data-page-search data-page-input-trigger aria-haspopup="dialog" aria-controls="stock-search-modal" aria-expanded={open} onClick={openSearch}
    className="my-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-medium disabled:opacity-50 dark:border-neutral-700 dark:bg-surface-dark-card">
    <Search size={18} aria-hidden="true" />{label}
  </button>;
}
