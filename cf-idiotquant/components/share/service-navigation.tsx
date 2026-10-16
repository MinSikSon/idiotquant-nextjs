import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import {
  SHARE_SERVICE_PAGES,
  shareServiceTarget,
} from '@/lib/share/navigation';
import type { ResultSnapshot } from '@/lib/share/snapshot';

export function ShareServiceBanner({ snapshot }: { snapshot: ResultSnapshot }) {
  const target = shareServiceTarget(snapshot);
  return (
    <section
      aria-label="원래 서비스에서 이어 보기"
      className="mb-6 rounded-2xl border border-brand/20 bg-white p-4 dark:border-brand/30 dark:bg-surface-dark-card sm:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-brand-ink">
            idiotquant에서 직접 확인하기
          </p>
          <h2 className="mt-1.5 break-words text-lg font-semibold tracking-tight">
            {target.title}
          </h2>
          <p className="mt-2 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            {target.description}
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            아래 결과는 공유 시점의 값입니다. 최신 데이터는 버튼을 눌러 확인해
            주세요.
          </p>
        </div>
        <Link
          href={target.href}
          prefetch={false}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          {target.label}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export function ShareServiceMenu() {
  return (
    <nav
      aria-label="서비스 바로가기"
      className="mt-8 border-t border-neutral-200 pt-6 dark:border-border-subtle-dark"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">다른 종목도 직접 살펴보세요</h2>
        <Link
          href="/"
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-brand-ink"
        >
          서비스 홈<ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SHARE_SERVICE_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            prefetch={false}
            className="group rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-brand dark:border-border-subtle-dark dark:bg-surface-dark-card dark:hover:border-brand"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{page.label}</span>
              <ArrowUpRight
                size={15}
                className="text-neutral-400 group-hover:text-brand-ink"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              {page.description}
            </p>
          </Link>
        ))}
      </div>
    </nav>
  );
}
