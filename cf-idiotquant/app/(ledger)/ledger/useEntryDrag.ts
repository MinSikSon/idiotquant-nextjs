"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 내역 줄을 끌어 옮기기.
 *
 * 줄 전체가 이미 "누르면 수정" 이라, 끌기와 탭이 같은 손짓을 나눠 쓴다.
 * 그래서 꾹 눌러야(LONG_PRESS_MS) 들리고, 그 전에 손가락이 움직이면 스크롤로 본다.
 * 라이브러리를 들이지 않은 이유도 같다 — 이 규칙이 이 화면에만 있는 규칙이라서다.
 */

const LONG_PRESS_MS = 320;
/** 들리기 전에 이만큼 움직이면 끌기가 아니라 스크롤이다. */
const CANCEL_SLOP_PX = 8;
/** 화면 위아래 이 안쪽에 손가락이 있으면 목록이 따라 흐른다 — 없으면 먼 날로 못 옮긴다. */
const EDGE_PX = 90;
const EDGE_SPEED_PX = 14;

export interface DropTarget {
    date: string;
    /** 그 날 목록에서 몇 번째 자리에 놓이는가 (0 = 맨 위) */
    index: number;
}

interface Day {
    date: string;
    items: { id: number }[];
}

interface Options {
    days: Day[];
    /** 놓았을 때 — 도착한 날과 그 날의 새 순서. 같은 자리면 부르지 않는다. */
    onDrop: (date: string, ids: number[]) => void;
}

export function useEntryDrag({ days, onDrop }: Options) {
    const [dragId, setDragId] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

    /* 이벤트 핸들러는 한 번 붙고 오래 산다 — 최신 값은 ref 로 건넨다. */
    const daysRef = useRef(days);
    daysRef.current = days;
    const onDropRef = useRef(onDrop);
    onDropRef.current = onDrop;

    const dragIdRef = useRef<number | null>(null);
    const targetRef = useRef<DropTarget | null>(null);
    const pressRef = useRef<{ id: number; x: number; y: number; timer: number } | null>(null);
    const pointerYRef = useRef(0);
    /** 끌고 나서 올라오는 click 을 삼킨다 — 안 그러면 놓자마자 수정 시트가 열린다. */
    const draggedRef = useRef(false);

    const clearPress = () => {
        if (pressRef.current) window.clearTimeout(pressRef.current.timer);
        pressRef.current = null;
    };

    const stop = useCallback(() => {
        clearPress();
        dragIdRef.current = null;
        targetRef.current = null;
        setDragId(null);
        setDropTarget(null);
    }, []);

    /** 손가락 아래에 무엇이 있는지 — 스크롤 중에도 맞으려면 매번 물어봐야 한다. */
    const hitTest = (x: number, y: number): DropTarget | null => {
        const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop]");
        if (!el) return null;

        const date = el.dataset.date;
        if (!date) return null;

        // 날짜 머리글에 놓으면 그 날 맨 위.
        if (el.dataset.drop === "day") return { date, index: 0 };

        const items = daysRef.current.find(d => d.date === date)?.items ?? [];
        const at = items.findIndex(i => i.id === Number(el.dataset.entryId));
        if (at === -1) return { date, index: items.length };

        // 줄의 위 절반이면 그 앞, 아래 절반이면 그 뒤.
        const box = el.getBoundingClientRect();
        return { date, index: y < box.top + box.height / 2 ? at : at + 1 };
    };

    /* 끄는 동안의 손짓은 전부 window 에서 듣는다 — 손가락이 줄 밖으로 나가도 놓친이 없다. */
    useEffect(() => {
        if (dragId === null) return;

        // 이 시점엔 스크롤이 시작되지 않았다(움직였으면 들리지도 않았다).
        // touch-action 은 손짓이 시작된 뒤에 바꿔봐야 늦어서, 여기서 직접 막는다.
        const block = (e: TouchEvent) => e.preventDefault();
        document.addEventListener("touchmove", block, { passive: false });

        const onMove = (e: PointerEvent) => {
            pointerYRef.current = e.clientY;
            const next = hitTest(e.clientX, e.clientY);
            targetRef.current = next;
            setDropTarget(next);
        };

        const onUp = () => {
            const id = dragIdRef.current;
            const target = targetRef.current;
            if (id !== null && target) {
                const base = daysRef.current.find(d => d.date === target.date)?.items.map(i => i.id) ?? [];
                const from = base.indexOf(id);
                // 뽑아낸 자리가 목표보다 앞이면 그만큼 당겨서 꽂아야 한 칸씩 밀린다.
                const insertAt = from !== -1 && from < target.index ? target.index - 1 : target.index;

                const ids = base.filter(x => x !== id);
                ids.splice(insertAt, 0, id);

                const sameDay = from !== -1;
                const moved = !sameDay || from !== insertAt;
                if (moved) onDropRef.current(target.date, ids);
            }
            stop();
        };

        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") stop(); };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", stop);
        window.addEventListener("keydown", onKey);

        // 가장자리에서 목록이 흐른다. 손가락은 그대로인데 밑이 지나가므로 매 프레임 다시 겨눈다.
        let frame = requestAnimationFrame(function tick() {
            const y = pointerYRef.current;
            const dy = y < EDGE_PX ? -EDGE_SPEED_PX : y > window.innerHeight - EDGE_PX ? EDGE_SPEED_PX : 0;
            if (dy) window.scrollBy(0, dy);
            frame = requestAnimationFrame(tick);
        });

        return () => {
            document.removeEventListener("touchmove", block);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", stop);
            window.removeEventListener("keydown", onKey);
            cancelAnimationFrame(frame);
        };
    }, [dragId, stop]);

    useEffect(() => () => clearPress(), []);

    /** 줄에 그대로 펼쳐 넣는 속성들. data-* 는 손가락 아래를 찾는 데 쓴다. */
    const rowProps = (id: number, date: string) => ({
        "data-drop": "entry",
        "data-entry-id": id,
        "data-date": date,
        draggable: false,
        onPointerDown: (e: React.PointerEvent) => {
            if (e.button !== 0) return;               // 오른쪽 버튼으로는 끌지 않는다
            // 지난 손짓이 click 없이 끝났을 수 있다. 여기서 털지 않으면 그 찌꺼기가
            // 다음 탭 하나를 조용히 삼킨다.
            draggedRef.current = false;
            pointerYRef.current = e.clientY;
            clearPress();
            pressRef.current = {
                id, x: e.clientX, y: e.clientY,
                timer: window.setTimeout(() => {
                    pressRef.current = null;
                    draggedRef.current = true;
                    dragIdRef.current = id;
                    setDragId(id);
                    navigator.vibrate?.(15);          // 들렸다는 걸 손으로 알린다
                }, LONG_PRESS_MS),
            };
        },
        onPointerMove: (e: React.PointerEvent) => {
            const press = pressRef.current;
            if (!press) return;
            // 들리기 전에 움직였다면 스크롤할 생각이었던 것이다.
            if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > CANCEL_SLOP_PX) clearPress();
        },
        onPointerUp: clearPress,
        onPointerCancel: clearPress,
        // 꾹 누르면 모바일에서 선택·컨텍스트 메뉴가 뜬다 — 줄에는 어차피 고를 글이 없다.
        onContextMenu: (e: React.MouseEvent) => { if (dragIdRef.current !== null) e.preventDefault(); },
    });

    /** 끌고 난 직후의 click 인가? 맞으면 수정 시트를 열지 않는다. */
    const consumeDragClick = () => {
        if (!draggedRef.current) return false;
        draggedRef.current = false;
        return true;
    };

    const dayProps = (date: string) => ({ "data-drop": "day", "data-date": date });

    return { dragId, dropTarget, rowProps, dayProps, consumeDragClick };
}
