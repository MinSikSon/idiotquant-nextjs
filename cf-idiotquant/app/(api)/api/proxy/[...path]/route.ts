// src/app/api/proxy/[...path]/route.ts

import { auth } from "@/auth";
import { SignJWT } from 'jose';
import { NextResponse } from "next/server";

// 로컬 테스트 시에는 아래 줄을 주석 처리하세요.
export const runtime = "edge";

// 1. 로컬 개발 환경일 때만 보안 검증 해제 (Node.js 환경용)
if (process.env.NODE_ENV === "development") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

async function handleProxy(req: Request, { params }: { params: { path: string[] } }) {
    const session = await auth();
    // if (!session) {
    //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    console.log(`[proxy/route.ts] session:`, session);
    console.log(`[proxy/route.ts] params:`, params);

    // const { searchParams } = new URL(req.url);
    // console.log(`[proxy/route.ts] searchParams:`, searchParams.toString());
    const { search } = new URL(req.url);
    console.log(`[proxy/route.ts] search:`, search);
    const path = params.path.join('/');
    console.log(`[proxy/route.ts] path:`, path);

    const backendHeaders = new Headers();
    backendHeaders.set('Content-Type', 'application/json');
    if (!!session) {
        // 1. 서버 간 인증용 S2S JWT 생성
        const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET_KEY);
        const s2sToken = await new SignJWT({
            userId: (session.user as any).id,
            role: (session.user as any).role
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('1m')
            .sign(secret);

        // 2. 백엔드로 보낼 헤더 초기화
        backendHeaders.set('Authorization', `Bearer ${s2sToken}`);

        backendHeaders.set("X-User-Id", (session.user as any).id);
        backendHeaders.set("X-User-Role", (session.user as any).role);
        backendHeaders.set("X-User-Plan", (session.user as any).plan || "free");
        // 4. (보안 팁) 백엔드와 약속한 시크릿 키가 있다면 추가
        // 백엔드는 이 키가 있는 요청만 'Proxy가 보낸 것'으로 간주함
        backendHeaders.set("X-Internal-Secret", process.env.NEXT_PUBLIC_JWT_SECRET_KEY || "");

        // 3. 클라이언트 커스텀 헤더 일괄 복사 (핵심!)
        // const CUSTOM_HEADERS = ['idiot-user-id', 'strategy-name', 'auth-context'];

        req.headers.forEach((value, key) => {
            // 소문자로 변환하여 비교 (HTTP 헤더는 대소문자를 구분하지 않음)
            // if (CUSTOM_HEADERS.includes(key.toLowerCase()))
            {
                backendHeaders.set(key, value);
            }
        });
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    const backendUrl = `${baseUrl}/${path}${search}`;
    // const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/${path}${search}`;
    // const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/${path}`;

    const fetchOptions: RequestInit = {
        method: req.method,
        headers: backendHeaders,
    };

    // 4. Body가 있는 메서드(POST, PUT 등) 처리
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const bodyText = await req.text();
        if (bodyText) fetchOptions.body = bodyText;
    }

    try {
        const response = await fetch(backendUrl, fetchOptions);
        // 백엔드의 응답 데이터 파싱
        // const data = await response.json();

        return response;
    } catch (error) {
        console.error("Proxy Error:", error);
        return NextResponse.json({ error: "Backend Connection Error" }, { status: 500 });
    }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;