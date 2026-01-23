// auth.ts
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { D1Adapter } from "@auth/d1-adapter"
export const { handlers, auth, signIn, signOut } = NextAuth((req: any) => {
    // 1. context와 env가 존재하는지 안전하게 확인
    const env = (req as any)?.context?.env;

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
        trustHost: true,
    }
})