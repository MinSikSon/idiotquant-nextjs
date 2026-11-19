import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LoginAuthWrapper } from "./components/LoginAuthWrapper";
import { WithdrawCooldownBanner } from "./components/WithdrawCooldownBanner";
import { ResearchPreview } from "./components/ResearchPreview";
import styles from "./login.module.css";

export default function LoginPage() {
    return (
        <div className={`landing-style-page ${styles.page}`}>
            <div className={styles.content}>
                <section className={styles.login} aria-labelledby="login-title">
                    <div className={styles.loginBody}>
                        <h1 id="login-title">로그인</h1>
                        <Suspense fallback={null}><WithdrawCooldownBanner /></Suspense>
                        <div className={styles.auth}>
                            <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-neutral-200 dark:bg-surface-dark-elevated motion-reduce:animate-none" />}>
                                <LoginAuthWrapper />
                            </Suspense>
                        </div>
                        <p className={styles.accountNote}>처음 로그인하면 계정이 생성됩니다.</p>
                        <p className={styles.terms}>로그인 시 <Link href="/terms">이용약관</Link> 및 <Link href="/privacy">개인정보 처리방침</Link>에 동의합니다.</p>
                    </div>
                    <div className={styles.ticketBottom}>
                        <Link href="/screener">종목 발굴<ArrowUpRight size={16} aria-hidden="true" /></Link>
                    </div>
                </section>
                <ResearchPreview />
            </div>
        </div>
    );
}
