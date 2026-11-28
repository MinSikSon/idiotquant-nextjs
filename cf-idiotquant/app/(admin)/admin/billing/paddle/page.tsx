import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import BillingCheckout from "@/app/(profile)/billing/BillingCheckout";

export const runtime = "edge";
export const metadata: Metadata = { title: "Paddle 구독 테스트 | Admin" };

export default async function AdminPaddlePage({ searchParams }: {
    searchParams: Promise<{ session_id?: string | string[] }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login?callbackUrl=%2Fadmin%2Fbilling%2Fpaddle");
    if ((session.user as { role?: string }).role !== "admin") redirect("/");

    const { session_id: sessionId } = await searchParams;
    return <BillingCheckout
        adminSandbox
        paddleEnabled
        canceled={false}
        failed={false}
        returnedSessionId={typeof sessionId === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(sessionId) ? sessionId : null}
    />;
}
