"use client";

import { useEffect, useState } from "react";
import { PAGE_ACTION_CLS, PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { apiRequest } from "@/lib/features/apiRequest";

export const billingStatusLabels = { none: "미구매", pending: "결제 대기", active: "활성", expired: "만료", canceled: "취소" };
type Status = keyof typeof billingStatusLabels;
const providerLabels: Record<string, string> = { kakao: "카카오", google: "구글" };

export type BillingMember = {
    id: string;
    name: string | null;
    email: string | null;
    providers: string[];
    status: Status;
    expiresAt: string | null;
    recipient: string | null;
    mailingRecipient: string | null;
    deliveryEnabled: boolean;
};

type MemberPage = { members: BillingMember[]; nextAfter: string | null };

export const billingPanel = "rounded-[var(--radius-panel)] border border-neutral-200 bg-white dark:border-border-subtle-dark dark:bg-surface-dark-card";
const input = "min-h-11 rounded-[var(--radius-control)] border border-neutral-400 bg-transparent px-3 text-base focus-visible:outline-2 focus-visible:outline-brand-ink dark:border-border-subtle-dark dark:bg-surface-dark-card";

export function MemberProviders({ providers }: { providers: string[] }) {
    return (
        <span className="flex flex-wrap gap-1.5">
            {providers.length ? providers.map(provider => (
                <span key={provider} className="rounded border border-neutral-200 px-1.5 py-0.5 text-xs dark:border-border-subtle-dark">
                    {providerLabels[provider] ?? provider}
                </span>
            )) : <span className="text-sm">로그인 수단 정보 없음</span>}
        </span>
    );
}

export default function BillingMembers({ onSelect, revision }: {
    onSelect: (id: string, member?: BillingMember) => void;
    revision: number;
}) {
    const [inputQuery, setInputQuery] = useState("");
    const [query, setQuery] = useState("");
    const [provider, setProvider] = useState("");
    const [status, setStatus] = useState("");
    const [cursors, setCursors] = useState([""]);
    const [refresh, setRefresh] = useState(0);
    const [response, setResponse] = useState<{ key: string; page: MemberPage | null; error: string }>();
    const after = cursors[cursors.length - 1];

    const requestKey = JSON.stringify([query, provider, status, after, refresh, revision]);
    const loading = response?.key !== requestKey;
    const page = loading ? null : response.page;
    const error = loading ? "" : response.error;

    useEffect(() => {
        let current = true;
        void apiRequest("/billing/admin/members", {
            method: "POST", body: { query, provider: provider || null, status: status || null, after },
        }).then(result => {
            if (!current) return;
            setResponse({ key: requestKey, page: result.success ? result.data : null, error: result.success ? "" : result.error });
        });
        return () => { current = false; };
    }, [query, provider, status, after, requestKey]);

    const orphanLookup = !after && !provider && !status && /^[a-zA-Z0-9_-]{1,100}$/.test(query);
    const nextAfter = page?.nextAfter;
    return (
        <section aria-labelledby="billing-members" className={billingPanel}>
            <form className="space-y-3 p-4" onSubmit={event => {
                event.preventDefault();
                setCursors([""]);
                setQuery(inputQuery.trim());
                setRefresh(value => value + 1);
            }}>
                <h2 id="billing-members" className="sr-only">회원별 구독</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                        <label htmlFor="billing-account" className="mb-1 block text-sm">로그인 이메일 또는 계정 ID</label>
                        <div className="flex gap-2">
                            <input id="billing-account" type="search" autoComplete="off" maxLength={254}
                                className={`${input} min-w-0 flex-1`} value={inputQuery} onChange={event => {
                                    setInputQuery(event.target.value);
                                    if (!event.target.value) {
                                        setCursors([""]);
                                        setQuery("");
                                    }
                                }} />
                            <button type="submit" className={PAGE_PRIMARY_ACTION_CLS}>검색</button>
                        </div>
                    </div>
                    <label className="block min-w-0 text-sm">
                        <span className="mb-1 block">로그인 수단</span>
                        <select className={`${input} w-full`} value={provider} onChange={event => {
                            setCursors([""]);
                            setProvider(event.target.value);
                        }}>
                            <option value="">전체</option>
                            <option value="kakao">카카오</option>
                            <option value="google">구글</option>
                        </select>
                    </label>
                    <label className="block min-w-0 text-sm">
                        <span className="mb-1 block">이용권 상태</span>
                        <select className={`${input} w-full`} value={status} onChange={event => {
                            setCursors([""]);
                            setStatus(event.target.value);
                        }}>
                            <option value="">전체</option>
                            {Object.entries(billingStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>
                </div>
            </form>
            {loading ? <p role="status" className="px-4 pb-4 text-sm">회원과 이용권을 조회하는 중입니다.</p> : error ? (
                <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
                    <p role="alert" className="text-sm">회원 또는 이용권을 조회하지 못했습니다. {error}</p>
                    <button type="button" className={PAGE_ACTION_CLS} onClick={() => setRefresh(value => value + 1)}>다시 불러오기</button>
                </div>
            ) : page?.members.length ? (
                <ul className="divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-border-subtle-dark dark:border-border-subtle-dark">
                    {page.members.map(member => (
                        <li key={member.id} className="grid items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                            <div className="min-w-0 space-y-1 [overflow-wrap:anywhere]">
                                <p className="font-semibold">{member.name || member.email || "이름·로그인 이메일 없음"}</p>
                                {member.name && member.email && <p className="text-sm">{member.email}</p>}
                                <p className="text-sm text-neutral-700 dark:text-neutral-300">계정 ID {member.id}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:items-start sm:flex-col">
                                <MemberProviders providers={member.providers} />
                                <span className="font-medium">이용권 {billingStatusLabels[member.status]}</span>
                            </div>
                            <button type="button" className={`${PAGE_ACTION_CLS} justify-self-start`}
                                aria-label={`${member.name || member.email || member.id} 결제·발송 이력 보기`}
                                onClick={() => onSelect(member.id, member)}>이력 보기</button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="space-y-2 px-4 pb-4 text-sm">
                    <p role="status">{nextAfter ? "이 구간에 조건과 일치하는 회원이 없습니다." : "조건과 일치하는 회원이 없습니다."}</p>
                    {orphanLookup && <button type="button" className={PAGE_ACTION_CLS} onClick={() => onSelect(query)}>이 ID의 이전 결제·발송 이력 조회</button>}
                </div>
            )}
            {!loading && !error && (cursors.length > 1 || nextAfter) && (
                <div className="flex flex-wrap gap-2 px-4 pb-4 pt-3">
                    <button type="button" className={PAGE_ACTION_CLS} disabled={cursors.length === 1}
                        onClick={() => setCursors(values => values.slice(0, -1))}>이전 회원</button>
                    <button type="button" className={PAGE_ACTION_CLS} disabled={!nextAfter}
                        onClick={() => nextAfter && setCursors(values => [...values, nextAfter])}>다음 회원</button>
                </div>
            )}
        </section>
    );
}
