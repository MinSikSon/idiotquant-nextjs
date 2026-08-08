"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Eye, DollarSign, ChevronRight, ShieldCheck, Heart, Trash2, Blocks } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    selectLikedList, selectLikesState,
    reqGetMyLikes, reqToggleLike,
} from "@/lib/features/stockLikes/stockLikesSlice";
import { cn } from "@/lib/utils";
import { CopyStockButtons, type CopyStock } from "@/components/copyStockButtons";
import { computeValueScore, type ValueTone } from "@/lib/utils/valueScore";
import { computeSolidity, quadrantOf, type SolidityPoint } from "@/lib/utils/portfolioSolidity";
import SolidityPlane from "@/components/profile/solidityPlane";

// 아직 아무것도 담지 않은 사용자에게 좌표평면이 무엇을 말하는지 보여주기 위한 예시.
// 실제 종목이 아니며 카드 머리에 "예시"라고 못박는다 — 자기 종목으로 오해하면
// 담기도 전에 위험 신호를 본 것이 된다.
const SAMPLE_POINTS: SolidityPoint[] = [
    { name: "싸고 팔 수 있는 종목", ticker: "s1", value: 86, safety: 100 },
    { name: "싸고 팔 수 있는 종목", ticker: "s2", value: 72, safety: 100 },
    { name: "싸고 팔 수 있는 종목", ticker: "s3", value: 64, safety: 90 },
    { name: "특별히 싸지 않은 종목", ticker: "s4", value: 34, safety: 100 },
    { name: "상장폐지가 정해진 종목", ticker: "s5", value: 95, safety: 30 },
    { name: "관리종목으로 지정된 종목", ticker: "s6", value: 78, safety: 50 },
].map(p => ({ ...p, quadrant: quadrantOf(p.value, p.safety) }));
import PortfolioLegoTower from "@/components/profile/portfolioLegoTower";
// 위험 배지는 스크리너와 같은 기준·같은 모양이어야 한다 — 같은 종목이 두 화면에서
// 다르게 보이면 어느 쪽을 믿어야 할지 알 수 없다. 그래서 판정까지 한 모듈에서 가져온다.
import { LiquidityBadge, w52Position } from "@/app/(screener)/screener/components/LiquidityBadge";

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

// 등급(tone) 표시 — 게임/valueScore 와 통일 (강한 순서)
const TONE_ORDER: ValueTone[] = ["legend", "treasure", "diamond", "gold", "silver", "bronze", "iron", "raw", "clay", "explore"];
const TONE_LABEL: Record<ValueTone, string> = {
    legend: "전설", treasure: "보물", diamond: "다이아", gold: "금", silver: "은", bronze: "동", iron: "철", raw: "원석", clay: "흙", explore: "탐색",
};
const TONE_MEDAL: Record<ValueTone, string> = {
    legend: "👑", treasure: "🏆", diamond: "💎", gold: "🥇", silver: "🥈", bronze: "🥉", iron: "🔩", raw: "🪨", clay: "🟤", explore: "🧭",
};
const TONE_CSS: Record<ValueTone, string> = {
    legend: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    treasure: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    diamond: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    gold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300",
    silver: "bg-neutral-100 text-neutral-600 dark:bg-[#35332e] dark:text-neutral-300",
    bronze: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    iron: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-400",
    raw: "bg-stone-100 text-stone-600 dark:bg-stone-900/40 dark:text-stone-400",
    clay: "bg-lime-100 text-lime-800 dark:bg-lime-950/40 dark:text-lime-500",
    explore: "bg-neutral-100 text-neutral-500 dark:bg-[#2c2b27] dark:text-neutral-500",
};

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const likedList = useAppSelector(selectLikedList);
    const likesState = useAppSelector(selectLikesState);

    // 관심 종목 복사용 행 (ROE는 EPS/BPS로 계산)
    const likedCopyRows: CopyStock[] = likedList.map(item => ({
        name: item.stock_name ?? item.ticker,
        ticker: item.ticker,
        ncav: item.ncav_ratio,
        pbr: item.pbr,
        per: item.per,
        roe: Number(item.bps) > 0 ? (Number(item.eps) / Number(item.bps)) * 100 : null,
    }));

    // 포트폴리오 탄탄함 — 저평가 점수를 거래상태·업종 쏠림으로 깎은 값 (computeSolidity 주석 참고)
    const scored = likedList.map(item => computeValueScore(item));
    const solid = computeSolidity(likedList);
    const solidity = solid.score;
    const solidityLabel = solid.label;
    const toneCounts = scored.reduce((acc, v) => { acc[v.tone] = (acc[v.tone] ?? 0) + 1; return acc; }, {} as Record<string, number>);

    const isMasterUser = session?.user?.name === process.env.NEXT_PUBLIC_MASTER;
    const isAdmin = (session?.user as any)?.role === "admin";

    // 아직 아무것도 담지 않은 사용자. 불러오는 중에는 켜지 않는다 — 목록이 있는 사용자에게
    // 온보딩 카드가 잠깐 떴다 사라지면 방금 본 것이 무엇인지 알 수 없다.
    const isNewUser = likesState === "fulfilled" && likedList.length === 0;

    const DELETE_CONFIRM_PHRASE = "탈퇴";
    // 회원 탈퇴는 한 단계 안에 둔다. 가입 직후 화면에서 가장 큰 액션이 계정 삭제일 이유가 없다.
    // 경로를 없애는 것이 아니라 실수로 누를 자리에서 치우는 것이다.
    const [showDanger, setShowDanger] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [cooldownDays, setCooldownDays] = useState(30);

    const handleDeleteAccount = async () => {
        if (deleteConfirmText.trim() !== DELETE_CONFIRM_PHRASE) return;
        setDeleting(true);
        try {
            const res = await fetch("/api/proxy/user/delete-account", { method: "DELETE" });
            if (!res.ok) throw new Error(String(res.status));
            await signOut({ callbackUrl: "/login" });
        } catch (e) {
            alert("탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            setDeleting(false);
        }
    };

    const cancelDelete = () => {
        setConfirmingDelete(false);
        setDeleteConfirmText("");
    };

    useEffect(() => {
        fetch("/api/proxy/user/withdraw-cooldown")
            .then(r => r.json())
            .then(d => { if (d?.days != null) setCooldownDays(Number(d.days)); })
            .catch(() => {});
    }, []);

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
                    {isNewUser ? "시작하기" : "내 계정"}
                </h1>

                {/* 아직 담은 종목이 없을 때만 — 다음에 할 일을 맨 위에 둔다.
                    지금까지 이 자리는 이름과 이메일이었는데, 사용자가 이미 아는 정보다. */}
                {isNewUser && (
                    <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200/70 dark:border-[#35332e] shadow-sm overflow-hidden">
                        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                                3단계 중 1단계
                            </span>
                            <span className="text-[10px] font-bold text-neutral-400 font-mono tabular-nums">1 / 3</span>
                        </div>
                        <div className="px-5">
                            <div className="h-1 rounded-full bg-neutral-100 dark:bg-[#35332e] overflow-hidden">
                                <div className="h-full w-1/3 rounded-full bg-[#16a34a]" />
                            </div>
                        </div>
                        <ol className="px-5 pt-3 pb-1 flex flex-col gap-1.5">
                            {[
                                { done: true, label: "가입했습니다" },
                                { done: false, now: true, label: "싼 종목을 찾아 관심에 담기" },
                                { done: false, label: "탄탄함으로 위험한 종목 걸러내기" },
                            ].map((s, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className={cn(
                                        "w-3 h-3 rounded-full shrink-0 border-2",
                                        s.done
                                            ? "bg-[#16a34a] border-[#16a34a]"
                                            : s.now
                                                ? "border-[#16a34a]"
                                                : "border-neutral-200 dark:border-[#3f3d37]"
                                    )} />
                                    <span className={cn(
                                        "text-xs",
                                        s.done
                                            ? "text-neutral-400 dark:text-neutral-500"
                                            : s.now
                                                ? "font-black text-neutral-800 dark:text-neutral-100"
                                                : "text-neutral-400 dark:text-neutral-500"
                                    )}>
                                        {s.label}
                                    </span>
                                </li>
                            ))}
                        </ol>
                        <div className="px-5 pt-2.5 pb-4">
                            <Link
                                href="/screener"
                                className="flex items-center justify-center gap-1.5 w-full py-3 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold transition-colors"
                            >
                                싼 종목 찾아보기
                                <ChevronRight size={15} />
                            </Link>
                        </div>
                    </div>
                )}

                {/* 담기 전에 무엇을 보게 되는지 — 담을 이유를 설명해야 할 자리에서
                    핵심 개념을 숨기고 있었다. */}
                {isNewUser && (
                    <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200/70 dark:border-[#35332e] shadow-sm overflow-hidden">
                        <div className="px-5 pt-4 pb-1 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Blocks size={12} className="text-[#16a34a]" />
                                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                                    탄탄함이란
                                </span>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-[#35332e] text-neutral-500 dark:text-neutral-400">
                                예시
                            </span>
                        </div>
                        <SolidityPlane points={SAMPLE_POINTS} value={72} safety={78} trapCount={2} sample />
                    </div>
                )}

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

                {/* 포트폴리오 탄탄함 (관심 종목 기반 3D 레고 타워) */}
                {likedList.length > 0 && (
                    <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200/70 dark:border-[#35332e] shadow-sm overflow-hidden">
                        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Blocks size={12} className="text-[#16a34a]" />
                                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                                    포트폴리오 탄탄함
                                </span>
                            </div>
                            <span className="text-[10px] text-neutral-400">관심 {likedList.length}종목 기반</span>
                        </div>

                        {/* 3D 레고 타워 */}
                        <div className="h-60 sm:h-72 bg-gradient-to-b from-[#f4faf6] to-white dark:from-[#12241c] dark:to-[#242320]">
                            <PortfolioLegoTower items={likedList} />
                        </div>

                        {/* 탄탄함 지수 */}
                        <div className="px-5 py-4 flex items-end gap-4 border-t border-neutral-100 dark:border-[#35332e]">
                            <div className="shrink-0">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">탄탄함 지수</p>
                                <p className="text-3xl font-black text-[#16a34a] tabular-nums leading-none mt-1">
                                    {solidity}<span className="text-base text-neutral-400 font-bold">/100</span>
                                </p>
                            </div>
                            <div className="flex-1 min-w-0 pb-0.5">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-black text-neutral-700 dark:text-neutral-200">{solidityLabel}</span>
                                    <span className="text-[10px] text-neutral-400">
                                        블록 {Math.min(likedList.length, 18)}{likedList.length > 18 ? ` / ${likedList.length}` : ""}
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-neutral-100 dark:bg-[#35332e] overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-[#16a34a] to-emerald-400 transition-all" style={{ width: `${solidity}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* 지수를 두 축으로 편 좌표평면 — 같은 72점이라도 "싸지만 위험"과
                            "안 싸지만 안전"은 전혀 다른 상태다. 막대 하나로는 구분되지 않는다. */}
                        <SolidityPlane
                            points={solid.points}
                            value={solid.base}
                            safety={solid.safety}
                            trapCount={solid.trapCount}
                        />

                        {/* 왜 깎였는지 — 근거 없이 낮은 숫자만 보여주면 예전보다 못하다.
                            깎일 이유가 없으면 이 줄 자체가 뜨지 않는다. */}
                        {solidity < solid.base && (
                            <div className="px-5 -mt-1 pb-3 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-neutral-400">
                                    저평가 <span className="font-mono font-bold">{solid.base}</span>
                                    <span className="mx-1">→</span>
                                    탄탄함 <span className="font-mono font-bold">{solidity}</span>
                                </span>
                                {solid.riskCount > 0 && (
                                    <span
                                        className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                                        title="정리매매·거래정지·관리종목·시장경고·저유동 종목은 지금 팔기 어려워 탄탄함에 온전히 기여하지 못합니다"
                                    >
                                        거래 위험 {solid.riskCount}종목
                                    </span>
                                )}
                                {solid.concentrationPenalty > 0 && solid.topSector && (
                                    <span
                                        className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                        title="한 업종에 몰리면 개별 종목이 좋아도 함께 무너집니다"
                                    >
                                        {solid.topSector.name} {Math.round(solid.topSector.ratio * 100)}% 쏠림
                                    </span>
                                )}
                            </div>
                        )}

                        {/* 등급 분포 */}
                        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                            {TONE_ORDER.filter(t => toneCounts[t]).map(t => (
                                <span key={t} className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", TONE_CSS[t])}>
                                    <span aria-hidden>{TONE_MEDAL[t]}</span>{TONE_LABEL[t]} {toneCounts[t]}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 관심 종목 — 비었을 때는 위의 시작하기 카드가 같은 말을 더 잘 하므로 띄우지 않는다.
                    "종목이 없습니다 / 발굴 페이지에서 추가해보세요"를 두 번 보여줄 이유가 없다. */}
                {!isNewUser && (
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

                    {likedList.length > 0 && (
                        <div className="px-5 pb-2 flex items-center justify-end gap-2">
                            <span className="text-[10px] text-neutral-400 font-medium">목록 복사</span>
                            <CopyStockButtons rows={likedCopyRows} label="관심 종목" />
                        </div>
                    )}

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
                                            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-[160px]">
                                                {item.stock_name ?? item.ticker}
                                            </span>
                                            {!!item.is_us && (
                                                <span className="text-[9px] font-black px-1 py-0.5 rounded bg-[#f0fdf4] text-[#16a34a] shrink-0">
                                                    US
                                                </span>
                                            )}
                                            {/* 담아두고 잊은 사이 상태가 바뀐 종목을 여기서 알린다.
                                                정상 종목에는 아무것도 붙지 않는다. */}
                                            <LiquidityBadge item={item} />
                                        </div>
                                        {/* 지표 요약 — 항목이 늘어 좁은 화면에서는 줄바꿈시킨다 */}
                                        <div className="flex items-center gap-x-2.5 gap-y-0.5 flex-wrap mt-0.5">
                                            {item.ncav_ratio != null && item.ncav_ratio > 0 && (
                                                <span className={cn(
                                                    "text-[10px] font-mono font-bold",
                                                    item.ncav_ratio >= 1 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
                                                )}>
                                                    NCAV {item.ncav_ratio.toFixed(2)}x
                                                </span>
                                            )}
                                            {item.pbr != null && item.pbr > 0 && (
                                                <span className="text-[10px] text-neutral-400 font-mono">PBR {item.pbr.toFixed(2)}</span>
                                            )}
                                            {item.per != null && item.per > 0 && (
                                                <span className="text-[10px] text-neutral-400 font-mono">PER {item.per.toFixed(1)}</span>
                                            )}
                                            {/* 52주 구간에서 현재가가 선 위치. 0=저점, 100=고점.
                                                "싸다"의 근거는 아니지만, 담아둔 뒤 얼마나 움직였는지가 한눈에 보인다. */}
                                            {(() => {
                                                const pos = w52Position(item);
                                                if (pos === null) return null;
                                                return (
                                                    <span
                                                        className="text-[10px] text-neutral-400 font-mono"
                                                        title={`52주 저점~고점 구간에서 ${pos.toFixed(0)}% 지점 (0=저점, 100=고점)`}
                                                    >
                                                        52주 {pos.toFixed(0)}%
                                                    </span>
                                                );
                                            })()}
                                            {item.sector && (
                                                <span className="text-[10px] text-neutral-400">{item.sector}</span>
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

                    <div className="border-t border-neutral-200/70 dark:border-[#35332e]" />

                    {/* 탈퇴는 접어 둔다 — 로그아웃 바로 아래에서 가장 큰 빨간 버튼일 이유가 없다.
                        열려 있는 동안에는 지금과 똑같이 동작한다. */}
                    {!showDanger && !confirmingDelete ? (
                        <button
                            onClick={() => setShowDanger(true)}
                            className="w-full px-5 py-3 text-left text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                            계정 설정 더 보기
                        </button>
                    ) : !confirmingDelete ? (
                        <button
                            onClick={() => setConfirmingDelete(true)}
                            disabled={isAdmin}
                            className="flex items-center gap-3 w-full px-5 py-3.5 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors group text-left disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                            <div className="w-8 h-8 rounded-xl bg-[#faf9f7] dark:bg-[#35332e] flex items-center justify-center shrink-0 group-hover:bg-red-100 dark:group-hover:bg-red-950/30 transition-colors">
                                <Trash2 size={15} className="text-red-400 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
                            </div>
                            <div className="flex-1">
                                <span className="block text-sm font-semibold text-red-600 dark:text-red-400">
                                    회원 탈퇴
                                </span>
                                <span className="block text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                                    {isAdmin ? "관리자 계정은 탈퇴할 수 없습니다" : "계정과 모든 데이터가 영구 삭제됩니다"}
                                </span>
                            </div>
                        </button>
                    ) : (
                        <div className="px-5 py-4 bg-red-50/60 dark:bg-red-950/20">
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
                                정말 탈퇴하시겠어요?
                            </p>
                            <p className="text-[12px] leading-relaxed text-neutral-600 dark:text-neutral-400 mb-3">
                                <b>카카오 로그인 정보 등 회원님의 개인정보</b>가 영구 삭제되며 복구할 수 없습니다.
                                {cooldownDays > 0 && (
                                    <><br />탈퇴 후 <b>{cooldownDays}일간</b> 같은 카카오 계정으로 재가입할 수 없습니다.</>
                                )}
                            </p>
                            <label className="block text-[12px] text-neutral-500 dark:text-neutral-400 mb-1.5">
                                계속하려면 <span className="font-bold text-red-600 dark:text-red-400">{DELETE_CONFIRM_PHRASE}</span> 을(를) 입력하세요
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                disabled={deleting}
                                placeholder={DELETE_CONFIRM_PHRASE}
                                autoFocus
                                className="w-full px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#1c1b19] text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:border-red-400 dark:focus:border-red-600 mb-3"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={cancelDelete}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-[#35332e] hover:bg-neutral-200 dark:hover:bg-[#403d37] transition-colors disabled:opacity-50"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleting || deleteConfirmText.trim() !== DELETE_CONFIRM_PHRASE}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {deleting ? "탈퇴 처리 중…" : "영구 삭제"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
