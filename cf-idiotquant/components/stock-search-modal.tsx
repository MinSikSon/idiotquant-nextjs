"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from "react";
import { ChevronLeft } from "lucide-react";
import SearchAutocomplete from "@/components/searchAutoComplete";
import { SearchGuide } from "@/app/(search)/search/components/SearchGuide";
import { loadStaticStockData, type StaticStockData } from "@/lib/utils/stockSearchData";

import { backSwipe, type SwipePoint } from "@/lib/back-swipe";
import { STOCK_SEARCH_GUIDANCE, type StockSearchPurpose } from "@/lib/stock-search-guidance";
import type { StockSearchName } from "@/lib/utils/stockSuggestions";

export function StockSearchModal({ open, label, purpose = "analyze", disabledMessage, market, options, stockNames, requireSelection, disabled, onSelect, onClose, trigger }: {
  open: boolean;
  purpose?: StockSearchPurpose;
  disabledMessage?: string;
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
  const surface = useRef<HTMLDivElement>(null);
  const swipe = useRef<(SwipePoint & { pointerId: number }) | null>(null);
  const [resultsTarget, setResultsTarget] = useState<HTMLDivElement | null>(null);
  const guidance = STOCK_SEARCH_GUIDANCE[purpose];
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

  const resetSwipe = () => {
    swipe.current = null;
    surface.current?.style.removeProperty("--search-swipe-offset");
    if (surface.current) delete surface.current.dataset.swiping;
  };
  const point = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY, time: event.timeStamp });
  const startSwipe = (event: PointerEvent<HTMLDivElement>) => {
    resetSwipe();
    if (event.pointerType !== "touch" || !event.isPrimary) return;
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, button, a, summary, [contenteditable="true"], [role="option"], [role="listbox"], [data-swipe-ignore]')) return;
    swipe.current = { ...point(event), pointerId: event.pointerId };
  };
  const moveSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const gesture = backSwipe(start, point(event), event.currentTarget.clientWidth);
    if (gesture.cancelled) { resetSwipe(); return; }
    if (gesture.offset) {
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.swiping = "true";
      event.currentTarget.style.setProperty("--search-swipe-offset", `${gesture.offset}px`);
    }
  };
  const finishSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    const dismiss = start?.pointerId === event.pointerId && backSwipe(start, point(event), event.currentTarget.clientWidth).dismiss;
    resetSwipe();
    if (dismiss) onClose();
  };

  return <dialog ref={dialog} id="stock-search-modal" aria-labelledby="stock-search-title" aria-describedby="stock-search-note" aria-modal="true"
    className="stock-search-modal"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    {open && <div ref={surface} className="stock-search-surface" onClick={event => event.stopPropagation()}
      onPointerDownCapture={startSwipe} onPointerMoveCapture={moveSwipe} onPointerUpCapture={finishSwipe} onPointerCancelCapture={resetSwipe}>
      <h2 id="stock-search-title" className="sr-only">{label}</h2>
      <header className="stock-search-header" data-search-content>
        <button type="button" onClick={onClose} aria-label="검색창 닫기" title="뒤로" className="stock-search-back"><ChevronLeft size={26} strokeWidth={1.8} /></button>
        <div className="min-w-0 flex-1">
          <SearchAutocomplete validCorpNameArray={values} onSearchButton={select} autoFocus onEscape={onClose} stockNames={searchNames} resultsTarget={resultsTarget}
            placeHolder={market === "US" ? "미국 종목명 또는 티커 검색" : guidance.placeholder} />
        </div>
      </header>
      <div className="stock-search-body" data-search-content role="search" aria-label={label}>
        <div ref={setResultsTarget} className="stock-search-results" />
        {!data && !options && <p role="status" className="stock-search-status">{loadError ? "자동완성 목록을 불러오지 못했어요. 종목명이나 티커를 직접 입력해 검색해 주세요." : "종목 목록을 불러오는 중이에요."}</p>}
        {disabled && <p role="status" className="stock-search-status">{disabledMessage ?? "종목 정보를 준비하고 있어요. 현재 작업이 끝나면 선택할 수 있어요."}</p>}
        {error && <p role="alert" className="stock-search-error">{error}</p>}
        <section className="stock-search-guidance" aria-label={`${label} 가이드`}>
          <h3>{guidance.title}</h3>
          <p className="stock-search-description">{guidance.description}</p>
          <SearchGuide market={market} onSelect={select} showAnalysis={purpose === "analyze"} />
          {purpose !== "analyze" && <ol className="stock-search-steps">
            {guidance.steps.map((step, index) => <li key={step}><span aria-hidden="true">{index + 1}</span><p>{step}</p></li>)}
          </ol>}
        </section>
        <footer id="stock-search-note" className="stock-search-note"><p>{guidance.note}</p></footer>
      </div>
    </div>}
  </dialog>;
}
