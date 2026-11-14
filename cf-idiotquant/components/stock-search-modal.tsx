"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { X } from "lucide-react";
import SearchAutocomplete from "@/components/searchAutoComplete";
import { SearchGuide } from "@/app/(search)/search/components/SearchGuide";
import { loadStaticStockData, type StaticStockData } from "@/lib/utils/stockSearchData";

import type { StockSearchName } from "@/lib/utils/stockSuggestions";

export function StockSearchModal({ open, label, market, options, stockNames, requireSelection, disabled, onSelect, onClose, trigger }: {
  open: boolean;
  label: string;
  market?: "KR" | "US";
  options?: string[];
  stockNames?: StockSearchName[];
  requireSelection?: boolean;
  disabled?: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
  trigger: RefObject<HTMLElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<StaticStockData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open || data) return;
    let active = true;
    loadStaticStockData().then(value => { if (active) setData(value); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [open, data]);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    setError("");
    const returnTarget = trigger.current;
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    element.showModal();
    element.querySelector<HTMLInputElement>("[data-page-input]")?.focus({ preventScroll: true });
    const viewport = window.visualViewport;
    const resize = () => {
      element.style.setProperty("--search-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
      element.style.setProperty("--search-viewport-top", `${viewport?.offsetTop ?? 0}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    return () => {
      element.close();
      Object.assign(body.style, previous);
      window.scrollTo({ top: scrollY, behavior: "instant" });
      returnTarget?.focus({ preventScroll: true });
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
    };
  }, [open, trigger]);

  const values = options ?? (market === "KR" ? data?.krTickers : market === "US" ? data?.usTickers : data?.allTickers) ?? [];
  const searchNames = useMemo(() => {
    const names = stockNames ?? (market !== "KR" ? data?.usStocks : undefined);
    if (!names || !options) return names;
    const allowed = new Set(options);
    return names.filter(stock => allowed.has(stock.symbol));
  }, [stockNames, market, data, options]);
  const select = (raw: string) => {
    const value = raw.trim();
    if (!value || disabled) return;
    // 계좌 검색은 실제 주문 가능한 마스터 항목만 선택할 수 있다.
    if (requireSelection && options && !options.some(item => item.toLowerCase() === value.toLowerCase())) {
      setError("검색 결과에서 종목을 선택해 주세요.");
      return;
    }
    onSelect(value);
  };

  return <dialog ref={dialog} id="stock-search-modal" aria-labelledby="stock-search-title" aria-modal="true"
    className="stock-search-modal bg-surface-canvas text-neutral-900 dark:bg-surface-dark-canvas dark:text-neutral-100"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    {open && <div className="flex h-full min-h-0 flex-col" onClick={event => event.stopPropagation()}>
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] dark:border-neutral-700">
        <h2 id="stock-search-title" className="text-base font-semibold">{label}</h2>
        <button type="button" onClick={onClose} aria-label="검색창 닫기" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800"><X size={22} /></button>
      </header>
      <div data-search-content className="min-h-0 flex-1 overflow-y-auto overscroll-contain !p-4" role="search" aria-label={label}>
        <SearchAutocomplete validCorpNameArray={values} onSearchButton={select} autoFocus onEscape={onClose} stockNames={searchNames}
          placeHolder={market === "US" ? "미국 티커 입력" : market === "KR" ? "국내 종목명 또는 코드 입력" : "국내 종목명 또는 미국 티커 입력"} />
        {!data && !options && <p role="status" className="mt-2 text-xs text-neutral-500">{loadError ? "자동완성 목록을 불러오지 못했습니다. 종목명이나 티커를 입력해 검색할 수 있습니다." : "종목 목록을 불러오는 중…"}</p>}
        {disabled && <p role="status" className="mt-2 text-sm text-neutral-500">현재 페이지에서는 종목을 선택할 수 없습니다. 종목 수 제한이나 진행 중인 작업을 확인해 주세요.</p>}
        {error && <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <section className="mt-5" aria-label="종목 검색 가이드">
          <h3 className="mb-3 text-sm font-semibold">종목 검색 가이드</h3>
          <SearchGuide market={market} onSelect={select} />
        </section>
      </div>
    </div>}
  </dialog>;
}
