import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { LoginAuthWrapper } from "./components/LoginAuthWrapper";
import { WithdrawCooldownBanner } from "./components/WithdrawCooldownBanner";
import { ResearchPreview } from "./components/ResearchPreview";
import styles from "./login.module.css";

export default function LoginPage() {
    return (
        <div className={`landing-style-page ${styles.page}`}>
            <div className={styles.shell}>
                <header className={styles.header}>
                    <Link href="/" className={styles.wordmark} aria-label="IdiotQuant 홈">
                        <span className={styles.mark} aria-hidden="true">iq.</span>
                        <span>IDIOTQUANT</span>
                    </Link>
                    <Link href="/" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />홈으로</Link>
                </header>

                <div className={styles.content}>
                    <section className={styles.intro} aria-labelledby="login-title">
                        <p className={styles.eyebrow}>호기심 있는 투자자를 위한 작은 연구실</p>
                        <h1 id="login-title">감은 잠깐 쉬고,<br /><span>숫자랑 놀아볼까요?</span></h1>
                        <p className={styles.description}>궁금한 회사를 찾고, 나란히 비교하고.<br />마음에 남는 종목은 내 목록에 쏙 담아두세요.</p>
                        <div className={styles.preview}><ResearchPreview /></div>
                    </section>

                    <section className={styles.login} aria-labelledby="start-title">
                        <div className={styles.ticketTop}><span>IDIOTQUANT 연구실</span><span>입장권 / 01</span></div>
                        <div className={styles.loginBody}>
                            <div className={styles.ticketArt} aria-hidden="true">
                                <span className={styles.artEye} /><span className={styles.artEye} /><span className={styles.artSmile} />
                                <span className={styles.artLabel}>반가워요!</span>
                            </div>
                            <h2 id="start-title">오늘의 발견을 시작해요</h2>
                            <p className={styles.loginDescription}>처음이어도, 다시 오셨어도 환영해요.<br />쓰던 계정으로 가볍게 들어오세요.</p>
                            <Suspense fallback={null}><WithdrawCooldownBanner /></Suspense>
                            <div className={styles.auth}>
                                <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-neutral-200 dark:bg-surface-dark-elevated motion-reduce:animate-none" />}>
                                    <LoginAuthWrapper />
                                </Suspense>
                            </div>
                            <p className={styles.accountNote}>첫 로그인 시 계정이 만들어집니다.</p>
                            <p className={styles.terms}>로그인 시 <Link href="/terms">이용약관</Link> 및 <Link href="/privacy">개인정보 처리방침</Link>에 동의합니다.</p>
                        </div>
                        <div className={styles.ticketBottom}>
                            <span>아직 둘러보는 중인가요?</span>
                            <Link href="/screener">종목 발굴 미리보기<ArrowUpRight size={16} aria-hidden="true" /></Link>
                        </div>
                    </section>
                </div>

                <footer className={styles.footer}><span>작은 호기심이, 나만의 투자 기준으로.</span><span>투자 판단과 결과는 이용자에게 있습니다.</span></footer>
            </div>
        </div>
    );
}
