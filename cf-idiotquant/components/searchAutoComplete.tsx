import { useState, useMemo, ChangeEvent, KeyboardEvent, useRef } from "react";
import { MagnifyingGlassIcon, XCircleIcon } from "@heroicons/react/24/outline";

// [1] 한글 자소 분리 및 초성 추출 함수
const getChosung = (str: string) => {
    const CHO = [
        'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
    ];
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
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    // [2] 검색 엔진 로직 (초성 검색 지원)
    const suggestions = useMemo(() => {
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) return [];

        const disassembledQuery = disassembleHangul(trimmedQuery);
        const queryChosung = getChosung(trimmedQuery);

        // 필터링 로직
        const filtered = props.validCorpNameArray.filter((item: string) => {
            const itemLow = item.toLowerCase();
            const itemChosung = getChosung(itemLow);
            const itemDisassembled = disassembleHangul(itemLow);

            return (
                itemLow.includes(trimmedQuery) ||         // 1. 일반 포함 (삼성전자)
                itemChosung.includes(queryChosung) ||     // 2. 초성 포함 (ㅅㅅㅈㅈ)
                itemDisassembled.includes(disassembledQuery) // 3. 자소 포함 (삼성저)
            );
        });

        // 정렬 로직 (정확도 순)
        return filtered.sort((a: string, b: string) => {
            const aLow = a.toLowerCase();
            const bLow = b.toLowerCase();

            // 1순위: 검색어와 완전히 일치
            if (aLow === trimmedQuery) return -1;
            if (bLow === trimmedQuery) return 1;

            // 2순위: 검색어로 시작하는가
            const aStarts = aLow.startsWith(trimmedQuery) || getChosung(aLow).startsWith(queryChosung);
            const bStarts = bLow.startsWith(trimmedQuery) || getChosung(bLow).startsWith(queryChosung);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            // 3순위: 글자 길이 (짧을수록 연관도 높음)
            return a.length - b.length;
        });
    }, [query, props.validCorpNameArray]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setSelectedIndex(-1);
        setIsFocused(true);
    };

    const executeSearch = (value: string) => {
        const targetValue = value.trim();
        if (!targetValue) return;

        setQuery(targetValue);
        setSelectedIndex(-1);
        setIsFocused(false);
        inputRef.current?.blur();
        props.onSearchButton(targetValue);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.nativeEvent.isComposing) return;

        if (e.key === "Enter") {
            e.preventDefault();
            const bestMatch = selectedIndex >= 0 ? suggestions[selectedIndex] : suggestions[0];
            if (bestMatch) {
                executeSearch(bestMatch);
            } else if (query.trim()) {
                executeSearch(query.trim());
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => prev < suggestions.length - 1 ? prev + 1 : prev);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Escape") {
            setIsFocused(false);
        }
    };

    return (
        <div className="flex items-center relative gap-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 dark:border-zinc-800 dark:bg-black dark:text-white">
            <div className="relative flex-1 items-center w-full">
                <input
                    ref={inputRef}
                    autoComplete="off"
                    placeholder={props.placeHolder}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    value={query}
                    className="w-full text-lg bg-transparent focus:outline-none dark:text-white"
                />
                {query && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <button onClick={() => setQuery("")} type="button">
                            <XCircleIcon className="h-6 w-6 text-gray-400 hover:text-gray-600" />
                        </button>
                    </div>
                )}
            </div>
            <button
                onClick={() => executeSearch(suggestions[0] || query)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                type="button"
            >
                <MagnifyingGlassIcon width="20" height="20" className="text-gray-500 dark:text-zinc-400" />
            </button>

            {isFocused && suggestions.length > 0 && (
                <ul className="z-[100] absolute top-full left-0 w-full mt-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl max-h-60 overflow-auto">
                    {suggestions.map((suggestion: string, index: number) => (
                        <li
                            key={index}
                            onMouseDown={() => executeSearch(suggestion)}
                            className={`text-md py-3 px-4 cursor-pointer transition-colors dark:text-white ${selectedIndex === index
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold"
                                    : "hover:bg-gray-50 dark:hover:bg-zinc-800"
                                }`}
                        >
                            {suggestion}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchAutocomplete;