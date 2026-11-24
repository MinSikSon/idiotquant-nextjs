"use client";

import { useLocale, useTranslations } from "next-intl";
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
  const t = useTranslations("search");
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const swipe = useRef<(SwipePoint & { pointerId: number }) | null>(null);
  const [resultsTarget, setResultsTarget] = useState<HTMLDivElement | null>(null);
  const guidance = purpose === "balance" || purpose === "ticker-map" ? STOCK_SEARCH_GUIDANCE[purpose] : {
    title: t(`${purpose}Title`),
    description: t(`${purpose}Description`),
    placeholder: t(`${purpose}Placeholder`),
    steps: [t(`${purpose}Step1`), t(`${purpose}Step2`)],
    note: t(`${purpose}Note`),
  };
  const [data, setData] = useState<StaticStockData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  useEffect(() => {
    if (!open || data) return;
    setLoadError(false);
    let active = true;
    loadStaticStockData().then(value => { if (active) setData(value); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [open, data, loadAttempt]);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    setError("");
    setQuery("");
    const returnTarget = trigger.current;
    const scrollY = window.scrollY;
    const root = document.documentElement;
    const previousGutter = root.style.scrollbarGutter;
    if (window.innerWidth > root.clientWidth) root.style.scrollbarGutter = "stable";
    root.style.setProperty("--stock-search-scroll-offset", `${-scrollY}px`);
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
      root.style.scrollbarGutter = previousGutter;
      root.style.removeProperty("--stock-search-scroll-offset");
      window.scrollTo({ top: scrollY, behavior: "instant" });
      returnTarget?.focus({ preventScroll: true });
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
    };
  }, [open, trigger]);

  const values = options ?? (market === "KR" ? data?.krTickers : market === "US" ? data?.usTickers : data?.allTickers) ?? [];
  const searchNames = useMemo(() => {
    const names = stockNames ?? [
      ...(market !== "US" ? data?.krStocks ?? [] : []),
      ...(market !== "KR" ? data?.usStocks ?? [] : []),
    ];
    if (!options) return names;
    const allowed = new Set(options);
    return names.filter(stock => allowed.has(stock.symbol));
  }, [stockNames, market, data, options]);
  const recentNames = useMemo(() => new Map(searchNames.flatMap(stock =>
    stock.market === "KR" ? [[stock.symbol, stock] as const] : []
  )), [searchNames]);
  const recent = recentSearches.filter(value => values.some(item => item.toLowerCase() === value.toLowerCase()));
  const select = (raw: string) => {
    const value = raw.trim();
    if (!value || disabled) return;
    // 계좌 검색은 실제 주문 가능한 마스터 항목만 선택할 수 있다.
    if (requireSelection && options && !options.some(item => item.toLowerCase() === value.toLowerCase())) {
      setError(t("selectRequired"));
      return;
    }
    const knownValue = values.find(item => item.toLowerCase() === value.toLowerCase());
    if (knownValue) setRecentSearches(current => [knownValue, ...current.filter(item => item !== knownValue)].slice(0, 5));
    onSelect(value);
  };

  const resetSwipe = () => {
    swipe.current = null;
    surface.current?.style.removeProperty("--search-swipe-offset");
    if (surface.current) delete surface.current.dataset.swiping;
  };
  const point = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY });
  const startSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.dataset.swipeClosing) return;
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
    const element = event.currentTarget;
    if (gesture.offset && !element.dataset.swiping) {
      element.setPointerCapture(event.pointerId);
      element.dataset.swiping = "true";
    }
    if (element.dataset.swiping) element.style.setProperty("--search-swipe-offset", `${gesture.offset}px`);
  };
  const finishSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const element = event.currentTarget;
    const gesture = backSwipe(start, point(event), element.clientWidth);
    if (!gesture.dismiss) {
      resetSwipe();
      return;
    }

    swipe.current = null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }

    element.dataset.swipeClosing = "true";
    const currentOffset = element.style.getPropertyValue("--search-swipe-offset") || "0px";
    const endOffset = gesture.offset < 0 ? "-100%" : "100%";
    const animation = element.animate({
      transform: [`translateX(${currentOffset})`, `translateX(${endOffset})`],
    }, { duration: 180, easing: "ease-out", fill: "forwards" });
    animation.onfinish = () => {
      if (surface.current === element) onClose();
    };
  };

  return <dialog ref={dialog} id="stock-search-modal" aria-labelledby="stock-search-title" aria-describedby="stock-search-note" aria-modal="true"
    className="stock-search-modal"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    {open && <div ref={surface} className="stock-search-surface" onClick={event => event.stopPropagation()}
      onPointerDownCapture={startSwipe} onPointerMoveCapture={moveSwipe} onPointerUpCapture={finishSwipe} onPointerCancelCapture={resetSwipe}
      onLostPointerCapture={event => {
        // 자식의 암시적 캡처에서 표면으로 넘어가는 이벤트는 무시한다.
        if (event.target === event.currentTarget && swipe.current?.pointerId === event.pointerId) resetSwipe();
      }}>
      <h2 id="stock-search-title" className="sr-only">{label}</h2>
      <header className="stock-search-header" data-search-content>
        <button type="button" onClick={onClose} aria-label={t("close")} title={t("back")} className="stock-search-back"><ChevronLeft size={26} strokeWidth={1.8} /></button>
        <div className="min-w-0 flex-1">
          <SearchAutocomplete validCorpNameArray={values} onSearchButton={select} autoFocus onEscape={onClose} stockNames={searchNames} resultsTarget={resultsTarget}
            disabled={disabled} loading={!data && !options && !loadError} selectionRequired={requireSelection}
            onQueryChange={value => { setQuery(value); setError(""); }}
            placeHolder={market === "US" ? t("usPlaceholder") : guidance.placeholder} />
        </div>
      </header>
      <div className="stock-search-body" data-search-content role="search" aria-label={label}>
        <div ref={setResultsTarget} className="stock-search-results" />
        {loadError && !data && !options && <div className="stock-search-status">
          <p role="status">{t("loadFailed")}</p>
          <button type="button" onClick={() => { setLoadError(false); setLoadAttempt(attempt => attempt + 1); }}
            className="mt-1 min-h-11 rounded border border-neutral-500 px-3 text-sm font-medium">{t("reload")}</button>
        </div>}
        {disabled && <p role="status" className="stock-search-status">{disabledMessage ?? t("preparing")}</p>}
        {error && <p role="alert" className="stock-search-error">{error}</p>}
        {!disabled && !query.trim() && recent.length > 0 && <section className="stock-search-guidance" aria-label={t("recent")}>
          <div className="flex items-center justify-between gap-2">
            <h3>{t("recent")}</h3>
            <button type="button" onClick={() => setRecentSearches([])}
              className="min-h-11 rounded px-3 text-sm text-neutral-600 dark:text-neutral-400">{t("clearRecent")}</button>
          </div>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {recent.map(value => {
              const stock = recentNames.get(value);
              const name = stock && (locale === "ko" ? stock.koreanName : (locale === "ja" ? stock.japaneseName : undefined) || stock.name);
              return <li key={value}>
              <button type="button" onClick={() => select(value)}
                className="min-h-11 w-full break-words rounded px-3 py-2 text-left text-base hover:bg-neutral-100 dark:hover:bg-neutral-800">{name && name !== value ? `${name} · ${value}` : value}</button>
            </li>;
            })}
          </ul>
        </section>}
        {!disabled && !query.trim() && recent.length === 0 && <section className="stock-search-guidance" aria-label={guidance.title}>
          <h3>{guidance.title}</h3>
          <p className="stock-search-description">{guidance.description}</p>
          <SearchGuide market={market} onSelect={select} showAnalysis={purpose === "analyze"} />
          {purpose !== "analyze" && <ol className="stock-search-steps">
            {guidance.steps.map((step, index) => <li key={step}><span aria-hidden="true">{index + 1}</span><p>{step}</p></li>)}
          </ol>}
        </section>}
        <footer id="stock-search-note" className="stock-search-note"><p>{guidance.note}</p></footer>
      </div>
    </div>}
  </dialog>;
}
