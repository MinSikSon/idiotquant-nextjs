"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Heart, Search, SlidersHorizontal, Columns2 } from "lucide-react";
import styles from "../login.module.css";

const STEPS = [
    { label: "screen", icon: Search },
    { label: "compare", icon: Columns2 },
    { label: "watchlist", icon: Heart },
] as const;

export function ResearchPreview() {
  const t = useTranslations("login");
    const [step, setStep] = useState(0);
    const [saved, setSaved] = useState(false);

    return (
        <section aria-label={t("preview")} className={styles.research}>
            <div className={styles.steps} role="group" aria-label={t("previewFeatures")}>
                {STEPS.map(({ label, icon: Icon }, index) => (
                    <button key={label} type="button" aria-pressed={step === index} onClick={() => setStep(index)}>
                        <Icon size={16} aria-hidden="true" />{t(label)}
                    </button>
                ))}
            </div>
            <div className={styles.notebook}>
                <div className={styles.noteHeader}><span className={styles.sample}>{t("sample")}</span></div>
                <div className={styles.demo}>
                    {step === 0 && <>
                        <div className={styles.filterLabel}><SlidersHorizontal size={15} aria-hidden="true" />{t("criteria")}</div>
                        <div className={styles.filters}><span>{t("lowPbr")}</span><span>{t("profitable")}</span></div>
                        <div className={styles.company}><span className={styles.companyIcon}>A</span><div><strong>{t("companyA")}</strong><span>{t("matched")}</span></div><Search size={21} aria-hidden="true" /></div>
                    </>}
                    {step === 1 && <div className={styles.comparison}>
                        <div><span>{t("metric")}</span><strong>{t("companyA")}</strong><strong>{t("companyB")}</strong></div>
                        <div><span>PBR</span><b>{t("pbrLow")}</b><b>{t("pbrHigh")}</b></div>
                        <div><span>ROE</span><b>8.5%</b><b>12.0%</b></div>
                    </div>}
                    {step === 2 && <>
                        <div className={styles.filterLabel}><Heart size={15} aria-hidden="true" />{t("watchlist")}</div>
                        <div className={styles.company}><span className={styles.companyIcon}>A</span><div><strong>{t("companyA")}</strong><span>{saved ? t("saved") : t("saveHint")}</span></div><button type="button" className={styles.save} aria-label={t("save")} aria-pressed={saved} onClick={() => setSaved(!saved)}><Heart size={22} fill={saved ? "currentColor" : "none"} /></button></div>
                        <p className={styles.savedNote} aria-live="polite">{saved ? t("signInHint") : ""}</p>
                    </>}
                </div>
            </div>
        </section>
    );
}
