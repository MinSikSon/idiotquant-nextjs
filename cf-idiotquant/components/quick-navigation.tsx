"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";

type QuickLink = { href: string; label: string };

export default function QuickNavigation({ items, compact = false }: { items: QuickLink[]; compact?: boolean }) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [modifier, setModifier] = useState("Ctrl");
  const router = useRouter();
  const results = items.filter(item => item.label.includes(query.trim()));

  function open() {
    setQuery("");
    setSelected(0);
    dialog.current?.showModal();
    input.current?.focus();
  }

  function navigate(href: string) {
    dialog.current?.close();
    router.push(href);
  }

  useEffect(() => {
    setModifier(/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl");
    const onKeyDown = (event: KeyboardEvent) => {
      if (window.matchMedia("(max-width: 767px)").matches !== compact) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !event.repeat) {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [compact]);

  return (
    <>
      <button type="button" onClick={open} aria-label="빠른 이동" aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K"
        className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-neutral-200 px-2.5 text-xs text-neutral-500 transition-colors duration-100 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800">
        <Search size={14} aria-hidden="true" />
        {!compact && <><span className="hidden xl:inline">빠른 이동</span><kbd className="text-[10px]">{modifier} K</kbd></>}
      </button>
      <dialog ref={dialog} aria-label="빠른 이동" onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}
        className="fixed inset-0 m-auto w-[calc(100%_-_32px)] max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/50 dark:border-neutral-700 dark:bg-surface-dark-card dark:text-neutral-100">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 dark:border-neutral-700">
          <Search size={17} aria-hidden="true" className="shrink-0 text-neutral-500" />
          <input ref={input} value={query} onChange={event => { setQuery(event.target.value); setSelected(0); }}
            role="combobox" aria-label="이동할 메뉴 검색" aria-expanded="true" aria-controls={`${id}-results`}
            aria-autocomplete="list" aria-activedescendant={results[selected] ? `${id}-${selected}` : undefined}
            placeholder="어디로 이동할까요?" className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none"
            onKeyDown={event => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setSelected(index => Math.max(0, Math.min(results.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
              }
              if (event.key === "Enter" && results[selected]) { event.preventDefault(); navigate(results[selected].href); }
            }} />
          <button type="button" aria-label="빠른 이동 닫기" onClick={() => dialog.current?.close()} className="rounded border border-neutral-200 px-1.5 py-1 text-[10px] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">ESC</button>
        </div>
        <div id={`${id}-results`} role="listbox" aria-label="메뉴" className="max-h-[50dvh] overflow-y-auto p-2">
          {results.length ? results.map((item, index) => (
            <div id={`${id}-${index}`} key={item.href} role="option" aria-selected={selected === index}
              onMouseMove={() => setSelected(index)} onMouseDown={event => event.preventDefault()} onClick={() => navigate(item.href)}
              className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-3 text-sm ${selected === index ? "bg-brand-light text-brand-ink dark:bg-brand-muted" : "text-neutral-600 dark:text-neutral-300"}`}>
              <span>{item.label}</span>{selected === index && <ArrowUpRight size={15} aria-hidden="true" />}
            </div>
          )) : <p role="status" className="px-3 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">일치하는 메뉴가 없습니다.</p>}
        </div>
        <div className="flex items-center gap-4 border-t border-neutral-200 px-4 py-3 text-[11px] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"><span><kbd>↑ ↓</kbd> 선택</span><span><kbd>Enter</kbd> 이동</span><span><kbd>Esc</kbd> 닫기</span></div>
      </dialog>
    </>
  );
}
