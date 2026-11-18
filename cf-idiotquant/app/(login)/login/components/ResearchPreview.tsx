"use client";

import { useState } from "react";
import { ArrowRight, Check, Heart, Search, SlidersHorizontal, Columns2 } from "lucide-react";
import styles from "../login.module.css";

const STEPS = [
    { label: "발굴하기", icon: Search, title: "이 회사, 조금 궁금한데?", description: "내가 고른 재무 기준으로 국내·미국 종목을 좁혀보세요." },
    { label: "비교하기", icon: Columns2, title: "나란히 보면, 다르게 보여요.", description: "가격만 보지 말고 수익성과 자산도 함께 비교해보세요." },
    { label: "담아두기", icon: Heart, title: "발견은 짧게, 관심은 길게.", description: "관심종목으로 저장하면 휴대폰과 PC에서 이어볼 수 있어요." },
];

export function ResearchPreview() {
    const [step, setStep] = useState(0);
    const [saved, setSaved] = useState(false);
    const current = STEPS[step];

    return (
        <section aria-label="서비스 미리보기" className={styles.research}>
            <div className={styles.steps} aria-label="미리보기 단계">
                {STEPS.map(({ label, icon: Icon }, index) => (
                    <button key={label} type="button" aria-pressed={step === index} onClick={() => setStep(index)}>
                        <span className={styles.stepNumber}>0{index + 1}</span><Icon size={16} aria-hidden="true" />{label}
                    </button>
                ))}
            </div>
            <div className={styles.notebook}>
                <div className={styles.noteHeader}><span>나의 첫 종목 연구</span><span className={styles.sample}>가상 종목 · 예시</span></div>
                <div className={styles.demo}>
                    {step === 0 && <>
                        <div className={styles.filterLabel}><SlidersHorizontal size={15} aria-hidden="true" />이런 회사를 찾고 있어요</div>
                        <div className={styles.filters}><span>자산에 비해 저렴한</span><span>이익을 내는</span></div>
                        <div className={styles.company}><span className={styles.companyIcon}>ㄱ</span><div><strong>궁금한회사</strong><span>내 기준에 맞는 종목 발견</span></div><Search size={21} aria-hidden="true" /></div>
                    </>}
                    {step === 1 && <div className={styles.comparison}>
                        <div><span>함께 살펴볼 지표</span><strong>궁금한회사</strong><strong>단단한회사</strong></div>
                        <div><span>PBR</span><b>0.8배</b><b>1.2배</b></div>
                        <div><span>ROE</span><b>8.5%</b><b>12.0%</b></div>
                        <p>숫자의 차이에서 다음 질문을 찾아보세요.</p>
                    </div>}
                    {step === 2 && <>
                        <div className={styles.filterLabel}><Heart size={15} aria-hidden="true" />나의 관심종목</div>
                        <div className={styles.company}><span className={styles.companyIcon}>ㄱ</span><div><strong>궁금한회사</strong><span>{saved ? "내 목록에 쏙! 다음에 또 만나요." : "하트를 눌러 담아보세요"}</span></div><button type="button" className={styles.save} aria-label="예시 관심종목 저장" aria-pressed={saved} onClick={() => setSaved(!saved)}><Heart size={22} fill={saved ? "currentColor" : "none"} /></button></div>
                        <p className={styles.savedNote}>{saved ? <><Check size={14} aria-hidden="true" />미리보기예요. 실제 저장은 로그인 후에!</> : "관심 가는 회사부터 하나씩 모아보세요."}</p>
                    </>}
                </div>
                <div className={styles.noteCaption} aria-live="polite"><h2>{current.title}</h2><p>{current.description}</p></div>
            </div>
            <button type="button" className={styles.next} onClick={() => setStep((step + 1) % STEPS.length)}>{step === 2 ? "처음부터 다시 보기" : "다음은 어떻게 하나요?"}<ArrowRight size={16} aria-hidden="true" /></button>
        </section>
    );
}
