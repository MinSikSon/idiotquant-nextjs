import NextAuth from "next-auth";
import { D1Adapter } from "@auth/d1-adapter";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth((req: any) => {
    // 1. 모든 경로를 통해 env 확보 시도
    const env = req?.context?.env || (process as any).env;
    const node_env = env?.NODE_ENV;
    const db = env?.DB || env?.db;

    // 이 블록은 요청마다 돈다 — 다섯 줄짜리 디버그를 남겨두면 로그가 그것만으로 찬다.
    // 게다가 db 바인딩 객체를 통째로 찍고 있었다. 정말 알아야 할 것(설정이 빠졌는가)만
    // 아래에서 오류로 남긴다.
    if (!db && node_env !== "development") {
        console.error("CRITICAL: D1 binding is missing — 세션이 저장되지 않습니다.");
    }

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
                if (db) {
                    try {
                        // user.id 를 로그에 남기지 않는다 — 그 값이 곧 그 사람의 가계부 주소다.
                        await db.prepare(`
                          INSERT OR IGNORE INTO usage_limits (userId, usageCount, maxLimit)
                          VALUES (?, 0, 10)
                        `).bind(user.id).run();
                    } catch (e) {
                        console.error("D1 Insert Error:", e);
                    }
                } else {
                    console.error("DB Binding lost in createUser event");
                }
            },
            async signIn({ user }) {
                if (db && user.id) {
                    try {
                        await db.prepare("UPDATE users SET lastLoginAt = ? WHERE id = ?")
                            .bind(Math.floor(Date.now() / 1000), user.id)
                            .run();
                    } catch (e) {
                        console.error("D1 lastLoginAt update error:", e);
                    }
                }
            },
        },
    };
});