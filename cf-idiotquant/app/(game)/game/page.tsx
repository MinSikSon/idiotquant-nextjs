"use client";

// 블라인드 차트 리플레이 — 어느 종목인지, 언제인지 모르는 60 거래일을 하루씩 넘기며 사고판다.
//
// 앞 20일은 컨텍스트로 한 번에 열어 준다(판단 근거가 있어야 한다). 나머지 40일은 하루씩.
// 끝나면 수익률과 정답(종목명·기간)을 열고, 그냥 사서 들고 있었을 때와 나란히 놓는다.
//
// 로그인하면 워커가 캔들을 쥐고 하루씩 흘려 준다(/user/replay) — 코인과 최고기록이 서버에
// 남으므로 브라우저에서 앞날을 볼 수 있으면 그 기록이 거짓이 되기 때문이다. 비로그인은
// 브라우저 안에서 굴리고 기록을 남기지 않는다.

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Play, Flag, TrendingUp, Coins, Wallet, RotateCcw, Eye } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { reqGetNcavDailyList, selectNcavDailyList } from "@/lib/features/algorithmTrade/algorithmTradeSlice";

import { avgPrice, quoteBuy } from "@/lib/paper/engine";
import { CONTEXT_DAYS, TOTAL_DAYS, type ReplayRound, type ReplayHistoryItem } from "@/lib/paper/round";
import { buildLocalRound, loadLocal, saveLocal, advanceLocal, giveUpLocal } from "@/lib/paper/localRound";
import { getReplayState, startReplayRound, advanceReplayRound, giveUpReplayRound } from "@/lib/features/paper/replayAPI";

import {
    fmtKrw, KpiCard, PnlIcon, pnlIconBg, pnlValueColor, pnlAccentColor,
    SectionPanel, SectionHeader, useToast, ToastContainer,
} from "@/components/balance/shared";
import { cn } from "@/lib/utils";
import { safeNum } from "@/lib/utils/numbers";

// recharts 를 초기 번들에서 뺀다
const LineChart = dynamic(() => import("@/components/LineChart"), {
    ssr: false,
    loading: () => <div className="h-full min-h-[120px] rounded-2xl bg-neutral-100 dark:bg-[#242320] animate-pulse" />,
});

const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const fmtDate = (d?: string | null) => (d && d.length === 8 ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}` : "");

export default function ReplayGamePage() {
    const dispatch = useAppDispatch();
    const { status } = useSession();
    const isLoggedIn = status === "authenticated";

    const ncav = useAppSelector(selectNcavDailyList);
    const { toasts, addToast, removeToast } = useToast();

    const [round, setRound] = useState<ReplayRound | null>(null);
    const [history, setHistory] = useState<ReplayHistoryItem[]>([]);
    const [coins, setCoins] = useState(0);
    const [bestReturn, setBestReturn] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [qty, setQty] = useState(10);

    // 비로그인 판을 만들 때 쓸 종목 풀. 로그인은 서버가 알아서 뽑는다.
    useEffect(() => { if (!isLoggedIn) dispatch(reqGetNcavDailyList("latest")); }, [isLoggedIn, dispatch]);

    const localPool = useMemo(
        () => (Array.isArray(ncav.list) ? ncav.list : [])
            .filter(r => r?.ticker && r?.name && safeNum(r.last_price) > 0)
            .map(r => ({ ticker: r.ticker, name: r.name })),
        [ncav.list],
    );

    // 진행 중이던 판 이어받기
    useEffect(() => {
        if (status === "loading") return;
        let cancelled = false;

        if (!isLoggedIn) {
            setRound(loadLocal());
            setLoading(false);
            return;
        }
        getReplayState().then(res => {
            if (cancelled) return;
            if (res.success) {
                setRound(res.round);
                setHistory(res.history ?? []);
                setCoins(res.wallet?.coins ?? 0);
                setBestReturn(res.wallet?.best_return ?? null);
            }
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [isLoggedIn, status]);

    const start = useCallback(async () => {
        setBusy(true);
        try {
            if (isLoggedIn) {
                const res = await startReplayRound();
                if (!res.success) { addToast("error", res.error); return; }
                setRound(res.round);
            } else {
                if (!localPool.length) { addToast("error", "종목 목록을 아직 불러오는 중입니다."); return; }
                const built = await buildLocalRound(localPool);
                if (!built) { addToast("error", "판을 만들지 못했습니다. 다시 시도해주세요."); return; }
                setRound(built);
            }
            setQty(10);
        } finally {
            setBusy(false);
        }
    }, [isLoggedIn, localPool, addToast]);

    const advance = useCallback(async (trade?: { side: "buy" | "sell"; qty: number } | null) => {
        if (!round || round.status !== "playing") return;
        setBusy(true);
        try {
            if (isLoggedIn) {
                const res = await advanceReplayRound(round.id, trade);
                if (!res.success) { addToast("error", res.error); return; }
                setRound(res.round);
                if (res.done) {
                    const st = await getReplayState();
                    if (st.success) {
                        setHistory(st.history ?? []);
                        setCoins(st.wallet?.coins ?? 0);
                        setBestReturn(st.wallet?.best_return ?? null);
                    }
                }
            } else {
                const res = advanceLocal(round, trade);
                if (!res.ok) { addToast("error", res.error); return; }
                setRound(res.round);
            }
        } finally {
            setBusy(false);
        }
    }, [round, isLoggedIn, addToast]);

    const giveUp = useCallback(async () => {
        if (!round || round.status !== "playing") return;
        setBusy(true);
        try {
            if (isLoggedIn) {
                const res = await giveUpReplayRound(round.id);
                if (!res.success) { addToast("error", res.error); return; }
                setRound(res.round);
                const st = await getReplayState();
                if (st.success) { setHistory(st.history ?? []); setCoins(st.wallet?.coins ?? 0); setBestReturn(st.wallet?.best_return ?? null); }
            } else {
                setRound(giveUpLocal(round));
            }
        } finally {
            setBusy(false);
        }
    }, [round, isLoggedIn, addToast]);

    const reset = useCallback(() => {
        if (!isLoggedIn) saveLocal(null);
        setRound(null);
    }, [isLoggedIn]);

    // ── 화면에 그릴 값 ───────────────────────────────────────
    // 로컬 라운드는 캔들을 전부 들고 있으므로 여기서 cursor 까지만 잘라야 미래가 안 보인다.
    const visible = useMemo(
        () => (round ? round.candles.slice(0, round.status === "done" ? round.candles.length : round.cursor) : []),
        [round],
    );
    const today = visible[visible.length - 1];
    const price = today?.c ?? 0;
    const marketValue = price * (round?.qty ?? 0);
    const totalAssets = (round?.cash ?? 0) + marketValue;
    const totalPnl = totalAssets - (round?.seed ?? 0);
    const totalRate = round?.seed ? (totalPnl / round.seed) * 100 : 0;
    const avg = round ? avgPrice({ qty: round.qty, cost_basis: round.cost_basis }) : 0;

    // cash / price 만으로는 수수료가 빠진다 — 현금이 가격으로 딱 나누어떨어지면
    // 최대매수를 누르고 사기를 눌렀을 때 "현금이 부족합니다"로 거절당한다.
    // 실제 견적(quoteBuy)으로 확인해 들어가는 수량까지 줄인다. 한두 번이면 끝난다.
    const maxBuy = useMemo(() => {
        const cash = round?.cash ?? 0;
        if (price <= 0) return 0;
        let n = Math.floor(cash / price);
        while (n > 0 && !quoteBuy({ price, qty: n, cash }).ok) n--;
        return n;
    }, [price, round?.cash]);

    // 사고판 지점을 차트에 찍는다. 빨강이 매수, 초록이 매도 — 버튼 색과 같다.
    // 수량 라벨은 체결이 적을 때만 붙인다. 많아지면 서로 겹쳐 오히려 안 읽힌다.
    const markers = useMemo(() => {
        const orders = round?.orders ?? [];
        const withLabel = orders.length <= 8;
        return orders
            .filter(o => o.day_index < visible.length)
            .map(o => ({
                x: visible[o.day_index].d.slice(4),
                y: o.price,
                color: o.side === "buy" ? "#ef4444" : "#16a34a",
                label: withLabel ? `${o.side === "buy" ? "+" : "−"}${o.qty}` : undefined,
                labelPosition: o.side === "buy" ? "bottom" : "top",
            }));
    }, [round, visible]);

    // 계좌 4칸. 모바일 압축 줄과 데스크톱 카드가 같은 값을 쓰도록 한 곳에서 만든다.
    const stats = round ? [
        {
            label: "총 자산", value: fmtKrw(totalAssets), sub: `시드 ${fmtKrw(round.seed)}`,
            icon: <Wallet size={15} />, iconBg: "bg-neutral-100 dark:bg-[#2c2a26] text-neutral-500",
        },
        {
            label: "예수금", value: fmtKrw(round.cash), sub: round.qty > 0 ? `보유 ${round.qty}주` : "보유 없음",
            icon: <Coins size={15} />, iconBg: "bg-neutral-100 dark:bg-[#2c2a26] text-neutral-500",
        },
        {
            label: round.status === "done" ? "마지막 가격" : "현재가", value: fmtKrw(price),
            sub: round.qty > 0 ? `평단 ${fmtKrw(avg)}` : round.status === "done" ? "청산 완료" : "아직 안 삼",
            icon: <Eye size={15} />, iconBg: "bg-neutral-100 dark:bg-[#2c2a26] text-neutral-500",
        },
        {
            label: "수익률", value: pct(totalRate), sub: `실현 ${fmtKrw(round.realized)}`,
            icon: <PnlIcon positive={totalPnl >= 0} />, iconBg: pnlIconBg(totalPnl >= 0),
            valueColor: pnlValueColor(totalPnl >= 0), accentColor: pnlAccentColor(totalPnl >= 0),
        },
    ] : [];

    if (loading) {
        return <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1917] flex items-center justify-center text-sm text-neutral-400">불러오는 중…</div>;
    }

    return (
        // min-h-screen 을 그대로 쓰면 main 의 pt-48 + pb-64 가 더해져 내용과 무관하게 112px 이
        // 항상 스크롤된다. 모바일에서는 크롬을 뺀 높이를 바닥으로 삼는다.
        <div className={cn("bg-[#faf9f7] dark:bg-[#1a1917]", round ? "md:min-h-screen" : "min-h-[calc(100dvh-112px)] md:min-h-screen")}>
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            <div className={cn(
                "max-w-4xl mx-auto px-4 sm:px-5 flex flex-col",
                // 판이 열려 있는 동안은 모바일에서 스크롤 없이 한 화면에 담는다 — 차트를 보고
                // 버튼을 누르는 게 매일 반복되는 동작이라, 그 둘이 같은 화면에 있어야 한다.
                // layout.tsx 의 main 이 상단 헤더 48 + 하단 탭 64 를 이미 비워 두므로 그만큼 뺀다.
                // 100dvh 라야 모바일 브라우저 주소창이 접혔다 펴져도 어긋나지 않는다.
                // overflow-y-auto 는 안전장치다. 아주 작은 화면에서 고정 부분만으로도 자리가
                // 모자라면 잘리는 대신 스크롤된다 — 버튼이 화면 밖으로 사라지면 판을 못 이어간다.
                round
                    ? "h-[calc(100dvh-112px)] md:h-auto overflow-y-auto md:overflow-visible py-3 sm:py-6 md:py-10 gap-3 sm:gap-4 md:pb-24"
                    : "py-6 sm:py-10 pb-10 md:pb-24 gap-5",
            )}>

                {!round && <StartScreen onStart={start} busy={busy} isLoggedIn={isLoggedIn} coins={coins} bestReturn={bestReturn} history={history} />}

                {round && (
                    <>
                        {/* 모바일에서는 한 줄. 큰 제목은 넓은 화면에서만 — 매일 다시 읽을 문장은 아니다. */}
                        <header className="flex items-center justify-between gap-3 shrink-0">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a1730a] dark:text-[#e3b34a] sm:mb-1.5">
                                    {round.status === "done" ? "Result" : `Day ${round.cursor - CONTEXT_DAYS + 1} / ${TOTAL_DAYS - CONTEXT_DAYS + 1}`}
                                </p>
                                <h1 className="hidden sm:block text-xl sm:text-2xl font-black text-neutral-900 dark:text-white break-keep">
                                    {round.status === "done" ? "한 판 끝" : "이 회사, 지금 사시겠습니까?"}
                                </h1>
                                <p className="sm:hidden text-[15px] font-black text-neutral-900 dark:text-white leading-tight">
                                    {round.status === "done" ? "한 판 끝" : "사시겠습니까?"}
                                </p>
                            </div>
                            {round.status === "playing" ? (
                                <button onClick={giveUp} disabled={busy}
                                    className="shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl text-xs font-bold text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26] disabled:opacity-40 transition-colors">
                                    <Flag size={14} /> 그만
                                </button>
                            ) : (
                                <button onClick={reset}
                                    className="shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl text-xs font-black text-white bg-[#0d2a1a] dark:bg-[#e3b34a] dark:text-[#2a1c00] hover:opacity-90 transition-opacity">
                                    <RotateCcw size={14} /> 한 판 더
                                </button>
                            )}
                        </header>

                        {round.status === "done" && <ResultBanner round={round} />}

                        {/* ── 차트 ──────────────────────────
                            남는 세로 공간을 전부 차트가 가져간다. 화면이 작으면 차트만 줄고
                            계좌·버튼은 그대로 남는다 — 판을 이어가는 데 필요한 건 그쪽이다. */}
                        {/* min-h-0 을 주면 안 된다 — flex 가 패널을 내용보다 작게 줄여 차트가 패널을
                            뚫고 나온다(320px 에서 계좌 카드 위에 겹쳐 그려졌다). 기본값 min-height:auto
                            라야 내용 높이가 바닥이 되고, 자리가 정말 모자라면 바깥이 스크롤된다. */}
                        <SectionPanel className="flex-1 flex flex-col p-3 sm:p-5">
                            <div className="sm:hidden flex items-baseline justify-between gap-2 mb-1.5 shrink-0">
                                <h2 className="text-[13px] font-black text-neutral-900 dark:text-neutral-100 shrink-0">
                                    {round.status === "done" ? (round.name ?? "차트") : "블라인드 차트"}
                                </h2>
                                <p className="text-[10px] text-neutral-400 truncate">
                                    {round.status === "done"
                                        ? `${round.ticker} · ${fmtDate(round.start_date)}~${fmtDate(round.end_date)}`
                                        : "종목·시기는 끝나야 열립니다"}
                                </p>
                            </div>
                            <div className="hidden sm:block">
                                <SectionHeader
                                    icon={<TrendingUp size={16} />}
                                    title={round.status === "done" ? (round.name ?? "차트") : "블라인드 차트"}
                                    subtitle={round.status === "done"
                                        ? `${round.ticker} · ${fmtDate(round.start_date)} ~ ${fmtDate(round.end_date)}`
                                        : "종목명과 시기는 끝나야 열립니다"}
                                />
                            </div>
                            {/* recharts 의 ResponsiveContainer 는 부모 높이가 flex 로 정해지면 한 번 잰
                                크기를 붙들고 있어 칸이 줄어도 그대로 그린다 — 320px 에서 차트가 패널을
                                뚫고 나와 계좌 카드 위에 겹쳐 그려졌다. absolute inset-0 으로 실제 픽셀
                                상자를 주면 줄어드는 쪽도 따라온다. */}
                            <div className="relative flex-1 min-h-[120px] sm:min-h-[260px] overflow-hidden">
                                <div className="absolute inset-0">
                                    <LineChart
                                        height="100%"
                                        markers={markers}
                                        legend_disable={round.qty < 1}
                                        category_array={visible.map(c => c.d.slice(4))}
                                        data_array={[
                                            { name: "종가", data: visible.map(c => c.c) },
                                            ...(round.qty > 0 ? [{ name: "내 평단", data: visible.map(() => Math.round(avg)), color: "#e3b34a" }] : []),
                                        ]}
                                    />
                                </div>
                            </div>
                        </SectionPanel>

                        {/* ── 계좌 ──────────────────────────
                            모바일은 눌러야 할 버튼에 자리를 내주려고 줄로 압축하고,
                            넓은 화면에서는 원래 카드를 그대로 쓴다. 값은 stats 한 곳에서 온다. */}
                        <div className="grid grid-cols-2 gap-2 sm:hidden shrink-0">
                            {stats.map(s => <MiniStat key={s.label} {...s} />)}
                        </div>
                        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {stats.map(s => <KpiCard key={s.label} {...s} />)}
                        </div>

                        {/* ── 조작 ────────────────────────── */}
                        {round.status === "playing" && (
                            <SectionPanel className="shrink-0 p-3 sm:p-5">
                                <div className="flex flex-col gap-2 sm:gap-4">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <span className="text-[10px] sm:text-xs font-black text-neutral-400 uppercase tracking-wider shrink-0">수량</span>
                                        <input
                                            type="number" min={1} value={qty} aria-label="주문 수량"
                                            onChange={e => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                                            className="w-16 sm:w-24 min-h-[40px] sm:min-h-[44px] px-2 sm:px-3 rounded-xl text-sm text-right font-mono bg-neutral-50 dark:bg-[#1a1917] border border-neutral-200 dark:border-[#35332e] text-neutral-900 dark:text-white"
                                        />
                                        <div className="flex gap-1 sm:gap-1.5 flex-1 justify-end">
                                            {[10, 50, 100].map(n => (
                                                <button key={n} onClick={() => setQty(n)}
                                                    className="min-h-[36px] px-2 sm:px-2.5 rounded-lg text-[11px] font-bold text-neutral-500 border border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26]">
                                                    {n}
                                                </button>
                                            ))}
                                            {/* 수량 칸 하나를 사기·팔기가 같이 쓰므로 "최대"도 한쪽만
                                                가리킬 수 없다. 현금 기준과 보유 기준을 따로 둔다. */}
                                            <button onClick={() => setQty(Math.max(1, maxBuy))} disabled={maxBuy < 1}
                                                className="min-h-[36px] px-1.5 sm:px-2.5 rounded-lg text-[10px] sm:text-[11px] font-bold whitespace-nowrap text-red-500/90 border border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26] disabled:opacity-40">
                                                최대매수
                                            </button>
                                            <button onClick={() => setQty(round.qty)} disabled={round.qty < 1}
                                                className="min-h-[36px] px-1.5 sm:px-2.5 rounded-lg text-[10px] sm:text-[11px] font-bold whitespace-nowrap text-[#16a34a] border border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26] disabled:opacity-40">
                                                전량매도
                                            </button>
                                        </div>
                                    </div>

                                    {/* 라벨을 짧게 — "사고 하루 넘기기"는 390px 3열에서 두 줄로 쪼개진다.
                                        어느 쪽을 눌러도 하루가 지나간다는 건 아래 한 줄로 말한다. */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <button onClick={() => advance({ side: "buy", qty })} disabled={busy || maxBuy < 1}
                                            className="min-h-[52px] rounded-xl text-[15px] font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                            사기
                                        </button>
                                        <button onClick={() => advance(null)} disabled={busy}
                                            className="min-h-[52px] rounded-xl text-[15px] font-black text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26] disabled:opacity-40 transition-colors">
                                            관망
                                        </button>
                                        <button onClick={() => advance({ side: "sell", qty })} disabled={busy || round.qty < 1}
                                            className="min-h-[52px] rounded-xl text-[15px] font-black text-[#16a34a] border border-[#16a34a]/40 hover:bg-[#f0fdf4] dark:hover:bg-[#052e16]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                            팔기
                                        </button>
                                    </div>

                                    {/* 모바일은 한 줄만. 수수료·자동청산 규칙은 시작 화면에 적어 뒀다. */}
                                    <p className="sm:hidden text-[10px] text-neutral-400 dark:text-neutral-500 text-center">
                                        어느 쪽을 눌러도 하루가 지나갑니다 · 그날 종가로 체결
                                    </p>
                                    <p className="hidden sm:block text-[11px] text-neutral-400 dark:text-neutral-500 break-keep leading-[1.7]">
                                        어느 쪽을 눌러도 하루가 지나갑니다. 그날 종가로 체결되고,
                                        수수료는 매수·매도 각 0.015%, 매도 시 증권거래세 0.18%입니다.
                                        마지막 날에는 남은 주식이 자동으로 정리됩니다.
                                    </p>
                                </div>
                            </SectionPanel>
                        )}

                        {round.status === "done" && !isLoggedIn && (
                            <div className="shrink-0 rounded-2xl border border-[#e3b34a]/40 bg-[#fdf6e9] dark:bg-[#1c1608] px-4 py-2.5 text-[12px] sm:text-[13px] text-[#8a6206] dark:text-[#e3b34a] break-keep">
                                <Link href="/login?callbackUrl=%2Fgame" className="underline font-bold">로그인</Link>
                                하면 기록과 코인이 쌓입니다.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
/** 모바일용 압축 지표 한 칸. 화면을 한 장으로 유지하려고 KpiCard 대신 쓴다. */
function MiniStat({ label, value, sub, valueColor }: { label: string; value: string; sub: string; valueColor?: string }) {
    return (
        <div className="rounded-xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] px-2.5 py-1.5">
            <p className="text-[9px] font-black uppercase tracking-wider text-neutral-400">{label}</p>
            <p className={cn("text-[14px] font-black font-mono leading-tight truncate", valueColor ?? "text-neutral-900 dark:text-white")}>{value}</p>
            <p className="text-[10px] text-neutral-400 truncate">{sub}</p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
function StartScreen({ onStart, busy, isLoggedIn, coins, bestReturn, history }: {
    onStart: () => void; busy: boolean; isLoggedIn: boolean;
    coins: number; bestReturn: number | null; history: ReplayHistoryItem[];
}) {
    return (
        <>
            <header>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a1730a] dark:text-[#e3b34a] mb-1.5">
                    Blind Replay
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white break-keep">
                    어느 회사인지 모른 채,<br />60일을 살아보기
                </h1>
                {/* 아래 규칙 목록과 같은 말이라, 화면이 좁으면 접는다 */}
                <p className="hidden sm:block text-[13px] sm:text-[15px] text-neutral-500 dark:text-neutral-400 mt-3 leading-[1.8] break-keep max-w-md">
                    종목명도 날짜도 가린 실제 과거 차트를 하루씩 넘기며 사고팝니다.
                    끝나면 성적과 정답을 함께 엽니다.
                </p>
            </header>

            <SectionPanel>
                <ul className="flex flex-col gap-3 text-[14px] text-neutral-600 dark:text-neutral-300">
                    {[
                        `가상 1,000만원으로 시작합니다.`,
                        `앞 ${CONTEXT_DAYS}일을 먼저 보고, 남은 ${TOTAL_DAYS - CONTEXT_DAYS}일을 하루씩 넘깁니다.`,
                        // 판이 도는 중에는 화면이 좁아 이 규칙을 적을 자리가 없다 — 여기서 한 번 말한다.
                        `체결은 그날 종가. 수수료 0.015%, 매도 거래세 0.18%. 마지막 날 자동 청산.`,
                        `그냥 사서 들고 있었을 때와 나란히 놓고 채점합니다.`,
                    ].map((line, i) => (
                        <li key={i} className="flex gap-3 break-keep">
                            <span className="font-mono text-[11px] font-black text-[#a1730a] dark:text-[#e3b34a] pt-1 shrink-0">
                                {String(i + 1).padStart(2, "0")}
                            </span>
                            <span>{line}</span>
                        </li>
                    ))}
                </ul>

                <button onClick={onStart} disabled={busy}
                    className="mt-6 w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-gradient-to-b from-[#f7dc8c] to-[#d9a52a] hover:from-[#ffe7a4] hover:to-[#e6b13a] text-[#2a1c00] font-black text-[15px] disabled:opacity-50 transition-all">
                    <Play size={16} strokeWidth={2.6} />
                    {busy ? "판을 만드는 중…" : "한 판 시작"}
                </button>
            </SectionPanel>

            {isLoggedIn && (
                <>
                    <div className="grid grid-cols-2 gap-2 sm:hidden">
                        <MiniStat label="코인" value={coins.toLocaleString()} sub="이길 때마다 쌓입니다" />
                        <MiniStat label="최고 수익률" value={bestReturn === null ? "—" : pct(bestReturn)} sub={`${history.length}판 완료`} />
                    </div>
                    <div className="hidden sm:grid grid-cols-2 gap-3 sm:gap-4">
                        <KpiCard label="코인" value={coins.toLocaleString()} sub="판을 이길 때마다 쌓입니다"
                            icon={<Coins size={15} />} iconBg="bg-neutral-100 dark:bg-[#2c2a26] text-neutral-500" />
                        <KpiCard label="최고 수익률" value={bestReturn === null ? "—" : pct(bestReturn)} sub={`${history.length}판 완료`}
                            icon={<TrendingUp size={15} />} iconBg="bg-neutral-100 dark:bg-[#2c2a26] text-neutral-500" />
                    </div>
                </>
            )}

            {history.length > 0 && (
                <SectionPanel>
                    <SectionHeader icon={<Flag size={16} />} title="지난 판" subtitle={`최근 ${history.length}판`} />
                    <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-[#2c2a26] text-sm">
                        {history.map(h => {
                            const win = (h.final_return ?? 0) >= 0;
                            const beat = (h.final_return ?? 0) > (h.bh_return ?? 0);
                            return (
                                <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                                    <div className="min-w-0">
                                        <div className="font-bold text-neutral-900 dark:text-white truncate">{h.name ?? h.ticker}</div>
                                        <div className="text-[11px] text-neutral-400 font-mono">{fmtDate(h.start_date)} ~ {fmtDate(h.end_date)}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className={cn("font-mono text-xs font-black", pnlValueColor(win))}>{pct(h.final_return ?? 0)}</div>
                                        <div className="text-[11px] text-neutral-400">
                                            그냥 보유 {pct(h.bh_return ?? 0)}{beat ? " · 이김" : ""}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </SectionPanel>
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────
function ResultBanner({ round }: { round: ReplayRound }) {
    const mine = round.final_return ?? 0;
    const bh = round.bh_return ?? 0;
    const beat = mine > bh;

    return (
        <SectionPanel className={cn("shrink-0 border-2 p-3 sm:p-5", beat ? "border-[#e3b34a]/60" : "border-neutral-200 dark:border-[#35332e]")}>
            <div className="flex flex-col gap-1.5 sm:gap-4">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 sm:mb-1">내 수익률</p>
                        <p className={cn("text-2xl sm:text-4xl font-black font-mono", pnlValueColor(mine >= 0))}>{pct(mine)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 sm:mb-1">그냥 사서 들고 있었다면</p>
                        <p className={cn("text-lg sm:text-xl font-black font-mono", pnlValueColor(bh >= 0))}>{pct(bh)}</p>
                    </div>
                </div>

                <p className="text-[12px] sm:text-[14px] font-bold break-keep text-neutral-700 dark:text-neutral-200">
                    {beat
                        ? `그냥 들고 있는 것보다 ${(mine - bh).toFixed(2)}%p 더 벌었습니다.`
                        : `그냥 들고 있었으면 ${(bh - mine).toFixed(2)}%p 더 벌었습니다.`}
                    {(round.coins_earned ?? 0) > 0 && (
                        <span className="text-[#a1730a] dark:text-[#e3b34a] inline-flex items-center gap-1 ml-2">
                            <Coins size={13} /> 코인 +{round.coins_earned}
                        </span>
                    )}
                </p>
            </div>
        </SectionPanel>
    );
}
