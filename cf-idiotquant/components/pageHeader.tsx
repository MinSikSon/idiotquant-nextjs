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

/* 본문 폭 — 화면 성격에 따라 둘 중 하나다.
   하나로 밀면 표가 많은 화면이 답답해지고 읽는 화면은 한 줄이 너무 길어진다.
   좌우 패딩은 어느 쪽이든 같다 — 페이지를 옮길 때 본문 시작선이 흔들리지
   않으려면 여기가 갈리면 안 된다.

   헤더와 본문이 **같은 프리셋**을 써야 한다. 페이지에서 <main> 을 직접 감쌀
   때도 PAGE_WIDTH[width] 를 그대로 가져다 쓴다. */
export const PAGE_WIDTH = {
  content: "max-w-4xl mx-auto px-4 sm:px-6",  // 읽는 화면 — 분석 · 계산기 · 프로필 · 관리자 · 약관
  data: "max-w-7xl mx-auto px-4 sm:px-6",     // 표 · 그리드 화면 — 발굴 · 백테스트 · 가계부 · 잔고
} as const;

export type PageWidth = keyof typeof PAGE_WIDTH;

// 헤더 우측 액션 버튼 — 세 화면이 같은 모양을 쓰도록 클래스를 한 곳에 둔다
export const PAGE_ACTION_CLS =
  "flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border text-xs font-bold transition-colors " +
  "bg-surface-canvas dark:bg-surface-dark-card border-neutral-200 dark:border-surface-dark-border " +
  "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-surface-dark-hover " +
  "disabled:opacity-50 disabled:cursor-not-allowed shrink-0";

export function PageHeader({
  emoji,
  title,
  meta,
  actions,
  width = "data",
  sticky = false,
  containerClassName,
  className,
}: {
  emoji?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** 본문 폭 프리셋. 페이지의 <main> 도 같은 값을 써야 한다. */
  width?: PageWidth;
  /** 스크롤해도 헤더를 위에 남긴다 — 지금 보는 대상(종목명·가격)이 계속 보여야 하는 화면용. */
  sticky?: boolean;
  /** 프리셋 밖의 폭이 필요할 때만. (예: 초대 수락 같은 좁은 단일 폼) */
  containerClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-surface-dark border-t-[3px] border-t-brand border-b border-neutral-200 dark:border-surface-dark-border",
        sticky && "sticky top-0 z-30",
        className
      )}
    >
      <div className={cn(containerClassName ?? PAGE_WIDTH[width], "pt-5 pb-[18px]")}>
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
  width = "data",
  containerClassName,
}: {
  emoji?: string;
  label: string;
  right?: React.ReactNode;
  width?: PageWidth;
  containerClassName?: string;
}) {
  return (
    <div className="bg-white dark:bg-surface-dark border-t-[3px] border-t-brand border-b border-neutral-100 dark:border-border-subtle-dark/60">
      <div className={cn(containerClassName ?? PAGE_WIDTH[width], "py-2.5 flex items-center justify-between gap-2")}>
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
