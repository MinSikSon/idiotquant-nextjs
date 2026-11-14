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
    let release: (() => void) | undefined;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.hasAttribute('download') || link.target && link.target !== '_self') return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== '/analyze' || url.searchParams.get('ticker')) return;
      if (!window.matchMedia('(pointer: coarse)').matches) return;

      release?.();
      if (window.location.pathname === '/analyze') {
        const target = document.querySelector<HTMLInputElement>('[data-search-content] [data-page-input]');
        if (target && visible(target)) {
          target.focus({ preventScroll: true });
          return;
        }
      }
      // iOS에서는 페이지 로딩 후 focus()만 호출하면 키보드가 열리지 않는다.
      // 클릭 중 입력 세션을 시작하고 검색창이 준비될 때까지 유지한다.
      const input = document.createElement('input');
      input.setAttribute('aria-label', '종목 검색 준비');
      input.setAttribute('autocomplete', 'off');
      input.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;font-size:16px;pointer-events:none;';
      document.body.append(input);
      input.focus({ preventScroll: true });

      const transfer = () => {
        if (window.location.pathname !== '/analyze') return;
        const target = document.querySelector<HTMLInputElement>('[data-search-content] [data-page-input]');
        if (!target || !visible(target)) return;
        // 느린 페이지 이동 중 먼저 입력한 글자도 실제 검색창에 전달한다.
        if (input.value) {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(target, input.value);
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
        target.focus({ preventScroll: true });
        release?.();
      };
      const observer = new MutationObserver(transfer);
      const timeout = setTimeout(() => release?.(), 10000);
      const cancel = () => release?.();
      release = () => {
        observer.disconnect();
        clearTimeout(timeout);
        document.removeEventListener('pointerdown', cancel, true);
        input.remove();
        release = undefined;
      };
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
      document.addEventListener('pointerdown', cancel, true);
      transfer();
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      release?.();
    };
  }, []);

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
      const search = document.querySelector<HTMLButtonElement>("[data-page-search-trigger]");
      if (search && visible(search)) {
        event.preventDefault();
        search.click();
        return;
      }
      if (focusInput()) { event.preventDefault(); return; }
      // 페이지 도구는 상단바로 이동하며 좁은 화면에서는 닫힌 메뉴 안에 있다.
      const trigger = document.querySelector<HTMLButtonElement>("[data-page-actions] [data-page-input-trigger], main [data-page-input-trigger]");
      const tools = trigger?.closest<HTMLElement>("details, [data-page-tools-panel]");
      if (trigger && !trigger.disabled && (visible(trigger) || tools && (visible(tools) || tools.id === "mobile-page-tools"))) {
        event.preventDefault();
        waitForInput(false);
        trigger.click();
      }
    }

    if (pathname === "/analyze" && new URLSearchParams(window.location.search).get("search") === "1") {
      const openSearch = () => {
        const trigger = document.querySelector<HTMLButtonElement>("[data-page-search-trigger]");
        if (!trigger || !visible(trigger)) return false;
        // 자동 진입은 React effect 이후에 열어 모달의 동기 포커스와 충돌하지 않게 한다.
        if (trigger.getAttribute("aria-expanded") !== "true") queueMicrotask(() => {
          if (trigger.isConnected && trigger.getAttribute("aria-expanded") !== "true") trigger.click();
        });
        return true;
      };
      if (!openSearch()) {
        observer = new MutationObserver(() => { if (openSearch()) stopWaiting(); });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
        timeout = setTimeout(stopWaiting, 10000);
      }
    }

    // 지연 렌더링되는 검색창도 기다리되, 사용자가 조작하면 자동 포커스를 취소한다.
    if (["/calculator"].includes(pathname) && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !modalOpen() && !editing(document.activeElement)) {
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
