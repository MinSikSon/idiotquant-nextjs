import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BillingCheckout from "./BillingCheckout";

export const metadata: Metadata = { title: "이용권 관리" };
export const runtime = "edge";

export default async function BillingPage({ searchParams }: {
    searchParams: Promise<{ session_id?: string | string[]; canceled?: string | string[] }>;
}) {
    if (process.env.NEXT_PUBLIC_STRIPE_TEST_CHECKOUT !== "true") notFound();

    const { session_id: sessionId, canceled } = await searchParams;
    return (
        <BillingCheckout
            returnedSessionId={typeof sessionId === "string" && /^cs_test_[a-zA-Z0-9]{1,180}$/.test(sessionId) ? sessionId : null}
            canceled={canceled === "1"}
        />
    );
}
