"use client"
import { signIn } from "next-auth/react"

export default function KakaoSignin() {
    return (
        <button
            onClick={() => signIn("kakao", { redirectTo: "/" })}
            className="bg-[#FEE500] text-[#191919] px-4 py-2 rounded-md font-bold"
        >
            카카오로 로그인하기
        </button>
    )
}