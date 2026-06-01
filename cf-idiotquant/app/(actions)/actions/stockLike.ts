"use server";

import { auth } from "@/auth";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS stock_likes (
    user_id   TEXT    NOT NULL,
    ticker    TEXT    NOT NULL,
    is_us     INTEGER NOT NULL DEFAULT 0,
    stock_name TEXT,
    added_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (user_id, ticker),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`;

function getDb() {
  const { env } = (process as any).env;
  return env.db as any;
}

/** 관심 종목 토글 (추가/제거). 로그인 필요. */
export async function toggleStockLike(
  ticker: string,
  isUs: boolean,
  stockName?: string,
): Promise<{ success: boolean; liked: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, liked: false, message: "로그인이 필요합니다." };
  }

  const db = getDb();

  try {
    await db.prepare(CREATE_TABLE_SQL).run();

    const existing = await db
      .prepare("SELECT user_id FROM stock_likes WHERE user_id = ? AND ticker = ?")
      .bind(session.user.id, ticker)
      .first();

    if (existing) {
      await db
        .prepare("DELETE FROM stock_likes WHERE user_id = ? AND ticker = ?")
        .bind(session.user.id, ticker)
        .run();
      return { success: true, liked: false };
    } else {
      await db
        .prepare(
          "INSERT INTO stock_likes (user_id, ticker, is_us, stock_name, added_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(
          session.user.id,
          ticker,
          isUs ? 1 : 0,
          stockName ?? null,
          Math.floor(Date.now() / 1000),
        )
        .run();
      return { success: true, liked: true };
    }
  } catch (e) {
    console.error("toggleStockLike error:", e);
    return { success: false, liked: false, message: "저장 중 오류가 발생했습니다." };
  }
}

/** 로그인한 유저의 관심 종목 ticker 목록 반환. */
export async function getMyStockLikes(): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const db = getDb();

  try {
    await db.prepare(CREATE_TABLE_SQL).run();

    const result = await db
      .prepare("SELECT ticker FROM stock_likes WHERE user_id = ? ORDER BY added_at DESC")
      .bind(session.user.id)
      .all();

    return ((result.results ?? []) as any[]).map((r) => r.ticker as string);
  } catch {
    return [];
  }
}
