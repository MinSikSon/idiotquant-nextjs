"use client";

import { useState, useMemo, KeyboardEvent, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Search, CornerDownLeft, Sparkles, AlertCircle, X } from "lucide-react";

interface SearchAutocompleteProps {
    validCorpNameArray: string[];
    onSearchButton: (value: string) => void;
    placeHolder?: string;
    onSearchStateChange?: (focused: boolean, isEmpty: boolean) => void;
}

const getChosung = (str: string) => {
    const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i) - 44032;
        if (code > -1 && code < 11172) {
            const choIdx = Math.floor(code / 588);
            result += CHO[choIdx];
        } else {
            result += str.charAt(i);
        }
    }
    return result;
};

const disassembleHangul = (str: string) => {
    const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    const JOONG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
    const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    let result = "";
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i) - 44032;
        if (code > -1 && code < 11172) {
            const choIdx = Math.floor(code / 588);
            const joongIdx = Math.floor((code % 588) / 28);
            const jongIdx = code % 28;
            result += CHO[choIdx] + JOONG[joongIdx] + (JONG[jongIdx] || "");
        } else {
            result += str.charAt(i);
        }
    }
    return result.toLowerCase();
};

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
                    <mark key={index} className="bg-blue-100 text-blue-800 dark:bg-indigo-950/80 dark:text-indigo-300 font-bold px-0.5 rounded-xs">
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                )
            )}
        </span>
    );
};

const SearchAutocomplete = ({ validCorpNameArray, onSearchButton, placeHolder, onSearchStateChange }: SearchAutocompleteProps) => {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLUListElement>(null);

    const suggestions = useMemo(() => {
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) return [];
        const disassembledQuery = disassembleHangul(trimmedQuery);
        const queryChosung = getChosung(trimmedQuery);

        const filtered = validCorpNameArray.filter((item: string) => {
            const itemLow = item.toLowerCase();
            return itemLow.includes(trimmedQuery) ||
                getChosung(itemLow).includes(queryChosung) ||
                disassembleHangul(itemLow).includes(disassembledQuery);
        });

        return filtered.sort((a: string, b: string) => {
            const aLow = a.toLowerCase();
            const bLow = b.toLowerCase();
            if (aLow === trimmedQuery) return -1;
            if (bLow === trimmedQuery) return 1;
            if (aLow.startsWith(trimmedQuery) && !bLow.startsWith(trimmedQuery)) return -1;
            if (!aLow.startsWith(trimmedQuery) && bLow.startsWith(trimmedQuery)) return 1;
            return a.length - b.length;
        }).slice(0, 10);
    }, [query, validCorpNameArray]);

    useEffect(() => {
        if (suggestions.length > 0) {
            setSelectedIndex(0);
        } else {
            setSelectedIndex(-1);
        }
    }, [suggestions]);

    // 스크롤 포커싱 추적: 선택된 아이템이 드롭다운 가시영역을 벗어나면 자동 스크롤
    useEffect(() => {
        if (selectedIndex >= 0 && dropdownRef.current) {
            const activeElement = dropdownRef.current.children[selectedIndex + 1] as HTMLElement; // 헤더 디브 오프셋 감안
            if (activeElement) {
                const container = dropdownRef.current;
                const activeTop = activeElement.offsetTop;
                const activeBottom = activeTop + activeElement.offsetHeight;
                const containerTop = container.scrollTop + 40; // 헤더 높이만큼 버퍼링
                const containerBottom = containerTop + container.clientHeight;

                if (activeTop < containerTop) {
                    container.scrollTop = activeTop - 40;
                } else if (activeBottom > containerBottom) {
                    container.scrollTop = activeBottom - container.clientHeight;
                }
            }
        }
    }, [selectedIndex]);

    const executeSearch = (value: string) => {
        if (!value) return;
        setQuery(value);
        setIsFocused(false);
        if (onSearchStateChange) onSearchStateChange(false, !value.trim());
        onSearchButton(value);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // 한글 입력기(IME) 조합 중 엔터 처리가 더블 트리거되는 버그 차단
        if (e.nativeEvent.isComposing) return;

        if (e.key === "Enter") {
            e.preventDefault();
            const target = (selectedIndex >= 0 && suggestions[selectedIndex]) ? suggestions[selectedIndex] : query;
            executeSearch(target);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (suggestions.length === 0) return;
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (suggestions.length === 0) return;
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === "Escape") {
            setIsFocused(false);
            if (onSearchStateChange) onSearchStateChange(false, !query.trim());
            inputRef.current?.blur();
        }
    };

    return (
        <div className="relative w-full z-[60]">
            {/* 검색 아키텍처 입력 폼 바디 */}
            <div 
                className={cn(
                    "relative flex items-center gap-2.5 w-full px-3.5 py-2 pb-1.5 rounded-2xl border transition-all duration-300 ease-in-out",
                    "bg-stone-100/90 dark:bg-[#111111]/90 border-neutral-200/60 dark:border-[#2a2a2a]/60 backdrop-blur-md",
                    isFocused 
                        ? "bg-white dark:bg-[#0d0d0d] border-blue-500/80 dark:border-indigo-500/80 ring-4 ring-blue-500/10 dark:ring-indigo-500/10 shadow-lg" 
                        : "hover:border-neutral-300 dark:hover:border-neutral-700"
                )}
            >
                <Search className={cn(
                    "h-4.5 w-4.5 transition-colors duration-200 shrink-0",
                    isFocused ? "text-blue-500 dark:text-indigo-400" : "text-neutral-400 dark:text-neutral-500"
                )} />
                
                <input
                    ref={inputRef}
                    autoComplete="off"
                    placeholder={placeHolder}
                    value={query}
                    role="combobox"
                    aria-label="종목 검색"
                    aria-autocomplete="list"
                    aria-expanded={isFocused && suggestions.length > 0}
                    aria-controls="search-listbox"
                    aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
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
                    className="w-full text-[16px] sm:text-sm bg-transparent focus:outline-none text-neutral-900 dark:text-neutral-100 font-semibold placeholder-neutral-400 dark:placeholder-neutral-600 font-sans tracking-tight"
                />
                
                {query && (
                    <button
                        onClick={() => {
                            setQuery("");
                            if (onSearchStateChange) onSearchStateChange(isFocused, true);
                            inputRef.current?.focus();
                        }}
                        className="p-1 hover:bg-neutral-200/60 dark:hover:bg-[#2a2a2a]/60 rounded-lg transition-colors shrink-0 group"
                        type="button"
                        aria-label="검색어 초기화"
                    >
                        <X className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                    </button>
                )}
            </div>

            {/* 자동완성 드롭다운 오버레이 슬롯 */}
            {isFocused && query.trim() && (
                <ul
                    ref={dropdownRef}
                    id="search-listbox"
                    role="listbox"
                    aria-label="종목 검색 결과"
                    className="absolute top-full mt-2 left-0 w-full bg-white/95 dark:bg-[#0d0d0d]/95 backdrop-blur-xl border border-neutral-200 dark:border-[#2a2a2a]/80 rounded-2xl shadow-2xl max-h-76 overflow-y-auto p-1.5 z-[70] animate-in fade-in zoom-in-95 duration-200 origin-top no-scrollbar"
                >
                    {/* 상단 라벨링 정보 바 */}
                    <div className="px-2.5 py-1.5 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest border-b border-neutral-100 dark:border-[#2a2a2a]/50 mb-1 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-[#0d0d0d]/90 backdrop-blur-md z-10">
                        <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-500 dark:text-indigo-400" />
                            퀀트 인텔리전스 추천
                        </span>
                        {suggestions.length > 0 && selectedIndex >= 0 && (
                            <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 font-mono">
                                {selectedIndex + 1} / {suggestions.length}
                            </span>
                        )}
                    </div>

                    {suggestions.length > 0 ? (
                        suggestions.map((suggestion: string, index: number) => {
                            const isSelected = selectedIndex === index;
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
                                            ? "bg-blue-600 dark:bg-indigo-600 text-white font-bold shadow-sm translate-x-0.5"
                                            : "text-neutral-700 dark:text-neutral-300 hover:bg-stone-100/70 dark:hover:bg-[#1f1f1f]/70 hover:translate-x-0.5"
                                    )}
                                >
                                    <span className="truncate">
                                        {isSelected ? suggestion : <HighlightText text={suggestion} query={query} />}
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
                        <div className="py-6 px-4 flex flex-col items-center justify-center gap-1.5 text-center text-neutral-400 dark:text-neutral-500">
                            <AlertCircle size={16} className="text-neutral-300 dark:text-neutral-700" />
                            <div className="text-xs font-bold tracking-tight">매칭된 자산 데이터가 없습니다</div>
                            <div className="text-[10px] font-medium text-neutral-400/80 max-w-[240px]">
                                국문 정식 사명이나 영문 티커 코드가 올바른지 확인 후 엔터를 눌러 강제 검색하세요.
                            </div>
                        </div>
                    )}
                </ul>
            )}
        </div>
    );
};

export default SearchAutocomplete;