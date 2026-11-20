import Link from 'next/link';
import type { ReactNode } from 'react';
import { PAGE_ACTION_CLS } from '@/components/pageHeader';
import { cn } from '@/lib/utils';

export function AnalysisLoginPrompt({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-sm text-neutral-600 dark:text-neutral-300">
      <p className="min-w-[10rem] flex-1">{children}</p>
      <Link href={href} className={cn(PAGE_ACTION_CLS, 'shrink-0')}>로그인</Link>
    </div>
  );
}
