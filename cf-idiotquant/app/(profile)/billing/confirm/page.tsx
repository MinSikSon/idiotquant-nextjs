import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseStockKey, stockKey } from "@/lib/utils/newsletterValuation";
import ConfirmPayment from "./ConfirmPayment";

export const metadata: Metadata = { title: "테스트 결제 확인", referrer: "no-referrer" };
export const runtime = "edge";

export default async function ConfirmPage({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    if (process.env.NEXT_PUBLIC_TOSS_TEST_CHECKOUT !== "true" && process.env.NEXT_PUBLIC_PADDLE_CHECKOUT !== "true") notFound();

    const { orderId, paymentKey, amount, newsletter } = await searchParams;
    const valid = typeof orderId === "string" && /^toss_[a-f0-9]{48}$/.test(orderId) &&
        typeof paymentKey === "string" && /^[a-zA-Z0-9_.=-]{1,200}$/.test(paymentKey) &&
        typeof amount === "string" && /^\d{1,9}$/.test(amount);

    const stock = parseStockKey(typeof newsletter === "string" ? newsletter : null);
    const newsletterStock = stock ? stockKey(stock) : undefined;
    return (
        <main className="mx-auto w-full max-w-2xl space-y-3 px-4 py-6 sm:px-6">
            <h1 className="text-2xl font-semibold">테스트 결제 확인</h1>
            {valid ? <ConfirmPayment orderId={orderId} paymentKey={paymentKey} amount={Number(amount)} newsletterStock={newsletterStock} /> :
                <p role="alert">결제 주문 정보를 확인할 수 없습니다.</p>}
            <Link href={newsletterStock ? `/billing?newsletter=${encodeURIComponent(newsletterStock)}` : "/billing"} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink">
                이용권 관리로 돌아가기
            </Link>
        </main>
    );
}
