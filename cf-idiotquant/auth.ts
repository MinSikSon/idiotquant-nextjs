import NextAuth from "next-auth";
import { D1Adapter } from "@auth/d1-adapter";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth((req: any) => {
    // 1. 모든 경로를 통해 env 확보 시도
    const env = req?.context?.env || (process as any).env;
    const node_env = env?.NODE_ENV;
    const db = env?.DB || env?.db;

    // 💡 상세 로그 추가 (데이터가 안 들어올 때 원인 파악용)
    console.log("--- Auth Debug Logic ---");
    console.log("Path:", req?.nextUrl?.pathname);
    console.log(`node_env:`, node_env);
    console.log("DB Binding Type:", typeof db);
    console.log("Is Adapter assigned?:", db, !!db, env?.DB, env?.db);
    console.log("------------------------");

    // 💡 중요: 환경 변수가 제대로 안 읽힐 경우를 대비해 로그 출력
    if (!env?.AUTH_SECRET) {
        console.error("CRITICAL: AUTH_SECRET is missing from environment!");
    }

    return {
        ...authConfig,
        secret: env?.AUTH_SECRET, // 💡 명시적 주입
        trustHost: true,
        basePath: "/api/auth",
        adapter: db && "development" != node_env ? D1Adapter(db) : undefined,

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
    };
});