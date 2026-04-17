
// components/ThemeProviderClient.tsx
"use client";
import { selectTheme } from "@/lib/features/control/controlSlice";
import { useAppSelector } from "@/lib/hooks";
import { Theme } from "@radix-ui/themes";

export function ThemeProviderClient({ children }: { children: React.ReactNode }) {
    const theme = useAppSelector(selectTheme);

    return <Theme
        appearance={theme}
        accentColor="mint"
        grayColor="gray"
        panelBackground="solid"
        scaling="100%"
        radius="full"
        className="w-full"
    >{children}</Theme>;
}
