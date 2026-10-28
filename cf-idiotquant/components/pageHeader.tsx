"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMobilePageHeader } from "@/components/mobile-page-header";

/* ─────────────────────────────────────────────────────────────────────────
   공통 페이지 헤더 — 발굴·적정 주가 등 주요 화면이 같은 골격을 쓰도록 한 규칙.

   제목 (20px/600)
   메타 정보 (12px)                              [액션들]
   ─────────────────────────────────────── 1px

   ── 이 골격을 쓰지 않는 화면 (일부러 뺀 것이지 빠뜨린 것이 아니다) ──
   (home) · (quant)   랜딩. 히어로가 첫 화면이라 여기에 머리를 얹으면 밋밋해진다.
   (game)             브라운관 안이다. retroPalette.ts 가 색을 따로 정한다.
   (legal)            가운데 정렬된 단독 문서. 자체 로고 머리를 이미 갖고 있다.
   분석은 검색 전에는 페이지 제목, 검색 후에는 종목명을 제목으로 쓴다.
   검색줄·분석 탭은 children으로 내려 공통 헤더 안에 유지한다.

   ───────────────────────────────────────────────────────────────────────── */

/* 본문 폭 — 화면 성격에 따라 둘 중 하나다.
   하나로 밀면 표가 많은 화면이 답답해지고 읽는 화면은 한 줄이 너무 길어진다.
   좌우 패딩은 어느 쪽이든 같다 — 페이지를 옮길 때 본문 시작선이 흔들리지
   않으려면 여기가 갈리면 안 된다.

   헤더와 본문이 **같은 프리셋**을 써야 한다. 페이지에서 <main> 을 직접 감쌀
   때도 PAGE_WIDTH[width] 를 그대로 가져다 쓴다. */
export const PAGE_WIDTH = {
  content: "max-w-4xl mx-auto px-4 sm:px-6",  // 읽는 화면 — 프로필 · 관리자 · 약관
  data: "max-w-[1600px] mx-auto px-4 sm:px-6",     // 표 · 그리드 화면 — 분석 · 비교 · 발굴 · 계산기 · 백테스트 · 가계부 · 잔고
} as const;

export type PageWidth = keyof typeof PAGE_WIDTH;

/* 검색·제목 헤더는 중성 표면과 얇은 아래 구분선만 공유한다. */
export const PAGE_HEADER_CHROME =
  "bg-white dark:bg-surface-dark-canvas " +
  "border-b border-neutral-200 dark:border-surface-dark-border";

// 헤더 우측 액션 버튼 — 세 화면이 같은 모양을 쓰도록 클래스를 한 곳에 둔다
export const PAGE_ACTION_CLS =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors " +
  "border border-neutral-200 dark:border-surface-dark-border bg-transparent " +
  "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-surface-dark-hover " +
  "disabled:opacity-50 disabled:cursor-not-allowed shrink-0";

export function PageHeader({
  icon,
  title,
  mobileTitle,
  description,
  meta,
  compactMeta,
  actions,
  children,
  width = "data",
  sticky = false,
  mobileCompact = false,
  mobileTitleInNavigation = false,
  containerClassName,
  className,
}: {
  /** nav 가 이모지 대신 lucide 아이콘을 쓰는 화면용. emoji 와 같은 자리에 들어간다. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** 고정 상단바에 사용할 짧은 제목. 생략하면 본문 제목을 그대로 쓴다. */
  mobileTitle?: string;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  /** 모바일 스크롤 요약에도 남길 핵심 정보(예: 현재가). */
  compactMeta?: React.ReactNode;
  actions?: React.ReactNode;
  /** 검색줄·탭처럼 페이지별로 필요한 도구를 헤더 아래에 둔다. */
  children?: React.ReactNode;
  /** 본문 폭 프리셋. 페이지의 <main> 도 같은 값을 써야 한다. */
  width?: PageWidth;
  /** 스크롤해도 헤더를 위에 남긴다 — 지금 보는 대상(종목명·가격)이 계속 보여야 하는 화면용. */
  sticky?: boolean;
  /** 좁은 화면에서 제목·요약·아이콘을 짧은 헤더로 배치한다. */
  mobileCompact?: boolean;
  /** 모바일 상단바가 페이지명을 표시하면 반복되는 제목을 시각적으로 접는다. 종목명 등 대상 제목은 유지한다. */
  mobileTitleInNavigation?: boolean;
  /** 프리셋 밖의 폭이 필요할 때만. (예: 초대 수락 같은 좁은 단일 폼) */
  containerClassName?: string;
  className?: string;
}) {
  const slots = useMobilePageHeader();
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const integrated = mobile && !!slots?.titleTarget && !!slots?.actionsTarget;
  const setActive = slots?.setActive;
  useEffect(() => {
    setActive?.(integrated);
    return () => setActive?.(false);
  }, [integrated, setActive]);

  return (
    <>
    {integrated && createPortal(<div data-mobile-page-title className="flex min-w-0 items-center gap-2">
      {icon && <span className="flex shrink-0 items-center" aria-hidden>{icon}</span>}
      <div className="min-w-0">
      <h1 title={mobileTitle} className="truncate text-sm font-semibold leading-5 text-neutral-900 dark:text-white">{mobileTitle ?? title}</h1>
      {compactMeta && <div className="truncate text-xs leading-4 text-neutral-600 dark:text-neutral-300">{compactMeta}</div>}
    </div></div>, slots!.titleTarget!)}
    {integrated && createPortal(<div className="space-y-3">
      <div className="text-sm font-semibold text-neutral-900 dark:text-white">{mobileTitle ?? title}</div>
      {actions && <div data-mobile-page-actions className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>, slots!.actionsTarget!)}
    <header
      data-page-header
      data-mobile-integrated={integrated || undefined}
      data-title-in-navigation={mobileTitleInNavigation || undefined}
      data-header-title-only={mobileTitleInNavigation && !actions && !compactMeta || undefined}
      className={cn(
        PAGE_HEADER_CHROME,
        sticky && "sticky top-0 z-30",
        className
      )}
    >
      <div data-header-main className={cn(containerClassName ?? PAGE_WIDTH[width], "pt-5 pb-[18px]", mobileCompact && "py-2.5 sm:pt-5 sm:pb-[18px]")}>
        <div data-header-row className={cn(
          "flex flex-col sm:flex-row sm:items-end justify-between gap-3",
          mobileCompact && "flex-row items-center gap-2 sm:items-end sm:gap-3"
        )}>
          <div className="min-w-0 flex-1">
            <div data-header-title className="flex items-center gap-2">
              {icon && <span className="shrink-0 text-neutral-500 flex items-center" aria-hidden>{icon}</span>}
              <h1 className={cn("text-xl font-semibold tracking-[-0.04em] text-neutral-900 dark:text-white truncate", mobileCompact && "text-base sm:text-xl")}>
                {title}
              </h1>
            </div>
            {description && <p data-header-detail className="mt-1.5 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">{description}</p>}
            {meta && (
              <div data-header-detail className={cn(
                "mt-1.5 text-xs font-medium text-neutral-400 dark:text-neutral-500 flex items-center flex-wrap gap-x-1.5 gap-y-1",
                mobileCompact && "mt-1 sm:mt-1.5"
              )}>
                {meta}
              </div>
            )}
            {compactMeta && <div data-header-compact-meta className="hidden mt-1 text-xs font-medium">{compactMeta}</div>}
          </div>
          {!integrated && actions && <div className={cn("flex items-center gap-2 shrink-0", mobileCompact && "gap-1 sm:gap-2")}>{actions}</div>}
        </div>
      </div>
      {integrated && (description || meta) && <div data-mobile-header-details className={cn(containerClassName ?? PAGE_WIDTH[width], "space-y-1 py-2 text-xs text-neutral-500 dark:text-neutral-400")}>
        {description && <p>{description}</p>}
        {meta && <div className="flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>}
      {children}
    </header>
    </>
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
    <div className="bg-white dark:bg-surface-dark-canvas border-b border-neutral-100 dark:border-border-subtle-dark/60">
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
