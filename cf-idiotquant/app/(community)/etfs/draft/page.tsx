"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, Plus, X } from "lucide-react";
import { PageHeader, PAGE_PRIMARY_ACTION_CLS, PAGE_WIDTH } from "@/components/pageHeader";
import { StockLogo } from "@/components/stockLogo";
import { etfPickerHref, readEtfDraft, writeEtfDraft } from "@/lib/features/communityEtfs/draft";
import { CONTROL_FOCUS_CLS } from "@/lib/ui-controls";
import { EtfNavigation } from "../EtfNavigation";
import { MyPublishedEtfs } from "./MyPublishedEtfs";

export default function CommunityEtfDraftPage() {
    const { data: session, status } = useSession();
    const [draft, setDraft] = useState<ReturnType<typeof readEtfDraft>>();
    const [error, setError] = useState("");
    const count = draft?.holdings.length ?? 0;

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(readEtfDraft());
    }, []);

    function removeHolding(ticker: string) {
        if (!draft) return;
        const next = { ...draft, holdings: draft.holdings.filter(holding => holding.ticker !== ticker) };
        try {
            writeEtfDraft(next);
            setDraft(next.holdings.length ? next : null);
            setError("");
        } catch {
            setError("종목을 빼지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
    }

    return <>
        <PageHeader title="가상 ETF" width="content" tabs={<EtfNavigation active="mine" />}
            primaryAction={draft !== undefined && <Link href={etfPickerHref(draft?.market)} className={`${PAGE_PRIMARY_ACTION_CLS} dark:text-neutral-950`}>
                <Plus size={16} aria-hidden="true" />{count ? "종목 추가" : "종목 고르기"}
            </Link>} />
        <main className={`${PAGE_WIDTH.content} pt-5 pb-[calc(var(--bottombar-h)+2rem)] md:pt-8`}>
            <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-2 md:gap-10">
                <section aria-labelledby="draft-title">
                    <h2 id="draft-title" className="text-lg font-semibold">작성 중인 초안</h2>
                    {draft === undefined ? <p role="status" className="py-3 text-sm text-neutral-600 dark:text-neutral-300">초안을 불러오는 중…</p>
                        : !draft ? <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">같은 시장의 종목을 2개 이상 골라 보세요. 선택한 종목은 같은 비중으로 담깁니다.</p>
                        : <>
                            <p className="mt-2 text-sm tabular-nums text-neutral-600 dark:text-neutral-300">
                                {draft.market === "KR" ? "국내" : "미국"} · {count}종목 · 종목당 {(100 / count).toFixed(1)}%
                            </p>
                            <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-surface-dark-border dark:border-surface-dark-border">
                                {draft.holdings.map(holding => <li key={holding.ticker} className="flex min-h-14 items-center gap-3 py-1">
                                    <StockLogo ticker={holding.ticker} name={holding.name} isUs={draft.market === "US"} />
                                    <span className="min-w-0 flex-1 break-words font-medium">{holding.name} <span className="text-xs text-neutral-600 dark:text-neutral-400">{holding.ticker}</span></span>
                                    <button type="button" onClick={() => removeHolding(holding.ticker)} aria-label={`${holding.name} 초안에서 빼기`} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-surface-dark-hover ${CONTROL_FOCUS_CLS}`}><X size={18} aria-hidden="true" /></button>
                                </li>)}
                            </ul>
                            {error && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
                            {count >= 2
                                ? <Link href="/etfs/new" className={`${PAGE_PRIMARY_ACTION_CLS} dark:text-neutral-950 mt-4`}>공개 내용 작성 <ArrowRight size={16} aria-hidden="true" /></Link>
                                : <p role="status" className="mt-3 text-sm font-medium text-brand-ink">같은 시장의 종목을 1개 더 담아 주세요.</p>}
                        </>}
                    {count > 0 && <p className="mt-3 text-xs leading-5 text-neutral-600 dark:text-neutral-400">초안은 현재 브라우저 탭에 임시 저장됩니다.</p>}
                </section>
                <section aria-labelledby="published-etfs-title" className="border-t border-neutral-200 pt-4 dark:border-surface-dark-border md:border-l md:border-t-0 md:pl-8 md:pt-0">
                    <h2 id="published-etfs-title" className="text-lg font-semibold">내가 공개한 가상 ETF</h2>
                    {status === "loading" ? <p role="status" className="py-3 text-sm text-neutral-600 dark:text-neutral-300">공개한 가상 ETF를 불러오는 중…</p>
                        : session?.user?.id ? <MyPublishedEtfs key={session.user.id} />
                        : <Link href="/login?callbackUrl=%2Fetfs%2Fdraft" className={`inline-flex min-h-11 items-center rounded text-sm font-semibold text-brand-ink underline-offset-4 hover:underline ${CONTROL_FOCUS_CLS}`}>로그인하고 공개한 ETF 보기</Link>}
                </section>
            </div>
        </main>
    </>;
}
