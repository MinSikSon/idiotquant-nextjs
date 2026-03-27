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
        <div className="relative w-full group">
            {/* 배경 글로우 효과 (Focus 시 은은하게 빛남) */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500"></div>

            {/* 메인 입력창 컨테이너 */}
            <div className={`relative flex items-center gap-2 w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl transition-all duration-300 shadow-sm group-focus-within:bg-white dark:group-focus-within:bg-zinc-950 group-focus-within:ring-2 group-focus-within:ring-blue-500/30 group-focus-within:shadow-xl`}>
                
                {/* 검색 아이콘 (왼쪽 배치) */}
                <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />

                <div className="relative flex-1 items-center">
                    <input
                        ref={inputRef}
                        autoComplete="off"
                        placeholder={props.placeHolder}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        value={query}
                        className="w-full text-base bg-transparent focus:outline-none dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 font-medium"
                    />
                </div>

                {/* 입력값 지우기 버튼 */}
                {query && (
                    <button 
                        onClick={() => { setQuery(""); setIsFocused(true); inputRef.current?.focus(); }} 
                        className="p-0 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
                        type="button"
                    >
                        <XCircleIcon className="h-5 w-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" />
                    </button>
                )}
            </div>

            {/* 자동완성 드롭다운 (개선된 애니메이션 및 디자인) */}
            {isFocused && suggestions.length > 0 && (
                <ul className="z-[100] absolute top-[calc(100%+8px)] left-0 w-full bg-white/90 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-72 overflow-y-auto overflow-x-hidden p-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b dark:border-zinc-800 mb-1">
                        Suggestions
                    </div>
                    {suggestions.map((suggestion: string, index: number) => (
                        <li
                            key={`suggest-${index}`}
                            onMouseDown={() => executeSearch(suggestion)}
                            className={`group/item flex items-center justify-between text-sm py-3 px-4 cursor-pointer rounded-xl transition-all ${
                                selectedIndex === index
                                    ? "bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30 scale-[1.02]"
                                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-300"
                            }`}
                        >
                            <span>{suggestion}</span>
                            <span className={`text-[10px] opacity-0 group-hover/item:opacity-50 ${selectedIndex === index ? "opacity-100" : ""}`}>
                                ↵ Enter
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchAutocomplete;