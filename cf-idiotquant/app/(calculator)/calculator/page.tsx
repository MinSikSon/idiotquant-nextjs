"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import {
    CalculatorIcon,
    ArrowTrendingUpIcon,
    UserIcon,
    ArrowsRightLeftIcon,
    InformationCircleIcon,
    LightBulbIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    MinusIcon,
    ShareIcon,
    CheckIcon,
    ShieldCheckIcon,
    ChartBarIcon
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import ResultChart, { ChartDataItem } from "./ResultChart";

// 클래스 병합 유틸리티 함수 구현
function cn(...inputs: (string | boolean | undefined | null)[]) {
    return inputs.filter(Boolean).join(" ");
}

// --- 📌 만원 단위 데이터를 절삭 없이 정확하게 조/억/만 단위로 포맷팅하는 함수 ---
const formatKrw = (valueInMan: number): string => {
    if (valueInMan === 0 || isNaN(valueInMan)) return "0원";

    const isNegative = valueInMan < 0;
    const absValue = Math.abs(valueInMan);

    const trill = Math.floor(absValue / 100000000);
    const eok = Math.floor((absValue % 100000000) / 10000);
    const man = Math.floor(absValue % 10000);

    let result = "";
    if (trill > 0) result += `${trill.toLocaleString()}조 `;
    if (eok > 0) result += `${eok.toLocaleString()}억 `;
    if (man > 0) result += `${man.toLocaleString()}만`;

    if (!result) return "0원";

    return `${isNegative ? "-" : ""}${result.trim()}원`;
};

interface CalcInputs {
    startAge: number;
    retirementAge: number;
    targetAge: number;
    investmentAmount: number;
    interestRate: number;
    contributions: number;
    contributionGrowthRate: number;
    monthlyExpense: number;
    expenseGrowthRate: number;
    taxRate: number;
    applyTax: boolean;
    realValueMode: boolean;
    applyIsaIsaGold: boolean;
    applyInsurancePremium: boolean;
    applyNationalPension: boolean;
}

const NUMERIC_INPUT_LIMITS = {
    startAge: { min: 20, max: 80 },
    retirementAge: { min: 20, max: 90 },
    targetAge: { min: 20, max: 100 },
    investmentAmount: { min: 0, max: 100000000 },
    interestRate: { min: 0, max: 25 },
    contributions: { min: 0, max: 5000 },
    contributionGrowthRate: { min: 0, max: 15 },
    monthlyExpense: { min: 0, max: 5000 },
    expenseGrowthRate: { min: 0, max: 15 },
    taxRate: { min: 0, max: 100 },
} satisfies Partial<Record<keyof CalcInputs, { min: number; max: number }>>;

type NumericInputKey = keyof typeof NUMERIC_INPUT_LIMITS;

const isNumericInputKey = (key: keyof CalcInputs): key is NumericInputKey => key in NUMERIC_INPUT_LIMITS;

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const sanitizeNumericValue = (key: NumericInputKey, value: number, fallback: number) => {
    const limits = NUMERIC_INPUT_LIMITS[key];
    const safeValue = Number.isFinite(value) ? value : fallback;
    return clampNumber(safeValue, limits.min, limits.max);
};

const areInputsEqual = (a: CalcInputs, b: CalcInputs) => {
    return (Object.keys(DEFAULT_INPUTS) as (keyof CalcInputs)[]).every((key) => a[key] === b[key]);
};

const parseInputsFromSearchParams = (params: Pick<URLSearchParams, "get">): CalcInputs => {
    const parseNum = (key: NumericInputKey, def: number) => {
        const val = params.get(key);
        const parsed = val === null || val.trim() === "" ? def : Number(val);
        return sanitizeNumericValue(key, parsed, def);
    };

    const parseBool = (key: keyof CalcInputs, def: boolean) => {
        const val = params.get(key);
        return val === null ? def : val === "true";
    };

    return {
        startAge: parseNum("startAge", DEFAULT_INPUTS.startAge),
        retirementAge: parseNum("retirementAge", DEFAULT_INPUTS.retirementAge),
        targetAge: parseNum("targetAge", DEFAULT_INPUTS.targetAge),
        investmentAmount: parseNum("investmentAmount", DEFAULT_INPUTS.investmentAmount),
        interestRate: parseNum("interestRate", DEFAULT_INPUTS.interestRate),
        contributions: parseNum("contributions", DEFAULT_INPUTS.contributions),
        contributionGrowthRate: parseNum("contributionGrowthRate", DEFAULT_INPUTS.contributionGrowthRate),
        monthlyExpense: parseNum("monthlyExpense", DEFAULT_INPUTS.monthlyExpense),
        expenseGrowthRate: parseNum("expenseGrowthRate", DEFAULT_INPUTS.expenseGrowthRate),
        taxRate: parseNum("taxRate", DEFAULT_INPUTS.taxRate),
        applyTax: parseBool("applyTax", DEFAULT_INPUTS.applyTax),
        realValueMode: parseBool("realValueMode", DEFAULT_INPUTS.realValueMode),
        applyIsaIsaGold: parseBool("applyIsaIsaGold", DEFAULT_INPUTS.applyIsaIsaGold),
        applyInsurancePremium: parseBool("applyInsurancePremium", DEFAULT_INPUTS.applyInsurancePremium),
        applyNationalPension: parseBool("applyNationalPension", DEFAULT_INPUTS.applyNationalPension),
    };
};

const serializeInputs = (inputs: CalcInputs) => {
    const params = new URLSearchParams();
    Object.entries(inputs).forEach(([key, value]) => {
        if (typeof value === "number" && !Number.isFinite(value)) return;
        params.set(key, String(value));
    });
    return params.toString();
};

const DEFAULT_INPUTS: CalcInputs = {
    startAge: 30,
    retirementAge: 60,
    targetAge: 90,
    investmentAmount: 5000,
    interestRate: 8,
    contributions: 150,
    contributionGrowthRate: 3.0,
    monthlyExpense: 300,
    expenseGrowthRate: 2.5,
    taxRate: 15.4,
    applyTax: true,
    realValueMode: false,
    applyIsaIsaGold: false,
    applyInsurancePremium: false,
    applyNationalPension: false,
};

const createNextInputs = <K extends keyof CalcInputs>(previousInputs: CalcInputs, key: K, val: CalcInputs[K]): CalcInputs => {
    const nextValue = isNumericInputKey(key)
        ? sanitizeNumericValue(key, Number(val), previousInputs[key] as number)
        : val;
    const next = { ...previousInputs, [key]: nextValue };

    if (key === "startAge") {
        if (next.startAge > next.retirementAge) next.retirementAge = next.startAge;
        if (next.retirementAge > next.targetAge) next.targetAge = next.retirementAge;
    } else if (key === "retirementAge") {
        if (next.retirementAge < next.startAge) next.retirementAge = next.startAge;
        if (next.retirementAge > next.targetAge) next.targetAge = next.retirementAge;
    } else if (key === "targetAge") {
        if (next.targetAge < next.retirementAge) next.targetAge = next.retirementAge;
    }

    return next;
};

export default function AssetLifetimeCalculator() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-900 dark:text-zinc-50 font-sans font-black text-base">
                시뮬레이터 데이터를 로드하고 있습니다...
            </div>
        }>
            <CalculatorContent />
        </Suspense>
    );
}

function CalculatorContent() {
    const didParseInitialUrlRef = useRef(false);
    const latestInputsRef = useRef<CalcInputs>(DEFAULT_INPUTS);
    const inputFrameRef = useRef<number | null>(null);
    const [copied, setCopied] = useState(false);
    const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_INPUTS);

    useEffect(() => {
        if (didParseInitialUrlRef.current) return;
        didParseInitialUrlRef.current = true;

        const parsedInputs = parseInputsFromSearchParams(new URLSearchParams(window.location.search));
        latestInputsRef.current = parsedInputs;
        setInputs((previousInputs) => areInputsEqual(previousInputs, parsedInputs) ? previousInputs : parsedInputs);
    }, []);

    useEffect(() => {
        latestInputsRef.current = inputs;
    }, [inputs]);

    useEffect(() => {
        return () => {
            if (inputFrameRef.current !== null) {
                cancelAnimationFrame(inputFrameRef.current);
            }
        };
    }, []);

    const updateInput = <K extends keyof CalcInputs>(key: K, val: CalcInputs[K]) => {
        const nextInputs = createNextInputs(latestInputsRef.current, key, val);
        if (areInputsEqual(latestInputsRef.current, nextInputs)) return;

        latestInputsRef.current = nextInputs;

        if (inputFrameRef.current !== null) {
            cancelAnimationFrame(inputFrameRef.current);
        }

        inputFrameRef.current = requestAnimationFrame(() => {
            inputFrameRef.current = null;
            setInputs((previousInputs) => areInputsEqual(previousInputs, latestInputsRef.current) ? previousInputs : latestInputsRef.current);
        });
    };

    // --- 정밀화된 계산기 사용 숙련도(Proficiency) 산출 로직 ---
    const proficiency = useMemo(() => {
        let score = 0;
        const reasons: string[] = [];

        // 1. 핵심 마찰 비용 (인플레이션/실질가치) 반영 여부 (가장 중요)
        if (inputs.realValueMode) {
            score += 25;
            reasons.push("물가상승(실질가치) 완벽 연동 (+25)");
        }

        // 2. 은퇴 후 치명적인 숨은 비용 고려 여부
        if (inputs.applyInsurancePremium) {
            score += 20;
            reasons.push("은퇴 후 건보료 지역가입 페널티 대비 (+20)");
        }

        // 3. 자산가치 방어 및 절세 헷지 전략
        if (inputs.applyIsaIsaGold) {
            score += 15;
            reasons.push("고율 과세 방어 및 절세 계좌 전략 적용 (+15)");
        }

        // 4. 기본 과세 인식
        if (inputs.applyTax) {
            score += 10;
            reasons.push("배당/이자소득세 과세 복리 차감 (+10)");
        }

        // 5. 외부 현금흐름 파이프라인
        if (inputs.applyNationalPension) {
            score += 10;
            reasons.push("국민연금 수령 스케줄 포트폴리오 연동 (+10)");
        }

        // 6. 점진적 경제 변동성 인식
        if (inputs.expenseGrowthRate > 0) {
            score += 10;
            reasons.push("매년 지출 물가연동 상승률 적용 (+10)");
        }
        if (inputs.contributionGrowthRate > 0) {
            score += 10;
            reasons.push("연봉 상승에 따른 투자금 증액 시나리오 적용 (+10)");
        }

        const clamped = Math.min(100, score);

        let level = 1;
        let label = "초심자";
        let color = "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700";
        let iconColor = "text-zinc-600 dark:text-zinc-400";
        let desc = "기본적인 수익률만 계산하는 단계입니다. 실전처럼 물가상승이나 건보료, 절세 옵션을 켜서 정밀도를 높여보세요.";

        if (clamped >= 85) {
            level = 4;
            label = "퀀트 마스터";
            color = "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-900/40 dark:border-purple-800";
            iconColor = "text-purple-600 dark:text-purple-400";
            desc = "세금, 건보료, 인플레이션, 절세 헷지 수단까지 철저히 통제하여 오차 없는 실전 퀀트 투자 환경을 구현해 냈습니다.";
        } else if (clamped >= 60) {
            level = 3;
            label = "전략가";
            color = "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-800";
            iconColor = "text-blue-600 dark:text-blue-400";
            desc = "명목 화폐의 함정을 벗어나 실질 가치(구매력)와 은퇴 후 숨은 마찰 비용을 심도 있게 계산하는 기획자입니다.";
        } else if (clamped >= 30) {
            level = 2;
            label = "탐험가";
            color = "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-800";
            iconColor = "text-emerald-600 dark:text-emerald-400";
            desc = "단순 복리를 넘어, 세금 및 물가 상승 등 자본주의의 기초적인 마찰 비용을 시뮬레이션에 반영하기 시작했습니다.";
        }

        return { score: clamped, level, label, color, iconColor, desc, reasons };
    }, [inputs]);

    const results = useMemo(() => {
        const {
            startAge, retirementAge, targetAge, investmentAmount,
            interestRate, contributions, contributionGrowthRate,
            monthlyExpense, expenseGrowthRate, taxRate, applyTax, realValueMode,
            applyIsaIsaGold, applyInsurancePremium, applyNationalPension
        } = inputs;

        let currentBalance = investmentAmount;
        let totalInvested = investmentAmount;
        let monthlyIncome = contributions;
        let monthlyOutgo = monthlyExpense;

        const totalMonths = Math.max(0, (targetAge - startAge) * 12);
        const workingMonths = Math.max(0, (retirementAge - startAge) * 12);
        const snapshots: ChartDataItem[] = [{ year: startAge, totalValue: Math.round(currentBalance), profitRate: 0 }];
        const inflationRateAnnual = 2.5;

        for (let m = 1; m <= totalMonths; m++) {
            const currentAge = startAge + Math.floor(m / 12);
            let activeTaxRate = taxRate;
            if (applyIsaIsaGold) activeTaxRate = 22.0;

            let profit = currentBalance * (interestRate / 100 / 12);
            if (applyTax && profit > 0) profit *= (1 - activeTaxRate / 100);
            currentBalance += profit;

            if (m <= workingMonths) {
                currentBalance += monthlyIncome;
                totalInvested += monthlyIncome;
            }

            let actualMonthlyOutgo = monthlyOutgo;
            if (m > workingMonths && applyInsurancePremium) actualMonthlyOutgo += (monthlyOutgo * 0.08);

            if (currentAge >= 65 && applyNationalPension) currentBalance += 120;

            currentBalance -= actualMonthlyOutgo;

            if (m % 12 === 0) {
                if (m <= workingMonths) monthlyIncome *= (1 + contributionGrowthRate / 100);
                monthlyOutgo *= (1 + expenseGrowthRate / 100);
                const elapsedYears = m / 12;
                let displayBalance = currentBalance;
                if (realValueMode) displayBalance = currentBalance / Math.pow(1 + inflationRateAnnual / 100, elapsedYears);

                snapshots.push({
                    year: startAge + elapsedYears,
                    totalValue: Math.max(0, Math.round(displayBalance)),
                    profitRate: totalInvested > 0 ? Number(((currentBalance / totalInvested - 1) * 100).toFixed(1)) : 0,
                });
            }
            if (currentBalance < -100000000) break;
        }

        const finalElapsedTime = targetAge - startAge;
        const finalBalance = realValueMode ? currentBalance / Math.pow(1 + inflationRateAnnual / 100, finalElapsedTime) : currentBalance;

        return {
            totalInvestment: totalInvested,
            finalValue: Math.round(finalBalance),
            finalRateOfReturn: totalInvested > 0 ? Number(((currentBalance / totalInvested - 1) * 100).toFixed(1)) : 0,
            chartData: snapshots,
        };
    }, [inputs]);

    const handleShareLink = async () => {
        try {
            const shareUrl = new URL(window.location.href);
            shareUrl.search = serializeInputs(inputs);
            await navigator.clipboard.writeText(shareUrl.toString());
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) { console.error(err); }
    };

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 min-h-screen p-4 md:p-10 pb-24 md:pb-10 font-sans text-zinc-900 dark:text-zinc-50 selection:bg-blue-500/20">
            <div className="max-w-6xl mx-auto space-y-10">
                {/* 헤더 및 리포트 공유 생태계 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20">
                            <CalculatorIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">내 자산 수명 진단기</h1>
                                {/* 호버링 툴팁을 포함한 숙련도 뱃지 영역 */}
                                <div className="relative group flex items-center">
                                    <div className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-black border flex items-center gap-1 transition-colors duration-300 cursor-help", proficiency.color)}>
                                        <span>Lv.{proficiency.level} {proficiency.label}</span>
                                    </div>
                                    <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-72 p-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold rounded-xl shadow-2xl border border-zinc-800 dark:border-zinc-200 z-50 leading-relaxed">
                                        <div className="mb-3 pb-3 border-b border-zinc-700 dark:border-zinc-200">
                                            <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                                                숙련도 {proficiency.score}점 판정 이유
                                            </span>
                                            {proficiency.reasons.length > 0 ? (
                                                <ul className="list-disc pl-4 space-y-1.5 text-zinc-300 dark:text-zinc-700">
                                                    {proficiency.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                                </ul>
                                            ) : (
                                                <span className="text-zinc-500">적용된 고급 방어/헷지 전략이 없습니다.</span>
                                            )}
                                        </div>
                                        <p className="text-zinc-100 dark:text-zinc-800">{proficiency.desc}</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-zinc-800 dark:text-zinc-200 font-bold mt-1">세금, 건보료, 연금까지 반영한 100세 시대 맞춤형 복리 시뮬레이터</p>
                        </div>
                    </div>
                    <button onClick={handleShareLink} className={cn("hidden sm:flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm border shrink-0", copied ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50")}>
                        {copied ? <CheckIcon className="w-4 h-4" /> : <ShareIcon className="w-4 h-4" />}
                        {copied ? "시뮬레이션 링크 복사 완료!" : "결과 리포트 공유"}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* 좌측: 입력 패널 */}
                    <div className="lg:col-span-5 space-y-8">
                        <SectionWrapper title="핵심 자산 및 기대 수익률" icon={<ArrowTrendingUpIcon className="w-4 h-4 text-zinc-900 dark:text-zinc-50" />}>
                            <div className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <InputGroup label="초기 투자 시드" tooltip="현재 투입 가능한 순수 자산 및 투자 예치금 총액입니다." value={formatKrw(inputs.investmentAmount)} color="text-blue-600 dark:text-blue-400">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input type="number" value={inputs.investmentAmount} onChange={(e) => updateInput("investmentAmount", Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl pl-4 pr-12 py-2.5 font-black text-sm text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-900 dark:text-zinc-50 text-xs font-black">만원</div>
                                        </div>
                                        <StepButtons value={inputs.investmentAmount} step={500} min={0} max={100000000} onChange={(v) => updateInput("investmentAmount", v)} />
                                    </div>
                                </InputGroup>

                                <PercentRateSlider
                                    label="투자 자산 기대 수익률 (연)"
                                    tooltip="목표로 하는 연평균 포트폴리오 수익률입니다. 장기 평균치 입력을 권장합니다."
                                    value={inputs.interestRate}
                                    min={0}
                                    max={25}
                                    step={0.1}
                                    onChange={(v) => updateInput("interestRate", v)}
                                    accentColor="blue"
                                    showQuickButtons={true}
                                />

                                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                                    <span className="text-xs font-black text-zinc-900 dark:text-zinc-50 block px-1">과세 및 헷지 변수</span>
                                    <div className="flex flex-col gap-3">
                                        <ToggleButton checked={inputs.applyTax} onChange={(v) => updateInput("applyTax", v)} label="이자소득세 과세 (15.4%)" tooltip="매년 투자 수익에 배당소득세를 차감한 세후 복리를 계산합니다." />
                                        <ToggleButton checked={inputs.realValueMode} onChange={(v) => updateInput("realValueMode", v)} label="물가상승 반영 (실질가치)" tooltip="연 2.5% 인플레이션을 반영하여 미래 금액을 현재 가치로 조정합니다." />
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/40 space-y-3">
                                    <span className="text-xs font-black text-blue-700 dark:text-blue-400 block px-1 flex items-center gap-1"><ShieldCheckIcon className="w-3 h-3" /> 실전 정밀 검증 패널티 & 혜택</span>
                                    <div className="grid grid-cols-1 gap-2">
                                        <ToggleButton checked={inputs.applyIsaIsaGold} onChange={(v) => updateInput("applyIsaIsaGold", v)} label="금융투자소득세 고율 가산 (22% 세율 대체)" tooltip="거액 자산가 구간 진입 시 고율 과세 세율을 선제 적용합니다." />
                                        <ToggleButton checked={inputs.applyInsurancePremium} onChange={(v) => updateInput("applyInsurancePremium", v)} label="은퇴 후 건보료 지역가입 페널티 (지출 +8%)" tooltip="직장 은퇴 후 지역가입 전환에 따른 피부양자 탈락 및 지출 가산을 시뮬레이션합니다." />
                                        <ToggleButton checked={inputs.applyNationalPension} onChange={(v) => updateInput("applyNationalPension", v)} label="만 65세 이후 국민연금 수령 연동 (월 +120만)" tooltip="연금 수령 나이 도달 시 매달 실질 가치 기준의 안정 자금이 계좌에 주입됩니다." />
                                    </div>
                                </div>
                            </div>
                        </SectionWrapper>

                        <SectionWrapper title="생애 주기 임계값" icon={<UserIcon className="w-4 h-4 text-zinc-900 dark:text-zinc-50" />}>
                            <div className="space-y-4 bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <AgeInputSlider label="시작 연령" tooltip="이 시뮬레이션을 가동하는 현재 내 나이입니다." value={inputs.startAge} min={20} max={80} onChange={(v) => updateInput("startAge", v)} />
                                <AgeInputSlider label="은퇴 및 저축 중단 연령" tooltip="본업을 중단하고 원금 투입 없이 복리 증식과 생활비 인출만 일어나는 시점입니다." value={inputs.retirementAge} min={inputs.startAge} max={90} onChange={(v) => updateInput("retirementAge", v)} />
                                <AgeInputSlider label="자산 수명 검증 종료 연령" tooltip="내 자산이 고갈되지 않고 버텨주기를 바라는 최종 목표 나이입니다." value={inputs.targetAge} min={inputs.retirementAge} max={100} onChange={(v) => updateInput("targetAge", v)} />
                            </div>
                        </SectionWrapper>

                        <SectionWrapper title="점증형 현금 가감 데이터" icon={<ArrowsRightLeftIcon className="w-4 h-4 text-zinc-900 dark:text-zinc-50" />}>
                            <div className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <div className="space-y-4">
                                    <InputGroup label="초기 매월 저축액" tooltip="은퇴 전 근로 기간 동안 매달 투자 계좌에 적립할 원금입니다." value={formatKrw(inputs.contributions)}>
                                        <div className="flex gap-2">
                                            <input type="number" value={inputs.contributions} onChange={(e) => updateInput("contributions", Number(e.target.value))} className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 font-black text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-blue-500" />
                                            <StepButtons value={inputs.contributions} step={50} min={0} max={5000} onChange={(v) => updateInput("contributions", v)} />
                                        </div>
                                    </InputGroup>
                                    <PercentRateSlider label="복리 저축 매년 증액률" tooltip="연봉 상승을 반영해 매년 월 적립액을 복리로 늘려나가는 엔진입니다." value={inputs.contributionGrowthRate} min={0} max={15} step={0.5} onChange={(v) => updateInput("contributionGrowthRate", v)} accentColor="blue" />
                                </div>
                                <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
                                <div className="space-y-4">
                                    <InputGroup label="기본 목표 초기 월 생활비" tooltip="은퇴 후 매달 삶을 유지하기 위해 인출하여 사용할 고정 비용입니다." value={formatKrw(inputs.monthlyExpense)} color="text-rose-600 dark:text-rose-400">
                                        <div className="flex gap-2">
                                            <input type="number" value={inputs.monthlyExpense} onChange={(e) => updateInput("monthlyExpense", Number(e.target.value))} className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 font-black text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-rose-500" />
                                            <StepButtons value={inputs.monthlyExpense} step={50} min={0} max={5000} onChange={(v) => updateInput("monthlyExpense", v)} />
                                        </div>
                                    </InputGroup>
                                    <PercentRateSlider label="매년 물가 연동 지출 상승률" tooltip="인플레이션에 의해 은퇴 후 생활비 지출이 매년 늘어나는 현상을 반영합니다." value={inputs.expenseGrowthRate} min={0} max={15} step={0.1} onChange={(v) => updateInput("expenseGrowthRate", v)} accentColor="rose" />
                                </div>
                            </div>
                        </SectionWrapper>
                    </div>

                    {/* 우측: 결과 출력 요약 패널 */}
                    <div className="lg:col-span-7 space-y-8">
                        {/* 1. 최종 시뮬레이션 요약 블록 */}
                        <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                            <div className={cn("p-8 md:p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden transition-all duration-500 border bg-zinc-950 border-zinc-800 dark:bg-zinc-900 dark:border-zinc-800 text-white", results.finalValue < 0 && "border-rose-900/60")}>
                                <div className="relative z-10 space-y-8">
                                    <div className="space-y-3">
                                        <span className={cn("text-xs font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border bg-black/50 text-white border-zinc-700")}>
                                            {inputs.targetAge}세 예상 시점 잔고 {inputs.realValueMode && "(실질 가치 수렴)"}
                                        </span>
                                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-blue-400 dark:text-blue-400">
                                            {formatKrw(results.finalValue)}
                                        </h2>
                                        {results.finalValue < 0 && (
                                            <div className="flex items-center gap-2 text-rose-400 text-xs font-black bg-rose-500/10 p-3 rounded-xl border border-rose-500/30">
                                                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                                                <span>경고: 지표 가산 패널티 및 가치 하락으로 인해 자산 수명이 목표 연령 전 고갈됩니다.</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                                            <span className="text-xs font-black text-zinc-300 uppercase tracking-wider block mb-1">총 누적 투입 원금</span>
                                            <div className="text-base font-black text-white">{formatKrw(results.totalInvestment)}</div>
                                        </div>
                                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800 text-right">
                                            <span className="text-xs font-black text-zinc-300 uppercase tracking-wider block mb-1">최종 레버리지 배율</span>
                                            <div className={cn("text-xl font-black", results.finalValue >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                {results.totalInvestment > 0 ? (results.finalValue / results.totalInvestment).toFixed(1) : 0} 배
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={cn("absolute -right-24 -top-24 w-80 h-80 rounded-full blur-[120px] opacity-20 transition-colors", results.finalValue >= 0 ? "bg-blue-600" : "bg-rose-600")} />
                            </div>
                        </motion.div>

                        {/* 계산기 숙련도 및 상태 피드백 패널 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CalloutWrapper icon={<ChartBarIcon className={cn("w-5 h-5", proficiency.iconColor)} />} title={`숙련도: Lv.${proficiency.level} ${proficiency.label} (${proficiency.score}점)`}>
                                {proficiency.desc}
                                {proficiency.reasons.length > 0 && (
                                    <span className="block mt-2 text-[11px] opacity-80 font-bold border-t border-zinc-200 dark:border-zinc-800 pt-2">
                                        ✨ 적용된 마찰 비용 및 헷지 전략 개수: {proficiency.reasons.length}개
                                    </span>
                                )}
                            </CalloutWrapper>
                            <CalloutWrapper icon={<LightBulbIcon className={cn("w-5 h-5", results.finalValue > 0 ? "text-emerald-600" : "text-rose-500")} />} title="퀀트 자산 수명 진단">
                                {results.finalValue > 0 ? (
                                    <>
                                        <span className="font-black text-emerald-600 dark:text-emerald-400">🎉 안정적인 노후 생태계 구축 완료:</span> 은퇴 후 자산에서 나오는 투자 수익이 지출액을 압도하고 있습니다. 마르지 않는 마법의 스노우볼 구조가 유지되는 중입니다.
                                    </>
                                ) : (
                                    <>
                                        <span className="font-black text-rose-600 dark:text-rose-400">⚠️ 자산 조기 고갈 리스크 감지:</span> 은퇴 후 부과되는 페널티와 인플레이션이 투자 수익보다 가파릅니다. 초기 시드 증액, 은퇴 연장, 수익률 재조정이 필요합니다.
                                    </>
                                )}
                            </CalloutWrapper>
                        </div>

                        {/* 3. 자산 변동 차트 블록 */}
                        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <div className="mb-6">
                                <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">지표 연동형 자산 변동 그래프</h3>
                                <p className="text-sm text-zinc-800 dark:text-zinc-200 font-bold mt-1">매년 가중되는 인플레이션 누적 및 세후 배당 유출입 복리 커브 (조/억/만 단위 정밀 반영)</p>
                            </div>
                            <div className="bg-zinc-50 dark:bg-black/40 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 px-3 pt-4 pb-2">
                                <ResultChart data={results.chartData} height="h-[400px]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- 📱 모바일 하단 고정형 결과 공유 생태계 바 --- */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 p-3 z-50 flex items-center justify-center shadow-2xl">
                <button
                    onClick={handleShareLink}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all shadow-md border",
                        copied
                            ? "bg-emerald-600 border-emerald-600 text-white animate-pulse"
                            : "bg-blue-600 border-blue-600 text-white active:scale-[0.98]"
                    )}
                >
                    {copied ? <CheckIcon className="w-5 h-5" /> : <ShareIcon className="w-5 h-5" />}
                    {copied ? "시뮬레이션 링크 복사 완료!" : "결과 리포트 공유하기"}
                </button>
            </div>
        </div>
    );
}

// --- 공용 서브 UI 빌더 컴포넌트 생태계 ---

function SectionWrapper({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2 px-1 text-zinc-900 dark:text-zinc-50">
                {icon}
                <h2 className="text-xs font-black uppercase tracking-[0.2em]">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function InputGroup({ label, value, tooltip, color = "text-zinc-900 dark:text-zinc-50", children }: any) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end gap-4">
                <div className="flex items-center gap-1 group relative">
                    <span className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-widest block">{label}</span>
                    {tooltip && (
                        <>
                            <InformationCircleIcon className="w-4 h-4 text-zinc-500 cursor-help shrink-0" />
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold rounded-xl shadow-xl border border-zinc-800 dark:border-zinc-200 z-50 leading-relaxed">
                                {tooltip}
                            </div>
                        </>
                    )}
                </div>
                <span className={`text-base font-black shrink-0 ${color}`}>{value}</span>
            </div>
            {children}
        </div>
    );
}

function StepButtons({ value, step, min, max, onChange }: { value: number; step: number; min: number; max: number; onChange: (v: number) => void }) {
    return (
        <div className="flex border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-zinc-800 shadow-sm shrink-0 h-10 items-center">
            <button type="button" disabled={value <= min} onClick={() => onChange(Math.max(min, Number((value - step).toFixed(2))))} className="px-3 h-full text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 border-r border-zinc-300 dark:border-zinc-700 transition-colors flex items-center justify-center">
                <MinusIcon className="w-4 h-4" />
            </button>
            <button type="button" disabled={value >= max} onClick={() => onChange(Math.min(max, Number((value + step).toFixed(2))))} className="px-3 h-full text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors flex items-center justify-center">
                <PlusIcon className="w-4 h-4" />
            </button>
        </div>
    );
}

function ToggleButton({ checked, onChange, label, tooltip }: { checked: boolean; onChange: (v: boolean) => void; label: string; tooltip?: string }) {
    return (
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors min-w-0 gap-2">
            <div className="flex items-center gap-1.5 group relative max-w-[calc(100%-2.5rem)] min-w-0">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 whitespace-normal break-keep">
                    {label}
                </span>
                {tooltip && (
                    <>
                        <InformationCircleIcon className="w-3.5 h-3.5 text-zinc-400 cursor-help shrink-0" />
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-56 p-2.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[11px] font-medium rounded-lg shadow-lg border border-zinc-800 dark:border-zinc-200 z-50 leading-normal">
                            {tooltip}
                        </div>
                    </>
                )}
            </div>
            <button type="button" onClick={() => onChange(!checked)} className={cn("w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0", checked ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700")}>
                <div className={cn("bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200", checked ? "translate-x-4" : "translate-x-0")} />
            </button>
        </div>
    );
}

function CalloutWrapper({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm flex gap-3">
            <div className="shrink-0 pt-0.5">{icon}</div>
            <div className="space-y-1">
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">{title}</h4>
                <p className="text-xs font-bold leading-relaxed text-zinc-800 dark:text-zinc-200">{children}</p>
            </div>
        </div>
    );
}

// --- 🎨 Light / Dark 모드 정밀 튜닝 슬라이더 및 입력 컴포넌트 생태계 ---

interface PercentRateSliderProps {
    label: string;
    tooltip?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    accentColor?: "blue" | "rose";
    showQuickButtons?: boolean;
}

function PercentRateSlider({
    label,
    tooltip,
    value,
    min,
    max,
    step = 0.1,
    onChange,
    accentColor = "blue",
    showQuickButtons = false
}: PercentRateSliderProps) {
    const textColors = {
        blue: "text-blue-600 dark:text-blue-400",
        rose: "text-rose-600 dark:text-rose-400"
    };

    const accentColors = {
        blue: "accent-blue-600 dark:accent-blue-500",
        rose: "accent-rose-600 dark:accent-rose-500"
    };

    const quickRates = [
        { label: "시중 예금", rate: 4 },
        { label: "올웨더 자산배분", rate: 6 },
        { label: "S&P500 지수", rate: 8 },
        { label: "나스닥 지수", rate: 12 }
    ];

    return (
        <InputGroup label={label} tooltip={tooltip} value={`${value}%`} color={textColors[accentColor]}>
            <div className="space-y-3">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={cn("w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer", accentColors[accentColor])}
                />
                {showQuickButtons && (
                    <div className="flex flex-wrap gap-2">
                        {quickRates.map(qr => (
                            <button
                                key={qr.label}
                                onClick={() => onChange(qr.rate)}
                                className="text-[10px] font-bold px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
                            >
                                {qr.label} ({qr.rate}%)
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </InputGroup>
    );
}

function AgeInputSlider({
    label,
    tooltip,
    value,
    min,
    max,
    onChange
}: {
    label: string;
    tooltip: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void
}) {
    return (
        <InputGroup label={label} tooltip={tooltip} value={`${value}세`}>
            <div className="flex gap-4 items-center">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="flex-1 accent-zinc-800 dark:accent-zinc-200 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
                <StepButtons value={value} step={1} min={min} max={max} onChange={onChange} />
            </div>
        </InputGroup>
    );
}
