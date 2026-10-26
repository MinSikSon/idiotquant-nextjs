"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Keep both views mounted so switching never resets selections or pending edits. */
export default function TradingMobileWorkspace({ overview, children }: { overview: ReactNode; children: ReactNode }) {
  const [view, setView] = useState<"stocks" | "overview">("stocks");
  const id = useId();

  return (
    <div>
      <nav aria-label="자동매매 화면" className="mb-1.5 flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800 md:hidden">
        {([ ["stocks", "종목 관리"], ["overview", "예산·현황"] ] as const).map(([key, label]) => (
          <button key={key} type="button" aria-pressed={view === key} aria-controls={`${id}-${key}`} onClick={() => setView(key)} className={cn("min-h-11 flex-1 rounded-lg px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500", view === key ? "bg-white text-blue-600 shadow-sm dark:bg-neutral-700 dark:text-blue-300" : "text-neutral-500 dark:text-neutral-400")}>
            {label}
          </button>
        ))}
      </nav>
      <div id={`${id}-overview`} className={cn(view !== "overview" && "hidden md:block")} onClick={event => {
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#trading-pool-"]');
        if (!link) return;
        event.preventDefault();
        setView("stocks");
        requestAnimationFrame(() => document.getElementById(link.hash.slice(1))?.scrollIntoView({ block: "start" }));
      }}>
        {overview}
      </div>
      <div id={`${id}-stocks`} className={cn(view !== "stocks" && "hidden md:block")}>{children}</div>
    </div>
  );
}
