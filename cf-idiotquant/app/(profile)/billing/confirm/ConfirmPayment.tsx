"use client";

import { useEffect, useState } from "react";
import { newsletterUrl, parseStockKey } from "@/lib/utils/newsletterValuation";
import { apiRequest } from "@/lib/features/apiRequest";

export default function ConfirmPayment({ orderId, paymentKey, amount, newsletterStock }: {
    orderId: string;
    paymentKey: string;
    amount: number;
    newsletterStock?: string;
}) {
    const [retry, setRetry] = useState(0);
    const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);

    useEffect(() => {
        let active = true;
        void apiRequest("/billing/confirm", { method: "POST", body: { orderId, paymentKey, amount } }).then(result => {
            if (!active) return;
            if (result.success) {
                const stock = parseStockKey(newsletterStock);
                window.location.replace(stock ? newsletterUrl("history", stock) : "/billing?session_id=" + encodeURIComponent(orderId));
            } else {
                setError({ message: result.error, retryable: result.status === 0 || result.status >= 500 });
            }
        });
        return () => { active = false; };
    }, [amount, newsletterStock, orderId, paymentKey, retry]);

    if (!error) return <p role="status">토스페이먼츠에서 테스트 결제를 확인하고 있습니다.</p>;
    return (
        <div>
            <p role="alert">{error.message}</p>
            {error.retryable && <button type="button" className="min-h-11 text-sm font-semibold text-brand-ink"
                onClick={() => { setError(null); setRetry(value => value + 1); }}>
                결제 확인 다시 시도
            </button>}
        </div>
    );
}
