import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { D1Adapter } from "@auth/d1-adapter";

export const { handlers, auth, signIn, signOut } = NextAuth((req: any) => {
    // Cloudflare 환경 변수 및 DB 바인딩 추출
    const env = req?.context?.env || process.env;
    const db = env?.DB || env?.db; // 대문자/소문자 모두 대응

    // 1. 미들웨어 체크: req.auth가 있으면 미들웨어에서 호출된 것임
    const isMiddleware = !req?.context;

    return {
        // 💡 미들웨어가 아닐 때(즉, API 요청일 때)만 Adapter를 연결합니다.
        adapter: !isMiddleware && db ? D1Adapter(db) : undefined,
        providers: [
            Kakao({
                clientId: env?.AUTH_KAKAO_ID,
                clientSecret: env?.AUTH_KAKAO_SECRET,
            }),
        ],
        session: { strategy: "jwt" },
        callbacks: {
            async signIn({ user }) {
                // 💡 DB 바인딩이 존재하는 실제 API 요청 시점에만 실행
                if (db && user?.id) {
                    try {
                        await db.prepare(`
              INSERT OR IGNORE INTO usage_limits (userId, usageCount, maxLimit)
              VALUES (?, 0, 10)
            `).bind(user.id).run();
                    } catch (e) {
                        console.error("D1 Persistence Error:", e);
                    }
                }
                return true;
            },
            async jwt({ token, user }) {
                if (user) {
                    token.id = user.id;
                    token.plan = (user as any).plan || "free";
                }
                return token;
            },
            async session({ session, token }) {
                if (session.user) {
                    session.user.id = token.id as string;
                    (session.user as any).plan = token.plan;
                }
                return session;
            }
        },
        trustHost: true,
    };
});