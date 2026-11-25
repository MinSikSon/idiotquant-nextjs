"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { PAGE_ACTION_CLS, PAGE_PRIMARY_ACTION_CLS, PAGE_WIDTH, PageHeader } from "@/components/pageHeader";
import BillingHistory from "./BillingHistory";
import BillingMembers, { type BillingMember } from "./BillingMembers";
import BillingSubscriptions from "./BillingSubscriptions";

export default function BillingManagement() {
    const [view, setView] = useState<"members" | "requests">("members");
    const [requestAccountId, setRequestAccountId] = useState<string | null>(null);
    const [requestsOpened, setRequestsOpened] = useState(false);
    const [selected, setSelected] = useState<{ id: string; member?: BillingMember } | null>(null);
    const [revision, setRevision] = useState(0);
    const detailHeading = useRef<HTMLHeadingElement>(null);
    const memberButton = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (view === "members" && selected) detailHeading.current?.focus();
    }, [view, selected]);

    function openRequests(accountId: string | null) {
        setRequestAccountId(accountId);
        setRequestsOpened(true);
        setView("requests");
    }

    return (
        <>
            <PageHeader icon={<CreditCard size={18} />} title="구독관리" meta="Stripe 테스트 모드" mobileTitleInNavigation />
            <main className={`${PAGE_WIDTH.data} service-content flex flex-col gap-4`}>
                <Link href="/admin" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-brand-ink hover:underline">어드민 대시보드</Link>
                <nav aria-label="구독관리 메뉴" className="flex flex-wrap gap-2">
                    <button ref={memberButton} type="button" aria-pressed={view === "members"}
                        className={view === "members" ? PAGE_PRIMARY_ACTION_CLS : PAGE_ACTION_CLS}
                        onClick={() => setView("members")}>회원별 구독</button>
                    <button type="button" aria-pressed={view === "requests"}
                        className={view === "requests" ? PAGE_PRIMARY_ACTION_CLS : PAGE_ACTION_CLS}
                        onClick={() => openRequests(null)}>이용권·취소 요청</button>
                </nav>
                <div hidden={view !== "members" || Boolean(selected)}>
                    <BillingMembers revision={revision} onSelect={(id, member) => setSelected({ id, member })} />
                </div>
                {view === "members" && selected && (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className={PAGE_ACTION_CLS} onClick={() => {
                                setSelected(null);
                                memberButton.current?.focus();
                            }}>회원 목록으로</button>
                            <button type="button" className={PAGE_ACTION_CLS}
                                onClick={() => openRequests(selected.id)}>이 회원의 취소 요청</button>
                        </div>
                        <h2 ref={detailHeading} tabIndex={-1} className="font-semibold">결제·발송 이력</h2>
                        <BillingHistory key={selected.id} accountId={selected.id} member={selected.member} />
                    </div>
                )}
                {requestsOpened && (
                    <div hidden={view !== "requests"}>
                        <div className="flex flex-col gap-4">
                            <BillingSubscriptions key={requestAccountId ?? "all"} accountId={requestAccountId} onDecision={() => {
                                setSelected(null);
                                setRevision(value => value + 1);
                            }} />
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
