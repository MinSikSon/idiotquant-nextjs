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
    ChartBarIcon,
    ArrowPathIcon,
    Bars3Icon,
    ChevronUpIcon,
    ChevronDownIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import ResultChart from "./ResultChart";

function cn(...inputs: (string | boolean | undefined | null)[]) {
    return inputs.filter(Boolean).join(" ");
}

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

const DEFAULT_INPUTS: CalcInputs = {
    startAge: 30,
    retirementAge: 60,
    targetAge: 90,
    investmentAmount: 10000,
    interestRate: 10,
    contributions: 250,
    contributionGrowthRate: 4.0,
    monthlyExpense: 300,
    expenseGrowthRate: 2.5,
    taxRate: 15.4,
    applyTax: true,
    realValueMode: false,
    applyIsaIsaGold: false,
    applyInsurancePremium: false,
    applyNationalPension: false,
};

const LOCAL_STORAGE_KEY = "asset_lifetime_calc_inputs";
const LAYOUT_STORAGE_KEY = "asset_lifetime_layout_order_v1";

const DEFAULT_LEFT_LAYOUT = ["core-investment", "life-cycle", "incremental-flows"];
const DEFAULT_RIGHT_LAYOUT = ["summary-card", "callout-tips", "chart-view", "table-report"];

const areInputsEqual = (a: CalcInputs, b: CalcInputs) => {
    return (Object.keys(DEFAULT_INPUTS) as (keyof CalcInputs)[]).every((key) => a[key] === b[key]);
};

const parseInputsFromParamsOrStorage = (params: Pick<URLSearchParams, "get">): CalcInputs => {
    let isUrlEmpty = true;
    for (const key of Object.keys(DEFAULT_INPUTS)) {
        if (params.get(key) !== null) {
            isUrlEmpty = false;
            break;
        }
    }

    let baseInputs = DEFAULT_INPUTS;
    if (isUrlEmpty && typeof window !== "undefined") {
        try {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (saved) {
                const parsedSaved = JSON.parse(saved);
                baseInputs = { ...DEFAULT_INPUTS, ...parsedSaved };
            }
        } catch (e) {
            console.error("Failed to parse fallback inputs from localStorage", e);
        }
    }

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
        startAge: parseNum("startAge", baseInputs.startAge),
        retirementAge: parseNum("retirementAge", baseInputs.retirementAge),
        targetAge: parseNum("targetAge", baseInputs.targetAge),
        investmentAmount: parseNum("investmentAmount", baseInputs.investmentAmount),
        interestRate: parseNum("interestRate", baseInputs.interestRate),
        contributions: parseNum("contributions", baseInputs.contributions),
        contributionGrowthRate: parseNum("contributionGrowthRate", baseInputs.contributionGrowthRate),
        monthlyExpense: parseNum("monthlyExpense", baseInputs.monthlyExpense),
        expenseGrowthRate: parseNum("expenseGrowthRate", baseInputs.expenseGrowthRate),
        taxRate: parseNum("taxRate", baseInputs.taxRate),
        applyTax: parseBool("applyTax", baseInputs.applyTax),
        realValueMode: parseBool("realValueMode", baseInputs.realValueMode),
        applyIsaIsaGold: parseBool("applyIsaIsaGold", baseInputs.applyIsaIsaGold),
        applyInsurancePremium: parseBool("applyInsurancePremium", baseInputs.applyInsurancePremium),
        applyNationalPension: parseBool("applyNationalPension", baseInputs.applyNationalPension),
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
            <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] flex flex-col gap-3 items-center justify-center text-neutral-500 dark:text-neutral-400 font-sans text-sm font-medium">
                <div className="w-6 h-6 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
                <span>시뮬레이터 데이터를 로드하고 있습니다...</span>
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

    const [leftOrder, setLeftOrder] = useState<string[]>(DEFAULT_LEFT_LAYOUT);
    const [rightOrder, setRightOrder] = useState<string[]>(DEFAULT_RIGHT_LAYOUT);
    const [isReorderEnabled, setIsReorderEnabled] = useState(false);

    // 현재 실제 사용자가 드래그 액션을 수행하고 있는 활성 패널 ID 상태관리
    const [activeDraggingId, setActiveDraggingId] = useState<string | null>(null);

    // 각 패널 아이템의 고유 드래그 컨트롤러 인스턴스
    const dragControlsCoreInvestment = useDragControls();
    const dragControlsLifeCycle = useDragControls();
    const dragControlsIncrementalFlows = useDragControls();
    const dragControlsSummaryCard = useDragControls();
    const dragControlsCalloutTips = useDragControls();
    const dragControlsChartView = useDragControls();
    const dragControlsTableReport = useDragControls();

    useEffect(() => {
        if (didParseInitialUrlRef.current) return;
        didParseInitialUrlRef.current = true;

        const parsedInputs = parseInputsFromParamsOrStorage(new URLSearchParams(window.location.search));
        latestInputsRef.current = parsedInputs;
        setInputs((previousInputs) => areInputsEqual(previousInputs, parsedInputs) ? previousInputs : parsedInputs);

        if (typeof window !== "undefined") {
            try {
                const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
                if (savedLayout) {
                    const { left, right } = JSON.parse(savedLayout);
                    if (Array.isArray(left) && left.length === DEFAULT_LEFT_LAYOUT.length) setLeftOrder(left);
                    if (Array.isArray(right) && right.length === DEFAULT_RIGHT_LAYOUT.length) setRightOrder(right);
                }
            } catch (e) {
                console.error("Failed to parse layout from localStorage", e);
            }
        }
    }, []);

    useEffect(() => {
        latestInputsRef.current = inputs;
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(inputs));
            } catch (e) {
                console.error("Failed to save inputs to localStorage", e);
            }
        }
    }, [inputs]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({ left: leftOrder, right: rightOrder }));
            } catch (e) {
                console.error("Failed to save layout order to localStorage", e);
            }
        }
    }, [leftOrder, rightOrder]);

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

    const resetLayout = () => {
        setLeftOrder(DEFAULT_LEFT_LAYOUT);
        setRightOrder(DEFAULT_RIGHT_LAYOUT);
    };

    const proficiency = useMemo(() => {
        let score = 0;
        const reasons: string[] = [];

        if (inputs.realValueMode) {
            score += 25;
            reasons.push("물가상승(실질가치) 완벽 연동 (+25)");
        }
        if (inputs.applyInsurancePremium) {
            score += 20;
            reasons.push("은퇴 후 건보료 지역가입 페널티 대비 (+20)");
        }
        if (inputs.applyIsaIsaGold) {
            score += 15;
            reasons.push("고율 과세 방어 및 절세 계좌 전략 적용 (+15)");
        }
        if (inputs.applyTax) {
            score += 10;
            reasons.push("배당/이자소득세 과세 복리 차감 (+10)");
        }
        if (inputs.applyNationalPension) {
            score += 10;
            reasons.push("국민연금 수령 스케줄 포트폴리오 연동 (+10)");
        }
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
        let color = "text-neutral-700 bg-[#faf9f7] border-neutral-200 dark:text-neutral-300 dark:bg-[#242320]/80 dark:border-[#3a3834]";
        let iconColor = "text-neutral-500 dark:text-neutral-400";
        let desc = "기본적인 수익률만 계산하는 단계입니다. 실전처럼 물가상승이나 건보료, 절세 옵션을 켜서 정밀도를 높여보세요.";

        if (clamped >= 85) {
            level = 4;
            label = "퀀트 마스터";
            color = "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-950/40 dark:border-purple-900/60";
            iconColor = "text-purple-500 dark:text-purple-400";
            desc = "세금, 건보료, 인플레이션, 절세 헷지 수단까지 철저히 통제하여 오차 없는 실전 퀀트 투자 환경을 구현해 냈습니다.";
        } else if (clamped >= 60) {
            level = 3;
            label = "전략가";
            color = "text-[#15803d] bg-[#f0fdf4] border-[#bbf7d0] dark:text-[#86efac] dark:bg-[#052e16]/40 dark:border-[#14532d]/60";
            iconColor = "text-[#f0fdf4]0 dark:text-[#16a34a]";
            desc = "명목 화폐의 함정을 벗어나 실질 가치(구매력)와 은퇴 후 숨은 마찰 비용을 심도 있게 계산하는 기획자입니다.";
        } else if (clamped >= 30) {
            level = 2;
            label = "탐험가";
            color = "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/60";
            iconColor = "text-emerald-500 dark:text-emerald-400";
            desc = "단순 복리를 넘어, 세금 및 물가 상승 등 자본주의의 기초적인 마찰 비용을 시뮬레이션을 반영하기 시작했습니다.";
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

        const initialAnnualContrib = workingMonths > 0 ? monthlyIncome * 12 : 0;
        const initialAnnualExpense = workingMonths === 0 ? monthlyOutgo * 12 : 0;

        // [수정] snapshots 배열에 들어갈 객체 타입을 명시하거나 에러를 방지하기 위해 any[] 타입 지정을 해줍니다.
        const snapshots: any[] = [{
            year: startAge,
            totalValue: Math.round(currentBalance),
            profitRate: 0,
            annualContribution: initialAnnualContrib,
            annualExpense: initialAnnualExpense,
            // 초기 0년차 상태 기본값 추가
            isWorking: workingMonths > 0,
            hasTaxApplied: applyTax,
            hasIsaGoldApplied: applyIsaIsaGold,
            hasInsurancePremium: false,
            hasNationalPension: startAge >= 65 && applyNationalPension,
        }];

        const inflationRateAnnual = 2.5;

        let accumulatedContribThisYear = 0;
        let accumulatedExpenseThisYear = 0;

        for (let m = 1; m <= totalMonths; m++) {
            const currentAge = startAge + Math.floor(m / 12);

            if (currentBalance > 0) {
                let activeTaxRate = taxRate;
                if (applyIsaIsaGold) activeTaxRate = 22.0;

                let profit = currentBalance * (interestRate / 100 / 12);
                if (applyTax && profit > 0) profit *= (1 - activeTaxRate / 100);
                currentBalance += profit;
            }

            // workingMonths 이하일 때가 은퇴 전(저축 가동기)입니다.
            const checkWorking = m <= workingMonths;

            if (checkWorking) {
                currentBalance += monthlyIncome;
                totalInvested += monthlyIncome;
                accumulatedContribThisYear += monthlyIncome;
            }

            let actualMonthlyOutgo = monthlyOutgo;
            if (!checkWorking && applyInsurancePremium) actualMonthlyOutgo += (monthlyOutgo * 0.08);

            if (currentAge >= 65 && applyNationalPension) currentBalance += 120;

            currentBalance -= actualMonthlyOutgo;
            accumulatedExpenseThisYear += actualMonthlyOutgo;

            if (m % 12 === 0) {
                const elapsedYears = m / 12;
                let displayBalance = currentBalance;
                let displayContrib = accumulatedContribThisYear;
                let displayExpense = accumulatedExpenseThisYear;

                if (realValueMode) {
                    const discountFactor = Math.pow(1 + inflationRateAnnual / 100, elapsedYears);
                    displayBalance = currentBalance / discountFactor;
                    displayContrib = accumulatedContribThisYear / discountFactor;
                    displayExpense = accumulatedExpenseThisYear / discountFactor;
                }

                // 여기에 정확히 상태값들을 매칭하여 push합니다.
                snapshots.push({
                    year: startAge + elapsedYears,
                    totalValue: Math.round(displayBalance),
                    profitRate: totalInvested > 0 ? Number(((currentBalance / totalInvested - 1) * 100).toFixed(1)) : 0,
                    annualContribution: Math.round(displayContrib),
                    annualExpense: Math.round(displayExpense),
                    // [해결] 현재 루프의 개월수(m) 기준으로 저축기/은퇴기 여부를 정확히 주입
                    isWorking: checkWorking,
                    hasTaxApplied: applyTax,
                    hasIsaGoldApplied: applyIsaIsaGold,
                    hasInsurancePremium: !checkWorking && applyInsurancePremium,
                    hasNationalPension: (startAge + elapsedYears) >= 65 && applyNationalPension,
                });

                if (checkWorking) monthlyIncome *= (1 + contributionGrowthRate / 100);
                monthlyOutgo *= (1 + expenseGrowthRate / 100);

                accumulatedContribThisYear = 0;
                accumulatedExpenseThisYear = 0;
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
        <div className="bg-[#faf9f7] dark:bg-[#1a1915] min-h-screen p-3 sm:p-6 md:p-10 pb-24 md:pb-10 font-sans text-neutral-900 dark:text-neutral-50 selection:bg-[#16a34a]/20">
            <div className="max-w-6xl mx-auto space-y-5 sm:space-y-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-[#35332e] pb-4 sm:pb-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-2.5 bg-[#16a34a] rounded-xl sm:rounded-2xl text-white shadow-lg shadow-[#16a34a]/20 shrink-0">
                            <CalculatorIcon className="w-5 h-5 sm:w-6" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">내 자산 수명 진단기</h1>
                                <div className="relative group flex items-center">
                                    <div className={cn("px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black border flex items-center gap-1 transition-colors duration-300 cursor-help", proficiency.color)}>
                                        <span>Lv.{proficiency.level} {proficiency.label}</span>
                                    </div>
                                    <div className="absolute top-full left-0 mt-2 hidden group-hover:block w-72 p-4 bg-neutral-950 text-white dark:bg-white dark:text-neutral-900 text-xs font-medium rounded-xl shadow-2xl border border-neutral-800 dark:border-neutral-200 z-50 leading-relaxed">
                                        <div className="mb-3 pb-3 border-b border-neutral-800 dark:border-neutral-200">
                                            <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest mb-2">
                                                숙련도 {proficiency.score}점 판정 이유
                                            </span>
                                            {proficiency.reasons.length > 0 ? (
                                                <ul className="list-disc pl-4 space-y-1.5 text-neutral-300 dark:text-neutral-600 font-semibold">
                                                    {proficiency.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                                </ul>
                                            ) : (
                                                <span className="text-neutral-500">적용된 고급 방어/헷지 전략이 없습니다.</span>
                                            )}
                                        </div>
                                        <p className="text-neutral-300 dark:text-neutral-700 font-semibold">{proficiency.desc}</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[11px] sm:text-sm text-neutral-600 dark:text-neutral-400 font-semibold mt-0.5 sm:mt-1">세금, 건보료, 연금까지 반영한 100세 시대 맞춤형 복리 시뮬레이터</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 w-full sm:flex sm:w-auto sm:items-center sm:justify-end">
                        <button
                            onClick={() => setIsReorderEnabled(!isReorderEnabled)}
                            className={cn(
                                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2 py-2 sm:px-3 rounded-lg font-bold text-[10px] sm:text-[11px] transition-all border shadow-xs text-center leading-tight sm:leading-none",
                                isReorderEnabled
                                    ? "bg-[#16a34a] border-[#16a34a] text-white"
                                    : "bg-white dark:bg-[#242320] border-neutral-300 dark:border-[#3a3834] text-neutral-900 dark:text-neutral-50"
                            )}
                        >
                            <Bars3Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{isReorderEnabled ? "순서 ON" : "순서 OFF"}</span>
                        </button>

                        <button
                            onClick={resetLayout}
                            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1 px-2 py-2 sm:px-3 rounded-lg font-bold text-[10px] sm:text-[11px] bg-[#faf9f7] dark:bg-[#242320] hover:bg-neutral-200 dark:hover:bg-[#242320] text-neutral-700 dark:text-neutral-300 transition-colors border border-neutral-200 dark:border-[#3a3834]/60 shadow-xs text-center leading-tight sm:leading-none"
                        >
                            <ArrowPathIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>위치 초기화</span>
                        </button>

                        <button
                            onClick={handleShareLink}
                            className={cn(
                                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2 py-2 sm:px-3 rounded-lg font-bold text-[10px] sm:text-[11px] transition-all shadow-xs border shrink-0 text-center leading-tight sm:leading-none",
                                copied
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "bg-white dark:bg-[#242320] border-neutral-300 dark:border-[#3a3834] text-neutral-900 dark:text-neutral-50 hover:bg-[#f5f0e8] dark:hover:bg-[#242320]"
                            )}
                        >
                            {copied ? <CheckIcon className="w-3.5 h-3.5 shrink-0" /> : <ShareIcon className="w-3.5 h-3.5 shrink-0" />}
                            <span>{copied ? "복사 완료!" : "리포트 공유"}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
                    {/* 왼쪽 열: 입력 컨트롤러 */}
                    <Reorder.Group axis="y" values={leftOrder} onReorder={setLeftOrder} className="lg:col-span-5 space-y-4 sm:space-y-5 outline-none">
                        {leftOrder.map((panelId) => {
                            if (panelId === "core-investment") {
                                return (
                                    <Reorder.Item
                                        key="core-investment"
                                        value="core-investment"
                                        dragListener={false}
                                        dragControls={dragControlsCoreInvestment}
                                        whileDrag={{ scale: 1.015 }}
                                        onDragStart={() => setActiveDraggingId("core-investment")}
                                        onDragEnd={() => setActiveDraggingId(null)}
                                        className="bg-transparent select-none outline-none relative group/item rounded-2xl"
                                    >
                                        <DragIndicatorOverlay desktopType="입력 섹션 내 상하 이동" isEnabled={isReorderEnabled && activeDraggingId === "core-investment"} />
                                        <SectionWrapper title="핵심 자산 및 기대 수익률" icon={<ArrowTrendingUpIcon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />}>
                                            <div className="space-y-4 sm:space-y-6 bg-white dark:bg-[#242320] p-3.5 xs:p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-neutral-200 dark:border-[#35332e] shadow-xs relative group/card border-t-4 group-active/item:border-[#f0fdf4]0 group-active/item:ring-4 group-active/item:ring-[#16a34a]/20 dark:group-active/item:ring-[#f0fdf4]0/10 transition-all duration-200">

                                                {/* 모바일 터치 피드백을 위한 touch-action: none 및 넉넉한 터치 패딩 공간 확보 */}
                                                <div className="absolute right-3 top-3 w-24 h-8 flex items-center justify-end z-30">
                                                    <div
                                                        onPointerDown={(e) => {
                                                            if (isReorderEnabled) {
                                                                e.preventDefault();
                                                                dragControlsCoreInvestment.start(e);
                                                            }
                                                        }}
                                                        style={{ touchAction: "none" }}
                                                        className={cn(
                                                            "px-2 py-1.5 rounded text-[10px] font-black select-none flex items-center gap-1 border transition-all",
                                                            isReorderEnabled
                                                                ? "cursor-grab active:cursor-grabbing bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a] dark:text-[#16a34a] border-[#bbf7d0] dark:border-[#166534]/80 shadow-xs"
                                                                : "opacity-25 bg-[#faf9f7] dark:bg-[#242320] text-neutral-400 border-transparent cursor-not-allowed"
                                                        )}
                                                    >
                                                        <Bars3Icon className="w-3.5 h-3.5" />
                                                        <span>순서 교체</span>
                                                    </div>
                                                </div>

                                                <div className="pt-6">
                                                    <InputGroup label="초기 투자 시드" tooltip="현재 투입 가능한 순수 자산 및 투자 예치금 총액입니다." value={formatKrw(inputs.investmentAmount)} color="text-[#16a34a] dark:text-[#16a34a]">
                                                        <div className="flex gap-2">
                                                            <div className="relative flex-1">
                                                                <input type="number" inputMode="numeric" pattern="[0-9]*" value={inputs.investmentAmount} onChange={(e) => updateInput("investmentAmount", Number(e.target.value))} className="w-full bg-[#faf9f7] dark:bg-[#242320] border border-neutral-300 dark:border-[#3a3834] rounded-xl pl-3 pr-10 py-2 sm:py-2.5 font-black text-xs sm:text-sm text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-[#f0fdf4]0 outline-none transition-shadow" />
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 text-[11px] sm:text-xs font-bold">만원</div>
                                                            </div>
                                                            <StepButtons value={inputs.investmentAmount} step={500} min={0} max={100000000} onChange={(v) => updateInput("investmentAmount", v)} />
                                                        </div>
                                                    </InputGroup>
                                                </div>

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

                                                <div className="p-3 sm:p-4 bg-[#faf9f7] dark:bg-[#242320]/30 rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-[#35332e] space-y-2 sm:space-y-3">
                                                    <span className="text-[11px] sm:text-xs font-black text-neutral-800 dark:text-neutral-200 block px-1">과세 및 헷지 변수</span>
                                                    <div className="flex flex-col gap-0.5">
                                                        <ToggleButton checked={inputs.applyTax} onChange={(v) => updateInput("applyTax", v)} label="이자소득세 과세 (15.4%)" tooltip="매년 투자 수익에 배당소득세를 차감한 세후 복리를 계산합니다." />
                                                        <ToggleButton checked={inputs.realValueMode} onChange={(v) => updateInput("realValueMode", v)} label="물가상승 반영 (실질가치)" tooltip="연 2.5% 인플레이션을 반영하여 미래 금액을 현재 가치로 조정합니다." />
                                                    </div>
                                                </div>

                                                <div className="p-3 sm:p-4 bg-[#f0fdf4]/30 dark:bg-[#052e16]/10 rounded-xl sm:rounded-2xl border border-[#dcfce7] dark:border-[#14532d]/30 space-y-2 sm:space-y-3">
                                                    <span className="text-[11px] sm:text-xs font-black text-[#15803d] dark:text-[#16a34a] block px-1 flex items-center gap-1.5"><ShieldCheckIcon className="w-3.5 h-3.5 shrink-0" /> 실전 정밀 검증 패널티 & 혜택</span>
                                                    <div className="flex flex-col gap-0.5">
                                                        <ToggleButton checked={inputs.applyIsaIsaGold} onChange={(v) => updateInput("applyIsaIsaGold", v)} label="금융투자소득세 고율 가산 (22%)" tooltip="거액 자산가 구간 진입 시 고율 과세 세율을 선제 적용합니다." />
                                                        <ToggleButton checked={inputs.applyInsurancePremium} onChange={(v) => updateInput("applyInsurancePremium", v)} label="은퇴 후 건보료 지역가입 (지출 +8%)" tooltip="직장 은퇴 후 지역가입 전환에 따른 피부양자 탈락 및 지출 가산을 시뮬레이션합니다." />
                                                        <ToggleButton checked={inputs.applyNationalPension} onChange={(v) => updateInput("applyNationalPension", v)} label="만 65세 국민연금 수령 (월 +120만)" tooltip="연금 수령 나이 도달 시 매달 실질 가치 기준의 안정 자금이 계좌에 주입됩니다." />
                                                    </div>
                                                </div>
                                            </div>
                                        </SectionWrapper>
                                    </Reorder.Item>
                                );
                            }
                            if (panelId === "life-cycle") {
                                return (
                                    <Reorder.Item
                                        key="life-cycle"
                                        value="life-cycle"
                                        dragListener={false}
                                        dragControls={dragControlsLifeCycle}
                                        whileDrag={{ scale: 1.015 }}
                                        onDragStart={() => setActiveDraggingId("life-cycle")}
                                        onDragEnd={() => setActiveDraggingId(null)}
                                        className="bg-transparent select-none outline-none relative group/item rounded-2xl"
                                    >
                                        <DragIndicatorOverlay desktopType="입력 섹션 내 상하 이동" isEnabled={isReorderEnabled && activeDraggingId === "life-cycle"} />
                                        <SectionWrapper title="생애 주기 임계값" icon={<UserIcon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />}>
                                            <div className="space-y-4 sm:space-y-5 bg-white dark:bg-[#242320] p-3.5 xs:p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-neutral-200 dark:border-[#35332e] shadow-xs relative group/card border-t-4 group-active/item:border-[#f0fdf4]0 group-active/item:ring-4 group-active/item:ring-[#16a34a]/20 dark:group-active/item:ring-[#f0fdf4]0/10 transition-all duration-200">

                                                <div className="absolute right-3 top-3 w-24 h-8 flex items-center justify-end z-30">
                                                    <div
                                                        onPointerDown={(e) => {
                                                            if (isReorderEnabled) {
                                                                e.preventDefault();
                                                                dragControlsLifeCycle.start(e);
                                                            }
                                                        }}
                                                        style={{ touchAction: "none" }}
                                                        className={cn(
                                                            "px-2 py-1.5 rounded text-[10px] font-black select-none flex items-center gap-1 border transition-all",
                                                            isReorderEnabled
                                                                ? "cursor-grab active:cursor-grabbing bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a] dark:text-[#16a34a] border-[#bbf7d0] dark:border-[#166534]/80 shadow-xs"
                                                                : "opacity-25 bg-[#faf9f7] dark:bg-[#242320] text-neutral-400 border-transparent cursor-not-allowed"
                                                        )}
                                                    >
                                                        <Bars3Icon className="w-3.5 h-3.5" />
                                                        <span>순서 교체</span>
                                                    </div>
                                                </div>

                                                <div className="pt-6">
                                                    <AgeInputSlider label="시작 연령" tooltip="이 시뮬레이션을 가동하는 현재 내 나이입니다." value={inputs.startAge} min={20} max={80} onChange={(v) => updateInput("startAge", v)} />
                                                </div>
                                                <AgeInputSlider label="은퇴 및 저축 중단 연령" tooltip="본업을 중단하고 원금 투입 없이 복리 증식과 생활비 인출만 일어나는 시점입니다." value={inputs.retirementAge} min={inputs.startAge} max={90} onChange={(v) => updateInput("retirementAge", v)} />
                                                <AgeInputSlider label="자산 수명 검증 종료 연령" tooltip="내 자산이 고갈되지 않고 버텨주기를 바라는 최종 목표 나이입니다." value={inputs.targetAge} min={inputs.retirementAge} max={100} onChange={(v) => updateInput("targetAge", v)} />
                                            </div>
                                        </SectionWrapper>
                                    </Reorder.Item>
                                );
                            }
                            if (panelId === "incremental-flows") {
                                return (
                                    <Reorder.Item
                                        key="incremental-flows"
                                        value="incremental-flows"
                                        dragListener={false}
                                        dragControls={dragControlsIncrementalFlows}
                                        whileDrag={{ scale: 1.015 }}
                                        onDragStart={() => setActiveDraggingId("incremental-flows")}
                                        onDragEnd={() => setActiveDraggingId(null)}
                                        className="bg-transparent select-none outline-none relative group/item rounded-2xl"
                                    >
                                        <DragIndicatorOverlay desktopType="입력 섹션 내 상하 이동" isEnabled={isReorderEnabled && activeDraggingId === "incremental-flows"} />
                                        <SectionWrapper title="점증형 현금 가감 데이터" icon={<ArrowsRightLeftIcon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />}>
                                            <div className="space-y-4 sm:space-y-6 bg-white dark:bg-[#242320] p-3.5 xs:p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-neutral-200 dark:border-[#35332e] shadow-xs relative group/card border-t-4 group-active/item:border-[#f0fdf4]0 group-active/item:ring-4 group-active/item:ring-[#16a34a]/20 dark:group-active/item:ring-[#f0fdf4]0/10 transition-all duration-200">

                                                <div className="absolute right-3 top-3 w-24 h-8 flex items-center justify-end z-30">
                                                    <div
                                                        onPointerDown={(e) => {
                                                            if (isReorderEnabled) {
                                                                e.preventDefault();
                                                                dragControlsIncrementalFlows.start(e);
                                                            }
                                                        }}
                                                        style={{ touchAction: "none" }}
                                                        className={cn(
                                                            "px-2 py-1.5 rounded text-[10px] font-black select-none flex items-center gap-1 border transition-all",
                                                            isReorderEnabled
                                                                ? "cursor-grab active:cursor-grabbing bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a] dark:text-[#16a34a] border-[#bbf7d0] dark:border-[#166534]/80 shadow-xs"
                                                                : "opacity-25 bg-[#faf9f7] dark:bg-[#242320] text-neutral-400 border-transparent cursor-not-allowed"
                                                        )}
                                                    >
                                                        <Bars3Icon className="w-3.5 h-3.5" />
                                                        <span>순서 교체</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 sm:space-y-4 pt-6">
                                                    <InputGroup label="초기 매월 저축액" tooltip="은퇴 전 근로 기간 동안 매달 투자 계좌에 적립할 원금입니다." value={formatKrw(inputs.contributions)}>
                                                        <div className="flex gap-2">
                                                            <input type="number" inputMode="numeric" pattern="[0-9]*" value={inputs.contributions} onChange={(e) => updateInput("contributions", Number(e.target.value))} className="flex-1 bg-[#faf9f7] dark:bg-[#242320] border border-neutral-300 dark:border-[#3a3834] rounded-xl px-3 py-2 sm:py-2.5 font-black text-xs sm:text-sm text-neutral-900 dark:text-neutral-50 outline-none focus:ring-2 focus:ring-[#f0fdf4]0 transition-shadow" />
                                                            <StepButtons value={inputs.contributions} step={50} min={0} max={5000} onChange={(v) => updateInput("contributions", v)} />
                                                        </div>
                                                    </InputGroup>
                                                    <PercentRateSlider label="복리 저축 매년 증액률" tooltip="연봉 상승을 반영해 매년 월 적립액을 복리로 늘려나가는 엔진입니다." value={inputs.contributionGrowthRate} min={0} max={15} step={0.1} onChange={(v) => updateInput("contributionGrowthRate", v)} accentColor="blue" />
                                                </div>
                                                <div className="h-px bg-[#faf9f7] dark:bg-[#242320]" />
                                                <div className="space-y-3 sm:space-y-4">
                                                    <InputGroup label="기본 목표 초기 월 생활비" tooltip="은퇴 후 매달 삶을 유지하기 위해 인출하여 사용할 고정 비용입니다." value={formatKrw(inputs.monthlyExpense)} color="text-rose-600 dark:text-rose-400">
                                                        <div className="flex gap-2">
                                                            <input type="number" inputMode="numeric" pattern="[0-9]*" value={inputs.monthlyExpense} onChange={(e) => updateInput("monthlyExpense", Number(e.target.value))} className="flex-1 bg-[#faf9f7] dark:bg-[#242320] border border-neutral-300 dark:border-[#3a3834] rounded-xl px-3 py-2 sm:py-2.5 font-black text-xs sm:text-sm text-neutral-900 dark:text-neutral-50 outline-none focus:ring-2 focus:ring-rose-500 transition-shadow" />
                                                            <StepButtons value={inputs.monthlyExpense} step={50} min={0} max={5000} onChange={(v) => updateInput("monthlyExpense", v)} />
                                                        </div>
                                                    </InputGroup>
                                                    <PercentRateSlider label="매년 물가 연동 지출 상승률" tooltip="인플레이션에 의해 은퇴 후 생활비 지출이 매년 늘어나는 현상을 반영합니다." value={inputs.expenseGrowthRate} min={0} max={15} step={0.1} onChange={(v) => updateInput("expenseGrowthRate", v)} accentColor="rose" />
                                                </div>
                                            </div>
                                        </SectionWrapper>
                                    </Reorder.Item>
                                );
                            }
                            return null;
                        })}
                    </Reorder.Group>

                    {/* 오른쪽 열: 결과 차트 및 종합 리포트 */}
                    <Reorder.Group axis="y" values={rightOrder} onReorder={setRightOrder} className="lg:col-span-7 space-y-4 sm:space-y-5 outline-none">
                        {rightOrder.map((panelId) => {
                            if (panelId === "summary-card") {
                                return (
                                    <Reorder.Item
                                        key="summary-card"
                                        value="summary-card"
                                        dragListener={false}
                                        dragControls={dragControlsSummaryCard}
                                        whileDrag={{ scale: 1.015 }}
                                        onDragStart={() => setActiveDraggingId("summary-card")}
                                        onDragEnd={() => setActiveDraggingId(null)}
                                        className="bg-transparent select-none outline-none relative group/item rounded-2xl"
                                    >
                                        <DragIndicatorOverlay desktopType="리포트 섹션 내 상하 이동" isEnabled={isReorderEnabled && activeDraggingId === "summary-card"} />
                                        <div className={cn("p-4 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2.5rem] shadow-xl relative overflow-hidden transition-all duration-300 border bg-neutral-950 border-neutral-800 dark:bg-[#242320] dark:border-[#35332e]/80 text-white group/card border-t-4 group-active/item:border-[#f0fdf4]0 group-active/item:ring-4 group-active/item:ring-[#16a34a]/20 dark:group-active/item:ring-[#f0fdf4]0/10", results.finalValue < 0 && "border-rose-900/50 bg-gradient-to-br from-neutral-950 to-rose-950/30")}>

                                            <div className="absolute right-4 top-4 w-24 h-8 flex items-center justify-end z-30">
                                                <div
                                                    onPointerDown={(e) => {
                                                        if (isReorderEnabled) {
                                                            e.preventDefault();
                                                            dragControlsSummaryCard.start(e);
                                                        }
                                                    }}
                                                    style={{ touchAction: "none" }}
                                                    className={cn(
                                                        "px-2 py-1.5 rounded text-[10px] font-black select-none flex items-center gap-1 border transition-all text-neutral-300",
                                                        isReorderEnabled
                                                            ? "cursor-grab active:cursor-grabbing bg-neutral-900 border-neutral-700 text-[#16a34a] ring-1 ring-[#f0fdf4]0/30 shadow-xs"
                                                            : "opacity-25 bg-neutral-900/40 border-transparent cursor-not-allowed"
                                                    )}
                                                >
                                                    <Bars3Icon className="w-3.5 h-3.5" />
                                                    <span>순서 교체</span>
                                                </div>
                                            </div>

                                            <div className="relative z-10 space-y-4 sm:space-y-8 pt-6">
                                                <div className="space-y-2 sm:space-y-3">
                                                    <span className="inline-block text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] px-2.5 py-0.5 sm:py-1 rounded-full border bg-neutral-900/80 text-neutral-300 border-neutral-800">
                                                        {inputs.targetAge}세 예상 시점 잔고 {inputs.realValueMode && "(실질 가치 수렴)"}
                                                    </span>
                                                    <h2 className="text-xl sm:text-4xl md:text-5xl font-black tracking-tighter text-[#16a34a] dark:text-[#16a34a] font-mono">
                                                        {formatKrw(results.finalValue)}
                                                    </h2>

                                                    <AnimatePresence mode="wait">
                                                        {results.finalValue < 0 && (
                                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 text-rose-400 text-[11px] sm:text-xs font-semibold bg-rose-500/10 p-2.5 sm:p-3.5 rounded-xl border border-rose-500/20 leading-relaxed">
                                                                <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                                <span>경고: 자산 고갈 리스크가 있습니다. 전략 수정이 시급합니다.</span>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                    <div className="bg-neutral-900/60 p-3 sm:p-4 rounded-xl border border-neutral-800/80">
                                                        <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5 sm:mb-1">총 누적 투입 원금</span>
                                                        <div className="text-xs sm:text-base font-black text-white">{formatKrw(results.totalInvestment)}</div>
                                                    </div>
                                                    <div className="bg-neutral-900/60 p-3 sm:p-4 rounded-xl border border-neutral-800/80 text-right">
                                                        <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5 sm:mb-1">최종 레버리지 배율</span>
                                                        <div className={cn("text-sm sm:text-xl font-black font-mono", results.finalValue >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                            {results.totalInvestment > 0 ? (results.finalValue / results.totalInvestment).toFixed(1) : 0} 배
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={cn("absolute -right-24 -top-24 w-80 h-80 rounded-full blur-[120px] opacity-15 transition-colors duration-500", results.finalValue >= 0 ? "bg-[#16a34a]" : "bg-rose-600")} />
                                        </div>
                                    </Reorder.Item>
                                );
                            }
                            if (panelId === "callout-tips") {
                                return (
                                    <Reorder.Item
                                        key="callout-tips"
                                        value="callout-tips"
                                        dragListener={false}
                                        dragControls={dragControlsCalloutTips}
                                        whileDrag={{ scale: 1.015 }}
                                        onDragStart={() => setActiveDraggingId("callout-tips")}
                                        onDragEnd={() => setActiveDraggingId(null)}
                                        className="bg-transparent select-none outline-none relative group/item rounded-2xl"
                                    >
                                        <DragIndicatorOverlay desktopType="리포트 섹션 내 상하 이동" isEnabled={isReorderEnabled && activeDraggingId === "callout-tips"} />
                                        <div className="relative group/card border-t-4 border-transparent group-active/item:border-[#f0fdf4]0 group-active/item:ring-4 group-active/item:ring-[#16a34a]/20 dark:group-active/item:ring-[#f0fdf4]0/10 transition-all duration-200 rounded-xl sm:rounded-[2rem] pt-2">

                                            <div className="absolute right-3 -top-2 w-24 h-8 flex items-center justify-end z-30">
                                                <div
                                                    onPointerDown={(e) => {
                                                        if (isReorderEnabled) {
                                                            e.preventDefault();
                                                            dragControlsCalloutTips.start(e);
                                                        }
                                                    }}
                                                    style={{ touchAction: "none" }}
                                                    className={cn(
                                                        "px-2 py-1.5 rounded text-[10px] font-black select-none flex items-center gap-1 border transition-all",
                                                        isReorderEnabled
                                                            ? "cursor-grab active:cursor-grabbing bg-white dark:bg-[#242320] text-[#16a34a] dark:text-[#16a34a] border-neutral-200 dark:border-[#35332e] shadow-xs ring-1 ring-[#f0fdf4]0/30"
                                                            : "opacity-0 pointer-events-none"
                                                    )}
                                                >
                                                    <Bars3Icon className="w-3.5 h-3.5" />
                                                    <span>순서 교체</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4">
                                                <CalloutWrapper icon={<ChartBarIcon className={cn("w-4 h-4 sm:w-5 sm:h-5", proficiency.iconColor)} />} title={`Lv.${proficiency.level} ${proficiency.label} (${proficiency.score}점)`}>
                                                    {proficiency.desc}
                                                </CalloutWrapper>
                                                <CalloutWrapper icon={<LightBulbIcon className={cn("w-4 h-4 sm:w-5 sm:h-5", results.finalValue > 0 ? "text-emerald-500" : "text-rose-500")} />} title="퀀트 자산 수명 진단">
                                                    {results.finalValue > 0 ? "안정적인 노후 자산 스노우볼이 유지되는 중입니다." : "자산 조기 고갈 리스크가 감지되었습니다."}
                                                </CalloutWrapper>
                                            </div>
                                        </div>
                                    </Reorder.Item>
                                );
                            }
                            if (panelId === "chart-view") {
                                return (
                                    <Reorder.Item
                                        key="chart-view"
                                        value="chart-view"
                                        dragListener={false}
                                        dragControls={dragControlsChartView}
                                        whileDrag={{ scale: 1.015 }}
                                        onDragStart={() => setActiveDraggingId("chart-view")}
                                        onDragEnd={() => setActiveDraggingId(null)}
                                        className="bg-transparent select-none outline-none relative group/item rounded-2xl"
                                    >
                                        <DragIndicatorOverlay desktopType="리포트 섹션 내 상하 이동" isEnabled={isReorderEnabled && activeDraggingId === "chart-view"} />
                                        <div className="bg-white dark:bg-[#242320] p-3.5 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2.5rem] border border-neutral-200 dark:border-[#35332e] shadow-xs relative group/card border-t-4 group-active/item:border-[#f0fdf4]0 group-active/item:ring-4 group-active/item:ring-[#16a34a]/20 dark:group-active/item:ring-[#f0fdf4]0/10 transition-all duration-200">

                                            <div className="absolute right-3 top-3 w-24 h-8 flex items-center justify-end z-30">
                                                <div
                                                    onPointerDown={(e) => {
                                                        if (isReorderEnabled) {
                                                            e.preventDefault();
                                                            dragControlsChartView.start(e);
                                                        }
                                                    }}
                                                    style={{ touchAction: "none" }}
                                                    className={cn(
                                                        "px-2 py-1.5 rounded text-[10px] font-black select-none flex items-center gap-1 border transition-all",
                                                        isReorderEnabled
                                                            ? "cursor-grab active:cursor-grabbing bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a] dark:text-[#16a34a] border-[#bbf7d0] dark:border-[#166534]/80 shadow-xs"
                                                            : "opacity-25 bg-[#faf9f7] dark:bg-[#242320] text-neutral-400 border-transparent cursor-not-allowed"
                                                    )}
                                                >
                                                    <Bars3Icon className="w-3.5 h-3.5" />
                                                    <span>순서 교체</span>
                                                </div>
                                            </div>

                                            <div className="mb-3 sm:mb-6 pt-6">
                                                <h3 className="text-sm sm:text-lg font-black tracking-tight text-neutral-900 dark:text-neutral-50">지표 연동형 자산 변동 그래프</h3>
                                                <p className="text-[11px] sm:text-sm text-neutral-500 dark:text-neutral-400 font-semibold mt-0.5">매년 가중되는 인플레이션 누적 및 세후 배당 유출입 복리 커브</p>
                                            </div>
                                            <div className="bg-[#faf9f7] dark:bg-black/20 rounded-xl overflow-hidden border border-neutral-200 dark:border-[#35332e]/80 p-1 sm:p-4">
                                                <ResultChart data={results.chartData} height="h-[260px] sm:h-[350px]" />
                                            </div>
                                        </div>
                                    </Reorder.Item>
                                );
                            }
                            if (panelId === "table-report") {
                                return (
                                    <Reorder.Item
                                        key="table-report"
                                        value="table-report"
                                        dragListener={false}
                                        dragControls={dragControlsTableReport}
                                        whileDrag={{ scale: 1.015 }}
                                        onDragStart={() => setActiveDraggingId("table-report")}
                                        onDragEnd={() => setActiveDraggingId(null)}
                                        className="bg-transparent select-none outline-none relative group/item rounded-2xl"
                                    >
                                        <DragIndicatorOverlay desktopType="리포트 섹션 내 상하 이동" isEnabled={isReorderEnabled && activeDraggingId === "table-report"} />
                                        <div className="bg-white dark:bg-[#242320] p-3.5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-neutral-200 dark:border-[#35332e] shadow-xs relative group/card border-t-4 group-active/item:border-[#f0fdf4]0 group-active/item:ring-4 group-active/item:ring-[#16a34a]/20 dark:group-active/item:ring-[#f0fdf4]0/10 transition-all duration-200">

                                            <div className="absolute right-3 top-3 w-24 h-8 flex items-center justify-end z-30">
                                                <div
                                                    onPointerDown={(e) => {
                                                        if (isReorderEnabled) {
                                                            e.preventDefault();
                                                            dragControlsTableReport.start(e);
                                                        }
                                                    }}
                                                    style={{ touchAction: "none" }}
                                                    className={cn(
                                                        "px-2 py-1.5 rounded text-[10px] font-black select-none flex items-center gap-1 border transition-all",
                                                        isReorderEnabled
                                                            ? "cursor-grab active:cursor-grabbing bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a] dark:text-[#16a34a] border-[#bbf7d0] dark:border-[#166534]/80 shadow-xs"
                                                            : "opacity-25 bg-[#faf9f7] dark:bg-[#242320] text-neutral-400 border-transparent cursor-not-allowed"
                                                    )}
                                                >
                                                    <Bars3Icon className="w-3.5 h-3.5" />
                                                    <span>순서 교체</span>
                                                </div>
                                            </div>

                                            <div className="mb-3 pt-6">
                                                <h3 className="text-sm sm:text-lg font-black tracking-tight text-neutral-900 dark:text-neutral-50">연도별 세부 현금 흐름 리포트</h3>
                                                <p className="text-[11px] sm:text-sm text-neutral-500 dark:text-neutral-400 font-semibold mt-0.5">
                                                    {inputs.realValueMode ? "인플레이션 차감 가치가 반영된 실질 가치 기준 흐름입니다." : "매년 가중 증액된 명목 화폐 기준 흐름입니다."}
                                                </p>
                                            </div>
                                            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-[#35332e] max-h-64 sm:max-h-80 overflow-y-auto">
                                                <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                                                    <thead className="bg-[#faf9f7] dark:bg-[#242320] sticky top-0 font-black text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-[#3a3834]">
                                                        <tr>
                                                            <th className="p-2 sm:p-3">나이</th>
                                                            <th className="p-2 sm:p-3 text-right">연간 저축</th>
                                                            <th className="p-2 sm:p-3 text-right">연간 생활비</th>
                                                            {/* [추가] 적용 옵션 확인 헤더 */}
                                                            <th className="p-2 sm:p-3 text-center">적용 옵션 상태</th>
                                                            <th className="p-2 sm:p-3 text-right">예상 잔고</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-neutral-100 dark:divide-[#35332e]/60 font-semibold text-neutral-800 dark:text-neutral-200 font-mono">
                                                        {results.chartData.map((row: any) => (
                                                            <tr key={row.year} className="hover:bg-[#f5f0e8]/50 dark:hover:bg-[#242320]/30 transition-colors">
                                                                <td className="p-2 sm:p-3 font-bold text-neutral-500">{row.year}세</td>
                                                                <td className="p-2 sm:p-3 text-right text-[#16a34a] dark:text-[#16a34a]">
                                                                    {row.annualContribution > 0 ? formatKrw(row.annualContribution) : "-"}
                                                                </td>
                                                                <td className="p-2 sm:p-3 text-right text-rose-600 dark:text-rose-400">
                                                                    {row.annualExpense > 0 ? formatKrw(row.annualExpense) : "-"}
                                                                </td>

                                                                {/* [추가] 각 연도별 어떤 마찰비용/프로그램이 작동 중인지 뱃지 표시 */}
                                                                <td className="p-2 sm:p-3 text-center">
                                                                    <div className="flex flex-wrap justify-center gap-1 max-w-[160px] mx-auto">
                                                                        {row.isWorking && (
                                                                            <span className="px-1.5 py-0.5 text-[9px] bg-[#f0fdf4] text-[#15803d] dark:bg-[#052e16]/40 dark:text-[#86efac] rounded font-bold">저축기</span>
                                                                        )}
                                                                        {!row.isWorking && (
                                                                            <span className="px-1.5 py-0.5 text-[9px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded font-bold">은퇴기</span>
                                                                        )}
                                                                        {row.hasTaxApplied && (
                                                                            <span className="px-1.5 py-0.5 text-[9px] bg-[#faf9f7] text-neutral-700 dark:bg-[#242320] dark:text-neutral-300 rounded">
                                                                                {row.hasIsaGoldApplied ? "금투세(22%)" : "일반과세"}
                                                                            </span>
                                                                        )}
                                                                        {row.hasInsurancePremium && (
                                                                            <span className="px-1.5 py-0.5 text-[9px] bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 rounded font-bold">건보료+</span>
                                                                        )}
                                                                        {row.hasNationalPension && (
                                                                            <span className="px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded font-bold">국민연금+</span>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                <td className={cn("p-2 sm:p-3 text-right font-bold", row.totalValue >= 0 ? "text-neutral-900 dark:text-neutral-50" : "text-rose-500")}>
                                                                    {formatKrw(row.totalValue)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </Reorder.Item>
                                );
                            }
                            return null;
                        })}
                    </Reorder.Group>
                </div>
            </div>
        </div>
    );
}

function DragIndicatorOverlay({ desktopType, isEnabled }: { desktopType: string; isEnabled: boolean }) {
    if (!isEnabled) return null;
    return (
        <div className="absolute inset-x-0 -top-5 bottom-full h-5 pointer-events-none flex flex-col items-center justify-center opacity-0 group-active/item:opacity-100 transition-opacity duration-150 z-50">
            <div className="w-full border-t-2 border-dashed border-[#f0fdf4]0/80 dark:border-[#16a34a]/80" />
            <div className="absolute bg-[#16a34a] text-white dark:bg-[#f0fdf4]0 text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-[#16a34a]/20 whitespace-nowrap border border-[#16a34a]/20">
                <ChevronUpIcon className="w-3 h-3 animate-bounce" />
                <span className="hidden lg:inline">{desktopType}</span>
                <span className="inline lg:hidden">전체 리스트 상하 순서 교체</span>
                <ChevronDownIcon className="w-3 h-3 animate-bounce" />
            </div>
        </div>
    );
}

function SectionWrapper({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <section className="space-y-2">
            <div className="flex items-center gap-1.5 px-1 text-neutral-400 dark:text-neutral-500">
                {icon}
                <h2 className="text-[10px] font-black uppercase tracking-[0.12em]">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function InputGroup({ label, value, tooltip, color = "text-neutral-900 dark:text-neutral-50", children }: any) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-end gap-2">
                <div className="flex items-center gap-1 group relative max-w-[50%] min-w-0">
                    <span className="text-[10px] sm:text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block truncate">{label}</span>
                    {tooltip && (
                        <>
                            <InformationCircleIcon className="w-3.5 h-3.5 text-neutral-400 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-500 cursor-help shrink-0 transition-colors" />
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-neutral-950 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold rounded-xl shadow-xl border border-neutral-800 dark:border-neutral-200 z-50 leading-relaxed">
                                {tooltip}
                            </div>
                        </>
                    )}
                </div>
                <span className={`text-xs sm:text-base font-black shrink-0 font-mono ${color} max-w-[50%] truncate text-right`}>{value}</span>
            </div>
            {children}
        </div>
    );
}

function StepButtons({ value, step, min, max, onChange }: { value: number; step: number; min: number; max: number; onChange: (v: number) => void }) {
    return (
        <div className="flex border border-neutral-300 dark:border-[#3a3834] rounded-xl overflow-hidden bg-white dark:bg-[#242320] shadow-xs shrink-0 h-8 sm:h-10 items-center">
            <button type="button" disabled={value <= min} onClick={() => onChange(Math.max(min, Number((value - step).toFixed(2))))} className="px-2.5 sm:px-3 h-full text-neutral-700 dark:text-neutral-300 hover:bg-[#f5f0e8] dark:hover:bg-[#242320] disabled:opacity-20 border-r border-neutral-300 dark:border-[#3a3834] transition-colors flex items-center justify-center">
                <MinusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button type="button" disabled={value >= max} onClick={() => onChange(Math.min(max, Number((value + step).toFixed(2))))} className="px-2.5 sm:px-3 h-full text-neutral-700 dark:text-neutral-300 hover:bg-[#f5f0e8] dark:hover:bg-[#242320] disabled:opacity-20 transition-colors flex items-center justify-center">
                <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
        </div>
    );
}

function ToggleButton({ checked, onChange, label, tooltip }: { checked: boolean; onChange: (v: boolean) => void; label: string; tooltip?: string }) {
    return (
        <div className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg hover:bg-[#f5f0e8] dark:hover:bg-[#242320]/40 transition-colors min-w-0 gap-2">
            <div className="flex items-center gap-1 group relative max-w-[calc(100%-2.5rem)] min-w-0">
                <span className="text-[11px] sm:text-xs font-semibold text-neutral-700 dark:text-neutral-300 whitespace-normal break-keep">
                    {label}
                </span>
                {tooltip && (
                    <>
                        <InformationCircleIcon className="w-3 h-3 text-neutral-400 dark:text-neutral-600 cursor-help shrink-0" />
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-56 p-2.5 bg-neutral-950 text-white dark:bg-white dark:text-neutral-900 text-[11px] font-semibold rounded-lg shadow-lg border border-neutral-800 dark:border-neutral-200 z-50 leading-normal">
                            {tooltip}
                        </div>
                    </>
                )}
            </div>
            <button type="button" onClick={() => onChange(!checked)} className={cn("w-8 h-4.5 sm:w-9 sm:h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0", checked ? "bg-[#16a34a]" : "bg-neutral-300 dark:bg-[#4a4641]")}>
                <div className={cn("bg-white w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shadow-xs transform transition-transform duration-200", checked ? "translate-x-3.5 sm:translate-x-4" : "translate-x-0")} />
            </button>
        </div>
    );
}

function CalloutWrapper({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-[#242320] p-3.5 sm:p-5 rounded-xl sm:rounded-[2rem] border border-neutral-200 dark:border-[#35332e] shadow-xs flex gap-2.5 sm:gap-3 w-full">
            <div className="shrink-0 pt-0.5">{icon}</div>
            <div className="space-y-0.5 min-w-0 flex-1">
                <h4 className="text-[10px] sm:text-xs font-black text-neutral-900 dark:text-neutral-50 uppercase tracking-wider truncate">{title}</h4>
                <p className="text-[11px] sm:text-xs font-medium leading-relaxed text-neutral-600 dark:text-neutral-400 break-keep">{children}</p>
            </div>
        </div>
    );
}

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
        blue: "text-[#16a34a] dark:text-[#16a34a]",
        rose: "text-rose-600 dark:text-rose-400"
    };

    const accentColors = {
        blue: "accent-[#16a34a] dark:accent-[#f0fdf4]0",
        rose: "accent-rose-600 dark:accent-rose-500"
    };

    const quickRates = [
        { label: "예금", rate: 4 },
        { label: "올웨더", rate: 6 },
        { rate: 8, label: "S&P" },
        { label: "나스닥", rate: 12 }
    ];

    return (
        <InputGroup label={label} tooltip={tooltip} value={`${value}%`} color={textColors[accentColor]}>
            <div className="space-y-2">
                <div className="flex gap-3 sm:gap-4 items-center">
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className={cn("flex-1 h-1.5 sm:h-2 bg-neutral-200 dark:bg-[#242320] rounded-lg appearance-none cursor-pointer transition-all", accentColors[accentColor])}
                    />
                    <StepButtons value={value} step={step} min={min} max={max} onChange={onChange} />
                </div>
                {showQuickButtons && (
                    <div className="flex flex-wrap gap-1">
                        {quickRates.map(qr => (
                            <button
                                type="button"
                                key={qr.label}
                                onClick={() => onChange(qr.rate)}
                                className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:py-1 bg-[#faf9f7] dark:bg-[#242320] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#242320] rounded transition-colors"
                            >
                                {qr.label}({qr.rate}%)
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
            <div className="flex gap-3 sm:gap-4 items-center">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="flex-1 accent-neutral-800 dark:accent-neutral-200 h-1.5 sm:h-2 bg-neutral-200 dark:bg-[#242320] rounded-lg appearance-none cursor-pointer"
                />
                <StepButtons value={value} step={1} min={min} max={max} onChange={onChange} />
            </div>
        </InputGroup>
    );
}