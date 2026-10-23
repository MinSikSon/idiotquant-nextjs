import { SignJWT } from 'jose';

const EXCLUDED_HEADERS = new Set([
    'host', 'connection', 'content-length', 'transfer-encoding',
    'content-encoding', 'accept-encoding', 'authorization', 'cookie',
    'x-user-id', 'x-user-role',
]);

export class ProxyIdentityError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
}

export async function createBackendHeaders(
    incoming: Headers,
    user: { id?: string; role?: string } | null | undefined,
    secret: string | undefined,
): Promise<Headers> {
    const headers = new Headers();
    incoming.forEach((value, key) => {
        if (!EXCLUDED_HEADERS.has(key.toLowerCase())) headers.set(key, value);
    });
    headers.set('accept-encoding', 'identity');
    headers.set('content-type', 'application/json');
    if (!user) return headers;
    if (!user.id) throw new ProxyIdentityError(401, '세션이 만료되었습니다. 다시 로그인해 주세요.');
    if (!secret) {
        // 기존 Worker 배포와의 호환 경로. 외부 헤더는 위에서 제거했으며,
        // auth()로 검증한 서버 세션의 신원만 전달한다.
        // 양쪽에 INTERNAL_JWT_SECRET을 설정하면 아래 JWT 검증 경로를 사용한다.
        headers.set('x-user-id', user.id);
        headers.set('x-user-role', user.role ?? 'user');
        return headers;
    }

    const token = await new SignJWT({ userId: user.id, role: user.role ?? 'user' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1m')
        .sign(new TextEncoder().encode(secret));
    headers.set('authorization', `Bearer ${token}`);
    return headers;
}
