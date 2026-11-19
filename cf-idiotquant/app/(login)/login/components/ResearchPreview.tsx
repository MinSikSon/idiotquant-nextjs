"use client";

import { useState } from "react";
import { Heart, Search, SlidersHorizontal, Columns2 } from "lucide-react";
import styles from "../login.module.css";

const STEPS = [
    { label: "발굴", icon: Search },
    { label: "비교", icon: Columns2 },
    { label: "관심종목", icon: Heart },
];

export function ResearchPreview() {
    const [step, setStep] = useState(0);
    const [saved, setSaved] = useState(false);

    return (
        <section aria-label="서비스 미리보기" className={styles.research}>
            <div className={styles.steps} role="group" aria-label="미리 볼 기능">
                {STEPS.map(({ label, icon: Icon }, index) => (
                    <button key={label} type="button" aria-pressed={step === index} onClick={() => setStep(index)}>
                        <Icon size={16} aria-hidden="true" />{label}
                    </button>
                ))}
            </div>
            <div className={styles.notebook}>
                <div className={styles.noteHeader}><span className={styles.sample}>가상 종목으로 체험</span></div>
                <div className={styles.demo}>
                    {step === 0 && <>
                        <div className={styles.filterLabel}><SlidersHorizontal size={15} aria-hidden="true" />발굴 조건</div>
                        <div className={styles.filters}><span>PBR 1배 미만</span><span>흑자 기업</span></div>
                        <div className={styles.company}><span className={styles.companyIcon}>A</span><div><strong>예시기업 A</strong><span>조건 충족</span></div><Search size={21} aria-hidden="true" /></div>
                    </>}
                    {step === 1 && <div className={styles.comparison}>
                        <div><span>지표</span><strong>예시기업 A</strong><strong>예시기업 B</strong></div>
                        <div><span>PBR</span><b>0.8배</b><b>1.2배</b></div>
                        <div><span>ROE</span><b>8.5%</b><b>12.0%</b></div>
                    </div>}
                    {step === 2 && <>
                        <div className={styles.filterLabel}><Heart size={15} aria-hidden="true" />관심종목</div>
                        <div className={styles.company}><span className={styles.companyIcon}>A</span><div><strong>예시기업 A</strong><span>{saved ? "저장됨" : "하트를 눌러 저장"}</span></div><button type="button" className={styles.save} aria-label="예시 관심종목 저장" aria-pressed={saved} onClick={() => setSaved(!saved)}><Heart size={22} fill={saved ? "currentColor" : "none"} /></button></div>
                        <p className={styles.savedNote} aria-live="polite">{saved ? "관심종목을 계정에 저장하려면 로그인하세요." : ""}</p>
                    </>}
                </div>
            </div>
        </section>
    );
}
