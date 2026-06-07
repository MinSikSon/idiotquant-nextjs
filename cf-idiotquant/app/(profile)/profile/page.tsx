"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { LogOut, Eye, DollarSign, ChevronRight, ShieldCheck, Heart } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    selectLikedList, selectLikesState,
    reqGetMyLikes, reqToggleLike,
} from "@/lib/features/stockLikes/stockLikesSlice";
import { cn } from "@/lib/utils";

const STRATEGY_BADGE: Record<string, string> = {
    ncav:           "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
    low_pbr:        "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
    low_per:        "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
    s_rim:          "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
    graham_number:  "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400",
    magic_formula:  "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400",
    quality_value:  "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    near_ncav:      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400",
    balanced_value: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400",
};
const STRATEGY_LABEL: Record<string, string> = {
    ncav: "NCAV", low_pbr: "저PBR", low_per: "저PER", s_rim: "S-RIM",
    graham_number: "그레이엄", magic_formula: "마법공식", quality_value: "퀄리티",
    near_ncav: "NCAV근접", balanced_value: "균형가치",
};

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const likedList = useAppSelector(selectLikedList);
    const likesState = useAppSelector(selectLikesState);

    const isMasterUser = session?.user?.name === process.env.NEXT_PUBLIC_MASTER;
    const isAdmin = (session?.user as any)?.role === "admin";

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
        }
        if (status === "authenticated") {
            dispatch(reqGetMyLikes());
        }
    }, [status, router, dispatch]);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-[#16a34a] animate-spin" />
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
                                <span className="inline-block mt-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#dcfce7] dark:bg-[#052e16]/50 text-[#16a34a] dark:text-[#16a34a] uppercase tracking-tight">
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

                {/* Admin section */}
                {isAdmin && (
                    <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200/70 dark:border-[#35332e] shadow-sm overflow-hidden">
                        <div className="px-5 pt-4 pb-1">
                            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                                Admin
                            </span>
                        </div>
                        <div className="divide-y divide-neutral-100 dark:divide-[#35332e]">
                            <Link
                                href="/admin"
                                className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#f5f1eb] dark:hover:bg-[#2c2b27] transition-colors group"
                            >
                                <div className="w-8 h-8 rounded-xl bg-[#dcfce7] dark:bg-[#052e16]/50 flex items-center justify-center shrink-0">
                                    <ShieldCheck size={15} className="text-[#16a34a]" />
                                </div>
                                <span className="flex-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                    회원 관리
                                </span>
                                <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors" />
                            </Link>
                        </div>
                    </div>
                )}

                {/* 관심 종목 */}
                <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200/70 dark:border-[#35332e] shadow-sm overflow-hidden">
                    <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Heart size={11} className="text-rose-500" fill="currentColor" />
                            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                                관심 종목
                            </span>
                            {likedList.length > 0 && (
                                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-[#35332e] px-1.5 py-0.5 rounded-full">
                                    {likedList.length}
                                </span>
                            )}
                        </div>
                        <Link
                            href="/screener?filter=liked"
                            className="text-[10px] font-bold text-[#16a34a] hover:underline"
                        >
                            발굴 페이지에서 보기
                        </Link>
                    </div>

                    {likesState === "pending" || likesState === "init" ? (
                        <div className="px-5 py-5 flex justify-center">
                            <div className="w-5 h-5 rounded-full border-2 border-neutral-200 border-t-[#16a34a] animate-spin" />
                        </div>
                    ) : likedList.length === 0 ? (
                        <div className="px-5 py-6 text-center">
                            <Heart size={22} className="text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">관심 종목이 없습니다</p>
                            <p className="text-[11px] text-neutral-400 mt-1">
                                <Link href="/screener" className="text-[#16a34a] hover:underline font-bold">발굴 페이지</Link>에서 종목을 추가해보세요
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-neutral-100 dark:divide-[#35332e]">
                            {likedList.map(item => (
                                <div key={item.ticker} className="flex items-center gap-2 px-5 py-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-[130px]">
                                                {item.stock_name ?? item.ticker}
                                            </span>
                                            <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                                                {item.ticker}
                                            </span>
                                            {!!item.is_us && (
                                                <span className="text-[9px] font-black px-1 py-0.5 rounded bg-[#f0fdf4] text-[#16a34a] shrink-0">
                                                    US
                                                </span>
                                            )}
                                        </div>
                                        {item.strategies.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {item.strategies.map(s => (
                                                    <span
                                                        key={s}
                                                        className={cn(
                                                            "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                                                            STRATEGY_BADGE[s] ?? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                                        )}
                                                    >
                                                        {STRATEGY_LABEL[s] ?? s}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Link
                                        href={`/analyze?ticker=${encodeURIComponent(item.stock_name ?? item.ticker)}&from=screener`}
                                        className="shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-[#16a34a] hover:bg-[#f0fdf4] dark:hover:bg-[#052e16]/30 transition-colors"
                                        title="분석 보기"
                                    >
                                        <ChevronRight size={14} />
                                    </Link>
                                    <button
                                        onClick={() => dispatch(reqToggleLike({
                                            ticker: item.ticker,
                                            name: item.stock_name ?? undefined,
                                            isUs: !!item.is_us,
                                        }))}
                                        className="shrink-0 p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                                        title="관심 해제"
                                    >
                                        <Heart size={14} fill="currentColor" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

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
