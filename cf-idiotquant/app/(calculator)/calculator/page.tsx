"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import ResultChart, { ChartDataItem } from "./ResultChart";

// --- 📌 만원 단위까지 절삭 없이 정확하게 조/억/만 단위로 포맷팅하는 함수 ---
const formatKrw = (valueInMan: number): string => {
    if (valueInMan === 0) return "0원";
    
    const isNegative = valueInMan < 0;
    const absValue = Math.abs(valueInMan);
    
    const trill = Math.floor(absValue / 100000000);       
    const eok = Math.floor((absValue % 100000000) / 10000); 
    const man = Math.floor(absValue % 10000);             

    let result = isNegative ? "-" : "";
    if (trill > 0) result += `${trill.toLocaleString()}조 `;
    if (eok > 0) result += `${eok.toLocaleString()}억 `;
    if (man > 0) result += `${man.toLocaleString()}만`;

    return result.trim() + "원";
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

function CalculatorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [copied, setCopied] = useState(false);
    const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_INPUTS);

    useEffect(() => {
        const parseNum = (key: string, def: number) => {
            const val = searchParams.get(key);
            return val ? Number(val) : def;
        };
        const parseBool = (key: string, def: boolean) => {
            const val = searchParams.get(key);
            return val ? val === "true" : def;
        };

        setInputs({
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
        });
    }, [searchParams]);

    const updateInput = (key: keyof CalcInputs, val: any) => {
        setInputs(p => {
            let next = { ...p, [key]: val };
            if (key === "startAge") {
                if (next.startAge > next.retirementAge) next.retirementAge = next.startAge;
                if (next.retirementAge > next.targetAge) next.targetAge = next.retirementAge;
            } else if (key === "retirementAge") {
                if (next.retirementAge < next.startAge) next.retirementAge = next.startAge;
                if (next.retirementAge > next.targetAge) next.targetAge = next.retirementAge;
            } else if (key === "targetAge") {
                if (next.targetAge < next.retirementAge) next.targetAge = next.retirementAge;
            }
            const params = new URLSearchParams();
            Object.entries(next).forEach(([k, v]) => params.set(k, String(v)));
            router.replace(`?${params.toString()}`, { scroll: false });
            return next;
        });
    };

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
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) { console.error(err); }
    };

    return (
        <div className="bg-zinc-50 dark:bg-zinc-950 min-h-screen p-4 md:p-10 font-sans text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/20">
            <div className="max-w-6xl mx-auto space-y-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20">
                            <CalculatorIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">하이엔드 자산 수명 시뮬레이터</h1>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">조/억/만 단위 정밀 가시화 및 실전 은퇴 연동형 계측 시스템</p>
                        </div>
                    </div>
                    <button onClick={handleShareLink} className={cn("flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm border shrink-0", copied ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300")}>
                        {copied ? <CheckIcon className="w-4 h-4" /> : <ShareIcon className="w-4 h-4" />}
                        {copied ? "링크 복사 완료!" : "결과 링크 공유"}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-8">
                        <SectionWrapper title="핵심 자산 및 기대 수익률" icon={<ArrowTrendingUpIcon className="w-4 h-4" />}>
                            <div className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <InputGroup label="초기 투자 시드" value={formatKrw(inputs.investmentAmount)} color="text-blue-600 dark:text-blue-400">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input type="number" value={inputs.investmentAmount} onChange={(e) => updateInput("investmentAmount", Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 rounded-xl pl-4 pr-12 py-2.5 font-bold text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none" />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-xs font-bold">만원</div>
                                        </div>
                                        <StepButtons value={inputs.investmentAmount} step={500} min={0} onChange={(v) => updateInput("investmentAmount", v)} />
                                    </div>
                                </InputGroup>
                                <PercentRateSlider label="투자 자산 기대 수익률 (연)" value={inputs.interestRate} min={0} max={25} onChange={(v) => updateInput("interestRate", v)} accentColor="accent-amber-500" />
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 space-y-2">
                                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 block px-1">기본 거시 변수</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <ToggleButton checked={inputs.applyTax} onChange={(v) => updateInput("applyTax", v)} label="이자소득세 과세 (15.4%)" />
                                        <ToggleButton checked={inputs.realValueMode} onChange={(v) => updateInput("realValueMode", v)} label="물가상승 반영 (실질가치)" />
                                    </div>
                                </div>
                                <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl border border-blue-100/60 dark:border-blue-900/30 space-y-2">
                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 block px-1 flex items-center gap-1"><ShieldCheckIcon className="w-3 h-3" /> 실전 정밀 검증 지표 추가</span>
                                    <div className="grid grid-cols-1 gap-2">
                                        <ToggleButton checked={inputs.applyIsaIsaGold} onChange={(v) => updateInput("applyIsaIsaGold", v)} label="금융투자소득세 고율 가산 (22% 세율 대체)" />
                                        <ToggleButton checked={inputs.applyInsurancePremium} onChange={(v) => updateInput("applyInsurancePremium", v)} label="은퇴 후 건보료 지역가입 페널티 (지출 +8%)" />
                                        <ToggleButton checked={inputs.applyNationalPension} onChange={(v) => updateInput("applyNationalPension", v)} label="만 65세 이후 국민연금 수령 연동 (월 +120만)" />
                                    </div>
                                </div>
                            </div>
                        </SectionWrapper>
                        <SectionWrapper title="생애 주기 임계값" icon={<UserIcon className="w-4 h-4" />}>
                            <div className="space-y-4 bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <AgeInputSlider label="시작 연령" value={inputs.startAge} min={20} max={80} onChange={(v) => updateInput("startAge", v)} />
                                <AgeInputSlider label="은퇴 및 저축 중단 연령" value={inputs.retirementAge} min={inputs.startAge} max={90} onChange={(v) => updateInput("retirementAge", v)} />
                                <AgeInputSlider label="자산 수명 검증 종료 연령" value={inputs.targetAge} min={inputs.retirementAge} max={100} onChange={(v) => updateInput("targetAge", v)} />
                            </div>
                        </SectionWrapper>
                        <SectionWrapper title="점증형 현금 가감 데이터" icon={<ArrowsRightLeftIcon className="w-4 h-4" />}>
                            <div className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <div className="space-y-4">
                                    <InputGroup label="초기 매월 저축액" value={formatKrw(inputs.contributions)}>
                                        <div className="flex gap-2">
                                            <input type="number" value={inputs.contributions} onChange={(e) => updateInput("contributions", Number(e.target.value))} className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 rounded-xl px-4 py-2.5 font-bold text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500" />
                                            <StepButtons value={inputs.contributions} step={50} min={0} onChange={(v) => updateInput("contributions", v)} />
                                        </div>
                                    </InputGroup>
                                    <PercentRateSlider label="매년 소득 상승에 따른 복리 저축 증액률" value={inputs.contributionGrowthRate} min={0} max={15} onChange={(v) => updateInput("contributionGrowthRate", v)} accentColor="accent-blue-600" />
                                </div>
                                <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
                                <div className="space-y-4">
                                    <InputGroup label="기본 목표 초기 월 생활비" value={formatKrw(inputs.monthlyExpense)} color="text-rose-500 dark:text-rose-400">
                                        <div className="flex gap-2">
                                            <input type="number" value={inputs.monthlyExpense} onChange={(e) => updateInput("monthlyExpense", Number(e.target.value))} className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 rounded-xl px-4 py-2.5 font-bold text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-rose-500" />
                                            <StepButtons value={inputs.monthlyExpense} step={50} min={0} onChange={(v) => updateInput("monthlyExpense", v)} />
                                        </div>
                                    </InputGroup>
                                    <PercentRateSlider label="매년 물가 연동 생활비 상승률" value={inputs.expenseGrowthRate} min={0} max={15} onChange={(v) => updateInput("expenseGrowthRate", v)} accentColor="accent-rose-500" />
                                </div>
                            </div>
                        </SectionWrapper>
                    </div>

                    <div className="lg:col-span-7 space-y-8">
                        <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                            <div className={cn("p-8 md:p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden transition-all duration-500 border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-white", results.finalValue < 0 && "border-rose-900/50")}>
                                <div className="relative z-10 space-y-8">
                                    <div className="space-y-3">
                                        <span className={cn("text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full border bg-zinc-950/40", results.finalValue >= 0 ? "text-blue-400 border-blue-500/20" : "text-rose-400 border-rose-500/20")}>
                                            {inputs.targetAge}세 예상 시점 잔고 {inputs.realValueMode && "(실질 가치 수렴)"}
                                        </span>
                                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-blue-400 dark:text-blue-400">
                                            {formatKrw(results.finalValue)}
                                        </h2>
                                        {results.finalValue < 0 && (
                                            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                                                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" /> 
                                                <span>경고: 지표 가산 패널티 및 가치 하락으로 인해 자산 수명이 목표 연령 전 고갈됩니다.</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">총 누적 투입 원금</span>
                                            <div className="text-sm font-bold text-zinc-300">{formatKrw(results.totalInvestment)}</div>
                                        </div>
                                        <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800 text-right">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">최종 레버리지 배율</span>
                                            <div className={cn("text-lg font-black", results.finalRateOfReturn >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                {results.totalInvestment > 0 ? (results.finalValue / results.totalInvestment).toFixed(1) : 0} 배
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={cn("absolute -right-24 -top-24 w-80 h-80 rounded-full blur-[120px] opacity-20 transition-colors", results.finalValue >= 0 ? "bg-blue-600" : "bg-rose-600")} />
                            </div>
                        </motion.div>

                        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <div className="mb-6">
                                <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100">지표 연동형 자산 변동 그래프</h3>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">매년 가중되는 인플레이션 누적 및 세후 배당 유출입 복리 커브 (조/억/만 단위 정밀 반영)</p>
                            </div>
                            <div className="bg-zinc-50 dark:bg-black/40 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
                                <ResultChart data={results.chartData} height="h-[400px]" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CalloutWrapper icon={<InformationCircleIcon className="w-5 h-5 text-blue-500" />} title="복리 마법 활성화 조건">
                                기대 복리 연 수익률 <span className="font-bold text-blue-600 dark:text-blue-400">{inputs.interestRate}%</span> 구조에서는 초기 저축 단계의 1년 차이가 복리 롤링 스노우볼 효과로 인해 말년 수명 잔고를 <span className="font-bold text-zinc-900 dark:text-zinc-100">조 단위</span> 스케일로 변동시킬 수 있습니다.
                            </CalloutWrapper>
                            <CalloutWrapper icon={<LightBulbIcon className={cn("w-5 h-5", results.finalValue > 0 ? "text-emerald-500" : "text-rose-500")} />} title="퀀트 자산 수명 진단">
                                {results.finalValue > 0 ? `매우 안정적인 현금흐름 밸런스입니다. 은퇴 이후 발생 자산 수익이 연간 자금 이탈량을 초과하여 방어막을 형성하고 있습니다.` : `위험 상태입니다. 현 리스크 프로파일을 유지할 경우 목표 연령 이전에 자산이 한계점에 봉착합니다. 매월 정립액을 늘리거나 은퇴 목표 시점을 소폭 연장하십시오.`}
                            </CalloutWrapper>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- 공용 서브 UI 빌더 컴포넌트 생태계 ---

// 📌 [수정 완료] 하단에서 icon 에러를 유발하던 <icon /> 형태의 선언을 변수 바인딩 형태인 {icon} 구조로 정상 교체했습니다.
function SectionWrapper({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2 px-1 text-zinc-400 dark:text-zinc-500">
                {icon}
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function InputGroup({ label, value, subLabel, color = "text-zinc-900 dark:text-zinc-100", children }: any) {
    return <div className="space-y-2"><div className="flex justify-between items-end"><div><span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">{label}</span>{subLabel && <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 tracking-tight block mt-0.5">{subLabel}</span>}</div><span className={`text-sm font-black ${color}`}>{value}</span></div>{children}</div>;
}
function AgeInputSlider({ label, value, min, max, onChange }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void }) {
    return <div className="space-y-3 bg-zinc-50/50 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/60"><div className="flex justify-between items-center"><span className="text-[11px] font-black text-zinc-500 dark:text-zinc-400 tracking-wider">{label}</span><div className="flex items-center gap-2"><span className="text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 px-2.5 py-0.5 rounded-lg">{value}세</span><div className="flex border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-800 shadow-sm"><button type="button" disabled={value <= min} onClick={() => onChange(value - 1)} className="p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 border-r border-zinc-200 dark:border-zinc-700"><MinusIcon className="w-3 h-3" /></button><button type="button" disabled={value >= max} onClick={() => onChange(value + 1)} className="p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30"><PlusIcon className="w-3 h-3" /></button></div></div></div><input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600" /></div>;
}
function PercentRateSlider({ label, value, min, max, onChange, accentColor = "accent-blue-600" }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void, accentColor?: string }) {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(String(value));
    useEffect(() => { if (!isEditing) setLocalValue(String(value)); }, [value, isEditing]);
    const handleBlur = () => { setIsEditing(false); let num = Number(localValue); if (isNaN(num)) num = value; num = Math.min(max, Math.max(min, num)); onChange(Number(num.toFixed(1))); };
    const adjustStep = (amount: number) => { const next = Math.min(max, Math.max(min, value + amount)); onChange(Number(next.toFixed(1))); };
    return <div className="space-y-3 bg-zinc-50/50 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/60"><div className="flex justify-between items-center"><span className="text-[11px] font-black text-zinc-400 dark:text-zinc-500 tracking-wider">{label}</span><div className="flex items-center gap-2">{isEditing ? <input type="number" step="0.1" min={min} max={max} value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={handleBlur} onKeyDown={(e) => e.key === "Enter" && handleBlur()} autoFocus className="w-16 bg-white dark:bg-zinc-800 border border-blue-500 rounded-lg px-2 py-0.5 font-bold text-xs text-center text-zinc-900 dark:text-zinc-100 outline-none" /> : <span onClick={() => setIsEditing(true)} className="text-xs font-black text-zinc-700 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded-lg cursor-pointer hover:bg-blue-500/10 hover:text-blue-500 transition-all">{value}%</span>}<div className="flex border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-800 shadow-sm"><button type="button" disabled={value <= min} onClick={() => adjustStep(-0.1)} className="p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 border-r border-zinc-200 dark:border-zinc-700"><MinusIcon className="w-3 h-3" /></button><button type="button" disabled={value >= max} onClick={() => adjustStep(0.1)} className="p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30"><PlusIcon className="w-3 h-3" /></button></div></div></div><input type="range" min={min} max={max} step="0.1" value={value} onChange={(e) => onChange(Number(Number(e.target.value).toFixed(1)))} className={`w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer ${accentColor}`} /></div>;
}
function StepButtons({ value, step, min, max, onChange, isFloat = false }: { value: number, step: number, min?: number, max?: number, onChange: (v: number) => void, isFloat?: boolean }) {
    const handleAdd = () => { const next = value + step; if (max !== undefined && next > max) return; onChange(isFloat ? Number(next.toFixed(1)) : next); };
    const handleSub = () => { const next = value - step; if (min !== undefined && next < min) return; onChange(isFloat ? Number(next.toFixed(1)) : next); };
    return <div className="flex border border-zinc-200 dark:border-zinc-700/80 rounded-xl overflow-hidden shrink-0 bg-zinc-50 dark:bg-zinc-800"><button onClick={handleSub} className="p-2.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-500 border-r border-zinc-200 dark:border-zinc-700"><MinusIcon className="w-3.5 h-3.5" /></button><button onClick={handleAdd} className="p-2.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-500"><PlusIcon className="w-3.5 h-3.5" /></button></div>;
}
function ToggleButton({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) {
    return <button onClick={() => onChange(!checked)} className={cn("flex items-center justify-between p-3 rounded-xl border text-left text-[11px] font-bold transition-all w-full", checked ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900" : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700")}><span>{label}</span><div className={cn("w-1.5 h-1.5 rounded-full ml-2 shrink-0", checked ? "bg-blue-500 dark:bg-blue-600 animate-pulse" : "bg-zinc-300 dark:bg-zinc-600")} /></button>;
}
function CalloutWrapper({ icon, title, children }: any) {
    return <div className="p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex gap-3"><div className="flex-shrink-0 mt-0.5">{icon}</div><div className="min-w-0"><h5 className="font-bold text-xs mb-0.5 tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h5><p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 font-medium">{children}</p></div></div>;
}
function cn(...classes: any[]) { return classes.filter(Boolean).join(" "); }

export default function Calculator() {
    return <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-sm font-bold text-zinc-400 dark:text-zinc-500">정밀 단위 엔진을 구성 중입니다...</div>}><CalculatorContent /></Suspense>;
}