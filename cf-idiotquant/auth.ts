import NextAuth from "next-auth"
import Kakao from "next-auth/providers/kakao"
import { D1Adapter } from "@auth/d1-adapter"

export const { handlers, auth, signIn, signOut } = NextAuth((req) => {
    // Cloudflare 대시보드에서 설정한 D1 바인딩 이름이 'db'일 때
    const env = (req as any).context?.env;
    const db = env?.db;

    // 디버깅용 로그: 배포 후 Cloudflare 로그에서 확인 가능
    if (!db) {
        console.error("❌ D1 데이터베이스 객체를 찾을 수 없습니다. 대시보드 바인딩을 확인하세요.");
    }

    return {
        adapter: D1Adapter(db),
        providers: [
            Kakao({
                clientId: process.env.AUTH_KAKAO_ID,
                clientSecret: process.env.AUTH_KAKAO_SECRET,
            }),
        ],
        session: { strategy: "database" },
        secret: process.env.AUTH_SECRET,
        callbacks: {
            async session({ session, user }) {
                session.user.id = user.id;
                return session;
            },
        },
    }
})