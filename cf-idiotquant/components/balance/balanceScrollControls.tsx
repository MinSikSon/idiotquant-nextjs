"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useMobilePageHeader } from "@/components/mobile-page-header";
import { NavigationPopover } from "@/components/navigation-popover";
import { CONTROL_FOCUS_CLS } from "@/lib/ui-controls";

export function BalanceScrollControls({ label, children }: { label: string; children: ReactNode }) {
  const slots = useMobilePageHeader();
  const anchor = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const element = anchor.current;
    const header = document.querySelector<HTMLElement>("[data-navigation-header]");
    if (!element || !header) return;
    const mobile = window.matchMedia("(max-width: 767px)");
    const update = () => setScrolled(mobile.matches && element.getBoundingClientRect().bottom <= header.getBoundingClientRect().bottom);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    observer.observe(header);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return <>
    <div ref={anchor} data-balance-controls className="flex flex-col gap-3">{children}</div>
    {scrolled && slots?.infoTarget && createPortal(
      <NavigationPopover label="국가·계좌 선택" trigger={
        <button type="button" aria-label={`국가·계좌 선택: ${label}`} title={label}
          className={`flex min-h-11 w-full min-w-0 items-center gap-1 rounded px-1 text-left text-sm font-semibold text-neutral-900 dark:text-neutral-100 ${CONTROL_FOCUS_CLS}`}>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <ChevronDown size={14} className="shrink-0" aria-hidden="true" />
        </button>
      }>
        <div className="flex flex-col gap-3">{children}</div>
      </NavigationPopover>, slots.infoTarget
    )}
  </>;
}
