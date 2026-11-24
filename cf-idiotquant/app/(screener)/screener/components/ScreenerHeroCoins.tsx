"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const HeroCoinRain = dynamic(() => import("@/components/hero-coin-rain"), { ssr: false });
const DESKTOP = "(min-width: 768px)";

function subscribe(onChange: () => void) {
    const query = window.matchMedia(DESKTOP);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

export function ScreenerHeroCoins({ className }: { className?: string }) {
    const desktop = useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false);
    if (!desktop) return null;
    return <div className={className}><HeroCoinRain coinScale={0.7} /></div>;
}
