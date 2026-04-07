"use client";

import { useState, useMemo, KeyboardEvent, useRef, useEffect } from "react";
import { MagnifyingGlassIcon, XCircleIcon } from "@heroicons/react/24/outline";

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

const SearchAutocomplete = (props: any) => {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0); // 기본값을 0으로 설정
    const inputRef = useRef<HTMLInputElement>(null);

    const suggestions = useMemo(() => {
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) return [];
        const disassembledQuery = disassembleHangul(trimmedQuery);
        const queryChosung = getChosung(trimmedQuery);

        const filtered = props.validCorpNameArray.filter((item: string) => {
            const itemLow = item.toLowerCase();
            return itemLow.includes(trimmedQuery) ||
                getChosung(itemLow).includes(queryChosung) ||
                disassembleHangul(itemLow).includes(disassembledQuery);
        });

        const sorted = filtered.sort((a: string, b: string) => {
            const aLow = a.toLowerCase();
            const bLow = b.toLowerCase();
            if (aLow === trimmedQuery) return -1;
            if (bLow === trimmedQuery) return 1;
            if (aLow.startsWith(trimmedQuery) && !bLow.startsWith(trimmedQuery)) return -1;
            if (!aLow.startsWith(trimmedQuery) && bLow.startsWith(trimmedQuery)) return 1;
            return a.length - b.length;
        }).slice(0, 10);

        return sorted;
    }, [query, props.validCorpNameArray]);

    // 검색어가 바뀔 때마다 첫 번째 항목을 자동으로 선택 상태로 만듦
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
        props.onSearchButton(value);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.nativeEvent.isComposing) return;

        if (e.key === "Enter") {
            e.preventDefault();
            // 선택된 인덱스가 있으면 해당 값을, 없으면 입력된 쿼리를 검색
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
        }
    };

    return (
        <div className="relative w-full z-[100]">
            <div className={`relative flex items-center gap-2 w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl transition-all ${isFocused ? "bg-white dark:bg-zinc-950 ring-2 ring-blue-500/30 shadow-lg" : ""}`}>
                <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" />
                <input
                    ref={inputRef}
                    autoComplete="off"
                    placeholder={props.placeHolder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    onKeyDown={handleKeyDown}
                    className="w-full text-base bg-transparent focus:outline-none dark:text-white font-medium"
                />
                {query && (
                    <button onClick={() => setQuery("")} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <XCircleIcon className="h-5 w-5 text-zinc-400" />
                    </button>
                )}
            </div>

            {isFocused && suggestions.length > 0 && (
                <ul className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-72 overflow-y-auto p-2 z-[9999] animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b dark:border-zinc-800 mb-1 flex justify-between">
                        <span>Suggestions</span>
                        {selectedIndex === 0 && <span className="text-blue-500">Auto-selected</span>}
                    </div>
                    {suggestions.map((suggestion: any, index: any) => (
                        <li
                            key={index}
                            onMouseDown={() => executeSearch(suggestion)}
                            className={`flex items-center justify-between text-sm py-3 px-4 cursor-pointer rounded-xl transition-all ${selectedIndex === index
                                    ? "bg-blue-600 text-white font-bold shadow-md scale-[1.01]"
                                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-300"
                                }`}
                        >
                            <span>{suggestion}</span>
                            {selectedIndex === index && <span className="text-[10px] opacity-70">↵ Enter</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchAutocomplete;