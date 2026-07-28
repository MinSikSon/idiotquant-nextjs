"use client";

import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────
   공통 페이지 헤더 — 발굴·적정 주가 등 주요 화면이 같은 골격을 쓰도록 한 규칙.

   ███ 3px solid #16a34a   (상단 강조선)
   [이모지] 제목 (20px/900)
   메타 정보 (12px)                              [액션들]
   ─────────────────────────────────────── 1px

   제목 앞 이모지는 사이드바 nav 항목과 같은 것을 쓴다 — nav ↔ 헤더가 눈으로
   이어져야 "지금 어느 메뉴에 있는지"가 한 번에 읽힌다.
   ───────────────────────────────────────────────────────────────────────── */

// 헤더 우측 액션 버튼 — 세 화면이 같은 모양을 쓰도록 클래스를 한 곳에 둔다
export const PAGE_ACTION_CLS =
  "flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border text-xs font-bold transition-colors " +
  "bg-[#faf9f7] dark:bg-[#242320] border-neutral-200 dark:border-[#3a3834] " +
  "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-[#2c2b27] " +
  "disabled:opacity-50 disabled:cursor-not-allowed shrink-0";

export function PageHeader({
  emoji,
  title,
  meta,
  actions,
  containerClassName = "max-w-7xl mx-auto px-4 sm:px-7",
  className,
}: {
  emoji?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  containerClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-[#1f1e1b] border-t-[3px] border-t-[#16a34a] border-b border-neutral-200 dark:border-[#3a3834]",
        className
      )}
    >
      <div className={cn(containerClassName, "pt-5 pb-[18px]")}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {emoji && <span className="text-[17px] leading-none shrink-0" aria-hidden>{emoji}</span>}
              <h1 className="text-xl font-black tracking-[-0.03em] text-neutral-900 dark:text-white truncate">
                {title}
              </h1>
            </div>
            {meta && (
              <div className="mt-1.5 text-xs font-medium text-neutral-400 dark:text-neutral-500 flex items-center flex-wrap gap-x-1.5 gap-y-1">
                {meta}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

/* 얇은 컨텍스트 줄 — 헤더 위에 얹어 "어디서 왔고 어디로 돌아가는지"를 항상 열어둔다.
   발굴 → 분석으로 넘어간 뒤 돌아올 길이 없으면 왕복 사용성이 끊긴다. */
export function ContextBar({
  emoji,
  label,
  right,
  containerClassName = "max-w-7xl mx-auto px-4 sm:px-7",
}: {
  emoji?: string;
  label: string;
  right?: React.ReactNode;
  containerClassName?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#1f1e1b] border-t-[3px] border-t-[#16a34a] border-b border-neutral-100 dark:border-[#35332e]/60">
      <div className={cn(containerClassName, "py-2.5 flex items-center justify-between gap-2")}>
        <div className="flex items-center gap-1.5 min-w-0">
          {emoji && <span className="text-[11px] leading-none shrink-0" aria-hidden>{emoji}</span>}
          <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.12em] truncate">
            {label}
          </span>
        </div>
        {right}
      </div>
    </div>
  );
}
