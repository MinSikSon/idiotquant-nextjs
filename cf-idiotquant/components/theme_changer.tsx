"use client";

import { selectTheme, setTheme } from "@/lib/features/control/controlSlice";
import { useAppSelector } from "@/lib/hooks";
import { MoonIcon, SunIcon } from "lucide-react";
import { useDispatch } from "react-redux";

export default function ThemeChanger() {
    const dispatch = useDispatch();
    const theme = useAppSelector(selectTheme)
    return (
        <button className="p-1.5 w-auto md:w-full text-center flex items-center justify-center rounded-xl hover:bg-surface-muted-hover dark:hover:bg-surface-dark-hover transition-colors duration-150"
            onClick={() => dispatch(setTheme(theme == "light" ? "dark" : "light"))}>
            {theme == "dark" ? <MoonIcon className="w-4 h-4"/> : <SunIcon className="w-4 h-4" />}
        </button>
    );
}