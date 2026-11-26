"use client";

import { useEffect, useState } from "react";
import { PAGE_ACTION_CLS, PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { apiRequest } from "@/lib/features/apiRequest";
import { cancellationLabel, type Cancellation, type CancellationStatus } from "@/lib/utils/billingCancellation";
import { billingDate } from "@/lib/utils/billingFormat";

type Decision = Exclude<CancellationStatus, "pending">;
type Filter = "subscriptions" | "all" | CancellationStatus;
type Subscription = {
    accountId: string;
    email: string | null;
    sessionId: string;
    recipients: string[];
    paidAt: string;
    expiresAt: string;
    status: "active" | "expired" | "canceled";
    cancellation: (Cancellation & { resolvedBy: string | null }) | null;
};
type SubscriptionPage = { subscriptions: Subscription[]; nextOffset: number | null };

const passLabel = { active: "활성", expired: "만료", canceled: "취소" };
const panel = "rounded-[var(--radius-panel)] border border-neutral-200 bg-white dark:border-border-subtle-dark dark:bg-surface-dark-card";
const input = "min-h-11 rounded-[var(--radius-control)] border border-neutral-400 bg-transparent px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-ink dark:border-border-subtle-dark dark:bg-surface-dark-card";

function Time({ value }: { value: string }) {
    return <time dateTime={value} className="tabular-nums">{billingDate.format(new Date(value))}</time>;
}

export default function BillingSubscriptions({ accountId, onDecision }: { accountId: string | null; onDecision: () => void }) {
    const [filter, setFilter] = useState<Filter>("pending");
    const [pageOffsets, setPageOffsets] = useState([0]);
    const [page, setPage] = useState<SubscriptionPage | null>(null);
    const [refresh, setRefresh] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [confirmation, setConfirmation] = useState<{ sessionId: string; decision: Decision } | null>(null);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");
    const [actionError, setActionError] = useState("");
    const offset = pageOffsets[pageOffsets.length - 1];

    useEffect(() => {
        let current = true;
        void apiRequest("/billing/admin/subscriptions", {
            method: "POST",
            body: { offset, accountId, requestStatus: filter === "subscriptions" ? null : filter },
        }).then(result => {
            if (!current) return;
            setPage(result.success ? result.data : null);
            setError(result.success ? "" : result.error);
            setLoading(false);
        });
        return () => { current = false; };
    }, [accountId, filter, offset, refresh]);

    function refreshList() {
        setLoading(true);
        setError("");
        setRefresh(value => value + 1);
    }

    async function decide() {
        if (!confirmation || saving) return;
        setSaving(true);
        setActionError("");
        setNotice("");
        const result = await apiRequest("/billing/admin/cancellation", {
            method: "POST", body: confirmation,
        });
        setSaving(false);
        if (result.success || result.status === 409) {
            setConfirmation(null);
            setPageOffsets([0]);
            refreshList();
        }
        if (result.success) {
            onDecision();
            setNotice(confirmation.decision === "approved" ? "취소 요청을 승인했습니다." : "취소 요청을 반려했습니다.");
        } else {
            setActionError(result.error);
        }
    }

    return (
        <>
            <section aria-labelledby="subscription-flow" className={`${panel} p-4`}>
                <h2 id="subscription-flow" className="font-semibold">서비스 흐름</h2>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                    <li>사용자가 수신 이메일을 등록하고 토스페이먼츠에서 30일 이용권을 테스트 결제합니다.</li>
                    <li>결제가 확인되면 이용권이 활성화됩니다. 지정된 테스트 계정은 매일 오전 9시(KST) 발송 작업에서 새 목표가 현황을 받습니다.</li>
                    <li>이용권은 30일 후 만료됩니다. 이용 중인 사용자가 취소를 요청하면 관리자가 승인하거나 반려합니다.</li>
                </ol>
            </section>
            <section aria-labelledby="subscription-list" className={panel}>
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                        <h2 id="subscription-list" className="font-semibold">이용권과 취소 요청</h2>
                        {accountId && <p className="text-sm [overflow-wrap:anywhere]">계정 ID {accountId}</p>}
                    </div>
                    <label className="flex flex-wrap items-center gap-2 text-sm">
                        목록 보기
                        <select value={filter} disabled={saving} className={input} onChange={event => {
                            setLoading(true);
                            setError("");
                            setConfirmation(null);
                            setActionError("");
                            setNotice("");
                            setPageOffsets([0]);
                            setFilter(event.target.value as Filter);
                        }}>
                            <option value="subscriptions">전체 이용권</option>
                            <option value="pending">대기 중인 취소 요청</option>
                            <option value="all">모든 취소 요청</option>
                            <option value="approved">승인된 취소 요청</option>
                            <option value="rejected">반려된 취소 요청</option>
                        </select>
                    </label>
                </div>
                {notice && <p role="status" className="px-4 pb-3 text-sm">{notice}</p>}
                {actionError && <p role="alert" className="px-4 pb-3 text-sm text-red-700 dark:text-red-300">{actionError}</p>}
                {loading ? <p role="status" className="px-4 pb-4 text-sm">목록을 불러오는 중입니다.</p> : error ? (
                    <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
                        <p role="alert" className="text-sm">{error}</p>
                        <button type="button" className={PAGE_ACTION_CLS} onClick={refreshList}>다시 불러오기</button>
                    </div>
                ) : page?.subscriptions.length ? (
                    <ul className="divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-border-subtle-dark dark:border-border-subtle-dark">
                        {page.subscriptions.map(row => (
                            <li key={row.sessionId} className="px-4 py-3">
                                <div className="grid gap-2 lg:grid-cols-3 lg:gap-5">
                                    <div className="min-w-0 text-sm [overflow-wrap:anywhere]">
                                        <h3 className="font-semibold">{row.email ?? "로그인 이메일 없음"}</h3>
                                        <p className="text-neutral-700 dark:text-neutral-300">계정 ID {row.accountId}</p>
                                    </div>
                                    <dl className="min-w-0 text-sm [overflow-wrap:anywhere]">
                                        <dt className="font-semibold">알림 수신 이메일</dt>
                                        <dd>{row.recipients[0] ?? "등록 주소 없음"}</dd>
                                    </dl>
                                    <div className="text-sm">
                                        <p className="font-semibold">이용권 {passLabel[row.status]}</p>
                                        <p>결제 <Time value={row.paidAt} /></p>
                                        <p>{row.status === "canceled" ? "기존 만료" : "만료"} <Time value={row.expiresAt} /> (KST)</p>
                                    </div>
                                </div>
                                {row.cancellation && (
                                    <div className="mt-3 text-sm">
                                        <p className="font-semibold">취소 {cancellationLabel[row.cancellation.status]}</p>
                                        <p>접수 <Time value={row.cancellation.requestedAt} /> (KST)</p>
                                        {row.cancellation.reason && <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{row.cancellation.reason}</p>}
                                        {row.cancellation.resolvedAt && <p className="[overflow-wrap:anywhere]">처리 <Time value={row.cancellation.resolvedAt} /> (KST) · 관리자 ID {row.cancellation.resolvedBy}</p>}
                                        {row.cancellation.status === "pending" && (
                                            confirmation?.sessionId === row.sessionId ? (
                                                <div className="mt-2 space-y-2">
                                                    <p>{confirmation.decision === "approved"
                                                        ? "승인하면 이용권과 알림 발송이 종료됩니다. 환불은 해당 결제 서비스에서 별도로 처리합니다."
                                                        : "이 취소 요청을 반려합니다."}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button type="button" className={PAGE_PRIMARY_ACTION_CLS} disabled={saving} onClick={() => void decide()}>{saving ? "처리 중" : `${cancellationLabel[confirmation.decision]} 확정`}</button>
                                                        <button type="button" className={PAGE_ACTION_CLS} disabled={saving} onClick={() => setConfirmation(null)}>돌아가기</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <button type="button" className={PAGE_ACTION_CLS} disabled={saving} onClick={() => setConfirmation({ sessionId: row.sessionId, decision: "approved" })}>승인</button>
                                                    <button type="button" className={PAGE_ACTION_CLS} disabled={saving} onClick={() => setConfirmation({ sessionId: row.sessionId, decision: "rejected" })}>반려</button>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="px-4 pb-4 text-sm">{filter === "subscriptions" ? "결제가 확인된 이용권이 없습니다." : "선택한 상태의 취소 요청이 없습니다."}</p>
                )}
                {!loading && !error && (pageOffsets.length > 1 || page?.nextOffset != null) && (
                    <div className="flex flex-wrap gap-2 px-4 py-3">
                        <button type="button" className={PAGE_ACTION_CLS} disabled={saving || pageOffsets.length === 1} onClick={() => {
                            setLoading(true);
                            setConfirmation(null);
                            setPageOffsets(pageOffsets.slice(0, -1));
                        }}>이전 페이지</button>
                        <button type="button" className={PAGE_ACTION_CLS} disabled={saving || page?.nextOffset == null} onClick={() => {
                            if (page?.nextOffset == null) return;
                            setLoading(true);
                            setConfirmation(null);
                            setPageOffsets([...pageOffsets, page.nextOffset]);
                        }}>다음 페이지</button>
                    </div>
                )}
            </section>
        </>
    );
}
