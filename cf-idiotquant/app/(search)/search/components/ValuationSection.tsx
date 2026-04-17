"use client";
import React from "react";
import { Section, SectionCard } from "@blueprintjs/core";
import { MdTableTemplate } from "./MdTableTemplate";
import { calculateKrNcav, calculateKrSRIM, calculateUsNcav, calculateUsSRIM } from "../utils/financeCalc";

export const ValuationSection = ({ data, isUs }: { data: any; isUs: boolean }) => {
    // 다크모드 시 공통으로 적용할 클래스 (제목 바 배경색 및 텍스트 색상)
    const sectionClasses = "dark:!bg-zinc-800 dark:!text-zinc-100 rounded-xl overflow-hidden border dark:border-zinc-700 shadow-sm";
    const cardClasses = "dark:!bg-zinc-900 dark:!text-zinc-300 border-none";

    if (isUs) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Section title="US NCAV 청산가치 전략" className={sectionClasses}>
                    <SectionCard className={cardClasses}>
                        <MdTableTemplate content={calculateUsNcav(data.finnhubData, data.usDetail)} />
                    </SectionCard>
                </Section>
                <Section title="US S-RIM 적정주가 전략" className={sectionClasses}>
                    <SectionCard className={cardClasses}>
                        <MdTableTemplate content={calculateUsSRIM(data.finnhubData, data.usDetail)} />
                    </SectionCard>
                </Section>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Section title="NCAV 청산가치 전략" collapsible className={sectionClasses}>
                <SectionCard className={cardClasses}>
                    <MdTableTemplate content={calculateKrNcav(data.kiBS, data.kiChart)} />
                </SectionCard>
            </Section>
            <Section title="S-RIM 적정주가 전략" collapsible className={sectionClasses}>
                <SectionCard className={cardClasses}>
                    <MdTableTemplate content={calculateKrSRIM(data.kiBS, data.kiIS, data.kiChart)} />
                </SectionCard>
            </Section>
        </div>
    );
};