"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { PAGE_ACTION_CLS } from "@/components/pageHeader";
import { apiRequest } from "@/lib/features/apiRequest";
import { formatBillingAmount, billingDate } from "@/lib/utils/billingFormat";

import { billingPanel as panel, billingStatusLabels, MemberProviders, type BillingMember } from "./BillingMembers";

type History = {
    account: { id: string; email: string | null };
    payments: {
        stripe_session_id: string;
        status: "pending" | "paid";
        amount: number;
        currency: string;
        created_at: string;
        paid_at: string | null;
        pass: { status: "active" | "expired" | "canceled"; expiresAt: string } | null;
        stripeUrl: string | null;
        provider?: "toss";
    }[];
    deliveries: { delivery_day: string; claimed_at: string; sent_at: string | null }[];
    nextOffset: number | null;
};

const cell = "px-4 py-2";

function Timestamp({ value }: { value: string }) {
    return <time dateTime={value} className="whitespace-nowrap tabular-nums">{billingDate.format(new Date(value))}</time>;
}

export default function BillingHistory({ accountId, member }: { accountId: string; member?: BillingMember }) {
    const [offset, setOffset] = useState(0);
    const [refresh, setRefresh] = useState(0);
    const [response, setResponse] = useState<{ key: string; history?: History | null; error: string }>();
    const requestKey = JSON.stringify([accountId, offset, refresh]);
    const loading = response?.key !== requestKey;
    const history = loading ? undefined : response.history;
    const error = loading ? "" : response.error;

    useEffect(() => {
        let current = true;
        void apiRequest("/billing/admin", {
            method: "POST", body: { query: accountId, offset },
        }).then(result => {
            if (!current) return;
            setResponse({ key: requestKey, history: result.success ? result.data : undefined, error: result.success ? "" : result.error });
        });
        return () => { current = false; };
    }, [accountId, offset, requestKey]);

    return (
        <>
            {loading && <p role="status" className="text-sm">이력을 조회하는 중입니다.</p>}
            {error && (
                <div className="flex flex-wrap items-center gap-3">
                    <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    <button type="button" className={PAGE_ACTION_CLS} onClick={() => setRefresh(value => value + 1)}>다시 불러오기</button>
                </div>
            )}
            {history === null && <p role="status" className="text-sm">일치하는 계정이나 이력이 없습니다.</p>}
            {history && (
                <>
                    <div className="min-w-0 break-all">
                        <h2 className="font-semibold">{member?.name || history.account.email || "계정별 이력"}</h2>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">계정 ID {history.account.id}</p>
                        {member && (
                            <div className="mt-2 space-y-1.5 text-sm">
                                <MemberProviders providers={member.providers} />
                                <p>로그인 이메일 {history.account.email ?? "없음"}</p>
                                <p>이용권 {billingStatusLabels[member.status]}{member.expiresAt && <> · 만료 <Timestamp value={member.expiresAt} /> (KST)</>}</p>
                                <p>관심종목 알림 수신 이메일 {member.recipient ?? "미등록"}</p>
                                <p>관심종목 예약 발송 {member.deliveryEnabled ? "대상" : "대상 아님"}</p>
                                <p>무료 종목 메일 {member.mailingRecipient ?? "수신 신청 없음"}</p>
                            </div>
                        )}
                    </div>
                    <section className={panel} aria-labelledby="admin-payments">
                        <h3 id="admin-payments" className="px-4 py-3 font-semibold">결제·이용권 이력 <span className="text-sm font-normal">(KST)</span></h3>
                        <p className="px-4 pb-3 text-sm">환불 상태는 각 결제 서비스에서 확인할 수 있습니다.</p>
                        {history.payments.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-surface-canvas dark:bg-surface-dark-hover">
                                        <tr>
                                            {["결제 상태", "금액", "결제 시각", "이용권 상태", "만료 시각", "결제 서비스"].map(label =>
                                                <th key={label} scope="col" className={`${cell} whitespace-nowrap`}>{label}</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-border-subtle-dark">
                                        {history.payments.map(payment => (
                                            <tr key={payment.stripe_session_id}>
                                                <td className={`${cell} whitespace-nowrap`}>{payment.status === "paid" ? "완료" : "미확인"}</td>
                                                <td className={`${cell} tabular-nums`}>{formatBillingAmount(payment)}</td>
                                                <td className={cell}>
                                                    {payment.paid_at ? <Timestamp value={payment.paid_at} /> : <><span className="mr-1">생성</span><Timestamp value={payment.created_at} /></>}
                                                </td>
                                                <td className={`${cell} whitespace-nowrap`}>{payment.pass?.status === "active" ? "활성" : payment.pass?.status === "expired" ? "만료" : payment.pass?.status === "canceled" ? "취소" : "미부여"}</td>
                                                <td className={cell}>{payment.pass ? <Timestamp value={payment.pass.expiresAt} /> : "—"}</td>
                                                <td className={cell}>{payment.stripeUrl ? (
                                                    <a href={payment.stripeUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap font-semibold text-brand-ink hover:underline">
                                                        결제 상세 <ExternalLink size={14} aria-hidden="true" />
                                                    </a>
                                                ) : payment.provider === "toss" ? "토스페이먼츠" : "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="px-4 pb-4 text-sm">이 페이지에 결제 이력이 없습니다.</p>}
                    </section>
                    <section className={panel} aria-labelledby="admin-deliveries">
                        <h3 id="admin-deliveries" className="px-4 py-3 font-semibold">관심종목 메일 발송 이력 <span className="text-sm font-normal">(KST)</span></h3>
                        {history.deliveries.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-surface-canvas dark:bg-surface-dark-hover">
                                        <tr>
                                            {["기준일", "상태", "처리 시작", "발송 수락"].map(label =>
                                                <th key={label} scope="col" className={`${cell} whitespace-nowrap`}>{label}</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-border-subtle-dark">
                                        {history.deliveries.map(delivery => (
                                            <tr key={delivery.delivery_day}>
                                                <td className={`${cell} whitespace-nowrap`}><time dateTime={delivery.delivery_day}>{delivery.delivery_day}</time></td>
                                                <td className={`${cell} whitespace-nowrap`}>{delivery.sent_at ? "발송 수락" : "발송 결과 미확인"}</td>
                                                <td className={cell}><Timestamp value={delivery.claimed_at} /></td>
                                                <td className={cell}>{delivery.sent_at ? <Timestamp value={delivery.sent_at} /> : "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="px-4 pb-4 text-sm">이 페이지에 메일 발송 이력이 없습니다.</p>}
                    </section>
                    <div className="flex flex-wrap gap-2">
                        {offset > 0 && <button type="button" className={PAGE_ACTION_CLS} disabled={loading} onClick={() => setOffset(offset - 50)}>이전 이력</button>}
                        {history.nextOffset !== null && <button type="button" className={PAGE_ACTION_CLS} disabled={loading} onClick={() => setOffset(history.nextOffset ?? 0)}>다음 이력</button>}
                    </div>
                </>
            )}
        </>
    );
}
