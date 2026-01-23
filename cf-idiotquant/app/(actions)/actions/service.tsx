// src/app/actions/service.ts
"use server"

import { auth } from "@/auth";

export async function useCoreService() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("로그인 필요");

    // Cloudflare 환경 변수 접근 (App Router 환경)
    const { env } = (process as any).env;
    const db = env.db;

    // 1. 현재 사용량 및 제한 확인
    const limitInfo = await db.prepare(
        "SELECT usageCount, maxLimit FROM usage_limits WHERE userId = ?"
    ).bind(session.user.id).first();

    if (limitInfo.usageCount >= limitInfo.maxLimit) {
        return { success: false, message: "사용 횟수를 초과했습니다. 플랜을 업그레이드 하세요!" };
    }

    // 2. 사용량 1 증가
    await db.prepare(
        "UPDATE usage_limits SET usageCount = usageCount + 1 WHERE userId = ?"
    ).bind(session.user.id).run();

    return { success: true, data: "서비스 결과값..." };
}