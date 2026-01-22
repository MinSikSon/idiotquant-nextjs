// auth.ts
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { D1Adapter } from "@auth/d1-adapter"

export const { handlers, auth, signIn, signOut } = NextAuth((req) => {
    // Cloudflare Pages 배포 환경에서 전달되는 env
    // const env = (req as any).context?.env;

    // 1순위: Cloudflare 배포 환경의 db 바인딩
    // 2순위: 로컬 환경(wrangler)의 process.env.db
    // console.log(`❌❌ env?.db`, env?.db);
    // const db = env?.db || (process.env as any).db;
    // const db = env?.db;

    // if (!db) {
    //     console.error("❌ 데이터베이스 바인딩 'db'를 찾을 수 없습니다.");
    // }

    return {
        ...authConfig,
        adapter: D1Adapter(process.env.db),
        trustHost: true, // immutable 에러 완화
    }
})