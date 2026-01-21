"use client"
import UserPage from "@/app/(user)/user/page"
import { useSession, signIn } from "next-auth/react"
import { useState } from "react"

export default function AuthButton() {
    const { data: session, status } = useSession()
    // 직접 클릭했을 때의 로딩 상태 관리
    const [isPending, setIsPending] = useState(false)

    // 세션 로딩 중이거나 사용자가 버튼을 이미 눌렀을 때 true
    const isLoading = status === "loading" || isPending

    // 1. 세션 로딩 중 (스켈레톤 UI)
    if (status === "loading") {
        return (
            <div className="mx-auto w-full max-w-sm rounded-md border border-gray-200 p-4">
                <div className="flex animate-pulse space-x-4">
                    <div className="size-10 rounded-full bg-gray-200"></div>
                    <div className="flex-1 space-y-6 py-1">
                        <div className="h-2 rounded bg-gray-200"></div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 h-2 rounded bg-gray-200"></div>
                                <div className="col-span-1 h-2 rounded bg-gray-200"></div>
                            </div>
                            <div className="h-2 rounded bg-gray-200"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // 2. 로그인 완료 상태
    if (session) {
        return <UserPage />
    }

    // 3. 로그인 미완료 상태 (로그인 버튼)
    const handleLogin = async () => {
        setIsPending(true)
        try {
            await signIn("kakao", { redirectTo: "/" })
        } catch (error) {
            console.error("Login failed:", error)
            setIsPending(false) // 실패 시 다시 버튼 활성화
        }
    }

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md flex flex-col items-center">
            <button
                onClick={handleLogin}
                disabled={isLoading}
                className={`
                    w-full bg-[#FEE500] text-[#191919] px-4 py-3 rounded-md font-bold
                    transition-all duration-200
                    ${isLoading
                        ? "opacity-50 cursor-not-allowed scale-[0.98]"
                        : "hover:bg-[#FADA0A] active:scale-95 shadow-sm hover:shadow-md"
                    }
                `}
            >
                {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        카카오 인증 연결 중...
                    </span>
                ) : (
                    "카카오로 로그인하기"
                )}
            </button>

            {/* 로그인 안내 문구 추가 (선택사항) */}
            <p className="mt-4 text-xs text-gray-400">
                1초 만에 가입하고 모든 기능을 이용해 보세요.
            </p>
        </div>
    )
}