"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { PageHeader, PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { StockLogo } from "@/components/stockLogo";
import { CommunityEtfDraft, createCommunityEtf } from "@/lib/features/communityEtfs/api";

const DRAFT_KEY = "idiotquant:community-etf-draft:v1";

export default function NewCommunityEtfPage() {
    const router = useRouter();
    const { status } = useSession();
    const [draft, setDraft] = useState<CommunityEtfDraft | null>(null);
    const [name, setName] = useState("");
    const [idea, setIdea] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        try {
            const parsed = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
            if ((parsed?.market === "KR" || parsed?.market === "US") && Array.isArray(parsed?.holdings)) {
                // 스크리너에서 넘긴 임시 초안을 클라이언트 저장소에서 복원한다.
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setDraft(parsed);
            }
        } catch { /* 스크리너에서 온 임시 선택이 없으면 안내를 보여준다. */ }
    }, []);

    async function publish() {
        if (!draft || saving) return;
        setError("");
        if (status !== "authenticated") {
            window.location.assign(`/login?callbackUrl=${encodeURIComponent("/etfs/new")}`);
            return;
        }
        setSaving(true);
        const result = await createCommunityEtf({ ...draft, name, idea });
        setSaving(false);
        if (!result.success) { setError(result.error || "ETF를 공개하지 못했습니다."); return; }
        try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* 공개는 완료됐으므로 이동을 계속한다. */ }
        router.replace("/etfs");
    }

    return <>
        <PageHeader title="나만의 ETF 만들기" width="content" />
        <main className="mx-auto max-w-2xl space-y-5 px-4 pb-[calc(var(--bottombar-h)+2rem)] pt-5 text-neutral-900 dark:text-neutral-100 sm:pt-8">
            <Link href="/screener" className="inline-flex min-h-11 items-center gap-2 text-sm text-brand-ink"><ArrowLeft size={16} aria-hidden="true" />종목 발굴로 돌아가기</Link>
            {!draft ? <section className="border-y border-neutral-200 py-10 dark:border-surface-dark-border"><h1 className="text-lg font-semibold">선택한 종목이 없어요</h1><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">스크리너에서 종목을 2개 이상 선택한 뒤 ETF 만들기를 눌러 주세요.</p><Link href="/screener" className={`${PAGE_PRIMARY_ACTION_CLS} mt-4`}>종목 고르기</Link></section>
                : <>
                    <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">선택한 종목을 같은 비중으로 담고, 이 ETF의 투자 아이디어를 적어 공개하세요.</p>
                    <section aria-label="선택한 종목" className="border-y border-neutral-200 py-3 dark:border-surface-dark-border">
                        <div className="mb-2 flex items-baseline justify-between gap-3"><h1 className="font-semibold">구성 종목</h1><span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-300">{draft.holdings.length}종목 · 각 {(100 / draft.holdings.length).toFixed(1)}%</span></div>
                        <ul className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
                            {draft.holdings.map(stock => <li key={stock.ticker} className="flex min-h-14 items-center gap-3 py-2"><StockLogo ticker={stock.ticker} name={stock.name} isUs={draft.market === "US"} /><span className="min-w-0 flex-1 break-words font-medium">{stock.name}<span className="ml-2 text-xs text-neutral-500">{stock.ticker}</span></span></li>)}
                        </ul>
                    </section>
                    <label className="block text-sm font-medium">ETF 이름<input value={name} onChange={event => setName(event.target.value)} maxLength={40} className="mt-2 min-h-11 w-full rounded border border-neutral-300 bg-white px-3 text-base dark:border-surface-dark-border dark:bg-surface-dark-card" placeholder="예: 배당 성장주 모음" /></label>
                    <label className="block text-sm font-medium">투자 아이디어<textarea value={idea} onChange={event => setIdea(event.target.value)} maxLength={140} rows={3} className="mt-2 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-base leading-relaxed dark:border-surface-dark-border dark:bg-surface-dark-card" placeholder="이 종목들을 함께 고른 이유를 적어 주세요." /><span className="mt-1 block text-right text-xs text-neutral-500">{idea.length}/140</span></label>
                    {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
                    <button type="button" disabled={saving || draft.holdings.length < 2 || !name.trim() || !idea.trim()} onClick={() => void publish()} className={`${PAGE_PRIMARY_ACTION_CLS} w-full`}>
                        {saving && <LoaderCircle size={17} className="animate-spin" />}{status === "authenticated" ? "ETF 공개하기" : "로그인하고 공개하기"}
                    </button>
                    <p className="text-xs leading-5 text-neutral-500">공개한 ETF는 피드에서 누구나 볼 수 있습니다. 수익률이나 투자 성과를 나타내는 정보는 아닙니다.</p>
                </>}
        </main>
    </>;
}
