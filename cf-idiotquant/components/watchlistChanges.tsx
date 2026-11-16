import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function WatchlistChanges() {
    return <Link href="/" className="mb-5 flex min-h-14 items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-700">
        <span>관심종목의 가격과 적정주가를 한눈에 보세요.</span><ArrowRight size={16} aria-hidden="true" className="shrink-0" />
    </Link>;
}
