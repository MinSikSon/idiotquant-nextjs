"use client";

import { useCallback, useState } from "react";

export default function ThemeChanger() {
    const [toggleTheme, setToggleTheme] = useState(false);
    const handleThemeChange = useCallback(() => {
        const theme = document.cookie.includes("theme=light") ? "dark" : "light";
        document.cookie = `theme=${theme}; path=/`;
        document.body.classList.toggle("dark");
        setToggleTheme((prev) => !prev);
    }, []);

    return (
        <button className="bg-white dark:bg-black p-1 w-36 md:w-full lg:w-full border dark:border-gray-600 rounded-lg text-center hover:bg-gray-100 hover:dark:bg-gray-700" onClick={handleThemeChange}>
            {toggleTheme === false ? "☀️" : "🌙"}
        </button>
    );
}