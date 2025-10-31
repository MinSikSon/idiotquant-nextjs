"use client";

import { selectTheme, setTheme } from "@/lib/features/control/controlSlice";
import { useAppSelector } from "@/lib/hooks";
import { useDispatch } from "react-redux";

export default function ThemeChanger() {
    const dispatch = useDispatch();
    const theme = useAppSelector(selectTheme)
    return (
        <button className="bg-white dark:bg-black p-1 w-36 md:w-full lg:w-full border dark:border-gray-600 rounded-lg text-center hover:bg-gray-700 hover:dark:bg-gray-100"
            onClick={() => dispatch(setTheme(theme == "light" ? "dark" : "light"))}>
            {theme == "dark" ? "🌙" : "☀️"}
        </button>
    );
}