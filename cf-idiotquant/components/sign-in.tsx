"use client"
import { signIn } from "next-auth/react"

export function KakaoLogin() {
    return (
        <button
            onClick={() => signIn("kakao", { redirectTo: "/dashboard" })}
            className="bg-[#FEE500] text-[#191919] px-4 py-2 rounded-md font-bold"
        >
            카카오로 로그인하기
        </button>
    )
}