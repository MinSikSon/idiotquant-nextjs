"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/features/apiRequest";

type Money = { amount: number; currency: string };
type Payment = Money & { stripe_session_id: string; paid_at: string };
type BillingData = {
    offer: Money;
    payments: Payment[];
    returnStatus: "paid" | "pending" | null;
};

function formatAmount({ amount, currency }: Money) {
    const formatter = new Intl.NumberFormat("ko-KR", { style: "currency", currency });
    // Stripe의 ISK, UGX 금액 표기는 소수점 두 자리를 사용합니다.
    const digits = ["isk", "ugx"].includes(currency) ? 2 : formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return formatter.format(amount / 10 ** digits);
}

const paymentDate = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul",
});

export default function BillingCheckout({ returnedSessionId, canceled }: {
    returnedSessionId: string | null;
    canceled: boolean;
}) {
    const attemptId = useRef<string | null>(null);
    const submitting = useRef(false);
    const [billing, setBilling] = useState<BillingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [redirecting, setRedirecting] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [checkoutError, setCheckoutError] = useState("");

    useEffect(() => {
        let current = true;
        const query = returnedSessionId ? `?session_id=${encodeURIComponent(returnedSessionId)}` : "";
        void apiRequest(`/billing${query}`).then(result => {
            if (!current) return;
            setBilling(result.success ? result.data : null);
            setLoadError(result.success ? "" : result.error);
            setLoading(false);
        });
        return () => { current = false; };
    }, [refresh, returnedSessionId]);

    function reload() {
        setLoading(true);
        setLoadError("");
        setRefresh(count => count + 1);
    }

    async function openCheckout() {
        if (submitting.current) return;
        submitting.current = true;
        setRedirecting(true);
        setCheckoutError("");
        attemptId.current ??= crypto.randomUUID();

        const result = await apiRequest("/billing/checkout", {
            method: "POST", body: { attemptId: attemptId.current },
        });
        const url = result.data?.url;
        if (result.success && typeof url === "string" && url.startsWith("https://checkout.stripe.com/")) {
            window.location.assign(url);
            return;
        }

        submitting.current = false;
        setRedirecting(false);
        setCheckoutError(result.error || "Stripe 결제창을 열지 못했습니다. 다시 시도해 주세요.");
    }

    const pending = billing?.returnStatus === "pending";
    const status = billing?.returnStatus === "paid" ? "테스트 결제가 확인되었습니다."
        : pending ? "Stripe 결제를 확인 중입니다."
        : returnedSessionId ? "이 계정에서 해당 결제 내역을 찾을 수 없습니다."
        : canceled ? "테스트 결제를 취소했습니다." : "";

    return (
        <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 text-neutral-900 dark:text-neutral-100 sm:px-6 sm:py-10">
            <div>
                <Link href="/profile" className="inline-flex min-h-11 items-center text-sm font-medium text-brand-ink hover:underline">
                    내 계정
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">테스트 결제</h1>
                <p className="mt-2 break-keep text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                    테스트 카드로 Stripe 결제 흐름을 확인할 수 있습니다. 실제 청구와 알림 발송은 없습니다.
                </p>
            </div>

            {loading && <p role="status" className="text-sm text-neutral-600 dark:text-neutral-300">결제 정보를 불러오는 중입니다.</p>}
            {loadError && (
                <div>
                    <p role="alert" className="text-sm">{loadError}</p>
                    <button type="button" onClick={reload} className="min-h-11 text-sm font-semibold text-brand-ink">다시 불러오기</button>
                </div>
            )}
            {billing && (
                <>
                    {status && (
                        <div className="flex flex-wrap items-center justify-between gap-x-4 text-sm">
                            <p role="status">{status}</p>
                            {pending && <button type="button" onClick={reload} disabled={loading} className="min-h-11 font-semibold text-brand-ink">결제 상태 새로고침</button>}
                        </div>
                    )}
                    <section aria-labelledby="billing-offer" className="rounded-lg border border-neutral-300 bg-white p-4 dark:border-border-subtle-dark dark:bg-surface-dark-card sm:p-5">
                        <h2 id="billing-offer" className="text-lg font-semibold">관심종목 변화 알림 30일 이용권</h2>
                        <p className="mt-2 text-lg font-semibold tabular-nums">{formatAmount(billing.offer)}</p>
                        <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">1회 테스트 결제 · 자동 갱신 없음</p>
                        <button type="button" onClick={openCheckout} disabled={redirecting || pending || loading}
                            className="service-button mt-4 min-h-11 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 dark:text-surface-dark-canvas">
                            {redirecting ? "Stripe 결제창 여는 중" : "Stripe에서 테스트 결제"}
                        </button>
                        {checkoutError && <p role="alert" className="mt-2 text-sm">{checkoutError}</p>}
                    </section>
                    <section aria-labelledby="billing-history">
                        <h2 id="billing-history" className="text-lg font-semibold">최근 테스트 결제</h2>
                        {billing.payments.length ? (
                            <ul className="mt-2 divide-y divide-neutral-300 border-y border-neutral-300 dark:divide-border-subtle-dark dark:border-border-subtle-dark">
                                {billing.payments.map(payment => (
                                    <li key={payment.stripe_session_id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
                                        <time dateTime={payment.paid_at}>{paymentDate.format(new Date(payment.paid_at))}</time>
                                        <span className="font-semibold tabular-nums">{formatAmount(payment)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">확인된 테스트 결제가 없습니다.</p>}
                    </section>
                </>
            )}
        </main>
    );
}
