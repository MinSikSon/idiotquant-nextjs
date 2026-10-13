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

/** 홈과 로그인 화면이 같은 제공자 버튼의 크기·모서리·로딩 상태를 공유한다. */
function ProviderAuthButton({ provider, pending, onClick, label }: {
    provider: Exclude<Pending, null>
    pending: Pending
    onClick: () => void
    label: string
}) {
    const google = provider === "google"
    const loading = pending === provider
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={pending !== null}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${google
                ? "border border-neutral-300 bg-white text-[#1f1f1f] hover:bg-neutral-50"
                : "bg-[#FEE500] text-[#191919] hover:bg-[#F6DC00]"}`}
        >
            {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                : google ? <GoogleIcon size={18} /> : <KakaoIcon size={18} />}
            {loading ? `${google ? "Google" : "카카오"} 연결 중...` : label}
        </button>
    )
}

export function StartAuthButtons({ callbackUrl = "/screener" }: { callbackUrl?: string }) {
    const [pending, setPending] = useState<Pending>(null)

    const handleStart = async (provider: Exclude<Pending, null>) => {
        setPending(provider)
        try {
            await signIn(provider, { redirectTo: callbackUrl })
        } catch {
            setPending(null)
        }
    }

    return (
        <div className="grid w-full gap-2 sm:grid-cols-2">
            <ProviderAuthButton provider="google" pending={pending} onClick={() => handleStart("google")} label="Google 계정으로 시작하기" />
            <ProviderAuthButton provider="kakao" pending={pending} onClick={() => handleStart("kakao")} label="카카오 계정으로 시작하기" />
        </div>
    )
}

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
        return <div className="w-full h-12 rounded-xl bg-neutral-200 dark:bg-surface-dark-elevated animate-pulse" />
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

    // 연결 중에는 두 제공자 버튼을 함께 잠근다.
    return (
        <div className="flex flex-col gap-2">
            <ProviderAuthButton provider="kakao" pending={pending} onClick={() => handleLogin("kakao")} label="카카오로 로그인" />
            <ProviderAuthButton provider="google" pending={pending} onClick={() => handleLogin("google")} label="Google로 로그인" />
        </div>
    )
}
