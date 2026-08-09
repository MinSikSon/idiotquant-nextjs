"use client";

// 모의투자 — 가상 현금 1,000만원으로 실제 현재가에 사고팔아 본다.
//
// 스크리너가 "싸게 나온 회사"를 찾아 주는 데서 끝나 있었는데, 그 다음 행동(사보기)이 없었다.
// 여기가 그 자리다.
//
// 로그인하면 계좌가 D1 에 저장되고(워커 /user/paper), 아니면 localStorage 에만 남는다.
// 두 경로가 같은 스냅샷 모양을 쓰므로 화면은 어느 쪽인지 신경 쓰지 않는다.
//
// 값이 두 종류라는 점만 주의: **체결가는 KIS 실시간 현재가**이고, **평가금액은 스캔가**다.
// 스캔은 2,000종목을 롤링으로 도느라 최대 12시간 지연되므로, 화면에 기준일을 같이 적는다.

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
    Wallet, TrendingUp, Coins, RotateCcw, Search, Heart, Layers, ArrowRight, Clock,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { reqGetNcavDailyList, selectNcavDailyList, type NcavDailyItem } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { reqGetMyLikes, selectLikedList } from "@/lib/features/stockLikes/stockLikesSlice";
import { getDeck } from "@/lib/features/deck/deckAPI";
import { getInquirePrice } from "@/lib/features/koreaInvestment/koreaInvestmentAPI";

import { SEED, isMarketOpen, avgPrice } from "@/lib/paper/engine";
import { loadLocal, resetLocal, applyLocalOrder, emptySnapshot } from "@/lib/paper/localAccount";
import type { PaperSnapshot, PaperPositionRow } from "@/lib/paper/types";
import { getPaperAccount, placePaperOrder, resetPaperAccount } from "@/lib/features/paper/paperAPI";

import {
    fmtKrw, KpiCard, PnlIcon, pnlIconBg, pnlValueColor, pnlAccentColor,
    SectionPanel, SectionHeader, EmptyState, TabButton,
    useToast, ToastContainer, LoadingState,
} from "@/components/balance/shared";
import { cn } from "@/lib/utils";
import { safeNum } from "@/lib/utils/numbers";

// recharts 를 초기 번들에서 뺀다 (balanceKrView 와 같은 방식)
const PortfolioChartSection = dynamic(
    () => import("@/components/balance/portfolioChart").then(m => ({ default: m.PortfolioChartSection })),
    { ssr: false, loading: () => <div className="h-64 rounded-2xl bg-neutral-100 dark:bg-[#242320] animate-pulse" /> },
);

type BuyTab = "scan" | "likes" | "deck";

interface Candidate {
    ticker: string;
    name: string;
    last_price: number;
    ncav_ratio?: number;
    per?: number;
    pbr?: number;
}

const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

/** KIS 실시간 현재가. 체결은 항상 이 값으로 한다(스캔가로 체결하면 옛 가격에 살 수 있다). */
async function fetchLivePrice(ticker: string): Promise<number> {
    const res: any = await getInquirePrice(ticker);
    return safeNum(res?.output?.stck_prpr);
}

export default function PaperTradingPage() {
    const dispatch = useAppDispatch();
    const { data: session, status } = useSession();
    const isLoggedIn = status === "authenticated" && !!session?.user;

    const ncav = useAppSelector(selectNcavDailyList);
    const likedList = useAppSelector(selectLikedList);
    const { toasts, addToast, removeToast } = useToast();

    const [snapshot, setSnapshot] = useState<PaperSnapshot | null>(null);
    const [deckTickers, setDeckTickers] = useState<Set<string>>(new Set());
    const [tab, setTab] = useState<BuyTab>("scan");
    const [query, setQuery] = useState("");
    const [pending, setPending] = useState<string | null>(null);
    const [marketOpen, setMarketOpen] = useState(true);
    const [confirmReset, setConfirmReset] = useState(false);

    // 장 상태는 1분마다 다시 본다 — 09:00 에 화면을 열어 둔 사람이 새로고침 없이 주문할 수 있어야 한다
    useEffect(() => {
        const tick = () => setMarketOpen(isMarketOpen());
        tick();
        const id = setInterval(tick, 60_000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => { dispatch(reqGetNcavDailyList("latest")); }, [dispatch]);
    useEffect(() => { if (isLoggedIn) dispatch(reqGetMyLikes()); }, [isLoggedIn, dispatch]);

    // 계좌 적재 — 로그인 여부가 정해진 뒤에만 움직인다(로딩 중에 로컬을 띄우면 깜빡인다)
    useEffect(() => {
        if (status === "loading") return;
        let cancelled = false;

        if (!isLoggedIn) {
            setSnapshot(loadLocal());
            return;
        }
        getPaperAccount().then(res => {
            if (cancelled) return;
            if (res.success) setSnapshot({ account: res.account, positions: res.positions, orders: res.orders });
            else setSnapshot(emptySnapshot());
        });
        return () => { cancelled = true; };
    }, [isLoggedIn, status]);

    useEffect(() => {
        if (!isLoggedIn) { setDeckTickers(new Set()); return; }
        let cancelled = false;
        getDeck().then((res: any) => {
            if (cancelled || !res?.success || !Array.isArray(res.data)) return;
            setDeckTickers(new Set(res.data.map((r: any) => String(r.ticker))));
        }).catch(() => { });
        return () => { cancelled = true; };
    }, [isLoggedIn]);

    // 스캔 목록 = 매수 후보이자 평가용 시세표. 한 번 받아 두 군데에 쓴다.
    const scanList: NcavDailyItem[] = useMemo(
        () => (Array.isArray(ncav.list) ? ncav.list : []).filter(r => r?.ticker && r?.name && safeNum(r.last_price) > 0),
        [ncav.list],
    );
    const priceMap = useMemo(() => {
        const m = new Map<string, number>();
        for (const r of scanList) m.set(r.ticker, safeNum(r.last_price));
        return m;
    }, [scanList]);
    const nameMap = useMemo(() => {
        const m = new Map<string, string>();
        for (const r of scanList) m.set(r.ticker, r.name);
        return m;
    }, [scanList]);

    // 관심 종목의 KR 키는 6자리 코드가 아니라 종목명이다(screener 가 그렇게 저장한다).
    // 스캔 목록의 이름→코드로 되돌려야 주문을 넣을 수 있고, 못 찾은 건 후보에서 빠진다.
    const codeByName = useMemo(() => {
        const m = new Map<string, string>();
        for (const r of scanList) m.set(r.name, r.ticker);
        return m;
    }, [scanList]);

    const candidates: Candidate[] = useMemo(() => {
        const base: Candidate[] = scanList.map(r => ({
            ticker: r.ticker, name: r.name, last_price: safeNum(r.last_price),
            ncav_ratio: safeNum(r.ncav_ratio), per: safeNum(r.per), pbr: safeNum(r.pbr),
        }));

        let rows = base;
        if (tab === "likes") {
            const wanted = new Set<string>();
            for (const l of likedList) {
                if (l.is_us) continue;
                const code = /^\d{6}$/.test(l.ticker) ? l.ticker : codeByName.get(l.ticker) ?? (l.stock_name ? codeByName.get(l.stock_name) : undefined);
                if (code) wanted.add(code);
            }
            rows = base.filter(c => wanted.has(c.ticker));
        } else if (tab === "deck") {
            rows = base.filter(c => deckTickers.has(c.ticker));
        }

        const q = query.trim();
        if (q) rows = rows.filter(c => c.name.includes(q) || c.ticker.includes(q));

        // 싼 순으로 — 이 게임에서 보여줄 순서는 NCAV 비율이 높은 쪽이다
        return rows.sort((a, b) => (b.ncav_ratio ?? 0) - (a.ncav_ratio ?? 0)).slice(0, 60);
    }, [scanList, tab, likedList, codeByName, deckTickers, query]);

    // ── 평가 ────────────────────────────────────────────────
    const valued = useMemo(() => {
        const rows = (snapshot?.positions ?? []).map(p => {
            const price = priceMap.get(p.ticker) ?? safeNum(p.last_price);
            const marketValue = price * p.qty;
            const unrealized = marketValue - p.cost_basis;
            return {
                ...p,
                name: p.name ?? nameMap.get(p.ticker) ?? p.ticker,
                price,
                avg: avgPrice(p),
                marketValue,
                unrealized,
                rate: p.cost_basis > 0 ? (unrealized / p.cost_basis) * 100 : 0,
            };
        });
        const totalValue = rows.reduce((s, r) => s + r.marketValue, 0);
        const totalCost = rows.reduce((s, r) => s + r.cost_basis, 0);
        return { rows, totalValue, totalCost, unrealized: totalValue - totalCost };
    }, [snapshot?.positions, priceMap, nameMap]);

    const account = snapshot?.account;
    const totalAssets = (account?.cash ?? 0) + valued.totalValue;
    const seed = account?.seed ?? SEED;
    const totalPnl = totalAssets - seed;
    const totalRate = seed > 0 ? (totalPnl / seed) * 100 : 0;

    const scanDate = ncav.scanDate ?? snapshot?.positions.find(p => p.scan_date)?.scan_date ?? null;

    // ── 주문 ────────────────────────────────────────────────
    const order = useCallback(async (side: "buy" | "sell", ticker: string, name: string | null, qty: number) => {
        if (!marketOpen) { addToast("error", "정규장(09:00~15:30)에만 체결됩니다."); return; }
        if (qty <= 0) return;
        setPending(`${side}:${ticker}`);
        try {
            if (isLoggedIn) {
                // 체결가는 서버가 실시간으로 잡는다
                const res = await placePaperOrder(side, ticker, qty, name);
                if (!res.success) { addToast("error", res.error); return; }
                setSnapshot({ account: res.account, positions: res.positions, orders: res.orders });
                const f = res.filled;
                addToast("success", `${name ?? ticker} ${qty}주 ${side === "buy" ? "매수" : "매도"} 체결 · ${fmtKrw(f?.price ?? 0)}`);
            } else {
                const price = await fetchLivePrice(ticker);
                if (!(price > 0)) { addToast("error", "현재가를 가져오지 못했습니다."); return; }
                const cur = snapshot ?? loadLocal();
                const res = applyLocalOrder(cur, { side, ticker, name, qty, price });
                if (!res.ok) { addToast("error", res.error); return; }
                setSnapshot(res.snapshot);
                addToast("success", `${name ?? ticker} ${qty}주 ${side === "buy" ? "매수" : "매도"} 체결 · ${fmtKrw(price)}`);
            }
        } catch {
            addToast("error", "주문 처리 중 오류가 났습니다.");
        } finally {
            setPending(null);
        }
    }, [isLoggedIn, marketOpen, snapshot, addToast]);

    const doReset = useCallback(async () => {
        setConfirmReset(false);
        if (isLoggedIn) {
            const res = await resetPaperAccount();
            if (!res.success) { addToast("error", res.error); return; }
            setSnapshot({ account: res.account, positions: res.positions, orders: res.orders });
        } else {
            setSnapshot(resetLocal());
        }
        addToast("success", "계좌를 초기화했습니다.");
    }, [isLoggedIn, addToast]);

    if (!snapshot) return <LoadingState message="모의투자 계좌를 불러오는 중..." />;

    return (
        <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1917] pb-24">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            <div className="max-w-5xl mx-auto px-4 sm:px-5 py-6 sm:py-10 flex flex-col gap-5">

                {/* ── 머리 ─────────────────────────────── */}
                <header className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a1730a] dark:text-[#e3b34a] mb-1.5">
                            Paper Trading
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white break-keep">
                            가상 1,000만원으로 연습하기
                        </h1>
                        <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1.5 break-keep">
                            실제 현재가로 체결됩니다. 진짜 돈은 오가지 않습니다.
                        </p>
                    </div>
                    <button
                        onClick={() => setConfirmReset(true)}
                        className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl text-xs font-bold text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26] transition-colors"
                    >
                        <RotateCcw size={14} /> 계좌 초기화
                    </button>
                </header>

                {!isLoggedIn && (
                    <div className="rounded-2xl border border-[#e3b34a]/40 bg-[#fdf6e9] dark:bg-[#1c1608] px-4 py-3 text-[13px] text-[#8a6206] dark:text-[#e3b34a] break-keep">
                        지금은 이 브라우저에만 저장됩니다.{" "}
                        <Link href="/login?callbackUrl=%2Fgame" className="underline font-bold">로그인</Link>
                        하면 계좌가 계정에 저장돼 다른 기기에서도 이어집니다.
                    </div>
                )}

                {!marketOpen && (
                    <div className="rounded-2xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] px-4 py-3 text-[13px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2 break-keep">
                        <Clock size={15} className="shrink-0" />
                        지금은 장이 닫혀 있습니다. 정규장 09:00~15:30(KST)에만 체결됩니다.
                    </div>
                )}

                {/* ── 계좌 요약 ────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <KpiCard
                        label="총 자산" value={fmtKrw(totalAssets)}
                        sub={`시드 ${fmtKrw(seed)}`}
                        icon={<Wallet size={15} />} iconBg="bg-neutral-100 dark:bg-[#2c2a26] text-neutral-500"
                    />
                    <KpiCard
                        label="예수금" value={fmtKrw(account?.cash ?? 0)}
                        sub={`보유 ${valued.rows.length}종목`}
                        icon={<Coins size={15} />} iconBg="bg-neutral-100 dark:bg-[#2c2a26] text-neutral-500"
                    />
                    <KpiCard
                        label="평가손익" value={fmtKrw(valued.unrealized)}
                        sub={`실현 ${fmtKrw(account?.realized ?? 0)}`}
                        icon={<PnlIcon positive={valued.unrealized >= 0} />}
                        iconBg={pnlIconBg(valued.unrealized >= 0)}
                        valueColor={pnlValueColor(valued.unrealized >= 0)}
                        accentColor={pnlAccentColor(valued.unrealized >= 0)}
                    />
                    <KpiCard
                        label="수익률" value={pct(totalRate)}
                        sub={`수수료 누적 ${fmtKrw(account?.fees_paid ?? 0)}`}
                        icon={<TrendingUp size={15} />}
                        iconBg={pnlIconBg(totalPnl >= 0)}
                        valueColor={pnlValueColor(totalPnl >= 0)}
                        accentColor={pnlAccentColor(totalPnl >= 0)}
                    />
                </div>

                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 break-keep -mt-1">
                    체결가는 실시간 현재가, 평가금액은 스캔가 기준입니다
                    {scanDate ? ` (${scanDate.slice(0, 4)}-${scanDate.slice(4, 6)}-${scanDate.slice(6, 8)})` : ""}.
                    스캔은 종목을 돌아가며 갱신해 최대 반나절 늦을 수 있습니다.
                </p>

                {/* ── 보유 종목 ────────────────────────── */}
                <SectionPanel>
                    <SectionHeader icon={<Layers size={16} />} title="보유 종목" subtitle={`${valued.rows.length}종목`} />
                    {valued.rows.length === 0 ? (
                        <EmptyState message="아직 산 종목이 없습니다. 아래에서 골라 보세요." icon={<Layers size={20} />} />
                    ) : (
                        <>
                            {/* 모바일은 카드. 표를 가로 스크롤에 맡기면 매도 버튼이 화면 밖으로 나가
                                스크롤을 발견한 사람만 팔 수 있게 된다. */}
                            <ul className="sm:hidden flex flex-col divide-y divide-neutral-100 dark:divide-[#2c2a26]">
                                {valued.rows.map(r => (
                                    <PositionCard
                                        key={r.ticker} row={r} marketOpen={marketOpen}
                                        pending={pending === `sell:${r.ticker}`}
                                        onSell={qty => order("sell", r.ticker, r.name, qty)}
                                    />
                                ))}
                            </ul>

                            <div className="hidden sm:block overflow-x-auto -mx-1">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                                            <th className="text-left py-2 px-2">종목</th>
                                            <th className="text-right py-2 px-2">수량</th>
                                            <th className="text-right py-2 px-2">평단</th>
                                            <th className="text-right py-2 px-2">현재가</th>
                                            <th className="text-right py-2 px-2">평가손익</th>
                                            <th className="text-right py-2 px-2">매도</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {valued.rows.map(r => (
                                            <PositionRow
                                                key={r.ticker} row={r} marketOpen={marketOpen}
                                                pending={pending === `sell:${r.ticker}`}
                                                onSell={qty => order("sell", r.ticker, r.name, qty)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </SectionPanel>

                {/* ── 비중 ─────────────────────────────── */}
                {/* 한 종목뿐이면 도넛이 100% 원 하나라 아무것도 알려주지 않는다 — 둘부터 그린다 */}
                {valued.rows.length > 1 && (
                    <PortfolioChartSection
                        isUs={false}
                        isLoading={false}
                        output1={valued.rows.map(r => ({
                            prdt_name: r.name,
                            evlu_amt: String(r.marketValue),
                            evlu_pfls_rt: r.rate.toFixed(2),
                        }))}
                    />
                )}

                {/* ── 매수 ─────────────────────────────── */}
                <SectionPanel>
                    <SectionHeader icon={<Search size={16} />} title="사기" subtitle="오늘 스캔에서 찾은 회사들" />

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <TabButton active={tab === "scan"} onClick={() => setTab("scan")}>오늘 싸게 나온 회사</TabButton>
                        <TabButton active={tab === "likes"} onClick={() => setTab("likes")}>
                            <span className="inline-flex items-center gap-1"><Heart size={12} /> 관심종목</span>
                        </TabButton>
                        <TabButton active={tab === "deck"} onClick={() => setTab("deck")}>
                            <span className="inline-flex items-center gap-1"><Layers size={12} /> 내가 모은 종목</span>
                        </TabButton>
                    </div>

                    <div className="relative mb-4">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="종목명 또는 코드"
                            className="w-full min-h-[44px] pl-9 pr-3 rounded-xl text-sm bg-neutral-50 dark:bg-[#1a1917] border border-neutral-200 dark:border-[#35332e] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#e3b34a]/40"
                        />
                    </div>

                    {ncav.state === "pending" && scanList.length === 0 ? (
                        <div className="h-40 rounded-xl bg-neutral-100 dark:bg-[#1a1917] animate-pulse" />
                    ) : candidates.length === 0 ? (
                        <EmptyState
                            message={
                                tab === "likes" ? (isLoggedIn ? "관심종목 중 오늘 스캔에 잡힌 국내 종목이 없습니다." : "로그인하면 관심종목을 불러옵니다.")
                                    : tab === "deck" ? (isLoggedIn ? "수집한 종목 중 오늘 스캔에 잡힌 게 없습니다." : "로그인하면 수집한 종목을 불러옵니다.")
                                        : "오늘 스캔 결과가 아직 없습니다."
                            }
                            icon={<Search size={20} />}
                        />
                    ) : (
                        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-[#2c2a26]">
                            {candidates.map(c => (
                                <CandidateRow
                                    key={c.ticker} candidate={c} marketOpen={marketOpen}
                                    cash={account?.cash ?? 0}
                                    pending={pending === `buy:${c.ticker}`}
                                    onBuy={qty => order("buy", c.ticker, c.name, qty)}
                                />
                            ))}
                        </ul>
                    )}
                </SectionPanel>

                {/* ── 거래 내역 ────────────────────────── */}
                {snapshot.orders.length > 0 && (
                    <SectionPanel>
                        <SectionHeader icon={<Clock size={16} />} title="거래 내역" subtitle={`최근 ${snapshot.orders.length}건`} />
                        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-[#2c2a26] text-sm">
                            {snapshot.orders.map(o => (
                                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={cn(
                                            "text-[10px] font-black px-1.5 py-0.5 rounded shrink-0",
                                            o.side === "buy"
                                                ? "bg-red-50 dark:bg-red-950/40 text-red-500"
                                                : "bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a]",
                                        )}>
                                            {o.side === "buy" ? "매수" : "매도"}
                                        </span>
                                        <span className="font-bold text-neutral-900 dark:text-white truncate">
                                            {o.name ?? nameMap.get(o.ticker) ?? o.ticker}
                                        </span>
                                        <span className="text-[11px] text-neutral-400 shrink-0">{o.qty}주</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="font-mono text-xs text-neutral-700 dark:text-neutral-300">{fmtKrw(o.price)}</div>
                                        {o.realized !== null && (
                                            <div className={cn("font-mono text-[11px]", pnlValueColor(o.realized >= 0))}>
                                                {o.realized >= 0 ? "+" : ""}{fmtKrw(o.realized)}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </SectionPanel>
                )}

                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 break-keep text-center">
                    수수료 매수·매도 각 0.015%, 매도 시 증권거래세 0.18%를 반영합니다.
                </p>
            </div>

            {confirmReset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5" onClick={() => setConfirmReset(false)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#242320] p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-black text-neutral-900 dark:text-white">계좌를 초기화할까요?</h2>
                        <p className="text-[13px] text-neutral-500 dark:text-neutral-400 break-keep">
                            보유 종목과 거래 내역이 모두 지워지고 예수금이 {fmtKrw(SEED)}으로 돌아갑니다. 되돌릴 수 없습니다.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setConfirmReset(false)}
                                className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-[#2c2a26]">
                                취소
                            </button>
                            <button onClick={doReset}
                                className="min-h-[44px] px-4 rounded-xl text-sm font-black text-white bg-red-500 hover:bg-red-600">
                                초기화
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

type ValuedRow = PaperPositionRow & {
    name: string; price: number; avg: number; marketValue: number; unrealized: number; rate: number;
};

/** 수량 입력 + 팔기 버튼. 표와 카드가 같은 걸 쓴다. */
function SellControl({ held, marketOpen, pending, onSell }: {
    held: number; marketOpen: boolean; pending: boolean; onSell: (qty: number) => void;
}) {
    const [qty, setQty] = useState(1);
    return (
        <div className="flex items-center gap-1.5 justify-end">
            <input
                type="number" min={1} max={held} value={qty}
                onChange={e => setQty(Math.max(1, Math.min(held, Math.floor(Number(e.target.value) || 1))))}
                aria-label="매도 수량"
                className="w-14 min-h-[38px] px-2 rounded-lg text-xs text-right font-mono bg-neutral-50 dark:bg-[#1a1917] border border-neutral-200 dark:border-[#35332e] text-neutral-900 dark:text-white"
            />
            <button
                onClick={() => onSell(qty)}
                disabled={!marketOpen || pending}
                className="min-h-[38px] px-3 rounded-lg text-[11px] font-black text-[#16a34a] border border-[#16a34a]/40 hover:bg-[#f0fdf4] dark:hover:bg-[#052e16]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
                {pending ? "…" : "팔기"}
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// 보유 — 모바일 카드
// ─────────────────────────────────────────────────────────
function PositionCard({ row, marketOpen, pending, onSell }: {
    row: ValuedRow; marketOpen: boolean; pending: boolean; onSell: (qty: number) => void;
}) {
    const up = row.unrealized >= 0;
    return (
        <li className="py-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-bold text-neutral-900 dark:text-white truncate">{row.name}</div>
                    <div className="text-[11px] text-neutral-400 font-mono">{row.ticker} · {row.qty}주</div>
                </div>
                <div className={cn("text-right font-mono shrink-0", pnlValueColor(up))}>
                    <div className="text-sm font-black">{up ? "+" : ""}{fmtKrw(row.unrealized)}</div>
                    <div className="text-[11px]">{pct(row.rate)}</div>
                </div>
            </div>
            <div className="flex items-end justify-between gap-3">
                <div className="text-[11px] text-neutral-400 font-mono leading-relaxed">
                    평단 {fmtKrw(row.avg)}<br />현재 {fmtKrw(row.price)}
                </div>
                <SellControl held={row.qty} marketOpen={marketOpen} pending={pending} onSell={onSell} />
            </div>
        </li>
    );
}

// ─────────────────────────────────────────────────────────
// 보유 — 데스크탑 한 줄
// ─────────────────────────────────────────────────────────
function PositionRow({ row, marketOpen, pending, onSell }: {
    row: ValuedRow;
    marketOpen: boolean; pending: boolean; onSell: (qty: number) => void;
}) {
    const up = row.unrealized >= 0;

    return (
        <tr className="border-t border-neutral-100 dark:border-[#2c2a26]">
            <td className="py-3 px-2">
                <div className="font-bold text-neutral-900 dark:text-white">{row.name}</div>
                <div className="text-[11px] text-neutral-400 font-mono">{row.ticker}</div>
            </td>
            <td className="py-3 px-2 text-right font-mono text-neutral-700 dark:text-neutral-300">{row.qty}</td>
            <td className="py-3 px-2 text-right font-mono text-neutral-500 text-xs">{fmtKrw(row.avg)}</td>
            <td className="py-3 px-2 text-right font-mono text-neutral-700 dark:text-neutral-300 text-xs">{fmtKrw(row.price)}</td>
            <td className={cn("py-3 px-2 text-right font-mono", pnlValueColor(up))}>
                <div className="text-xs font-black">{up ? "+" : ""}{fmtKrw(row.unrealized)}</div>
                <div className="text-[11px]">{pct(row.rate)}</div>
            </td>
            <td className="py-3 px-2">
                <SellControl held={row.qty} marketOpen={marketOpen} pending={pending} onSell={onSell} />
            </td>
        </tr>
    );
}

// ─────────────────────────────────────────────────────────
// 후보 한 줄 — 수량을 정해 산다
// ─────────────────────────────────────────────────────────
function CandidateRow({ candidate, marketOpen, cash, pending, onBuy }: {
    candidate: Candidate; marketOpen: boolean; cash: number; pending: boolean; onBuy: (qty: number) => void;
}) {
    const [qty, setQty] = useState(1);
    const cost = candidate.last_price * qty;
    const affordable = cost <= cash;

    return (
        <li className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
                <div className="font-bold text-neutral-900 dark:text-white truncate">{candidate.name}</div>
                <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                    <span className="font-mono">{candidate.ticker}</span>
                    <span className="font-mono">{fmtKrw(candidate.last_price)}</span>
                    {(candidate.ncav_ratio ?? 0) > 0 && (
                        <span className="text-[#a1730a] dark:text-[#e3b34a] font-bold">NCAV {candidate.ncav_ratio!.toFixed(2)}</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <input
                    type="number" min={1} value={qty}
                    onChange={e => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                    className="w-14 min-h-[36px] px-2 rounded-lg text-xs text-right font-mono bg-neutral-50 dark:bg-[#1a1917] border border-neutral-200 dark:border-[#35332e] text-neutral-900 dark:text-white"
                />
                <button
                    onClick={() => onBuy(qty)}
                    disabled={!marketOpen || pending || !affordable}
                    title={!affordable ? "예수금이 부족합니다" : undefined}
                    className="min-h-[36px] px-3 rounded-lg text-[11px] font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                >
                    {pending ? "…" : <>사기 <ArrowRight size={11} /></>}
                </button>
            </div>
        </li>
    );
}
