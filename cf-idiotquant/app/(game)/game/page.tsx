"use client";

// 내 운용사 — 블라인드 차트 리플레이를 "분기 운용" 으로 감싼 게임.
//
// 한 판은 언제나 시드 1,000만원이라 실력만 잰다. 그 성적을 보고 고객이 돈을 맡기거나
// 빼가고(AUM), 회사는 맡은 돈에서 보수를 받아 리서치 도구를 산다. 규칙은 lib/paper/firm.ts.
//
// 판 자체는 그대로다 — 어느 종목인지, 언제인지 모르는 60 거래일을 하루씩 넘기며 사고판다.
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
// 아이콘은 뜻이 겹치지 않게 고른다. 예전에는 Flag 가 "그만"과 "지난 분기" 두 곳에 쓰여
// 같은 그림이 전혀 다른 일을 가리켰다.
import {
    Play, TrendingUp, Coins, Wallet, Tag, ArrowRight, X, EyeOff,
    FlaskConical, History, Footprints, Lock, Check, ChevronDown,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { reqGetNcavDailyList, selectNcavDailyList } from "@/lib/features/algorithmTrade/algorithmTradeSlice";

import { avgPrice, quoteBuy, quoteSell, applyBuy, applySell } from "@/lib/paper/engine";
import { CONTEXT_DAYS, TOTAL_DAYS, type ReplayRound, type ReplayHistoryItem, type RoundHabits, type HabitSummary, type Reservation, type Campaign } from "@/lib/paper/round";
import { buildLocalRound, loadLocal, saveLocal, advanceLocal, giveUpLocal } from "@/lib/paper/localRound";
import { getReplayState, startCampaign, startReplayRound, advanceReplayRound, giveUpReplayRound, buyTool, reserveOrder, cancelReserve } from "@/lib/features/paper/replayAPI";
import {
    TOOLS, INITIAL_AUM, MIN_AUM, rankOf, fmtMoney, flowRate, type Firm,
    FLOW_MIN, FLOW_MAX, FLOW_EXCESS_MULT, FLOW_LOSS_MULT, BASE_FEE_BP, PERF_FEE_PCT,
} from "@/lib/paper/firm";
import { movingAverage, bollinger, donchian, atrBand } from "@/lib/paper/indicators";
import { YEAR_CHOICES, halfOf, totalHalves } from "@/lib/paper/campaign";
import SectorSprite, { sectorAccent } from "@/app/(screener)/screener/components/SectorSprite";

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

// 판의 성격. id 는 워커 src/lib/scenario.js 와 같아야 한다 — 규칙은 서버에만 있고
// 여기는 이름만 안다(습관과 같은 방식이다).
const SCENARIOS: { id: string; label: string; hint: string }[] = [
    { id: "plunge", label: "급락 뒤", hint: "고점에서 크게 빠진 자리" },
    { id: "range", label: "지루한 횡보", hint: "위아래로 별로 안 움직인 구간" },
    { id: "peak", label: "고점 근처", hint: "최근 고점 가까이 붙어 있는 자리" },
];
const scenarioLabel = (id?: string | null) =>
    id === "mixed" ? "보통" : (SCENARIOS.find(s => s.id === id)?.label ?? null);

// 예약 종류. id 와 이름은 워커 src/lib/reservations.js 의 RESERVE_KINDS·RESERVE_LABEL 과 같아야 한다.
const RESERVE_KINDS: { id: Reservation["kind"]; label: string; hint: string }[] = [
    { id: "buy_limit", label: "지정가 매수", hint: "이 값까지 내려오면 산다" },
    { id: "stop_loss", label: "손절", hint: "이 값까지 내려오면 판다" },
    { id: "take_profit", label: "익절", hint: "이 값을 넘으면 판다" },
];
const reserveLabel = (k: string) => RESERVE_KINDS.find(r => r.id === k)?.label ?? k;

// 살 때는 현금의 몇 %, 팔 때는 보유의 몇 %. 주식 수를 손으로 적는 것보다 이쪽이
// 실제로 하는 생각("반은 실어 보자")에 가깝고, 폰에서 한 손으로 굴러간다.
const BUY_PARTS = [
    { pct: 10, label: "10%" },
    { pct: 25, label: "25%" },
    { pct: 50, label: "50%" },
    { pct: 100, label: "최대" },
];
const SELL_PARTS = [
    { pct: 25, label: "25%" },
    { pct: 50, label: "50%" },
    { pct: 100, label: "전부" },
];
// 예약 가격도 값을 적는 대신 지금 값에서 얼마나 떨어진 자리인지로 고른다.
const RESERVE_STEPS = { down: [3, 5, 10], up: [5, 10, 20] };

// 여러 날 건너뛰기를 멈추는 문턱. 이만큼 움직인 날은 지나치면 손쓸 수 없다.
const JUMP_STOP_PCT = 7;
const SKIP_STEPS = [3, 5];

// 도구가 그리는 선 색. 차트와 on/off 칩이 같은 색을 써야 어느 칩이 어느 선인지 안다.
const TOOL_COLOR: Record<string, string> = {
    ma: "#f59e0b", dc: "#0d9488", bb: "#94a3b8", atr: "#d946ef",
};

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
    const [firm, setFirm] = useState<Firm | null>(null);
    // 굴러가는 캠페인. null 이면 아직 기간을 안 골랐다(또는 방금 끝났다).
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    // 방금 기간이 끝난 캠페인 — 최종 리포트를 띄울 때까지 들고 있는다.
    const [endedCampaign, setEndedCampaign] = useState<Campaign | null>(null);
    const [habits, setHabits] = useState<HabitSummary | null>(null);
    const [bestReturn, setBestReturn] = useState<number | null>(null);
    // 산 도구 중 지금 켜 둔 것. 사자마자 켜진다.
    const [activeTools, setActiveTools] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    // 예약 패널 — 접었다 편다. 모바일은 한 화면이 빡빡해 기본은 접어 둔다.
    const [reserveOpen, setReserveOpen] = useState(false);
    const [resKind, setResKind] = useState<Reservation["kind"]>("buy_limit");
    // 값 대신 "지금 값에서 몇 % 떨어진 자리"와 "얼마만큼"으로 고른다.
    const [resStep, setResStep] = useState(5);
    const [resPart, setResPart] = useState(50);

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
                setFirm(res.firm ?? null);
                setHabits(res.habits ?? null);
                setBestReturn(res.wallet?.best_return ?? null);
                setActiveTools(res.firm?.tools ?? []);
                setCampaign(res.campaign ?? null);
            }
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [isLoggedIn, status]);

    /** 기간을 골라 캠페인을 연다. 이 뒤에야 반기를 시작할 수 있다. */
    const openCampaign = useCallback(async (years: number) => {
        setBusy(true);
        try {
            const res = await startCampaign(years);
            if (!res.success) { addToast("error", res.error); return; }
            setCampaign(res.campaign ?? null);
            setEndedCampaign(null);
            addToast("success", `${years}년을 굴립니다. ${years}년 전으로 돌아갑니다.`);
        } finally {
            setBusy(false);
        }
    }, [addToast]);

    const start = useCallback(async (scenario?: string | null) => {
        setBusy(true);
        try {
            if (isLoggedIn) {
                const res = await startReplayRound(scenario);
                if (!res.success) { addToast("error", res.error); return; }
                setRound(res.round);
            } else {
                if (!localPool.length) { addToast("error", "종목 목록을 아직 불러오는 중입니다."); return; }
                const built = await buildLocalRound(localPool);
                if (!built) { addToast("error", "판을 만들지 못했습니다. 다시 시도해주세요."); return; }
                setRound(built);
            }
        } finally {
            setBusy(false);
        }
    }, [isLoggedIn, localPool, addToast]);

    // 어느 판에서 출발하는지 인자로 받는다 — 여러 날 건너뛰기가 앞선 응답을 이어받아야 해서,
    // 클로저에 잡힌 옛 round 로는 비로그인 경로(advanceLocal)가 같은 날을 반복한다.
    const advanceFrom = useCallback(async (
        from: ReplayRound, trade?: { side: "buy" | "sell"; qty: number } | null, carry?: boolean,
    ): Promise<ReplayRound | null> => {
        if (from.status !== "playing") return null;
        setBusy(true);
        try {
            if (isLoggedIn) {
                const res = await advanceReplayRound(from.id, trade, carry);
                if (!res.success) { addToast("error", res.error); return null; }
                setRound(res.round);
                if (res.done) {
                    const st = await getReplayState();
                    if (st.success) {
                        setHistory(st.history ?? []);
                        setFirm(st.firm ?? null);
                        setHabits(st.habits ?? null);
                        setBestReturn(st.wallet?.best_return ?? null);
                        // 마지막 반기였으면 굴러가는 캠페인이 없다 — 그때는 기간이 끝난 것이다.
                        if (campaign && !st.campaign) setEndedCampaign(campaign);
                        setCampaign(st.campaign ?? null);
                    }
                }
                return res.round;
            }
            const res = advanceLocal(from, trade);
            if (!res.ok) { addToast("error", res.error); return null; }
            setRound(res.round);
            return res.round;
        } finally {
            setBusy(false);
        }
    }, [isLoggedIn, addToast, campaign]);

    const advance = useCallback(async (trade?: { side: "buy" | "sell"; qty: number } | null, carry?: boolean) => {
        if (!round) return;
        await advanceFrom(round, trade, carry);
    }, [round, advanceFrom]);

    // 여러 날 한 번에 넘기기. 아무 일도 없는 날의 클릭을 없애되, 큰 폭으로 움직인 날에는
    // 반드시 세운다 — 지나치고 나면 손쓸 수 없는 게 그런 날이다.
    const skipDays = useCallback(async (n: number) => {
        if (!round || round.status !== "playing") return;
        let cur: ReplayRound | null = round;
        for (let i = 0; i < n && cur; i++) {
            const before = cur.candles[cur.cursor - 1]?.c ?? 0;
            const next: ReplayRound | null = await advanceFrom(cur, null);
            if (!next) break;
            cur = next;
            if (next.status !== "playing") break;
            const after = next.candles[next.cursor - 1]?.c ?? 0;
            const move = before > 0 ? ((after - before) / before) * 100 : 0;
            if (Math.abs(move) >= JUMP_STOP_PCT) {
                addToast("info", `하루에 ${move >= 0 ? "+" : ""}${move.toFixed(1)}% 움직여 여기서 멈췄습니다.`);
                break;
            }
        }
    }, [round, advanceFrom, addToast]);

    const giveUp = useCallback(async () => {
        if (!round || round.status !== "playing") return;
        setBusy(true);
        try {
            if (isLoggedIn) {
                const res = await giveUpReplayRound(round.id);
                if (!res.success) { addToast("error", res.error); return; }
                setRound(res.round);
                const st = await getReplayState();
                if (st.success) {
                    setHistory(st.history ?? []); setFirm(st.firm ?? null);
                    setHabits(st.habits ?? null); setBestReturn(st.wallet?.best_return ?? null);
                    if (campaign && !st.campaign) setEndedCampaign(campaign);
                    setCampaign(st.campaign ?? null);
                }
            } else {
                setRound(giveUpLocal(round));
            }
        } finally {
            setBusy(false);
        }
    }, [round, isLoggedIn, addToast, campaign]);

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

    // 판 길이와 컨텍스트 길이는 판마다 다르다 — 반기 창을 달력으로 자르면 그 안의 거래일
    // 수가 공휴일·연휴에 따라 달라진다. 서버가 준 값을 쓰고, 없으면(비로그인 로컬 판)
    // 예전 상수로 읽는다.
    const ctxDays = round?.context_days ?? CONTEXT_DAYS;
    const totalDays = round?.total_days ?? TOTAL_DAYS;
    // "2-1반기" — 캠페인이 없던 시절 판이나 비로그인 판은 그냥 "이번 판".
    const halfTitle = round?.half_index != null
        ? `${halfOf(round.half_index).year}년차 ${halfOf(round.half_index).label}반기`
        : "이번 판";

    // ── 벤치마크 ─────────────────────────────────────────────
    // 분기 정산의 성과보수는 "그냥 사서 들고 있었을 때"와의 차이로 매긴다(firm.ts 의 settleQuarter).
    // 그 잣대를 끝나고서야 보여 줄 이유가 없다 — 40일 내내 "잘하고 있나"에 답이 없던 자리다.
    //
    // 재는 시작점은 캔들 0번이 아니라 거래를 시작하는 날(컨텍스트 마지막 날)이다.
    // 워커의 _finish 가 candles.slice(CONTEXT_DAYS - 1) 로 재므로, 여기서 0번부터 재면
    // 화면의 숫자와 정산이 다른 잣대를 쓰게 된다.
    const benchBase = round?.candles?.[ctxDays - 1]?.c ?? 0;
    const bhRate = benchBase > 0 && price > 0 ? ((price - benchBase) / benchBase) * 100 : 0;
    const edge = totalRate - bhRate;                                   // %p. 양수면 그냥 들고 있는 것보다 낫다
    const tradedDays = round ? Math.max(0, round.cursor - ctxDays) : 0;
    // 마지막 날에 보유가 남아 있으면 다음 분기로 넘길 수 있다. 회사가 있어야 이어진다.
    const canCarry = !!round && isLoggedIn && round.status === "playing"
        && round.cursor >= totalDays && round.qty > 0;
    // 첫 며칠은 차이가 크게 요동쳐 읽을 값이 못 된다. 닷새 지나고부터 말한다.
    const benchNote = round && round.status === "playing" && tradedDays >= 5 && benchBase > 0
        ? `그냥 들고 ${pct(bhRate)} · 나 ${pct(totalRate)} (${edge >= 0 ? "+" : ""}${edge.toFixed(1)}%p)`
        : null;

    // 현금의 pct% 로 살 수 있는 주식 수. 수수료까지 넣어 실제로 통과하는 수량까지 줄인다.
    const buyQtyFor = useCallback((pct: number, atPrice = price) => {
        const cash = Math.floor((round?.cash ?? 0) * pct / 100);
        if (atPrice <= 0 || cash <= 0) return 0;
        let n = Math.floor(cash / atPrice);
        while (n > 0 && !quoteBuy({ price: atPrice, qty: n, cash }).ok) n--;
        return n;
    }, [round?.cash, price]);

    /** 보유의 pct%. 100% 는 남김없이 — 1주라도 남으면 "전부"가 거짓말이 된다. */
    const sellQtyFor = useCallback((pct: number) => {
        const held = round?.qty ?? 0;
        if (held <= 0) return 0;
        return pct >= 100 ? held : Math.max(1, Math.min(held, Math.floor(held * pct / 100)));
    }, [round?.qty]);

    // 예약 가격 — 익절은 위로, 나머지는 아래로.
    const resPriceAt = useCallback((step: number) =>
        Math.max(1, Math.round(price * (resKind === "take_profit" ? 1 + step / 100 : 1 - step / 100))),
        [price, resKind]);
    // 예약 수량 — 사는 예약은 그 가격 기준 현금 비율, 파는 예약은 보유 비율.
    const resQtyFor = useCallback((part: number) =>
        resKind === "buy_limit" ? buyQtyFor(part, resPriceAt(resStep)) : sellQtyFor(part),
        [resKind, resStep, buyQtyFor, sellQtyFor, resPriceAt]);

    const reserve = useCallback(async () => {
        if (!round) return;
        setBusy(true);
        try {
            const p = resPriceAt(resStep), n = resQtyFor(resPart);
            const res = await reserveOrder(round.id, { kind: resKind, price: p, qty: n });
            if (!res.success) { addToast("error", res.error); return; }
            setRound(res.round);
            addToast("success", `${reserveLabel(resKind)} ${p.toLocaleString()}원 ${n}주를 걸어 뒀습니다.`);
        } finally {
            setBusy(false);
        }
    }, [round, resKind, resStep, resPart, resPriceAt, resQtyFor, addToast]);

    const unreserve = useCallback(async (index: number) => {
        if (!round) return;
        setBusy(true);
        try {
            const res = await cancelReserve(round.id, index);
            if (!res.success) { addToast("error", res.error); return; }
            setRound(res.round);
        } finally {
            setBusy(false);
        }
    }, [round, addToast]);

    const purchase = useCallback(async (toolId: string) => {
        setBusy(true);
        try {
            const res = await buyTool(toolId);
            if (!res.success) { addToast("error", res.error); return; }
            setFirm(res.firm ?? null);
            setActiveTools(res.firm?.tools ?? []);   // 사면 바로 켠다
            addToast("success", "도구를 들였습니다. 차트 위 이름을 눌러 판이 도는 중에도 껐다 켤 수 있습니다.");
        } finally {
            setBusy(false);
        }
    }, [addToast]);

    const toggleTool = useCallback((id: string) => {
        setActiveTools(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    }, []);

    // 차트 위에 얹는 범례. 늘 그려지는 선만 넣는다 — 도구가 그리는 선은 바로 위 칩이
    // 이름과 색을 같이 보여 준다. 여기에 다 넣으면 여덟 줄이 되어 그림을 덮는다.
    const legendItems = useMemo(() => {
        const out = [{ name: "종가", color: "#3b82f6" }, { name: "하루 폭", color: "#c5bfb2" }];
        if ((round?.qty ?? 0) > 0) out.push({ name: "내 평단", color: "#e3b34a" });
        if (benchBase > 0) out.push({ name: "내 성과", color: "#0ea5e9" });
        return out;
    }, [round?.qty, benchBase]);

    // 산 도구. 판 화면의 on/off 칩과 대시보드 리서치실이 같은 목록을 쓴다.
    const ownedTools = useMemo(
        () => TOOLS.filter(t => (firm?.tools ?? []).includes(t.id)),
        [firm?.tools],
    );

    // 해금하고 켜 둔 리서치 도구를 가격 위에 겹쳐 그린다.
    // 별도 영역을 만들지 않는 이유는 모바일에서 차트 높이를 더 쓸 수 없기 때문이다.
    const overlays = useMemo(() => {
        const owned = firm?.tools ?? [];
        const on = (id: string) => owned.includes(id) && activeTools.includes(id);
        const closes = visible.map(c => c.c);
        const out: { name: string; data: (number | null)[]; color: string; dash?: string; legend?: boolean }[] = [];

        if (on("ma")) {
            out.push({ name: "5일선", data: movingAverage(closes, 5), color: TOOL_COLOR.ma });
            out.push({ name: "20일선", data: movingAverage(closes, 20), color: "#8b5cf6" });
        }
        if (on("dc")) {
            const d = donchian(visible.map(c => c.h || c.c), visible.map(c => c.l || c.c), 20);
            out.push({ name: "20일 최고", data: d.upper, color: TOOL_COLOR.dc });
            out.push({ name: "20일 최저", data: d.lower, color: TOOL_COLOR.dc });
        }
        if (on("bb")) {
            const b = bollinger(closes, 20, 2);
            out.push({ name: "밴드상단", data: b.upper, color: TOOL_COLOR.bb, dash: "3 3" });
            out.push({ name: "밴드하단", data: b.lower, color: TOOL_COLOR.bb, dash: "3 3" });
        }
        if (on("atr")) {
            const a = atrBand(visible.map(c => ({ o: c.o || c.c, h: c.h || c.c, l: c.l || c.c, c: c.c })), 14);
            out.push({ name: "변동폭 위", data: a.upper, color: TOOL_COLOR.atr, dash: "2 4" });
            out.push({ name: "변동폭 아래", data: a.lower, color: TOOL_COLOR.atr, dash: "2 4" });
        }

        // 하루가 얼마나 흔들렸는지. 같은 종가라도 하루 안에서 15% 오갔던 날과 조용한 날은
        // 완전히 다른 날인데, 종가 선 하나로는 둘이 똑같아 보인다. 고가·저가는 이미 캔들에 있다.
        out.push({ name: "고가", data: visible.map(c => c.h || null), color: "#c5bfb2" });
        out.push({ name: "저가", data: visible.map(c => c.l || null), color: "#c5bfb2" });

        // 내 자산 곡선. 가격선이 곧 "그냥 사서 들고 있었을 때"라 비교 상대는 이미 화면에 있고,
        // 없던 건 내 쪽이었다. 같은 축에 얹으려고 시드를 거래 시작가로 환산한다 —
        // 두 선이 같은 점에서 출발하므로 벌어진 만큼이 그대로 초과 성과다.
        //
        // 값은 체결 기록으로 되짚는다. 진행 중 응답에는 지난 날의 잔고가 없고, 수수료를 빼면
        // 곡선이 실제 계좌와 어긋난다. 규칙 사본을 새로 만들지 않으려고 engine 의 견적을 그대로 쓴다.
        if (round && benchBase > 0) {
            // orders 가 없는 응답(예전 워커·부분 응답)에도 화면이 살아 있어야 한다.
            // 마커 쪽이 이미 같은 이유로 ?? [] 를 쓰고 있다.
            const byDay = new Map<number, typeof round.orders>();
            for (const o of round.orders ?? []) {
                const a = byDay.get(o.day_index);
                if (a) a.push(o); else byDay.set(o.day_index, [o]);
            }
            let cash = round.seed;
            let pos = { ticker: "", name: null as string | null, qty: 0, cost_basis: 0 };
            const mine: (number | null)[] = [];
            visible.forEach((c, i) => {
                for (const o of byDay.get(i) ?? []) {
                    if (o.side === "buy") {
                        const q = quoteBuy({ price: o.price, qty: o.qty, cash });
                        if (q.ok) { cash -= q.total; pos = { ...pos, ...applyBuy(pos, q) }; }
                    } else {
                        const q = quoteSell({ price: o.price, qty: o.qty, position: pos });
                        if (q.ok) { cash += q.net; pos = { ...pos, ...applySell(pos, q) }; }
                    }
                }
                // 거래 시작 전에는 비교할 것이 없어 비워 둔다
                mine.push(i >= ctxDays - 1 ? Math.round((cash + pos.qty * c.c) / round.seed * benchBase) : null);
            });
            out.unshift({ name: "내 성과", data: mine, color: "#0ea5e9", legend: true });
        }
        return out;
    }, [firm?.tools, activeTools, visible, round, benchBase]);

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
            label: "내 돈", value: fmtKrw(totalAssets), sub: `시작 ${fmtKrw(round.seed)}`,
            icon: <Wallet size={15} />, iconBg: "bg-neutral-100 dark:bg-[#2c2a26] text-neutral-500",
        },
        {
            label: "현금", value: fmtKrw(round.cash), sub: round.qty > 0 ? `${round.qty}주 갖고 있음` : "아직 없음",
            icon: <Coins size={15} />, iconBg: "bg-neutral-100 dark:bg-[#2c2a26] text-neutral-500",
        },
        {
            label: round.status === "done" ? "마지막 가격" : "현재가", value: fmtKrw(price),
            sub: round.qty > 0 ? `산 값 ${fmtKrw(avg)}` : round.status === "done" ? "정리됨" : "아직 안 삼",
            icon: <Tag size={15} />, iconBg: "bg-neutral-100 dark:bg-[#2c2a26] text-neutral-500",
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
                // 판이 열려 있는 동안은 넓이와 상관없이 한 화면에 담는다 — 차트를 보고 버튼을
                // 누르는 게 매일 반복되는 동작이라, 그 둘이 같은 화면에 있어야 한다.
                // 모바일은 layout.tsx 의 main 이 상단 헤더 48 + 하단 탭 64 를 이미 비워 두므로
                // 그만큼 빼고, md 부터는 그 크롬이 없어 화면 높이를 그대로 쓴다.
                // 100dvh 라야 모바일 브라우저 주소창이 접혔다 펴져도 어긋나지 않는다.
                // 위아래 여백은 판이 도는 동안만 얇게 — 남는 자리는 차트가 가져간다.
                // overflow-y-auto 는 안전장치다. 아주 작은 화면에서 고정 부분만으로도 자리가
                // 모자라면 잘리는 대신 스크롤된다 — 버튼이 화면 밖으로 사라지면 판을 못 이어간다.
                round
                    ? "h-[calc(100dvh-112px)] md:h-[100dvh] overflow-y-auto py-2 sm:py-4 gap-2 sm:gap-4"
                    // 시작 화면도 폰에서는 붙여 놓는다 — 아래 탭 바 64px 이 이미 비어 있어
                    // pb-10 까지 주면 빈 자리만 늘어난다.
                    : "py-4 sm:py-10 pb-4 md:pb-24 gap-3 sm:gap-5",
            )}>

                {!round && (
                    <FirmDashboard
                        onStart={start} busy={busy} isLoggedIn={isLoggedIn}
                        firm={firm} bestReturn={bestReturn} history={history} habits={habits}
                        onBuy={purchase} activeTools={activeTools} onToggle={toggleTool}
                        campaign={campaign} endedCampaign={endedCampaign}
                        onOpenCampaign={openCampaign} onClearEnded={() => setEndedCampaign(null)}
                    />
                )}

                {round && (
                    <>
                        {/* 폰에서는 이 줄을 아예 두지 않는다 — 날짜와 그만 버튼은 차트 제목 줄로
                            옮겼고, 그렇게 비운 48px 이 전부 차트로 간다. */}
                        <header className="hidden sm:flex items-center justify-between gap-3 shrink-0">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a1730a] dark:text-[#e3b34a] sm:mb-1.5">
                                    {round.status === "done"
                                        ? `${(firm?.quarters ?? 0) || 1}분기 보고서`
                                        : `${halfTitle} · Day ${round.cursor - ctxDays + 1}/${totalDays - ctxDays + 1}`}
                                </p>
                                <h1 className="hidden sm:block text-xl sm:text-2xl font-black text-neutral-900 dark:text-white break-keep">
                                    {round.status === "done" ? "분기 운용 종료" : "이 회사, 지금 사시겠습니까?"}
                                </h1>
                                <p className="sm:hidden text-[15px] font-black text-neutral-900 dark:text-white leading-tight">
                                    {round.status === "done" ? "분기 종료" : "사시겠습니까?"}
                                </p>
                            </div>
                            {round.status === "playing" ? (
                                <button onClick={giveUp} disabled={busy}
                                    className="shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl text-xs font-bold text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26] disabled:opacity-40 transition-colors">
                                    <X size={14} /> 그만
                                </button>
                            ) : (
                                <button onClick={reset}
                                    className="shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl text-xs font-black text-white bg-[#0d2a1a] dark:bg-[#e3b34a] dark:text-[#2a1c00] hover:opacity-90 transition-opacity">
                                    <ArrowRight size={14} /> 다음 분기
                                </button>
                            )}
                        </header>

                        {round.status === "done" && <QuarterReport round={round} isLoggedIn={isLoggedIn} />}

                        {/* ── 차트 ──────────────────────────
                            남는 세로 공간을 전부 차트가 가져간다. 화면이 작으면 차트만 줄고
                            계좌·버튼은 그대로 남는다 — 판을 이어가는 데 필요한 건 그쪽이다. */}
                        {/* min-h-0 을 주면 안 된다 — flex 가 패널을 내용보다 작게 줄여 차트가 패널을
                            뚫고 나온다(320px 에서 계좌 카드 위에 겹쳐 그려졌다). 기본값 min-height:auto
                            라야 내용 높이가 바닥이 되고, 자리가 정말 모자라면 바깥이 스크롤된다. */}
                        <SectionPanel className="flex-1 flex flex-col p-2.5 sm:p-5">
                            {/* 폰 전용 한 줄 — 며칠째인지 · 업종 · 벤치마크 · 그만(또는 다음 분기).
                                제목("블라인드 차트")은 뺐다. 매일 다시 읽을 말이 아니고, 그 자리가
                                차트 높이다. */}
                            <div className="sm:hidden flex items-center justify-between gap-1.5 mb-1.5 shrink-0">
                                <span className="text-[11px] font-black text-neutral-900 dark:text-neutral-100 shrink-0 flex items-center gap-1.5">
                                    {round.status === "done"
                                        ? (round.name ?? "차트")
                                        : `${halfTitle} ${round.cursor - ctxDays + 1}/${totalDays - ctxDays + 1}일`}
                                    {/* 업종만 열어 준다 — 가격 말고 붙잡을 것 하나(개선안 ⑤) */}
                                    {round.sector && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-[#2c2a26] text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                                            <span className="w-[17px] h-[12px] rounded-[3px] overflow-hidden shrink-0">
                                                <SectorSprite sector={round.sector} color={sectorAccent(round.sector)} />
                                            </span>
                                            {round.sector}
                                        </span>
                                    )}
                                </span>
                                {/* 진행 중에는 이 자리를 벤치마크 비교가 쓴다 — 종목·시기 안내는
                                    한 번 읽으면 되는 문장이고, 이쪽은 매일 달라진다. */}
                                <p className={cn("text-[10px] truncate", benchNote ? "font-bold" : "text-neutral-400")}>
                                    {round.status === "done"
                                        ? <span className="text-neutral-400">{`${round.ticker} · ${fmtDate(round.start_date)}~${fmtDate(round.end_date)}`}</span>
                                        : benchNote
                                            ? <span className={edge >= 0 ? "text-[#16a34a]" : "text-red-500"}>{benchNote}</span>
                                            : <span className="text-neutral-400">종목·시기는 끝나야 열립니다</span>}
                                </p>
                                {round.status === "playing" ? (
                                    <button onClick={giveUp} disabled={busy} aria-label="그만"
                                        className="shrink-0 inline-flex items-center gap-1 min-h-[28px] px-2 rounded-lg text-[10.5px] font-bold text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-[#35332e] disabled:opacity-40">
                                        <X size={11} /> 그만
                                    </button>
                                ) : (
                                    <button onClick={reset} aria-label="다음 분기"
                                        className="shrink-0 inline-flex items-center gap-1 min-h-[28px] px-2 rounded-lg text-[10.5px] font-black text-white bg-[#0d2a1a] dark:bg-[#e3b34a] dark:text-[#2a1c00]">
                                        <ArrowRight size={11} /> 다음 분기
                                    </button>
                                )}
                            </div>
                            <div className="hidden sm:block">
                                <SectionHeader
                                    badge={round.sector ? (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-[#2c2a26] text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                                            <span className="w-[24px] h-[17px] rounded-[3px] overflow-hidden shrink-0">
                                                <SectorSprite sector={round.sector} color={sectorAccent(round.sector)} />
                                            </span>
                                            {round.sector}
                                            {scenarioLabel(round.scenario) && <span className="opacity-60">· {scenarioLabel(round.scenario)}</span>}
                                        </span>
                                    ) : undefined}
                                    icon={<TrendingUp size={16} />}
                                    title={round.status === "done" ? (round.name ?? "차트") : "블라인드 차트"}
                                    subtitle={round.status === "done"
                                        ? `${round.ticker} · ${fmtDate(round.start_date)} ~ ${fmtDate(round.end_date)}`
                                        : benchNote ?? "종목명과 시기는 끝나야 열립니다"}
                                />
                            </div>
                            {/* 산 도구는 판이 도는 중에도 껐다 켤 수 있다. 선이 넷씩 겹치면 정작
                                가격이 안 보이는데, 그때마다 판을 접고 대시보드로 갈 수는 없다.
                                산 사람에게만 보이므로 안 산 사람의 화면은 그대로다. */}
                            {ownedTools.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 mb-1.5 shrink-0">
                                    {ownedTools.map(t => {
                                        const on = activeTools.includes(t.id);
                                        return (
                                            <button key={t.id} onClick={() => toggleTool(t.id)} title={t.hint}
                                                aria-label={`${t.name} ${on ? "끄기" : "켜기"}`}
                                                className={cn("inline-flex items-center gap-1 min-h-[26px] px-2 rounded-lg text-[10.5px] font-bold border transition-colors",
                                                    on
                                                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                                                        : "text-neutral-400 border-neutral-200 dark:border-[#35332e]")}>
                                                {/* 칩이 곧 그 도구의 범례다 — 색으로 어느 선인지 알려 준다 */}
                                                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: on ? TOOL_COLOR[t.id] : "transparent", boxShadow: on ? "none" : `inset 0 0 0 1px ${TOOL_COLOR[t.id]}` }} />
                                                {t.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {/* recharts 의 ResponsiveContainer 는 부모 높이가 flex 로 정해지면 한 번 잰
                                크기를 붙들고 있어 칸이 줄어도 그대로 그린다 — 320px 에서 차트가 패널을
                                뚫고 나와 계좌 카드 위에 겹쳐 그려졌다. absolute inset-0 으로 실제 픽셀
                                상자를 주면 줄어드는 쪽도 따라온다. */}
                            <div className="relative flex-1 min-h-[100px] sm:min-h-[180px] overflow-hidden">
                                {/* 범례는 차트 위에 얹는다. recharts 범례는 그림 상자 안에서 30px 을
                                    떼어 가는데, 그 30px 은 곧 그래프가 낮아진다는 뜻이다.
                                    겹쳐 놓으면 자리를 안 먹고, 클릭은 통과시켜 차트 조작을 막지 않는다. */}
                                <div className="absolute top-0 left-[38px] z-10 flex flex-wrap items-center gap-x-2 gap-y-0.5 pointer-events-none">
                                    {legendItems.map(l => (
                                        <span key={l.name} className="inline-flex items-center gap-1 text-[9px] font-bold text-neutral-400 dark:text-neutral-500">
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
                                            {l.name}
                                        </span>
                                    ))}
                                </div>
                                <div className="absolute inset-0">
                                    <LineChart
                                        height="100%"
                                        markers={markers}
                                        overlays={overlays}
                                        legend_disable={true}
                                        category_array={visible.map(c => c.d.slice(4))}
                                        data_array={[
                                            // 색을 못박는다 — 범례 점이 같은 색을 써야 한다(테마마다 달라지면 어긋난다)
                                            { name: "종가", data: visible.map(c => c.c), color: "#3b82f6" },
                                            ...(round.qty > 0 ? [{ name: "내 평단", data: visible.map(() => Math.round(avg)), color: "#e3b34a" }] : []),
                                        ]}
                                    />
                                </div>
                            </div>
                        </SectionPanel>

                        {/* ── 계좌 ──────────────────────────
                            폰에서는 카드 대신 두 줄. 카드 넉 장이 128px 을 먹어 차트가 100px 까지
                            눌리고 그래도 자리가 모자랐다. 같은 값 넉 개가 두 줄이면 52px 이다. */}
                        <div className="lg:hidden shrink-0 rounded-xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] px-2.5 py-1 flex flex-col gap-0.5">
                            <div className="flex items-baseline justify-between gap-2 text-[12px]">
                                <span className="truncate">
                                    <span className="text-neutral-400 mr-1">내 돈</span>
                                    <b className="font-mono font-black text-neutral-900 dark:text-white">{fmtKrw(totalAssets)}</b>
                                    <span className="text-neutral-400 ml-1.5 mr-1">지금</span>
                                    <b className="font-mono font-black text-neutral-900 dark:text-white">{fmtKrw(price)}</b>
                                </span>
                                <b className={cn("font-mono font-black shrink-0", pnlValueColor(totalPnl >= 0))}>{pct(totalRate)}</b>
                            </div>
                            <div className="flex items-baseline justify-between gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                                <span className="shrink-0">
                                    <span className="text-neutral-400 mr-1">현금</span>
                                    <b className="font-mono">{fmtKrw(round.cash)}</b>
                                </span>
                                <span className="truncate">
                                    {round.qty > 0
                                        ? `${round.qty}주 갖고 있음 · 산 값 ${fmtKrw(avg)}`
                                        : round.status === "done" ? "정리됨" : "아직 안 삼"}
                                </span>
                            </div>
                        </div>
                        {/* 카드는 네 칸이 한 줄로 들어가는 넓이(lg)에서만. 그보다 좁으면 두 줄이 되어
                            283px 을 먹고 버튼을 화면 밖으로 밀어낸다. */}
                        <div className="hidden lg:grid grid-cols-4 gap-4 shrink-0">
                            {stats.map(s => <KpiCard key={s.label} {...s} />)}
                        </div>

                        {/* ── 조작 ────────────────────────── */}
                        {round.status === "playing" && (
                            <SectionPanel className="shrink-0 p-2.5 sm:p-5">
                                <div className="flex flex-col gap-2 sm:gap-4">
                                    {/* 살 때는 현금의 몇 %, 팔 때는 보유의 몇 %. 누르면 그 자리에서 체결되고
                                        하루가 지나간다 — 수량을 적고 다시 사기를 누르던 두 걸음을 한 걸음으로. */}
                                    <div className="grid grid-cols-[34px_1fr] gap-x-2 gap-y-1.5 items-center">
                                        <span className="text-[10.5px] font-black text-red-500">사기</span>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {BUY_PARTS.map(part => {
                                                const n = buyQtyFor(part.pct);
                                                return (
                                                    <button key={part.pct} aria-label={`사기 ${part.label}`}
                                                        onClick={() => advance({ side: "buy", qty: n })} disabled={busy || n < 1}
                                                        className="min-h-[46px] rounded-xl text-[13px] font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center leading-none gap-0.5">
                                                        {part.label}
                                                        <span className="text-[9px] font-bold opacity-80">{n > 0 ? `${n}주` : "—"}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <span className="text-[10.5px] font-black text-[#16a34a]">팔기</span>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {SELL_PARTS.map(part => {
                                                const n = sellQtyFor(part.pct);
                                                return (
                                                    <button key={part.pct} aria-label={`팔기 ${part.label}`}
                                                        onClick={() => advance({ side: "sell", qty: n })} disabled={busy || n < 1}
                                                        className="min-h-[46px] rounded-xl text-[13px] font-black text-[#16a34a] border border-[#16a34a]/40 hover:bg-[#f0fdf4] dark:hover:bg-[#052e16]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center leading-none gap-0.5">
                                                        {part.label}
                                                        <span className="text-[9px] font-bold opacity-70">{n > 0 ? `${n}주` : "—"}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* 사기·팔기와 같은 줄 문법 — 관망도 "얼마나"를 고른다.
                                            마지막 날에는 남은 보유를 다음 분기로 넘길 수 있다(개선안 ⑧). */}
                                        <span className="text-[10.5px] font-black text-neutral-400">관망</span>
                                        {canCarry ? (
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <button onClick={() => advance(null, true)} disabled={busy}
                                                    className="min-h-[46px] rounded-xl text-[13px] font-black text-[#a1730a] dark:text-[#e3b34a] border border-[#e3b34a]/50 hover:bg-[#faf1dc] dark:hover:bg-[#2a2211] disabled:opacity-40 transition-colors">
                                                    들고 가기
                                                </button>
                                                <button onClick={() => advance(null)} disabled={busy}
                                                    className="min-h-[46px] rounded-xl text-[13px] font-black text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26] disabled:opacity-40 transition-colors">
                                                    정리하고 끝
                                                </button>
                                            </div>
                                        ) : (
                                            // 예약 버튼이 이 줄 끝에 붙는다 — 따로 한 줄을 쓰면 44px 을 먹고,
                                            // 그만큼이 차트에서 빠진다. 마지막 날에는 걸어도 체결될 날이 없어 안 띄운다.
                                            <div className="flex gap-1.5">
                                                <div className="grid grid-cols-3 gap-1.5 flex-1 min-w-0">
                                                    <button onClick={() => advance(null)} disabled={busy}
                                                        className="min-h-[46px] rounded-xl text-[13px] font-black text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26] disabled:opacity-40 transition-colors">
                                                        하루
                                                    </button>
                                                    {SKIP_STEPS.map(n => (
                                                        <button key={n} onClick={() => skipDays(n)} disabled={busy} aria-label={`${n}일`}
                                                            className="min-h-[46px] rounded-xl text-[13px] font-black text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26] disabled:opacity-40 transition-colors flex flex-col items-center justify-center leading-none gap-0.5">
                                                            {n}일
                                                            <span className="text-[9px] font-bold opacity-60">±{JUMP_STOP_PCT}%면 멈춤</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                {isLoggedIn && (
                                                    <button onClick={() => setReserveOpen(v => !v)}
                                                        className="shrink-0 min-h-[46px] px-2.5 rounded-xl text-[11px] font-bold text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26]">
                                                        {/* pending 이 없는 응답(0020 배포 전 워커)에도 화면이 살아 있어야 한다 */}
                                                        예약 {(round.pending ?? []).length > 0 && <b className="text-[#e3b34a]">{(round.pending ?? []).length}</b>} {reserveOpen ? "▾" : "▸"}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 예약 — 41일 내내 화면 앞에 앉아 있지 않아도 되게(개선안 ②).
                                        체결 판정과 체결가 규칙은 전부 워커에 있다. 여기는 걸고 지우기만 한다.
                                        기본은 접어 둔다 — 폰에서 한 화면이 이미 빡빡하다. */}
                                    {isLoggedIn && (
                                        <div className={cn("flex flex-col gap-2",
                                            // 걸어 둔 예약도 없고 접혀 있으면 이 블록은 자리를 차지하지 않는다
                                            !reserveOpen && (round.pending ?? []).length === 0 && "hidden")}>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {(round.pending ?? []).map((r, i) => (
                                                    <span key={`${r.kind}-${i}`} className="inline-flex items-center gap-1 min-h-[36px] px-2 rounded-lg text-[10.5px] font-bold bg-[#faf1dc] dark:bg-[#2a2211] text-[#a1730a] dark:text-[#e3b34a]">
                                                        {reserveLabel(r.kind)} {r.price.toLocaleString()}원 {r.qty}주
                                                        <button onClick={() => unreserve(i)} disabled={busy}
                                                            className="ml-0.5 px-1 rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-40" aria-label="예약 취소">×</button>
                                                    </span>
                                                ))}
                                            </div>

                                            {reserveOpen && (
                                                <div className="flex items-center gap-1.5 flex-wrap rounded-xl border border-neutral-200 dark:border-[#35332e] p-2">
                                                    {RESERVE_KINDS.map(k => (
                                                        <button key={k.id} onClick={() => setResKind(k.id)} title={k.hint}
                                                            className={cn("min-h-[32px] px-2.5 rounded-lg text-[10.5px] font-bold border transition-colors",
                                                                resKind === k.id
                                                                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                                                                    : "text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-[#35332e]")}>
                                                            {k.label}
                                                        </button>
                                                    ))}
                                                    {/* 값을 적는 대신 지금 값에서 얼마나 떨어진 자리인지로 고른다. */}
                                                    <div className="flex items-center gap-1 w-full">
                                                        <span className="text-[10px] font-black text-neutral-400 shrink-0 w-8">자리</span>
                                                        {(resKind === "take_profit" ? RESERVE_STEPS.up : RESERVE_STEPS.down).map(step => {
                                                            const target = resPriceAt(step);
                                                            return (
                                                                <button key={step} onClick={() => setResStep(step)}
                                                                    aria-label={`${resKind === "take_profit" ? "+" : "-"}${step}%`}
                                                                    className={cn("flex-1 min-h-[34px] rounded-lg text-[11px] font-bold border transition-colors flex flex-col items-center justify-center leading-none gap-0.5",
                                                                        resStep === step
                                                                            ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                                                                            : "text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-[#35332e]")}>
                                                                    {resKind === "take_profit" ? "+" : "−"}{step}%
                                                                    <span className="text-[9px] font-mono opacity-70">{target.toLocaleString()}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="flex items-center gap-1 w-full">
                                                        <span className="text-[10px] font-black text-neutral-400 shrink-0 w-8">수량</span>
                                                        {(resKind === "buy_limit" ? BUY_PARTS : SELL_PARTS).map(part => {
                                                            const n = resQtyFor(part.pct);
                                                            return (
                                                                <button key={part.pct} onClick={() => setResPart(part.pct)}
                                                                    aria-label={`예약 수량 ${part.label}`} disabled={n < 1}
                                                                    className={cn("flex-1 min-h-[34px] rounded-lg text-[11px] font-bold border transition-colors flex flex-col items-center justify-center leading-none gap-0.5 disabled:opacity-30",
                                                                        resPart === part.pct
                                                                            ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                                                                            : "text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-[#35332e]")}>
                                                                    {part.label}
                                                                    <span className="text-[9px] font-mono opacity-70">{n > 0 ? `${n}주` : "—"}</span>
                                                                </button>
                                                            );
                                                        })}
                                                        <button onClick={reserve} disabled={busy || resQtyFor(resPart) < 1}
                                                            className="shrink-0 min-h-[34px] px-3 rounded-lg text-[11px] font-black text-white bg-[#0d2a1a] dark:bg-[#e3b34a] dark:text-[#2a1c00] disabled:opacity-40">
                                                            걸기
                                                        </button>
                                                    </div>

                                                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 w-full">
                                                        걸어 둔 값에 그날 가격이 닿으면 체결됩니다. 갭으로 건너뛴 날은 시가로 체결됩니다.
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 폰에서는 이 안내를 접는다 — 같은 말이 시작 화면 "규칙 보기" 에 있고,
                                        여기 23px 이 차트 높이로 간다. */}
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
                                하면 이 성적이 회사에 반영됩니다.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
/**
 * 이번 분기 매매를 한 줄로. 말할 수 없는 값(null)은 아예 빼서 문장을 짧게 만든다 —
 * "오른 뒤 매수 —%" 처럼 빈 칸을 보여 주면 읽는 사람이 의미를 지어낸다.
 */
function habitLine(h: RoundHabits): string {
    // 조각은 셋까지 — 넷이면 375px 에서 두 줄로 접혀 결과 화면이 한 장을 넘긴다.
    // 관망 비율은 대시보드 습관 카드에 있다.
    const parts = [`체결 ${h.trades}회`];
    if (h.holdDays !== null) parts.push(`평균 ${h.holdDays}일 보유`);
    if (h.chaseRatio !== null) parts.push(`오른 뒤 매수 ${h.chaseRatio}%`);
    return parts.join(" · ");
}

/** 습관 한 줄. 표본이 없으면 그 줄만 "아직 알 수 없음" 으로 둔다 — 카드를 통째로 숨기지 않는다. */
function HabitRow({ label, value, note }: { label: string; value: string | null; note?: string }) {
    return (
        <li className="flex items-baseline gap-2">
            <span className="w-8 shrink-0 text-[10px] font-black uppercase tracking-wider text-neutral-400">{label}</span>
            {value !== null ? (
                <>
                    <span className="font-bold text-neutral-900 dark:text-white">{value}</span>
                    {note && <span className="text-[11px] text-neutral-400 truncate">{note}</span>}
                </>
            ) : (
                <span className="text-neutral-400">아직 알 수 없음{note ? ` — ${note}` : ""}</span>
            )}
        </li>
    );
}

// ─────────────────────────────────────────────────────────
/**
 * 고객 돈이 왜 늘고 주는지, 보수는 어디서 나오는지.
 *
 * 숫자는 전부 규칙(firm.ts)에서 가져오고 예시는 실제 `flowRate` 를 돌려 만든다 — 문장에
 * 값을 다시 적으면 규칙이 바뀔 때 설명만 옛말이 된다.
 *
 * 자리는 "규칙 보기" 안이다. 시작 화면에 카드를 하나 더 세우면 폰에서 한 화면이 깨진다.
 */
function MoneyFlowNote() {
    const ex = (mine: number, bh: number) =>
        `내 ${pct(mine)} · 벤치마크 ${pct(bh)} → 고객 돈 ${flowRate(mine, bh) >= 0 ? "+" : ""}${flowRate(mine, bh).toFixed(1)}%`;

    const Row = ({ k, v }: { k: string; v: string }) => (
        <li className="flex gap-2 break-keep">
            <span className="shrink-0 w-[52px] text-neutral-400">{k}</span>
            <span className="text-neutral-600 dark:text-neutral-300">{v}</span>
        </li>
    );

    return (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-[#35332e] flex flex-col gap-2.5 text-[11.5px] sm:text-[13px] leading-[1.6]">
            <div>
                <p className="font-black text-neutral-900 dark:text-white mb-1">고객 돈은 왜 늘고 줄까</p>
                <p className="text-neutral-500 dark:text-neutral-400 break-keep">
                    고객은 벤치마크(그냥 사서 들고 있기)와 견줘서 돈을 맡기거나 뺍니다.
                    지수만큼도 못 벌면 굳이 나에게 맡길 이유가 없고, 덜 잃었어도 잃은 건 잃은 겁니다.
                </p>
                <ul className="mt-1.5 flex flex-col gap-1">
                    <Row k="식" v={`(내 수익률 − 벤치마크) × ${FLOW_EXCESS_MULT} + 손실분 × ${FLOW_LOSS_MULT}`} />
                    <Row k="한 분기" v={`${FLOW_MIN}% ~ +${FLOW_MAX}% 안에서만 움직입니다`} />
                    <Row k="이겼을 때" v={ex(8, 5)} />
                    <Row k="둘 다 손실" v={ex(-4, -6)} />
                    <Row k="졌을 때" v={ex(2, 9)} />
                    <Row k="하한" v={`아무리 잃어도 ${fmtMoney(MIN_AUM)}원 아래로는 내려가지 않습니다`} />
                </ul>
            </div>
            <div>
                <p className="font-black text-neutral-900 dark:text-white mb-1">내 회사 돈(보수)은 어디서 나오나</p>
                <ul className="flex flex-col gap-1">
                    <Row k="운용보수" v={`맡은 돈 × ${(BASE_FEE_BP / 100).toFixed(2)}% — 성적과 무관하게 분기마다 (연 ${(BASE_FEE_BP * 4 / 100).toFixed(0)}%)`} />
                    <Row k="성과보수" v={`맡은 돈 × 초과수익(%p) × ${PERF_FEE_PCT}% — 벤치마크를 이겼을 때만`} />
                    <Row k="쓰는 곳" v="리서치실 도구를 사는 데 씁니다. 판의 시드 1,000만원과는 다른 주머니입니다." />
                </ul>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
/**
 * 접히는 패널. 시작 화면에서 당장 필요한 건 "시작" 하나뿐이고, 리서치실·습관·지난 분기는
 * 궁금할 때 여는 것이다. 접어 두면 요약 한 줄만 남아 시작 버튼이 첫 화면에 들어온다.
 */
function Fold({ icon, title, subtitle, children }: {
    icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode;
}) {
    return (
        <SectionPanel className="p-3.5 sm:p-5">
            <details className="group">
                <summary className="cursor-pointer list-none flex items-center gap-2.5">
                    <span className="p-1.5 bg-[#faf9f7] dark:bg-[#35332e] rounded-lg text-neutral-500 dark:text-neutral-400 shrink-0">{icon}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-black text-neutral-900 dark:text-neutral-100 tracking-tight">{title}</span>
                        <span className="block text-[11px] text-neutral-500 truncate">{subtitle}</span>
                    </span>
                    <ChevronDown size={16} className="shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3.5 pt-3.5 border-t border-neutral-100 dark:border-[#35332e]/80">{children}</div>
            </details>
        </SectionPanel>
    );
}

// ─────────────────────────────────────────────────────────
/** 회사 대시보드 — 판이 없을 때. 시작 버튼까지 한 화면에 들어와야 한다. */
function FirmDashboard({
    onStart, busy, isLoggedIn, firm, bestReturn, history, habits, onBuy, activeTools, onToggle,
    campaign, endedCampaign, onOpenCampaign, onClearEnded,
}: {
    onStart: (scenario?: string | null) => void; busy: boolean; isLoggedIn: boolean;
    firm: Firm | null; bestReturn: number | null; history: ReplayHistoryItem[];
    habits: HabitSummary | null;
    onBuy: (id: string) => void; activeTools: string[]; onToggle: (id: string) => void;
    campaign: Campaign | null; endedCampaign: Campaign | null;
    onOpenCampaign: (years: number) => void; onClearEnded: () => void;
}) {
    const aum = firm?.aum ?? INITIAL_AUM;
    const owned = firm?.tools ?? [];
    // 고른 판 성격. null 이면 아무 자리나.
    const [want, setWant] = useState<string | null>(null);

    return (
        <>
            <header>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a1730a] dark:text-[#e3b34a] mb-1.5">
                    {isLoggedIn ? firm?.rank ?? rankOf(aum) : "체험 운용"}
                </p>
                <h1 className="text-xl sm:text-3xl font-black text-neutral-900 dark:text-white break-keep">
                    {firm?.name ?? "내 운용사"}
                </h1>
                {/* 아래 규칙·수치와 같은 말이라, 화면이 좁으면 접는다 */}
                <p className="hidden sm:block text-[13px] sm:text-[15px] text-neutral-500 dark:text-neutral-400 mt-3 leading-[1.8] break-keep max-w-md">
                    분기마다 모델 포트폴리오 1,000만원으로 실력을 증명합니다.
                    고객은 그 성적을 보고 돈을 맡기거나 뺍니다.
                </p>
            </header>

            {!isLoggedIn && (
                <div className="rounded-2xl border border-[#e3b34a]/40 bg-[#fdf6e9] dark:bg-[#1c1608] px-4 py-3 text-[13px] text-[#8a6206] dark:text-[#e3b34a] break-keep">
                    <Link href="/login?callbackUrl=%2Fgame" className="underline font-bold">로그인</Link>
                    하면 내 운용사가 생기고, 성적이 고객 자금과 보수로 쌓입니다.
                </div>
            )}

            <SectionPanel className="p-3 sm:p-5">
                {firm?.carry && (
                    <div className="mt-3 sm:mt-4 rounded-xl border border-[#e3b34a]/50 bg-[#faf1dc] dark:bg-[#2a2211] px-3.5 py-2.5">
                        <p className="text-[11.5px] sm:text-[12.5px] font-bold text-[#a1730a] dark:text-[#e3b34a] break-keep">
                            지난 분기에서 {firm.carry.qty}주를 들고 왔습니다 (주당 {fmtKrw(firm.carry.price)}
                            {firm.carry.sector ? ` · ${firm.carry.sector}` : ""}). 같은 회사로 이어서 시작합니다.
                        </p>
                        <p className="mt-1 text-[10.5px] text-[#a1730a]/80 dark:text-[#e3b34a]/70 break-keep">
                            시드는 이번에도 1,000만원입니다 — 그중 일부가 이미 그 회사에 들어가 있습니다.
                        </p>
                    </div>
                )}

                {/* 기간이 끝났다 — 반기를 다 굴렸으면 여기서 한 번 정리하고 새 기간으로 간다.
                    (자세한 최종 리포트는 다음 단계에서 붙인다) */}
                {isLoggedIn && endedCampaign && (
                    <div className="rounded-xl border border-[#e3b34a]/60 bg-[#faf1dc] dark:bg-[#2a2211] px-3.5 py-3">
                        <p className="text-[13px] font-black text-[#a1730a] dark:text-[#e3b34a] break-keep">
                            {endedCampaign.years}년 투자를 마쳤습니다 — {endedCampaign.total_halves}반기 전부.
                        </p>
                        <p className="mt-1 text-[11.5px] text-[#a1730a]/80 dark:text-[#e3b34a]/70 break-keep">
                            맡은 돈 {fmtMoney(aum)} · 지난 분기 기록은 아래에 남아 있습니다.
                        </p>
                        <button onClick={onClearEnded}
                            className="mt-2 min-h-[36px] px-3 rounded-lg text-[11.5px] font-bold border border-[#e3b34a]/60 text-[#a1730a] dark:text-[#e3b34a]">
                            새 기간 고르기
                        </button>
                    </div>
                )}

                {/* 기간 고르기 — 캠페인이 없을 때만. 도중에는 바꿀 수 없다(지나온 반기가
                    어느 기간의 것이었는지 알 수 없어진다). */}
                {isLoggedIn && !campaign && !endedCampaign && (
                    <div className="mt-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">몇 년을 굴릴까요</p>
                        <div className="grid grid-cols-4 gap-1.5">
                            {YEAR_CHOICES.map(y => (
                                <button key={y} onClick={() => onOpenCampaign(y)} disabled={busy}
                                    className="min-h-[44px] rounded-xl text-[13px] font-black border border-neutral-200 dark:border-[#35332e] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#2c2a26] disabled:opacity-40 transition-colors flex flex-col items-center justify-center leading-none gap-0.5">
                                    {y}년
                                    <span className="text-[9px] font-bold text-neutral-400">{totalHalves(y)}반기</span>
                                </button>
                            ))}
                        </div>
                        <p className="mt-1.5 text-[10.5px] text-neutral-400 dark:text-neutral-500 break-keep">
                            고른 만큼 과거로 돌아가 한 반기(달력 45일)씩 굴려 옵니다. 도중에는 바꿀 수 없습니다.
                        </p>
                    </div>
                )}

                {/* 판 고르기 — 무작위만 있으면 배움이 안 쌓인다. 같은 성격의 판을 여러 번 겪어야
                    "나는 급락 뒤에 너무 빨리 산다" 같은 습관이 드러난다(개선안 ⑦).
                    성격은 서버가 컨텍스트 구간만 보고 붙이므로 정답이 새지 않는다. */}
                {isLoggedIn && campaign && !firm?.carry && (
                    <div className="mt-3 sm:mt-5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">어떤 자리에서 시작할까요</p>
                        <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => setWant(null)} disabled={busy}
                                className={cn("min-h-[36px] px-3 rounded-lg text-[11.5px] font-bold border transition-colors disabled:opacity-40",
                                    want === null
                                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                                        : "text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26]")}>
                                아무 자리나
                            </button>
                            {SCENARIOS.map(sc => (
                                <button key={sc.id} onClick={() => setWant(sc.id)} disabled={busy} title={sc.hint}
                                    className={cn("min-h-[36px] px-3 rounded-lg text-[11.5px] font-bold border transition-colors disabled:opacity-40",
                                        want === sc.id
                                            ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                                            : "text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26]")}>
                                    {sc.label}
                                </button>
                            ))}
                        </div>
                        {/* 두 문장이면 폰에서 두 줄이 된다 — 실제로 어떤 자리였는지는 차트 옆에 적힌다. */}
                        <p className="mt-1.5 text-[10.5px] text-neutral-400 dark:text-neutral-500 break-keep">
                            고른 자리가 안 나오면 만들어진 판으로 시작합니다.
                        </p>
                    </div>
                )}

                {/* 비로그인 체험은 캠페인 없이 한 판만 굴린다 — 기간을 고를 회사가 없다. */}
                {(!isLoggedIn || campaign) && (
                    <button onClick={() => onStart(want)} disabled={busy}
                        className="mt-2.5 sm:mt-4 w-full inline-flex flex-col items-center justify-center gap-0.5 min-h-[52px] rounded-xl bg-gradient-to-b from-[#f7dc8c] to-[#d9a52a] hover:from-[#ffe7a4] hover:to-[#e6b13a] text-[#2a1c00] font-black text-[15px] disabled:opacity-50 transition-all">
                        <span className="inline-flex items-center gap-2">
                            <Play size={16} strokeWidth={2.6} />
                            {busy ? "종목을 고르는 중…"
                                : !campaign ? "체험 한 판"
                                    : `${campaign.year}년차 ${campaign.half_label}반기 ${firm?.carry ? "이어서" : "시작"}`}
                        </span>
                        {/* 어디까지 왔나 — 20년이면 라벨만으로는 감이 안 온다. 버튼 안에 두면
                            줄을 따로 쓰지 않는다(폰에서 한 화면이 빡빡하다). */}
                        {campaign && !busy && (
                            <span className="text-[9.5px] font-bold opacity-70">
                                {campaign.years}년 중 {campaign.done_halves}/{campaign.total_halves}반기 지남 ·{" "}
                                {campaign.start_date.slice(0, 4)}년 {Number(campaign.start_date.slice(4, 6))}월부터
                            </span>
                        )}
                    </button>
                )}

                {/* 회사 현황은 한 줄로. 자세한 건 아래 리서치실·지난 분기에 다 있다. */}
                {isLoggedIn && (
                    <p className="mt-3 text-[11.5px] sm:text-[13px] text-neutral-500 dark:text-neutral-400 break-keep">
                        맡은 돈 <b className="text-neutral-900 dark:text-white font-mono">{fmtMoney(aum)}</b>
                        {" · "}회사 금고 <b className="text-neutral-900 dark:text-white font-mono">{fmtMoney(firm?.cash ?? 0)}</b>
                        {" · "}{firm?.quarters ?? 0}분기 운용
                        {bestReturn !== null && <>{" · "}최고 <b className={pnlValueColor(bestReturn >= 0)}>{pct(bestReturn)}</b></>}
                    </p>
                )}

                {/* 규칙은 한 번 읽으면 되는 글이다. 매번 시작 버튼 앞을 막고 서 있을 이유가 없다. */}
                <details className="group mt-3">
                    <summary className="cursor-pointer list-none text-[11.5px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                        규칙과 고객 돈 보기 <span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span>
                    </summary>
                    <div className="mt-2.5">
                <ul className="flex flex-col gap-1.5 sm:gap-3 text-[12px] sm:text-[14px] leading-[1.5] sm:leading-normal text-neutral-600 dark:text-neutral-300">
                    {[
                        `시드 1,000만원으로 한 반기를 운용합니다. 1년은 8반기(1-1 … 4-2)입니다.`,
                        `한 반기는 달력 45일입니다. 앞 한 달을 먼저 보고, 그다음부터 하루씩 넘깁니다.`,
                        // 판이 도는 중에는 화면이 좁아 이 규칙을 적을 자리가 없다 — 여기서 한 번 말한다.
                        `사기·팔기·관망 — 어느 쪽을 눌러도 하루가 지나갑니다.`,
                        `체결은 그날 종가. 수수료 0.015%, 매도 거래세 0.18%. 마지막 날 자동 청산.`,
                        `벤치마크(그냥 사서 들고 있기)와 견주어 고객 자금이 들고 납니다.`,
                    ].map((line, i) => (
                        <li key={i} className="flex gap-3 break-keep">
                            <span className="font-mono text-[10px] sm:text-[11px] font-black text-[#a1730a] dark:text-[#e3b34a] pt-0.5 shrink-0">
                                {String(i + 1).padStart(2, "0")}
                            </span>
                            <span>{line}</span>
                        </li>
                    ))}
                </ul>
                        <MoneyFlowNote />
                    </div>
                </details>
            </SectionPanel>

            {isLoggedIn && (
                <Fold icon={<FlaskConical size={16} />} title="리서치실"
                    subtitle={`회사 금고 ${fmtMoney(firm?.cash ?? 0)}원 · 도구 ${owned.length}/${TOOLS.length}`}>
                    <ul className="flex flex-col gap-2">
                        {TOOLS.map(t => {
                            const have = owned.includes(t.id);
                            const on = activeTools.includes(t.id);
                            return (
                                <li key={t.id} className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 dark:border-[#35332e] px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-black text-neutral-900 dark:text-white truncate">
                                            {t.name} <span className="text-[11px] font-bold text-neutral-400">{t.detail}</span>
                                        </div>
                                        {/* 읽는 법을 적어 둔다 — 이름만 보고는 사도 쓸 줄 모른다 */}
                                        <p className="mt-0.5 text-[11px] leading-[1.5] text-neutral-500 dark:text-neutral-400 break-keep">
                                            {t.hint}
                                        </p>
                                    </div>
                                    {have ? (
                                        <button onClick={() => onToggle(t.id)}
                                            className={cn("shrink-0 inline-flex items-center gap-1 min-h-[36px] px-3 rounded-lg text-[11px] font-bold border transition-colors",
                                                on ? "border-[#16a34a]/50 text-[#16a34a]" : "border-neutral-200 dark:border-[#35332e] text-neutral-400")}>
                                            <Check size={12} /> {on ? "켜짐" : "꺼짐"}
                                        </button>
                                    ) : (
                                        <button onClick={() => onBuy(t.id)} disabled={busy || (firm?.cash ?? 0) < t.price}
                                            className="shrink-0 inline-flex items-center gap-1 min-h-[36px] px-3 rounded-lg text-[11px] font-bold text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-[#35332e] hover:bg-neutral-100 dark:hover:bg-[#2c2a26] disabled:opacity-40">
                                            <Lock size={12} /> {fmtMoney(t.price)}
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </Fold>
            )}

            {habits && habits.trades > 0 && (
                <Fold icon={<Footprints size={16} />} title="매매 습관"
                    subtitle={`${habits.quarters}분기 · 체결 ${habits.trades}회`}>
                    <ul className="flex flex-col gap-1.5 text-[12px] sm:text-[13px]">
                        <HabitRow label="보유"
                            value={habits.holdDays !== null ? `평균 ${habits.holdDays}일` : null}
                            note={habits.turnover !== null ? `회전율 ${habits.turnover}회` : undefined} />
                        <HabitRow label="진입"
                            value={habits.chaseRatio !== null ? `오른 뒤 매수 ${habits.chaseRatio}%` : null}
                            note={habits.entryTrend !== null ? `직전 5일 ${pct(habits.entryTrend)}` : undefined} />
                        <HabitRow label="처분"
                            value={habits.disposition !== null ? `이익 ${habits.gainHoldDays}일 / 손실 ${habits.lossHoldDays}일` : null}
                            note={habits.disposition !== null
                                ? (habits.disposition > 0 ? "이익을 빨리 실현하는 편" : habits.disposition < 0 ? "손실을 빨리 정리하는 편" : "양쪽이 비슷")
                                : "이익·손실 매도가 둘 다 있어야 볼 수 있습니다"} />
                        <HabitRow label="투입"
                            value={habits.biteShare !== null ? `한 번에 ${habits.biteShare}%` : null}
                            note={habits.watchRatio !== null ? `관망 ${habits.watchRatio}%` : undefined} />
                    </ul>
                    <p className="mt-3 text-[10px] text-neutral-400 break-keep leading-[1.6]">
                        이 게임에서 관찰된 값입니다. 표본이 적으면 다음 분기에 크게 달라질 수 있습니다.
                    </p>
                </Fold>
            )}

            {history.length > 0 && (
                <Fold icon={<History size={16} />} title="지난 분기"
                    subtitle={`최근 ${history.length}분기 · 마지막 ${pct(history[0]?.final_return ?? 0)}`}>
                    <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-[#2c2a26] text-sm">
                        {history.map(h => {
                            const win = (h.final_return ?? 0) >= 0;
                            const flow = (h.aum_after ?? 0) - (h.aum_before ?? 0);
                            return (
                                <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                                    <div className="min-w-0">
                                        {/* 이월한 분기는 아직 그 회사를 들고 있다 — 목록에서도 열지 않는다.
                                            여기서 열면 이어지는 판이 블라인드가 아니게 된다. */}
                                        {h.carried ? (
                                            <div className="font-bold text-[#a1730a] dark:text-[#e3b34a] truncate flex items-center gap-1">
                                                <EyeOff size={13} className="shrink-0" /> 아직 들고 있음
                                            </div>
                                        ) : (
                                            <div className="font-bold text-neutral-900 dark:text-white truncate">{h.name ?? h.ticker}</div>
                                        )}
                                        <div className="text-[11px] text-neutral-400 font-mono">
                                            {h.carried
                                                ? `${fmtDate(h.start_date)} ~ · 정리하면 열립니다`
                                                : `${fmtDate(h.start_date)} ~ ${fmtDate(h.end_date)}`}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className={cn("font-mono text-xs font-black", pnlValueColor(win))}>{pct(h.final_return ?? 0)}</div>
                                        <div className="text-[11px] text-neutral-400">
                                            벤치마크 {pct(h.bh_return ?? 0)}
                                            {h.aum_after !== null && (
                                                <span className={cn("ml-1 font-bold", pnlValueColor(flow >= 0))}>
                                                    · 자금 {flow >= 0 ? "+" : "−"}{fmtMoney(Math.abs(flow))}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Fold>
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────
/**
 * 정산 결과를 고객의 말로 옮긴다. 새로 계산하는 것은 없다 — 이미 나온 자금 유출입과
 * 등급 변화를 문장으로 바꿀 뿐이다. 과하게 쓰면 유치해지므로 사실만 담는다.
 */
function clientNote(flow: number, flowPct: number, rankBefore: string, rankAfter: string): string {
    const money = fmtMoney(Math.abs(flow));
    const head =
        flowPct >= 30 ? `성과를 보고 큰돈이 들어왔습니다. 신규 자금 ${money}.`
            : flowPct >= 10 ? `고객이 자금을 더 맡겼습니다. +${money}.`
                : flowPct > 0 ? `고객들이 조금씩 더 맡겼습니다. +${money}.`
                    : flowPct === 0 ? "고객 자금은 그대로입니다."
                        : flowPct > -10 ? `일부 고객이 자금을 뺐습니다. −${money}.`
                            : `환매 요청이 몰렸습니다. −${money}.`;
    if (rankBefore === rankAfter) return head;
    return `${head} 회사가 ${rankBefore} 에서 ${rankAfter} 로 ${flow >= 0 ? "올라섰습니다" : "내려앉았습니다"}.`;
}

/** 분기 보고서 — 성적과 그것이 회사에 미친 결과를 나란히. */
/**
 * 이번 분기 숫자가 어떻게 나왔는지. 접어 둔다 — 한 화면을 지켜야 하고, 매번 볼 것도 아니다.
 *
 * 값은 서버가 남긴 정산 결과를 그대로 쓰고, 여기서는 그 값이 어느 식에서 나왔는지만
 * 늘어놓는다. 다시 계산하면 규칙이 바뀐 뒤 지난 기록의 설명이 틀려진다.
 */
function FeeMath({ round, mine, bh }: { round: ReplayRound; mine: number; bh: number }) {
    const aum = round.aum_before ?? 0;
    const excess = mine - bh;
    const loss = Math.min(mine, 0);
    const flowPct = aum > 0 ? ((round.aum_after ?? 0) - aum) / aum * 100 : 0;
    const raw = excess * FLOW_EXCESS_MULT + loss * FLOW_LOSS_MULT;
    const capped = Math.abs(raw - flowPct) > 0.05;   // 상·하한에 걸렸나

    const Line = ({ k, v }: { k: string; v: string }) => (
        <li className="flex gap-2 break-keep">
            <span className="shrink-0 w-[52px] text-neutral-400">{k}</span>
            <span className="font-mono text-neutral-600 dark:text-neutral-300">{v}</span>
        </li>
    );

    return (
        <details className="group w-full">
            <summary className="cursor-pointer list-none text-[11px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                계산식 <span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span>
            </summary>
            <ul className="mt-1.5 flex flex-col gap-1 text-[11px] sm:text-[12px] leading-[1.6]">
                <Line k="초과수익" v={`${pct(mine)} − ${pct(bh)} = ${excess >= 0 ? "+" : ""}${excess.toFixed(2)}%p`} />
                <Line k="운용보수" v={`${fmtMoney(aum)} × ${(BASE_FEE_BP / 100).toFixed(2)}% = ${(round.fee_base ?? 0).toLocaleString()}원`} />
                <Line k="성과보수" v={excess > 0
                    ? `${fmtMoney(aum)} × ${excess.toFixed(2)}%p × ${PERF_FEE_PCT}% = ${(round.fee_perf ?? 0).toLocaleString()}원`
                    : "벤치마크를 못 이겨 없음"} />
                <Line k="고객 돈" v={`${excess >= 0 ? "+" : ""}${excess.toFixed(2)}%p × ${FLOW_EXCESS_MULT}${loss < 0 ? ` ${(loss * FLOW_LOSS_MULT).toFixed(1)}(손실 ${loss.toFixed(2)}% × ${FLOW_LOSS_MULT})` : ""} = ${raw >= 0 ? "+" : ""}${raw.toFixed(1)}%`} />
                {capped && (
                    <Line k="" v={`한 분기 한도 ${FLOW_MIN}%~+${FLOW_MAX}% 에 걸려 ${flowPct >= 0 ? "+" : ""}${flowPct.toFixed(1)}% 적용`} />
                )}
                <Line k="맡은 돈" v={`${fmtMoney(aum)} → ${fmtMoney(round.aum_after ?? 0)}`} />
            </ul>
        </details>
    );
}

function QuarterReport({ round, isLoggedIn }: { round: ReplayRound; isLoggedIn: boolean }) {
    const mine = round.final_return ?? 0;
    const bh = round.bh_return ?? 0;
    const beat = mine > bh;

    // 정산은 서버가 남긴 값을 그대로 쓴다 — 규칙이 바뀌어도 지난 기록은 그때 값이어야 한다.
    const settled = round.aum_before !== null && round.aum_after !== null;
    const flow = settled ? round.aum_after! - round.aum_before! : 0;
    const flowPct = settled && round.aum_before! > 0 ? (flow / round.aum_before!) * 100 : 0;
    const feeTotal = (round.fee_base ?? 0) + (round.fee_perf ?? 0);

    return (
        <SectionPanel className={cn("shrink-0 border-2 p-3 sm:p-5", beat ? "border-[#e3b34a]/60" : "border-neutral-200 dark:border-[#35332e]")}>
            <div className="flex flex-col gap-1.5 sm:gap-3">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 sm:mb-1">내 수익률</p>
                        <p className={cn("text-2xl sm:text-4xl font-black font-mono", pnlValueColor(mine >= 0))}>{pct(mine)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 sm:mb-1">벤치마크</p>
                        <p className={cn("text-lg sm:text-xl font-black font-mono", pnlValueColor(bh >= 0))}>{pct(bh)}</p>
                    </div>
                </div>

                {round.carried && (
                    <p className="text-[11.5px] sm:text-[13px] font-bold break-keep text-[#a1730a] dark:text-[#e3b34a]">
                        {round.qty}주를 다음 분기로 넘겼습니다. 아직 들고 있으므로 어떤 회사였는지는 열지 않습니다.
                    </p>
                )}

                <p className="text-[12px] sm:text-[14px] font-bold break-keep text-neutral-700 dark:text-neutral-200">
                    {beat
                        ? `벤치마크보다 ${(mine - bh).toFixed(2)}%p 더 벌었습니다.`
                        : `벤치마크가 ${(bh - mine).toFixed(2)}%p 더 벌었습니다.`}
                </p>

                {round.habits && round.habits.trades > 0 && (
                    <p className="text-[11px] sm:text-[12px] text-neutral-400 dark:text-neutral-500 break-keep">
                        {habitLine(round.habits)}
                    </p>
                )}

                {settled && (
                    <p className="text-[11.5px] sm:text-[13px] font-bold break-keep text-[#a1730a] dark:text-[#e3b34a] border-t border-neutral-100 dark:border-[#35332e] pt-1.5 sm:pt-3">
                        {clientNote(flow, flowPct, rankOf(round.aum_before!), rankOf(round.aum_after!))}
                    </p>
                )}

                {settled ? (
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px] sm:text-[13px]">
                        <span className="text-neutral-500 dark:text-neutral-400">
                            고객 자금{" "}
                            <b className={pnlValueColor(flow >= 0)}>{flowPct >= 0 ? "+" : ""}{flowPct.toFixed(1)}%</b>
                            {" → "}
                            <b className="text-neutral-900 dark:text-white font-mono">{fmtMoney(round.aum_after!)}</b>
                        </span>
                        <span className="text-[#a1730a] dark:text-[#e3b34a] font-bold">
                            보수 +{fmtMoney(feeTotal)}
                            <span className="font-normal opacity-70"> (운용 {fmtMoney(round.fee_base ?? 0)} · 성과 {fmtMoney(round.fee_perf ?? 0)})</span>
                        </span>
                        <FeeMath round={round} mine={mine} bh={bh} />
                    </div>
                ) : isLoggedIn ? null : (
                    <p className="text-[11px] text-neutral-400 border-t border-neutral-100 dark:border-[#35332e] pt-1.5">
                        체험 운용이라 회사에는 반영되지 않았습니다.
                    </p>
                )}
            </div>
        </SectionPanel>
    );
}
