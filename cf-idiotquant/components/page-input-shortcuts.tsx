"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const INPUTS = 'input:not([type]), input[type="text"], input[type="search"], input[type="number"], input[type="email"], input[type="url"], input[type="tel"], textarea';

function visible(element: HTMLElement) {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden" && !element.closest('[inert], [aria-hidden="true"]');
}

function editing(element: Element | null) {
  return element instanceof HTMLElement && (element.matches("input, textarea, select") || element.isContentEditable);
}

function modalOpen() {
  return Array.from(document.querySelectorAll<HTMLElement>('dialog[open], [role="dialog"], [role="alertdialog"]')).some(visible);
}

export default function PageInputShortcuts() {
  const pathname = usePathname();

  useEffect(() => {
    // 게임은 자체 키보드 조작을 사용한다.
    if (/^\/games?(\/|$)/.test(pathname)) return;
    const main = document.querySelector("main");
    if (!main) return;

    function focusInput(preventScroll = false) {
      const candidates = main!.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[data-page-input], ${INPUTS}`);
      const available = Array.from(candidates).filter(element => !element.matches(":disabled, [readonly]") && visible(element));
      const target = available.find(element => element.hasAttribute("data-page-input")) ?? available[0];
      if (!target) return false;
      target.focus({ preventScroll });
      return document.activeElement === target;
    }

    let observer: MutationObserver | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    function stopWaiting() {
      observer?.disconnect();
      clearTimeout(timeout);
    }
    function waitForInput(preventScroll: boolean) {
      stopWaiting();
      observer = new MutationObserver(() => {
        if (modalOpen() || editing(document.activeElement)) { stopWaiting(); return; }
        if (focusInput(preventScroll)) stopWaiting();
      });
      observer.observe(main!, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "hidden", "class"] });
      timeout = setTimeout(stopWaiting, 5000);
    }

    function onKeyDown(event: KeyboardEvent) {
      stopWaiting();
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey || modalOpen()) return;
      const active = document.activeElement;
      if (event.key === "Escape" && editing(active) && main!.contains(active)) {
        (active as HTMLElement).blur();
        return;
      }
      if (event.key !== "/" || event.shiftKey || event.repeat || editing(active)) return;
      if (focusInput()) { event.preventDefault(); return; }
      const trigger = main!.querySelector<HTMLButtonElement>("[data-page-input-trigger]");
      if (trigger && visible(trigger) && !trigger.disabled) {
        event.preventDefault();
        waitForInput(false);
        trigger.click();
      }
    }

    // 지연 렌더링되는 검색창도 기다리되, 사용자가 조작하면 자동 포커스를 취소한다.
    if (["/analyze", "/compare", "/calculator"].includes(pathname) && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !modalOpen() && !editing(document.activeElement)) {
      if (!focusInput(true)) waitForInput(true);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", stopWaiting, true);
    document.addEventListener("focusin", stopWaiting);
    return () => {
      stopWaiting();
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", stopWaiting, true);
      document.removeEventListener("focusin", stopWaiting);
    };
  }, [pathname]);

  return null;
}
