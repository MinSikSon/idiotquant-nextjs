"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CreditCard, ExternalLink } from "lucide-react";
import { PAGE_ACTION_CLS, PAGE_PRIMARY_ACTION_CLS, PAGE_WIDTH, PageHeader } from "@/components/pageHeader";
import { apiRequest } from "@/lib/features/apiRequest";
import { formatBillingAmount, billingDate } from "@/lib/utils/billingFormat";

import BillingSubscriptions from "./BillingSubscriptions";

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
    }[];
    deliveries: { delivery_day: string; claimed_at: string; sent_at: string | null }[];
    nextOffset: number | null;
};

const cell = "px-4 py-2";
const panel = "rounded-[var(--radius-panel)] border border-neutral-200 bg-white dark:border-border-subtle-dark dark:bg-surface-dark-card";

function Timestamp({ value }: { value: string }) {
    return <time dateTime={value} className="whitespace-nowrap tabular-nums">{billingDate.format(new Date(value))}</time>;
}

export default function BillingHistory() {
    const [query, setQuery] = useState("");
    const [history, setHistory] = useState<History | null | undefined>();
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function load(account: string, nextOffset: number) {
        setLoading(true);
        setError("");
        const result = await apiRequest("/billing/admin", {
            method: "POST", body: { query: account, offset: nextOffset },
        });
        if (result.success) {
            setHistory(result.data);
            setOffset(nextOffset);
        } else {
            setError(result.error);
        }
        setLoading(false);
    }

    function search(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading || !query.trim()) return;
        setHistory(undefined);
        void load(query.trim(), 0);
    }

    return (
        <>
            <PageHeader icon={<CreditCard size={18} />} title="구독관리" meta="Stripe 테스트 모드" mobileTitleInNavigation />
            <main className={`${PAGE_WIDTH.data} service-content flex flex-col gap-5`}>
                <Link href="/admin" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-brand-ink hover:underline">어드민 대시보드</Link>
                <BillingSubscriptions />
                <form onSubmit={search} className={`${panel} space-y-2 p-4`}>
                    <h2 className="font-semibold">계정별 결제·발송 이력</h2>
                    <label htmlFor="billing-account" className="block text-sm">로그인 이메일 또는 계정 ID</label>
                    <div className="flex flex-wrap gap-2">
                        <input id="billing-account" type="search" name="account" required maxLength={254} autoComplete="off"
                            value={query} onChange={event => setQuery(event.target.value)}
                            className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-control)] border border-neutral-400 bg-transparent px-3 text-base focus-visible:outline-2 focus-visible:outline-brand-ink dark:border-border-subtle-dark" />
                        <button type="submit" className={PAGE_PRIMARY_ACTION_CLS} disabled={loading || !query.trim()}>검색</button>
                    </div>
                </form>
                {loading && <p role="status" className="text-sm">이력을 조회하는 중입니다.</p>}
                {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
                {history === null && <p role="status" className="text-sm">일치하는 계정이나 이력이 없습니다.</p>}
                {history && (
                    <>
                        <div className="min-w-0 break-all">
                            <h2 className="font-semibold">{history.account.email ?? "이메일 정보 없음"}</h2>
                            <p className="text-sm text-neutral-600 dark:text-neutral-300">계정 ID {history.account.id}</p>
                        </div>
                        <section className={panel} aria-labelledby="admin-payments">
                            <h3 id="admin-payments" className="px-4 py-3 font-semibold">결제·이용권 이력 <span className="text-sm font-normal">(KST)</span></h3>
                            {history.payments.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-surface-canvas dark:bg-surface-dark-hover">
                                            <tr>
                                                {["결제 상태", "금액", "결제 시각", "이용권 상태", "만료 시각", "Stripe"].map(label =>
                                                    <th key={label} scope="col" className={`${cell} whitespace-nowrap`}>{label}</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-200 dark:divide-border-subtle-dark">
                                            {history.payments.map(payment => (
                                                <tr key={payment.stripe_session_id}>
                                                    <td className={`${cell} whitespace-nowrap`}>{payment.status === "paid" ? "완료" : "대기"}</td>
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
                                                    ) : "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="px-4 pb-4 text-sm">이 페이지에 결제 이력이 없습니다.</p>}
                        </section>
                        <section className={panel} aria-labelledby="admin-deliveries">
                            <h3 id="admin-deliveries" className="px-4 py-3 font-semibold">메일 발송 이력 <span className="text-sm font-normal">(KST)</span></h3>
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
                            {offset > 0 && <button type="button" className={PAGE_ACTION_CLS} disabled={loading} onClick={() => void load(history.account.id, offset - 50)}>이전 이력</button>}
                            {history.nextOffset !== null && <button type="button" className={PAGE_ACTION_CLS} disabled={loading} onClick={() => void load(history.account.id, history.nextOffset ?? 0)}>다음 이력</button>}
                        </div>
                    </>
                )}
            </main>
        </>
    );
}
