import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { parseStockKey, stockKey } from "@/lib/utils/newsletterValuation";
import { auth } from "@/auth";
import BillingCheckout from "./BillingCheckout";

export const metadata: Metadata = { title: "이용권 관리" };
export const runtime = "edge";

export default async function BillingPage({ searchParams }: {
    searchParams: Promise<{ session_id?: string | string[]; canceled?: string | string[]; toss?: string | string[]; code?: string | string[]; newsletter?: string | string[] }>;
}) {
    const paddleEnabled = process.env.NEXT_PUBLIC_PADDLE_CHECKOUT === "true";
    const memberSandbox = !paddleEnabled && process.env.NEXT_PUBLIC_PADDLE_SANDBOX_CHECKOUT === "true";
    if (!paddleEnabled && !memberSandbox && process.env.NEXT_PUBLIC_TOSS_TEST_CHECKOUT !== "true") notFound();

    if (memberSandbox && !(await auth())?.user?.id) redirect("/login?callbackUrl=%2Fbilling");

    const { session_id: sessionId, canceled, toss, code, newsletter } = await searchParams;
    const stock = parseStockKey(typeof newsletter === "string" ? newsletter : null);
    return (
        <BillingCheckout
            memberSandbox={memberSandbox}
            paddleEnabled={paddleEnabled || memberSandbox}
            returnedSessionId={typeof sessionId === "string" && /^(?:cs_test_[a-zA-Z0-9]{1,180}|toss_[a-f0-9]{48}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.test(sessionId) ? sessionId : null}
            newsletterStock={stock ? stockKey(stock) : undefined}
            canceled={canceled === "1" || (toss === "failed" && code === "PAY_PROCESS_CANCELED")}
            failed={toss === "failed" && code !== "PAY_PROCESS_CANCELED"}
        />
    );
}
