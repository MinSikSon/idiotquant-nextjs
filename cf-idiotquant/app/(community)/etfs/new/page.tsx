"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Check, ChevronDown, LoaderCircle } from "lucide-react";
import { PageHeader, PAGE_PRIMARY_ACTION_CLS, PAGE_WIDTH } from "@/components/pageHeader";
import { StockLogo } from "@/components/stockLogo";
import { createCommunityEtf, type CommunityEtf, type CommunityEtfDescription } from "@/lib/features/communityEtfs/api";
import { etfPickerHref, readEtfDraft, writeEtfDraft } from "@/lib/features/communityEtfs/draft";
import { CONTROL_FOCUS_CLS, CONTROL_INPUT_CLS } from "@/lib/ui-controls";
import { EtfShareButton } from "../EtfShareButton";

const fieldClass = `mt-2 w-full bg-white px-3 py-2 text-base dark:bg-surface-dark-card ${CONTROL_INPUT_CLS}`;

export default function NewCommunityEtfPage() {
    const { status } = useSession();
    const [draft, setDraft] = useState<ReturnType<typeof readEtfDraft>>();
    const [description, setDescription] = useState<CommunityEtfDescription>({ name: "", idea: "" });
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [published, setPublished] = useState<CommunityEtf>();

    useEffect(() => {
        const saved = readEtfDraft();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(saved);
        if (saved?.description) setDescription(saved.description);
    }, []);

    function updateDescription(next: CommunityEtfDescription) {
        setDescription(next);
        if (draft) {
            try { writeEtfDraft({ ...draft, description: next }); }
            catch { /* 입력은 현재 화면에 유지하고 로그인 전 저장을 다시 시도한다. */ }
        }
    }

    async function publish(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!draft || draft.holdings.length < 2 || saving || status === "loading") return;
        const name = description.name.trim();
        const idea = description.idea.trim();
        if (!name || !idea) {
            setError("가상 ETF 이름과 종목을 고른 이유를 입력해 주세요.");
            return;
        }
        setError("");
        if (status !== "authenticated") {
            try { writeEtfDraft({ ...draft, description }); }
            catch {
                setError("입력한 내용을 저장하지 못했어요. 브라우저 저장 설정을 확인해 주세요.");
                return;
            }
            window.location.assign("/login?callbackUrl=%2Fetfs%2Fnew");
            return;
        }
        setSaving(true);
        const result = await createCommunityEtf({ market: draft.market, holdings: draft.holdings, name, idea });
        if (!result.success || !result.data) {
            setSaving(false);
            setError(result.error || "공개하지 못했어요. 잠시 후 다시 시도해 주세요.");
            return;
        }
        try { writeEtfDraft(null); } catch { /* 공개된 결과는 계속 보여준다. */ }
        setPublished(result.data);
        setSaving(false);
    }

    return <>
        <PageHeader title={published ? "공개 완료" : "가상 ETF 공개하기"} width="content" />
        <main className={`${PAGE_WIDTH.content} pb-[calc(var(--bottombar-h)+2rem)] pt-4 md:pt-6`}>
            <div className="mx-auto max-w-3xl">
                <Link href="/etfs/draft" className={`mb-3 inline-flex min-h-11 items-center gap-2 rounded text-sm font-semibold text-brand-ink ${CONTROL_FOCUS_CLS}`}>
                    <ArrowLeft size={16} aria-hidden="true" />{published ? "내 가상 ETF" : "초안으로 돌아가기"}
                </Link>
                {published ? <section aria-labelledby="published-title" className="border-t border-neutral-200 py-4 dark:border-surface-dark-border">
                    <h2 id="published-title" className="flex items-start gap-2 text-lg font-semibold">
                        <Check size={20} className="mt-1 shrink-0 text-brand-ink" aria-hidden="true" />
                        <span className="min-w-0 break-words">{published.name}</span>
                    </h2>
                    <p role="status" className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">공개 피드에 올렸어요. 종목과 투자 아이디어를 공유해 보세요.</p>
                    <div className="mt-4 flex flex-wrap items-start gap-2">
                        <EtfShareButton item={published} />
                        <Link href="/etfs" className={`${PAGE_PRIMARY_ACTION_CLS} dark:text-neutral-950`}>공개 피드 보기</Link>
                    </div>
                </section> : draft === undefined ? <p role="status" className="text-sm">초안을 불러오는 중…</p>
                    : !draft || draft.holdings.length < 2 ? <section className="border-t border-neutral-200 py-4 dark:border-surface-dark-border">
                        <h2 className="text-lg font-semibold">{draft ? "종목을 1개 더 골라 주세요" : "담은 종목이 없어요"}</h2>
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">같은 시장의 종목을 2개 이상 담으면 공개할 수 있어요.</p>
                        <Link href={etfPickerHref(draft?.market)} className={`${PAGE_PRIMARY_ACTION_CLS} dark:text-neutral-950 mt-4`}>종목 고르기</Link>
                    </section> : <form onSubmit={event => void publish(event)} className="space-y-4">
                        <details className="group border-y border-neutral-200 dark:border-surface-dark-border">
                            <summary className={`flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 rounded py-2 [&::-webkit-details-marker]:hidden ${CONTROL_FOCUS_CLS}`}>
                                <span className="inline-flex items-center gap-1 font-semibold">구성 종목 <ChevronDown size={16} aria-hidden="true" className="text-brand-ink group-open:rotate-180" /></span>
                                <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-300">{draft.market === "KR" ? "국내" : "미국"} · {draft.holdings.length}종목 · 종목당 {(100 / draft.holdings.length).toFixed(1)}%</span>
                            </summary>
                            <ul className="divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-surface-dark-border dark:border-surface-dark-border">
                                {draft.holdings.map(stock => <li key={stock.ticker} className="flex min-h-12 items-center gap-2 py-1">
                                    <StockLogo ticker={stock.ticker} name={stock.name} isUs={draft.market === "US"} />
                                    <span className="min-w-0 break-words font-medium">{stock.name} <span className="text-xs text-neutral-600 dark:text-neutral-400">{stock.ticker}</span></span>
                                </li>)}
                            </ul>
                        </details>
                        <label className="block text-sm font-semibold">가상 ETF 이름
                            <input required maxLength={40} disabled={saving} value={description.name} onChange={event => updateDescription({ ...description, name: event.target.value })} className={`min-h-11 ${fieldClass}`} placeholder="예시 · 배당 성장주 모음" />
                        </label>
                        <label className="block text-sm font-semibold">이 종목들을 고른 이유
                            <textarea required maxLength={140} rows={3} disabled={saving} value={description.idea} onChange={event => updateDescription({ ...description, idea: event.target.value })} className={`leading-relaxed ${fieldClass}`} />
                            <span className="mt-1 block text-right text-xs font-normal tabular-nums text-neutral-600 dark:text-neutral-400">{description.idea.length}/140</span>
                        </label>
                        <div className="border-t border-neutral-200 pt-3 dark:border-surface-dark-border">
                            <p id="etf-publish-scope" className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">공개하면 누구나 이름, 구성 종목, 투자 아이디어를 볼 수 있어요. 가상 ETF는 같은 비중으로 수익률을 살펴보는 모의 구성입니다.</p>
                            {status === "unauthenticated" && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">로그인하면 입력한 내용으로 돌아와 공개할 수 있어요.</p>}
                            {error && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
                            <button type="submit" aria-describedby="etf-publish-scope" disabled={saving || status === "loading"} className={`${PAGE_PRIMARY_ACTION_CLS} dark:text-neutral-950 mt-3`}>
                                {saving && <LoaderCircle size={17} aria-hidden="true" className="motion-safe:animate-spin" />}
                                {saving ? "공개 중…" : status === "unauthenticated" ? "로그인하고 계속" : "피드에 공개하기"}
                            </button>
                        </div>
                    </form>}
            </div>
        </main>
    </>;
}
