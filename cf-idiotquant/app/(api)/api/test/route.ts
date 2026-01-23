// src/app/api/test/route.ts
import { NextResponse } from "next/server";

// 💡 중요: Cloudflare에서 실행하려면 Edge Runtime을 반드시 명시해야 합니다.
export const runtime = "edge";

export async function GET(req: Request) {
    try {
        // 1. Cloudflare D1 바인딩 가져오기
        // Next.js on Cloudflare는 (req as any).context.env 에 바인딩을 주입합니다.
        const { env } = (req as any).context;
        const db = env.db; // wrangler.toml에서 설정한 이름

        if (!db) {
            return NextResponse.json({ error: "DB binding not found" }, { status: 500 });
        }

        // 2. D1 쿼리 실행 (예: 'users' 테이블 전체 조회)
        // prepare()와 all()을 사용하여 데이터를 가져옵니다.
        const { results } = await db.prepare("SELECT * FROM users LIMIT 10").all();

        // 3. 성공 응답
        return NextResponse.json({
            message: "D1 connection success!",
            data: results
        });

    } catch (error: any) {
        console.error("D1 Error:", error);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message
        }, { status: 500 });
    }
}