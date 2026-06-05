import { Suspense } from "react";
import { LoginAuthWrapper } from "./components/LoginAuthWrapper";
import Link from "next/link";

const BENEFITS = [
    { label: "매일 자동 스캔", desc: "NCAV · 저PBR · 저PER · S-RIM 기준으로 저평가 종목을 매일 갱신" },
    { label: "9가지 전략 필터", desc: "그레이엄 · 마법공식 · 퀄리티밸류 등 전략 조합 AND/OR 필터" },
    { label: "적정 주가 계산", desc: "7가지 밸류에이션 모델 기반 종목별 안전마진 분석" },
];

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#faf9f7] dark:bg-[#1a1915]">

            <div className="relative w-full max-w-sm flex flex-col gap-8">

                {/* Brand mark */}
                <div className="flex justify-center">
                    <Link href="/" className="group flex items-center gap-3">
                        <div className="w-11 h-11 bg-[#d97757] rounded-2xl flex items-center justify-center shadow-sm shadow-[#d97757]/20 group-hover:shadow-[#d97757]/30 transition-shadow">
                            <span className="text-white text-[13px] font-black italic leading-none">IQ</span>
                        </div>
                        <span className="font-black tracking-tighter text-xl text-neutral-900 dark:text-white">
                            IDIOT<span className="text-[#d97757]">QUANT</span>
                        </span>
                    </Link>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] shadow-sm overflow-hidden">

                    {/* Card header */}
                    <div className="px-8 pt-8 pb-6 text-center border-b border-neutral-100 dark:border-[#35332e]">
                        <h1 className="text-[1.6rem] font-black leading-tight text-neutral-900 dark:text-white">
                            저평가 종목을<br />매일 발굴해드립니다
                        </h1>
                        <p className="mt-2.5 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                            가치투자 기준으로 매일 자동 스캔하는<br />국내 주식 퀀트 도구
                        </p>
                    </div>

                    {/* Benefits */}
                    <div className="px-8 py-6 space-y-4 border-b border-neutral-100 dark:border-[#35332e]">
                        {BENEFITS.map((b) => (
                            <div key={b.label} className="flex items-start gap-3">
                                <div className="mt-0.5 w-5 h-5 rounded-full bg-[#fde8de] dark:bg-[#3d1f10]/60 flex items-center justify-center shrink-0">
                                    <svg className="w-2.5 h-2.5 text-[#d97757] dark:text-[#d97757]" viewBox="0 0 10 8" fill="none">
                                        <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200 leading-snug">{b.label}</p>
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 leading-snug">{b.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Login area */}
                    <div className="px-8 py-6">
                        <Suspense fallback={<div className="w-full h-12 rounded-xl bg-[#faf9f7] dark:bg-[#35332e] animate-pulse" />}>
                            <LoginAuthWrapper />
                        </Suspense>

                        <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-[#faf9f7] dark:bg-[#242320]" />
                            <span className="text-[10px] font-bold text-neutral-300 dark:text-neutral-600 uppercase tracking-widest">무료 · 1초 가입</span>
                            <div className="flex-1 h-px bg-[#faf9f7] dark:bg-[#242320]" />
                        </div>

                        <div className="flex justify-center gap-4 text-[11px] text-neutral-400 dark:text-neutral-500">
                            <span className="flex items-center gap-1.5">
                                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                                    <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9.2 11L6 9.2L2.8 11L3.5 7.5L1 5L4.5 4.5L6 1Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" fill="none"/>
                                </svg>
                                무료 이용
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
                <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-500">
                    로그인 시{" "}
                    <span className="underline underline-offset-2 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">이용약관</span>
                    {" "}및{" "}
                    <span className="underline underline-offset-2 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">개인정보 처리방침</span>
                    에 동의합니다.
                </p>
            </div>
        </div>
    );
}
