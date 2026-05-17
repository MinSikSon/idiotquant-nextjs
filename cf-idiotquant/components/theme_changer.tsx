"use client";

import { selectTheme, setTheme } from "@/lib/features/control/controlSlice";
import { useAppSelector } from "@/lib/hooks";
import { MoonIcon, SunIcon } from "lucide-react";
import { useDispatch } from "react-redux";

export default function ThemeChanger() {
    const dispatch = useDispatch();
    const theme = useAppSelector(selectTheme)
    return (
        <button className="p-1 w-36 md:w-full lg:w-full text-center"
            onClick={() => dispatch(setTheme(theme == "light" ? "dark" : "light"))}>
            {theme == "dark" ? <MoonIcon className="w-4 h-4"/> : <SunIcon className="w-4 h-4" />}
        </button>
    );
}