import { drizzle } from "drizzle-orm/d1";

export const getDb = (env: any) => {
    // Cloudflare env.db를 Drizzle 객체로 변환
    return drizzle(env.db);
};