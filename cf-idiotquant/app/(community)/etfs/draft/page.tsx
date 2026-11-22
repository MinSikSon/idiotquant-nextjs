"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, LoaderCircle, Plus, X } from "lucide-react";
import { PageHeader, PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { StockLogo } from "@/components/stockLogo";
import type { CommunityEtfDraft } from "@/lib/features/communityEtfs/api";
import { MyPublishedEtfs } from "./MyPublishedEtfs";

const DRAFT_KEY = "idiotquant:community-etf-draft:v1";

export default function CommunityEtfDraftPage() {
    const { data: session, status } = useSession();
    const [draft, setDraft] = useState<CommunityEtfDraft | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        try {
            const parsed = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if ((parsed?.market === "KR" || parsed?.market === "US") && Array.isArray(parsed?.holdings)) setDraft(parsed);
        } catch { /* 저장된 초안이 없으면 빈 상태를 보여준다. */ }
        setReady(true);
    }, []);

    function removeHolding(ticker: string) {
        if (!draft) return;
        const next = { ...draft, holdings: draft.holdings.filter(holding => holding.ticker !== ticker) };
        setDraft(next);
        try {
            if (next.holdings.length) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
            else sessionStorage.removeItem(DRAFT_KEY);
        } catch { /* 현재 화면 상태는 계속 사용할 수 있다. */ }
    }

    return <>
        <PageHeader title="내 ETF 초안" width="content" primaryAction={<Link href="/analyze" className={PAGE_PRIMARY_ACTION_CLS}><Plus size={16} aria-hidden="true" />종목 추가</Link>} />
        <main className="mx-auto max-w-2xl px-4 pb-[calc(var(--bottombar-h)+2rem)] pt-5 text-neutral-900 dark:text-neutral-100 sm:pt-8">
            <Link href="/etfs" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-brand-ink"><ArrowLeft size={16} aria-hidden="true" />나만의 ETF로 돌아가기</Link>
            <section aria-label="ETF 초안">
                {!ready ? <p role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-neutral-500"><LoaderCircle size={18} className="animate-spin" />초안을 불러오는 중…</p>
                    : !draft || draft.holdings.length === 0 ? <div className="border-t border-neutral-200 py-4 dark:border-surface-dark-border">
                        <h2 className="text-lg font-semibold">초안에 담긴 종목이 없어요</h2>
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300" role="status">ETF를 만들려면 종목을 2개 이상 추가해 주세요.</p>
                        <Link href="/screener?createEtf=1" className={`${PAGE_PRIMARY_ACTION_CLS} mt-4`}>종목 고르기</Link>
                    </div> : <>
                        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                            <h2 className="font-semibold">{draft.market === "KR" ? "국내" : "미국"} 초안 구성 종목</h2>
                            <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-300">{draft.holdings.length}종목 · 각 {(100 / draft.holdings.length).toFixed(1)}%</span>
                        </div>
                        <ul className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-surface-dark-border dark:border-surface-dark-border">
                            {draft.holdings.map(holding => <li key={holding.ticker} className="flex min-h-16 items-center gap-3 py-2">
                                <StockLogo ticker={holding.ticker} name={holding.name} isUs={draft.market === "US"} />
                                <span className="min-w-0 flex-1 break-words font-medium">{holding.name}<span className="ml-2 text-xs text-neutral-500">{holding.ticker}</span></span>
                                <button type="button" onClick={() => removeHolding(holding.ticker)} aria-label={`${holding.name} 삭제`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:hover:bg-surface-dark-hover dark:hover:text-white"><X size={18} aria-hidden="true" /></button>
                            </li>)}
                        </ul>
                        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">모든 종목은 같은 비중으로 구성됩니다.</p>
                        {draft.holdings.length >= 2
                            ? <Link href="/etfs/new" className={`${PAGE_PRIMARY_ACTION_CLS} mt-5 w-full`}>ETF 만들기</Link>
                            : <p role="status" className="mt-5 text-sm font-medium text-brand-ink">ETF를 만들려면 종목을 1개 더 추가해 주세요.</p>}
                    </>}
            </section>
            <section aria-labelledby="published-etfs-title" className="mt-8 border-t border-neutral-200 pt-4 dark:border-surface-dark-border">
                <h2 id="published-etfs-title" className="text-lg font-semibold">내가 공개한 ETF</h2>
                {status === "loading" ? <p role="status" className="py-3 text-sm text-neutral-600 dark:text-neutral-300">공개한 ETF를 불러오는 중…</p>
                    : session?.user?.id ? <MyPublishedEtfs key={session.user.id} />
                    : <Link href="/login?callbackUrl=%2Fetfs%2Fdraft" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink underline-offset-4 hover:underline">로그인하고 내 ETF 보기</Link>}
            </section>
        </main>
    </>;
}
