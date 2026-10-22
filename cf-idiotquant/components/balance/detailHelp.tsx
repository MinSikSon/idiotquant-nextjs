"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Info, X } from "lucide-react";

/** 마우스로 읽거나 클릭으로 고정하는 설명. Portal로 카드 경계 밖에서도 표시한다. */
export function DetailHelp({ label, children }: { label: string; children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const pinned = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelClose = () => { if (timer.current) clearTimeout(timer.current); };
    const closeLater = () => { cancelClose(); if (!pinned.current) timer.current = setTimeout(() => setOpen(false), 200); };
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    return <Popover.Root open={open} onOpenChange={value => { setOpen(value); if (!value) pinned.current = false; }}>
        <Popover.Trigger asChild>
            <button type="button" aria-label={`${label} 설명`} onPointerEnter={event => { if (event.pointerType === "mouse") { cancelClose(); setOpen(true); } }} onPointerLeave={closeLater} onClick={event => { event.preventDefault(); cancelClose(); pinned.current = !pinned.current; setOpen(pinned.current); }} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:focus-visible:ring-neutral-400 dark:hover:bg-surface-dark-muted">
                <Info size={14} aria-hidden="true" />
            </button>
        </Popover.Trigger>
        <Popover.Portal>
            <Popover.Content aria-label={`${label} 설명`} sideOffset={6} collisionPadding={12} onOpenAutoFocus={event => event.preventDefault()} onPointerEnter={cancelClose} onPointerLeave={closeLater} className="z-[100] w-80 max-w-[calc(100vw-24px)] rounded-xl border border-neutral-200 bg-white p-4 text-xs leading-relaxed text-neutral-600 shadow-none dark:border-border-subtle-dark dark:bg-surface-dark-card dark:text-neutral-300">
                <div className="mb-2 flex items-center justify-between gap-3"><span className="font-bold text-neutral-900 dark:text-neutral-100">{label}</span><Popover.Close aria-label="설명 닫기" className="-m-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-surface-dark-muted"><X size={15} /></Popover.Close></div>
                {children}
            </Popover.Content>
        </Popover.Portal>
    </Popover.Root>;
}
