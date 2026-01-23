// auth.ts
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { D1Adapter } from "@auth/d1-adapter"
export const { handlers, auth, signIn, signOut } = NextAuth((req: any) => {
    // 1. context와 env가 존재하는지 안전하게 확인
    const env = (req as any)?.context?.env;
    const db = env?.db;

    // 💡 로그로 현재 환경 확인
    console.log("--- Cloudflare Context Check ---");
    console.log("Is Context available?:", !!(req as any)?.context);
    console.log("Is Env available?:", !!env);
    console.log("Is D1 Binding (db) available?:", !!env?.db);
    console.log("---------------------------------");

    // 2. env나 env.db가 없다면 어댑터 없이 기본 설정만 반환 (Middleware 대응)
    if (!env || !db) {
        return {
            ...authConfig,
            trustHost: true,
        }
    }

    // 3. DB가 있는 환경(Route Handler 등)에서만 어댑터 적용
    return {
        ...authConfig,
        adapter: D1Adapter(db),
        callbacks: {
            // 1. JWT에 D1의 추가 정보(plan 등)를 담습니다.
            async jwt({ token, user }) {
                if (user) {
                    token.id = user.id;
                    // @ts-ignore (D1Adapter가 users 테이블에서 가져온 plan 필드)
                    token.plan = user.plan || "free";
                }
                return token;
            },
            // 2. 클라이언트 사이드에서 session.user.plan으로 접근 가능하게 합니다.
            async session({ session, token }) {
                if (session.user) {
                    session.user.id = token.id as string;
                    (session.user as any).plan = token.plan;
                }
                return session;
            },
            // 3. 최초 로그인 시 usage_limits 테이블 생성
            async signIn({ user }) {
                if (!db) return true;
                try {
                    await db.prepare(`
            INSERT OR IGNORE INTO usage_limits (userId, usageCount, maxLimit)
            VALUES (?, 0, 10)
          `).bind(user.id).run();
                    return true;
                } catch (e) {
                    console.error("usage_limits 생성 에러:", e);
                    return true;
                }
            }
        },
        trustHost: true,
    }
})