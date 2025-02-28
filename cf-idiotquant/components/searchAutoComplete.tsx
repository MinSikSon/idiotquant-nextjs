import React, { useState, useMemo, ChangeEvent, KeyboardEvent } from "react";
import { MagnifyingGlassIcon, XCircleIcon } from "@heroicons/react/24/outline";

import validCorpNameArray from "@/public/data/validCorpNameArray.json";
import { Button } from "@material-tailwind/react";
import { DesignButton } from "./designButton";

const SearchAutocomplete = (props: any) => {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // 입력값을 기반으로 자동완성 리스트 필터링
    const suggestions = useMemo(() => {
        if (!query.trim()) return [];
        return validCorpNameArray.filter((item) => item.toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => a.localeCompare(b));
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

    const inputRef = React.useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center m-2 p-2 relative">
            <div className="relative flex-1 items-center">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleChange}
                    onKeyUp={handleKeyDown}
                    placeholder={`회사명을 검색하세요...`}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    className="font-mono w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                {query && (
                    <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2" onClick={handleClear}>
                        <XCircleIcon className="h-5 w-5 text-gray-500" />
                    </button>
                )}
            </div>
            {/* <Button className="py-2 px-2" variant="outlined" onClick={handleSearch}>
                <MagnifyingGlassIcon className="h-5 w-5 text-black" />
            </Button> */}
            <DesignButton
                handleOnClick={() => handleSearch()}
                buttonName={<MagnifyingGlassIcon className="h-6 w-6 text-white" />}
                buttonBgColor="bg-green-400"
                buttonBorderColor="border-green-300"
                buttonShadowColor="#129600"
                textStyle="text-white text-xs pt-0.5 font-bold"
                buttonStyle="rounded-lg px-4 py-1 ml-2"
            />
            {/* <Button className="py-2 px-2" variant="outlined" onClick={handleSearch}>
                <MagnifyingGlassIcon className="h-5 w-5 text-black" />
            </Button> */}
            {isFocused && suggestions.length > 0 && (
                <ul className="z-10 absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            onMouseDown={() => handleSelect(suggestion)}
                            className={`font-mono p-2 cursor-pointer hover:bg-blue-100 ${selectedIndex === index ? "bg-blue-200" : ""
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
