"use client";

import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { cloneElement, useEffect, useLayoutEffect, useSyncExternalStore, useId, useRef, useState, type ReactElement, type ReactNode } from "react";

const subscribe = () => () => {};

/** 닫힌 동안에도 공유 대화상자·빠른 이동의 상태와 단축키를 유지한다. */
export function NavigationPopover({ label, trigger, children, side = "bottom", onOpenChange }: {
  label: string;
  trigger: ReactElement;
  children: ReactNode;
  side?: "top" | "bottom";
  onOpenChange?: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ pathname, open: false });
  if (state.pathname !== pathname) setState({ pathname, open: false });
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const open = state.pathname === pathname && state.open;
  const callback = useRef(onOpenChange);
  useEffect(() => { callback.current = onOpenChange; }, [onOpenChange]);

  useLayoutEffect(() => {
    if (!open) return;
    const content = contentRef.current;
    const trigger = triggerRef.current;
    if (!content || !trigger) return;
    const position = () => {
      const rect = trigger.getBoundingClientRect();
      content.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
      if (side === "top") {
        content.style.bottom = "calc(var(--bottombar-h) + 4px)";
        content.style.maxHeight = "calc(100dvh - var(--bottombar-h) - 16px)";
      } else {
        content.style.top = `${rect.bottom + 4}px`;
        content.style.maxHeight = `${Math.max(44, window.innerHeight - rect.bottom - 16)}px`;
      }
    };
    position();
    (content.querySelector<HTMLElement>('button:not(:disabled), a[href], input, select, summary, [tabindex="0"]') ?? content).focus({ preventScroll: true });
    const outside = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || content.contains(target) || trigger.contains(target) || target.closest('dialog[open], [data-radix-popper-content-wrapper]')) return;
      setState({ pathname, open: false });
      callback.current?.(false);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || (event.target instanceof Element && event.target.closest('dialog[open], [data-radix-popper-content-wrapper]'))) return;
      event.preventDefault();
      setState({ pathname, open: false });
      callback.current?.(false);
      trigger.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", keydown);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", keydown);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, pathname, side]);

  return <>
    {cloneElement(trigger as ReactElement<Record<string, unknown>>, {
      ref: triggerRef, "aria-expanded": open, "aria-controls": id, "aria-haspopup": "dialog",
      onClick: () => { setState({ pathname, open: !open }); callback.current?.(!open); },
    })}
    {mounted && createPortal(<div ref={contentRef} id={id} tabIndex={-1} role="dialog" aria-label={label} hidden={!open}
      onClick={event => {
        if ((event.target as Element).closest('a[href]')) { setState({ pathname, open: false }); callback.current?.(false); }
      }}
      className="navigation-popover fixed z-50 w-72 max-w-[calc(100vw-24px)] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-2 text-sm text-neutral-700 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-card dark:text-neutral-200">
      {children}
    </div>, document.body)}
  </>;
}
