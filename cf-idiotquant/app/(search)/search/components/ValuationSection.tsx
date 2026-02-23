"use client";
import React from "react";
import { Section, SectionCard } from "@blueprintjs/core";
import { MdTableTemplate } from "./MdTableTemplate";
import { calculateKrNcav, calculateKrSRIM, calculateUsNcav } from "../utils/financeCalc";

export const ValuationSection = ({ data, isUs }: { data: any; isUs: boolean }) => {
    if (isUs) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Section title="US NCAV 모형" className="dark:!bg-zinc-400 rounded-xl overflow-hidden">
                    <SectionCard className="dark:!bg-zinc-950">
                        <MdTableTemplate content={calculateUsNcav(data.finnhubData, data.usDetail)} />
                    </SectionCard>
                </Section>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Section title="NCAV 청산가치 전략" collapsible className="dark:!bg-zinc-400 rounded-xl overflow-hidden">
                <SectionCard className="dark:!bg-zinc-950">
                    <MdTableTemplate content={calculateKrNcav(data.kiBS, data.kiChart)} />
                </SectionCard>
            </Section>
            <Section title="S-RIM 적정주가 전략" collapsible className="dark:!bg-zinc-400 rounded-xl overflow-hidden">
                <SectionCard className="dark:!bg-zinc-950">
                    <MdTableTemplate content={calculateKrSRIM(data.kiBS, data.kiIS, data.kiChart)} />
                </SectionCard>
            </Section>
        </div>
    );
};