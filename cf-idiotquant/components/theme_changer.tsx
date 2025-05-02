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
        <button className="p-1 m-2 w-36 border rounded-xl text-center border-black dark:border-white" onClick={handleThemeChange}>
            {toggleTheme === false ? "☀️" : "🌙"}
        </button>
    );
}