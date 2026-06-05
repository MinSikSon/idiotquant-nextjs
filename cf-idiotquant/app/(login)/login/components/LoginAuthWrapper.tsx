"use client";
import { useSearchParams } from "next/navigation";
import AuthButton from "@/components/authButton";

export function LoginAuthWrapper() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") ?? "/screener";
    return <AuthButton callbackUrl={callbackUrl} />;
}
