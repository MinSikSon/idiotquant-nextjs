"use client";

/**
 * 화면을 덮는 판 — 배낭·고르기·끝난 판·도움말이 전부 이 한 벌을 쓴다.
 *
 * 저마다 모양을 정하면 같은 「닫기」가 화면마다 달라 보인다. 이 파일이 정하는 것은
 * 테두리와 제목 줄 하나이고, 안쪽은 부르는 쪽이 채운다.
 *
 * **Esc 로 닫히고, 바깥의 빈 곳을 눌러도 닫힌다.** 캔버스가 아니라 DOM 이라 이런 것이
 * 공짜로 붙는다.
 */

import { useEffect, useRef, type ReactNode } from "react";

export default function Panel({
    title,
    onClose,
    children,
    footer,
}: {
    title: string;
    onClose?: () => void;
    children: ReactNode;
    footer?: ReactNode;
}) {
    /** 이번 누름이 바탕에서 시작했는가 — 아래 `onClick` 의 까닭 참고. */
    const fromBackdrop = useRef(false);

    useEffect(() => {
        if (!onClose) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };
        // 캡처 단계에서 받는다 — 아래의 게임 키 처리보다 먼저 서야 한다.
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [onClose]);

    return (
        <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-3"
            /* 바깥의 빈 곳을 눌러도 닫는다. 조건이 둘인 데에는 까닭이 있다.
             *
             *   · **누르기 시작한 자리도 빈 곳이어야 한다.** 판 안에서 글자를 끌다가
             *     바깥에서 손을 떼면 `click` 은 둘의 공통 조상인 이 바탕에서 터진다 —
             *     끌었다고 창이 닫히면 안 된다.
             *   · **누르는 순간이 아니라 뗄 때 닫는다.** 누르자마자 지우면 손을 뗄 때
             *     그 클릭이 **아래의 명령 단추로 새어 들어간다.**
             *
             * 닫을 길이 없는 판(끝난 판)은 `onClose` 가 없어서 여기도 안 닫힌다. */
            onPointerDown={(e) => {
                fromBackdrop.current = e.target === e.currentTarget;
            }}
            onClick={(e) => {
                if (onClose && fromBackdrop.current && e.target === e.currentTarget) onClose();
            }}
        >
            <div className="max-h-full w-full max-w-[520px] overflow-auto border border-[#3a4a45] bg-[#0f1413] font-[family-name:var(--font-plex-mono)] text-[13px] text-[#c3ced6] shadow-[0_0_0_1px_#000]">
                <div className="flex items-center justify-between border-b border-[#2a3532] px-3 py-2 text-[#e6eeea]">
                    <span>{title}</span>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-[2px] px-2 text-[#8a9a95] hover:text-white"
                            aria-label="닫기"
                        >
                            닫기 (Esc)
                        </button>
                    )}
                </div>
                <div className="px-3 py-3">{children}</div>
                {footer && <div className="border-t border-[#2a3532] px-3 py-2 text-[#7d8d88]">{footer}</div>}
            </div>
        </div>
    );
}
