"use client";

import { useEffect } from "react";
import { selectTheme, setTheme } from "@/lib/features/control/controlSlice";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { Theme } from "@radix-ui/themes";

export function ThemeProviderClient({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const theme = useAppSelector(selectTheme); // 'light' | 'dark'

    // 1. 초기 마운트 시 브라우저 스토리지 및 시스템 설정 분석하여 Redux 초기화
    useEffect(() => {
        if (typeof window === "undefined") return;

        // 기본값은 다크 — 저장된 선택이 "light"일 때만 라이트로 간다(OS 설정은 보지 않는다).
        // OS를 참조하면 layout.tsx의 선반영 스크립트와 결과가 갈려 화면이 한 번 번쩍인다.
        const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
        const initialTheme: "light" | "dark" = savedTheme === "light" ? "light" : "dark";

        // Redux 스토어 상태 업데이트
        dispatch(setTheme(initialTheme));
    }, [dispatch]);

    // 2. Redux의 테마 상태가 변경될 때마다 HTML 클래스 및 로컬스토리지 동기화
    useEffect(() => {
        if (typeof window === "undefined") return;

        const root = document.documentElement;

        if (theme === "dark") {
            root.classList.add("dark");
            root.style.colorScheme = "dark"; // 브라우저 스크롤바 등 기본 UI도 다크 모드 적용
            localStorage.setItem("theme", "dark");
        } else {
            root.classList.remove("dark");
            root.style.colorScheme = "light";
            localStorage.setItem("theme", "light");
        }
    }, [theme]);

    return (
        <Theme
            appearance={theme}
            accentColor="mint"
            grayColor="gray"
            panelBackground="solid"
            scaling="100%"
            radius="full"
            className="w-full"
        >
            {children}
        </Theme>
    );
}