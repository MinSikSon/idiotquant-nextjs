"use client";

/**
 * 화면을 덮는 판 — 배낭·고르기·끝난 판·도움말이 전부 이 한 벌을 쓴다.
 *
 * 저마다 모양을 정하면 같은 「닫기」가 화면마다 달라 보인다. 이 파일이 정하는 것은
 * 테두리와 제목 줄 하나이고, 안쪽은 부르는 쪽이 채운다.
 *
 * **Esc 로 닫힌다.** 캔버스가 아니라 DOM 이라 이런 것이 공짜로 붙는다.
 */

import { useEffect, type ReactNode } from "react";

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
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-3">
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
