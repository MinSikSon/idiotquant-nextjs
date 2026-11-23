"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { PAGE_ACTION_CLS } from "@/components/pageHeader";
import type { CommunityEtf } from "@/lib/features/communityEtfs/api";
import { etfHoldingsText } from "@/lib/features/communityEtfs/marketData";

export function EtfShareButton({ item }: { item: CommunityEtf }) {
    const [feedback, setFeedback] = useState<{ error: boolean; text: string }>();
    const [sharing, setSharing] = useState(false);

    async function share() {
        setSharing(true);
        setFeedback(undefined);
        const text = [
            `${item.name} · 가상 ETF`,
            item.idea,
            `${item.market === "KR" ? "국내" : "미국"} ${item.holdings.length}종목 · 동일 비중`,
            etfHoldingsText(item.holdings),
            `공개 피드 ${new URL("/etfs", window.location.origin).href}`,
        ].join("\n\n");

        try {
            if (navigator.share) {
                try {
                    await navigator.share({ title: item.name, text });
                    return;
                } catch (error) {
                    if (error instanceof DOMException && error.name === "AbortError") return;
                }
            }
            await navigator.clipboard.writeText(text);
            setFeedback({ error: false, text: "공유할 내용을 복사했어요." });
        } catch {
            setFeedback({ error: true, text: "공유하지 못했어요. 브라우저의 클립보드 권한을 확인해 주세요." });
        } finally {
            setSharing(false);
        }
    }

    return <div className="min-w-0">
        <button type="button" onClick={() => void share()} disabled={sharing} aria-label={`${item.name} 공유하기`} className={PAGE_ACTION_CLS}>
            <Share2 size={16} aria-hidden="true" /> 공유하기
        </button>
        {feedback && <p role={feedback.error ? "alert" : "status"} className={`mt-1 text-sm ${feedback.error ? "text-rose-700 dark:text-rose-300" : "text-brand-ink"}`}>{feedback.text}</p>}
    </div>;
}
