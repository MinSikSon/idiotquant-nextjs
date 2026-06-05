"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { LogOut, Eye, DollarSign, ChevronRight, User } from "lucide-react";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const isMasterUser = session?.user?.name === process.env.NEXT_PUBLIC_MASTER;

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-[#d97757] animate-spin" />
            </div>
        );
    }

    if (!session) return null;

    const initial = session.user?.name?.[0]?.toUpperCase() ?? "U";

    return (
        <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] px-4 py-8 md:py-12">
            <div className="mx-auto max-w-sm space-y-4">

                {/* Header */}
                <h1 className="text-lg font-black text-neutral-900 dark:text-neutral-50 px-1">
                    내 계정
                </h1>

                {/* Profile card */}
                <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200/70 dark:border-[#35332e] shadow-sm overflow-hidden">
                    <div className="flex items-center gap-4 px-5 py-5">
                        <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-[#4a4641] flex items-center justify-center text-neutral-700 dark:text-neutral-200 text-base font-black shrink-0">
                            {initial}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50 truncate">
                                {session.user?.name}
                            </p>
                            {session.user?.email && (
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                                    {session.user.email}
                                </p>
                            )}
                            {isMasterUser && (
                                <span className="inline-block mt-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#fde8de] dark:bg-[#3d1f10]/50 text-[#d97757] dark:text-[#d97757] uppercase tracking-tight">
                                    Admin
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Admin: Portfolio section */}
                {isMasterUser && (
                    <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200/70 dark:border-[#35332e] shadow-sm overflow-hidden">
                        <div className="px-5 pt-4 pb-1">
                            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                                Portfolio
                            </span>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-[#35332e]">
                            <Link
                                href="/balance-kr"
                                className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#f5f1eb] dark:hover:bg-[#2c2b27] transition-colors group"
                            >
                                <div className="w-8 h-8 rounded-xl bg-[#faf9f7] dark:bg-[#35332e] flex items-center justify-center shrink-0">
                                    <Eye size={15} className="text-neutral-500 dark:text-neutral-400" />
                                </div>
                                <span className="flex-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                    KR 포트폴리오
                                </span>
                                <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors" />
                            </Link>
                            <Link
                                href="/balance-us"
                                className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#f5f1eb] dark:hover:bg-[#2c2b27] transition-colors group"
                            >
                                <div className="w-8 h-8 rounded-xl bg-[#faf9f7] dark:bg-[#35332e] flex items-center justify-center shrink-0">
                                    <DollarSign size={15} className="text-neutral-500 dark:text-neutral-400" />
                                </div>
                                <span className="flex-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                    US 포트폴리오
                                </span>
                                <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors" />
                            </Link>
                        </div>
                    </div>
                )}

                {/* Account actions */}
                <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200/70 dark:border-[#35332e] shadow-sm overflow-hidden">
                    <div className="px-5 pt-4 pb-1">
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                            계정
                        </span>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex items-center gap-3 w-full px-5 py-3.5 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors group text-left"
                    >
                        <div className="w-8 h-8 rounded-xl bg-[#faf9f7] dark:bg-[#35332e] flex items-center justify-center shrink-0 group-hover:bg-red-100 dark:group-hover:bg-red-950/30 transition-colors">
                            <LogOut size={15} className="text-neutral-500 dark:text-neutral-400 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
                        </div>
                        <span className="flex-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            로그아웃
                        </span>
                    </button>
                </div>

            </div>
        </div>
    );
}
