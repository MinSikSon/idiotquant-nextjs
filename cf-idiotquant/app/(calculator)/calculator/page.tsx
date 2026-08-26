"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Share2, Check, Dice5, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import GrowthChart from "./GrowthChart";
import CalculatorHistory from "./CalculatorHistory";
import {
    DEFAULTS, TAX_RATE, SIMPLE_ASSUMPTIONS, PERIOD_LABEL,
    sanitize, maskDetail, simulate, serialize, parse, won, pct, basisOf,
    type CalcInputs, type Detail, type Periods, type RateMode,
} from "./calc";

const STORAGE_KEY = "compound_calc_inputs_v1";
const DETAIL_KEY = "compound_calc_detail_v1";

/* ─── 조각 ───────────────────────────────────────────────────
   홈 화면의 문법을 그대로 쓴다 — 둥근 카드, 굵은 제목, 초록 머리표,
   손을 올리면 살짝 뜨는 버튼. 예전의 인쇄 서식(각진 모서리·괘선)은 그 자체로는
   단정했지만 이 앱의 다른 화면과 남처럼 보였다. */

const CARD = cn(
    "rounded-2xl border bg-white dark:bg-surface-dark-card",
    "border-neutral-200 dark:border-border-subtle-dark"
);
const DIVIDE = "border-neutral-100 dark:border-border-subtle-dark";

const ROW_CLS = cn(
    "grid grid-cols-1 sm:grid-cols-[168px_1fr] gap-1.5 sm:gap-x-5 sm:items-center",
    "px-4 sm:px-5 py-2.5 sm:py-3 border-b last:border-b-0", DIVIDE
);
const LABEL_CLS = "text-[13px] font-bold text-neutral-700 dark:text-neutral-300";

/* 좁은 화면에서 접히는 부연 설명.
   설명글은 한 줄씩은 짧아도 전부 합치면 휴대폰 화면 몇 개 분량이라, 처음 오는 사람에게는
   도움이 되지만 두 번째부터는 눈금까지 가는 길을 늘리기만 한다. ⓘ 를 누르면 최상위
   div 의 data-help 가 켜져 한꺼번에 펼쳐진다 — 넓은 화면에서는 접지 않는다.
   여러 컴포넌트가 같이 쓰는 규칙이라 prop 을 층층이 내리는 대신 CSS 로 잇는다. */
const FOLD = "hidden group-data-[help=on]:block sm:block";

const HINT_CLS = cn(FOLD, "text-[11px] font-medium text-neutral-500 dark:text-neutral-400");
const NUM_CLS = "font-[family-name:var(--font-mono)] tabular-nums";

const INPUT_CLS = cn(
    "font-[family-name:var(--font-mono)] tabular-nums text-[15px] font-bold text-right",
    "text-neutral-900 dark:text-neutral-50 bg-surface-canvas dark:bg-surface-dark-canvas",
    "border border-neutral-200 dark:border-surface-dark-border rounded-xl px-3 py-2 w-full sm:w-[150px]",
    "focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:border-[#16a34a]",
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
);

/** 연도별 명세에서 처음에 펴 두는 줄 수. */
const TABLE_PREVIEW = 10;

/** 손을 올리면 살짝 뜬다 — 홈의 버튼이 전부 이렇게 움직인다. */
const LIFT = "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 ease-out";

/* 홈의 섹션 머리표 — 초록 영문 태그 + 가는 선. 페이지가 "같은 시리즈"로 읽히게 하는
   가장 작은 장치라, 계산기도 이걸 쓴다. */
function StepLabel({ tag }: { tag: string }) {
    return (
        <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#16a34a] dark:text-[#22c55e] shrink-0">
                {tag}
            </span>
            <div className="h-px flex-1 bg-neutral-200 dark:bg-border-subtle-dark" />
        </div>
    );
}

/* 간단 단계에서 쓰는 눈금 범위.
   sanitize 의 한계값(초기 100만만원 등)을 그대로 쓰면 눈금 한 칸이 수백만원이라
   손가락으로 원하는 값을 짚을 수가 없다. 여기 값은 "흔히 넣는 범위"이고,
   그 밖의 값이 필요하면 상세 단계에서 직접 친다. */
const SLIDER_RANGE = {
    initial: { min: 0, max: 20_000, step: 100 },   // 0 ~ 2억 (만원)
    monthly: { min: 0, max: 500, step: 10 },       // 0 ~ 500만원
    rate: { min: -10, max: 30, step: 0.5 },        // %
    years: { min: 1, max: 40, step: 1 },
} as const;

function SliderRow({ id, label, hint, unit, value, range, format, onChange }: {
    id: string;
    label: string;
    hint?: string;
    unit: string;
    value: number;
    range: { min: number; max: number; step: number };
    format: (v: number) => string;
    onChange: (v: number) => void;
}) {
    /* 상세에서 눈금 밖의 값을 넣어두고 넘어오면 손잡이는 끝에 붙는데 숫자는 다른 값이라
       읽는 사람이 어느 쪽을 믿어야 할지 알 수 없다. 눈금을 그 값까지 넓혀 늘 일치시킨다. */
    const min = Math.min(range.min, value);
    const max = Math.max(range.max, value);

    return (
        <div className={cn("px-4 sm:px-5 py-2.5 sm:py-3 border-b last:border-b-0", DIVIDE)}>
            <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={id} className={LABEL_CLS}>
                    {label}
                    {hint && <span className={HINT_CLS}>{hint}</span>}
                </label>
                {/* 값을 크게 먼저 읽힌다 — 눈금을 움직이는 동안 보는 건 이 숫자다. */}
                <div className="flex items-baseline gap-1 shrink-0">
                    <span className={cn(NUM_CLS, "text-[19px] font-semibold text-neutral-900 dark:text-neutral-50")}>
                        {format(value)}
                    </span>
                    <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">{unit}</span>
                </div>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={range.step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                aria-valuetext={`${format(value)}${unit}`}
                className={cn(
                    "w-full mt-2 sm:mt-2.5 h-6 bg-transparent cursor-pointer accent-[#16a34a]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] rounded-lg"
                )}
            />
            <div className="flex justify-between text-[10.5px] text-neutral-500 dark:text-neutral-400 -mt-0.5">
                <span>{format(min)}</span>
                <span>{format(max)}</span>
            </div>
        </div>
    );
}

/**
 * 상세 단계의 수익률 행 — 눈금과 입력칸을 함께 둔다.
 *
 * 상세는 정확히 치라고 있는 단계라 입력칸을 뺄 수 없다. 그렇다고 수익률처럼 이리저리
 * 흔들어 보는 값을 숫자로만 두면 한 번 고치는 데 손이 많이 간다. 굵게는 끌고 정확히는
 * 치도록 둘 다 둔다 — 같은 값을 보고 같은 값을 고치므로 어긋날 자리가 없다.
 *
 * 눈금은 0.5%p 로 끊고 입력칸은 0.1%p 다. 눈금으로 7%까지 간 뒤 7.3%가 필요하면
 * 그때 숫자를 치면 된다.
 */
function RateFieldRow({ id, label, hint, value, onChange }: {
    id: string;
    label: string;
    hint: string;
    value: number;
    onChange: (v: number) => void;
}) {
    const { min, step } = SLIDER_RANGE.rate;
    // 한계 밖의 값을 쳐 넣었으면 눈금을 거기까지 늘린다(손잡이와 숫자가 어긋나지 않게).
    const lo = Math.min(min, value);
    const hi = Math.max(SLIDER_RANGE.rate.max, value);

    return (
        <div className={ROW_CLS}>
            <label htmlFor={id} className={LABEL_CLS}>
                {label}<span className={HINT_CLS}>{hint}</span>
            </label>
            <div className="flex items-center gap-3">
                <input
                    type="range"
                    min={lo} max={hi} step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    aria-label={`${label} 눈금`}
                    aria-valuetext={`${value.toFixed(1)}%`}
                    className={cn(
                        "flex-1 min-w-0 h-6 bg-transparent cursor-pointer accent-[#16a34a]",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] rounded-lg"
                    )}
                />
                <input
                    id={id} type="number" inputMode="decimal" step={0.1} value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={cn(INPUT_CLS, "w-[92px] sm:w-[92px] shrink-0")}
                />
                <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400 shrink-0">%</span>
            </div>
        </div>
    );
}

function RateModeRow({ value, onChange }: { value: RateMode; onChange: (v: RateMode) => void }) {
    return (
        <div className={cn("flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 sm:py-3 border-b last:border-b-0", DIVIDE)}>
            <span className={LABEL_CLS}>
                수익률
                <span className={HINT_CLS}>
                    {value === "fixed"
                        ? "해마다 같은 수익률로 계산합니다"
                        : "해마다 범위 안에서 무작위로 뽑습니다"}
                </span>
            </span>
            <Segmented
                label="수익률 방식"
                value={value}
                onChange={onChange}
                options={[{ v: "fixed" as RateMode, label: "고정" }, { v: "range" as RateMode, label: "범위" }]}
            />
        </div>
    );
}

function RerollRow({ onReroll }: { onReroll: () => void }) {
    return (
        <div className={cn("flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 sm:py-3 border-b last:border-b-0", DIVIDE)}>
            {/* 한 번 굴린 결과는 "일어날 수 있는 하나"일 뿐이다. 그 사실을 적어 두지 않으면
                마음에 드는 숫자가 나올 때까지 굴리고 그걸 예상으로 삼게 된다. */}
            <span className={cn(FOLD, "text-[11px] font-medium text-neutral-500 dark:text-neutral-400 leading-relaxed")}>
                아래 결과는 이 범위에서 나올 수 있는 <b className="font-bold text-neutral-700 dark:text-neutral-300">여러 갈래 중 하나</b>입니다.
                <br className="hidden sm:block" /> 몇 번 굴려 보면 같은 조건이라도 결과가 얼마나 벌어지는지 보입니다.
            </span>
            <button
                type="button"
                onClick={onReroll}
                className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-2 rounded-xl border shrink-0 ml-auto",
                    "border-neutral-200 dark:border-surface-dark-border",
                    "bg-surface-canvas dark:bg-surface-dark-canvas text-neutral-700 dark:text-neutral-300",
                    "hover:border-[#16a34a]/50 dark:hover:border-[#22c55e]/60", LIFT,
                    "focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                )}
            >
                <Dice5 size={13} strokeWidth={2.2} />
                다시 굴리기
            </button>
        </div>
    );
}

function SectionHead({ tag, title, note }: { tag: string; title: string; note?: string }) {
    return (
        <div className="mt-6 sm:mt-10 mb-2.5 sm:mb-3">
            <StepLabel tag={tag} />
            <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-[19px] sm:text-[21px] font-black tracking-tight text-neutral-900 dark:text-white break-keep">
                    {title}
                </h2>
                {note && (
                    <span className={cn(FOLD, "ml-auto text-[11px] font-medium text-neutral-500 dark:text-neutral-400 text-right")}>
                        {note}
                    </span>
                )}
            </div>
        </div>
    );
}

function Segmented<T extends string | number>({
    value, options, onChange, label,
}: {
    value: T;
    options: { v: T; label: string }[];
    onChange: (v: T) => void;
    label: string;
}) {
    return (
        <div role="group" aria-label={label} className={cn("inline-flex rounded-xl overflow-hidden w-fit border border-neutral-200 dark:border-surface-dark-border")}>
            {options.map((o, i) => (
                <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => onChange(o.v)}
                    aria-pressed={value === o.v}
                    className={cn(
                        "text-[12.5px] font-bold px-3.5 py-1.5 min-h-[36px] transition-colors",
                        i > 0 && "border-l border-neutral-200 dark:border-surface-dark-border",
                        value === o.v
                            ? "bg-neutral-900 dark:bg-neutral-100 text-[#faf9f7] dark:text-[#1a1915]"
                            : "bg-white dark:bg-surface-dark-card text-neutral-600 dark:text-neutral-400 hover:bg-[#f2efe9] dark:hover:bg-surface-dark-hover",
                        "focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:z-10"
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export default function CompoundCalculatorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas" />}>
            <Calculator />
        </Suspense>
    );
}

function Calculator() {
    const [inputs, setInputs] = useState<CalcInputs>(DEFAULTS);
    const [detail, setDetail] = useState<Detail>("simple");
    const [copied, setCopied] = useState(false);
    /* 좁은 화면에서만 접히는 설명글(FOLD)의 스위치. 넓은 화면은 이 값과 무관하게 늘 보인다. */
    const [showHelp, setShowHelp] = useState(false);
    /* 연도별 명세는 40년이면 40줄이다 — 처음엔 앞쪽만 편다. */
    const [tableOpen, setTableOpen] = useState(false);
    const readUrlRef = useRef(false);

    /* 주소가 있으면 주소, 없으면 지난번에 쓰던 값. 링크로 받은 조건이 항상 이긴다. */
    useEffect(() => {
        if (readUrlRef.current) return;
        readUrlRef.current = true;

        const fromUrl = parse(new URLSearchParams(window.location.search));
        if (fromUrl) {
            setInputs(fromUrl.inputs);
            setDetail(fromUrl.detail);
            return;
        }
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setInputs(sanitize(JSON.parse(saved)));
            const savedDetail = localStorage.getItem(DETAIL_KEY);
            if (savedDetail === "detailed" || savedDetail === "simple") setDetail(savedDetail);
        } catch {
            // 저장해둔 값이 깨졌으면 기본값으로 시작한다 — 화면을 막을 일은 아니다.
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
            localStorage.setItem(DETAIL_KEY, detail);
        } catch { /* 저장 못 해도 계산은 된다 */ }
    }, [inputs, detail]);

    /** 이 단계에서 실제로 쓰이는 조건. 안 보이는 항목은 계산에서도 빠진다. */
    const effective = useMemo(() => maskDetail(inputs, detail), [inputs, detail]);
    const result = useMemo(() => simulate(effective), [effective]);

    const set = <K extends keyof CalcInputs>(key: K, value: CalcInputs[K]) =>
        setInputs((prev) => sanitize({ ...prev, [key]: value }));

    /* 씨앗만 바꾼다. 조건은 그대로 두고 "다른 갈래"만 다시 뽑는 것이다. */
    const reroll = () => set("seed", Math.floor(Math.random() * 1_000_000) + 1);

    async function share() {
        try {
            const url = new URL(window.location.href);
            url.search = serialize(inputs, detail);
            await navigator.clipboard.writeText(url.toString());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* 클립보드를 막아둔 브라우저도 있다 */ }
    }

    const detailed = detail === "detailed";
    const ranged = effective.rateMode === "range";
    const loss = result.profit < 0;
    const stamp = loss ? "원금 손실" : result.final >= result.principal * 2 ? "원금 2배 이상" : null;

    /* 연도별 명세는 40년을 고르면 40줄이라, 휴대폰에서는 이 표 하나가 화면 몇 개를 먹는다.
       만기 금액은 위 결과 칸에 이미 크게 적혀 있으니 표는 앞쪽만 펴 둔다. */
    const yearRows = result.rows.filter((d) => d.year > 0);
    const shownRows = tableOpen ? yearRows : yearRows.slice(0, TABLE_PREVIEW);

    return (
        <div
            className="group min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas px-4 sm:px-5 pt-5 sm:pt-8 pb-20 sm:pb-24"
            data-help={showHelp ? "on" : "off"}
        >
            <div className="max-w-[860px] mx-auto">

                {/* ── 문서 머리 ─────────────────────────────────── */}
                <header className="flex items-end justify-between gap-5 flex-wrap">
                    <div>
                        <StepLabel tag="COMPOUND CALCULATOR" />
                        <h1 className="text-[26px] sm:text-[34px] font-black tracking-tight leading-[1.28] text-neutral-900 dark:text-white break-keep">
                            복리 수익률 계산기
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        {/* 설명 스위치는 좁은 화면에만 둔다 — 넓은 화면에서는 접는 것이 없으니
                            눌러도 아무 일이 일어나지 않는 버튼이 된다. */}
                        <button
                            type="button"
                            onClick={() => setShowHelp((v) => !v)}
                            aria-pressed={showHelp}
                            className={cn(
                                "sm:hidden inline-flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-2 rounded-xl border", LIFT,
                                showHelp
                                    ? "bg-[#16a34a] border-[#16a34a] text-white"
                                    : cn("border-neutral-200 dark:border-surface-dark-border bg-white dark:bg-surface-dark-card",
                                         "text-neutral-700 dark:text-neutral-300")
                            )}
                        >
                            <Info size={13} strokeWidth={2.4} />
                            설명
                        </button>
                        <button
                            type="button"
                            onClick={share}
                            className={cn(
                                "inline-flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-2 rounded-xl border", LIFT,
                                copied
                                    ? "bg-[#16a34a] border-[#16a34a] text-white"
                                    : cn("border-neutral-200 dark:border-surface-dark-border bg-white dark:bg-surface-dark-card",
                                         "text-neutral-700 dark:text-neutral-300 hover:border-[#16a34a]/50 dark:hover:border-[#22c55e]/60")
                            )}
                        >
                            {copied ? <Check size={13} strokeWidth={2.6} /> : <Share2 size={13} strokeWidth={2.4} />}
                            {copied ? "링크 복사됨" : "조건 공유"}
                        </button>
                    </div>
                </header>

                {/* ── 입력 ──────────────────────────────────────── */}
                <SectionHead tag="INPUT" title="조건" note="금액 단위: 만원" />

                <div className={cn(CARD, "overflow-hidden")}>
                    <div className={cn("flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 sm:py-3 border-b", DIVIDE)}>
                    <span className={LABEL_CLS}>표시 항목</span>
                    <Segmented
                        label="표시 항목"
                        value={detail}
                        onChange={setDetail}
                        options={[{ v: "simple" as Detail, label: "간단" }, { v: "detailed" as Detail, label: "상세" }]}
                    />
                </div>

                {/* 간단 단계는 눈금으로 — 값을 정확히 아는 게 아니라 "이쯤이면 얼마"를
                    가늠하는 단계다. 정확한 값이 필요하면 상세에서 직접 친다. */}
                {!detailed ? (
                    <>
                        <SliderRow
                            id="initial" label="초기 투자금" hint="지금 넣어둘 목돈" unit="만원"
                            value={inputs.initial} range={SLIDER_RANGE.initial}
                            format={(v) => v.toLocaleString("ko-KR")}
                            onChange={(v) => set("initial", v)}
                        />
                        <SliderRow
                            id="monthly" label="매월 적립금" hint="매달 추가로 넣을 돈" unit="만원"
                            value={inputs.monthly} range={SLIDER_RANGE.monthly}
                            format={(v) => v.toLocaleString("ko-KR")}
                            onChange={(v) => set("monthly", v)}
                        />
                        <RateModeRow value={inputs.rateMode} onChange={(v) => set("rateMode", v)} />
                        {inputs.rateMode === "fixed" ? (
                            <SliderRow
                                id="rate" label="연 수익률" hint="세전 기준" unit="%"
                                value={inputs.rate} range={SLIDER_RANGE.rate}
                                format={(v) => v.toFixed(1)}
                                onChange={(v) => set("rate", v)}
                            />
                        ) : (
                            <>
                                <SliderRow
                                    id="rateMin" label="가장 나쁜 해" hint="이 아래로는 안 떨어진다고 볼 때" unit="%"
                                    value={inputs.rateMin} range={SLIDER_RANGE.rate}
                                    format={(v) => v.toFixed(1)}
                                    onChange={(v) => set("rateMin", v)}
                                />
                                <SliderRow
                                    id="rateMax" label="가장 좋은 해" hint="이 위로는 안 오른다고 볼 때" unit="%"
                                    value={inputs.rateMax} range={SLIDER_RANGE.rate}
                                    format={(v) => v.toFixed(1)}
                                    onChange={(v) => set("rateMax", v)}
                                />
                                <RerollRow onReroll={reroll} />
                            </>
                        )}
                        <SliderRow
                            id="years" label="투자 기간" unit="년"
                            value={inputs.years} range={SLIDER_RANGE.years}
                            format={(v) => String(v)}
                            onChange={(v) => set("years", v)}
                        />
                    </>
                ) : (
                    <>
                        <div className={ROW_CLS}>
                            <label htmlFor="initial" className={LABEL_CLS}>
                                초기 투자금<span className={HINT_CLS}>지금 넣어둘 목돈</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <input id="initial" type="number" inputMode="numeric" step={100} value={inputs.initial}
                                    onChange={(e) => set("initial", Number(e.target.value))} className={INPUT_CLS} />
                                <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">만원</span>
                            </div>
                        </div>

                        <div className={ROW_CLS}>
                            <label htmlFor="monthly" className={LABEL_CLS}>
                                매월 적립금<span className={HINT_CLS}>매달 추가로 넣을 돈</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <input id="monthly" type="number" inputMode="numeric" step={10} value={inputs.monthly}
                                    onChange={(e) => set("monthly", Number(e.target.value))} className={INPUT_CLS} />
                                <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">만원</span>
                            </div>
                        </div>

                        <RateModeRow value={inputs.rateMode} onChange={(v) => set("rateMode", v)} />
                        {inputs.rateMode === "fixed" ? (
                            <RateFieldRow
                                id="rate" label="연 수익률" hint="세전 기준"
                                value={inputs.rate} onChange={(v) => set("rate", v)}
                            />
                        ) : (
                            <>
                                <RateFieldRow
                                    id="rateMin" label="가장 나쁜 해" hint="이 아래로는 안 떨어진다고 볼 때"
                                    value={inputs.rateMin} onChange={(v) => set("rateMin", v)}
                                />
                                <RateFieldRow
                                    id="rateMax" label="가장 좋은 해" hint="이 위로는 안 오른다고 볼 때"
                                    value={inputs.rateMax} onChange={(v) => set("rateMax", v)}
                                />
                                <RerollRow onReroll={reroll} />
                            </>
                        )}

                        <div className={ROW_CLS}>
                            <label htmlFor="years" className={LABEL_CLS}>투자 기간</label>
                            <div className="flex items-center gap-2">
                                <input id="years" type="number" inputMode="numeric" step={1} value={inputs.years}
                                    onChange={(e) => set("years", Number(e.target.value))} className={INPUT_CLS} />
                                <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">년</span>
                            </div>
                        </div>
                    </>
                )}

                {detailed && (
                    <>
                        <div className={ROW_CLS}>
                            <span className={LABEL_CLS}>
                                이자 계산 방식<span className={HINT_CLS}>복리는 이자가 원금에 붙는다</span>
                            </span>
                            <Segmented
                                label="이자 계산 방식"
                                value={inputs.method}
                                onChange={(v) => set("method", v)}
                                options={[{ v: "compound" as const, label: "복리" }, { v: "simple" as const, label: "단리" }]}
                            />
                        </div>

                        {inputs.method === "compound" && (
                            <div className={ROW_CLS}>
                                <span className={LABEL_CLS}>
                                    복리 주기<span className={HINT_CLS}>이자를 원금에 편입하는 간격</span>
                                </span>
                                <Segmented
                                    label="복리 주기"
                                    value={inputs.periods}
                                    onChange={(v) => set("periods", v)}
                                    options={([1, 2, 4, 12] as Periods[]).map((v) => ({ v, label: PERIOD_LABEL[v] }))}
                                />
                            </div>
                        )}

                        <div className={ROW_CLS}>
                            <span className={LABEL_CLS}>세금</span>
                            <label className="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer w-fit">
                                <input type="checkbox" checked={inputs.tax} onChange={(e) => set("tax", e.target.checked)}
                                    className="w-4 h-4 accent-[#16a34a] cursor-pointer" />
                                이자소득세 {TAX_RATE}% 차감
                            </label>
                        </div>

                        <div className={ROW_CLS}>
                            <label htmlFor="inflation" className={LABEL_CLS}>
                                물가상승률<span className={HINT_CLS}>0이면 명목 금액 그대로</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <input id="inflation" type="number" inputMode="decimal" step={0.1} value={inputs.inflation}
                                    onChange={(e) => set("inflation", Number(e.target.value))} className={INPUT_CLS} />
                                <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">%</span>
                            </div>
                        </div>
                    </>
                )}
                </div>

                {!detailed && (
                    <p className={cn(FOLD, "text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mt-3 px-1")}>
                        이 단계의 가정 — {SIMPLE_ASSUMPTIONS.join(" · ")}
                    </p>
                )}

                {/* ── 결과 ──────────────────────────────────────── */}
                <SectionHead tag="RESULT" title="결과" note={basisOf(effective)} />

                <div className={cn(CARD, "flex items-end justify-between gap-5 flex-wrap px-4 sm:px-5 py-4 sm:py-6")}>
                    <div>
                        <div className="text-[10px] font-black tracking-[0.15em] text-neutral-500 dark:text-neutral-400 uppercase">
                            만기 평가금액
                        </div>
                        <div className={cn(
                            NUM_CLS, "text-[30px] sm:text-[46px] font-semibold leading-none mt-1.5",
                            loss ? "text-[#b91c1c] dark:text-[#ef6a6a]" : "text-neutral-900 dark:text-neutral-50"
                        )}>
                            {won(result.final)}
                        </div>
                        {effective.inflation > 0 && (
                            <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                                물가 {effective.inflation.toFixed(1)}% 반영 시 오늘의 구매력으로{" "}
                                <strong className="font-bold text-neutral-600 dark:text-neutral-300">{won(result.real)}</strong>
                            </p>
                        )}
                    </div>

                    {/* 도장 — 결과가 한눈에 좋은지 나쁜지. 어중간할 때는 찍지 않는다. */}
                    {stamp && (
                        <div className="text-[11px] font-black tracking-wide px-3 py-1.5 rounded-full bg-[#fef2f2] dark:bg-[#450a0a]/40 text-[#b91c1c] dark:text-[#ef6a6a] whitespace-nowrap">
                            {stamp}
                        </div>
                    )}
                </div>

                <div className={cn(CARD, "grid grid-cols-2 sm:grid-cols-4 mt-3 overflow-hidden")}>
                    {[
                        { k: "총 납입 원금", v: won(result.principal), tone: "" },
                        { k: "총 투자수익", v: won(result.profit), tone: loss ? "loss" : "gain" },
                        { k: "누적 수익률", v: pct(result.cumret), tone: result.cumret < 0 ? "loss" : "gain" },
                        { k: "연평균 (CAGR)", v: pct(result.cagr), tone: result.cagr < 0 ? "loss" : "gain" },
                    ].map((cell, i) => (
                        <div key={cell.k} className={cn(
                            "px-4 py-3 sm:py-4",
                            i < 3 && cn("sm:border-r", DIVIDE),
                            i < 2 && cn("border-b sm:border-b-0", DIVIDE)
                        )}>
                            <div className="text-[11.5px] text-neutral-500 dark:text-neutral-400">{cell.k}</div>
                            <div className={cn(
                                NUM_CLS, "text-[19px] font-semibold mt-0.5",
                                cell.tone === "gain" && "text-[#16a34a] dark:text-[#2fa85a]",
                                cell.tone === "loss" && "text-[#b91c1c] dark:text-[#ef6a6a]"
                            )}>
                                {cell.v}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── 그래프 ────────────────────────────────────── */}
                <SectionHead tag="GROWTH" title="자산 구성 추이" note="가로축 연차 · 세로축 평가금액" />
                <div className="mt-3 sm:mt-4">
                    <GrowthChart rows={result.rows} />
                </div>

                {/* ── 표 ────────────────────────────────────────── */}
                <SectionHead tag="BREAKDOWN" title="연도별 명세" note="단위: 만원" />
                <div className={cn(CARD, "overflow-x-auto mt-3 p-1.5")}>
                    <table className="w-full border-collapse text-[13px]">
                        <thead>
                            <tr>
                                {(ranged
                                    ? ["연차", "그 해", "납입 원금", "투자수익", "평가금액", "누적"]
                                    : ["연차", "납입 원금", "투자수익", "평가금액", "수익률"]
                                ).map((h, i) => (
                                    <th key={h} className={cn(
                                        "text-[11px] font-semibold tracking-[0.1em] text-neutral-500 dark:text-neutral-400",
                                        cn("py-2 sm:py-2.5 px-2.5 sm:px-3 whitespace-nowrap border-b", DIVIDE),
                                        i === 0 ? "text-left" : "text-right"
                                    )}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {shownRows.map((d, i, arr) => {
                                const profit = d.value - d.principal;
                                const rate = d.principal > 0 ? (d.value / d.principal - 1) * 100 : 0;
                                const tone = profit < 0 ? "text-[#b91c1c] dark:text-[#ef6a6a]" : "text-[#16a34a] dark:text-[#2fa85a]";
                                const bottom = i === arr.length - 1;
                                /* 굵게는 "만기"라는 뜻이다 — 표를 접었을 때 앞줄에 찍히면 거짓말이 된다. */
                                const final = d.year === yearRows.length;
                                const cell = cn("py-2 sm:py-2.5 px-2.5 sm:px-3 border-b",
                                    bottom ? "border-neutral-200 dark:border-surface-dark-border" : DIVIDE);
                                return (
                                    <tr key={d.year} className={cn(final && "font-semibold")}>
                                        <td className={cn(cell, "text-neutral-500 dark:text-neutral-400")}>{d.year}년</td>
                                        {/* 그 해에 실제로 뽑힌 수익률 — 이 열이 있어야 "매년 다르다"가 보인다. */}
                                        {ranged && (
                                            <td className={cn(
                                                cell, NUM_CLS, "text-right",
                                                (d.rate ?? 0) < 0 ? "text-[#b91c1c] dark:text-[#ef6a6a]" : "text-neutral-700 dark:text-neutral-300"
                                            )}>
                                                {pct(d.rate ?? 0)}
                                            </td>
                                        )}
                                        <td className={cn(cell, NUM_CLS, "text-right")}>
                                            {Math.round(d.principal).toLocaleString("ko-KR")}
                                        </td>
                                        <td className={cn(cell, NUM_CLS, "text-right", tone)}>
                                            {Math.round(profit).toLocaleString("ko-KR")}
                                        </td>
                                        <td className={cn(cell, NUM_CLS, "text-right")}>
                                            {Math.round(d.value).toLocaleString("ko-KR")}
                                        </td>
                                        <td className={cn(cell, NUM_CLS, "text-right", tone)}>{pct(rate)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {yearRows.length > TABLE_PREVIEW && (
                    <button
                        type="button"
                        onClick={() => setTableOpen((v) => !v)}
                        aria-expanded={tableOpen}
                        className={cn(
                            "mt-2 w-full text-[11.5px] font-bold py-2.5 rounded-xl border",
                            "border-neutral-200 dark:border-surface-dark-border",
                            "bg-white dark:bg-surface-dark-card text-neutral-600 dark:text-neutral-300",
                            "hover:border-[#16a34a]/50 dark:hover:border-[#22c55e]/60",
                            "focus:outline-none focus:ring-2 focus:ring-[#16a34a]", LIFT
                        )}
                    >
                        {tableOpen ? "접기" : `나머지 ${yearRows.length - TABLE_PREVIEW}년 더 보기`}
                    </button>
                )}

                {/* ── 저장한 계산 ───────────────────────────────── */}
                <SectionHead tag="SAVED" title="저장한 계산" note="로그인한 사람만" />
                <div className="mt-3 sm:mt-4">
                    <CalculatorHistory
                        detail={detail}
                        snapshot={() => ({
                            inputs: { ...inputs },
                            finalValue: result.final,
                            finalRate: result.cumret,
                            totalInvestment: result.principal,
                        })}
                        onLoad={(saved, savedDetail) => {
                            setInputs(sanitize(saved as Partial<CalcInputs>));
                            setDetail(savedDetail);
                        }}
                    />
                </div>

                {/* ── 각주 ──────────────────────────────────────── */}
                <div className={cn(CARD, FOLD, "mt-6 sm:mt-10 px-5 py-4")}>
                    <ol className="list-decimal pl-5 space-y-0.5 marker:font-mono">
                        {[
                            "적립금은 매월 초 납입되고, 이자는 매월 발생하여 선택한 주기마다 원금에 편입됩니다.",
                            "단리를 고르면 이자는 원금에 편입되지 않고 따로 쌓이며, 납입 원금에 대해서만 발생합니다.",
                            `이자소득세는 이자가 편입되는 시점에 ${TAX_RATE}%를 차감합니다.`,
                            "실질 금액은 만기 평가금액을 물가상승률로 할인해 오늘의 구매력으로 환산한 값입니다.",
                            "연평균(CAGR)은 원금이 한 번에 들어갔다고 본 근사값입니다 — 적립식에서는 실제보다 낮게 나옵니다.",
                            "이 계산서는 단순 모형이며 거래비용·환율·중도 인출을 반영하지 않습니다.",
                        ].map((n) => (
                            <li key={n} className="text-[11.5px] text-neutral-500 dark:text-neutral-400 leading-[1.85]">
                                {n}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );
}
