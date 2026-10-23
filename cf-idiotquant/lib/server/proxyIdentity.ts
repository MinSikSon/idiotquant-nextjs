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
    if (!secret) throw new ProxyIdentityError(503, '인증 서비스 설정을 확인 중입니다. 잠시 후 다시 시도해 주세요.');

    const token = await new SignJWT({ userId: user.id, role: user.role ?? 'user' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1m')
        .sign(new TextEncoder().encode(secret));
    headers.set('authorization', `Bearer ${token}`);
    return headers;
}
