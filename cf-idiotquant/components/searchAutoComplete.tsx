"use client";

import { createPortal } from "react-dom";
import { useState, useMemo, KeyboardEvent, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CONTROL_ICON_BUTTON_CLS } from "@/lib/ui-controls";
import { PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { buildStockSearchIndex, findStockSuggestions, type StockSearchName } from "@/lib/utils/stockSuggestions";
import { Search, CornerDownLeft, AlertCircle, X } from "lucide-react";

interface SearchAutocompleteProps {
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

const SearchAutocomplete = ({ resultsTarget, value, onQueryChange, className, validCorpNameArray, stockNames, onSearchButton, placeHolder, onSearchStateChange, autoFocus = false, onEscape }: SearchAutocompleteProps) => {
    const [localQuery, setLocalQuery] = useState("");
    const query = value ?? localQuery;
    const setQuery = (next: string) => {
        setLocalQuery(next);
        onQueryChange?.(next);
    };
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLUListElement>(null);

    const searchIndex = useMemo(() => buildStockSearchIndex(validCorpNameArray, stockNames), [validCorpNameArray, stockNames]);
    const companyNames = useMemo(() => new Map(stockNames?.map(stock => [stock.symbol, stock])), [stockNames]);
    const suggestions = useMemo(() => findStockSuggestions(searchIndex, query), [query, searchIndex]);

    useEffect(() => {
        if (suggestions.length > 0) {
            setSelectedIndex(0);
        } else {
            setSelectedIndex(-1);
        }
    }, [suggestions]);

    // 키보드 선택은 목록 안에서만 스크롤한다. 페이지나 고정 헤더는 움직이지 않는다.
    useEffect(() => {
        if (selectedIndex >= 0 && dropdownRef.current) {
            const activeElement = dropdownRef.current.querySelector<HTMLElement>(`#suggestion-${selectedIndex}`);
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

    const executeSearch = (value: string) => {
        if (!value) return;
        setQuery(value);
        setIsFocused(false);
        if (onSearchStateChange) onSearchStateChange(false, !value.trim());
        onSearchButton(value);
        inputRef.current?.blur();
    };

    const submitSearch = () => {
        const target = (selectedIndex >= 0 && suggestions[selectedIndex]) ? suggestions[selectedIndex] : query;
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
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (suggestions.length === 0) return;
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === "Escape") {
            e.preventDefault();
            setIsFocused(false);
            if (onSearchStateChange) onSearchStateChange(false, !query.trim());
            inputRef.current?.blur();
            onEscape?.();
        }
    };

    const popupOpen = isFocused && !!query.trim();

    const results = popupOpen && (
                <ul
                    ref={dropdownRef}
                    id="search-listbox"
                    role="listbox"
                    aria-label="종목 검색 결과"
                    className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-surface-dark-card border border-neutral-200 dark:border-border-subtle-dark/80 rounded-xl shadow-sm max-h-[min(19rem,40dvh)] overflow-y-auto overscroll-contain touch-pan-y p-1.5 z-[70] animate-in fade-in zoom-in-95 duration-200 origin-top"
                >
                    {suggestions.length > 0 ? (
                        suggestions.map((suggestion: string, index: number) => {
                            const isSelected = selectedIndex === index;
                            const company = companyNames.get(suggestion);
                            return (
                                <li
                                    key={index}
                                    id={`suggestion-${index}`}
                                    role="option"
                                    aria-selected={isSelected}
                                    onMouseDown={() => executeSearch(suggestion)}
                                    className={cn(
                                        "flex items-center justify-between text-xs py-2.5 px-3 cursor-pointer rounded-xl transition-all duration-150 font-medium my-0.5",
                                        isSelected
                                            ? "bg-brand dark:bg-brand text-white font-bold shadow-sm translate-x-0.5"
                                            : "text-neutral-700 dark:text-neutral-300 hover:bg-surface-muted-hover/70 dark:hover:bg-surface-dark-hover/70 "
                                    )}
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate"><HighlightText text={company?.koreanName || company?.name || suggestion} query={query} /></span>
                                        {company && <span className={cn("mt-0.5 block truncate text-[11px]", isSelected ? "text-inherit" : "text-neutral-600 dark:text-neutral-400")}>
                                            <HighlightText text={`${suggestion} · ${company.name}`} query={query} />
                                        </span>}
                                    </span>

                                    {isSelected && (
                                        <span className="flex items-center gap-0.5 text-[9px] font-bold opacity-90 font-mono tracking-tight bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                                            <CornerDownLeft className="w-2.5 h-2.5" />
                                            선택
                                        </span>
                                    )}
                                </li>
                            );
                        })
                    ) : (
                        /* 결과물이 매칭되지 않을 경우 폴백 안내 카드 */
                        <div className="py-6 px-4 flex flex-col items-center justify-center gap-1.5 text-center text-neutral-600 dark:text-neutral-400">
                            <AlertCircle size={16} className="text-neutral-600 dark:text-neutral-400" />
                            <div className="text-xs font-bold tracking-tight">매칭된 자산 데이터가 없습니다</div>
                            <div className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 max-w-[240px]">
                                국내·미국 종목명으로 찾거나, 정확한 종목코드·티커를 입력하고 엔터를 눌러 조회하세요.
                            </div>
                        </div>
                    )}
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
                    title="/ 검색창으로 이동 · Esc 입력 종료"
                    autoFocus={autoFocus}
                    autoComplete="off"
                    placeholder={placeHolder}
                    value={query}
                    role="combobox"
                    aria-label="종목 검색"
                    aria-autocomplete="list"
                    aria-expanded={popupOpen}
                    aria-controls={popupOpen ? "search-listbox" : undefined}
                    aria-activedescendant={popupOpen && selectedIndex >= 0 && suggestions[selectedIndex] ? `suggestion-${selectedIndex}` : undefined}
                    onChange={(e) => {
                        const val = e.target.value;
                        setQuery(val);
                        if (onSearchStateChange) onSearchStateChange(isFocused, !val.trim());
                    }}
                    onFocus={() => {
                        setIsFocused(true);
                        if (onSearchStateChange) onSearchStateChange(true, !query.trim());
                    }}
                    onBlur={() => {
                        // 드롭다운 항목 마우스 다운 이벤트를 보장하기 위한 딜레이 조정
                        setTimeout(() => {
                            setIsFocused(false);
                            if (onSearchStateChange) onSearchStateChange(false, !query.trim());
                        }, 200);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full min-w-0 min-h-[44px] text-[16px] sm:text-sm bg-transparent focus:outline-none text-neutral-900 dark:text-neutral-100 font-semibold placeholder-neutral-600 dark:placeholder-neutral-400 font-sans tracking-tight"
                />

                {query && (
                    <button
                        onClick={() => {
                            setQuery("");
                            if (onSearchStateChange) onSearchStateChange(isFocused, true);
                            inputRef.current?.focus();
                        }}
                        className={cn(CONTROL_ICON_BUTTON_CLS, "p-1 group")}
                        type="button"
                        aria-label="검색어 초기화"
                    >
                        <X className="h-4 w-4 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors" />
                    </button>
                )}
                <button
                    type="button"
                    aria-label="종목 검색 실행"
                    disabled={!query.trim()}
                    onMouseDown={event => event.preventDefault()}
                    onClick={submitSearch}
                    className={PAGE_PRIMARY_ACTION_CLS}
                >
                    검색
                </button>
            </div>

            {/* 자동완성 드롭다운 오버레이 슬롯 */}
            {resultsTarget ? createPortal(results, resultsTarget) : results}
        </div>
    );
};

export default SearchAutocomplete;
