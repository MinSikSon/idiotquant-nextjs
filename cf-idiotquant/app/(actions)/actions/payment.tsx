// src/app/actions/payment.ts
"use server"

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

/**
 * 사용자의 플랜을 Pro로 업그레이드하고 결제 이력을 남기는 함수
 */
export async function upgradeToPro(months: number) {
    const session = await auth();

    // 1. 인증 확인
    if (!session?.user?.id) {
        return { success: false, message: "로그인이 필요합니다." };
    }

    // 2. Cloudflare D1 바인딩 가져오기
    // Cloudflare Pages 환경에서는 process.env에 바인딩이 주입됩니다.
    const { env } = (process as any).env;
    const db = env.DB || env.db;

    if (!db) {
        return { success: false, message: "데이터베이스 연결에 실패했습니다." };
    }

    // 3. 만료일 계산 (현재 시간 + n개월)
    const now = Math.floor(Date.now() / 1000); // Unix Timestamp (초 단위)
    const expireDate = now + (months * 30 * 24 * 60 * 60);

    try {
        // 4. Batch 작업을 통해 유저 상태 변경과 결제 기록을 한 번에 처리 (원자성 보장)
        await db.batch([
            // 유저 테이블 업데이트
            db.prepare(`
        UPDATE users 
        SET plan = 'pro', 
            subscriptionStatus = 'active', 
            expiresAt = ?, 
            updatedAt = ?
        WHERE id = ?
      `).bind(expireDate, now, session.user.id),

            // 결제 이력 추가
            db.prepare(`
        INSERT INTO payments (id, userId, amount, status, orderId)
        VALUES (?, ?, ?, 'succeeded', ?)
      `).bind(
                crypto.randomUUID(),
                session.user.id,
                9900 * months, // 예시 금액
                `ORDER_${Date.now()}`
            ),

            // Pro 플랜에 맞는 사용량 제한 상향 (선택 사항)
            db.prepare(`
        UPDATE usage_limits 
        SET maxLimit = 1000 
        WHERE userId = ?
      `).bind(session.user.id)
        ]);

        // 5. 페이지 캐시 갱신 (마이페이지 등에서 바뀐 플랜을 바로 확인 가능하도록)
        revalidatePath("/profile");

        return { success: true, message: "성공적으로 프로 플랜으로 업그레이드되었습니다!" };
    } catch (error: any) {
        console.error("Upgrade Error:", error);
        return { success: false, message: "업그레이드 중 오류가 발생했습니다." };
    }
}