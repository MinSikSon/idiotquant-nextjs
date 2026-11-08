import { Suspense } from "react";
import { LoginAuthWrapper } from "./components/LoginAuthWrapper";
import { WithdrawCooldownBanner } from "./components/WithdrawCooldownBanner";
import Link from "next/link";

const BENEFITS = [
    { label: "발굴 결과 전체 보기", desc: "미리보기에서 살펴본 조건으로 전체 종목을 확인하고 상세 필터를 조합하세요." },
    { label: "상세 분석 확인", desc: "모델별 계산 근거와 기업의 재무·위험 정보를 확인하세요." },
    { label: "관심종목 저장", desc: "관심 있는 종목을 모아두고 다시 방문해 분석을 이어가세요." },
];

export default function LoginPage() {
    return (
        <div className="landing-style-page min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-surface-canvas dark:bg-surface-dark-canvas">

            <div className="relative w-full max-w-sm lg:max-w-6xl flex flex-col gap-8">

                <Suspense fallback={null}>
                    <WithdrawCooldownBanner />
                </Suspense>

                {/* Brand mark */}
                <div className="flex justify-center">
                    <Link href="/" className="group flex items-center gap-3">
                        <div className="w-11 h-11 bg-brand rounded-2xl flex items-center justify-center shadow-sm shadow-brand/20 group-hover:shadow-brand/30 transition-shadow">
                            <span className="text-white text-[13px] font-black italic leading-none">IQ</span>
                        </div>
                        <span className="font-black tracking-tighter text-xl text-neutral-900 dark:text-white">
                            IDIOT<span className="text-brand-ink">QUANT</span>
                        </span>
                    </Link>
                </div>

                {/* Card */}
                <div className="desktop-login-card bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark overflow-hidden">

                    {/* Card header */}
                    <div className="px-8 pt-8 pb-6 text-left border-b border-neutral-100 dark:border-border-subtle-dark">
                        <h1 className="text-[1.6rem] font-black leading-tight text-neutral-900 dark:text-white">
                            로그인하고<br />분석을 이어가세요
                        </h1>
                        <p className="mt-2.5 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            국내·미국 주식의 전체 발굴 결과와<br />상세 분석, 관심종목을 이용하세요.
                        </p>
                    </div>

                    {/* Benefits */}
                    <div className="px-8 py-6 space-y-4 border-b border-neutral-100 dark:border-border-subtle-dark">
                        {BENEFITS.map((b) => (
                            <div key={b.label} className="flex items-start gap-3">
                                <div className="mt-0.5 w-5 h-5 rounded-full  flex items-center justify-center shrink-0">
                                    <svg className="w-2.5 h-2.5 text-neutral-600 dark:text-neutral-400" viewBox="0 0 10 8" fill="none">
                                        <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200 leading-normal">{b.label}</p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 leading-normal">{b.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Login area */}
                    <div className="px-8 py-6">
                        <Suspense fallback={<div className="w-full h-12 rounded-xl bg-neutral-200 dark:bg-surface-dark-elevated animate-pulse" />}>
                            <LoginAuthWrapper />
                        </Suspense>

                        <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-surface-canvas dark:bg-surface-dark-card" />
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">간편 가입</span>
                            <div className="flex-1 h-px bg-surface-canvas dark:bg-surface-dark-card" />
                        </div>

                        <div className="flex justify-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
                            <span className="flex items-center gap-1.5">
                                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                                    <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9.2 11L6 9.2L2.8 11L3.5 7.5L1 5L4.5 4.5L6 1Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" fill="none"/>
                                </svg>
                                로그인하고 이용하기
                            </span>
                            <span className="flex items-center gap-1.5">
                                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                                    <rect x="1" y="4" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1"/>
                                    <path d="M4 4V3a2 2 0 114 0v1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                                </svg>
                                개인정보 보호
                            </span>
                            <span className="flex items-center gap-1.5">
                                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                                </svg>
                                언제든 탈퇴
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-neutral-600 dark:text-neutral-400">
                    로그인 시{" "}
                    <Link href="/terms" className="underline underline-offset-2 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">이용약관</Link>
                    {" "}및{" "}
                    <Link href="/privacy" className="underline underline-offset-2 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">개인정보 처리방침</Link>
                    에 동의합니다.
                </p>
            </div>
        </div>
    );
}
