// src/app/api/proxy/[...path]/route.ts

import { auth } from "@/auth";
import { SignJWT } from 'jose';
import { NextResponse } from "next/server";

// 1. 로컬 개발 환경 보안 검증 해제
if (process.env.NODE_ENV === "development") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// 제외할 헤더 목록
const EXCLUDED_HEADERS = [
    'host', 
    'connection', 
    'content-length', 
    'transfer-encoding', 
    'content-encoding',
    'accept-encoding'
];

/**
 * Next.js 15/16 대응 Proxy Handler
 * params는 이제 Promise 형태로 전달됩니다.
 */
async function handleProxy(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        // [핵심] Next.js 15+ 에서는 params를 반드시 await 해야 합니다.
        const resolvedParams = await params;
        const pathArray = resolvedParams?.path || [];
        const path = pathArray.join('/');

        const session = await auth();
        const { search } = new URL(req.url);

        console.log(`[proxy/route.ts] path:`, path);
        console.log(`[proxy/route.ts] session:`, session?.user ? "Authenticated" : "Guest");

        // 1. 백엔드로 보낼 헤더 구성
        const backendHeaders = new Headers();
        req.headers.forEach((value, key) => {
            if (!EXCLUDED_HEADERS.includes(key.toLowerCase())) {
                backendHeaders.set(key, value);
            }
        });

        // 압축 평문 요청 및 JSON 명시
        backendHeaders.set('accept-encoding', 'identity');
        backendHeaders.set('Content-Type', 'application/json');

        // 2. 인증 세션이 있는 경우 S2S 토큰 및 유저 정보 주입
        if (session?.user) {
            const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET_KEY);
            const s2sToken = await new SignJWT({
                userId: (session.user as any).id,
                role: (session.user as any).role
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setExpirationTime('1m')
                .sign(secret);

            backendHeaders.set('Authorization', `Bearer ${s2sToken}`);
            backendHeaders.set("X-User-Id", (session.user as any).id);
            backendHeaders.set("X-User-Role", (session.user as any).role);
            backendHeaders.set("X-Internal-Secret", process.env.NEXT_PUBLIC_JWT_SECRET_KEY || "");
        }

        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
        const backendUrl = `${baseUrl}/${path}${search}`;

        // 3. Fetch 옵션 설정
        const method = req.method;
        const fetchOptions: RequestInit = {
            method,
            headers: backendHeaders,
            // @ts-ignore
            duplex: 'half'
        };

        // GET/HEAD가 아닐 때만 body 처리
        if (!['GET', 'HEAD'].includes(method)) {
            const bodyText = await req.text();
            if (bodyText) {
                fetchOptions.body = bodyText;
            }
        }

        const response = await fetch(backendUrl, fetchOptions);

        // 4. 응답 헤더 정리 (브라우저 디코딩 오류 방지)
        const newResponseHeaders = new Headers(response.headers);
        newResponseHeaders.delete('content-encoding');
        newResponseHeaders.delete('content-length');

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newResponseHeaders,
        });

    } catch (error) {
        console.error("Proxy Error:", error);
        return NextResponse.json(
            { error: "Backend Connection Error", details: error instanceof Error ? error.message : String(error) }, 
            { status: 500 }
        );
    }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;