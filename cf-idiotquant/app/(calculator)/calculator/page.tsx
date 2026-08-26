"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Share2, Check, Dice5 } from "lucide-react";

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

/* ─── 서식 조각 ───────────────────────────────────────────────
   카드도 그림자도 쓰지 않는다. 구획은 전부 괘선이 나눈다 —
   인쇄된 금융 서식의 문법이고, 이 화면이 빌려온 것도 그것이다. */

const RULE = "border-neutral-200 dark:border-border-subtle-dark";
const RULE_HARD = "border-neutral-400 dark:border-[#55514a]";

const ROW_CLS = cn(
    "grid grid-cols-1 sm:grid-cols-[168px_1fr] gap-1.5 sm:gap-x-5 sm:items-center",
    "py-2.5 sm:py-3 border-b", RULE
);
const LABEL_CLS = "text-[13px] font-bold text-neutral-700 dark:text-neutral-300";
const HINT_CLS = "block text-[11px] font-medium text-neutral-500 dark:text-neutral-400";
const NUM_CLS = "font-mono tabular-nums";

const INPUT_CLS = cn(
    "font-mono tabular-nums text-[15px] font-bold text-right",
    "text-neutral-900 dark:text-neutral-50 bg-white dark:bg-surface-dark-card",
    "border rounded-[2px] px-2.5 py-1.5 w-full sm:w-[150px]", RULE_HARD,
    "focus:outline-none focus:ring-2 focus:ring-[#16a34a]",
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
);

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
        <div className={cn("py-2.5 sm:py-3 border-b", RULE)}>
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
                    "w-full mt-2.5 h-6 bg-transparent cursor-pointer accent-[#16a34a]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] rounded-[2px]"
                )}
            />
            <div className="flex justify-between text-[10.5px] text-neutral-500 dark:text-neutral-400 -mt-0.5">
                <span>{format(min)}</span>
                <span>{format(max)}</span>
            </div>
        </div>
    );
}

function RateModeRow({ value, onChange }: { value: RateMode; onChange: (v: RateMode) => void }) {
    return (
        <div className={cn("flex items-center justify-between gap-3 py-2.5 border-b", RULE)}>
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
        <div className={cn("flex items-center justify-between gap-3 py-2.5 border-b", RULE)}>
            {/* 한 번 굴린 결과는 "일어날 수 있는 하나"일 뿐이다. 그 사실을 적어 두지 않으면
                마음에 드는 숫자가 나올 때까지 굴리고 그걸 예상으로 삼게 된다. */}
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 leading-relaxed">
                아래 결과는 이 범위에서 나올 수 있는 <b className="font-bold text-neutral-700 dark:text-neutral-300">여러 갈래 중 하나</b>입니다.
                <br className="hidden sm:block" /> 몇 번 굴려 보면 같은 조건이라도 결과가 얼마나 벌어지는지 보입니다.
            </span>
            <button
                type="button"
                onClick={onReroll}
                className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-[2px] border shrink-0 transition-colors",
                    RULE_HARD,
                    "bg-white dark:bg-surface-dark-card text-neutral-700 dark:text-neutral-300",
                    "hover:bg-[#f2efe9] dark:hover:bg-surface-dark-hover",
                    "focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                )}
            >
                <Dice5 size={13} strokeWidth={2.2} />
                다시 굴리기
            </button>
        </div>
    );
}

function SectionHead({ title, note }: { title: string; note?: string }) {
    return (
        <div className="flex items-baseline gap-3 mt-8 pb-1.5 border-b border-neutral-900 dark:border-neutral-100">
            <h2 className="font-bold text-[15px] tracking-[0.22em] text-neutral-900 dark:text-neutral-50">
                {title}
            </h2>
            {note && (
                <span className="ml-auto text-[11px] font-medium text-neutral-500 dark:text-neutral-400 text-right">
                    {note}
                </span>
            )}
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
        <div role="group" aria-label={label} className={cn("inline-flex border rounded-[2px] overflow-hidden w-fit", RULE_HARD)}>
            {options.map((o, i) => (
                <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => onChange(o.v)}
                    aria-pressed={value === o.v}
                    className={cn(
                        "text-[12.5px] font-bold px-3.5 py-1.5 min-h-[36px] transition-colors",
                        i > 0 && cn("border-l", RULE),
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

    return (
        <div className="min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas px-5 pt-8 pb-24">
            <div className="max-w-[860px] mx-auto">

                {/* ── 문서 머리 ─────────────────────────────────── */}
                <header className={cn(
                    "flex items-end justify-between gap-5 flex-wrap",
                    "border-t-[3px] border-neutral-900 dark:border-neutral-100 border-b", RULE_HARD,
                    "pt-3.5 pb-2.5"
                )}>
                    <h1 className="font-bold text-[22px] sm:text-[30px] tracking-[0.06em] text-neutral-900 dark:text-neutral-50">
                        복리 수익률 계산서
                    </h1>
                    <button
                        type="button"
                        onClick={share}
                        className={cn(
                            "inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-[2px] border transition-colors",
                            RULE_HARD,
                            copied
                                ? "bg-[#16a34a] border-[#16a34a] text-white"
                                : "bg-white dark:bg-surface-dark-card text-neutral-700 dark:text-neutral-300 hover:bg-[#f2efe9] dark:hover:bg-surface-dark-hover"
                        )}
                    >
                        {copied ? <Check size={13} strokeWidth={2.6} /> : <Share2 size={13} strokeWidth={2.4} />}
                        {copied ? "링크 복사됨" : "조건 공유"}
                    </button>
                </header>

                {/* ── 입력 ──────────────────────────────────────── */}
                <SectionHead title="입 력" note="금액 단위: 만원" />

                <div className={cn("flex items-center justify-between py-2.5 border-b", RULE)}>
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
                            <div className={ROW_CLS}>
                                <label htmlFor="rate" className={LABEL_CLS}>
                                    연 수익률<span className={HINT_CLS}>세전 기준</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <input id="rate" type="number" inputMode="decimal" step={0.1} value={inputs.rate}
                                        onChange={(e) => set("rate", Number(e.target.value))} className={INPUT_CLS} />
                                    <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">%</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={ROW_CLS}>
                                    <label htmlFor="rateMin" className={LABEL_CLS}>
                                        가장 나쁜 해<span className={HINT_CLS}>이 아래로는 안 떨어진다고 볼 때</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input id="rateMin" type="number" inputMode="decimal" step={0.1} value={inputs.rateMin}
                                            onChange={(e) => set("rateMin", Number(e.target.value))} className={INPUT_CLS} />
                                        <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">%</span>
                                    </div>
                                </div>
                                <div className={ROW_CLS}>
                                    <label htmlFor="rateMax" className={LABEL_CLS}>
                                        가장 좋은 해<span className={HINT_CLS}>이 위로는 안 오른다고 볼 때</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input id="rateMax" type="number" inputMode="decimal" step={0.1} value={inputs.rateMax}
                                            onChange={(e) => set("rateMax", Number(e.target.value))} className={INPUT_CLS} />
                                        <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">%</span>
                                    </div>
                                </div>
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

                {!detailed && (
                    <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 pt-2.5">
                        이 단계의 가정 — {SIMPLE_ASSUMPTIONS.join(" · ")}
                    </p>
                )}

                {/* ── 결과 ──────────────────────────────────────── */}
                <SectionHead title="결 과" note={basisOf(effective)} />

                <div className={cn(
                    "flex items-end justify-between gap-5 flex-wrap",
                    "border-t border-b-[3px] border-double", RULE_HARD, "py-5"
                )}>
                    <div>
                        <div className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 dark:text-neutral-400 uppercase">
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
                        <div className="font-bold text-[13px] tracking-[0.3em] px-3.5 py-1.5 pl-[18px] border-2 border-[#b91c1c] dark:border-[#ef6a6a] text-[#b91c1c] dark:text-[#ef6a6a] opacity-85 -rotate-[4deg] whitespace-nowrap">
                            {stamp}
                        </div>
                    )}
                </div>

                <div className={cn("grid grid-cols-2 sm:grid-cols-4 border-b", RULE)}>
                    {[
                        { k: "총 납입 원금", v: won(result.principal), tone: "" },
                        { k: "총 투자수익", v: won(result.profit), tone: loss ? "loss" : "gain" },
                        { k: "누적 수익률", v: pct(result.cumret), tone: result.cumret < 0 ? "loss" : "gain" },
                        { k: "연평균 (CAGR)", v: pct(result.cagr), tone: result.cagr < 0 ? "loss" : "gain" },
                    ].map((cell, i) => (
                        <div key={cell.k} className={cn("py-3.5 pr-4", i < 3 && cn("sm:border-r", RULE), i < 2 && cn("border-b sm:border-b-0", RULE))}>
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
                <SectionHead title="자산 구성 추이" note="가로축 연차 · 세로축 평가금액" />
                <div className="mt-4">
                    <GrowthChart rows={result.rows} />
                </div>

                {/* ── 표 ────────────────────────────────────────── */}
                <SectionHead title="연도별 명세" note="단위: 만원" />
                <div className="overflow-x-auto mt-1.5">
                    <table className="w-full border-collapse text-[13px]">
                        <thead>
                            <tr>
                                {(ranged
                                    ? ["연차", "그 해", "납입 원금", "투자수익", "평가금액", "누적"]
                                    : ["연차", "납입 원금", "투자수익", "평가금액", "수익률"]
                                ).map((h, i) => (
                                    <th key={h} className={cn(
                                        "text-[11px] font-semibold tracking-[0.1em] text-neutral-500 dark:text-neutral-400",
                                        "py-2 px-2.5 whitespace-nowrap border-b border-neutral-900 dark:border-neutral-100",
                                        i === 0 ? "text-left" : "text-right"
                                    )}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {result.rows.filter((d) => d.year > 0).map((d, i, arr) => {
                                const profit = d.value - d.principal;
                                const rate = d.principal > 0 ? (d.value / d.principal - 1) * 100 : 0;
                                const tone = profit < 0 ? "text-[#b91c1c] dark:text-[#ef6a6a]" : "text-[#16a34a] dark:text-[#2fa85a]";
                                const last = i === arr.length - 1;
                                const cell = cn("py-2 px-2.5 border-b", last ? RULE_HARD : RULE);
                                return (
                                    <tr key={d.year} className={cn(last && "font-semibold")}>
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

                {/* ── 저장한 계산 ───────────────────────────────── */}
                <SectionHead title="저장한 계산" note="로그인한 사람만" />
                <div className="mt-4">
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
                <div className={cn("mt-8 pt-3.5 border-t", RULE)}>
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
