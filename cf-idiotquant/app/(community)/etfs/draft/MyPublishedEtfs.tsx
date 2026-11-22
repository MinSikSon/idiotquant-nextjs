"use client";

import { useEffect, useState } from "react";
import { PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { CONTROL_FOCUS_CLS, CONTROL_INPUT_CLS } from "@/lib/ui-controls";
import {
    deleteCommunityEtf, getCommunityEtfs, updateCommunityEtf,
    type CommunityEtf, type CommunityEtfDescription,
} from "@/lib/features/communityEtfs/api";

const PAGE_SIZE = 20;
const actionClass = `min-h-11 rounded px-2 text-sm font-semibold text-brand-ink hover:underline disabled:opacity-50 ${CONTROL_FOCUS_CLS}`;
const fieldClass = `mt-1 w-full bg-white px-3 py-2 text-base dark:bg-surface-dark-card ${CONTROL_INPUT_CLS}`;

type Action = { id: string; kind: "edit"; description: CommunityEtfDescription } | { id: string; kind: "delete" };

export function MyPublishedEtfs() {
    const [items, setItems] = useState<CommunityEtf[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [action, setAction] = useState<Action | null>(null);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ error: boolean; text: string }>();

    function applyPage(result: Awaited<ReturnType<typeof getCommunityEtfs>>, append: boolean) {
        setLoading(false);
        if (!result.success || !Array.isArray(result.data)) {
            setLoadError(result.error || "공개한 ETF를 불러오지 못했습니다.");
            return;
        }
        const data = result.data;
        setItems(current => append ? [...current, ...data] : data);
        setHasMore(data.length === PAGE_SIZE);
        setLoadError("");
    }

    useEffect(() => {
        let active = true;
        void getCommunityEtfs(PAGE_SIZE, 0, true).then(result => {
            if (active) applyPage(result, false);
        });
        return () => { active = false; };
    }, []);

    async function loadMore() {
        setLoading(true);
        setLoadError("");
        applyPage(await getCommunityEtfs(PAGE_SIZE, items.length, true), true);
    }

    async function manage() {
        if (!action || saving) return;
        setFeedback(undefined);
        setSaving(true);
        const { id, kind } = action;
        if (kind === "edit") {
            const result = await updateCommunityEtf(id, action.description);
            if (result.success && result.data) {
                const description = result.data;
                setItems(current => current.map(item => item.id === id ? { ...item, ...description } : item));
                setAction(null);
                setFeedback({ error: false, text: "ETF를 수정했습니다." });
            } else setFeedback({ error: true, text: result.error || "ETF를 수정하지 못했습니다." });
        } else {
            const result = await deleteCommunityEtf(id);
            if (result.success) {
                setItems(current => current.filter(item => item.id !== id));
                setAction(null);
                setFeedback({ error: false, text: "ETF를 삭제했습니다." });
            } else setFeedback({ error: true, text: result.error || "ETF를 삭제하지 못했습니다." });
        }
        setSaving(false);
    }

    return <>
        {!loading && !loadError && items.length === 0 && <p className="py-3 text-sm text-neutral-600 dark:text-neutral-300">아직 공개한 ETF가 없어요.</p>}
        {items.length > 0 && <ul className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
            {items.map(item => <li key={item.id} className="py-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3">
                    <div className="min-w-0">
                        <h3 className="break-words font-semibold">{item.name}</h3>
                        <p className="text-xs tabular-nums text-neutral-600 dark:text-neutral-300">{item.market === "US" ? "미국" : "국내"} · {item.holdings.length}종목</p>
                    </div>
                    <div className="flex gap-1">
                        <button type="button" className={actionClass} aria-label={`${item.name} 수정`} disabled={saving || loading} onClick={() => { setFeedback(undefined); setAction({ id: item.id, kind: "edit", description: { name: item.name, idea: item.idea } }); }}>수정</button>
                        <button type="button" className={actionClass} aria-label={`${item.name} 삭제`} disabled={saving || loading} onClick={() => { setFeedback(undefined); setAction({ id: item.id, kind: "delete" }); }}>삭제</button>
                    </div>
                </div>
                {action?.id === item.id && action.kind === "edit" ? <form className="space-y-2" onSubmit={event => { event.preventDefault(); void manage(); }}>
                    <label className="block text-sm">ETF 이름<input required maxLength={40} className={fieldClass} value={action.description.name} disabled={saving} onChange={event => setAction({ ...action, description: { ...action.description, name: event.target.value } })} /></label>
                    <label className="block text-sm">투자 아이디어<textarea required maxLength={140} rows={3} className={fieldClass} value={action.description.idea} disabled={saving} onChange={event => setAction({ ...action, description: { ...action.description, idea: event.target.value } })} /></label>
                    <div className="flex gap-2">
                        <button type="submit" className={PAGE_PRIMARY_ACTION_CLS} disabled={saving || !action.description.name.trim() || !action.description.idea.trim()}>{saving ? "저장 중…" : "저장"}</button>
                        <button type="button" className={actionClass} disabled={saving} onClick={() => { setFeedback(undefined); setAction(null); }}>취소</button>
                    </div>
                </form> : <p className="break-words text-sm text-neutral-700 dark:text-neutral-300">{item.idea}</p>}
                {action?.id === item.id && action.kind === "delete" && <div className="mt-2">
                    <p className="text-sm">이 ETF를 공개 피드에서 삭제할까요? 삭제한 ETF는 복구할 수 없습니다.</p>
                    <div className="flex gap-2">
                        <button type="button" className={`min-h-11 rounded px-2 text-sm font-semibold text-rose-700 hover:underline disabled:opacity-50 dark:text-rose-300 ${CONTROL_FOCUS_CLS}`} disabled={saving} onClick={() => void manage()}>{saving ? "삭제 중…" : "ETF 삭제 확인"}</button>
                        <button type="button" className={actionClass} disabled={saving} onClick={() => { setFeedback(undefined); setAction(null); }}>취소</button>
                    </div>
                </div>}
                {action?.id === item.id && feedback?.error && <p role="alert" className="py-2 text-sm text-rose-700 dark:text-rose-300">{feedback.text}</p>}
            </li>)}
        </ul>}
        {feedback && !feedback.error && <p role="status" className="py-2 text-sm text-brand-ink">{feedback.text}</p>}
        {loadError && <p role="alert" className="py-2 text-sm text-rose-700 dark:text-rose-300">{loadError}</p>}
        {loading ? <p role="status" className="py-3 text-sm text-neutral-600 dark:text-neutral-300">공개한 ETF를 불러오는 중…</p>
            : (hasMore || loadError) && <button type="button" className={actionClass} disabled={Boolean(action)} onClick={() => void loadMore()}>{loadError ? "다시 불러오기" : "내 ETF 더 보기"}</button>}
    </>;
}
