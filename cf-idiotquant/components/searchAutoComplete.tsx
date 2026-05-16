"use client";

import { useState, useMemo, KeyboardEvent, useRef, useEffect } from "react";
import { MagnifyingGlassIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Search, CornerDownLeft, Sparkles, AlertCircle } from "lucide-react";

interface SearchAutocompleteProps {
    validCorpNameArray: string[];
    onSearchButton: (value: string) => void;
    placeHolder?: string;
    onSearchStateChange?: (focused: boolean, isEmpty: boolean) => void; // 🔥 단일 콜백으로 가독성 및 정합성 고도화
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

const SearchAutocomplete = ({ validCorpNameArray, onSearchButton, placeHolder, onSearchStateChange }: SearchAutocompleteProps) => {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

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

    const executeSearch = (value: string) => {
        if (!value) return;
        setQuery(value);
        setIsFocused(false);
        if (onSearchStateChange) onSearchStateChange(false, !value.trim());
        onSearchButton(value);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.nativeEvent.isComposing) return;

        if (e.key === "Enter") {
            e.preventDefault();
            const target = (selectedIndex >= 0 && suggestions[selectedIndex]) ? suggestions[selectedIndex] : query;
            executeSearch(target);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Escape") {
            setIsFocused(false);
            if (onSearchStateChange) onSearchStateChange(false, !query.trim());
            inputRef.current?.blur();
        }
    };

    return (
        <div className="relative w-full z-[60]">
            {/* 검색창 본체 */}
            <div 
                className={cn(
                    "relative flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl border transition-all duration-300 ease-in-out",
                    "bg-zinc-100/80 dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md",
                    isFocused 
                        ? "bg-white dark:bg-zinc-950 border-blue-500/80 dark:border-indigo-500/80 ring-4 ring-blue-500/10 dark:ring-indigo-500/10 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)]" 
                        : "hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
            >
                <Search className={cn(
                    "h-5 w-5 transition-colors duration-200 shrink-0",
                    isFocused ? "text-blue-500 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500"
                )} />
                
                <input
                    ref={inputRef}
                    autoComplete="off"
                    placeholder={placeHolder}
                    value={query}
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
                        setTimeout(() => {
                            setIsFocused(false);
                            if (onSearchStateChange) onSearchStateChange(false, !query.trim());
                        }, 220);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full text-base bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100 font-semibold placeholder-zinc-400 dark:placeholder-zinc-600 font-sans tracking-tight"
                />
                
                {query && (
                    <button 
                        onClick={() => {
                            setQuery("");
                            if (onSearchStateChange) onSearchStateChange(isFocused, true);
                        }} 
                        className="p-1 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 rounded-xl transition-colors shrink-0 group"
                        type="button"
                    >
                        <XCircleIcon className="h-5 w-5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                    </button>
                )}
            </div>

            {/* 자동완성 드롭다운 팝업 리스트 */}
            {isFocused && suggestions.length > 0 && (
                <ul className="absolute top-full mt-2 left-0 w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-2xl max-h-80 overflow-y-auto p-2 z-[70] animate-in fade-in zoom-in-95 duration-200 origin-top">
                    {/* 타이틀 헤더 라인 */}
                    <div className="px-3 py-2 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900 mb-1.5 flex justify-between items-center">
                        <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-blue-500 dark:text-indigo-400" />
                            Autocomplete Suggestions
                        </span>
                        {selectedIndex === 0 && (
                            <span className="text-[9px] font-bold text-blue-600 dark:text-indigo-400 bg-blue-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-blue-200/20 dark:border-indigo-900/30">
                                Auto Match
                            </span>
                        )}
                    </div>

                    {/* 제안 아이템 매핑 */}
                    {suggestions.map((suggestion: string, index: number) => {
                        const isSelected = selectedIndex === index;
                        return (
                            <li
                                key={index}
                                onMouseDown={() => executeSearch(suggestion)}
                                className={cn(
                                    "flex items-center justify-between text-sm py-3 px-4 cursor-pointer rounded-xl transition-all duration-150 font-medium",
                                    isSelected
                                        ? "bg-blue-600 dark:bg-indigo-600 text-white font-bold shadow-md shadow-blue-500/20 dark:shadow-indigo-600/20 translate-x-0.5"
                                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70 hover:translate-x-0.5"
                                )}
                            >
                                <span className="truncate">{suggestion}</span>
                                
                                {isSelected && (
                                    <span className="flex items-center gap-1 text-[9px] font-bold opacity-80 font-mono tracking-tight bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md animate-fade-in">
                                        <CornerDownLeft className="w-2.5 h-2.5" />
                                        Enter
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default SearchAutocomplete;