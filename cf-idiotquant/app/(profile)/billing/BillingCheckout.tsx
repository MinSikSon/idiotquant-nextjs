"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/features/apiRequest";
import { billingDate, formatBillingAmount } from "@/lib/utils/billingFormat";

type Money = { amount: number; currency: string };
type Payment = Money & { stripe_session_id: string; paid_at: string };
type BillingData = {
    offer: Money;
    payments: Payment[];
    returnStatus: "paid" | "pending" | null;
    alerts?: { status: "active" | "expired"; expiresAt: string; deliveryEnabled: boolean; recipients?: string[] } | null;
};

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
    const [recipient, setRecipient] = useState("");

    useEffect(() => {
        let current = true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const query = returnedSessionId ? `?session_id=${encodeURIComponent(returnedSessionId)}` : "";
        async function load(remaining: number) {
            const result = await apiRequest(`/billing${query}`);
            if (!current) return;
            if (result.success) {
                setBilling(result.data);
                if (result.data.returnStatus === "pending" && remaining > 0) {
                    timer = setTimeout(() => void load(remaining - 1), 3000);
                }
            } else {
                setLoadError(result.error);
            }
            setLoading(false);
        }
        void load(10);
        return () => { current = false; clearTimeout(timer); };
    }, [refresh, returnedSessionId]);

    function reload() {
        setLoading(true);
        setLoadError("");
        setRefresh(count => count + 1);
    }

    async function openCheckout(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitting.current) return;
        submitting.current = true;
        setRedirecting(true);
        setCheckoutError("");
        attemptId.current ??= crypto.randomUUID();

        const result = await apiRequest("/billing/checkout", {
            method: "POST", body: { attemptId: attemptId.current, recipients: [recipient.trim()] },
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
        : pending ? "Stripe 결제를 확인 중입니다. 확인되면 이용권이 자동으로 활성화됩니다."
        : returnedSessionId ? "이 계정에서 해당 결제 내역을 찾을 수 없습니다."
        : canceled ? "테스트 결제를 취소했습니다." : "";

    return (
        <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 text-neutral-900 dark:text-neutral-100 sm:px-6 sm:py-10">
            <div>
                <Link href="/profile" className="inline-flex min-h-11 items-center text-sm font-medium text-brand-ink hover:underline">
                    내 계정
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">이용권 관리</h1>
                <p className="mt-2 break-keep text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                    테스트 결제 · 실제 청구 없음 · 이메일은 지정된 테스트 계정에만 발송
                </p>
            </div>

            <section id="alert-benefits" aria-labelledby="alert-benefits-title" className="scroll-mt-16 rounded-lg border border-neutral-300 bg-white p-4 dark:border-border-subtle-dark dark:bg-surface-dark-card sm:p-5">
                <h2 id="alert-benefits-title" className="text-lg font-semibold">관심종목 목표가 알림 · 30일 이용권</h2>
                <dl className="mt-3 grid gap-3 break-keep text-sm leading-relaxed sm:grid-cols-[auto_1fr] sm:gap-x-5">
                    <dt className="font-semibold">받는 내용</dt>
                    <dd className="text-neutral-600 dark:text-neutral-300">좋아요한 종목의 조회 가격과 분석 페이지의 전략별 목표가를 비교해 도달 여부를 알려드립니다. 이메일에서 종목 분석을 열 수 있습니다.</dd>
                    <dt className="font-semibold">받는 조건</dt>
                    <dd className="text-neutral-600 dark:text-neutral-300">지정된 테스트 계정은 오전 9시(한국 시간) 발송 작업에서 새 목표가 현황을 받습니다. 등록한 주소로 하루 최대 한 통을 보냅니다.</dd>
                    <dt className="font-semibold">이용 기간</dt>
                    <dd className="text-neutral-600 dark:text-neutral-300">결제 확인 시점부터 30일입니다. 만료되면 발송이 중단되며 자동 갱신은 없습니다.</dd>
                </dl>
                <Link href="/" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink hover:underline">오늘에서 관심종목 확인</Link>
            </section>

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
                        <h2 id="billing-offer" className="text-lg font-semibold">내 테스트 이용권</h2>
                        <p className="mt-2 text-sm font-semibold" role="status">
                            {billing.alerts?.status === "active" ? "이용권 활성" : billing.alerts?.status === "expired" ? "이용권 만료" : "활성 이용권 없음"}
                        </p>
                        {billing.alerts && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                            만료 시각 <time dateTime={billing.alerts.expiresAt}>{billingDate.format(new Date(billing.alerts.expiresAt))} (KST)</time>
                            {billing.alerts.status === "active" && (billing.alerts.deliveryEnabled ? " · 테스트 이메일 대상" : " · 이 계정에는 테스트 이메일이 발송되지 않습니다.")}
                        </p>}
                        <p className="mt-2 text-lg font-semibold tabular-nums">{formatBillingAmount(billing.offer)}</p>
                        <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">1회 테스트 결제 · 자동 갱신 없음</p>
                        {billing.alerts?.status === "active" ? (
                            billing.alerts.recipients?.[0] && (
                                <div className="mt-4 text-sm">
                                    <p className="font-semibold">알림 수신 이메일</p>
                                    <p className="mt-1 break-all text-neutral-600 dark:text-neutral-300">{billing.alerts.recipients[0]}</p>
                                </div>
                            )
                        ) : (
                            <form onSubmit={openCheckout} className="mt-4">
                                <fieldset disabled={redirecting || pending || loading} className="space-y-2">
                                    <label className="block text-sm font-semibold">
                                        알림 수신 이메일
                                        <input type="email" name="recipient" value={recipient} required maxLength={254} autoComplete="email"
                                            onChange={event => {
                                                attemptId.current = null;
                                                setCheckoutError("");
                                                setRecipient(event.target.value);
                                            }}
                                            className="mt-1 block min-h-11 w-full rounded-md border border-neutral-400 bg-transparent px-3 text-base font-normal dark:border-border-subtle-dark" />
                                    </label>
                                    <button type="submit" className="service-button mt-2 min-h-11 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 dark:text-surface-dark-canvas">
                                        {redirecting ? "Stripe 결제창 여는 중" : "30일 이용권 테스트 구매"}
                                    </button>
                                </fieldset>
                                {checkoutError && <p role="alert" className="mt-2 text-sm">{checkoutError}</p>}
                            </form>
                        )}
                    </section>
                    <section aria-labelledby="billing-history">
                        <h2 id="billing-history" className="text-lg font-semibold">최근 테스트 결제</h2>
                        {billing.payments.length ? (
                            <ul className="mt-2 divide-y divide-neutral-300 border-y border-neutral-300 dark:divide-border-subtle-dark dark:border-border-subtle-dark">
                                {billing.payments.map(payment => (
                                    <li key={payment.stripe_session_id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
                                        <time dateTime={payment.paid_at}>{billingDate.format(new Date(payment.paid_at))}</time>
                                        <span className="font-semibold tabular-nums">{formatBillingAmount(payment)}</span>
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
