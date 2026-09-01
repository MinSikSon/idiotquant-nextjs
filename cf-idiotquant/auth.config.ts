import type { NextAuthConfig } from "next-auth"
import Kakao from "next-auth/providers/kakao"
import Google from "next-auth/providers/google"

export const authConfig = {
    providers: [
        Kakao({
            clientId: process.env.AUTH_KAKAO_ID,
            clientSecret: process.env.AUTH_KAKAO_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        // 카카오가 없는 사람(과 회사 계정을 쓰는 사람)에게 문이 하나뿐이었다.
        //
        // `allowDangerousEmailAccountLinking` 은 카카오와 **같은 값**이어야 한다. 한쪽만
        // 켜 두면 같은 이메일로 두 번째 제공자를 눌렀을 때 로그인이 통째로 막힌다
        // (OAuthAccountNotLinked). 켜 둔 이상 이메일이 곧 계정 열쇠이므로, 두 제공자
        // 모두 이메일을 검증해 주는 곳이어야 한다 — 카카오·구글 다 그렇다.
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
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
        // 재가입 쿨다운: 최근 탈퇴한 계정은 일정 기간 가입 차단.
        //
        // **지금 워커가 실제로 막는 것은 카카오뿐이다.** 그 엔드포인트가 `kakaoId` 하나로
        // 조회하기 때문이다. 여기서는 제공자와 계정 식별자를 함께 보내 둔다 — 워커가
        // `provider`/`providerAccountId`(또는 이메일)로 조회하도록 바뀌는 날, 이 파일은
        // 안 고쳐도 구글까지 함께 막힌다. 그 전까지 구글은 조회할 열쇠가 없어 통과한다.
        async signIn({ account, user }) {
            if (account?.providerAccountId) {
                try {
                    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
                    const res = await fetch(`${base}/user/withdraw-status`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            // 옛 이름 — 워커가 아직 이 키로 읽는다. 카카오일 때만 채운다.
                            kakaoId: account.provider === "kakao" ? account.providerAccountId : undefined,
                            provider: account.provider,
                            providerAccountId: account.providerAccountId,
                            email: user?.email ?? undefined,
                        }),
                    });
                    if (res.ok) {
                        const data: any = await res.json();
                        if (data?.blocked) {
                            // string 반환 시 해당 URL로 리다이렉트 (가입 거부)
                            return `/login?error=withdraw_cooldown&days=${data.remainingDays ?? 30}`;
                        }
                    }
                } catch (e) {
                    // fail-open: 백엔드 장애 시 정상 사용자 가입을 막지 않음
                    console.error("[signIn] withdraw-status check failed:", e);
                }
            }
            return true;
        },
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