import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LoginAuthWrapper } from "./components/LoginAuthWrapper";
import { WithdrawCooldownBanner } from "./components/WithdrawCooldownBanner";
import { ResearchPreview } from "./components/ResearchPreview";
import styles from "./login.module.css";

export default async function LoginPage() {
    const t = await getTranslations("login");
    return (
        <div className={`landing-style-page ${styles.page}`}>
            <div className={styles.content}>
                <section className={styles.login} aria-labelledby="login-title">
                    <div className={styles.loginBody}>
                        <h1 id="login-title">{t("title")}</h1>
                        <Suspense fallback={null}><WithdrawCooldownBanner /></Suspense>
                        <div className={styles.auth}>
                            <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-neutral-200 dark:bg-surface-dark-elevated motion-reduce:animate-none" />}>
                                <LoginAuthWrapper />
                            </Suspense>
                        </div>
                        <p className={styles.accountNote}>{t("accountNote")}</p>
                        <p className={styles.terms}>{t.rich("consent", { terms: text => <Link href="/terms">{text}</Link>, privacy: text => <Link href="/privacy">{text}</Link> })}</p>
                    </div>
                    <div className={styles.ticketBottom}>
                        <Link href="/screener">{t("discover")}<ArrowUpRight size={16} aria-hidden="true" /></Link>
                    </div>
                </section>
                <ResearchPreview />
            </div>
        </div>
    );
}
