"use client";

// 내 운용사 — 블라인드 차트 리플레이를 "분기 운용" 으로 감싼 게임.
//
// ── 단계 여섯 ────────────────────────────────────────────────────────
//
//   시작(title) → 설정(setup) → ( 준비(ready) → 게임(play) → 반기 종료(halfEnd) ) × n → 종료(end)
//
// 가운데 셋은 반기마다 되풀이되고 나머지 셋은 기간에 한 번씩이다. 그 구분이 화면에
// 안 보이면 반기가 끝날 때마다 "설정을 또 해야 하나" 가 된다 — PhaseBar 가 줄 하나로 말한다.
//
// 설정은 **고르는 곳**(기간·자리·회사)이고 준비는 **읽는 곳**(뽑힌 자리·이번 고객과 목표)이다.
// 예전에는 설정에서 [시작] 을 누르면 종목이 뽑히면서 곧바로 차트로 떨어져, 무엇을 하러
// 들어왔는지 읽을 자리가 그 사이에 없었다.
//
// 예전에는 시작·설정·결과가 "대시보드" 한 화면에 겹쳐 있었다. 판이 없을 때 그 화면이
// 로고이자 설정이자 성적표였고, 그래서 무엇을 하는 화면인지가 상태에 따라 달라졌다.
// 지금은 한 화면이 한 가지 일만 한다 — 어느 단계인지는 아래 `phase` 하나가 정한다.
//
// 겉모습은 90년대 기기다(app/(game)/game/retro.tsx). 이 화면만 브라운관 안이라
// 밝은 테마를 따로 두지 않는다 — 아케이드 기기는 낮에도 어둡다.
//
// 한 반기는 그때 맡고 있는 돈을 그대로 굴린다. 그 성적이 맡은 돈에 곱해지고, 고객이 돈을 맡기거나
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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
// 아이콘은 뜻이 겹치지 않게 고른다. 예전에는 Flag 가 "그만"과 "지난 분기" 두 곳에 쓰여
// 같은 그림이 전혀 다른 일을 가리켰다.
import {
    Play, Pause, ArrowLeft, EyeOff,
    FlaskConical, History, Footprints, Lock, Check, ChevronDown, Building2,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { reqGetNcavDailyList, selectNcavDailyList } from "@/lib/features/algorithmTrade/algorithmTradeSlice";

import {
    SEED, avgPrice, quoteBuy, quoteSell, applyBuy, applySell,
    quoteShort, quoteCover, applyCover, shortPnl,
} from "@/lib/paper/engine";
import { partBuyQty, splitBuyQty, sellPartQty, rebalanceOrder, fitToValue, equalWeightPlan, partShortQty } from "@/lib/paper/sizing";
import { CONTEXT_DAYS, TOTAL_DAYS, type Candle, type ReplayRound, type ReplayHistoryItem, type HistoryStock, type RoundHabits, type HabitSummary, type Reservation, type Campaign } from "@/lib/paper/round";
import { buildLocalRound, loadLocal, saveLocal, advanceLocal, giveUpLocal } from "@/lib/paper/localRound";
import {
    halfTrade, halfAdvance, halfGiveUp, halfReserve, halfCancel, halfSubmission, halfCheckpoint,
    type TradeSide,
} from "@/lib/paper/half";
import { getReplayState, startCampaign, startReplayRound, buyTool, submitHalf, checkpointHalf } from "@/lib/features/paper/replayAPI";
import {
    TOOLS, INITIAL_AUM, rankOf, fmtMoney, flowRate, type Firm,
    FLOW_MIN, FLOW_MAX, FLOW_EXCESS_MULT, FLOW_LOSS_MULT, BASE_FEE_BP, PERF_FEE_PCT,
    DEPARTMENTS, perksOf, type Perks,
} from "@/lib/paper/firm";
import { movingAverage, bollinger, donchian, atrBand } from "@/lib/paper/indicators";
import { seasonOf, type Season } from "@/lib/paper/season";
import { YEAR_CHOICES, halfOf, totalHalves, halfLabel, HALVES_PER_YEAR } from "@/lib/paper/campaign";
import SectorSprite, { sectorAccent } from "@/app/(screener)/screener/components/SectorSprite";

import { fmtKrw, useToast, ToastContainer } from "@/components/balance/shared";
import { Win, Sunken, Crt, RetroBtn, PixelSlider, StatLine, Blink, R, OUT, IN, PIXEL } from "./retro";
import { cn } from "@/lib/utils";
import { safeNum } from "@/lib/utils/numbers";

// recharts 를 초기 번들에서 뺀다
// 캔들차트 — 상세 화면 전용. 개요는 판 전체 곡선이라 선 차트가 맞다.
const CandleChart = dynamic(() => import("@/components/CandleChart"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-neutral-100 dark:bg-[#2c2a26]" />,
});
const LineChart = dynamic(() => import("@/components/LineChart"), {
    ssr: false,
    loading: () => <div className="h-full min-h-[120px] rounded-2xl bg-neutral-100 dark:bg-surface-dark-card animate-pulse" />,
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

/* ── 단계 ────────────────────────────────────────────────────────
   시작 → 설정 → (준비 → 게임 → 반기 종료) × n → 종료.

   가운데 셋은 반기마다 되풀이되고 나머지 셋은 한 번씩이다. 그 구분이 화면에 안 보이면
   반기가 끝날 때마다 "설정을 또 해야 하나" 가 된다.

   화면 번호를 상태로 들지 않고 데이터에서 읽는다 — 따로 들면 그것과 데이터가 어긋나는
   순간이 반드시 생긴다(판은 끝났는데 화면은 아직 진행 중 같은). */
const PHASE_ORDER = ["title", "setup", "ready", "play", "halfEnd", "end"] as const;
type Phase = typeof PHASE_ORDER[number];
const PHASE_LABEL: Record<Phase, string> = {
    title: "시작", setup: "설정", ready: "준비", play: "게임", halfEnd: "반기 종료", end: "종료",
};
/** 반기마다 되풀이되는 구간. 표시줄에서 한 칸에 묶인다. */
const LOOP_PHASES: Phase[] = ["ready", "play", "halfEnd"];

// 예약 종류. id 와 이름은 워커 src/lib/reservations.js 의 RESERVE_KINDS·RESERVE_LABEL 과 같아야 한다.
const RESERVE_KINDS: { id: Reservation["kind"]; label: string; hint: string }[] = [
    { id: "buy_limit", label: "지정가 매수", hint: "이 값까지 내려오면 산다" },
    { id: "stop_loss", label: "손절", hint: "이 값까지 내려오면 판다" },
    { id: "take_profit", label: "익절", hint: "이 값을 넘으면 판다" },
];
const reserveLabel = (k: string) => RESERVE_KINDS.find(r => r.id === k)?.label ?? k;

/**
 * 그 자리를 뭐라고 부를까.
 *
 * 판이 도는 동안은 종목명이 없다 — 업종이 그 자리를 부르는 이름이 된다. 업종도 없으면
 * 자리 번호로 부른다. 예약 칩과 종목 칩이 같은 이름을 써야 "이 예약이 저 종목 것" 이 보인다.
 */
const slotName = (h?: { slot: number; sector: string | null; name: string | null } | null) =>
    h ? (h.name ?? h.sector ?? `${h.slot + 1}번`) : "";

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
// 등분 매수 — 남은 현금을 몇 번에 나눠 쏠까. 비율 매수와 기준이 다르다(sizing.ts 참고).
// 2~5 면 실제로 쓰는 범위를 덮는다. 더 잘게는 비율 쪽이나 비중 맞추기로 간다.
const BUY_SPLITS = [2, 3, 4, 5];
// 비중 맞추기 눈금. 5%p 로 끊으면 손가락으로 짚을 수 있고 25·50·75 가 정확히 잡힌다.
const FIT_STEP = 5;
// 예약 가격도 값을 적는 대신 지금 값에서 얼마나 떨어진 자리인지로 고른다.
const RESERVE_STEPS = { down: [3, 5, 10], up: [5, 10, 20] };

// 여러 날 건너뛰기를 멈추는 문턱. 이만큼 움직인 날은 지나치면 손쓸 수 없다.
const JUMP_STOP_PCT = 7;
const SKIP_STEPS = [3, 5];
// 자동 재생 한 칸의 간격. 41일이 약 11초 — 캔들이 자라는 게 보이면서 지루하지는 않다.
// 판이 브라우저 안에서 도는 지금은 이 간격이 그대로 지켜진다(예전에는 하루마다 서버를
// 다녀오느라 뚝뚝 끊겼다).
const PLAY_MS = 260;

/**
 * 체크포인트를 흘려 보내기 전에 기다리는 시간.
 *
 * 판은 브라우저 안에서 돌지만 기기를 바꿔도 이어지려면 진행이 서버에도 남아야 한다.
 * 매 수마다 보내면 왕복을 없앤 뜻이 없어지므로, 손이 멈춘 뒤 한 번만 보낸다
 * (자동 재생 중에는 260ms 마다 미뤄져 끝나고 한 번 나간다).
 */
const CHECKPOINT_MS = 4_000;

/** 화면에 기억해 두는 설정. 판이 바뀌어도, 새로고침해도 남는다. */
const PREFS_KEY = "iq:game:prefs:v1";

// ── 이 화면의 색 규칙 ────────────────────────────────────────────────
//
//   빨강 = 오름 · 사기    파랑 = 내림 · 팔기
//   금색 = 내 것(평단·성과·비중·켜 둔 도구)    회색 = 벤치마크(상대)
//
// 초록은 쓰지 않는다. 예전에는 손실 수익률이 초록이라 "내렸다"가 캔들(파랑)과
// 글자(초록) 두 색이었고, 그 파랑은 개요의 "내 성과" 선과도 겹쳤다. 국내 증권앱
// 관습으로 맞추면 색이 네 계열에서 세 계열로 준다.
//
// 공용 pnlText(잔고·스크리너와 공유)는 손실이 초록이다. 그 화면들까지 바꾸는 건
// 이 작업 범위 밖이라, 게임 안에서만 쓰는 함수를 따로 둔다.
//
// 목업은 초록 BUY · 빨강 SELL 이지만 그건 서구 관습이다. 이 앱은 국내 증권앱을 따라
// 빨강이 사기·오름이고, 그 규칙이 차트 캔들부터 버튼까지 화면 전체를 관통한다.
// 겉모습을 바꾸자고 이 규칙을 뒤집으면 같은 화면 안에서 빨강이 두 뜻을 갖는다.
const UP_COLOR = "#e14b4b";
const DOWN_COLOR = "#3b82f6";
const MINE_COLOR = "#e3b34a";
const BENCH_COLOR = "#94a3b8";

// 같은 빨강·파랑이라도 바탕이 다르면 읽히는 밝기가 다르다. 창 몸통은 밝은 회색이고
// 브라운관 안은 검정이라, 한 쌍만 두면 어느 한쪽에서 반드시 흐려진다.
/** 창 몸통(밝은 회색) 위 — 어둡게. */
const pnlText = (positive: boolean) => (positive ? "text-[#9e1414]" : "text-[#1d4ed8]");
/** 브라운관(검정) 안 — 밝게. */
const pnlLit = (positive: boolean) => (positive ? "text-[#ff6b6b]" : "text-[#6aa9ff]");

// 도구가 그리는 선 색. 차트와 on/off 칩이 같은 색을 써야 어느 칩이 어느 선인지 안다.
const TOOL_COLOR: Record<string, string> = {
    ma: "#f59e0b", dc: "#0d9488", bb: "#94a3b8", atr: "#d946ef",
};

/**
 * 카드 안 미니 추세선. 값이 아니라 **모양**을 본다 — 네 종목 중 어느 게 오르는 중인지
 * 알려고 하나씩 눌러 들어가지 않아도 되게 하는 것이 전부다.
 *
 * recharts 를 네 번 띄우면 무거워서 폴리라인 하나로 직접 그린다.
 */
function Spark({ data, color }: { data: number[]; color: string }) {
    const W = 44, H = 14, PAD = 1.5;
    if (data.length < 2) return <svg width={W} height={H} aria-hidden="true" />;
    const lo = Math.min(...data), hi = Math.max(...data);
    const span = hi - lo || 1;
    const pts = data.map((v, i) =>
        `${PAD + (i / (data.length - 1)) * (W - PAD * 2)},${H - PAD - ((v - lo) / span) * (H - PAD * 2)}`);
    const [lx, ly] = pts[pts.length - 1].split(",");
    return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="shrink-0">
            <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.4"
                strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={lx} cy={ly} r="1.7" fill={color} />
        </svg>
    );
}

/**
 * 반기 트랙 — 이번 해 여덟 칸. 이긴 반기는 빨강, 진 반기는 파랑, 지금은 금색.
 *
 * "3년 중 6/24반기 지남"은 문자열이라 어디쯤 왔는지도, 어떻게 왔는지도 안 보인다.
 * 20년이면 160반기라 전부 늘어놓을 수는 없어서 **이번 해 것만** 그린다 — 지나온
 * 전부는 지난 분기의 자금 곡선이 맡는다.
 */
function HalfTrack({ campaign, history }: { campaign: Campaign; history: ReplayHistoryItem[] }) {
    const yearStart = Math.floor(campaign.half_index / HALVES_PER_YEAR) * HALVES_PER_YEAR;
    const done = new Map<number, ReplayHistoryItem>();
    for (const h of history) {
        if (h.campaign_id === campaign.id && typeof h.half_index === "number") done.set(h.half_index, h);
    }
    return (
        <span className="flex gap-[2px] w-full" aria-label="반기별 성적">
            {Array.from({ length: HALVES_PER_YEAR }, (_, i) => {
                const idx = yearStart + i;
                const rec = done.get(idx);
                const now = idx === campaign.half_index;
                const won = rec ? (rec.final_return ?? 0) >= (rec.bh_return ?? 0) : false;
                return (
                    <i key={idx}
                        title={rec ? `${halfLabel(idx)}반기 ${pct(rec.final_return ?? 0)}` : `${halfLabel(idx)}반기`}
                        className={cn("flex-1 h-[8px]",
                            now ? "bg-[#5cf08f]"
                                : rec ? (won ? "bg-[#e14b4b]" : "bg-[#3b82f6]")
                                    : "bg-white/12")} />
                );
            })}
        </span>
    );
}

/**
 * 자금 곡선 — 이 게임의 서사는 맡은 돈이 불거나 주는 이야기다. 그런데 그 곡선을
 * 볼 수 있는 화면이 어디에도 없었다.
 *
 * 값은 정산 때 서버가 남긴 aum_before/after 를 그대로 잇는다(다시 계산하지 않는다).
 * 벤치마크는 같은 반기의 bh_return 을 복리로 굴린 것 — 같은 돈으로 그냥 나눠 담았으면.
 */
function MoneyCurve({ history }: { history: ReplayHistoryItem[] }) {
    const rows = history.filter(h => h.aum_before !== null && h.aum_after !== null).slice().reverse();
    if (rows.length < 2) return null;

    const mine = [rows[0].aum_before!, ...rows.map(h => h.aum_after!)];
    const bench: number[] = [rows[0].aum_before!];
    for (const h of rows) bench.push(bench[bench.length - 1] * (1 + (h.bh_return ?? 0) / 100));

    const W = 280, H = 76, PAD = 3;
    const lo = Math.min(...mine, ...bench), hi = Math.max(...mine, ...bench);
    const span = hi - lo || 1;
    const at = (arr: number[], i: number) =>
        `${PAD + (i / (arr.length - 1)) * (W - PAD * 2)},${H - PAD - ((arr[i] - lo) / span) * (H - PAD * 2)}`;
    const line = (arr: number[]) => arr.map((_, i) => at(arr, i)).join(" ");
    const grew = mine[mine.length - 1] - mine[0];

    return (
        <div className="mb-2">
            <div className="flex items-baseline justify-between gap-2 mb-1 text-[11px]">
                <span className="font-bold uppercase tracking-[0.08em]" style={{ color: R.inkDim }}>맡은 돈</span>
                <span className="tabular-nums">
                    <b style={{ color: R.ink }}>{fmtMoney(mine[mine.length - 1])}</b>
                    <b className={cn("ml-1.5", pnlText(grew >= 0))}>
                        {grew >= 0 ? "▲" : "▼"} {fmtMoney(Math.abs(grew))}
                    </b>
                </span>
            </div>
            {/* 곡선은 브라운관 안에 — 이 화면에서 선이 그어지는 자리는 전부 검다. */}
            <Crt className="px-1 py-1">
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="72" preserveAspectRatio="none"
                    role="img" aria-label={`${rows.length}반기 자금 곡선`}>
                    <polyline points={line(bench)} fill="none" stroke={BENCH_COLOR} strokeWidth="1.4" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
                    <polyline points={line(mine)} fill="none" stroke={MINE_COLOR} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
            </Crt>
            <div className="flex items-center gap-3 mt-1 text-[11px]">
                <span className="flex items-center gap-1" style={{ color: "#7a4f00" }}>
                    <i className="w-2.5 h-[2px] bg-[#e3b34a] block" /> 내 자금
                </span>
                <span className="flex items-center gap-1" style={{ color: R.inkDim }}>
                    <i className="w-2.5 h-[2px] bg-[#94a3b8] block" /> 그냥 나눠 담기
                </span>
                <span className="ml-auto tabular-nums" style={{ color: R.inkDim }}>{rows.length}반기</span>
            </div>
        </div>
    );
}

/**
 * 그 판에서 지금까지 열린 마지막 종가.
 *
 * 판을 인자로 받는다 — 균등 맞추기가 주문을 잇달아 내면서 갱신된 판으로 다음 값을 봐야 해서,
 * 화면 상태에 매달린 함수로는 안 된다.
 */
const closeIn = (r: ReplayRound, h: { candles: { c: number }[] }) => {
    const upto = r.status === "done" ? h.candles.length : r.cursor;
    return h.candles[Math.max(0, upto - 1)]?.c ?? 0;
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
    // 지금 자세히 보고 있는 자리(종목). 판이 바뀌면 첫 자리로 돌아간다.
    const [slot, setSlot] = useState(0);
    // 네 종목을 한눈에 보는 개요(phase 2)와 한 종목을 파고드는 상세를 오간다.
    // 종목이 하나뿐인 판(체험 운용·옛 판)에는 개요가 없다 — 볼 것이 하나뿐이다.
    const [detail, setDetail] = useState(false);
    // 방금 기간이 끝난 캠페인 — 최종 리포트를 띄울 때까지 들고 있는다.
    const [endedCampaign, setEndedCampaign] = useState<Campaign | null>(null);
    // 방금 회사가 문을 닫았다. 서버만 아는 값이다 — 판정에 쓰는 최고점이 이미 새 회사
    // 값으로 덮여 있어 화면이 스스로 되짚을 수 없다.
    const [ruined, setRuined] = useState(false);
    const [habits, setHabits] = useState<HabitSummary | null>(null);
    const [bestReturn, setBestReturn] = useState<number | null>(null);
    // 산 도구 중 지금 켜 둔 것. 사자마자 켜진다.
    const [activeTools, setActiveTools] = useState<string[]>([]);
    // 산 부서가 이 판의 규칙을 얼마나 바꾸는가. 예약 한도와 마진콜 선이 여기서 나온다.
    // (정산은 워커가 같은 걸 다시 계산한다 — 화면 값을 믿고 저장하지 않는다)
    const perks = useMemo(() => perksOf(firm?.tools), [firm?.tools]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    // 체결 직후 계좌 줄을 한 번 물들인다. 값이 어디서 달라졌는지 눈이 못 따라가서,
    // 눌렀는데 아무 일도 안 일어난 것처럼 보였다. 카운터가 바뀔 때마다 다시 돈다.
    const [filled, setFilled] = useState(0);
    const markFilled = useCallback(() => setFilled(n => n + 1), []);
    // 예약 패널 — 접었다 편다. 모바일은 한 화면이 빡빡해 기본은 접어 둔다.
    const [reserveOpen, setReserveOpen] = useState(false);
    // 시작 화면을 지났나. 이것만은 데이터로 알 수 없어 따로 든다.
    const [entered, setEntered] = useState(false);
    /**
     * 준비 화면에서 [장 열기] 를 눌렀나.
     *
     * 종목이 뽑히자마자 차트로 떨어뜨리면 무엇을 하러 들어왔는지 읽을 자리가 없다.
     * 뽑힌 자리 넷과 이번 고객·목표를 한 번 보여 준 뒤에 들어간다.
     *
     * 새로고침해도 아직 하루도 안 넘긴 판이면 준비 화면이 다시 뜬다 — 시작한 적이
     * 없으니 그게 맞다(아래 phase 계산이 데이터로 한 번 더 거른다).
     */
    const [briefed, setBriefed] = useState(false);
    // 사기 줄의 눈금 — 내 돈의 몇 %(part)냐, 내 돈을 몇 등분한 한 몫(split)이냐.
    const [buyMode, setBuyMode] = useState<"part" | "split">("part");
    /**
     * 매매 줄을 빌려서 팔기(공매도)로 바꾼다.
     *
     * 줄을 넷으로 늘리는 대신 두 줄을 갈아 끼운다 — 화면 높이가 그대로고, 지금 무엇을
     * 하려는지가 한눈에 갈린다. 기억해 두지 않는다(설정에 안 넣는다): 다음에 들어왔을 때
     * 공매도 줄이 먼저 떠 있으면 사려다 빌려 파는 사고가 난다.
     */
    const [shortMode, setShortMode] = useState(false);
    // 비중 맞추기 패널. 예약과 같은 방식으로 접었다 편다.
    const [fitOpen, setFitOpen] = useState(false);
    const [target, setTarget] = useState(50);
    // 어떤 자리에서 시작할까(설정 화면에서 고른 값). 결과 화면에서 바로 다음 반기를
    // 시작할 때도 이 값을 쓴다 — 매번 같은 자리를 고르는 사람에게 설정은 문일 뿐이다.
    const [wantScenario, setWantScenario] = useState<string | null>(null);

    /* 골라 둔 것을 기억한다. 반기마다 같은 값을 다시 맞추는 것이 이 화면에서 가장
       잦은 헛손질이었다. 계산기가 쓰는 방식과 같다 — 깨져 있으면 기본값으로 시작한다. */
    const prefsRead = useRef(false);
    useEffect(() => {
        if (prefsRead.current) return;
        prefsRead.current = true;
        try {
            const raw = localStorage.getItem(PREFS_KEY);
            if (!raw) return;
            const p = JSON.parse(raw);
            if (p.buyMode === "part" || p.buyMode === "split") setBuyMode(p.buyMode);
            if (typeof p.target === "number" && p.target >= 0 && p.target <= 100) setTarget(p.target);
            if (p.wantScenario === null || SCENARIOS.some(s => s.id === p.wantScenario)) setWantScenario(p.wantScenario ?? null);
        } catch { /* 기본값으로 시작한다 — 화면을 막을 일은 아니다 */ }
    }, []);
    useEffect(() => {
        if (!prefsRead.current) return;
        try {
            localStorage.setItem(PREFS_KEY, JSON.stringify({ buyMode, target, wantScenario }));
        } catch { /* 저장 못 해도 판은 돈다 */ }
    }, [buyMode, target, wantScenario]);
    const [resKind, setResKind] = useState<Reservation["kind"]>("buy_limit");
    // 값 대신 "지금 값에서 몇 % 떨어진 자리"와 "얼마만큼"으로 고른다.
    const [resStep, setResStep] = useState(5);
    const [resPart, setResPart] = useState(50);

    // 비로그인 판을 만들 때 쓸 종목 풀. 로그인은 서버가 알아서 뽑는다.
    //
    // status 가 "loading" 인 동안은 부르지 않는다 — 세션이 확정되기 전에는 isLoggedIn 이
    // false 라, 로그인한 사람도 들어오자마자 이 목록을 한 번 받아 갔다(쓰지도 않는데).
    // 풀은 종목 이름·값만 쓰므로 200개면 충분하다(2,500개는 압축 전 1.3MB 다).
    useEffect(() => {
        if (status === "loading" || isLoggedIn) return;
        dispatch(reqGetNcavDailyList({ date: "latest", limit: 200 }));
    }, [status, isLoggedIn, dispatch]);

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
                setSlot(0); setDetail(false);   // 새 판은 개요부터, 첫 자리부터
                setBriefed(false);              // 새 판은 준비 화면부터
                setRound(res.round);
            } else {
                if (!localPool.length) { addToast("error", "종목 목록을 아직 불러오는 중입니다."); return; }
                const built = await buildLocalRound(localPool);
                if (!built) { addToast("error", "판을 만들지 못했습니다. 다시 시도해주세요."); return; }
                setBriefed(false);
                setRound(built);
            }
        } finally {
            setBusy(false);
        }
    }, [isLoggedIn, localPool, addToast]);

    /* ── 진행을 서버에 흘려 보낸다 ────────────────────────────────────
       판은 브라우저 안에서 돌지만(lib/paper/half.ts) 기기를 바꿔도 이어지려면 진행이
       서버에도 남아야 한다. 손이 멈춘 뒤 한 번만 보내고, 응답은 기다리지 않는다. */
    const cpTimer = useRef<number | null>(null);
    const cpRound = useRef<ReplayRound | null>(null);

    /** 밀린 체크포인트를 지운다. 보내지 않는다. */
    const dropCheckpoint = useCallback(() => {
        if (cpTimer.current) { window.clearTimeout(cpTimer.current); cpTimer.current = null; }
        const r = cpRound.current;
        cpRound.current = null;
        return r;
    }, []);

    const flushCheckpoint = useCallback(() => {
        const r = dropCheckpoint();
        if (r && r.status === "playing") checkpointHalf(halfCheckpoint(r));
    }, [dropCheckpoint]);

    const queueCheckpoint = useCallback((r: ReplayRound) => {
        if (!isLoggedIn || r.status !== "playing") return;
        cpRound.current = r;
        if (cpTimer.current) window.clearTimeout(cpTimer.current);
        cpTimer.current = window.setTimeout(flushCheckpoint, CHECKPOINT_MS);
    }, [isLoggedIn, flushCheckpoint]);

    // 탭을 닫거나 다른 화면으로 갈 때 밀린 체크포인트를 보낸다. keepalive 라 닫는 중에도 간다.
    useEffect(() => {
        window.addEventListener("pagehide", flushCheckpoint);
        return () => { window.removeEventListener("pagehide", flushCheckpoint); flushCheckpoint(); };
    }, [flushCheckpoint]);

    /**
     * 반기 마감 — 브라우저가 굴린 결과를 제출하고, 서버가 정산까지 채운 판으로 갈아 끼운다.
     *
     * 결과 화면이 쓸 것(지난 분기·회사·지갑·습관·캠페인)이 이 응답에 함께 온다 — 예전에는
     * 마감하고 상태를 한 번 더 물어봤는데, 반기당 왕복을 둘로 줄이는 것이 이 작업의 요지다.
     */
    const submit = useCallback(async (finished: ReplayRound) => {
        // 밀린 체크포인트는 버린다 — 제출이 그보다 나중이고 더 많은 것을 담고 있다.
        dropCheckpoint();
        let res = await submitHalf(halfSubmission(finished));
        if (!res.success && res.status === 0) res = await submitHalf(halfSubmission(finished));
        if (!res.success) {
            // 화면에는 결과가 떠 있지만 서버에는 아직 진행 중인 판이다. 새로고침하면 마지막
            // 체크포인트에서 이어지므로, 무슨 일이 났는지 말해 주는 것이 할 수 있는 전부다.
            addToast("error", "결과를 저장하지 못했습니다. 새로고침하면 굴리던 판에서 이어집니다.");
            return;
        }
        setRound(res.round);
        setHistory(res.history ?? []);
        setFirm(res.firm ?? null);
        setHabits(res.habits ?? null);
        setBestReturn(res.wallet?.best_return ?? null);
        setRuined(!!res.ruined);
        // 마지막 반기였으면 굴러가는 캠페인이 없다 — 그때는 기간이 끝난 것이다.
        // 문을 닫아도 캠페인이 사라지지만 그건 완주가 아니라 폐업이라 따로 말한다.
        if (campaign && !res.campaign && !res.ruined) setEndedCampaign(campaign);
        setCampaign(res.campaign ?? null);
    }, [campaign, addToast, dropCheckpoint]);

    // 어느 판에서 출발하는지 인자로 받는다 — 여러 날 건너뛰기가 앞선 판을 이어받아야 해서,
    // 클로저에 잡힌 옛 round 로는 같은 날을 반복한다.
    //
    // trade 는 체험 운용에만 온다. 종목이 하나뿐이던 시절에는 "사면 하루가 지난다"였는데,
    // 넷을 굴리는 판에서는 같은 날 둘을 사고 하나를 파는 게 당연한 일이라 시간과 매매를
    // 갈라 뒀다(로그인 판의 매매는 tradeFrom 이 받는다).
    const advanceFrom = useCallback(async (
        from: ReplayRound, trade?: { side: "buy" | "sell"; qty: number; slot?: number } | null, carry?: boolean,
    ): Promise<ReplayRound | null> => {
        if (from.status !== "playing") return null;

        if (!isLoggedIn) {
            setBusy(true);
            try {
                const res = advanceLocal(from, trade);
                if (!res.ok) { addToast("error", res.error); return null; }
                setRound(res.round);
                return res.round;
            } finally {
                setBusy(false);
            }
        }

        // 하루 넘기기는 브라우저 안에서 끝난다 — 캔들이 이미 여기 있다.
        const res = halfAdvance(from, { carry: carry === true, perks });
        if (!res.ok) { addToast("error", res.error); return null; }
        setRound(res.round);
        // 강제 청산은 내가 누른 게 아니라 담보가 못 버틴 것이다. 조용히 지나가면
        // 다음 화면에서 "빌린 게 왜 없지" 가 된다.
        if (res.called) {
            addToast("error", res.called > 1
                ? `담보가 못 버텨 ${res.called}자리를 강제로 갚았습니다.`
                : "담보가 못 버텨 강제로 갚았습니다.");
        }
        if (res.done) {
            setBusy(true);
            try { await submit(res.round); } finally { setBusy(false); }
        } else {
            queueCheckpoint(res.round);
        }
        return res.round;
    }, [isLoggedIn, perks, addToast, submit, queueCheckpoint]);

    const advance = useCallback(async (
        trade?: { side: "buy" | "sell"; qty: number; slot?: number } | null, carry?: boolean,
    ) => {
        if (!round) return;
        await advanceFrom(round, trade, carry);
    }, [round, advanceFrom]);

    /**
     * 오늘 사고팔기 — 날짜는 그대로다(phase 2).
     *
     * 종목이 넷이면 같은 날 둘을 사고 하나를 파는 게 당연한 일이다. 시간은 관망 줄에서만
     * 흐른다(phase 3). 체험 운용은 종목 하나짜리라 예전처럼 매매가 곧 하루다.
     *
     * 어느 판에서 출발하는지 인자로 받고 새 판을 돌려준다 — 균등 맞추기가 주문을 여러 건
     * 잇달아 내는데, 클로저에 잡힌 옛 round 로 다음 수량을 잡으면 이미 쓴 현금을 또 쓴다.
     * `busy` 는 여기서 건드리지 않는다. 한 건짜리와 여러 건짜리가 각자 감싼다.
     */
    const tradeFrom = useCallback(async (
        from: ReplayRound, side: TradeSide, qty: number, atSlot: number,
    ): Promise<ReplayRound | null> => {
        if (from.status !== "playing" || qty < 1) return null;
        if (!isLoggedIn) {
            // 체험 운용은 롱만이다 — 화면에서도 공매도 토글을 안 띄운다.
            if (side !== "buy" && side !== "sell") return null;
            const res = await advanceFrom(from, { side, qty });
            if (res) markFilled();
            return res;
        }
        // 체결은 브라우저 안에서 끝난다. 예전에는 여기서 서버를 다녀왔고, 그동안 사기·팔기·
        // 관망 버튼이 전부 회색으로 죽어 있었다.
        const res = halfTrade(from, { side, qty, slot: atSlot });
        if (!res.ok) { addToast("error", res.error); return null; }
        setRound(res.round);
        markFilled();
        queueCheckpoint(res.round);
        return res.round;
    }, [isLoggedIn, advanceFrom, addToast, markFilled, queueCheckpoint]);

    const trade = useCallback(async (side: TradeSide, qty: number, atSlot: number) => {
        if (!round) return;
        setBusy(true);
        try {
            await tradeFrom(round, side, qty, atSlot);
        } finally {
            setBusy(false);
        }
    }, [round, tradeFrom]);

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

    /**
     * 자동 재생 — 41일을 손으로 넘기지 않는다.
     *
     * 건너뛰기(skipDays)와 같은 규칙으로 서되, 세울 이유를 하나 더 본다: 걸어 둔 예약이
     * 체결되면 멈춘다. 예약이 걸렸다는 건 "여기 오면 봐 달라"고 표시해 둔 자리라,
     * 그냥 지나가면 걸어 둔 뜻이 없어진다.
     *
     * 멈춤 스위치는 ref 다. 상태로만 두면 돌고 있는 루프가 옛 값을 보고 못 선다.
     */
    const autoRef = useRef(false);
    const [auto, setAuto] = useState(false);

    const stopAuto = useCallback(() => { autoRef.current = false; setAuto(false); }, []);

    /**
     * 지금 주문을 낼 수 없는 상태.
     *
     * 재생 중에 매매를 열어 두면 어느 날 가격에 체결된 것인지 누른 사람도 모르게 된다.
     * 재생은 보는 시간이고, 사려면 세우면 된다.
     */
    const locked = busy || auto;

    const startAuto = useCallback(async () => {
        if (!round || round.status !== "playing" || autoRef.current) return;
        autoRef.current = true;
        setAuto(true);
        try {
            let cur: ReplayRound | null = round;
            while (autoRef.current && cur && cur.status === "playing") {
                const before = cur.candles[cur.cursor - 1]?.c ?? 0;
                const pendingBefore = (cur.pending ?? []).length;
                const owedBefore = (cur.holdings ?? []).reduce((a, h) => a + (h.short_qty ?? 0), 0);

                const next: ReplayRound | null = await advanceFrom(cur, null);
                if (!next) break;
                cur = next;
                if (next.status !== "playing") break;

                const after = next.candles[next.cursor - 1]?.c ?? 0;
                const move = before > 0 ? ((after - before) / before) * 100 : 0;
                if (Math.abs(move) >= JUMP_STOP_PCT) {
                    addToast("info", `하루에 ${move >= 0 ? "+" : ""}${move.toFixed(1)}% 움직여 멈췄습니다.`);
                    break;
                }
                if ((next.pending ?? []).length < pendingBefore) {
                    addToast("info", "예약이 체결되어 멈췄습니다.");
                    break;
                }
                // 재생 중에는 내가 갚을 수 없다 — 빌린 것이 줄었으면 강제 청산뿐이다.
                // (무슨 일이 났는지는 advanceFrom 이 이미 알렸다)
                if ((next.holdings ?? []).reduce((a, h) => a + (h.short_qty ?? 0), 0) < owedBefore) break;
                await new Promise(r => setTimeout(r, PLAY_MS));
            }
        } finally {
            autoRef.current = false;
            setAuto(false);
        }
    }, [round, advanceFrom, addToast]);

    // 판이 끝나거나 화면을 떠나면 재생도 끝난다. 루프가 남아 돌면 다음 판의 첫날이
    // 저 혼자 지나간다.
    useEffect(() => {
        if (!round || round.status !== "playing") autoRef.current = false;
    }, [round]);
    useEffect(() => () => { autoRef.current = false; }, []);

    /**
     * 판이 도는 동안의 키보드.
     *
     * 41일을 넘기는 동작만 손에서 뗀다. **사고파는 키는 두지 않는다** — 이 게임에는
     * 되돌리기가 없어서, 한 번 잘못 누른 매수는 수수료와 거래세를 물고 되팔아야만
     * 없앨 수 있다. 그런 것을 한 글쇠에 걸어 두지 않는다.
     */
    useEffect(() => {
        if (!round || round.status !== "playing") return;
        // holdings 는 아래에서 만든다 — 여기서 쓰면 선언 전에 읽는 꼴이라 판에서 바로 꺼낸다.
        const slots = round.holdings?.length ?? 0;
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            // 글자를 치는 중이면 그건 이 화면에 하는 말이 아니다
            const t = e.target as HTMLElement | null;
            if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;

            if (e.key === " " || e.key === "Spacebar") {
                // 스페이스를 막지 않으면 페이지가 스크롤되고, 눌러 둔 버튼이 다시 눌린다
                e.preventDefault();
                if (autoRef.current) stopAuto(); else startAuto();
                return;
            }
            if (autoRef.current) return;   // 재생 중에는 재생/멈춤 말고는 받지 않는다
            if (e.key === "ArrowRight") { e.preventDefault(); advance(null); return; }
            if (e.key === "Escape" && slots > 1) { setDetail(false); return; }
            const n = Number(e.key);
            if (slots > 1 && n >= 1 && n <= slots) { setSlot(n - 1); setDetail(true); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [round, startAuto, stopAuto, advance]);

    const giveUp = useCallback(async () => {
        if (!round || round.status !== "playing") return;
        setBusy(true);
        try {
            if (!isLoggedIn) { setRound(giveUpLocal(round)); return; }
            // 중도 포기도 반기가 끝난 것이다 — 그날 종가로 청산하고 그대로 제출한다.
            const res = halfGiveUp(round);
            if (!res.ok) { addToast("error", res.error); return; }
            setRound(res.round);
            await submit(res.round);
        } finally {
            setBusy(false);
        }
    }, [round, isLoggedIn, addToast, submit]);

    const reset = useCallback(() => {
        if (!isLoggedIn) saveLocal(null);
        setRound(null);
    }, [isLoggedIn]);

    /**
     * 결과 화면에서 곧바로 다음 반기로.
     *
     * 설정 화면을 건너뛰고 기억해 둔 자리로 종목을 뽑아 **준비 화면**으로 간다. 자리
     * 성격을 매번 고르지 않는 사람에게 설정은 지나가는 문일 뿐이다. 바꾸고 싶으면 그
     * 옆의 "설정으로" 를 누른다.
     *
     * 기간이 끝났거나(최종 결과를 봐야 한다) 굴러가는 캠페인이 없으면(기간부터 골라야
     * 한다) 판을 열지 않는다 — 그때는 설정이 지나가는 문이 아니다.
     */
    const nextHalf = useCallback(async () => {
        reset();
        if (endedCampaign) return;
        if (isLoggedIn && !campaign) return;
        await start(wantScenario);
    }, [reset, endedCampaign, isLoggedIn, campaign, start, wantScenario]);

    // ── 화면에 그릴 값 ───────────────────────────────────────
    // 한 반기에 종목 넷. 화면은 한 번에 하나를 자세히 보여 주고(고른 자리), 계좌는 넷을 합친다.
    // 옛 판·체험 운용에는 holdings 가 없다 — 그때는 판 자체가 종목 하나였다.
    const holdings = round?.holdings ?? [];
    const sel = holdings.find(h => h.slot === slot) ?? holdings[0] ?? null;

    // 네 종목을 한눈에 보는 개요(phase 2)인가, 한 종목을 파고드는 상세인가.
    // 종목이 하나뿐인 판에는 개요가 없다 — 볼 것이 하나뿐이다.
    const overview = holdings.length > 1 && !detail;

    /**
     * 이번 반기의 고객과 목표.
     *
     * 판이 들고 있는 값(campaign_id·half_index)을 먼저 본다 — 반기가 끝나면 캠페인은
     * 다음 칸으로 밀리므로, 결과 화면에서 campaign 을 보면 방금 끝낸 반기가 아니라
     * 다음 반기의 목표가 뜬다.
     */
    const season = useMemo(
        () => seasonOf(round?.campaign_id ?? campaign?.id, round?.half_index ?? campaign?.half_index),
        [round?.campaign_id, round?.half_index, campaign?.id, campaign?.half_index],
    );

    /**
     * 지금까지 열린 구간만.
     *
     * 판은 캔들을 전부 들고 있다 — 브라우저 안에서 굴러가야 해서다. 화면에 그리는 것은
     * 반드시 이걸 거친다. 여기를 빼먹으면 앞날이 차트에 그대로 그려진다.
     */
    const openOnly = useCallback((src: Candle[]): Candle[] =>
        (round ? src.slice(0, round.status === "done" ? src.length : round.cursor) : []),
        [round]);

    /** 고른 자리의 캔들 — 값·평단·매매 수량이 여기서 나온다. */
    const selVisible = useMemo(
        () => openOnly(sel?.candles ?? round?.candles ?? []), [openOnly, sel, round]);
    /** 차트에 그릴 것 — 개요면 판 전체 지수, 상세면 그 종목. */
    const visible = useMemo(
        () => (overview ? openOnly(round?.candles ?? []) : selVisible), [overview, openOnly, round, selVisible]);

    const today = selVisible[selVisible.length - 1];
    const price = today?.c ?? 0;
    // 고른 자리의 보유 — 사고팔기 버튼이 보는 값이다
    const heldQty = sel ? sel.qty : (round?.qty ?? 0);
    const heldCost = sel ? sel.cost_basis : (round?.cost_basis ?? 0);
    const avg = avgPrice({ qty: heldQty, cost_basis: heldCost });

    /** 그 자리의 최근 25일 종가. 카드 미니 추세선이 쓴다. */
    const closesOf = useCallback((h: { candles: { c: number }[] }) => {
        if (!round) return [];
        const upto = round.status === "done" ? h.candles.length : round.cursor;
        return h.candles.slice(Math.max(0, upto - 25), upto).map(c => c.c);
    }, [round]);

    /** 그 자리의 마지막 공개 종가. 자리마다 값이 달라 계좌 합계를 낼 때 쓴다. */
    const lastCloseOf = useCallback((h: { candles: { c: number }[] }) =>
        (round ? closeIn(round, h) : 0), [round]);

    // 계좌는 넷을 합친다 — 현금은 판에 하나뿐이고 평가금액은 자리마다 따로다
    const marketValue = holdings.length
        ? holdings.reduce((a, h) => a + h.qty * lastCloseOf(h), 0)
        : price * (round?.qty ?? 0);

    /**
     * 빌려서 판 것의 평가손익과, 그 때문에 묶여 있는 담보.
     *
     * 담보는 이미 현금에서 빠져 있다(공매도할 때 나갔다). 그래서 내 돈에 더할 것은
     * **평가손익뿐**이다 — 담보까지 더하면 같은 돈을 두 번 세게 된다.
     */
    const shortPnlNow = holdings.reduce((a, h) => a + shortPnl(
        { short_qty: h.short_qty ?? 0, short_basis: h.short_basis ?? 0 }, lastCloseOf(h)), 0);
    const lockedCollateral = holdings.reduce((a, h) => a + (h.short_basis ?? 0), 0);

    const totalAssets = (round?.cash ?? 0) + marketValue + shortPnlNow;
    const totalPnl = totalAssets - (round?.seed ?? 0);
    const totalRate = round?.seed ? (totalPnl / round.seed) * 100 : 0;

    /**
     * 자리별 비중 — 내 돈에서 그 종목이 차지하는 몫(%). 나머지가 현금이다.
     *
     * 수익률만 보면 "한 종목에 몰빵했는데 조금 올랐다"와 "고르게 담았는데 조금 올랐다"가
     * 똑같아 보인다. 다음에 얼마를 더 살지는 결국 지금 얼마를 담고 있느냐로 정해진다.
     */
    const weights = useMemo(() => holdings.map(h => ({
        slot: h.slot,
        sector: h.sector,
        pct: totalAssets > 0 ? ((h.qty * lastCloseOf(h)) / totalAssets) * 100 : 0,
    })), [holdings, totalAssets, lastCloseOf]);
    const cashPct = totalAssets > 0 ? ((round?.cash ?? 0) / totalAssets) * 100 : 100;

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

    // 몇 주를 살까·팔까 하는 셈은 전부 lib/paper/sizing.ts 에 있다(테스트가 붙어 있다).
    // 여기서는 지금 화면의 값을 그 함수들에 넘겨 주기만 한다.
    const buyQtyFor = useCallback((pct: number, atPrice = price) =>
        partBuyQty({ pct, price: atPrice, cash: round?.cash ?? 0, totalAssets }),
        [round?.cash, totalAssets, price]);

    const sellQtyFor = useCallback((pct: number) => sellPartQty(heldQty, pct), [heldQty]);

    /* ── 빌려서 팔기 ────────────────────────────────────────────
       담보는 **묶이지 않은** 현금에서만 나온다 — 한 자리에 걸어 둔 만큼 다른 자리에 쓸
       돈이 줄어야 "빌린 돈으로 더 크게 굴리는 길은 없다"가 지켜진다. */
    const freeCash = Math.max(0, (round?.cash ?? 0) - lockedCollateral);
    const shortQtyFor = useCallback((pct: number) =>
        partShortQty({ pct, price, cash: freeCash, totalAssets }),
        [freeCash, totalAssets, price]);

    /** 이 자리에서 빌린 수량과 담보. 갚기 줄이 보는 값이다. */
    const owedQty = sel?.short_qty ?? 0;
    const coverQtyFor = useCallback((pct: number) => sellPartQty(owedQty, pct), [owedQty]);

    /** 내 돈을 n등분한 한 몫 — 사기 줄이 등분 모드일 때. */
    const splitQtyFor = useCallback((parts: number) =>
        splitBuyQty({ parts, price, cash: round?.cash ?? 0, totalAssets }),
        [round?.cash, totalAssets, price]);

    /** 지금 주식이 내 돈에서 차지하는 몫. 나머지가 현금이다. */
    const stockPct = 100 - cashPct;

    /** 자리가 여럿이면 균등 맞추기, 하나면 그 자리를 목표 비중에 맞추기. */
    const manySlots = holdings.length > 1;

    /** 자리 하나짜리 판에서 쓰는 주문. 되돌릴 것이 없으면 null 이라 버튼이 죽는다. */
    const fitOrder = useMemo(() => manySlots ? null : rebalanceOrder({
        targetPct: target, price, cash: round?.cash ?? 0, held: heldQty, totalAssets,
    }), [manySlots, target, price, round?.cash, heldQty, totalAssets]);

    /** 자리가 여럿일 때의 계획. 버튼에 "각 얼마 · 몇 건"을 적는 데 쓴다. */
    const fitPlan = useMemo(() => {
        if (!manySlots || !round) return null;
        return equalWeightPlan({
            slots: holdings.map(h => ({ slot: h.slot, price: lastCloseOf(h), held: h.qty })),
            cash: round.cash, stockPct: target,
        });
    }, [manySlots, round, holdings, lastCloseOf, target]);

    /**
     * 전 자리 균등 — 한 번 눌러 현금 비중을 남기고 나머지를 자리마다 똑같이 담는다.
     *
     * 계획에서 가져오는 것은 **순서**뿐이다(파는 것이 먼저). 수량은 매번 방금 돌아온 판으로
     * 다시 잡는다 — 앞 주문이 체결되면 현금이 달라져서, 미리 잡아 둔 수량으로는 뒤쪽이
     * 현금 부족으로 튕긴다. 목표 금액만은 처음 값을 그대로 쓴다. 매 단계 다시 계산하면
     * 수수료로 줄어든 자산을 따라 목표가 함께 내려가 자리마다 다른 금액이 된다.
     */
    const balanceAll = useCallback(async () => {
        if (!round || round.status !== "playing" || !fitPlan || !fitPlan.orders.length) return;
        setBusy(true);
        try {
            let cur: ReplayRound | null = round;
            for (const o of fitPlan.orders) {
                if (!cur) break;
                const h = cur.holdings?.find(x => x.slot === o.slot);
                if (!h) continue;
                const at = closeIn(cur, h);
                const fresh = fitToValue({ targetValue: fitPlan.targetValue, price: at, cash: cur.cash, held: h.qty });
                if (!fresh) continue;
                cur = await tradeFrom(cur, fresh.side, fresh.qty, o.slot);
            }
        } finally {
            setBusy(false);
        }
    }, [round, fitPlan, tradeFrom]);

    // 예약 가격 — 익절은 위로, 나머지는 아래로.
    const resPriceAt = useCallback((step: number) =>
        Math.max(1, Math.round(price * (resKind === "take_profit" ? 1 + step / 100 : 1 - step / 100))),
        [price, resKind]);
    // 예약 수량 — 사는 예약은 그 가격 기준 현금 비율, 파는 예약은 보유 비율.
    const resQtyFor = useCallback((part: number) =>
        resKind === "buy_limit" ? buyQtyFor(part, resPriceAt(resStep)) : sellQtyFor(part),
        [resKind, resStep, buyQtyFor, sellQtyFor, resPriceAt]);

    const reserve = useCallback(() => {
        if (!round) return;
        const p = resPriceAt(resStep), n = resQtyFor(resPart);
        // 지금 보고 있는 자리에 건다. 값도 수량도 이 자리 것으로 잡았으니 판정도
        // 이 자리에서 나야 한다 — 안 보내면 0번 자리 예약이 된다.
        const at = sel?.slot ?? 0;
        const res = halfReserve(round, { kind: resKind, price: p, qty: n, slot: at }, perks);
        if (!res.ok) { addToast("error", res.error); return; }
        setRound(res.round);
        queueCheckpoint(res.round);
        const where = holdings.length > 1 ? `${slotName(holdings[at])} · ` : "";
        addToast("success", `${where}${reserveLabel(resKind)} ${p.toLocaleString()}원 ${n}주를 걸어 뒀습니다.`);
    }, [round, sel, holdings, perks, resKind, resStep, resPart, resPriceAt, resQtyFor, addToast, queueCheckpoint]);

    const unreserve = useCallback((index: number) => {
        if (!round) return;
        const res = halfCancel(round, index);
        if (!res.ok) { addToast("error", res.error); return; }
        setRound(res.round);
        queueCheckpoint(res.round);
    }, [round, addToast, queueCheckpoint]);

    const purchase = useCallback(async (toolId: string) => {
        setBusy(true);
        try {
            const res = await buyTool(toolId);
            if (!res.success) { addToast("error", res.error); return; }
            setFirm(res.firm ?? null);
            setActiveTools(res.firm?.tools ?? []);   // 사면 바로 켠다
            addToast("success", DEPARTMENTS.some(d => d.id === toolId)
                ? "부서를 열었습니다. 다음 반기부터 바뀐 규칙으로 굴러갑니다."
                : "도구를 들였습니다. 차트 위 이름을 눌러 판이 도는 중에도 껐다 켤 수 있습니다.");
        } finally {
            setBusy(false);
        }
    }, [addToast]);

    const toggleTool = useCallback((id: string) => {
        setActiveTools(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    }, []);

    /**
     * 판 전체(현금 + 네 자리 평가금액)의 값을 지수 눈금으로 옮긴 곡선.
     *
     * 벤치마크(네 종목을 1/4 씩 담은 지수)와 같은 축에 놓아야 "그냥 나눠 담았을 때보다
     * 나은가"가 그림으로 보인다. 값은 체결 기록으로 되짚는다 — 진행 중 응답에는 지난 날의
     * 잔고가 없고, 수수료를 빼면 곡선이 실제 계좌와 어긋난다.
     */
    const portfolioCurve = useMemo(() => {
        if (!round || holdings.length < 2 || benchBase <= 0) return null;
        const byDay = new Map<number, { slot: number; side: string; qty: number; price: number }[]>();
        for (const h of holdings) {
            for (const o of h.orders ?? []) {
                const a = byDay.get(o.day_index);
                const rec = { slot: h.slot, side: o.side, qty: o.qty, price: o.price };
                if (a) a.push(rec); else byDay.set(o.day_index, [rec]);
            }
        }
        let cash = round.seed;
        const pos = new Map<number, { ticker: string; name: string | null; qty: number; cost_basis: number }>();
        // 빌려서 판 자리도 따라간다 — 안 그리면 공매도로 굴린 반기의 곡선이 통째로 거짓이 된다.
        const shorts = new Map<number, { short_qty: number; short_basis: number }>();
        for (const h of holdings) {
            pos.set(h.slot, { ticker: String(h.slot), name: null, qty: 0, cost_basis: 0 });
            shorts.set(h.slot, { short_qty: 0, short_basis: 0 });
        }

        const out: (number | null)[] = [];
        for (let i = 0; i < visible.length; i++) {
            for (const o of byDay.get(i) ?? []) {
                const p = pos.get(o.slot)!;
                const s = shorts.get(o.slot)!;
                if (o.side === "buy") {
                    const q = quoteBuy({ price: o.price, qty: o.qty, cash });
                    if (q.ok) { cash -= q.total; Object.assign(p, applyBuy(p, q)); }
                } else if (o.side === "sell") {
                    const q = quoteSell({ price: o.price, qty: o.qty, position: p });
                    if (q.ok) { cash += q.net; Object.assign(p, applySell(p, q)); }
                } else if (o.side === "short") {
                    // 개시에는 현금이 안 움직인다 — 담보만 묶인다(engine.ts).
                    const q = quoteShort({ price: o.price, qty: o.qty, cash: Number.MAX_SAFE_INTEGER });
                    if (q.ok) { s.short_qty += q.qty; s.short_basis += q.net; }
                } else {
                    const q = quoteCover({ price: o.price, qty: o.qty, position: s });
                    if (q.ok) { cash += q.realized; Object.assign(s, applyCover(s, q)); }
                }
            }
            const mv = holdings.reduce((a, h) => {
                const c = h.candles[i]?.c ?? 0;
                return a + (pos.get(h.slot)?.qty ?? 0) * c + shortPnl(shorts.get(h.slot), c);
            }, 0);
            out.push(i >= ctxDays - 1 ? Math.round(((cash + mv) / round.seed) * benchBase) : null);
        }
        return out;
    }, [round, holdings, visible.length, benchBase, ctxDays]);

    // 차트 위에 얹는 범례. 늘 그려지는 선만 넣는다 — 도구가 그리는 선은 바로 위 칩이
    // 이름과 색을 같이 보여 준다. 여기에 다 넣으면 여덟 줄이 되어 그림을 덮는다.
    const legendItems = useMemo(() => {
        // 개요의 두 선은 한눈에 갈라져야 한다 — 벤치마크는 흐린 점선, 내 성과는 진한 실선.
        if (overview) return [{ name: "그냥 나눠 담기", color: BENCH_COLOR }, { name: "내 성과", color: MINE_COLOR }];
        // 상세는 캔들이라 종가·하루 폭을 따로 적을 것이 없다(오르면 빨강, 내리면 파랑).
        const out: { name: string; color: string }[] = [];
        if (heldQty > 0) out.push({ name: "내 평단", color: "#e3b34a" });
        if (benchBase > 0 && holdings.length <= 1) out.push({ name: "내 성과", color: MINE_COLOR });
        return out;
    }, [heldQty, benchBase, holdings.length, overview]);

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

        // 개요는 판 전체 이야기다 — 종목별 지표·고저 대신 내 성과 곡선 하나만 얹는다.
        if (overview) {
            return portfolioCurve
                ? [{ name: "내 성과", data: portfolioCurve, color: MINE_COLOR, legend: true }]
                : [];
        }

        // 내 자산 곡선. 가격선이 곧 "그냥 사서 들고 있었을 때"라 비교 상대는 이미 화면에 있고,
        // 없던 건 내 쪽이었다. 같은 축에 얹으려고 시드를 거래 시작가로 환산한다 —
        // 두 선이 같은 점에서 출발하므로 벌어진 만큼이 그대로 초과 성과다.
        //
        // 값은 체결 기록으로 되짚는다. 진행 중 응답에는 지난 날의 잔고가 없고, 수수료를 빼면
        // 곡선이 실제 계좌와 어긋난다. 규칙 사본을 새로 만들지 않으려고 engine 의 견적을 그대로 쓴다.
        // 종목이 넷이면 이 선을 여기 그리지 않는다. 내 성과는 판 전체(현금 + 네 자리)의
        // 값이라 지수 눈금(1만 근처)에 있는데, 종목 하나의 차트에 얹으면 그 종목 값이
        // 바닥에 눌려 아무것도 안 보인다. 포트폴리오 곡선은 따로 자리를 갖는다(③단계).
        if (round && benchBase > 0 && holdings.length <= 1) {
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
                    } else if (o.side === "sell") {
                        const q = quoteSell({ price: o.price, qty: o.qty, position: pos });
                        if (q.ok) { cash += q.net; pos = { ...pos, ...applySell(pos, q) }; }
                    }
                }
                // 거래 시작 전에는 비교할 것이 없어 비워 둔다
                mine.push(i >= ctxDays - 1 ? Math.round((cash + pos.qty * c.c) / round.seed * benchBase) : null);
            });
            out.unshift({ name: "내 성과", data: mine, color: MINE_COLOR, legend: true });
        }
        return out;
    }, [firm?.tools, activeTools, visible, round, benchBase, holdings.length, overview, portfolioCurve]);

    // 사고판 지점을 차트에 찍는다. 빨강이 매수, 초록이 매도 — 버튼 색과 같다.
    // 수량 라벨은 체결이 적을 때만 붙인다. 많아지면 서로 겹쳐 오히려 안 읽힌다.
    const markers = useMemo(() => {
        // 개요 차트는 지수 눈금이라 종목 체결가를 찍을 수 없다 — 자리마다 값이 다르다
        const orders = overview ? [] : (sel?.orders ?? round?.orders ?? []);
        const withLabel = orders.length <= 8;
        return orders
            .filter(o => o.day_index < visible.length)
            .map(o => ({
                x: visible[o.day_index].d.slice(4),
                y: o.price,
                // 방향이 같으면 같은 색이다 — 사기·갚기는 사는 쪽(빨강), 팔기·빌려팔기는 파는 쪽(파랑).
                color: (o.side === "buy" || o.side === "cover") ? UP_COLOR : DOWN_COLOR,
                label: withLabel
                    ? `${(o.side === "buy" || o.side === "cover") ? "+" : "−"}${o.qty}${o.side === "short" || o.side === "cover" ? "*" : ""}`
                    : undefined,
                labelPosition: ((o.side === "buy" || o.side === "cover") ? "bottom" : "top") as "bottom" | "top",
            }));
    }, [round, sel, visible, overview]);

    /**
     * 아직 아무것도 안 한 판인가 — 하루도 안 넘겼고 체결도 예약도 없다.
     *
     * 준비 화면을 데이터로 한 번 더 거르는 자리다. `briefed` 만 보면 새로고침할 때마다
     * 굴리던 판이 준비 화면으로 돌아간다.
     */
    const untouched = !!round && round.status === "playing"
        && round.cursor <= ctxDays
        && (round.orders?.length ?? 0) === 0
        && (round.pending?.length ?? 0) === 0
        && !(round.holdings ?? []).some(h => (h.orders?.length ?? 0) > 0);

    /**
     * 어느 단계인가. 시작 → 설정 → (준비 → 게임 → 반기 종료) × n → 종료.
     *
     * 새 상태를 만들지 않고 있는 것에서 읽는다 — 단계 번호를 따로 들고 있으면 그것과
     * 데이터가 어긋나는 순간이 반드시 생긴다(판은 끝났는데 화면은 아직 진행 중 같은).
     * 데이터로 알 수 없는 둘만 따로 든다: 시작 화면을 지났나(entered), 준비 화면에서
     * 장을 열었나(briefed).
     */
    const phase: Phase =
        round ? (round.status === "done" ? "halfEnd"
            : (!briefed && untouched) ? "ready" : "play")
            : endedCampaign ? "end"
                : entered ? "setup" : "title";

    /**
     * 반복 구간의 몇 바퀴째인가. 표시줄이 "(준비-게임-반기 종료) × n" 의 n 을 말한다.
     *
     * 반기가 끝나면 캠페인은 다음 칸으로 밀리므로, 판이 들고 있는 번호를 먼저 본다.
     */
    const loopNote = !isLoggedIn ? "체험 한 판" : (() => {
        const c = campaign ?? endedCampaign;
        if (!c) return null;
        // 기간이 끝났으면 몇 번째가 아니라 몇 바퀴를 돌았는가다
        if (!round && endedCampaign) return `${c.total_halves}반기 끝`;
        const idx = round?.half_index ?? c.done_halves ?? 0;
        return `${Math.min(idx + 1, c.total_halves)}/${c.total_halves}반기`;
    })();

    if (loading) {
        return (
            <div className={cn(PIXEL, "min-h-screen grid place-items-center text-[11px]")}
                style={{ background: R.bg, color: R.neon }}>
                <Blink>NOW LOADING…</Blink>
            </div>
        );
    }

    return (
        // 이 화면은 브라운관 안이다 — 앱이 밝은 테마여도 여기는 늘 어둡다.
        // min-h-screen 을 그대로 쓰면 layout 의 상단 48 + 하단 탭 64 가 더해져 내용과
        // 무관하게 112px 이 항상 스크롤된다. 모바일에서는 그 크롬을 뺀 높이를 바닥으로 삼는다.
        <div className={cn(PIXEL, "min-h-[calc(100dvh-112px)] md:min-h-[100dvh]")} style={{ background: R.bg }}>
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            <div className={cn(
                "max-w-4xl mx-auto px-3 sm:px-5 flex flex-col",
                // 판이 도는 동안은 넓이와 상관없이 한 화면에 담는다 — 차트를 보고 버튼을
                // 누르는 게 매일 반복되는 동작이라, 그 둘이 같은 화면에 있어야 한다.
                // overflow-y-auto 는 안전장치다. 아주 작은 화면에서 고정 부분만으로도 자리가
                // 모자라면 잘리는 대신 스크롤된다 — 버튼이 화면 밖으로 나가면 판을 못 이어간다.
                phase === "play"
                    ? "h-[calc(100dvh-112px)] md:h-[100dvh] overflow-y-auto py-2 sm:py-3 gap-2"
                    : "py-3 sm:py-8 pb-8 md:pb-24 gap-2.5",
                // 시작 화면은 창 하나뿐이라 위에 붙여 두면 아래가 통째로 빈다.
                // 남는 자리를 위아래로 나눠 기기가 화면 한가운데 놓이게 한다.
                phase === "title" && "min-h-[calc(100dvh-112px)] md:min-h-[100dvh] justify-center",
            )}>

                {/* 지금 어느 단계인가. 판이 도는 중에도 남겨 둔다 — 한 줄이라 차트 높이를
                    거의 안 먹고, 반기가 되풀이되는 구간이라는 사실이 그때 가장 필요하다. */}
                <PhaseBar phase={phase} loopNote={loopNote} />

                {/* ① 시작 ─────────────────────────────────────── */}
                {phase === "title" && (
                    <TitleScreen
                        isLoggedIn={isLoggedIn} firm={firm} campaign={campaign}
                        bestReturn={bestReturn} onEnter={() => setEntered(true)}
                    />
                )}

                {/* ② 설정 — 기간과 회사. 반기마다 다시 하지 않는다. ───── */}
                {phase === "setup" && (
                    <SetupScreen
                        isLoggedIn={isLoggedIn} busy={busy} firm={firm} campaign={campaign}
                        history={history} habits={habits} activeTools={activeTools}
                        onOpenCampaign={openCampaign} onStart={start} onBuyTool={purchase}
                        onToggleTool={toggleTool} onBack={() => setEntered(false)}
                        want={wantScenario} onWant={setWantScenario}
                    />
                )}

                {/* ③ 준비 — 종목은 뽑혔고 아직 하루도 안 넘겼다 ───────
                    뽑히자마자 차트로 떨어뜨리면 무엇을 하러 들어왔는지 읽을 자리가 없다. */}
                {phase === "ready" && round && (
                    <ReadyScreen
                        round={round} season={season} isLoggedIn={isLoggedIn} busy={busy}
                        halfTitle={halfTitle} ctxDays={ctxDays} totalDays={totalDays}
                        perks={perks} onOpen={() => setBriefed(true)}
                    />
                )}

                {/* ④ 게임 · ⑤ 반기 종료 ───────────────────────
                    판이 끝난 화면도 차트를 그대로 쓴다 — 45일을 가린 끝에 이름이 열리는
                    자리가 바로 그 차트라, 결과를 다른 데로 옮기면 열리는 순간이 사라진다. */}
                {(phase === "play" || phase === "halfEnd") && round && (
                    <>
                        {round.status === "done" && (
                            <Win tone="neon" title="GAME OVER — 반기 종료"
                                right={isLoggedIn ? `${(firm?.quarters ?? 0) || 1}분기` : "체험 운용"}
                                className="shrink-0 pop-in">
                                <HalfScore round={round} isLoggedIn={isLoggedIn} season={season} ruined={ruined}
                                    keepPct={perks.ruinKeepPct} />
                            </Win>
                        )}

                        <Win
                            className={cn("flex flex-col", round.status === "playing" && "flex-1")}
                            bodyClass="flex flex-col gap-1.5 flex-1"
                            title={round.status === "done"
                                // 45일을 가린 끝에 열리는 이름이다 — 그냥 바뀌면 아무 일도 아닌 게 된다
                                ? <span className="reveal-answer">{sel?.name ?? round.name ?? "차트"}</span>
                                : `블라인드 차트 · ${halfTitle}`}
                            right={round.status === "done"
                                ? <span className="reveal-answer">{fmtDate(round.start_date)}~{fmtDate(round.end_date)}</span>
                                : `DAY ${round.cursor - ctxDays + 1}/${totalDays - ctxDays + 1}`}
                            onClose={round.status === "playing" ? giveUp : undefined}
                            closeLabel="이 반기 그만두기"
                        >
                            {/* 업종과 벤치마크 한 줄. 업종만 열어 준다 — 가격 말고 붙잡을 것 하나.
                                벤치마크는 정산의 잣대라 끝나고서야 보여 줄 이유가 없다. */}
                            <div className="flex items-center gap-2 shrink-0 min-h-[16px]">
                                {(sel?.sector ?? round.sector) && !overview && (
                                    <span className="inline-flex items-center gap-1 text-[11px] shrink-0" style={{ color: R.ink }}>
                                        <span className="w-[17px] h-[12px] overflow-hidden shrink-0">
                                            <SectorSprite sector={sel?.sector ?? round.sector ?? undefined} color={sectorAccent(sel?.sector ?? round.sector ?? undefined)} />
                                        </span>
                                        {sel?.sector ?? round.sector}
                                        {scenarioLabel(sel?.scenario ?? round.scenario) && (
                                            <span style={{ color: R.inkDim }}>· {scenarioLabel(sel?.scenario ?? round.scenario)}</span>
                                        )}
                                    </span>
                                )}
                                <span className={cn("ml-auto text-[11px] truncate",
                                    benchNote ? pnlText(edge >= 0) : "")}
                                    style={benchNote ? undefined : { color: R.inkDim }}>
                                    {round.status === "done"
                                        ? <span className="reveal-answer">{sel?.ticker ?? round.ticker}</span>
                                        : benchNote ?? "종목·시기는 끝나야 열립니다"}
                                </span>
                            </div>

                            {/* 네 종목의 간략한 현황. 누르면 그 종목의 차트로 바뀌고 매매도 그 종목에
                                들어간다. 상세에서는 자리만 옮기는 좁은 칩으로 줄어든다. */}
                            {holdings.length > 1 && (
                                <div className="flex items-stretch gap-1 shrink-0">
                                    {!overview && (
                                        <RetroBtn size="sm" onClick={() => setDetail(false)} aria-label="목록으로"
                                            className="shrink-0 flex items-center">
                                            <ArrowLeft size={11} />
                                        </RetroBtn>
                                    )}
                                    <div className="grid grid-cols-4 gap-1 flex-1 min-w-0">
                                        {holdings.map(h => {
                                            const last = lastCloseOf(h);
                                            const on = h.slot === (sel?.slot ?? 0);
                                            const rate = h.qty > 0 && h.cost_basis > 0
                                                ? ((last * h.qty - h.cost_basis) / h.cost_basis) * 100 : null;
                                            // 추세선은 그 종목의 최근 25일. 구간 등락 부호로 색을 정한다(시장색).
                                            const closes = overview ? closesOf(h) : [];
                                            const trendUp = closes.length > 1 && closes[closes.length - 1] >= closes[0];
                                            return (
                                                <button key={h.slot}
                                                    onClick={() => { setSlot(h.slot); setDetail(true); }}
                                                    aria-label={`${h.slot + 1}번 종목${h.qty > 0 ? ` 보유 ${h.qty}주` : ""}`}
                                                    aria-pressed={!overview && on}
                                                    className={cn("px-1 text-[11px] flex flex-col items-center justify-center gap-0.5 leading-none",
                                                        overview ? "min-h-[52px]" : "min-h-[34px]")}
                                                    style={{
                                                        background: R.face, color: R.ink,
                                                        boxShadow: !overview && on ? IN : OUT,
                                                    }}>
                                                    <span className="flex items-center gap-1 truncate max-w-full">
                                                        <span className="w-[15px] h-[11px] overflow-hidden shrink-0">
                                                            <SectorSprite sector={h.sector ?? undefined} color={sectorAccent(h.sector ?? undefined)} />
                                                        </span>
                                                        {/* 진행 중에는 이름이 없다 — 업종이 그 종목을 부르는 이름이 된다 */}
                                                        <span className={cn("truncate", h.name && round.status === "done" && "reveal-answer")}>
                                                            {slotName(h)}
                                                        </span>
                                                    </span>
                                                    {/* 개요에서는 추세선을 함께. 값(현재가)만으로는 종목마다 자릿수가 달라
                                                        견줄 수가 없었고, 오르는 중인지 알려면 하나씩 눌러 봐야 했다. */}
                                                    {overview && <Spark data={closes} color={trendUp ? UP_COLOR : DOWN_COLOR} />}
                                                    {h.qty > 0
                                                        ? <span className={rate !== null ? pnlText(rate >= 0) : ""}>
                                                            {rate !== null ? pct(rate) : `${h.qty}주`}
                                                        </span>
                                                        : <span style={{ color: R.inkDim }}>안 삼</span>}
                                                    {/* 그 자리가 어떤 구간에 앉아 있는지. 값이 아니라 성격이라
                                                        자리끼리 견줄 수 있는 유일한 정보다 — 이게 없으면 "어디에
                                                        얼마를" 를 차트 모양만 보고 정하게 된다. 컨텍스트 구간만
                                                        보고 붙인 값이라 정답이 새지 않는다. */}
                                                    {overview && scenarioLabel(h.scenario) && (
                                                        <span className="truncate max-w-full" style={{ color: R.inkDim }}>
                                                            {scenarioLabel(h.scenario)}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 비중 한 줄. 어느 종목에 얼마를 담고 있는지는 다음 매매를 정하는 값인데,
                                카드의 수익률만으로는 몰빵과 고르게 담기가 구별되지 않는다.
                                띠 하나면 넷과 현금이 한눈에 들어오고 세로로 16px 밖에 안 먹는다.
                                업종 색이 겹칠 수 있어(같은 업종 둘) 칸마다 경계선을 둔다. */}
                            {holdings.length > 1 && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[11px] shrink-0" style={{ color: R.inkDim }}>비중</span>
                                    <div className="flex-1 flex h-[14px]" style={{ background: R.faceLo, boxShadow: IN }}>
                                        {weights.filter(w => w.pct > 0.5).map(w => (
                                            <div key={w.slot} title={`${w.slot + 1}번 종목 비중 ${w.pct.toFixed(1)}%`}
                                                style={{ width: `${w.pct}%`, backgroundColor: sectorAccent(w.sector ?? undefined) }}
                                                className={cn("flex items-center justify-center text-[11px] text-white/95 border-r border-black/30 overflow-hidden",
                                                    // 지금 보고 있는 자리는 어느 칸인지 알아야 한다
                                                    !overview && w.slot === (sel?.slot ?? 0) && "ring-1 ring-inset ring-white")}>
                                                {w.pct >= 14 ? `${Math.round(w.pct)}` : ""}
                                            </div>
                                        ))}
                                        <div className="flex-1 flex items-center justify-center text-[11px] overflow-hidden whitespace-nowrap"
                                            style={{ color: R.inkDim }} title={`현금 ${cashPct.toFixed(1)}%`}>
                                            {cashPct >= 20 ? `현금 ${Math.round(cashPct)}%` : ""}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 산 도구는 판이 도는 중에도 껐다 켤 수 있다. 선이 넷씩 겹치면 정작
                                가격이 안 보이는데, 그때마다 판을 접고 준비 화면으로 갈 수는 없다.
                                산 사람에게만 보이므로 안 산 사람의 화면은 그대로다. */}
                            {ownedTools.length > 0 && !overview && (
                                <div className="flex flex-wrap items-center gap-1 shrink-0">
                                    {ownedTools.map(t => {
                                        const on = activeTools.includes(t.id);
                                        return (
                                            <RetroBtn key={t.id} size="sm" selected={on} onClick={() => toggleTool(t.id)}
                                                title={t.hint} aria-label={`${t.name} ${on ? "끄기" : "켜기"}`}
                                                className="inline-flex items-center gap-1">
                                                {/* 칩이 곧 그 도구의 범례다 — 색으로 어느 선인지 알려 준다 */}
                                                <span className="w-1.5 h-1.5 shrink-0"
                                                    style={{ backgroundColor: on ? TOOL_COLOR[t.id] : "transparent", boxShadow: on ? "none" : `inset 0 0 0 1px ${TOOL_COLOR[t.id]}` }} />
                                                {t.name}
                                            </RetroBtn>
                                        );
                                    })}
                                </div>
                            )}

                            {/* recharts 의 ResponsiveContainer 는 부모 높이가 flex 로 정해지면 한 번 잰
                                크기를 붙들고 있어 칸이 줄어도 그대로 그린다 — 320px 에서 차트가 상자를
                                뚫고 나와 계좌 위에 겹쳐 그려졌다. absolute inset-0 으로 실제 픽셀
                                상자를 주면 줄어드는 쪽도 따라온다. */}
                            <Crt className={cn("flex-1", round.status === "done" ? "min-h-[180px]" : "min-h-[110px] sm:min-h-[200px]")}>
                                {/* 범례는 차트 위에 얹는다. recharts 범례는 그림 상자 안에서 30px 을
                                    떼어 가는데, 그 30px 은 곧 그래프가 낮아진다는 뜻이다.
                                    겹쳐 놓으면 자리를 안 먹고, 클릭은 통과시켜 차트 조작을 막지 않는다. */}
                                <div className="absolute top-0 left-[38px] z-10 flex flex-wrap items-center gap-x-2 gap-y-0.5 pointer-events-none">
                                    {legendItems.map(l => (
                                        <span key={l.name} className="inline-flex items-center gap-1 text-[11px]" style={{ color: `${R.inkHi}99` }}>
                                            <span className="w-1.5 h-1.5" style={{ backgroundColor: l.color }} />
                                            {l.name}
                                        </span>
                                    ))}
                                </div>
                                <div className="absolute inset-0">
                                    {overview ? (
                                        // 개요는 판 전체 이야기 — 값이 아니라 흐름이라 선이 맞다
                                        <LineChart
                                            height="100%"
                                            forceTheme="dark"
                                            overlays={overlays}
                                            legend_disable={true}
                                            category_array={visible.map(c => c.d.slice(4))}
                                            data_array={[{ name: "그냥 나눠 담기", data: visible.map(c => c.c), color: BENCH_COLOR, dash: "4 3" }]}
                                        />
                                    ) : (
                                        // 상세는 캔들 — 같은 종가라도 하루 안에서 얼마나 오갔는지가 보인다
                                        <CandleChart
                                            height="100%"
                                            forceTheme="dark"
                                            candles={visible}
                                            growLast={round.status === "playing"}
                                            markers={markers}
                                            overlays={[
                                                // 평단은 흐름이 아니라 "수준"이다 — 점선으로 둔다. 종목이 하나뿐인
                                                // 판에서는 같은 차트에 금색 성과 곡선도 올라와서, 색만으로는 둘이 안 갈린다.
                                                ...(heldQty > 0
                                                    ? [{ name: "내 평단", data: visible.map(() => Math.round(avg)), color: MINE_COLOR, dash: "5 3" }]
                                                    : []),
                                                ...overlays.map(o => ({ name: o.name, data: o.data, color: o.color, dash: o.dash })),
                                            ]}
                                        />
                                    )}
                                </div>
                            </Crt>
                        </Win>

                        {/* ── 계좌 ───────────────────────────────
                            한 줄이다. 예전에는 값마다 칸을 하나씩 주고 그 밑에 부연을 달아 두 줄을
                            썼는데, 그 두 줄은 차트에서 나온 자리였다.

                            값 넷을 한 줄에 다 넣으면 폰에서 접히므로 뜻으로 가른다 — 가격(현재가·
                            산 값)은 창 이름 옆에, 내 계좌(내 돈·현금·성적)는 본문에. */}
                        <Win key={`acct-${filled}`} title="ACCOUNT"
                            right={
                                <>
                                    {round.status === "done" ? "종가" : "현재가"} {fmtKrw(price)}
                                    {heldQty > 0 && ` · 산 값 ${fmtKrw(avg)}`}
                                </>
                            }
                            className={cn("shrink-0", filled > 0 && "flash-mine")}>
                            {/* 내 돈·현금은 억·만으로 줄인다. 원 단위로 적으면 360px 에서 줄이 접혀
                                한 줄로 만든 뜻이 없어지고, 이 화면의 다른 곳(준비·결과)은 이미
                                억·만으로 말하고 있었다. 정확한 값이 필요한 자리는 따로 있다 —
                                가격은 위 이름줄에 원 단위로, 살 주식 수는 버튼에 그대로 적힌다. */}
                            <Sunken className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-2 py-1 text-[11px]">
                                <AcctVal k="내 돈" v={fmtMoney(totalAssets)} />
                                {/* 담보가 잡혀 있으면 현금 자리에 쓸 수 있는 돈을 보여 준다 —
                                    총액만 보이면 "현금이 있는데 왜 못 사지" 가 된다. */}
                                <AcctVal k={lockedCollateral > 0 ? "쓸 현금" : "현금"}
                                    v={fmtMoney(lockedCollateral > 0 ? freeCash : round.cash)} />
                                <AcctVal
                                    k={overview ? `보유 ${holdings.filter(h => h.qty > 0).length}/${holdings.length}` : heldQty > 0 ? `${heldQty}주` : "미보유"}
                                    v={pct(totalRate)} tone={pnlText(totalPnl >= 0)} />
                            </Sunken>
                            {/* 빌려서 판 것이 있으면 한 줄. 담보는 이미 현금에서 묶여 있고,
                                내 돈에 더해진 것은 평가손익뿐이다. */}
                            {lockedCollateral > 0 && (
                                <Sunken className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-2 py-1 text-[11px]">
                                    <AcctVal k="빌려 판 것" v={`${holdings.reduce((a, h) => a + (h.short_qty ?? 0), 0)}주`} />
                                    <AcctVal k="묶인 담보" v={fmtMoney(lockedCollateral)} />
                                    <AcctVal k="평가손익" v={fmtMoney(shortPnlNow)} tone={pnlText(shortPnlNow >= 0)} />
                                </Sunken>
                            )}
                            {/* 이번 반기의 목표 한 줄. 판정은 반기가 닫힐 때 나므로 여기서는
                                진행률을 그리지 않는다 — 중간 숫자를 띄우면 그걸 맞추려고
                                굴리게 되고, 목표는 마지막 하루에 뒤집히는 종류의 것이다. */}
                            {season && round.status === "playing" && (
                                <p className="mt-1 px-0.5 text-[11px] leading-[1.4] break-keep"
                                    title={`${season.client.name} — ${season.client.blurb}\n목표: ${season.mission.detail}`}>
                                    <b style={{ color: "#9e1414" }}>목표</b>{" "}
                                    <span style={{ color: R.ink }}>{season.mission.label}</span>
                                    <span style={{ color: R.inkDim }}> · {season.client.name}</span>
                                </p>
                            )}
                        </Win>

                        {/* ── 조작 ─────────────────────────────── */}
                        {round.status === "playing" && (
                            <Win title="BUY / SELL ORDER" className="shrink-0"
                                right={
                                    // 창의 모드는 창 이름 옆에 둔다. 아래 줄에 끼워 넣으면 매매 버튼과
                                    // 섞여서, 누르면 주문이 나가는 것과 눈금만 바뀌는 것이 구별되지 않는다.
                                    //
                                    // 개요에서는 1/N 이 없다 — 어느 자리에 담을지 고르지 않은 화면이다.
                                    // 비중은 반대로 개요에 더 맞는다. 전 자리를 한 번에 다루므로
                                    // 자리를 고를 필요가 없고, 오히려 넷을 한눈에 보며 정하는 값이다.
                                    <span className="flex items-center gap-1">
                                        {/* 빌려서 팔기. 줄을 넷으로 늘리는 대신 두 줄을 갈아 끼운다 —
                                            화면 높이가 그대로고, 지금 무엇을 하려는지가 한눈에 갈린다. */}
                                        {!overview && isLoggedIn && (
                                            <RetroBtn size="sm" selected={shortMode} tone={shortMode ? "warn" : "plain"}
                                                onClick={() => setShortMode(v => !v)}
                                                title="빌려서 먼저 팔고 나중에 사서 갚는다. 값이 내려가면 번다"
                                                aria-pressed={shortMode}>공매도</RetroBtn>
                                        )}
                                        {!overview && !shortMode && (
                                            <RetroBtn size="sm" selected={buyMode === "split"}
                                                onClick={() => setBuyMode(m => m === "split" ? "part" : "split")}
                                                title="내 돈을 몇 등분해서 살지로 바꾼다"
                                                aria-pressed={buyMode === "split"}>1/N</RetroBtn>
                                        )}
                                        {/* 예약도 자리 하나에 거는 것이라 1/N 과 같은 자리다. 한때 관망 줄에
                                            있었는데, 그 줄은 개요에만 보여서 정작 종목을 골라 들어가면
                                            예약을 열 방법이 없었다 — 값도 수량도 그 종목 것으로 잡히는데. */}
                                        {!overview && isLoggedIn && (
                                            <RetroBtn size="sm" selected={reserveOpen} disabled={auto}
                                                onClick={() => setReserveOpen(v => !v)}
                                                title="이 종목에 지정가·손절·익절을 걸어 둔다"
                                                aria-pressed={reserveOpen}>
                                                {/* pending 이 없는 응답(0020 배포 전 워커)에도 화면이 살아 있어야 한다 */}
                                                예약{(round.pending ?? []).length > 0 && ` ${(round.pending ?? []).length}`}
                                            </RetroBtn>
                                        )}
                                        <RetroBtn size="sm" selected={fitOpen}
                                            // 열 때 손잡이를 지금 비중으로 끌어다 놓지 않는다. 한때 그렇게
                                            // 했는데(열자마자 큰 주문이 되어 있지 않게), 그러면 기억해 둔
                                            // 목표가 열 때마다 지워진다. 큰 주문이 걱정될 자리는 아니다 —
                                            // 아래 버튼이 사는지 파는지 몇 주인지를 그대로 적고 있다.
                                            onClick={() => setFitOpen(v => !v)}
                                            title={manySlots ? "현금 비중을 남기고 전 종목을 균등하게 담는다" : "주식과 현금의 비율을 맞춘다"}
                                            aria-pressed={fitOpen}>비중</RetroBtn>
                                    </span>
                                }>
                                <div className="flex flex-col gap-1.5">
                                    {/* 살 때는 내 돈의 몇 %(또는 현금의 1/n), 팔 때는 보유의 몇 %.
                                        그 자리에서 체결되고 **날짜는 그대로다** — 같은 날 네 종목을
                                        다 만질 수 있어야 한다. 시간은 아래 관망 줄에서만 흐른다. */}
                                    <div className={cn("grid grid-cols-[38px_1fr] gap-x-1.5 gap-y-1.5 items-center",
                                        overview && "hidden")}>
                                        {/* 기준을 적어 둔다 — 안 적으면 같은 25% 가 두 가지 뜻이 되고,
                                            등분 모드에서는 아예 다른 셈(현금 기준)이 된다. */}
                                        <span className="leading-[1.2]">
                                            <span className="block text-[11px] font-bold" style={{ color: "#9e1414" }}>
                                                {/* 38px 칸이라 네 글자는 줄바꿈이 난다 */}
                                                {shortMode ? "빌려서" : "사기"}
                                            </span>
                                            {/* 비율이든 등분이든 기준은 내 돈 하나다 — 눈금만 다르다.
                                                공매도의 담보는 묶이지 않은 현금에서만 나온다. */}
                                            <span className="block text-[11px]" style={{ color: R.inkDim }}>
                                                {shortMode ? "담보" : "내 돈"}
                                            </span>
                                        </span>
                                        <div className={cn("grid gap-1", shortMode ? "grid-cols-3" : "grid-cols-4")}>
                                            {shortMode
                                                ? SELL_PARTS.map(part => {
                                                    const n = shortQtyFor(part.pct);
                                                    return (
                                                        <RetroBtn key={part.pct} tone="warn" aria-label={`빌려서 팔기 ${part.label}`}
                                                            onClick={() => trade("short", n, sel?.slot ?? 0)} disabled={locked || n < 1}
                                                            className="min-h-[42px] flex flex-col items-center justify-center leading-none gap-0.5">
                                                            {part.label}
                                                            <span className="text-[11px] font-normal opacity-85">{n > 0 ? `${n}주` : "—"}</span>
                                                        </RetroBtn>
                                                    );
                                                })
                                                : buyMode === "split"
                                                ? BUY_SPLITS.map(parts => {
                                                    const n = splitQtyFor(parts);
                                                    return (
                                                        <RetroBtn key={parts} tone="buy" aria-label={`내 돈 ${parts}등분 매수`}
                                                            onClick={() => trade("buy", n, sel?.slot ?? 0)} disabled={locked || n < 1}
                                                            className="min-h-[42px] flex flex-col items-center justify-center leading-none gap-0.5">
                                                            1/{parts}
                                                            <span className="text-[11px] font-normal opacity-85">{n > 0 ? `${n}주` : "—"}</span>
                                                        </RetroBtn>
                                                    );
                                                })
                                                : BUY_PARTS.map(part => {
                                                    const n = buyQtyFor(part.pct);
                                                    return (
                                                        <RetroBtn key={part.pct} tone="buy" aria-label={`사기 ${part.label}`}
                                                            onClick={() => trade("buy", n, sel?.slot ?? 0)} disabled={locked || n < 1}
                                                            className="min-h-[42px] flex flex-col items-center justify-center leading-none gap-0.5">
                                                            {part.label}
                                                            <span className="text-[11px] font-normal opacity-85">{n > 0 ? `${n}주` : "—"}</span>
                                                        </RetroBtn>
                                                    );
                                                })}
                                        </div>

                                        <span className="leading-[1.2]">
                                            <span className="block text-[11px] font-bold" style={{ color: "#1d4ed8" }}>
                                                {shortMode ? "갚기" : "팔기"}
                                            </span>
                                            <span className="block text-[11px]" style={{ color: R.inkDim }}>
                                                {shortMode ? "빌린 것" : "보유"}
                                            </span>
                                        </span>
                                        <div className="grid grid-cols-3 gap-1">
                                            {SELL_PARTS.map(part => {
                                                const n = shortMode ? coverQtyFor(part.pct) : sellQtyFor(part.pct);
                                                return (
                                                    <RetroBtn key={part.pct} tone="sell"
                                                        aria-label={`${shortMode ? "갚기" : "팔기"} ${part.label}`}
                                                        onClick={() => trade(shortMode ? "cover" : "sell", n, sel?.slot ?? 0)}
                                                        disabled={locked || n < 1}
                                                        className="min-h-[42px] flex flex-col items-center justify-center leading-none gap-0.5">
                                                        {part.label}
                                                        <span className="text-[11px] font-normal opacity-85">{n > 0 ? `${n}주` : "—"}</span>
                                                    </RetroBtn>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 공매도 줄에서만. 규칙이 낯선 자리라 무엇이 걸려 있는지 한 줄로 적는다. */}
                                    {shortMode && !overview && (
                                        <p className="text-[11px] break-keep leading-[1.6]" style={{ color: R.inkDim }}>
                                            빌려서 먼저 팝니다. 값이 내려가면 벌고, 올라가면 잃습니다.
                                            판 값만큼 현금이 담보로 묶이고, 평가손실이 담보의 {perks.shortCallPct}%를 넘으면
                                            그날 종가로 강제 청산됩니다. 반기가 끝나면 남은 것은 자동으로 갚습니다.
                                        </p>
                                    )}

                                    {/* ── 비중 맞추기 ──
                                        "몇 주를 살까" 가 아니라 "얼마를 담고 있을까" 로 묻는다. 사고팔기를
                                        가르지 않는 이유는, 목표를 정하면 사야 할지 팔아야 할지가 이미
                                        정해져 있기 때문이다 — 그걸 다시 사람에게 묻는 것은 일이다.

                                        종목이 하나뿐인 판에서는 이 눈금이 곧 주식과 현금의 비율이고,
                                        넷이면 이 자리에 얼마를 담을지가 된다(넷 다 25% 면 균등 배분). */}
                                    {/* 개요에서는 자리별 매매 줄이 통째로 없다. 어떻게 사는지는 적어 둔다 —
                                        예전에는 이 말이 창 이름 옆에 있었는데 그 자리를 모드 버튼이 가져갔다. */}
                                    {overview && (
                                        <p className="text-[11px] break-keep" style={{ color: R.inkDim }}>
                                            종목을 눌러 들어가면 그 종목만 사고팝니다. 넷을 한 번에 담으려면 비중을 쓰세요.
                                        </p>
                                    )}

                                    {fitOpen && (
                                        <Sunken className="flex flex-col gap-1">
                                            <div className="flex items-baseline justify-between gap-2 text-[11px]">
                                                <span style={{ color: R.ink }}>
                                                    주식 <b className="tabular-nums">{target}%</b>
                                                    <span style={{ color: R.inkDim }}> · 현금 {100 - target}%</span>
                                                    <span style={{ color: R.inkDim }}> · 지금 주식 {stockPct.toFixed(1)}%</span>
                                                </span>
                                            </div>
                                            <PixelSlider
                                                id="fit-target"
                                                min={0} max={100} step={FIT_STEP}
                                                value={target} onChange={setTarget}
                                                leftLabel="전부 현금" rightLabel="전부 주식"
                                                valueText={`주식 비중 ${target}%`}
                                                disabled={busy}
                                            />
                                            {manySlots ? (
                                                <RetroBtn
                                                    tone={fitPlan?.orders.length ? "go" : "plain"}
                                                    disabled={locked || !fitPlan?.orders.length}
                                                    onClick={balanceAll}
                                                    className="min-h-[38px] w-full">
                                                    {fitPlan?.orders.length
                                                        // 몇 건이 나가는지 적는다 — 한 번 눌러 여러 주문이 나가는 자리다
                                                        ? `전 종목 균등 · 각 ${(target / holdings.length).toFixed(1)}% · ${fitPlan.orders.length}건`
                                                        : "이미 균등합니다"}
                                                </RetroBtn>
                                            ) : (
                                                <RetroBtn
                                                    // 할 일이 없을 때는 색을 빼 둔다 — 흐려진 빨강은 "살 수 있는데 막힌 것"으로 읽힌다
                                                    tone={!fitOrder ? "plain" : fitOrder.side === "sell" ? "sell" : "buy"}
                                                    disabled={locked || !fitOrder}
                                                    onClick={() => fitOrder && trade(fitOrder.side, fitOrder.qty, sel?.slot ?? 0)}
                                                    className="min-h-[38px] w-full">
                                                    {/* 무엇이 일어날지 버튼에 적는다 — "맞추기" 만으로는 사는지 파는지 모른다 */}
                                                    {fitOrder
                                                        ? `${fitOrder.side === "buy" ? "사서" : "팔아서"} ${target}% 로 맞추기 · ${fitOrder.qty}주`
                                                        : "이미 목표에 있습니다"}
                                                </RetroBtn>
                                            )}
                                        </Sunken>
                                    )}

                                    {/* ── 시간 ──
                                        개요에서만 시간이 흐른다. 상세에서 하루가 지나가 버리면 두 번째
                                        종목을 볼 때는 이미 다음 날이라 같은 날 넷을 만질 수 없다. */}
                                    <div className={cn("grid grid-cols-[38px_1fr] gap-x-1.5 items-center",
                                        holdings.length > 1 && !overview && "hidden")}>
                                        <span className="text-[11px] font-bold" style={{ color: R.inkDim }}>관망</span>
                                        {canCarry ? (
                                            <div className="grid grid-cols-2 gap-1">
                                                <RetroBtn tone="warn" onClick={() => advance(null, true)} disabled={locked}
                                                    className="min-h-[42px]">들고 가기</RetroBtn>
                                                <RetroBtn onClick={() => advance(null)} disabled={locked}
                                                    className="min-h-[42px]">정리하고 끝</RetroBtn>
                                            </div>
                                        ) : (
                                            // 예약 버튼이 이 줄 끝에 붙는다 — 따로 한 줄을 쓰면 그만큼이 차트에서
                                            // 빠진다. 마지막 날에는 걸어도 체결될 날이 없어 안 띄운다.
                                            <div className="flex gap-1">
                                                {/* 재생만은 locked 로 막지 않는다 — 재생 중에도 멈출 수 있어야 한다 */}
                                                <RetroBtn onClick={auto ? stopAuto : startAuto}
                                                    tone={auto ? "warn" : "plain"} aria-pressed={auto}
                                                    aria-label={auto ? "재생 멈춤 (스페이스)" : "자동 재생 (스페이스)"}
                                                    className="shrink-0 min-h-[42px] px-2.5">
                                                    {auto ? <Pause size={14} strokeWidth={2.6} /> : <Play size={14} strokeWidth={2.6} />}
                                                </RetroBtn>
                                                <div className="grid grid-cols-3 gap-1 flex-1 min-w-0">
                                                    <RetroBtn onClick={() => advance(null)} disabled={busy || auto} className="min-h-[42px] px-1">
                                                        하루
                                                    </RetroBtn>
                                                    {SKIP_STEPS.map(n => (
                                                        // px 를 줄인다 — 로그인 판은 이 줄에 예약 버튼까지 들어와서
                                                        // 기본 여백으로는 "±7%면 멈춤"이 두 줄로 접힌다
                                                        <RetroBtn key={n} onClick={() => skipDays(n)} disabled={busy || auto} aria-label={`${n}일`}
                                                            className="min-h-[42px] px-1 flex flex-col items-center justify-center leading-none gap-0.5">
                                                            {n}일
                                                            <span className="text-[11px] font-normal opacity-70">±{JUMP_STOP_PCT}%면 멈춤</span>
                                                        </RetroBtn>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 예약 — 41일 내내 화면 앞에 앉아 있지 않아도 되게.
                                        체결 판정과 체결가 규칙은 전부 워커에 있다. 여기는 걸고 지우기만 한다.
                                        기본은 접어 둔다 — 폰에서 한 화면이 이미 빡빡하다. */}
                                    {isLoggedIn && (
                                        <div className={cn("flex flex-col gap-1.5",
                                            // 걸어 둔 예약도 없고 접혀 있으면 이 블록은 자리를 차지하지 않는다
                                            !reserveOpen && (round.pending ?? []).length === 0 && "hidden")}>
                                            {(round.pending ?? []).length > 0 && (
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {(round.pending ?? []).map((r, i) => {
                                                        // 자리를 안 적은 옛 예약은 0번으로 읽는다(워커와 같은 규칙).
                                                        const at = holdings[r.slot ?? 0];
                                                        return (
                                                            <span key={`${r.kind}-${i}`} className="inline-flex items-center gap-1 min-h-[28px] px-1.5 text-[11px]"
                                                                style={{ background: R.faceLo, boxShadow: IN, color: R.ink }}>
                                                                {/* 어느 종목 예약인지 먼저 — 넷을 굴리면 이것부터 알아야 한다 */}
                                                                {holdings.length > 1 && at && (
                                                                    <span className="inline-flex items-center gap-1 font-bold">
                                                                        <span className="w-[15px] h-[11px] overflow-hidden shrink-0">
                                                                            <SectorSprite sector={at.sector ?? undefined} color={sectorAccent(at.sector ?? undefined)} />
                                                                        </span>
                                                                        {slotName(at)}
                                                                    </span>
                                                                )}
                                                                {reserveLabel(r.kind)} {r.price.toLocaleString()}원 {r.qty}주
                                                                <button onClick={() => unreserve(i)} disabled={busy}
                                                                    className="ml-0.5 px-1 disabled:opacity-40" aria-label="예약 취소"
                                                                    style={{ color: "#9e1414" }}>×</button>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {reserveOpen && (
                                                <Sunken className="flex items-center gap-1 flex-wrap">
                                                    {/* 어느 자리에 걸리는지 먼저 말한다 — 값도 수량도 이 자리 것으로
                                                        잡히므로, 다른 종목을 보며 건 줄 알면 판정이 어긋난 것처럼 보인다. */}
                                                    {holdings.length > 1 && (
                                                        <span className="w-full text-[11px]" style={{ color: R.ink }}>
                                                            <b>{slotName(sel)}</b>
                                                            <span style={{ color: R.inkDim }}>에 겁니다 · 다른 종목은 눌러 들어가서 거세요</span>
                                                        </span>
                                                    )}
                                                    {RESERVE_KINDS.map(k => (
                                                        <RetroBtn key={k.id} size="sm" selected={resKind === k.id}
                                                            onClick={() => setResKind(k.id)} title={k.hint}>
                                                            {k.label}
                                                        </RetroBtn>
                                                    ))}
                                                    {/* 값을 적는 대신 지금 값에서 얼마나 떨어진 자리인지로 고른다. */}
                                                    <div className="flex items-center gap-1 w-full">
                                                        <span className="text-[11px] shrink-0 w-8" style={{ color: R.ink }}>자리</span>
                                                        {(resKind === "take_profit" ? RESERVE_STEPS.up : RESERVE_STEPS.down).map(step => {
                                                            const target = resPriceAt(step);
                                                            return (
                                                                <RetroBtn key={step} selected={resStep === step} onClick={() => setResStep(step)}
                                                                    aria-label={`${resKind === "take_profit" ? "+" : "-"}${step}%`}
                                                                    className="flex-1 min-h-[32px] flex flex-col items-center justify-center leading-none gap-0.5">
                                                                    {resKind === "take_profit" ? "+" : "−"}{step}%
                                                                    <span className="text-[11px] font-normal opacity-70">{target.toLocaleString()}</span>
                                                                </RetroBtn>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="flex items-center gap-1 w-full">
                                                        <span className="text-[11px] shrink-0 w-8" style={{ color: R.ink }}>수량</span>
                                                        {(resKind === "buy_limit" ? BUY_PARTS : SELL_PARTS).map(part => {
                                                            const n = resQtyFor(part.pct);
                                                            return (
                                                                <RetroBtn key={part.pct} selected={resPart === part.pct} disabled={n < 1}
                                                                    onClick={() => setResPart(part.pct)} aria-label={`예약 수량 ${part.label}`}
                                                                    className="flex-1 min-h-[32px] flex flex-col items-center justify-center leading-none gap-0.5">
                                                                    {part.label}
                                                                    <span className="text-[11px] font-normal opacity-70">{n > 0 ? `${n}주` : "—"}</span>
                                                                </RetroBtn>
                                                            );
                                                        })}
                                                        <RetroBtn tone="go" onClick={reserve} disabled={busy || resQtyFor(resPart) < 1}
                                                            className="shrink-0 min-h-[32px]">걸기</RetroBtn>
                                                    </div>

                                                    <span className="text-[11px] w-full leading-[1.6]" style={{ color: R.inkDim }}>
                                                        걸어 둔 값에 그날 가격이 닿으면 체결됩니다. 갭으로 건너뛴 날은 시가로 체결됩니다.
                                                    </span>
                                                </Sunken>
                                            )}
                                        </div>
                                    )}

                                    {/* 폰에서는 이 안내를 접는다 — 같은 말이 준비 화면 "규칙 보기" 에 있고,
                                        여기 한 줄이 차트 높이로 간다. */}
                                    <p className="hidden sm:block text-[11px] break-keep leading-[1.7]" style={{ color: R.inkDim }}>
                                        관망 쪽을 누르면 하루가 지나갑니다. 그날 종가로 체결되고,
                                        수수료는 매수·매도 각 0.015%, 매도 시 증권거래세 0.18%입니다.
                                        마지막 날에는 남은 주식이 자동으로 정리됩니다.
                                    </p>
                                </div>
                            </Win>
                        )}

                        {round.status === "done" && (
                            <>
                                {!isLoggedIn && (
                                    <Win title="체험 운용" className="shrink-0">
                                        <p className="text-[13px] leading-[1.7] break-keep" style={{ color: R.ink }}>
                                            <Link href="/login?callbackUrl=%2Fgame" className="underline font-bold">로그인</Link>
                                            하면 이 성적이 회사에 반영되고, 다음 반기를 이어서 굴립니다.
                                        </p>
                                    </Win>
                                )}
                                {/* 설정 화면을 건너뛰고 바로 다음 반기를 연다 — 기억해 둔 자리로
                                    종목을 뽑아 준비 화면으로 간다. 자리를 매번 고르지 않는
                                    사람에게 설정은 지나가는 문일 뿐이다. */}
                                <RetroBtn tone="go" size="lg" onClick={nextHalf} disabled={busy}
                                    className="w-full shrink-0">
                                    {endedCampaign ? "최종 결과 ▶"
                                        : isLoggedIn && !campaign ? "기간 고르기 ▶"
                                            : busy ? "판을 여는 중…" : "다음 반기 ▶"}
                                </RetroBtn>
                                {/* 조건을 바꾸고 싶은 사람에게는 여전히 문이 있다 */}
                                {!endedCampaign && (
                                    <button type="button" onClick={reset} disabled={busy}
                                        className={cn(PIXEL, "text-[11px] text-center shrink-0 disabled:opacity-40")}
                                        style={{ color: `${R.inkHi}80` }}>
                                        설정으로 — 자리 고르기
                                    </button>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* ⑥ 종료(기간 끝) ──────────────────────────
                    반기 하나하나의 성적은 지난 분기 목록에 있다. 여기서 답할 것은 그보다 큰
                    질문이다 — N년을 굴려서 회사가 어디로 갔는가. */}
                {phase === "end" && endedCampaign && (
                    <CampaignResult campaign={endedCampaign} firm={firm} history={history}
                        habits={habits} bestReturn={bestReturn} onClear={() => setEndedCampaign(null)} />
                )}
            </div>
        </div>
    );
}

/** 계좌 한 줄의 값 하나 — 흐린 이름과 진한 값이 나란히. */
function AcctVal({ k, v, tone }: { k: string; v: string; tone?: string }) {
    return (
        <span className="whitespace-nowrap">
            <span style={{ color: R.inkDim }}>{k} </span>
            <b className={cn("font-bold tabular-nums", tone)} style={tone ? undefined : { color: R.ink }}>{v}</b>
        </span>
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
        <li className="flex items-baseline gap-2 text-[11px]">
            <span className="w-8 shrink-0 font-bold" style={{ color: R.inkDim }}>{label}</span>
            {value !== null ? (
                <>
                    <span className="font-bold" style={{ color: R.ink }}>{value}</span>
                    {note && <span className="truncate" style={{ color: R.inkDim }}>{note}</span>}
                </>
            ) : (
                <span style={{ color: R.inkDim }}>아직 알 수 없음{note ? ` — ${note}` : ""}</span>
            )}
        </li>
    );
}

// ─────────────────────────────────────────────────────────
/**
 * ④ 결과 — 기간이 끝났다.
 *
 * 반기 하나하나의 성적은 이미 지난 분기 목록에 있다. 여기서 답할 것은 그보다 큰 질문이다:
 * **N년을 굴려서 회사가 어디로 갔는가.** 그래서 맡은 돈의 시작과 끝, 등급, 벌어들인 보수,
 * 그리고 벤치마크를 몇 번이나 이겼는지를 놓는다.
 *
 * 숫자는 전부 서버가 남긴 값이다 — 규칙이 바뀌어도 지난 기록은 그때 값 그대로여야 한다.
 */
function CampaignResult({ campaign, firm, history, habits, bestReturn, onClear }: {
    campaign: Campaign; firm: Firm | null; history: ReplayHistoryItem[];
    habits: HabitSummary | null; bestReturn: number | null; onClear: () => void;
}) {
    const aum = firm?.aum ?? INITIAL_AUM;

    // 이 캠페인의 반기들만. 목록은 최근 몇 판만 오므로 전부를 덮지 못할 수 있다 —
    // 덮은 만큼만 세고, 덮었는지 여부에 따라 말을 바꾼다(전부라고 하면 거짓말이다).
    const rows = history
        .filter(h => h.campaign_id === campaign.id && h.aum_before !== null && h.aum_after !== null)
        .slice().reverse();
    const seen = rows.length;
    const whole = seen >= campaign.total_halves;
    // 캠페인을 시작할 때 맡고 있던 돈. 기록 밖이면 알 수 없어 첫 캠페인 기준으로 읽는다.
    const startAum = rows[0]?.aum_before ?? INITIAL_AUM;
    const grown = aum >= startAum;
    // 연 환산은 캠페인 전체를 덮었을 때만 말이 된다.
    const cagr = whole && startAum > 0
        ? (Math.pow(aum / startAum, 1 / Math.max(1, campaign.years)) - 1) * 100
        : null;

    const beats = rows.filter(h => (h.final_return ?? 0) > (h.bh_return ?? 0)).length;

    // 최대 낙폭 — 길게 굴릴수록 "언제 얼마나 무너졌는가"가 성적보다 오래 남는다.
    const curve = seen ? [startAum, ...rows.map(h => h.aum_after!)] : [];
    let peak = curve[0] ?? 0, worst = 0;
    for (const v of curve) {
        peak = Math.max(peak, v);
        if (peak > 0) worst = Math.min(worst, ((v - peak) / peak) * 100);
    }

    /**
     * 기록 경신 — 이 기간 안에서 역대 최고 반기가 나왔나.
     *
     * `bestReturn` 은 역대 최고이고 `rows` 는 이 기간의 반기들이니, 이 기간 최고가
     * 역대 최고와 같으면 여기서 세운 기록이다. 목록이 기간 전체를 못 덮을 수 있어
     * 놓치는 쪽(안 띄우는 쪽)으로만 틀린다 — 없는 기록을 축하하지는 않는다.
     */
    const bestHere = seen ? Math.max(...rows.map(h => h.final_return ?? 0)) : null;
    const newRecord = bestReturn !== null && bestHere !== null && bestHere >= bestReturn - 1e-9;

    return (
        <>
            <Win tone="neon" title="GAME OVER — RESULTS"
                right={`${campaign.years}년 · ${campaign.total_halves}반기`} className="pop-in">
                {/* 이 화면이 답할 질문은 하나다 — N년을 굴려서 회사가 어디로 갔는가. */}
                <Crt className="px-3 py-3">
                    <p className="text-[11px]" style={{ color: `${R.inkHi}99` }}>맡은 돈</p>
                    <p className="text-[22px] sm:text-[33px] leading-tight font-bold tabular-nums" style={{ color: R.inkHi }}>
                        {fmtMoney(startAum)} <span style={{ color: `${R.inkHi}66` }}>→</span>{" "}
                        <span className={pnlLit(grown)}>{fmtMoney(aum)}</span>
                    </p>
                    {cagr !== null && (
                        <p className={cn("mt-1 text-[11px] font-bold tabular-nums", pnlLit(cagr >= 0))}>
                            연 {pct(cagr)}
                        </p>
                    )}
                </Crt>
                <p className="mt-1.5 text-[11px] break-keep leading-[1.7]" style={{ color: R.ink }}>
                    {campaign.start_date.slice(0, 4)}년 {Number(campaign.start_date.slice(4, 6))}월부터 {campaign.years}년 ·{" "}
                    {rankOf(startAum)} → {firm?.rank ?? rankOf(aum)}
                    {!whole && seen > 0 && ` · 아래 숫자는 기록에 남은 ${seen}반기 기준입니다`}
                </p>
            </Win>

            {seen > 1 && (
                <Win title="PROFIT / LOSS GRAPH">
                    <MoneyCurve history={history.filter(h => h.campaign_id === campaign.id)} />
                </Win>
            )}

            <Win title="TOTAL WEALTH STATISTICS">
                <Sunken className="flex flex-col">
                    <StatLine label="최종 맡은 돈" value={fmtMoney(aum)} />
                    <StatLine label="연평균" value={cagr !== null ? pct(cagr) : "—"}
                        tone={cagr !== null ? (cagr >= 0 ? "#9e1414" : "#1d4ed8") : undefined} />
                    <StatLine label="벤치마크 이김" value={seen ? `${beats}/${seen}반기` : "—"} />
                    <StatLine label="최대 낙폭" value={seen ? pct(worst) : "—"} tone="#1d4ed8" />
                    <StatLine label="가장 잘한 반기" value={bestReturn !== null ? pct(bestReturn) : "—"}
                        tone={bestReturn !== null ? (bestReturn >= 0 ? "#9e1414" : "#1d4ed8") : undefined} />
                    <StatLine label="총 체결" value={(habits?.trades ?? 0) > 0 ? `${habits!.trades}회` : "—"} />
                    <StatLine label="회사 금고" value={fmtMoney(firm?.cash ?? 0)} />
                    <StatLine label="등급" value={firm?.rank ?? rankOf(aum)} mono={false} />
                </Sunken>

                {(habits?.trades ?? 0) > 0 && (
                    <p className="mt-1.5 text-[11px] break-keep leading-[1.7]" style={{ color: R.inkDim }}>
                        {[habits!.holdDays !== null ? `평균 ${habits!.holdDays}일 보유` : null,
                            habits!.chaseRatio !== null ? `오른 뒤 매수 ${habits!.chaseRatio}%` : null,
                        ].filter(Boolean).join(" · ")}
                        {habits!.disposition !== null && (
                            <span className="font-bold" style={{ color: "#7a4f00" }}>
                                {habits!.holdDays !== null || habits!.chaseRatio !== null ? " · " : ""}
                                {habits!.disposition > 0 ? "이익을 빨리 실현하는 편" : habits!.disposition < 0 ? "손실을 빨리 정리하는 편" : "양쪽이 비슷"}
                            </span>
                        )}
                    </p>
                )}
            </Win>

            {newRecord && (
                <p className={cn(PIXEL, "text-center text-[22px] font-bold")} style={{ color: R.pink }}>
                    <Blink>★ NEW RECORD ★</Blink>
                </p>
            )}

            <RetroBtn tone="go" size="lg" onClick={onClear} className="w-full inline-flex items-center justify-center gap-2">
                <Play size={15} strokeWidth={2.6} /> RESTART — 새 기간 고르기
            </RetroBtn>
            <p className="text-[11px] break-keep text-center" style={{ color: `${R.inkHi}80` }}>
                회사는 그대로입니다 — 맡은 돈과 리서치실 도구를 가지고 다음 기간을 시작합니다.
            </p>
        </>
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
            <span className="shrink-0 w-[56px]" style={{ color: R.inkDim }}>{k}</span>
            <span style={{ color: R.ink }}>{v}</span>
        </li>
    );

    return (
        <div className="mt-2 pt-2 border-t flex flex-col gap-2.5 text-[11px] leading-[1.75]"
            style={{ borderColor: `${R.ink}30` }}>
            <div>
                <p className="font-bold mb-1" style={{ color: R.ink }}>고객 돈은 왜 늘고 줄까</p>
                <p className="break-keep" style={{ color: R.inkDim }}>
                    고객은 벤치마크(그냥 사서 들고 있기)와 견줘서 돈을 맡기거나 뺍니다.
                    지수만큼도 못 벌면 굳이 나에게 맡길 이유가 없고, 덜 잃었어도 잃은 건 잃은 겁니다.
                </p>
                <ul className="mt-1.5 flex flex-col gap-1">
                    <Row k="식" v={`(내 수익률 − 벤치마크) × ${FLOW_EXCESS_MULT} + 손실분 × ${FLOW_LOSS_MULT}`} />
                    <Row k="한 분기" v={`${FLOW_MIN}% ~ +${FLOW_MAX}% 안에서만 움직입니다`} />
                    <Row k="이겼을 때" v={ex(8, 5)} />
                    <Row k="둘 다 손실" v={ex(-4, -6)} />
                    <Row k="졌을 때" v={ex(2, 9)} />
                    <Row k="순서" v="먼저 이번 반기 수익률이 맡은 돈에 곱해지고, 그다음 고객이 들고 납니다" />
                    <Row k="하한" v="없습니다. 크게 잃으면 다음 반기에 굴릴 돈도 그만큼 줄어듭니다" />
                </ul>
            </div>
            <div>
                <p className="font-bold mb-1" style={{ color: R.ink }}>내 회사 돈(보수)은 어디서 나오나</p>
                <ul className="flex flex-col gap-1">
                    <Row k="운용보수" v={`맡은 돈 × ${(BASE_FEE_BP / 100).toFixed(2)}% — 성적과 무관하게 분기마다 (연 ${(BASE_FEE_BP * 4 / 100).toFixed(0)}%)`} />
                    <Row k="성과보수" v={`맡은 돈 × 초과수익(%p) × ${PERF_FEE_PCT}% — 벤치마크를 이겼을 때만`} />
                    <Row k="쓰는 곳" v="리서치실 도구를 사는 데 씁니다. 굴리는 돈과는 다른 주머니입니다." />
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
        <div style={{ background: R.face, boxShadow: OUT }} className="p-2">
            <details className="group">
                <summary className="cursor-pointer list-none flex items-center gap-2">
                    <span className="p-1 shrink-0" style={{ background: R.faceLo, boxShadow: IN, color: R.inkHi }}>{icon}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: R.ink }}>{title}</span>
                        <span className="block text-[11px] truncate" style={{ color: R.inkDim }}>{subtitle}</span>
                    </span>
                    <ChevronDown size={14} className="shrink-0 transition-transform group-open:rotate-180" style={{ color: R.inkDim }} />
                </summary>
                <div className="mt-2 pt-2 border-t" style={{ borderColor: `${R.ink}30` }}>{children}</div>
            </details>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
/**
 * 지난 분기 한 줄. 한 반기에 네 종목이라 합쳐 놓으면 "+3%" 만 남고 어느 종목이 벌고 어느
 * 종목이 까먹었는지가 사라진다. 줄을 펼치면 자리별 성적이 나온다.
 *
 * 자리 기록이 없는 옛 판(종목 하나로 굴리던 시절)은 펼칠 것이 없어 그냥 한 줄이다.
 */
function PastHalf({ h }: { h: ReplayHistoryItem }) {
    const win = (h.final_return ?? 0) >= 0;
    const flow = (h.aum_after ?? 0) - (h.aum_before ?? 0);
    const stocks = h.stocks ?? [];

    const head = (
        <>
            <div className="min-w-0">
                {/* 이월한 분기는 아직 그 회사를 들고 있다 — 목록에서도 열지 않는다.
                    여기서 열면 이어지는 판이 블라인드가 아니게 된다. */}
                {h.carried ? (
                    <div className="font-bold truncate flex items-center gap-1 text-[11px]" style={{ color: "#7a4f00" }}>
                        <EyeOff size={12} className="shrink-0" /> 아직 들고 있음
                    </div>
                ) : (
                    <div className="font-bold truncate text-[11px]" style={{ color: R.ink }}>{h.name ?? h.ticker}</div>
                )}
                {/* 한 줄로 끊는다 — 모바일에서 이 줄이 접히면 한 칸이 세 줄이 된다.
                    자리 기록이 있으면 "정리하면 열립니다"를 빼는데, 어느 자리가 아직 열려
                    있는지는 펼치면 자리마다 나오기 때문이다(같은 말을 두 번 적지 않는다). */}
                <div className="text-[11px] tabular-nums truncate" style={{ color: R.inkDim }}>
                    {h.carried ? `${fmtDate(h.start_date)} ~` : `${fmtDate(h.start_date)} ~ ${fmtDate(h.end_date)}`}
                    {stocks.length === 0 && h.carried ? " · 정리하면 열립니다" : ""}
                </div>
            </div>
            <div className="text-right shrink-0">
                <div className={cn("text-[11px] font-bold tabular-nums", pnlText(win))}>{pct(h.final_return ?? 0)}</div>
                <div className="text-[11px]" style={{ color: R.inkDim }}>
                    벤치마크 {pct(h.bh_return ?? 0)}
                    {h.aum_after !== null && (
                        <span className={cn("ml-1 font-bold", pnlText(flow >= 0))}>
                            · 자금 {flow >= 0 ? "+" : "−"}{fmtMoney(Math.abs(flow))}
                        </span>
                    )}
                </div>
            </div>
        </>
    );

    if (stocks.length === 0) {
        return <li className="flex items-center justify-between gap-3 py-2.5">{head}</li>;
    }

    return (
        <li>
            <details className="group/half">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 py-2.5">
                    {head}
                    <ChevronDown size={13} className="shrink-0 transition-transform group-open/half:rotate-180" style={{ color: R.inkDim }} />
                </summary>
                <ul className="pb-2.5 flex flex-col gap-1">
                    {stocks.map(s => <PastStock key={s.slot} s={s} />)}
                </ul>
            </details>
        </li>
    );
}

/** 지난 분기의 한 자리. 손익은 원으로, 그 옆에 넣은 돈 대비 몇 %였는지. */
function PastStock({ s }: { s: HistoryStock }) {
    const rate = s.invested > 0 ? (s.realized / s.invested) * 100 : null;
    return (
        <li className="flex items-center justify-between gap-2 px-1.5 py-1" style={{ background: R.faceLo, boxShadow: IN }}>
            <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-[17px] h-[12px] overflow-hidden shrink-0">
                    <SectorSprite sector={s.sector ?? undefined} color={sectorAccent(s.sector ?? undefined)} />
                </span>
                {/* 이월한 자리는 다음 판에서 아직 굴리는 중이라 이름을 못 연다 */}
                {s.carried ? (
                    <span className="truncate text-[11px] font-bold flex items-center gap-1" style={{ color: "#7a4f00" }}>
                        <EyeOff size={11} className="shrink-0" /> 들고 감
                    </span>
                ) : (
                    <span className="truncate text-[11px] font-bold" style={{ color: R.ink }}>
                        {s.name ?? s.sector ?? `${s.slot + 1}번`}
                    </span>
                )}
            </span>
            <span className="shrink-0 text-right">
                {s.invested > 0 ? (
                    <>
                        <span className={cn("text-[11px] font-bold tabular-nums", pnlText(s.realized >= 0))}>
                            {s.realized >= 0 ? "+" : "−"}{fmtMoney(Math.abs(s.realized))}
                        </span>
                        <span className="ml-1.5 text-[11px] tabular-nums" style={{ color: R.inkDim }}>
                            {rate !== null && `${pct(rate)} · `}{s.trades}번
                        </span>
                    </>
                ) : (
                    <span className="text-[11px]" style={{ color: R.inkDim }}>안 삼</span>
                )}
            </span>
        </li>
    );
}

// ─────────────────────────────────────────────────────────
/**
 * 시작 화면 뒤에 깔리는 그림 — 픽셀 봉차트 능선.
 *
 * 사람 그림 대신 이걸 두는 이유는 두 가지다. 하나는 이 게임이 실제로 보여 주는 것이
 * 캔들이라는 것이고, 다른 하나는 그림 파일을 늘리지 않고 끝난다는 것이다.
 *
 * 값은 손으로 적은 고정 배열이다 — 무작위로 만들면 서버가 그린 것과 브라우저가 그린 것이
 * 달라 하이드레이션에서 어긋난다.
 */
const TITLE_CANDLES = [
    [3, 7], [5, 9], [4, 11], [8, 13], [6, 10], [9, 15], [12, 18], [10, 16],
    [13, 20], [11, 17], [14, 22], [17, 25], [15, 21], [12, 19], [16, 24],
    [19, 28], [22, 31], [20, 27], [23, 33], [26, 36], [24, 32], [27, 38],
] as const;

function TitleArt() {
    const W = TITLE_CANDLES.length * 6;
    return (
        // 아래 절반에만 깔고 흐리게 둔다. 글자 뒤로 봉이 지나가면 한글 획과 봉의 몸통이
        // 뒤엉켜 둘 다 안 읽힌다 — 배경은 배경으로 남아야 한다.
        <svg viewBox={`0 0 ${W} 40`} width="100%" height="55%" preserveAspectRatio="none"
            aria-hidden className="absolute inset-x-0 bottom-0 opacity-[0.16]">
            {TITLE_CANDLES.map(([lo, hi], i) => {
                const up = i === 0 || hi >= TITLE_CANDLES[i - 1][1];
                return (
                    <rect key={i} x={i * 6 + 1} y={40 - hi} width={4} height={Math.max(1, hi - lo)}
                        fill={up ? UP_COLOR : DOWN_COLOR} />
                );
            })}
        </svg>
    );
}

/**
 * ① 시작.
 *
 * 여기서 할 수 있는 일은 하나다 — 들어가기. 예전 대시보드는 이 자리에서 기간도 고르고
 * 도구도 사고 지난 성적도 봤는데, 그러면 "무엇을 하는 화면인가"가 상태마다 달라진다.
 *
 * 다만 이어서 굴리는 사람에게는 여기가 리셋처럼 보이면 안 되므로, 회사가 어디까지 왔는지
 * 한 칸으로 적어 둔다.
 */
function TitleScreen({ isLoggedIn, firm, campaign, bestReturn, onEnter }: {
    isLoggedIn: boolean; firm: Firm | null; campaign: Campaign | null;
    bestReturn: number | null; onEnter: () => void;
}) {
    // "아무 키나 누르세요" 는 적어만 두면 거짓말이 된다 — 실제로 듣는다.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // 탭 이동 중이거나 조합키를 누른 것은 "아무 키"가 아니다.
            if (e.key === "Tab" || e.metaKey || e.ctrlKey || e.altKey) return;
            onEnter();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onEnter]);

    return (
        <Win title="IDIOTQUANT ARCADE" right="1998" className="pop-in">
            <Crt className="px-4 py-8 sm:py-14 flex flex-col items-center text-center">
                <TitleArt />
                <div className="relative">
                    <p className="text-[11px] tracking-[0.3em]" style={{ color: `${R.inkHi}99` }}>STOCK TRADING SIMULATION</p>
                    <h1 className="mt-2 text-[33px] sm:text-[44px] leading-none font-bold"
                        style={{ color: R.neon, textShadow: `0 0 12px ${R.neon}66, 3px 3px 0 #0a1013` }}>
                        내 운용사
                    </h1>
                    <p className="mt-2 text-[11px] tracking-[0.2em]" style={{ color: R.pink }}>BLIND CHART REPLAY</p>

                    <p className="mt-6 text-[11px] leading-[1.9] break-keep max-w-[22em] mx-auto" style={{ color: `${R.inkHi}cc` }}>
                        어느 종목인지, 언제인지 모르는 차트를 하루씩 넘기며 사고팝니다.
                        <br />반기 성적이 맡은 돈에 곱해지고, 고객이 돈을 맡기거나 빼갑니다.
                    </p>

                    <RetroBtn tone="go" size="lg" onClick={onEnter} className="mt-7 min-w-[180px]">
                        START
                    </RetroBtn>
                    <p className="mt-3 text-[11px]" style={{ color: `${R.inkHi}88` }}>
                        <Blink>PRESS ANY KEY</Blink>
                    </p>
                </div>
            </Crt>

            {/* 이어하기 — 이 화면이 처음부터 다시 시작하는 자리가 아니라는 것을 말해 준다. */}
            <div className="mt-1.5">
                {isLoggedIn ? (
                    <Sunken className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]" >
                        <span style={{ color: `${R.inkHi}99` }}>SAVE DATA</span>
                        <span style={{ color: R.inkHi }}>{firm?.name ?? "내 운용사"}</span>
                        <span style={{ color: R.amber }}>{firm?.rank ?? rankOf(firm?.aum ?? INITIAL_AUM)}</span>
                        <span className="tabular-nums" style={{ color: R.inkHi }}>{fmtMoney(firm?.aum ?? INITIAL_AUM)}</span>
                        <span className="tabular-nums" style={{ color: `${R.inkHi}99` }}>{firm?.quarters ?? 0}반기</span>
                        {bestReturn !== null && (
                            <span className={cn("tabular-nums", pnlLit(bestReturn >= 0))}>최고 {pct(bestReturn)}</span>
                        )}
                        {campaign && (
                            <span className="tabular-nums ml-auto" style={{ color: R.neon }}>
                                {campaign.years}년 {campaign.done_halves}/{campaign.total_halves}반기 진행 중
                            </span>
                        )}
                    </Sunken>
                ) : (
                    <Sunken className="text-[11px] leading-[1.8] break-keep" style={{ color: R.inkHi }}>
                        <Link href="/login?callbackUrl=%2Fgame" className="underline font-bold" style={{ color: R.neon }}>로그인</Link>
                        하면 내 운용사가 생기고, 성적이 고객 자금과 보수로 쌓입니다.
                        로그인 없이도 한 판은 그대로 굴려 볼 수 있습니다.
                    </Sunken>
                )}
            </div>
        </Win>
    );
}

// ─────────────────────────────────────────────────────────
/**
 * ② 준비 — 목업의 GAME SETUP.
 *
 * 목업은 여기서 종목을 고르지만 이 게임은 종목을 가린 채로 하는 게임이라, 그 자리에는
 * **어떤 자리에서 시작할지**(급락 뒤·횡보·고점 근처)를 놓는다. 고를 수 있는 것 중에
 * 정답을 새지 않는 것은 그것뿐이다 — 성격은 서버가 컨텍스트 구간만 보고 붙인다.
 *
 * 굴릴 돈도 목업처럼 눈금으로 고를 수는 없다. 그 값은 회사가 지금까지 벌어 온 결과라
 * 여기서 정하는 것이 아니다. 눈금 대신 읽는 칸으로 둔다.
 */
/**
 * 지금 어느 단계인가.
 *
 * 여섯 칸을 그냥 늘어놓으면 반기가 끝날 때마다 "설정을 또 해야 하나" 가 된다. 되풀이되는
 * 셋(준비·게임·반기 종료)을 한 칸에 묶고 그 옆에 몇 바퀴째인지를 붙여, 되풀이가 어디서
 * 시작해 어디서 끝나는지를 줄 하나로 말한다.
 *
 * 좁은 화면에서는 가로로 밀린다 — 줄바꿈하면 묶인 칸이 갈라져 뜻이 사라진다.
 */
function PhaseBar({ phase, loopNote }: { phase: Phase; loopNote: string | null }) {
    const at = PHASE_ORDER.indexOf(phase);
    const chip = (id: Phase) => {
        const i = PHASE_ORDER.indexOf(id);
        const now = id === phase;
        return (
            <span key={id} aria-current={now ? "step" : undefined}
                className={cn("px-1.5 py-0.5 text-[11px] leading-none whitespace-nowrap", now && "font-bold")}
                style={now
                    ? { background: R.neon, color: R.bg, boxShadow: OUT }
                    // 지나온 칸은 읽히게, 앞으로 올 칸은 흐리게. 어디까지 왔는지가 색으로 남는다.
                    : { background: R.face, color: i < at ? R.ink : R.inkDim, boxShadow: OUT, opacity: i < at ? 1 : 0.6 }}>
                {PHASE_LABEL[id]}
            </span>
        );
    };
    const arrow = (k: string) => (
        <span key={k} aria-hidden className="text-[11px] leading-none px-0.5" style={{ color: `${R.inkHi}55` }}>›</span>
    );
    const inLoop = LOOP_PHASES.includes(phase);

    return (
        <nav aria-label="진행 단계" className="shrink-0 -mx-1 px-1 overflow-x-auto">
            <div className="flex items-center gap-0.5 w-max py-0.5">
                {chip("title")}
                {arrow("a")}
                {chip("setup")}
                {arrow("b")}
                {/* 되풀이되는 구간 — 파인 면으로 한 덩어리라는 것을 보인다 */}
                <span className="flex items-center gap-0.5 px-1 py-0.5"
                    style={{ background: R.faceLo, boxShadow: IN }}>
                    {chip("ready")}
                    {arrow("c")}
                    {chip("play")}
                    {arrow("d")}
                    {chip("halfEnd")}
                    <span className="pl-1 text-[11px] leading-none whitespace-nowrap tabular-nums"
                        style={{ color: inLoop ? R.ink : R.inkDim }}>
                        ↺ {loopNote ?? "반기마다"}
                    </span>
                </span>
                {arrow("e")}
                {chip("end")}
            </div>
        </nav>
    );
}

// ─────────────────────────────────────────────────────────
/**
 * 준비 — 종목은 뽑혔고 아직 하루도 안 넘겼다.
 *
 * 예전에는 [시작] 을 누르면 종목이 뽑히면서 곧바로 차트로 떨어졌다. 무엇을 하러 들어왔는지
 * (누가 맡겼고, 무엇을 해내야 하고, 어떤 자리 넷이 뽑혔는지) 읽을 자리가 그 사이에 없어서,
 * 첫 며칠은 화면을 파악하는 데 쓰였다.
 *
 * 여기서 여는 것은 이미 개요 화면에 있는 것들뿐이다 — 업종과 자리 성격. 이름도 시기도
 * 그대로 가려 둔다. 앞 한 달 차트를 여기서 그리지 않는 것도 같은 이유다: 그건 게임 안에서
 * 볼 것이지, 들어가기 전에 훑을 것이 아니다.
 */
function ReadyScreen({
    round, season, isLoggedIn, busy, halfTitle, ctxDays, totalDays, perks, onOpen,
}: {
    round: ReplayRound;
    season: Season | null;
    isLoggedIn: boolean;
    busy: boolean;
    halfTitle: string;
    ctxDays: number;
    totalDays: number;
    perks: Perks;
    onOpen: () => void;
}) {
    const holdings = round.holdings ?? [];
    const carried = holdings.filter(h => h.carried);
    // 하루씩 넘길 날 수. 앞 구간은 이미 보여 준 자리라 세지 않는다.
    const playDays = Math.max(1, totalDays - ctxDays + 1);

    return (
        <Win title="BRIEFING — 준비" right={halfTitle} className="pop-in">
            <p className="text-[13px] leading-[1.75] break-keep mb-1.5" style={{ color: R.ink }}>
                종목이 정해졌습니다. <b>이름과 시기는 가려져 있습니다.</b> 앞 {ctxDays}일을 먼저 보고,
                거기서부터 하루씩 {playDays}일을 넘깁니다.
            </p>

            <Sunken className="flex flex-col mb-1.5">
                <StatLine label="굴릴 돈" value={`${fmtMoney(round.seed)}원`} />
                <StatLine label="자리" value={`${holdings.length || 1}종목`} />
                <StatLine label="걸어 둘 예약" value={`${perks.maxReservations}건`} />
                <StatLine label="강제 청산" value={`담보의 ${perks.shortCallPct}%`} />
            </Sunken>

            {/* 이번 반기의 고객과 목표. 설정 화면에서 이미 한 번 봤지만, 판에 들어가기
                직전에 한 번 더 읽는 것이 이 화면이 있는 이유의 절반이다. */}
            {season && (
                <Win title="이번 반기 / MANDATE" className="mb-1.5">
                    <Sunken className="flex flex-col gap-1">
                        <p className="text-[11px] leading-[1.7] break-keep" style={{ color: R.ink }}>
                            <b>{season.client.name}</b>
                            <span style={{ color: R.inkDim }}> · {season.client.blurb}</span>
                        </p>
                        <p className="text-[11px] leading-[1.7] break-keep" style={{ color: R.ink }}>
                            <b style={{ color: "#9e1414" }}>목표</b> {season.mission.detail}
                            <span style={{ color: R.inkDim }}> 해내면 회사 자금 {fmtMoney(season.mission.reward)}.</span>
                        </p>
                    </Sunken>
                </Win>
            )}

            {/* 뽑힌 자리 넷. 업종과 성격은 진행 중에도 열려 있는 값이라 여기서 미리 봐도
                정답이 새지 않는다 — 오히려 "어디에 얼마를" 을 들어가기 전에 정할 수 있다. */}
            {holdings.length > 1 && (
                <Win title="뽑힌 자리 / SLOTS" className="mb-1.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                        {holdings.map(h => (
                            <div key={h.slot} className="px-1.5 py-1.5 flex flex-col gap-0.5 min-w-0"
                                style={{ background: R.faceLo, boxShadow: IN }}>
                                <span className="flex items-center gap-1 text-[11px] truncate" style={{ color: R.ink }}>
                                    <span className="w-[15px] h-[11px] overflow-hidden shrink-0">
                                        <SectorSprite sector={h.sector ?? undefined} color={sectorAccent(h.sector ?? undefined)} />
                                    </span>
                                    <span className="truncate font-bold">{slotName(h)}</span>
                                </span>
                                <span className="text-[11px] truncate" style={{ color: R.inkDim }}>
                                    {scenarioLabel(h.scenario) ?? "성격 미상"}
                                </span>
                                {h.carried && (
                                    <span className="text-[11px] truncate" style={{ color: R.amber }}>
                                        이월 {h.qty}주
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="mt-1 text-[11px] break-keep leading-[1.7]" style={{ color: R.inkDim }}>
                        성격은 앞 구간만 보고 붙인 값입니다 — 앞으로 어떻게 될지는 말해 주지 않습니다.
                    </p>
                </Win>
            )}

            {carried.length > 0 && (
                <Sunken className="mb-1.5">
                    <p className="text-[11px] break-keep leading-[1.8]" style={{ color: R.amber }}>
                        지난 반기에서 {carried.length}종목을 들고 왔습니다. 굴릴 돈 중 일부가 이미
                        그 회사들에 들어가 있고, 그 자리는 이름이 아직 열리지 않습니다.
                    </p>
                </Sunken>
            )}

            <RetroBtn tone="go" size="lg" onClick={onOpen} disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2">
                <Play size={16} strokeWidth={2.6} /> 장 열기 ▶
            </RetroBtn>

            {!isLoggedIn && (
                <p className="mt-1.5 text-[11px] break-keep leading-[1.7]" style={{ color: R.inkDim }}>
                    체험 운용입니다. 기록은 남지 않고, 자리도 하나뿐입니다.
                </p>
            )}
        </Win>
    );
}

// ─────────────────────────────────────────────────────────
function SetupScreen({
    isLoggedIn, busy, firm, campaign, history, habits,
    activeTools, onOpenCampaign, onStart, onBuyTool, onToggleTool, onBack,
    want, onWant,
}: {
    isLoggedIn: boolean; busy: boolean; firm: Firm | null; campaign: Campaign | null;
    history: ReplayHistoryItem[]; habits: HabitSummary | null; activeTools: string[];
    onOpenCampaign: (years: number) => void;
    onStart: (scenario?: string | null) => void;
    onBuyTool: (id: string) => void;
    onToggleTool: (id: string) => void;
    onBack: () => void;
    /** 고른 판 성격. null 이면 아무 자리나. 페이지가 들고 있다 — 결과 화면에서 바로
        다음 반기를 열 때도 같은 값을 쓰고, 새로고침해도 남아야 한다. */
    want: string | null;
    onWant: (v: string | null) => void;
}) {
    const aum = firm?.aum ?? INITIAL_AUM;
    const owned = firm?.tools ?? [];
    // 기간 눈금. 캠페인을 열기 전까지만 뜻이 있다.
    const [years, setYears] = useState<number>(YEAR_CHOICES[0]);

    // 이월이 있으면 자리를 고를 수 없다 — 이미 들고 있는 회사로 이어 가는 판이다.
    const canPickScenario = isLoggedIn && !!campaign && !firm?.carry?.length;

    // 이번 반기에 누가 맡겼고 무엇을 해내야 하는가. 기간을 열기 전에는 없다.
    const season = seasonOf(campaign?.id, campaign?.half_index);

    return (
        <>
            <Win title="GAME SETUP" onClose={onBack} closeLabel="시작 화면으로" className="pop-in">
                {/* ── 이번 판이 어떤 판인가 ──────────────────────
                    로그인 전에는 고를 수 있는 것이 하나도 없다(기간도 자리도 회사가 있어야
                    생긴다). 그렇다고 시작 버튼만 놓인 빈 창을 준비 화면이라 부를 수는 없어서,
                    무엇을 하러 들어가는지를 여기서 알려 준다. */}
                <Win title="이번 판 / BRIEFING" className="mb-1.5">
                    <Sunken className="flex flex-col">
                        <StatLine label="굴릴 돈" value={isLoggedIn ? fmtMoney(aum) : fmtKrw(SEED)} />
                        <StatLine label="판 길이"
                            value={isLoggedIn ? "달력 45일" : `${TOTAL_DAYS}거래일`} />
                        <StatLine label="먼저 보는 구간"
                            value={isLoggedIn ? "앞 한 달" : `앞 ${CONTEXT_DAYS}일`} />
                        <StatLine label="가려진 것" value="종목명 · 시기" mono={false} />
                    </Sunken>

                    {!isLoggedIn && (
                        <>
                            <p className="mt-1.5 mb-1 text-[11px] font-bold" style={{ color: R.inkDim }}>
                                로그인하면 열립니다
                            </p>
                            <div className="grid grid-cols-2 gap-1">
                                {[`기간 선택 (${YEAR_CHOICES[0]}~${YEAR_CHOICES[YEAR_CHOICES.length - 1]}년)`,
                                    "시작할 자리 고르기", "리서치실 도구", "성적 · 매매 습관 기록",
                                ].map(x => (
                                    <div key={x} className="flex items-center gap-1 px-1.5 py-1.5 text-[11px]"
                                        style={{ background: R.faceLo, boxShadow: IN, color: R.inkDim }}>
                                        <Lock size={11} className="shrink-0" />
                                        <span className="truncate">{x}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-1.5 text-[11px] leading-[1.8] break-keep" style={{ color: R.ink }}>
                                <Link href="/login?callbackUrl=%2Fgame" className="underline font-bold">로그인</Link>
                                하지 않아도 아래에서 한 판은 그대로 굴려 볼 수 있습니다. 다만 기록은 남지 않습니다.
                            </p>
                        </>
                    )}
                </Win>

                {/* ── 자리 고르기 (목업의 ASSET SELECTION) ──────────
                    고객과 목표를 한 줄로 얹어 둔다. 전문은 준비 화면에 있고 여기 있는 것은
                    **고르는 데 필요한 만큼**이다 — "잃지 않고 이기기" 가 걸린 반기에
                    고점 근처를 고르는 것과 횡보를 고르는 것은 다른 선택이다. */}
                {canPickScenario && (
                    <Win title="자리 선택 / SCENARIO" className="mb-1.5">
                        {season && (
                            <Sunken className="mb-1 py-1">
                                <p className="text-[11px] leading-[1.7] break-keep" style={{ color: R.inkDim }}>
                                    이번 반기 <b style={{ color: R.ink }}>{season.client.name}</b>
                                    {" · 목표 "}<b style={{ color: R.ink }}>{season.mission.label}</b>
                                </p>
                            </Sunken>
                        )}
                        <div className="grid grid-cols-2 gap-1">
                            {[{ id: null, label: "아무 자리나", hint: "서버가 뽑는 대로" }, ...SCENARIOS].map(sc => (
                                <RetroBtn key={sc.id ?? "any"} selected={want === sc.id} disabled={busy}
                                    onClick={() => onWant(sc.id)} title={sc.hint}
                                    className="min-h-[42px] flex items-center gap-1.5 justify-start text-left normal-case">
                                    {/* 고른 줄에만 커서를 둔다 — 이 시대 메뉴가 그랬다 */}
                                    <span className="w-[8px] shrink-0" style={{ color: R.ink }}>{want === sc.id ? "▶" : ""}</span>
                                    <span className="min-w-0">
                                        <span className="block truncate">{sc.label}</span>
                                        <span className="block text-[11px] font-normal truncate" style={{ color: R.inkDim }}>{sc.hint}</span>
                                    </span>
                                </RetroBtn>
                            ))}
                        </div>
                        <p className="mt-1 text-[11px] break-keep" style={{ color: R.inkDim }}>
                            고른 자리가 안 나오면 만들어진 판으로 시작합니다.
                        </p>
                    </Win>
                )}

                {/* ── 기간 (목업의 PERIOD SELECTION) ──────────────── */}
                {isLoggedIn && (
                    <Win title="기간 선택 / PERIOD" className="mb-1.5">
                        {!campaign ? (
                            <>
                                <div className="flex items-baseline justify-between gap-2 text-[11px] mb-1">
                                    <span style={{ color: R.ink }}>굴릴 기간</span>
                                    <span className="font-bold tabular-nums" style={{ color: R.ink }}>
                                        {years}년 · {totalHalves(years)}반기
                                    </span>
                                </div>
                                {/* 눈금은 연수 목록의 **자리 번호**를 움직인다. 1·3·5·10 처럼 띄엄띄엄한
                                    값이라 연수 자체를 min/max 로 두면 목록에 없는 해에 손잡이가 선다. */}
                                <PixelSlider
                                    id="setup-years"
                                    min={0} max={YEAR_CHOICES.length - 1} step={1}
                                    value={Math.max(0, YEAR_CHOICES.indexOf(years))}
                                    onChange={(i) => setYears(YEAR_CHOICES[i] ?? YEAR_CHOICES[0])}
                                    leftLabel={`${YEAR_CHOICES[0]}년`}
                                    rightLabel={`${YEAR_CHOICES[YEAR_CHOICES.length - 1]}년`}
                                    valueText={`${years}년`}
                                    disabled={busy}
                                />
                                <div className="flex items-baseline justify-between gap-2 text-[11px] mt-2">
                                    <span style={{ color: R.ink }}>굴릴 돈</span>
                                    <span className="font-bold tabular-nums" style={{ color: R.ink }}>{fmtMoney(aum)}</span>
                                </div>
                                {/* 목업은 여기도 눈금이지만, 이 값은 고르는 것이 아니라 지금까지의 결과다.
                                    움직이지 않는 것에 손잡이를 달면 한 번은 잡아당겨 본다. */}
                                <Sunken className="mt-1 py-1">
                                    <div className="text-[11px] tabular-nums" style={{ color: R.ink }}>
                                        {firm?.rank ?? rankOf(aum)} · 회사 금고 {fmtMoney(firm?.cash ?? 0)}
                                    </div>
                                </Sunken>
                                <p className="mt-1 text-[11px] break-keep leading-[1.7]" style={{ color: R.inkDim }}>
                                    고른 만큼 과거로 돌아가 한 반기(달력 45일)씩 굴려 옵니다. 도중에는 바꿀 수 없습니다.
                                </p>
                                <RetroBtn tone="go" onClick={() => onOpenCampaign(years)} disabled={busy}
                                    className="mt-1.5 w-full min-h-[42px]">
                                    CONFIRM — {years}년 시작
                                </RetroBtn>
                            </>
                        ) : (
                            <>
                                <div className="flex items-baseline justify-between gap-2 text-[11px]">
                                    <span style={{ color: R.ink }}>
                                        {campaign.years}년 중 {campaign.done_halves}/{campaign.total_halves}반기
                                    </span>
                                    <span className="tabular-nums" style={{ color: R.inkDim }}>
                                        {campaign.start_date.slice(0, 4)}년 {Number(campaign.start_date.slice(4, 6))}월부터
                                    </span>
                                </div>
                                <Sunken className="mt-1 py-1.5">
                                    <HalfTrack campaign={campaign} history={history} />
                                </Sunken>
                                <div className="flex items-baseline justify-between gap-2 text-[11px] mt-1.5">
                                    <span style={{ color: R.ink }}>굴릴 돈</span>
                                    <span className="font-bold tabular-nums" style={{ color: R.ink }}>{fmtMoney(aum)}</span>
                                </div>
                            </>
                        )}
                    </Win>
                )}

                {/* 이월은 자리마다 — 넷 중 둘만 들고 올 수도 있다 */}
                {!!firm?.carry?.length && (
                    <Sunken className="mb-1.5">
                        <p className="text-[11px] break-keep leading-[1.8]" style={{ color: R.amber }}>
                            지난 반기에서 {firm.carry.length}종목을 들고 왔습니다
                            {" ("}
                            {firm.carry.map(c => `${c.qty}주${c.sector ? ` · ${c.sector}` : ""}`).join(", ")}
                            {"). "}
                            같은 회사로 이어서 시작합니다 — 굴릴 돈 중 일부가 이미 그 회사들에 들어가 있습니다.
                        </p>
                    </Sunken>
                )}

                {/* 비로그인 체험은 캠페인 없이 한 판만 굴린다 — 기간을 고를 회사가 없다. */}
                {(!isLoggedIn || campaign) && (
                    <RetroBtn tone="go" size="lg" onClick={() => onStart(want)} disabled={busy}
                        className="w-full inline-flex items-center justify-center gap-2">
                        <Play size={16} strokeWidth={2.6} />
                        {busy ? "종목을 고르는 중…"
                            : !campaign ? "체험 한 판 — 준비로 ▶"
                                : `${campaign.year}년차 ${campaign.half_label}반기 ${firm?.carry?.length ? "이어서" : ""} 준비 ▶`}
                    </RetroBtn>
                )}

                {/* 규칙은 한 번 읽으면 되는 글이다. 매번 시작 버튼 앞을 막고 서 있을 이유가 없다. */}
                <details className="group mt-1.5">
                    <summary className="cursor-pointer list-none text-[11px] font-bold" style={{ color: R.inkDim }}>
                        규칙과 고객 돈 보기 <span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span>
                    </summary>
                    <div className="mt-1.5">
                        <ul className="flex flex-col gap-1.5 text-[11px] leading-[1.7]" style={{ color: R.ink }}>
                            {[
                                `지금 맡고 있는 돈으로 한 반기를 운용합니다. 1년은 8반기(1-1 … 4-2)입니다.`,
                                `한 반기는 달력 45일입니다. 앞 한 달을 먼저 보고, 그다음부터 하루씩 넘깁니다.`,
                                `사기는 내 돈 기준 비율입니다 — 네 종목에 고르게 담으려면 25%씩 누르면 됩니다.`,
                                `사고파는 것으로는 날이 안 갑니다. 하루는 관망에서만 지나갑니다.`,
                                `체결은 그날 종가. 수수료 0.015%, 매도 거래세 0.18%. 마지막 날 자동 청산.`,
                                `벤치마크(그냥 사서 들고 있기)와 견주어 고객 자금이 들고 납니다.`,
                            ].map((line, i) => (
                                <li key={i} className="flex gap-2 break-keep">
                                    <span className="tabular-nums font-bold shrink-0" style={{ color: "#7a4f00" }}>
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>
                        <MoneyFlowNote />
                    </div>
                </details>
            </Win>

            {isLoggedIn && (
                <Fold icon={<FlaskConical size={14} />} title="리서치실"
                    subtitle={`회사 금고 ${fmtMoney(firm?.cash ?? 0)}원 · 도구 ${TOOLS.filter(t => owned.includes(t.id)).length}/${TOOLS.length}`}>
                    <ul className="flex flex-col gap-1">
                        {TOOLS.map(t => {
                            const have = owned.includes(t.id);
                            const on = activeTools.includes(t.id);
                            return (
                                <li key={t.id} className="flex items-start justify-between gap-2 px-2 py-1.5"
                                    style={{ background: R.faceLo, boxShadow: IN }}>
                                    <div className="min-w-0">
                                        <div className="text-[11px] font-bold truncate" style={{ color: R.ink }}>
                                            {t.name} <span className="font-normal" style={{ color: R.inkDim }}>{t.detail}</span>
                                        </div>
                                        {/* 읽는 법을 적어 둔다 — 이름만 보고는 사도 쓸 줄 모른다 */}
                                        <p className="mt-0.5 text-[11px] leading-[1.6] break-keep" style={{ color: R.inkDim }}>
                                            {t.hint}
                                        </p>
                                    </div>
                                    {have ? (
                                        <RetroBtn size="sm" selected={on} onClick={() => onToggleTool(t.id)}
                                            className="shrink-0 inline-flex items-center gap-1">
                                            <Check size={11} /> {on ? "켜짐" : "꺼짐"}
                                        </RetroBtn>
                                    ) : (
                                        <RetroBtn size="sm" onClick={() => onBuyTool(t.id)}
                                            disabled={busy || (firm?.cash ?? 0) < t.price}
                                            className="shrink-0 inline-flex items-center gap-1">
                                            <Lock size={11} /> {fmtMoney(t.price)}
                                        </RetroBtn>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </Fold>
            )}

            {isLoggedIn && (
                <Fold icon={<Building2 size={14} />} title="회사 키우기"
                    subtitle={`부서 ${owned.filter(id => DEPARTMENTS.some(d => d.id === id)).length}/${DEPARTMENTS.length} · 금고에서 냅니다`}>
                    {/* 도구는 차트를 더 잘 보게 해 주고, 부서는 판의 규칙을 바꾼다.
                        섞어 놓으면 "산 것" 목록이 길어지기만 해서 칸을 따로 뒀다. */}
                    <ul className="flex flex-col gap-1">
                        {DEPARTMENTS.map(d => {
                            const have = owned.includes(d.id);
                            return (
                                <li key={d.id} className="flex items-start justify-between gap-2 px-2 py-1.5"
                                    style={{ background: R.faceLo, boxShadow: IN }}>
                                    <div className="min-w-0">
                                        <div className="text-[11px] font-bold truncate" style={{ color: R.ink }}>{d.name}</div>
                                        <p className="mt-0.5 text-[11px] leading-[1.6] break-keep" style={{ color: R.inkDim }}>
                                            {d.effect}
                                        </p>
                                    </div>
                                    {have ? (
                                        <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-1 text-[11px] font-bold"
                                            style={{ color: "#1a6b2a" }}>
                                            <Check size={11} /> 개설
                                        </span>
                                    ) : (
                                        <RetroBtn size="sm" onClick={() => onBuyTool(d.id)}
                                            disabled={busy || (firm?.cash ?? 0) < d.price}
                                            className="shrink-0 inline-flex items-center gap-1">
                                            <Lock size={11} /> {fmtMoney(d.price)}
                                        </RetroBtn>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </Fold>
            )}

            {habits && habits.trades > 0 && (
                <Fold icon={<Footprints size={14} />} title="매매 습관"
                    subtitle={`${habits.quarters}분기 · 체결 ${habits.trades}회`}>
                    <ul className="flex flex-col gap-1">
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
                    <p className="mt-2 text-[11px] break-keep leading-[1.7]" style={{ color: R.inkDim }}>
                        이 게임에서 관찰된 값입니다. 표본이 적으면 다음 분기에 크게 달라질 수 있습니다.
                    </p>
                </Fold>
            )}

            {history.length > 0 && (
                <Fold icon={<History size={14} />} title="지난 반기"
                    subtitle={`최근 ${history.length}반기 · 마지막 ${pct(history[0]?.final_return ?? 0)}`}>
                    <MoneyCurve history={history} />
                    <ul className="flex flex-col divide-y" style={{ borderColor: `${R.ink}25` }}>
                        {history.map(h => <PastHalf key={h.id} h={h} />)}
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
            <span className="shrink-0 w-[56px]" style={{ color: R.inkDim }}>{k}</span>
            <span className="tabular-nums" style={{ color: R.ink }}>{v}</span>
        </li>
    );

    return (
        <details className="group w-full">
            <summary className="cursor-pointer list-none text-[11px] font-bold" style={{ color: R.inkDim }}>
                계산식 <span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span>
            </summary>
            <ul className="mt-1.5 flex flex-col gap-1 text-[11px] leading-[1.7]">
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

/**
 * 반기 성적표 — 목업의 TOTAL WEALTH STATISTICS 자리.
 *
 * 창은 바깥(결과 화면)이 씌운다. 여기는 안에 들어갈 것만 그린다 — 같은 내용이
 * 진행 화면 위에 얹히던 시절의 흔적(패널·테두리)을 들고 있을 이유가 없다.
 */
function HalfScore({ round, isLoggedIn, season, ruined, keepPct }: {
    round: ReplayRound; isLoggedIn: boolean;
    /** 이 반기의 고객과 목표. 캠페인 없이 굴린 판·체험 운용에는 없다. */
    season: Season | null;
    /** 이 반기로 회사가 문을 닫았는가. 서버가 알려 준 값이다. */
    ruined: boolean;
    /** 문을 닫는 선(%). 리스크 관리팀이 있으면 낮다. */
    keepPct: number;
}) {
    const mine = round.final_return ?? 0;
    const bh = round.bh_return ?? 0;
    const beat = mine > bh;

    // 정산은 서버가 남긴 값을 그대로 쓴다 — 규칙이 바뀌어도 지난 기록은 그때 값이어야 한다.
    const settled = round.aum_before !== null && round.aum_after !== null;
    const flow = settled ? round.aum_after! - round.aum_before! : 0;
    const flowPct = settled && round.aum_before! > 0 ? (flow / round.aum_before!) * 100 : 0;
    const feeTotal = (round.fee_base ?? 0) + (round.fee_perf ?? 0);

    return (
        <div className="flex flex-col gap-1.5">
            {/* 두 수익률은 브라운관 안에 넣는다 — 이 화면에서 가장 먼저 읽힐 것이고,
                검은 바탕 위 큰 숫자는 이 시대 기계가 성적을 말하던 방식이다. */}
            <Crt className="px-3 py-2.5 flex items-end justify-between gap-3 flex-wrap">
                <div>
                    <p className="text-[11px]" style={{ color: `${R.inkHi}99` }}>내 수익률</p>
                    <p className={cn("text-[33px] sm:text-[44px] leading-none font-bold tabular-nums", pnlLit(mine >= 0))}>
                        {pct(mine)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[11px]" style={{ color: `${R.inkHi}99` }}>벤치마크</p>
                    <p className={cn("text-[22px] leading-none font-bold tabular-nums", pnlLit(bh >= 0))}>{pct(bh)}</p>
                </div>
            </Crt>

            <p className="text-[13px] font-bold break-keep leading-[1.7]" style={{ color: R.ink }}>
                {beat
                    ? `벤치마크보다 ${(mine - bh).toFixed(2)}%p 더 벌었습니다.`
                    : `벤치마크가 ${(bh - mine).toFixed(2)}%p 더 벌었습니다.`}
            </p>

            {/* 이번 반기의 목표. 해냈는지는 반기가 닫힐 때 정해져 판에 적혀 온다. */}
            {season && round.mission_ok !== null && round.mission_ok !== undefined && (
                <p className={cn("text-[13px] font-bold break-keep leading-[1.7]",
                    round.mission_ok && "flash-mine px-1")}
                    style={{ color: round.mission_ok ? "#7a4f00" : R.inkDim }}>
                    {round.mission_ok
                        ? `목표 달성 — ${season.mission.label}. 회사 자금 ${fmtMoney(season.mission.reward)}이 들어왔습니다.`
                        : `목표를 놓쳤습니다 — ${season.mission.label}.`}
                </p>
            )}

            {round.carried && (
                <p className="text-[13px] font-bold break-keep leading-[1.7]" style={{ color: "#7a4f00" }}>
                    {round.qty}주를 다음 반기로 넘겼습니다. 아직 들고 있으므로 어떤 회사였는지는 열지 않습니다.
                </p>
            )}

            {/* 폐업. 이 화면에서 가장 큰 소식이라 정산 칸보다 앞에 둔다 —
                아래 숫자들은 "그래서 얼마였나" 이고, 이건 "회사가 없어졌다" 이다. */}
            {ruined && (
                <Sunken className="px-2 py-1.5">
                    <p className="text-[13px] font-bold break-keep leading-[1.7]" style={{ color: "#9e1414" }}>
                        맡은 돈이 최고점의 {keepPct}% 아래로 내려가 회사가 문을 닫았습니다.
                    </p>
                    <p className="text-[11px] break-keep leading-[1.7]" style={{ color: R.inkDim }}>
                        굴리던 기간도 여기서 끝납니다. 회사는 {fmtMoney(INITIAL_AUM)}으로 다시 차렸고,
                        이름과 사 둔 도구, 모아 둔 자금은 그대로 남아 있습니다.
                    </p>
                </Sunken>
            )}

            {round.habits && round.habits.trades > 0 && (
                <p className="text-[11px] break-keep leading-[1.7]" style={{ color: R.inkDim }}>
                    {habitLine(round.habits)}
                </p>
            )}

            {settled ? (
                <>
                    {/* 등급이 바뀌는 건 자주 없는 일이다 — 그 줄만 한 번 물들여 눈에 띄게 한다 */}
                    <p className={cn("text-[13px] font-bold break-keep leading-[1.7]",
                        rankOf(round.aum_before!) !== rankOf(round.aum_after!) && "flash-mine px-1")}
                        style={{ color: "#7a4f00" }}>
                        {clientNote(flow, flowPct, rankOf(round.aum_before!), rankOf(round.aum_after!))}
                    </p>
                    <Sunken className="flex flex-col">
                        {/* 누가 이 성적을 평가했는지. 같은 수익률도 고객에 따라 다르게 잡히므로,
                            유출입 숫자만 보여 주면 왜 이만큼인지 되짚을 길이 없다. */}
                        {season && <StatLine label="고객" value={season.client.name} mono={false} />}
                        <StatLine label="고객 자금" tone={flow >= 0 ? "#9e1414" : "#1d4ed8"}
                            value={`${flowPct >= 0 ? "+" : ""}${flowPct.toFixed(1)}%`} />
                        <StatLine label="맡은 돈" value={fmtMoney(round.aum_after!)} />
                        <StatLine label="보수" tone="#7a4f00" value={`+${fmtMoney(feeTotal)}`} />
                        <StatLine label="└ 운용 · 성과"
                            value={`${fmtMoney(round.fee_base ?? 0)} · ${fmtMoney(round.fee_perf ?? 0)}`} />
                    </Sunken>
                    <FeeMath round={round} mine={mine} bh={bh} />
                </>
            ) : isLoggedIn ? null : (
                <p className="text-[11px]" style={{ color: R.inkDim }}>
                    체험 운용이라 회사에는 반영되지 않았습니다.
                </p>
            )}
        </div>
    );
}
