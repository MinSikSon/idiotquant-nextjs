"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Users, Check } from "lucide-react";

import { useAppDispatch } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/pageHeader";
import { setActiveOwner } from "@/lib/features/ledger/ledgerSlice";
import {
    getLedgerInvite, acceptLedgerInvite, type LedgerInvitePreview,
} from "@/lib/features/ledger/ledgerAPI";

// 토큰이 주소에 들어가는 유일한 동적 라우트다 — 정적으로 구울 수 없고,
// Cloudflare Pages 빌드는 그런 경로에 edge 런타임을 요구한다.
export const runtime = "edge";

const CARD_CLS =
    "bg-white dark:bg-surface-dark-card border border-neutral-200 dark:border-border-subtle-dark rounded-2xl";

/**
 * 초대 수락 화면.
 *
 * 이 경로는 middleware 의 public 목록에 없다 — 로그인하지 않았으면 자동으로
 * /login?callbackUrl=/ledger/join/<token> 으로 보내지고, 카카오 가입까지 마치면
 * 다시 여기로 돌아온다. 그래서 "회원이 아니면 가입" 흐름에 따로 만들 것이 없다.
 */
export default function LedgerJoinPage() {
    const { token } = useParams<{ token: string }>();
    const { status } = useSession();
    const router = useRouter();
    const dispatch = useAppDispatch();

    const [preview, setPreview] = useState<LedgerInvitePreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status !== "authenticated" || !token) return;
        let alive = true;

        (async () => {
            const result = await getLedgerInvite(token);
            if (!alive) return;
            if (result?.success === false) setError(result?.error ?? "초대를 확인하지 못했습니다.");
            else setPreview(result?.data ?? null);
            setLoading(false);
        })();

        return () => { alive = false; };
    }, [status, token]);

    async function handleAccept() {
        setJoining(true);
        setError(null);

        const result = await acceptLedgerInvite(token);
        if (result?.success === false) {
            setError(result?.error ?? "수락하지 못했습니다.");
            setJoining(false);
            return;
        }

        // 수락하자마자 그 가계부를 펼쳐준다 — 수락하고 다시 찾아 들어가게 두지 않는다.
        dispatch(setActiveOwner(String(result?.data?.owner_user_id)));
        router.replace("/ledger");
    }

    const header = (
        <PageHeader
            emoji="📒"
            title="가계부 초대"
            containerClassName="max-w-lg mx-auto px-4 sm:px-7"
        />
    );

    const shell = (children: React.ReactNode) => (
        <div className="min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas">
            {header}
            <div className="max-w-lg mx-auto px-4 sm:px-7 py-6">
                <div className={cn(CARD_CLS, "py-10 px-5 text-center")}>{children}</div>
            </div>
        </div>
    );

    // middleware 가 막아주지만, 세션이 정리되는 찰나에 여기로 떨어질 수 있다.
    if (status === "loading" || (status === "authenticated" && loading)) {
        return shell(<div className="h-6 w-40 mx-auto bg-surface-canvas dark:bg-surface-dark rounded animate-pulse" />);
    }

    if (status === "unauthenticated") {
        return shell(
            <>
                <p className="text-[13px] font-bold text-neutral-700 dark:text-neutral-300">
                    로그인하면 초대를 확인할 수 있습니다.
                </p>
                <Link
                    href={`/login?callbackUrl=/ledger/join/${token}`}
                    className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-black transition-colors"
                >
                    로그인하고 계속하기
                </Link>
            </>
        );
    }

    if (error || !preview) {
        return shell(
            <>
                <p className="text-[13px] font-bold text-neutral-700 dark:text-neutral-300">
                    {error ?? "초대를 찾을 수 없습니다."}
                </p>
                <Link href="/ledger" className="inline-block mt-4 px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-surface-dark-border text-xs font-black text-neutral-600 dark:text-neutral-400">
                    내 가계부로
                </Link>
            </>
        );
    }

    const owner = preview.owner_name ?? "상대방";

    if (preview.already_member || preview.is_mine) {
        return shell(
            <>
                <Check size={28} className="mx-auto mb-3 text-[#16a34a]" strokeWidth={2.4} />
                <p className="text-[13px] font-bold text-neutral-700 dark:text-neutral-300">
                    {preview.is_mine ? "내가 만든 초대입니다." : `이미 ${owner}님의 가계부에 들어와 있습니다.`}
                </p>
                <Link href="/ledger" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-black transition-colors">
                    가계부 열기
                </Link>
            </>
        );
    }

    if (preview.expired || preview.used) {
        return shell(
            <>
                <p className="text-[13px] font-bold text-neutral-700 dark:text-neutral-300">
                    {preview.used ? "이미 사용된 초대입니다." : "기한이 지난 초대입니다."}
                </p>
                <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                    {owner}님께 새 링크를 받아주세요.
                </p>
            </>
        );
    }

    return shell(
        <>
            <Users size={28} className="mx-auto mb-3 text-[#16a34a]" strokeWidth={2.2} />
            <p className="text-[15px] font-black text-neutral-900 dark:text-white">
                {owner}님이 가계부에 초대했습니다
            </p>
            {/* 수락하면 무엇을 보게 되는지 먼저 알린다 — 눌러본 뒤에 알면 늦다. */}
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                수락하면 {owner}님의 <b className="text-neutral-700 dark:text-neutral-300">모든 내역을 보고 함께 기입·수정</b>할 수 있습니다.
                <br />내 가계부는 그대로 남고, 상단에서 오갈 수 있습니다.
            </p>

            <button
                type="button"
                onClick={handleAccept}
                disabled={joining}
                className="w-full min-h-[50px] mt-5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-black disabled:opacity-50 transition-colors"
            >
                {joining ? "들어가는 중…" : "수락하고 함께 쓰기"}
            </button>
            <Link href="/ledger" className="block mt-2 text-xs font-bold text-neutral-400 dark:text-neutral-500">
                나중에
            </Link>
        </>
    );
}
