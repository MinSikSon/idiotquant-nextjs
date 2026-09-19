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
// ── 차트는 「증감」을 그린다 ──────────────────────────────────
// 잔액 자체를 그리면 억 단위 막대 열두 개가 다 비슷한 높이로 서서 **달마다 얼마나
// 나아졌는지가 안 보인다.** 그게 이 화면에서 알고 싶은 것이라 증감을 그린다.

import { useEffect, useMemo, useState } from "react";
import {
    Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer,
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
 * 증감은 **극성**이다(늘었나 줄었나). 그래서 한 색이 아니라 반대되는 둘이고,
 * 그 둘은 이 화면이 이미 쓰고 있는 짝을 그대로 쓴다 — 위 요약의 「남은 돈」이
 * 양수면 brand, 음수면 red 다. 여기서 새 색을 지어내면 같은 페이지 안에서
 * 「초록이 좋은 것」을 두 번 배워야 한다.
 *
 * 초록/빨강은 색각 이상에서 갈리기 어려운 짝이라 **색만으로 뜻을 지지 않는다** —
 * 0 선 위냐 아래냐가 같은 말을 한 번 더 하고, 값에는 부호가 붙는다.
 *
 * **어두운 화면은 같은 색을 안 쓴다.** 밝은 바탕에서 고른 단계를 그대로 얹으면
 * 짙은 판 위에서 가라앉는다 — 어두운 쪽은 한 단 밝은 단계로 따로 고른다
 * (`GrowthChart` 가 같은 규약이다). */
const UP_CLS = "fill-brand dark:fill-[#2fa85a]";
const DOWN_CLS = "fill-red-600 dark:fill-red-400";

/**
 * 막대 하나. **끝만 둥글고 0 선 쪽은 각지다** — 둥근 쪽이 어디인지가 곧 부호다.
 * recharts 의 `radius` 는 막대 전체에 같은 값을 주므로 모양을 직접 그린다.
 *
 * **반지름은 높이의 절반을 못 넘는다.** 안 막으면 짧은 막대에서 위아래 곡선이 만나
 * 렌즈 모양이 되고, 그러면 길이가 아니라 **부풀기**가 눈에 들어온다 — 작은 달일수록
 * 더 커 보이는 막대였다.
 */
function DeltaBar(props: {
    x?: number; y?: number; width?: number; height?: number; payload?: BalancePoint;
}) {
    const { x = 0, y = 0, width = 0, height = 0, payload } = props;
    if (!width || !height) return null;
    const r = Math.max(0, Math.min(4, width / 2, height / 2));
    // recharts 는 음수 막대도 y 를 위, height 를 양수로 준다 — 부호는 값에서 본다.
    const up = (payload?.delta ?? 0) >= 0;
    const d = up
        ? `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`
        : `M${x},${y} L${x},${y + height - r} Q${x},${y + height} ${x + r},${y + height} L${x + width - r},${y + height} Q${x + width},${y + height} ${x + width},${y + height - r} L${x + width},${y} Z`;
    // **색은 클래스로 준다.** `fill` 속성으로 주면 어두운 화면에서 못 바꾼다.
    return <path d={d} className={up ? UP_CLS : DOWN_CLS} />;
}

function DeltaTooltip({ active, payload }: { active?: boolean; payload?: { payload: BalancePoint }[] }) {
    if (!active || !payload?.length) return null;
    const p = payload[0]!.payload;
    return (
        <div className="rounded-xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card px-3 py-2 shadow-lg">
            <div className="text-[11px] font-black text-neutral-500 dark:text-neutral-400">{p.month}</div>
            <div className={cn(
                "mt-0.5 text-[15px] font-black tabular-nums",
                (p.delta ?? 0) < 0 ? "text-red-600 dark:text-red-400" : "text-brand",
            )}>
                {p.delta === null ? "견줄 앞 달이 없다" : `${p.delta > 0 ? "+" : p.delta < 0 ? "−" : ""}${won(Math.abs(p.delta))}`}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                순자산 {won(p.net)}
            </div>
            <div className="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                자산 {compact(p.assets)} · 부채 {compact(p.liabilities)}
            </div>
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

    // 막대가 하나뿐이면 차트가 아니라 숫자 하나다 — 견줄 것이 없는 막대는 안 세운다.
    const drawable = points.filter(p => p.delta !== null);
    const biggest = drawable.reduce<BalancePoint | null>(
        (best, p) => (best === null || Math.abs(p.delta!) > Math.abs(best.delta!) ? p : best), null);


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

            {/* ── 달별 증감 ── */}
            {drawable.length >= 2 && (
                <div className="px-2 pt-3 pb-2">
                    <div className="px-2 pb-1 flex items-center justify-between gap-2">
                        <h3 className={FIELD_LABEL_CLS}>달별 순자산 증감</h3>
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
                        눈금까지 같이 밀려 나가고, 값 축이 없는 막대 차트는 읽을 수가
                        없다. 그래서 고르는 구간의 상한을 **3년(막대 36개)**으로 둔다 —
                        그보다 촘촘해지면 막대가 실오라기가 되어 견주는 뜻이 사라진다.
                        더 옛날을 보려면 보고 있는 달을 옮긴다. */}
                    <ResponsiveContainer width="100%" height={168}>
                        <BarChart data={drawable} margin={{ top: 14, right: 8, bottom: 0, left: 8 }}
                            barCategoryGap="22%" maxBarSize={26}>
                            {/* 실선 헤어라인. 점선은 「임계선」처럼 읽혀 그냥 눈금인데 뜻이 생긴다. */}
                            <CartesianGrid vertical={false} stroke="currentColor"
                                className="text-neutral-200 dark:text-neutral-700" />
                            <XAxis
                                dataKey="month" tickFormatter={monthTick}
                                tickLine={false} axisLine={false} interval="preserveStartEnd"
                                tick={{ fontSize: 10, fontWeight: 700 }}
                                className="text-neutral-400 dark:text-neutral-500"
                            />
                            {/* **범위를 손으로 정하지 않는다.** 여백을 붙여 넘기면 눈금이
                                1404만·−134만 처럼 어중간해지고 **0 이 눈금에서 빠진다** —
                                0 이 기준선인 차트에서 그건 자를 잃는 것이다. */}
                            <YAxis
                                tickFormatter={compact} width={44}
                                tickLine={false} axisLine={false}
                                tick={{ fontSize: 10, fontWeight: 700 }}
                                className="text-neutral-400 dark:text-neutral-500"
                            />
                            {/* 0 선이 이 차트의 기준이다 — 위가 는 달, 아래가 준 달. */}
                            <ReferenceLine y={0} stroke="currentColor"
                                className="text-neutral-300 dark:text-neutral-600" />
                            <Tooltip cursor={{ fill: "currentColor", className: "text-neutral-100 dark:text-neutral-800" }}
                                content={<DeltaTooltip />} />
                            {/* 색은 막대가 스스로 정한다(`DeltaBar`) — `Cell` 로 나눠 주면
                                어두운 화면의 단계를 못 얹는다. */}
                            <Bar dataKey="delta" shape={<DeltaBar />} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                    {/* **막대마다 숫자를 적지 않는다.** 제일 큰 달 하나만 글로 짚고 나머지는
                        축과 툴팁이 진다 — 열두 개에 값을 다 적으면 아무것도 안 읽힌다. */}
                    {biggest && (
                        <p className="px-2 pt-1 text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                            가장 크게 움직인 달 <b className="font-black">{biggest.month}</b>{" "}
                            <b className={cn("font-black", biggest.delta! < 0 ? "text-red-600 dark:text-red-400" : "text-brand")}>
                                {biggest.delta! > 0 ? "+" : "−"}{compact(Math.abs(biggest.delta!))}
                            </b>
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}
