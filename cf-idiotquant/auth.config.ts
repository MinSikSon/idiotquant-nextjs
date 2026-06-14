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
        maxAge: 60 * 60 * 24, // 1일 — 이후 재로그인 필요 (기본값 30일에서 변경)
        updateAge: 60 * 60 * 24, // 1일 주기 갱신 (세션이 하루 안에서 무한 연장되지 않도록 maxAge와 동일하게)
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                console.log(`[auth.config.ts] user:`, user);
                token.id = (user as any).id;
                token.plan = (user as any).plan || "free";
                token.role = (user as any).role || "user";
                token.can_search_account = (user as any).can_search_account;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).plan = token.plan;
                (session.user as any).role = token.role;
                (session.user as any).can_search_account = token.can_search_account;
            }
            return session;
        }
    },
} satisfies NextAuthConfig;