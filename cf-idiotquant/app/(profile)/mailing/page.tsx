import type { Metadata } from "next";
import MemberMailingSettings from "./MemberMailingSettings";

export const metadata: Metadata = { title: "무료 종목 메일" };
export const runtime = "edge";

export default async function MailingPage({ searchParams }: {
    searchParams: Promise<{ confirm?: string | string[] }>;
}) {
    const { confirm } = await searchParams;
    return <MemberMailingSettings confirmToken={typeof confirm === "string" && /^[a-f0-9-]{36}$/.test(confirm) ? confirm : null} />;
}
