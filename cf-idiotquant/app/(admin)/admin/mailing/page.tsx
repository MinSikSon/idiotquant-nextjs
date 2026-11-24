import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import MailingStocks from "./MailingStocks";

export const runtime = "edge";
export const metadata: Metadata = { title: "발송 종목 관리 | Admin" };

export default async function AdminMailingPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    if ((session.user as { role?: string }).role !== "admin") redirect("/");
    return <MailingStocks />;
}
