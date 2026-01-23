import type { NextAuthConfig } from "next-auth"
import Kakao from "next-auth/providers/kakao"

export const authConfig = {
    providers: [
        Kakao({
            clientId: process.env.AUTH_KAKAO_ID,
            clientSecret: process.env.AUTH_KAKAO_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    // 페이지 설정 (선택 사항)
    pages: {
        signIn: "/login", // 커스텀 로그인 페이지를 사용할 경우
    },
    session: {
        strategy: "jwt", // 🚀 DB 없이 토큰 방식으로 세션 관리
    },
} satisfies NextAuthConfig;