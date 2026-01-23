import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { D1Adapter } from "@auth/d1-adapter";

export const { handlers, auth, signIn, signOut } = NextAuth((req: any) => {
    // 1. 모든 경로를 통해 env 확보 시도
    const env = req?.context?.env || (process as any).env;
    const db = env?.DB || env?.db;

    // 💡 상세 로그 추가 (데이터가 안 들어올 때 원인 파악용)
    console.log("--- Auth Debug Logic ---");
    console.log("Path:", req?.nextUrl?.pathname);
    console.log("DB Binding Type:", typeof db);
    console.log("Is Adapter assigned?:", !!db);
    console.log("------------------------");

    return {
        // 어댑터를 조건부 없이 일단 db가 있으면 할당
        adapter: db ? D1Adapter(db) : undefined,
        providers: [
            Kakao({
                clientId: env?.AUTH_KAKAO_ID,
                clientSecret: env?.AUTH_KAKAO_SECRET,
            }),
        ],
        session: { strategy: "jwt" },
        callbacks: {
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
        events: {
            async createUser({ user }) {
                console.log("!!! createUser Event Triggered !!!", user.id);
                if (db) {
                    try {
                        const res = await db.prepare(`
                          INSERT OR IGNORE INTO usage_limits (userId, usageCount, maxLimit)
                          VALUES (?, 0, 10)
                        `).bind(user.id).run();
                        console.log("D1 Success:", res);
                    } catch (e) {
                        console.error("D1 Insert Error:", e);
                    }
                } else {
                    console.error("DB Binding lost in createUser event");
                }
            }
        },
        trustHost: true,
    };
});