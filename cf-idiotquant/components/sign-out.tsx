"use client"
import { signOut } from "next-auth/react"

export default function KakaoSignOut() {
    return (
        <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="bg-gray-200 text-[#191919] px-4 py-2 rounded-md font-bold hover:!bg-gray-300 transition-colors"
        >
            로그아웃
        </button>
    )
}