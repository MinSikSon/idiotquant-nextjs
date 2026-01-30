import { useState, useMemo, ChangeEvent, KeyboardEvent, useRef } from "react";
import { MagnifyingGlassIcon, XCircleIcon } from "@heroicons/react/24/outline";

const SearchAutocomplete = (props: any) => {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // 입력값을 기반으로 자동완성 리스트 필터링
    const suggestions = useMemo(() => {
        if (!query.trim()) return [];
        return props.validCorpNameArray.filter((item: any) => item.toLowerCase().includes(query.toLowerCase()))
            .sort((a: any, b: any) => a.localeCompare(b));
    }, [query]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setSelectedIndex(-1); // 새로운 입력 시 선택 인덱스 초기화
        setIsFocused(true); // 입력 시 자동완성 활성화
    };

    const handleSelect = (value: string) => {
        setQuery(value);
        setSelectedIndex(-1);
        setIsFocused(false);

        props.onSearchButton(value);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            setSelectedIndex((prev) =>
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === "ArrowUp") {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0) {
                handleSelect(suggestions[selectedIndex]);
            } else if (suggestions.length > 0) {
                handleSelect(suggestions[0]);
            }
        } else if (e.key === "Escape") {
            setIsFocused(false);
        }
    };

    const handleSearch = () => {
        if (suggestions.length > 0) {
            handleSelect(suggestions[0]);
        }
    };

    const handleClear = () => {
        setQuery("");
        setSelectedIndex(-1);
        setIsFocused(false);
        inputRef.current?.focus(); // input에 포커스 이동
    };

    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center relative gap-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-black dark:text-white">
            <div className="relative flex-1 items-center w-full">
                <input placeholder={props.placeHolder}
                    onChange={handleChange}
                    onKeyUp={(e) => {
                        if (isFocused) {
                            handleKeyDown(e)
                        }
                    }}
                    value={query}
                    className="w-full text-base"
                >
                </input>
                {query && (
                    <div
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-0"
                    >
                        <button
                            onClick={handleClear}
                        >
                            {/* <button className="dark:bg-black dark:text-white absolute right-2 top-1/2 transform -translate-y-1/2 p-2" onClick={handleClear}> */}
                            <XCircleIcon className="dark:bg-black dark:text-white h-6 w-6 text-gray-500 pt-1" />
                            {/* </button> */}
                        </button>
                    </div>
                )}
            </div>
            <button
                // variant="outline"
                onClick={() => handleSearch()}
            >
                <MagnifyingGlassIcon width="16" height="16" />
            </button>
            {isFocused && suggestions.length > 0 && (
                <ul className="z-10 absolute top-10 left-2 w-10/12 ml-4 mt-0 bg-white dark:bg-black border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((suggestion: any, index: any) => (
                        <li
                            key={index}
                            onMouseDown={() => handleSelect(suggestion)}
                            className={`text-base py-2 pl-3 dark:text-white cursor-pointer hover:bg-blue-100 ${selectedIndex === index ? "bg-blue-200" : ""
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
