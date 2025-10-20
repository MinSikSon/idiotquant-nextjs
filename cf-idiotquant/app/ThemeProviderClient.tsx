
// components/ThemeProviderClient.tsx
"use client";
import { Theme } from "@radix-ui/themes";

export function ThemeProviderClient({ children }: { children: React.ReactNode }) {
    return <Theme className="w-full">{children}</Theme>;
}
