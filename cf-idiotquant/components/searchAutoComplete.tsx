"use client";

import { useLocale, useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { useState, useMemo, KeyboardEvent, useRef, useEffect, useId } from "react";
import { cn } from "@/lib/utils";
import { CONTROL_ICON_BUTTON_CLS } from "@/lib/ui-controls";
import { PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { buildStockSearchIndex, findStockSuggestions, type StockSearchName } from "@/lib/utils/stockSuggestions";
import { Search, CornerDownLeft, X } from "lucide-react";

interface SearchAutocompleteProps {
    disabled?: boolean;
    loading?: boolean;
    selectionRequired?: boolean;
    resultsTarget?: HTMLElement | null;
    className?: string;
    value?: string;
    onQueryChange?: (value: string) => void;
    validCorpNameArray: string[];
    stockNames?: StockSearchName[];
    onSearchButton: (value: string) => void;
    placeHolder?: string;
    autoFocus?: boolean;
    onEscape?: () => void;
    onSearchStateChange?: (focused: boolean, isEmpty: boolean) => void;
}

/**
 * 쿼리와 매칭되는 텍스트 영역을 하이라이팅 처리하는 유틸리티 컴포넌트
 */
const HighlightText = ({ text, query }: { text: string; query: string }) => {
    if (!query.trim()) return <span>{text}</span>;

    // 대소문자 구분 없이 매칭하기 위해 정규식 사용
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, index) =>
                regex.test(part) ? (
                    <mark key={index} className="bg-brand-light text-brand-ink dark:bg-brand-muted/80 dark:text-brand-ink font-bold px-0.5 rounded-xs">
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                )
            )}
        </span>
    );
};

const SearchAutocomplete = ({ disabled = false, loading = false, selectionRequired = false, resultsTarget, value, onQueryChange, className, validCorpNameArray, stockNames, onSearchButton, placeHolder, onSearchStateChange, autoFocus = false, onEscape }: SearchAutocompleteProps) => {
    const t = useTranslations("search");
    const locale = useLocale();
    const [localQuery, setLocalQuery] = useState("");
    const query = value ?? localQuery;
    const setQuery = (next: string) => {
        setLocalQuery(next);
        onQueryChange?.(next);
    };
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const id = useId();
    const listboxId = `${id}-results`;
    const statusId = `${id}-status`;
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLUListElement>(null);

    const searchIndex = useMemo(() => buildStockSearchIndex(validCorpNameArray, stockNames), [validCorpNameArray, stockNames]);
    const companyNames = useMemo(() => new Map(stockNames?.map(stock => [stock.symbol, stock])), [stockNames]);
    const suggestions = useMemo(() => findStockSuggestions(searchIndex, query), [query, searchIndex]);

    useEffect(() => {
        setSelectedIndex(-1);
    }, [suggestions]);

    // 키보드 선택은 목록 안에서만 스크롤한다. 페이지나 고정 헤더는 움직이지 않는다.
    useEffect(() => {
        if (selectedIndex >= 0 && dropdownRef.current) {
            const activeElement = dropdownRef.current.querySelector<HTMLElement>(`[data-suggestion-index="${selectedIndex}"]`);
            if (activeElement) {
                const container = dropdownRef.current;
                const activeTop = activeElement.offsetTop;
                const activeBottom = activeTop + activeElement.offsetHeight;
                const containerTop = container.scrollTop;
                const containerBottom = container.scrollTop + container.clientHeight;

                if (activeTop < containerTop) {
                    container.scrollTop = activeTop;
                } else if (activeBottom > containerBottom) {
                    container.scrollTop = activeBottom - container.clientHeight;
                }
            }
        }
    }, [selectedIndex, suggestions]);

    const activeIndex = isFocused && selectedIndex >= 0 && selectedIndex < suggestions.length ? selectedIndex : -1;
    const exactQuery = query.trim().toLowerCase();
    const exactNames = exactQuery ? searchIndex.filter(entry => entry.aliases.some(alias => alias.lower === exactQuery)) : [];
    const target = activeIndex >= 0 ? suggestions[activeIndex] : exactNames.length === 1 ? exactNames[0].text : query.trim();
    const canSearch = !disabled && !!target && (!selectionRequired || validCorpNameArray.some(item => item.toLowerCase() === target.toLowerCase()));

    const executeSearch = (raw: string) => {
        const value = raw.trim();
        if (!value || disabled) return;
        if (selectionRequired && !validCorpNameArray.some(item => item.toLowerCase() === value.toLowerCase())) return;
        setQuery(value);
        setIsFocused(false);
        if (onSearchStateChange) onSearchStateChange(false, !value.trim());
        onSearchButton(value);
        inputRef.current?.blur();
    };

    const submitSearch = () => {
        executeSearch(target);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // 한글 입력기(IME) 조합 중 엔터 처리가 더블 트리거되는 버그 차단
        if (e.nativeEvent.isComposing) return;

        if (e.key === "Enter") {
            e.preventDefault();
            submitSearch();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (suggestions.length === 0) return;
            setIsFocused(true);
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (suggestions.length === 0) return;
            setIsFocused(true);
            setSelectedIndex(prev => prev < 0 ? suggestions.length - 1 : Math.max(-1, prev - 1));
        } else if (e.key === "Escape") {
            e.preventDefault();
            const hadCandidates = isFocused && suggestions.length > 0;
            if (hadCandidates) e.stopPropagation();
            setIsFocused(false);
            setSelectedIndex(-1);
            if (onSearchStateChange) onSearchStateChange(false, !query.trim());
            if (!hadCandidates) onEscape?.();
        }
    };

    const popupOpen = isFocused && suggestions.length > 0 && !disabled;

    const results = popupOpen && (
                <ul
                    ref={dropdownRef}
                    id={listboxId}
                    role="listbox"
                    aria-label={t("results")}
                    className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-surface-dark-card border border-neutral-200 dark:border-border-subtle-dark/80 rounded-xl shadow-sm max-h-[min(19rem,40dvh)] overflow-y-auto overscroll-contain touch-pan-y p-1.5 z-[70] animate-in fade-in zoom-in-95 duration-200 origin-top"
                >
                    {suggestions.map((suggestion: string, index: number) => {
                            const isSelected = activeIndex === index;
                            const company = companyNames.get(suggestion);
                            const primaryName = company?.market === "KR" && locale !== "ko"
                                ? (locale === "ja" ? company.japaneseName : undefined) || company.name
                                : (locale === "ko" ? company?.koreanName : undefined) || company?.name || suggestion;
                            const secondaryName = company?.market === "KR"
                                ? (locale === "ko" && company.name !== primaryName ? `${suggestion} · ${company.name}` : suggestion !== primaryName ? suggestion : "")
                                : company ? `${suggestion} · ${company.name}` : "";
                            return (
                                <li
                                    key={index}
                                    id={`${id}-suggestion-${index}`}
                                    data-suggestion-index={index}
                                    role="option"
                                    aria-selected={isSelected}
                                    onMouseDown={event => event.preventDefault()}
                                    onClick={() => executeSearch(suggestion)}
                                    className={cn(
                                        "flex items-center justify-between min-h-11 gap-2 text-sm py-2.5 px-3 cursor-pointer rounded transition-all duration-150 font-medium my-0.5",
                                        isSelected
                                            ? "bg-brand dark:bg-brand text-white font-bold"
                                            : "text-neutral-700 dark:text-neutral-300 hover:bg-surface-muted-hover/70 dark:hover:bg-surface-dark-hover/70 "
                                    )}
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block break-words"><HighlightText text={primaryName} query={query} /></span>
                                        {secondaryName && <span className={cn("mt-0.5 block break-words text-xs", isSelected ? "text-inherit" : "text-neutral-600 dark:text-neutral-400")}>
                                            <HighlightText text={secondaryName} query={query} />
                                        </span>}
                                    </span>

                                    {isSelected && (
                                        <span className="flex items-center gap-0.5 shrink-0 text-xs font-bold opacity-90 font-mono tracking-tight bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                                            <CornerDownLeft className="w-2.5 h-2.5" />
                                            {t("select")}
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                </ul>
            );

    return (
        <div className={cn("relative w-full z-20", className)}>
            {/* 검색 아키텍처 입력 폼 바디 */}
            <div
                data-search-field
                className={cn(
                    "relative flex items-center gap-2.5 w-full px-3.5 py-2 pb-1.5 rounded-xl border transition-colors duration-150",
                    "bg-white dark:bg-surface-dark-card border-neutral-500 dark:border-neutral-500",
                    isFocused
                        ? "bg-white dark:bg-surface-dark-canvas border-brand-ink dark:border-brand-ink ring-2 ring-brand-ink dark:ring-brand-ink"
                        : "hover:border-neutral-600 dark:hover:border-neutral-400"
                )}
            >
                <Search className={cn(
                    "h-4.5 w-4.5 transition-colors duration-200 shrink-0",
                    isFocused ? "text-brand-ink dark:text-brand-ink" : "text-neutral-600 dark:text-neutral-400"
                )} />

                <input
                    ref={inputRef}
                    data-page-input
                    aria-keyshortcuts="/ Escape"
                    title={t("shortcut")}
                    autoFocus={autoFocus}
                    autoComplete="off"
                    enterKeyHint="search"
                    disabled={disabled}
                    placeholder={placeHolder}
                    value={query}
                    role="combobox"
                    aria-label={t("title")}
                    aria-autocomplete="list"
                    aria-expanded={popupOpen}
                    aria-controls={popupOpen ? listboxId : undefined}
                    aria-describedby={statusId}
                    aria-activedescendant={popupOpen && activeIndex >= 0 ? `${id}-suggestion-${activeIndex}` : undefined}
                    onChange={(e) => {
                        const val = e.target.value;
                        setQuery(val);
                        setSelectedIndex(-1);
                        setIsFocused(true);
                        if (onSearchStateChange) onSearchStateChange(isFocused, !val.trim());
                    }}
                    onFocus={() => {
                        setIsFocused(true);
                        if (onSearchStateChange) onSearchStateChange(true, !query.trim());
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                        if (onSearchStateChange) onSearchStateChange(false, !query.trim());
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full min-w-0 min-h-[44px] text-[16px] sm:text-sm bg-transparent focus:outline-none text-neutral-900 dark:text-neutral-100 font-semibold placeholder-neutral-600 dark:placeholder-neutral-400 font-sans tracking-tight"
                />

                {query && (
                    <button
                        onClick={() => {
                            setQuery("");
                            setSelectedIndex(-1);
                            if (onSearchStateChange) onSearchStateChange(isFocused, true);
                            inputRef.current?.focus();
                        }}
                        className={cn(CONTROL_ICON_BUTTON_CLS, "p-1 group")}
                        type="button"
                        aria-label={t("clearQuery")}
                        disabled={disabled}
                    >
                        <X className="h-4 w-4 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors" />
                    </button>
                )}
                <button
                    type="button"
                    aria-label={t("submit")}
                    disabled={!canSearch}
                    onMouseDown={event => event.preventDefault()}
                    onClick={submitSearch}
                    className={PAGE_PRIMARY_ACTION_CLS}
                >
                    {t("search")}
                </button>
            </div>

            <p id={statusId} role="status" aria-atomic="true" className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                {disabled ? t("disabled") : !query.trim()
                    ? selectionRequired ? t("enterThenSelect") : t("enterQuery")
                    : loading ? t("loading")
                    : suggestions.length > 0
                        ? t("suggestions", { count: suggestions.length, instruction: activeIndex >= 0 ? t("activeSuggestion", { stock: target }) : t(selectionRequired ? "chooseSuggestion" : "freeSearch") })
                        : selectionRequired ? t("noMatch") : t("noSuggestions")}
            </p>
            {/* 자동완성 드롭다운 오버레이 슬롯 */}
            {resultsTarget ? createPortal(results, resultsTarget) : results}
        </div>
    );
};

export default SearchAutocomplete;
