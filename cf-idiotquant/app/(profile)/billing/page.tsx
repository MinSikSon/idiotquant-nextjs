import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseStockKey, stockKey } from "@/lib/utils/newsletterValuation";
import BillingCheckout from "./BillingCheckout";

export const metadata: Metadata = { title: "이용권 관리" };
export const runtime = "edge";

export default async function BillingPage({ searchParams }: {
    searchParams: Promise<{ session_id?: string | string[]; canceled?: string | string[]; toss?: string | string[]; code?: string | string[]; newsletter?: string | string[] }>;
}) {
    if (process.env.NEXT_PUBLIC_TOSS_TEST_CHECKOUT !== "true") notFound();

    const { session_id: sessionId, canceled, toss, code, newsletter } = await searchParams;
    const stock = parseStockKey(typeof newsletter === "string" ? newsletter : null);
    return (
        <BillingCheckout
            returnedSessionId={typeof sessionId === "string" && /^(?:cs_test_[a-zA-Z0-9]{1,180}|toss_[a-f0-9]{48})$/.test(sessionId) ? sessionId : null}
            newsletterStock={stock ? stockKey(stock) : undefined}
            canceled={canceled === "1" || (toss === "failed" && code === "PAY_PROCESS_CANCELED")}
            failed={toss === "failed" && code !== "PAY_PROCESS_CANCELED"}
        />
    );
}
