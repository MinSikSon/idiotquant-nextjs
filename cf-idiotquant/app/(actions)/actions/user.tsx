// // src/app/actions/user.ts
// "use server"

// import { auth } from "@/auth";

// export async function getUserProfile() {
//     const session = await auth();
//     if (!session?.user) return null;

//     // Auth.js의 auth() 함수가 반환하는 req.context.env를 활용하거나
//     // getRequestContext (Cloudflare 제공)를 사용합니다.

//     // 예시: 특정 테이블 조회 (D1 직접 쿼리)
//     // const result = await env.db.prepare("SELECT * FROM users WHERE id = ?").bind(session.user.id).first();

//     return session.user;
// }