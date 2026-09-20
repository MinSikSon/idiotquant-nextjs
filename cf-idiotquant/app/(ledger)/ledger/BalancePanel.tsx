"use client";

// 자산 · 부채 — 가계부의 **잔고** 쪽.
//
// ── 왜 내역과 다른 칸인가 ─────────────────────────────────────
// 위쪽 내역은 하루하루의 수입·지출, 곧 **흐름**이다. 이 칸은 달이 끝난 시점의
// 자산과 부채, 곧 **잔고**다. 흐름을 아무리 더해도 잔고가 안 나온다 — 시세가 오른
// 집값도 아직 안 갚은 대출도 수입·지출로는 한 번도 안 지나가기 때문이다.
//
// ── 순자산 칸이 없는 이유 ─────────────────────────────────────
// 순자산 = 자산 − 부채라 **언제나 계산되는 값**이다. 칸으로 받으면 셋이 서로 안 맞는
// 달이 생기고(자산 1억 / 부채 3천 / 순자산 8천) 그때 어느 쪽이 맞는지 알 방법이 없다.
// 뺄셈은 `core` 의 `netWorth` 하나가 한다.
//
// ── 차트는 「셋을 한 자에 놓고 견준다」 ──────────────────────────
// 자산·부채·순자산을 각각 다른 자로 그리면 서로 못 견준다. 그래서 세 선을
// 한 차트, 한 세로축 위에 그린다 — 부채가 줄고 자산이 느는 게 같은 화면에서
// 보여야 「좋아지고 있다」가 눈에 들어온다.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer,
    Tooltip, XAxis, YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import {
    balancePoints, netWorth, BALANCE_RANGES,
    type BalancePoint, type LedgerBalance,
} from "@/lib/features/ledger/balances";

const FIELD_LABEL_CLS =
    "text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest";
const CARD_CLS =
    "bg-white dark:bg-surface-dark-card border border-neutral-200 dark:border-border-subtle-dark rounded-2xl";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 축과 막대 라벨용. 달력 칸과 같은 규칙으로 만·억까지 접는다. */
function compact(n: number) {
    const abs = Math.abs(n);
    const sign = n < 0 ? "−" : "";
    if (abs >= 100_000_000) {
        const eok = abs / 100_000_000;
        return `${sign}${eok >= 100 ? Math.round(eok) : Math.round(eok * 10) / 10}억`;
    }
    if (abs >= 10_000) {
        const man = abs / 10_000;
        return `${sign}${man >= 100 ? Math.round(man) : Math.round(man * 10) / 10}만`;
    }
    return `${sign}${abs.toLocaleString("ko-KR")}`;
}

/**
 * 'YYYY-MM' → '3월'. **1월만 해로 적는다** — 열두 칸에 연도를 다 적으면 안 읽히고,
 * 해가 바뀌는 자리가 하나도 없으면 작년 3월과 올해 3월이 같아 보인다.
 *
 * 「2026」이 아니라 「26년」인 것은, 「월」이 붙은 칸들 사이에서 숫자만 있으면
 * 그것도 달로 읽히기 때문이다.
 */
const monthTick = (m: string) => (m.endsWith("-01") ? `${m.slice(2, 4)}년` : `${Number(m.slice(5))}월`);

/* ── 색 ───────────────────────────────────────────────────────────
 * 자산·부채·순자산은 극성(늘었나 줄었나)이 아니라 **서로 다른 세 정체성**이다.
 * 그래서 카테고리 팔레트의 정해진 순서(파랑→주황→아쿠아)를 그대로 쓴다 —
 * 이 팔레트는 인접한 두 색씩 색각 이상 검증을 통과한 순서라, 뒤섞으면 그
 * 보장이 깨진다.
 *
 * 순자산(아쿠아)은 밝은 화면에서 대비가 낮게 나온다(3:1 미만) — 그래서
 * 선 끝에 값을 직접 적어(`SeriesEndLabel`) 색에만 기대지 않게 한다.
 *
 * **어두운 화면은 같은 색을 안 쓴다.** 밝은 바탕에서 고른 단계를 그대로 얹으면
 * 짙은 판 위에서 가라앉는다 — 어두운 쪽은 한 단 밝은 단계로 따로 고른다.
 *
 * `dot` 을 `cls` 에서 문자열로 만들어내지 않고 따로 적는다 — Tailwind 는 소스에
 * 그대로 적힌 클래스 이름만 CSS 로 만든다. `"text-".replaceAll("bg-")` 처럼
 * 실행 중에 만든 이름은 소스에 그 글자 그대로 없어서 CSS 가 아예 안 만들어지고,
 * 툴팁의 색 점이 투명하게 빠졌었다(계산된 배경색이 `rgba(0,0,0,0)`). */
const SERIES = {
    assets: {
        key: "assets", label: "자산",
        cls: "text-[#2a78d6] dark:text-[#3987e5]", dot: "bg-[#2a78d6] dark:bg-[#3987e5]",
    },
    liabilities: {
        key: "liabilities", label: "부채",
        cls: "text-[#eb6834] dark:text-[#d95926]", dot: "bg-[#eb6834] dark:bg-[#d95926]",
    },
    net: {
        key: "net", label: "순자산",
        cls: "text-[#1baf7a] dark:text-[#199e70]", dot: "bg-[#1baf7a] dark:bg-[#199e70]",
    },
} as const;

/**
 * 선 끝(가장 최근 달)에만 값을 적는다 — 열두 점에 다 적으면 아무것도 안 읽힌다.
 * 순자산 색은 밝은 화면 대비가 낮아, 색만으로는 값을 못 읽는 사람을 위한 자리이기도 하다.
 *
 * `fill="currentColor"` 이 핵심이다 — SVG `<text>` 는 `color`(Tailwind `text-*`)
 * 가 아니라 `fill` 로 칠해진다. 이게 빠지면 셋 다 검정으로 겹쳐 나와 어두운
 * 화면에서는 안 보이고, 이게 바로 「차트가 안 구분된다」의 실제 원인이었다.
 *
 * 자산과 순자산처럼 부채가 작아 값이 붙는 달에는 **글자가 서로 겹친다.**
 * 그래서 진짜 값 자리에는 점을 찍고(안 겹침), 글자는 `offsetY` 만큼 떼어
 * 놓은 뒤 가는 선으로 점과 이어준다 — 겹치는 라벨을 그냥 쌓으면 선에서
 * 떨어져 나가 잡음이 된다는 게 이 방식을 쓰는 이유다.
 */
function seriesEndLabel(s: (typeof SERIES)[keyof typeof SERIES], lastIndex: number, offsetY: number | undefined) {
    return (props: { x?: string | number; y?: string | number; index?: number; value?: string | number }) => {
        const { x, y, index, value } = props;
        if (index !== lastIndex || x == null || y == null || value == null) return null;
        const nx = Number(x);
        const ny = Number(y);
        const ly = offsetY ?? ny;
        const nudged = Math.abs(ly - ny) > 2;
        return (
            <g className={s.cls}>
                {/* 진짜 값 자리 — 라벨은 떨어져도 이 점만은 실제 값을 가리킨다. */}
                <circle cx={nx} cy={ny} r={2.5} fill="currentColor" />
                {nudged && <line x1={nx + 3} y1={ny} x2={nx + 7} y2={ly} stroke="currentColor" strokeWidth={1} />}
                <text
                    data-end-label={s.key} data-natural-y={ny}
                    x={nx + (nudged ? 9 : 6)} y={ly} dy={4}
                    fill="currentColor" className="text-[10px] font-black tabular-nums"
                >
                    {compact(Number(value))}
                </text>
            </g>
        );
    };
}

/**
 * 선 끝 라벨 셋의 **겹침을 잰다.** recharts 가 이미 그려 준 실제 화면 y 를
 * `data-natural-y` 로 읽어, 최소 간격보다 가까운 라벨만 아래로 밀어낸다.
 *
 * 자산·부채·순자산 값 자체가 아니라 **화면에 실제로 그려진 픽셀**을 재는 것이
 * 중요하다 — recharts 의 세로축은 자동으로 「보기 좋은」 범위를 고르기 때문에,
 * 값의 차이만 보고 겹칠지 미리 계산할 수 없다.
 *
 * **크기가 아니라 DOM 이 바뀌는 것 자체를 지켜본다.** `ResponsiveContainer` 는
 * 처음엔 너비를 몰라 아무것도 안 그리다가, 잰 뒤에야 실제 SVG 를 그려 넣는다.
 * 그런데 이 때 감싼 div 의 박스 크기 자체는 이미 정해져 있어(높이 고정, 너비
 * 100%) `ResizeObserver` 가 한 번도 안 울릴 수 있다 — 그래서 라벨의 `y` 속성이
 * 실제로 바뀌는 순간을 `MutationObserver` 로 잡는다.
 */
function useEndLabelOffsets(ref: { current: HTMLDivElement | null }, points: BalancePoint[]) {
    const [offsets, setOffsets] = useState<Record<string, number>>({});
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const MIN_GAP = 13;
        let raf = 0;
        const measure = () => {
            const items = Array.from(el.querySelectorAll<SVGTextElement>("text[data-end-label]"))
                .map(t => ({ key: t.dataset.endLabel!, y: Number(t.dataset.naturalY) }))
                .sort((a, b) => a.y - b.y);
            if (!items.length) return;
            for (let i = 1; i < items.length; i++) {
                if (items[i]!.y - items[i - 1]!.y < MIN_GAP) items[i]!.y = items[i - 1]!.y + MIN_GAP;
            }
            setOffsets((prev) => {
                if (items.every(it => prev[it.key] === it.y)) return prev;
                return Object.fromEntries(items.map(it => [it.key, it.y]));
            });
        };
        const scheduleMeasure = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(measure);
        };
        scheduleMeasure();
        // `y` 를 밀어낸 우리 자신의 리렌더도 한 번 더 이 관찰자를 울린다 — 그
        // 다음 결과가 같으면 `setOffsets` 가 그대로 반환해 여기서 멈춘다.
        const mo = new MutationObserver(scheduleMeasure);
        mo.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ["y"] });
        return () => { cancelAnimationFrame(raf); mo.disconnect(); };
    }, [ref, points]);
    return offsets;
}

function CompareTooltip({ active, payload }: { active?: boolean; payload?: { payload: BalancePoint }[] }) {
    if (!active || !payload?.length) return null;
    const p = payload[0]!.payload;
    return (
        <div className="rounded-xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card px-3 py-2 shadow-lg">
            <div className="text-[11px] font-black text-neutral-500 dark:text-neutral-400">{p.month}</div>
            {([
                [SERIES.net, p.net],
                [SERIES.assets, p.assets],
                [SERIES.liabilities, p.liabilities],
            ] as const).map(([s, v]) => (
                <div key={s.key} className="mt-0.5 flex items-center gap-1.5 text-[12px] font-bold tabular-nums">
                    <span className={cn("inline-block h-2 w-2 rounded-full", s.dot)} />
                    <span className="text-neutral-500 dark:text-neutral-400">{s.label}</span>
                    <span className="ml-auto text-neutral-800 dark:text-neutral-100">{won(v)}</span>
                </div>
            ))}
        </div>
    );
}

export function BalancePanel({
    month, thisMonthKst, balances, mutating, range, onRange, onMonth, onSave, onClear,
}: {
    /** 지금 보고 있는 달. 적고 고치는 것은 언제나 이 달이다. */
    month: string;
    /** 오늘이 속한 달. 앞날은 적을 수 없다. */
    thisMonthKst: string;
    balances: LedgerBalance[];
    mutating: boolean;
    /** 차트가 보는 달 수. */
    range: number;
    onRange: (months: number) => void;
    /** 달을 옮긴다 — 폼 안의 달 고르개가 부른다. */
    onMonth: (month: string) => void;
    /**
     * 저장한다. **끝난 뒤의 결과를 돌려준다** — `null` 이면 됐고, 글자면 그 까닭이다.
     *
     * 예전에는 돌려주는 것이 없어서 화면이 **무조건 폼을 닫았다.** 워커가 404 를 내도
     * 폼이 닫히고 값은 그대로라, 사용자에게는 「저장했는데 반영이 안 된다」로만 보였다.
     */
    onSave: (assets: number, liabilities: number) => Promise<string | null>;
    onClear: () => void;
}) {
    const points = useMemo(() => balancePoints(balances), [balances]);
    const thisMonth = balances.find(b => b.month === month) ?? null;
    const here = points.find(p => p.month === month) ?? null;
    const chartWrapRef = useRef<HTMLDivElement>(null);
    const labelOffsets = useEndLabelOffsets(chartWrapRef, points);

    const [open, setOpen] = useState(false);
    /** 저장이 실패한 까닭. 있으면 폼을 안 닫는다. */
    const [saveError, setSaveError] = useState<string | null>(null);
    // 금액은 글자로 들고 있다 — 숫자로 들면 지우는 순간 0 이 되어 칸을 비울 수 없다
    // (계산기에서 고친 것과 같은 자리다). 위 내역 입력칸과도 같은 규약이다.
    const [fAssets, setFAssets] = useState("");
    const [fLiab, setFLiab] = useState("");



    const digits = (s: string) => s.replace(/[^\d]/g, "").slice(0, 15);
    const fmt = (s: string) => (s ? Number(s).toLocaleString("ko-KR") : "");
    const numOf = (s: string) => Number(s.replace(/[^\d]/g, "") || "0");

    const startEdit = () => {
        setSaveError(null);
        setOpen(true);
    };

    // 폼이 열려 있는 동안 달이 바뀌면(폼 안의 달 고르개) **그 달 값으로 다시 채운다.**
    // 닫아 버리면 「2025년 3월을 적으려고 달을 옮겼는데 폼이 사라지는」 꼴이 된다.
    useEffect(() => {
        setFAssets(thisMonth ? fmt(String(thisMonth.assets)) : "");
        setFLiab(thisMonth ? fmt(String(thisMonth.liabilities)) : "");
        setSaveError(null);
        // `thisMonth` 는 달이 바뀌거나 저장이 반영될 때만 달라진다.
    }, [month, thisMonth?.assets, thisMonth?.liabilities]);

    const save = async () => {
        setSaveError(null);
        const failed = await onSave(numOf(fAssets), numOf(fLiab));
        // **됐을 때만 닫는다.** 실패했는데 닫으면 값이 그대로인 채 폼만 사라져서,
        // 사용자에게는 「저장했는데 반영이 안 된다」로만 보인다.
        if (failed === null) setOpen(false);
        else setSaveError(failed);
    };



    return (
        <section className={CARD_CLS}>
            <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-neutral-100 dark:border-border-subtle-dark">
                <h2 className={FIELD_LABEL_CLS}>자산 · 부채</h2>
                {!open && (
                    <button
                        type="button"
                        onClick={startEdit}
                        className="min-h-[34px] px-3 rounded-lg border border-neutral-200 dark:border-border-subtle-dark text-[11px] font-black text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-surface-dark-muted transition-colors"
                    >
                        {thisMonth ? "고치기" : "이 달 적기"}
                    </button>
                )}
            </div>

            {/* ── 이 달의 값 ── */}
            {open ? (
                <div className="px-4 py-3.5 flex flex-col gap-3">
                    {/* **어느 달을 적는지 여기서 고른다.** 달마다 ◀ 를 눌러 옮겨 다니면
                        지난해 열두 달을 채우는 데 스무 번을 눌러야 한다. 고르면 보고 있는
                        달 자체가 옮겨가고(`onMonth`), 폼은 그 달 값으로 다시 채워진다. */}
                    <div className="flex items-center justify-between gap-2">
                        <label htmlFor="bal-month" className={FIELD_LABEL_CLS}>어느 달</label>
                        <input
                            id="bal-month" type="month"
                            value={month}
                            max={thisMonthKst}
                            onChange={(e) => { if (e.target.value) onMonth(e.target.value); }}
                            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-border-subtle-dark bg-surface-canvas dark:bg-surface-dark-canvas text-[13px] font-bold tabular-nums text-neutral-800 dark:text-neutral-100"
                        />
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        그 달 <b className="font-black">말 기준</b>입니다. 순자산은 자산에서 부채를 뺀 값이라 따로 적지 않습니다.
                    </p>
                    {([
                        ["자산", fAssets, setFAssets, "예금 · 주식 · 집 …"],
                        ["부채", fLiab, setFLiab, "대출 · 카드값 …"],
                    ] as const).map(([label, val, setVal, hint]) => (
                        <div key={label} className="flex flex-col gap-1.5">
                            <label className={FIELD_LABEL_CLS} htmlFor={`bal-${label}`}>
                                {label}
                                <span className="ml-1.5 normal-case tracking-normal font-bold text-neutral-400">{hint}</span>
                            </label>
                            <div className="flex items-baseline gap-1.5 px-3.5 py-2.5 rounded-2xl bg-surface-canvas dark:bg-surface-dark-canvas border border-neutral-200 dark:border-border-subtle-dark focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                                <input
                                    id={`bal-${label}`}
                                    type="text" inputMode="numeric" autoComplete="off" placeholder="0"
                                    value={val}
                                    onChange={(e) => setVal(fmt(digits(e.target.value)))}
                                    onFocus={(e) => e.currentTarget.select()}
                                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-right text-xl font-black tabular-nums text-neutral-900 dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
                                />
                                <span className="text-sm font-black text-neutral-400">원</span>
                            </div>
                        </div>
                    ))}
                    {/* 치는 동안에도 순자산이 따라 움직인다 — 저장하기 전에 결과를 본다. */}
                    <div className="flex items-baseline justify-between px-1">
                        <span className={FIELD_LABEL_CLS}>순자산</span>
                        <span className={cn(
                            "text-[17px] font-black tabular-nums",
                            numOf(fAssets) - numOf(fLiab) < 0 ? "text-red-600 dark:text-red-400" : "text-brand",
                        )}>
                            {won(numOf(fAssets) - numOf(fLiab))}
                        </span>
                    </div>
                    {/* **실패는 이 자리에서 말한다.** 가계부의 오류 띠는 내역을 못 불러왔을
                        때만 뜨고 공유 시트 안에만 있어서, 저장 실패가 화면 어디에도 안 남았다. */}
                    {saveError && (
                        <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">
                            저장하지 못했습니다. {saveError}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button" onClick={() => { setOpen(false); setSaveError(null); }}
                            className="min-h-[44px] px-4 rounded-xl border border-neutral-200 dark:border-border-subtle-dark text-[13px] font-black text-neutral-500"
                        >
                            그만두기
                        </button>
                        {thisMonth && (
                            <button
                                type="button"
                                onClick={() => { onClear(); setOpen(false); }}
                                disabled={mutating}
                                className="min-h-[44px] px-4 rounded-xl border border-neutral-200 dark:border-border-subtle-dark text-[13px] font-black text-red-600 disabled:opacity-40"
                            >
                                지우기
                            </button>
                        )}
                        <button
                            type="button" onClick={save} disabled={mutating}
                            className="flex-1 min-h-[44px] rounded-xl bg-brand text-white text-[13px] font-black disabled:opacity-40"
                        >
                            {mutating ? "저장 중…" : "저장"}
                        </button>
                    </div>
                </div>
            ) : thisMonth ? (
                <div className="px-4 pt-3.5 pb-3 text-center border-b border-neutral-100 dark:border-border-subtle-dark">
                    <div className={FIELD_LABEL_CLS}>순자산</div>
                    <div className={cn(
                        "mt-0.5 text-[27px] font-black tracking-[-0.03em] tabular-nums",
                        netWorth(thisMonth) < 0 ? "text-red-600 dark:text-red-400" : "text-brand",
                    )}>
                        {won(netWorth(thisMonth))}
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tabular-nums">
                        자산 {compact(thisMonth.assets)} · 부채 {compact(thisMonth.liabilities)}
                        {/* **없는 것과 0 은 다르다.** 앞 달을 안 적었으면 증감을 아예 안 적는다 —
                            0 으로 적으면 「그대로였다」가 되어 모르는 것이 아는 것처럼 보인다. */}
                        {here?.delta != null && (
                            <> · 전월 대비 <b className={cn(
                                "font-black",
                                here.delta < 0 ? "text-red-600 dark:text-red-400" : "text-brand",
                            )}>
                                {here.delta > 0 ? "+" : here.delta < 0 ? "−" : ""}{compact(Math.abs(here.delta))}
                            </b></>
                        )}
                    </div>
                </div>
            ) : (
                <div className="px-4 py-5 text-center text-xs text-neutral-400 dark:text-neutral-500">
                    이 달의 자산·부채가 아직 없습니다.
                </div>
            )}

            {/* ── 자산·부채·순자산 비교 ── */}
            {points.length >= 2 && (
                <div className="px-2 pt-3 pb-2">
                    <div className="px-2 pb-1 flex items-center justify-between gap-2">
                        <h3 className={FIELD_LABEL_CLS}>자산 · 부채 · 순자산</h3>
                        {/* **쌓일수록 더 멀리 본다.** 한 해치만 붙박이로 두면 재작년과
                            견줄 방법이 화면에 없다. */}
                        <div className="flex rounded-lg border border-neutral-200 dark:border-border-subtle-dark overflow-hidden">
                            {BALANCE_RANGES.map(r => (
                                <button
                                    key={r.months}
                                    type="button"
                                    onClick={() => onRange(r.months)}
                                    aria-pressed={range === r.months}
                                    className={cn(
                                        "px-2.5 min-h-[30px] text-[11px] font-black transition-colors",
                                        range === r.months
                                            ? "bg-brand text-white"
                                            : "bg-white dark:bg-surface-dark-card text-neutral-500 hover:bg-neutral-50 dark:hover:bg-surface-dark-muted",
                                    )}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* **차트는 언제나 폭에 맞춘다.** 옆으로 스크롤하게 두면 세로
                        눈금까지 같이 밀려 나가고, 값 축이 없는 차트는 읽을 수가
                        없다. 그래서 고르는 구간의 상한을 **3년**으로 둔다 — 더 옛날은
                        보고 있는 달을 옮겨서 본다. 오른쪽은 선 끝 값을 적을 자리다. */}
                    <div ref={chartWrapRef}>
                        <ResponsiveContainer width="100%" height={192}>
                            <LineChart data={points} margin={{ top: 6, right: 44, bottom: 0, left: 8 }}>
                                {/* 실선 헤어라인. 점선은 「임계선」처럼 읽혀 그냥 눈금인데 뜻이 생긴다. */}
                                <CartesianGrid vertical={false} stroke="currentColor"
                                    className="text-neutral-200 dark:text-neutral-700" />
                                <XAxis
                                    dataKey="month" tickFormatter={monthTick}
                                    tickLine={false} axisLine={false} interval="preserveStartEnd"
                                    tick={{ fontSize: 10, fontWeight: 700 }}
                                    className="text-neutral-400 dark:text-neutral-500"
                                />
                                {/* **범위를 손으로 정하지 않는다.** 여백을 붙여 넘기면 0 이
                                    눈금에서 빠질 수 있다 — 부채·순자산이 0 을 가로지르는
                                    차트에서 그건 자를 잃는 것이다. */}
                                <YAxis
                                    tickFormatter={compact} width={44}
                                    tickLine={false} axisLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700 }}
                                    className="text-neutral-400 dark:text-neutral-500"
                                />
                                {/* 0 선 — 부채·순자산이 이 선을 넘나든다. */}
                                <ReferenceLine y={0} stroke="currentColor"
                                    className="text-neutral-300 dark:text-neutral-600" />
                                <Tooltip content={<CompareTooltip />} />
                                {/* 두 줄 이상이라 범례는 항상 켠다 — 색만으로 정체를 지지 않는다. */}
                                <Legend
                                    verticalAlign="top" align="right" height={24}
                                    formatter={(key: string) => SERIES[key as keyof typeof SERIES].label}
                                    wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
                                />
                                {(Object.values(SERIES)).map(s => (
                                    <Line
                                        key={s.key}
                                        dataKey={s.key}
                                        stroke="currentColor" className={s.cls}
                                        strokeWidth={2} dot={false} isAnimationActive={false}
                                        label={seriesEndLabel(s, points.length - 1, labelOffsets[s.key])}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </section>
    );
}
