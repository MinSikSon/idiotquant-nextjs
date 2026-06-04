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

export default function AuthButton() {
    const { data: session, status } = useSession()
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/screener")
        }
    }, [status, router])

    if (status === "loading") {
        return <div className="w-full h-12 rounded-xl bg-zinc-100 dark:bg-[#2a2a2a] animate-pulse" />
    }

    if (session) {
        return (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
                스크리너로 이동 중...
            </div>
        )
    }

    const handleLogin = async () => {
        setIsPending(true)
        try {
            await signIn("kakao", { redirectTo: "/screener" })
        } catch {
            setIsPending(false)
        }
    }

    return (
        <button
            onClick={handleLogin}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#F6DC00] active:scale-[0.98] text-[#191919] font-black text-sm py-3.5 px-5 rounded-xl transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed select-none"
        >
            {isPending ? (
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
    )
}
