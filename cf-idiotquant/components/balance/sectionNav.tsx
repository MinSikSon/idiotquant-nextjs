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
export function SectionNav({
  sections,
  mobileTab,
  onMobileTabChange,
}: {
  sections: NavSection[];
  mobileTab?: string;
  onMobileTabChange?: (id: string) => void;
}) {
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
    <nav className="sticky top-0 z-30 bg-white/90 dark:bg-[#1f1e1b]/90 backdrop-blur-xl border-b border-neutral-200/70 dark:border-[#35332e] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4">

        {/* 모바일 탭바 */}
        <div className="flex md:hidden overflow-x-auto scrollbar-hide">
          {sections.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => onMobileTabChange?.(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-3 text-xs whitespace-nowrap transition-all shrink-0 border-b-2 font-semibold",
                mobileTab === id
                  ? "border-[#16a34a] text-[#16a34a] dark:text-[#4ade80]"
                  : "border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
              )}
            >
              <span className="shrink-0">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* 데스크탑 스크롤 네비 */}
        <div className="hidden md:flex items-center gap-2 overflow-x-auto scrollbar-hide py-3 md:py-4">
          {sections.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => handleNavClick(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all shrink-0",
                activeId === id
                  ? "bg-[#ede8df]/80 dark:bg-[#35332e] text-neutral-900 dark:text-neutral-50 font-semibold"
                  : "font-medium text-neutral-500 dark:text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#2c2b27] hover:text-neutral-900 dark:hover:text-neutral-100"
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
