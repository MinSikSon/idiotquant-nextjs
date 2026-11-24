"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/features/apiRequest";

type Settings = { accountEmail: string | null; recipient: string | null; pendingRecipient: string | null };

export default function MemberMailingSettings({ confirmToken }: { confirmToken: string | null }) {
    const router = useRouter();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        let current = true;
        void apiRequest("/billing/mailing").then(result => {
            if (!current) return;
            if (result.success) {
                setSettings(result.data);
                setEmail(result.data.pendingRecipient ?? result.data.recipient ?? result.data.accountEmail ?? "");
            } else setError(result.error);
            setLoading(false);
        });
        return () => { current = false; };
    }, [refresh]);

    async function update(body: { action: "unsubscribe" | "confirm" | "subscribe"; email?: string; token?: string }) {
        if (busy) return;
        setBusy(true);
        setError("");
        setNotice("");
        const result = await apiRequest("/billing/mailing", { method: "POST", body });
        setBusy(false);
        if (!result.success) {
            setError(result.error);
            return;
        }
        const next: Settings = result.data;
        setSettings(next);
        setEmail(next.pendingRecipient ?? next.recipient ?? next.accountEmail ?? "");
        setNotice(body.action === "unsubscribe" ? "메일 수신을 해제했습니다."
            : next.pendingRecipient ? "인증 메일을 보냈습니다. 메일의 링크를 열어 주소를 확인해 주세요."
                : "무료 종목 메일 수신을 신청했습니다.");
        if (confirmToken) router.replace("/mailing");
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        void update({ action: "subscribe", email: email.trim() });
    }

    return (
        <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6 text-neutral-900 dark:text-neutral-100 sm:px-6">
            <div>
                <Link href="/profile" className="inline-flex min-h-11 items-center text-sm font-medium text-brand-ink hover:underline">내 계정</Link>
                <h1 className="text-2xl font-semibold tracking-tight">무료 종목 메일</h1>
                <p className="mt-2 break-keep text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                    오전 9시(한국 시간)에 관리자가 지정한 한국·미국 종목의 조회 가격과 전략별 목표가 도달 여부를 이메일로 확인할 수 있습니다.
                </p>
            </div>

            {loading && <p role="status" className="text-sm">수신 설정을 불러오는 중입니다.</p>}
            {settings && (
                <section aria-labelledby="mailing-settings" className="space-y-4 rounded-lg border border-neutral-300 bg-white p-4 dark:border-border-subtle-dark dark:bg-surface-dark-card">
                    <h2 id="mailing-settings" className="text-lg font-semibold">수신 설정</h2>
                    {settings.recipient && <p className="break-all text-sm">수신 중 <strong>{settings.recipient}</strong></p>}
                    {settings.pendingRecipient && <p className="break-all text-sm">인증 대기 <strong>{settings.pendingRecipient}</strong></p>}
                    {confirmToken && (
                        <button type="button" onClick={() => void update({ action: "confirm", token: confirmToken })} disabled={busy}
                            className="service-button min-h-11 bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50 dark:text-surface-dark-canvas">
                            수신 주소 인증하기
                        </button>
                    )}
                    <form onSubmit={submit} className="space-y-3">
                        <label className="block text-sm font-semibold">
                            수신 이메일
                            <input name="email" type="email" required maxLength={254} value={email} autoComplete="email" disabled={busy}
                                onChange={event => setEmail(event.target.value)}
                                className="mt-1 block min-h-11 w-full rounded-md border border-neutral-400 bg-transparent px-3 text-base font-normal dark:border-border-subtle-dark" />
                        </label>
                        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">가입 이메일을 사용하거나 다른 주소를 입력해 인증할 수 있습니다.</p>
                        <div className="flex flex-wrap gap-2">
                            <button type="submit" disabled={busy}
                                className="service-button min-h-11 bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50 dark:text-surface-dark-canvas">
                                {settings.recipient ? "수신 주소 저장" : "무료 수신 신청"}
                            </button>
                            {settings.accountEmail && email !== settings.accountEmail && (
                                <button type="button" onClick={() => setEmail(settings.accountEmail ?? "")} disabled={busy}
                                    className="service-button min-h-11 px-4 text-sm font-semibold disabled:opacity-50">가입 이메일 사용</button>
                            )}
                            {(settings.recipient || settings.pendingRecipient) && (
                                <button type="button" onClick={() => void update({ action: "unsubscribe" })} disabled={busy}
                                    className="min-h-11 px-3 text-sm font-semibold text-brand-ink disabled:opacity-50">수신 해제</button>
                            )}
                        </div>
                    </form>
                </section>
            )}
            {notice && <p role="status" className="text-sm">{notice}</p>}
            {error && (
                <div>
                    <p role="alert" className="text-sm">{error}</p>
                    {!settings && <button type="button" className="min-h-11 text-sm font-semibold text-brand-ink"
                        onClick={() => { setError(""); setLoading(true); setRefresh(count => count + 1); }}>다시 불러오기</button>}
                </div>
            )}
        </main>
    );
}
