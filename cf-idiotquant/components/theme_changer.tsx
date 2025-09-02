"use client";

import { useCallback } from "react";

interface ThemeChangerProps {
    handleOpen: any;
    toggleTheme: boolean;
    setToggleTheme: any;
}

export default function ThemeChanger(props: ThemeChangerProps) {
    const handleThemeChange = useCallback(() => {
        const theme = document.cookie.includes("theme=light") ? "dark" : "light";
        document.cookie = `theme=${theme}; path=/`;
        document.body.classList.toggle("dark");
        props.setToggleTheme(!props.toggleTheme);
        props.handleOpen();
    }, []);

    return (
        <button className="bg-white dark:bg-black p-1 w-36 md:w-full lg:w-full border dark:border-gray-600 rounded-lg text-center hover:bg-gray-700 hover:dark:bg-gray-100" onClick={handleThemeChange}>
            {props.toggleTheme === false ? "🌙" : "☀️"}
        </button>
    );
}