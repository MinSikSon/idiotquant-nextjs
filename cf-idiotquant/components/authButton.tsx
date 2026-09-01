"use client"
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

function KakaoIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
                d="M10 2.5C5.86 2.5 2.5 5.22 2.5 8.57c0 2.12 1.33 3.99 3.37 5.15l-.82 3.02c-.07.27.23.5.46.35l3.55-2.3c.3.03.61.05.92.05 4.14 0 7.5-2.72 7.5-6.07S14.14 2.5 10 2.5z"
                fill="currentColor"
            />
        </svg>
    )
}

/** 구글 브랜드 가이드의 네 색 G. 단색으로 바꾸면 구글 로고가 아니게 된다. */
function GoogleIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
    )
}

/** 어느 문으로 들어가는 중인가. 둘 다 도는 것처럼 보이면 안 눌린 쪽도 눌린 줄 안다. */
type Pending = null | "kakao" | "google"

export default function AuthButton({ callbackUrl = "/screener" }: { callbackUrl?: string }) {
    const { data: session, status } = useSession()
    const [pending, setPending] = useState<Pending>(null)
    const router = useRouter()

    useEffect(() => {
        if (status === "authenticated") {
            router.replace(callbackUrl)
        }
    }, [status, router, callbackUrl])

    if (status === "loading") {
        return <div className="w-full h-12 rounded-xl bg-surface-canvas dark:bg-surface-dark-muted animate-pulse" />
    }

    if (session) {
        return (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-neutral-300 border-t-neutral-600 animate-spin" />
                이동 중...
            </div>
        )
    }

    const handleLogin = async (provider: "kakao" | "google") => {
        setPending(provider)
        try {
            await signIn(provider, { redirectTo: callbackUrl })
        } catch {
            setPending(null)
        }
    }

    // 하나를 누르면 나머지도 잠근다 — 넘어가는 중에 다른 문을 누르면 두 번 돈다.
    const busy = pending !== null

    return (
        <div className="flex flex-col gap-2.5">
            <button
                onClick={() => handleLogin("kakao")}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#F6DC00] active:scale-[0.98] text-[#191919] font-black text-sm py-3.5 px-5 rounded-xl transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed select-none"
            >
                {pending === "kakao" ? (
                    <>
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-[#191919]/30 border-t-[#191919] animate-spin" />
                        카카오 연결 중...
                    </>
                ) : (
                    <>
                        <KakaoIcon size={20} />
                        카카오로 로그인
                    </>
                )}
            </button>

            {/* 구글은 흰 바탕에 회색 테두리 — 구글 브랜드 가이드가 정한 모양이다.
                어두운 화면에서도 흰 버튼을 그대로 둔다. 색을 뒤집으면 그 로고가 아니게 된다. */}
            <button
                onClick={() => handleLogin("google")}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-50 active:scale-[0.98] text-[#1f1f1f] font-bold text-sm py-3.5 px-5 rounded-xl border border-neutral-300 transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed select-none"
            >
                {pending === "google" ? (
                    <>
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-neutral-300 border-t-neutral-600 animate-spin" />
                        구글 연결 중...
                    </>
                ) : (
                    <>
                        <GoogleIcon size={18} />
                        Google로 로그인
                    </>
                )}
            </button>
        </div>
    )
}
