"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

// =========================================================================
// 섹션 네비게이션 타입
// =========================================================================
export interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// =========================================================================
// 섹션 네비게이션 컴포넌트
// =========================================================================
export function SectionNav({ sections }: { sections: NavSection[] }) {
  const [activeId, setActiveId] = useState<string>("");

  const handleNavClick = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  }, []);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.3,
      rootMargin: "-60px 0px -40% 0px",
    };

    const observers: IntersectionObserver[] = [];

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setActiveId(id);
        }
      }, observerOptions);

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach(obs => obs.disconnect());
    };
  }, [sections]);

  return (
    <nav className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {sections.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => handleNavClick(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0",
                activeId === id
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              <span className="shrink-0">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
