import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const runtime = "edge";
type D1DatabaseLike = {
    prepare: (query: string) => {
        run: () => Promise<unknown>;
        bind: (...values: unknown[]) => { first: <T>() => Promise<T | null>; run: () => Promise<unknown> };
    };
};

async function getUserAndDb(req: Request) {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    const requestEnv = (req as Request & { context?: { env?: { DB?: D1DatabaseLike; db?: D1DatabaseLike } } }).context?.env;
    const processEnv = (process as typeof process & { env: { DB?: D1DatabaseLike; db?: D1DatabaseLike } }).env;
    const db = requestEnv?.DB ?? requestEnv?.db ?? processEnv.DB ?? processEnv.db;
    return { userId, db };
}

async function ensureTable(db: D1DatabaseLike) {
    await db.prepare(`CREATE TABLE IF NOT EXISTS user_nicknames (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        nickname TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )`).run();
}

export async function GET(req: Request) {
    const { userId, db } = await getUserAndDb(req);
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    if (!db) return NextResponse.json({ error: "저장소에 연결할 수 없습니다." }, { status: 503 });
    await ensureTable(db);
    const row = await db.prepare("SELECT nickname FROM user_nicknames WHERE user_id = ?").bind(userId).first<{ nickname: string }>();
    return NextResponse.json({ nickname: row?.nickname ?? "" }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request) {
    const { userId, db } = await getUserAndDb(req);
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    if (!db) return NextResponse.json({ error: "저장소에 연결할 수 없습니다." }, { status: 503 });
    const body = await req.json().catch(() => null) as { nickname?: unknown } | null;
    const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
    if (nickname.length < 2 || nickname.length > 20 || /[\u0000-\u001f]/.test(nickname)) {
        return NextResponse.json({ error: "닉네임은 2~20자로 입력해 주세요." }, { status: 400 });
    }
    await ensureTable(db);
    await db.prepare(`INSERT INTO user_nicknames (user_id, nickname, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET nickname = excluded.nickname, updated_at = excluded.updated_at`)
        .bind(userId, nickname, Math.floor(Date.now() / 1000)).run();
    return NextResponse.json({ nickname });
}
