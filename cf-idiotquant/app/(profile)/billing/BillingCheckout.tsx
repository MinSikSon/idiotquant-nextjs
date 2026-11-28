"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/features/apiRequest";
import { newsletterUrl, parseStockKey } from "@/lib/utils/newsletterValuation";
import { billingDate, formatBillingAmount } from "@/lib/utils/billingFormat";

import { cancellationLabel, type Cancellation } from "@/lib/utils/billingCancellation";

type Money = { amount: number; currency: string };
type PaddleSdk = {
    Initialized: boolean;
    Environment: { set(environment: "sandbox"): void };
    Initialize(options: {
        token: string;
        checkout: { settings: { displayMode: "overlay"; locale: "ko"; showAddDiscounts: false } };
        eventCallback(event: { name: string }): void;
    }): void;
    Checkout: {
        open(options: {
            transactionId: string;
            settings: { successUrl: string };
        }): void;
    };
};

const paddleSdk = () => (window as Window & { Paddle?: PaddleSdk }).Paddle;

type Payment = Money & { stripe_session_id: string; paid_at: string };
type BillingData = {
    offer: Money;
    payments: Payment[];
    returnStatus: "paid" | "pending" | "canceled" | null;
    paddle?: {
        clientToken: string;
        sandbox: boolean;
        subscriptionStatus: "active" | "trialing" | "past_due" | "paused" | null;
        pendingRecipient: string | null;
    };
    alerts?: {
        sessionId: string;
        status: "active" | "expired" | "canceled";
        expiresAt: string;
        provider?: "paddle";
        scheduledAction?: "cancel" | "pause" | null;
        scheduledEndAt?: string | null;
        deliveryEnabled?: boolean;
        recipients?: string[];
        cancellation: Cancellation | null;
    } | null;
};

export default function BillingCheckout({ adminSandbox = false, paddleEnabled, returnedSessionId, canceled, failed, newsletterStock }: {
    adminSandbox?: boolean;
    paddleEnabled: boolean;
    returnedSessionId: string | null;
    canceled: boolean;
    failed: boolean;
    newsletterStock?: string;
}) {
    const billingEndpoint = adminSandbox ? "/billing/sandbox" : "/billing";
    const submitting = useRef(false);
    const [billing, setBilling] = useState<BillingData | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [redirecting, setRedirecting] = useState(false);
    const [openingPortal, setOpeningPortal] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [checkoutError, setCheckoutError] = useState("");
    const [recipient, setRecipient] = useState("");
    const [requestingCancellation, setRequestingCancellation] = useState(false);
    const [cancellationError, setCancellationError] = useState("");
    const [reason, setReason] = useState("");

    useEffect(() => {
        let current = true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const stock = parseStockKey(newsletterStock);
        const query = returnedSessionId ? `?session_id=${encodeURIComponent(returnedSessionId)}` : "";
        async function load(remaining: number) {
            const result = await apiRequest(`${billingEndpoint}${query}`);
            if (!current) return;
            if (result.success) {
                if (adminSandbox && result.data.paddle?.sandbox !== true) {
                    setLoadError("Paddle Sandbox 설정을 확인해 주세요.");
                    setLoading(false);
                    return;
                }
                if (stock && result.data.alerts?.status === "active") {
                    window.location.replace(newsletterUrl("history", stock));
                    return;
                }
                setLoadError("");
                setBilling(result.data);
                if (result.data.returnStatus === "pending" && remaining > 0) {
                    timer = setTimeout(() => void load(remaining - 1), 3000);
                }
            } else {
                setLoadError(result.error);
                if (returnedSessionId && remaining > 0) timer = setTimeout(() => void load(remaining - 1), 3000);
            }
            setLoading(false);
        }
        void load(10);
        return () => { current = false; clearTimeout(timer); };
    }, [adminSandbox, billingEndpoint, newsletterStock, refresh, returnedSessionId]);

    const token = billing?.paddle?.clientToken;
    const sandbox = billing?.paddle?.sandbox;

    useEffect(() => {
        if (!sdkReady || !token) return;
        const sdk = paddleSdk();
        if (sdk && !sdk.Initialized) {
            if (sandbox) sdk.Environment.set("sandbox");
            sdk.Initialize({
                token,
                checkout: { settings: { displayMode: "overlay", locale: "ko", showAddDiscounts: false } },
                eventCallback: event => window.dispatchEvent(new CustomEvent("paddle-checkout", { detail: event.name })),
            });
        }
    }, [sdkReady, token, sandbox]);

    useEffect(() => {
        function handlePaddleEvent(event: Event) {
            const name = (event as CustomEvent<string>).detail;
            if (name !== "checkout.closed" && name !== "checkout.error") return;
            submitting.current = false;
            setRedirecting(false);
            if (name === "checkout.error") setCheckoutError("Paddle 결제창을 열지 못했습니다. 다시 시도해 주세요.");
        }
        window.addEventListener("paddle-checkout", handlePaddleEvent);
        return () => window.removeEventListener("paddle-checkout", handlePaddleEvent);
    }, []);

    function reload() {
        setLoading(true);
        setLoadError("");
        setRefresh(count => count + 1);
    }

    async function openCheckout(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const sdk = paddleSdk();
        if (submitting.current || !sdk?.Initialized) return;
        submitting.current = true;
        setRedirecting(true);
        setCheckoutError("");

        const result = await apiRequest(`${billingEndpoint}/checkout`, {
            method: "POST",
            body: { provider: "paddle", recipients: [billing?.paddle?.pendingRecipient ?? recipient.trim()] },
        });
        const checkout = result.data;
        if (result.success && typeof checkout?.checkoutId === "string") {
            const success = new URL(adminSandbox ? "/admin/billing/paddle" : "/billing", window.location.origin);
            success.searchParams.set("session_id", checkout.checkoutId);
            if (newsletterStock) success.searchParams.set("newsletter", newsletterStock);
            if (checkout.pending) {
                window.location.assign(success.href);
                return;
            }
            if (typeof checkout.transactionId === "string" && /^txn_[a-z0-9]{26}$/.test(checkout.transactionId)) {
                try {
                    sdk.Checkout.open({
                        transactionId: checkout.transactionId,
                        settings: { successUrl: success.href },
                    });
                    reload();
                    return;
                } catch {
                    setCheckoutError("Paddle 결제창을 열지 못했습니다. 다시 시도해 주세요.");
                }
            }
        }
        setCheckoutError(current => current || result.error || "결제를 시작하지 못했습니다. 다시 시도해 주세요.");
        if (result.status === 409) reload();
        submitting.current = false;
        setRedirecting(false);
    }

    async function openPortal() {
        setOpeningPortal(true);
        setCheckoutError("");
        const result = await apiRequest(`${billingEndpoint}/portal`, { method: "POST", body: {} });
        if (result.success && typeof result.data?.url === "string") {
            window.location.assign(result.data.url);
        } else {
            setCheckoutError(result.error || "Paddle 구독 관리 페이지를 열지 못했습니다.");
            setOpeningPortal(false);
        }
    }

    async function submitCancellation(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const sessionId = billing?.alerts?.sessionId;
        if (!sessionId || requestingCancellation) return;
        setRequestingCancellation(true);
        setCancellationError("");
        const result = await apiRequest("/billing/cancellation", {
            method: "POST", body: { sessionId, reason },
        });
        if (result.success) {
            setReason("");
            setBilling(current => current && current.alerts?.sessionId === sessionId ? {
                ...current,
                alerts: {
                    ...current.alerts,
                    status: result.data.status === "approved" ? "canceled" : current.alerts.status,
                    cancellation: result.data,
                },
            } : current);
        } else {
            setCancellationError(result.error);
        }
        setRequestingCancellation(false);
    }

    const newsletter = parseStockKey(newsletterStock);
    const pending = billing?.returnStatus === "pending";
    const subscriptionStatus = billing?.paddle?.subscriptionStatus;
    const scheduledEndAt = billing?.alerts?.scheduledEndAt;
    const status = billing?.returnStatus === "paid" ? "결제가 확인되었습니다."
        : pending ? "결제를 확인 중입니다. 확인되면 이용권이 자동으로 활성화됩니다."
        : billing?.returnStatus === "canceled" ? "결제가 취소되었습니다."
        : returnedSessionId ? "이 계정에서 해당 결제 내역을 찾을 수 없습니다."
        : canceled ? "테스트 결제를 취소했습니다."
        : failed ? "결제 인증에 실패했습니다. 다시 시도해 주세요." : "";

    return (
        <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 text-neutral-900 dark:text-neutral-100 sm:px-6 sm:py-10">
            {paddleEnabled && <Script
                src="https://cdn.paddle.com/paddle/v2/paddle.js"
                onReady={() => setSdkReady(true)}
                onError={() => setCheckoutError("Paddle을 불러오지 못했습니다. 페이지를 새로고침해 주세요.")}
            />}
            <div>
                <Link href={adminSandbox ? "/admin/billing" : "/profile"} className="inline-flex min-h-11 items-center text-sm font-medium text-brand-ink hover:underline">
                    {adminSandbox ? "구독관리" : "내 계정"}
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{adminSandbox ? "Paddle 구독 테스트" : newsletter ? "과거 적정가 이용권" : "이용권 관리"}</h1>
                {(adminSandbox || sandbox) && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Paddle 테스트 결제 · 실제 청구 없음</p>}
            </div>

            {!adminSandbox && <section id="alert-benefits" aria-labelledby="alert-benefits-title" className="scroll-mt-16 rounded-lg border border-neutral-300 bg-white p-4 dark:border-border-subtle-dark dark:bg-surface-dark-card sm:p-5">
                <h2 id="alert-benefits-title" className="text-lg font-semibold">과거 적정가 월 구독</h2>
                <dl className="mt-3 grid gap-3 break-keep text-sm leading-relaxed sm:grid-cols-[auto_1fr] sm:gap-x-5">
                    <dt className="font-semibold">받는 내용</dt>
                    <dd className="text-neutral-600 dark:text-neutral-300">종목의 과거 주가와 전략별 적정가를 비교할 수 있습니다.</dd>
                    <dt className="font-semibold">관심종목 메일</dt>
                    <dd className="text-neutral-600 dark:text-neutral-300">지정된 테스트 계정은 오전 9시(한국 시간) 발송 작업에서 관심종목 분석을 받습니다. 등록한 주소로 하루 최대 한 통을 보냅니다.</dd>
                    <dt className="font-semibold">이용 기간</dt>
                    <dd className="text-neutral-600 dark:text-neutral-300">구독은 매월 자동 갱신됩니다. Paddle에서 해지하면 현재 결제 기간이 끝날 때까지 이용할 수 있습니다.</dd>
                </dl>
                <Link href="/" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink hover:underline">오늘에서 관심종목 확인</Link>
            </section>}

            {loading && <p role="status" className="text-sm text-neutral-600 dark:text-neutral-300">결제 정보를 불러오는 중입니다.</p>}
            {loadError && (
                <div>
                    <p role="alert" className="text-sm">{loadError}</p>
                    <button type="button" onClick={reload} className="min-h-11 text-sm font-semibold text-brand-ink">다시 불러오기</button>
                </div>
            )}
            {billing && (
                <>
                    {newsletter && !pending && !redirecting && <Link
                        href={newsletterUrl("result", newsletter)}
                        className="service-button inline-flex min-h-11 items-center px-3 font-semibold">
                        현재 적정가로 돌아가기
                    </Link>}
                    {status && (
                        <div className="flex flex-wrap items-center justify-between gap-x-4 text-sm">
                            <p role="status">{status}</p>
                            {pending && <button type="button" onClick={reload} disabled={loading} className="min-h-11 font-semibold text-brand-ink">결제 상태 새로고침</button>}
                        </div>
                    )}
                    <section aria-labelledby="billing-offer" className="rounded-lg border border-neutral-300 bg-white p-4 dark:border-border-subtle-dark dark:bg-surface-dark-card sm:p-5">
                        <h2 id="billing-offer" className="text-lg font-semibold">내 이용권</h2>
                        <p className="mt-2 text-sm font-semibold" role="status">
                            {subscriptionStatus === "past_due" ? "갱신 결제 확인 필요" : subscriptionStatus === "paused" ? "구독 일시 중지" : billing.alerts?.status === "active" ? "이용권 활성" : billing.alerts?.status === "expired" ? "이용권 만료" : billing.alerts?.status === "canceled" ? "이용권 취소" : "활성 이용권 없음"}
                        </p>
                        {billing.alerts && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                            {billing.alerts.status === "canceled" ? "기존 만료 시각" : billing.alerts.provider === "paddle" && billing.alerts.status === "active" && !scheduledEndAt ? "현재 결제 기간 종료" : "만료 시각"} <time dateTime={billing.alerts.expiresAt}>{billingDate.format(new Date(billing.alerts.expiresAt))} (KST)</time>
                            {billing.alerts.status === "active" && (billing.alerts.deliveryEnabled ? " · 테스트 이메일 대상" : " · 이 계정에는 테스트 이메일이 발송되지 않습니다.")}
                        </p>}
                        {scheduledEndAt && billing.alerts?.status === "active" && <p className="mt-1 text-sm">
                            {billing.alerts.scheduledAction === "cancel" ? "해지 예약됨" : "일시 중지 예약됨"}
                        </p>}
                        {paddleEnabled && billing.paddle && !subscriptionStatus && billing.alerts?.status !== "active" && <p className="mt-2 text-lg font-semibold tabular-nums">
                            {formatBillingAmount(billing.offer)} <span className="text-sm font-normal">/ 월</span>
                        </p>}
                        {billing.alerts?.status === "active" || subscriptionStatus ? (
                            billing.alerts?.recipients?.[0] && (
                                <div className="mt-4 text-sm">
                                    <p className="font-semibold">알림 수신 이메일</p>
                                    <p className="mt-1 break-all text-neutral-600 dark:text-neutral-300">{billing.alerts.recipients[0]}</p>
                                </div>
                            )
                        ) : paddleEnabled && billing.paddle ? (
                            <form onSubmit={openCheckout} className="mt-4">
                                <fieldset disabled={redirecting || pending || loading} className="space-y-2">
                                    <label className="block text-sm font-semibold">
                                        알림 수신 이메일
                                        <input type="email" name="recipient" value={billing.paddle.pendingRecipient ?? recipient} required maxLength={254} autoComplete="email"
                                            readOnly={Boolean(billing.paddle.pendingRecipient)}
                                            onChange={event => {
                                                setCheckoutError("");
                                                setRecipient(event.target.value);
                                            }}
                                            className="mt-1 block min-h-11 w-full rounded-md border border-neutral-400 bg-transparent px-3 text-base font-normal dark:border-border-subtle-dark" />
                                    </label>
                                    <button type="submit" disabled={!sdkReady} className="service-button mt-2 min-h-11 bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 dark:text-surface-dark-canvas">
                                        {redirecting ? "Paddle 결제창 여는 중" : billing.paddle.pendingRecipient ? "진행 중인 결제 열기" : "월 구독 시작하기"}
                                    </button>
                                </fieldset>
                            </form>
                        ) : <p className="mt-2 text-sm">현재 새 구독을 받지 않고 있습니다.</p>}
                        {subscriptionStatus && <button type="button" onClick={openPortal} disabled={openingPortal}
                            className="service-button mt-3 min-h-11 px-4 text-sm font-semibold disabled:opacity-60">
                            {openingPortal ? "Paddle 여는 중" : "Paddle에서 결제수단·해지 관리"}
                        </button>}
                        {checkoutError && <p role="alert" className="mt-2 text-sm">{checkoutError}</p>}
                        {billing.alerts?.cancellation ? (
                            <p role="status" className="mt-4 text-sm">
                                취소 요청 {cancellationLabel[billing.alerts.cancellation.status]} · 접수{" "}
                                <time dateTime={billing.alerts.cancellation.requestedAt}>{billingDate.format(new Date(billing.alerts.cancellation.requestedAt))} (KST)</time>
                            </p>
                        ) : !adminSandbox && billing.alerts?.status === "active" && billing.alerts.provider !== "paddle" && (
                            <details className="mt-3 border-t border-neutral-200 dark:border-border-subtle-dark">
                                <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">이용권 취소 요청</summary>
                                <form onSubmit={submitCancellation} className="space-y-2">
                                    <p className="text-sm">관리자가 승인하면 이용권과 알림 발송이 종료됩니다.</p>
                                    <label className="block text-sm font-semibold">
                                        요청 사유 (선택)
                                        <textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={500} rows={3}
                                            className="mt-1 block w-full rounded-md border border-neutral-400 bg-transparent p-2 text-base font-normal dark:border-border-subtle-dark" />
                                    </label>
                                    <button type="submit" disabled={requestingCancellation || loading} className="min-h-11 rounded-md border border-neutral-400 px-3 text-sm font-semibold hover:border-brand disabled:opacity-60 dark:border-border-subtle-dark">
                                        {requestingCancellation ? "접수 중" : "취소 요청 접수"}
                                    </button>
                                    {cancellationError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{cancellationError}</p>}
                                </form>
                            </details>
                        )}
                    </section>
                    <section aria-labelledby="billing-history">
                        <h2 id="billing-history" className="text-lg font-semibold">최근 결제</h2>
                        {billing.payments.length ? (
                            <ul className="mt-2 divide-y divide-neutral-300 border-y border-neutral-300 dark:divide-border-subtle-dark dark:border-border-subtle-dark">
                                {billing.payments.map(payment => (
                                    <li key={payment.stripe_session_id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
                                        <time dateTime={payment.paid_at}>{billingDate.format(new Date(payment.paid_at))}</time>
                                        <span className="font-semibold tabular-nums">{formatBillingAmount(payment)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">확인된 결제가 없습니다.</p>}
                    </section>
                </>
            )}
        </main>
    );
}
