
// components/ThemeProviderClient.tsx
"use client";
import { Theme } from "@radix-ui/themes";

export function ThemeProviderClient({ children }: { children: React.ReactNode }) {
    return <Theme
        accentColor="mint"
        grayColor="gray"
        panelBackground="solid"
        scaling="100%"
        radius="full"
        className="w-full"
    >{children}</Theme>;
}
