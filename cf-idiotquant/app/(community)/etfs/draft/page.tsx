"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Plus, X } from "lucide-react";
import { PageHeader, PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { StockLogo } from "@/components/stockLogo";
import type { CommunityEtfDraft } from "@/lib/features/communityEtfs/api";

const DRAFT_KEY = "idiotquant:community-etf-draft:v1";

export default function CommunityEtfDraftPage() {
    const [draft, setDraft] = useState<CommunityEtfDraft | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        try {
            const parsed = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
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
            {!ready ? <p role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-neutral-500"><LoaderCircle size={18} className="animate-spin" />초안을 불러오는 중…</p>
                : !draft || draft.holdings.length === 0 ? <section className="border-y border-neutral-200 py-10 dark:border-surface-dark-border">
                    <h1 className="text-lg font-semibold">담긴 종목이 없어요</h1>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">종목을 살펴보고 ETF 초안에 추가해 주세요.</p>
                    <Link href="/screener" className={`${PAGE_PRIMARY_ACTION_CLS} mt-4`}>종목 발굴하기</Link>
                </section> : <>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                        <h1 className="font-semibold">{draft.market === "KR" ? "국내" : "미국"} 구성 종목</h1>
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
                    {draft.holdings.length >= 2 && <Link href="/etfs/new" className={`${PAGE_PRIMARY_ACTION_CLS} mt-5 w-full`}>ETF 만들기</Link>}
                </>}
        </main>
    </>;
}
