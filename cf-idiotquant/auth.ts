// auth.ts
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { D1Adapter } from "@auth/d1-adapter"
export const { handlers, auth, signIn, signOut } = NextAuth((req: any) => {
    // 1. context와 env가 존재하는지 안전하게 확인
    const env = (req as any)?.context?.env;

    // 💡 로그로 현재 환경 확인
    console.log("--- Cloudflare Context Check ---");
    console.log("Is Context available?:", !!(req as any)?.context);
    console.log("Is Env available?:", !!env);
    console.log("Is D1 Binding (db) available?:", !!env?.db);
    console.log("---------------------------------");

    // 2. env나 env.db가 없다면 어댑터 없이 기본 설정만 반환 (Middleware 대응)
    if (!env || !env.db) {
        return {
            ...authConfig,
            trustHost: true,
        }
    }

    // 3. DB가 있는 환경(Route Handler 등)에서만 어댑터 적용
    return {
        ...authConfig,
        adapter: D1Adapter(env.db),
        callbacks: {
            async jwt({ token, user, account }) {
                // 최초 로그인 시에만 특정 로직 수행
                if (account && user) {
                    const db = env.db;
                    try {
                        // 유저의 마지막 로그인 시간 업데이트 등 커스텀 쿼리
                        await db.prepare("UPDATE users SET lastLoginAt = ? WHERE id = ?")
                            .bind(Date.now(), user.id)
                            .run();
                    } catch (e) {
                        console.error("Custom Update Error:", e);
                    }
                }
                return token;
            },
            async session({ session, token }) {
                if (session.user) {
                    session.user.id = token.sub as string;
                }
                return session;
            }
        },
        trustHost: true,
    }
})