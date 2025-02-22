import { useState } from "react";

import validCorpNameArray from "@/public/data/validCorpNameArray.json";

const SearchAutocomplete = () => {
    const items = validCorpNameArray;
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);

    const handleChange = (e: any) => {
        const value = e.target.value;
        setQuery(value);

        if (value.trim() === "") {
            setSuggestions([]);
            return;
        }

        const filtered: any = items.filter((item) =>
            item.toLowerCase().includes(value.toLowerCase())
        );

        setSuggestions(filtered);
    };

    return (
        <div>
            <input type="text" value={query} onChange={handleChange} placeholder="Search..." />
            {suggestions.length > 0 && (
                <ul>
                    {suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchAutocomplete;