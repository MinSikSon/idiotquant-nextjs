"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";
import { navigationCommands, navigationShortcut, searchNavigation } from "@/lib/navigationCommands";

type QuickLink = { href: string; label: string };

export default function QuickNavigation({ items, compact = false }: { items: QuickLink[]; compact?: boolean }) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [modifier, setModifier] = useState("Ctrl");
  const [option, setOption] = useState("Alt");
  const router = useRouter();
  const pathname = usePathname();
  const commands = useMemo(() => navigationCommands(items), [items]);
  const results = useMemo(() => searchNavigation(commands, query), [commands, query]);

  function open() {
    setQuery("");
    setSelected(0);
    dialog.current?.showModal();
    input.current?.focus();
  }

  function navigate(href: string) {
    dialog.current?.close();
    if (pathname !== href) router.push(href);
  }

  useEffect(() => {
    const isApple = /Mac|iPhone|iPad/.test(navigator.platform);
    setModifier(isApple ? "⌘" : "Ctrl");
    setOption(isApple ? "⌥" : "Alt");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (window.matchMedia("(max-width: 767px)").matches !== compact) return;
      if (event.defaultPrevented || event.isComposing) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !event.repeat) {
        if (document.querySelector("dialog[open]") && !dialog.current?.open) return;
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"], [role="alertdialog"]') || document.querySelector('dialog[open]')) return;
      const command = navigationShortcut(commands, event);
      if (!command) return;
      event.preventDefault();
      navigate(command.href);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [compact, commands, pathname, router]);

  useEffect(() => {
    if (!dialog.current?.open) return;
    list.current?.children[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected, query]);

  useEffect(() => { dialog.current?.close(); }, [pathname]);

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
            placeholder="메뉴나 할 일을 검색하세요" className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none"
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
        <div className="flex items-center justify-between px-5 pt-4 pb-2 text-[10px] font-medium tracking-wide text-neutral-500 dark:text-neutral-400"><span>{query.trim() ? "검색 결과" : "발굴에서 분석까지"}</span><span>{results.length}개 메뉴</span></div>
        <div ref={list} id={`${id}-results`} role="listbox" aria-label="메뉴" className="max-h-[50dvh] overflow-y-auto p-2">
          {results.length ? results.map((item, index) => (
            <div id={`${id}-${index}`} key={item.href} role="option" aria-selected={selected === index} aria-keyshortcuts={item.shortcut ? `Alt+${item.shortcut}` : undefined}
              onMouseMove={() => setSelected(index)} onMouseDown={event => event.preventDefault()} onClick={() => navigate(item.href)}
              className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-3 text-sm ${selected === index ? "bg-brand-light text-brand-ink dark:bg-brand-muted" : "text-neutral-600 dark:text-neutral-300"}`}>
              <span className="min-w-0"><span className="flex items-center gap-2 font-medium">{item.label}{pathname === item.href && <span className="text-[10px] font-normal text-neutral-500 dark:text-neutral-400">현재 화면</span>}</span>{item.description && <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{item.description}</span>}</span>
              <span className="ml-3 flex shrink-0 items-center gap-2">{item.shortcut && <kbd aria-label={`${option} + ${item.shortcut}`} className="rounded border border-neutral-200 bg-white px-1.5 py-1 text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">{option} {item.shortcut}</kbd>}{selected === index && <ArrowUpRight size={15} aria-hidden="true" />}</span>
            </div>
          )) : <p role="status" className="px-3 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">일치하는 메뉴가 없습니다.</p>}
        </div>
        <div className="flex items-center gap-4 border-t border-neutral-200 px-4 py-3 text-[11px] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"><span><kbd>↑ ↓</kbd> 선택</span><span><kbd>Enter</kbd> 이동</span><span><kbd>Esc</kbd> 닫기</span></div>
        <p className="px-4 pb-3 text-[11px] text-neutral-500 dark:text-neutral-400">다음에는 {option} + 1·2·3으로 발굴·비교·분석에 바로 이동하세요.</p>
      </dialog>
    </>
  );
}
