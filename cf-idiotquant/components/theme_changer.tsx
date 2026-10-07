"use client";

import { selectTheme, setTheme } from "@/lib/features/control/controlSlice";
import { useAppSelector } from "@/lib/hooks";
import { MoonIcon, SunIcon } from "lucide-react";
import { useDispatch } from "react-redux";

export default function ThemeChanger({ compact = false }: { compact?: boolean }) {
    const dispatch = useDispatch();
    const theme = useAppSelector(selectTheme)
    return (
        <button
            type="button"
            aria-label={theme === "dark" ? "라이트 모드로 변경" : "다크 모드로 변경"}
            className={`${compact ? "h-9 w-9" : "w-auto md:w-full"} p-1.5 text-center flex items-center justify-center rounded-xl hover:bg-surface-muted-hover dark:hover:bg-surface-dark-hover transition-colors duration-150`}
            onClick={() => dispatch(setTheme(theme == "light" ? "dark" : "light"))}>
            {theme == "dark" ? <MoonIcon className="w-4 h-4"/> : <SunIcon className="w-4 h-4" />}
        </button>
    );
}
