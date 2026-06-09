// src/app/api/proxy/[...path]/route.ts

export const runtime = 'edge';

import { auth } from "@/auth";
import { SignJWT } from 'jose';
import { NextResponse } from "next/server";

if (process.env.NODE_ENV === "development") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const EXCLUDED_HEADERS = [
    'host', 
    'connection', 
    'content-length', 
    'transfer-encoding', 
    'content-encoding',
    'accept-encoding'
];

async function handleProxy(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const resolvedParams = await params;
        const pathArray = resolvedParams?.path || [];
        const path = pathArray.join('/');

        const session = await auth();
        const urlObj = new URL(req.url);

        // 💡 [핵심 교정 1]: Next.js가 [...path] 구조 때문에 searchParams에 강제로 주입한 path 쿼리 제거
        urlObj.searchParams.delete("path");

        const method = req.method;
        const isGetOrHead = ['GET', 'HEAD'].includes(method);

        // 순수 파라미터 추출 및 정제
        const PDNO = urlObj.searchParams.get("PDNO") || "";
        const rawAction = urlObj.searchParams.get("buyOrSell") || "";
        const ORD_QTY = urlObj.searchParams.get("ORD_QTY") || "1";
        const normalizedAction = rawAction.toLowerCase().includes("buy") ? "buy" : "sell";

        // 주소창 값 표준화 업데이트 (GET 요청일 때만 쿼리 파라미터 유지)
        if (urlObj.searchParams.has("buyOrSell")) {
            urlObj.searchParams.set("buyOrSell", normalizedAction);
        }

        // 💡 [추가 보정]: POST 주문 요청일 경우 URL에 주문 정보가 중복 노출되어 한투 게이트웨이 파서와 충돌하는 것을 방지
        if (!isGetOrHead) {
            urlObj.searchParams.delete("PDNO");
            urlObj.searchParams.delete("buyOrSell");
            urlObj.searchParams.delete("ORD_QTY");
        }

        const search = urlObj.search;

        // 2. 백엔드로 보낼 헤더 구성
        const backendHeaders = new Headers();
        req.headers.forEach((value, key) => {
            if (!EXCLUDED_HEADERS.includes(key.toLowerCase())) {
                backendHeaders.set(key, value);
            }
        });

        backendHeaders.set('accept-encoding', 'identity');
        backendHeaders.set('Content-Type', 'application/json');

        // 3. 인증 세션 바인딩
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

        const fetchOptions: RequestInit = {
            method,
            headers: backendHeaders,
        };

        // 💡 [핵심 교정 2]: 스트림 소비 분리 및 한투 API 스키마 단일화 최적화
        if (!isGetOrHead) {
            let incomingBody = {};
            try {
                // ⚠️ Edge 환경 크래시 방지를 위해 비-GET문 스코프 내에서만 정확히 스트림 텍스트 파싱을 실행합니다.
                const text = await req.text();
                if (text) {
                    incomingBody = JSON.parse(text);
                }
            } catch (e) {
                console.warn("[Proxy Request] Body parsing pass or plain text detected.");
            }

            // 한투와 Cloudflare가 공통으로 기대하는 Payload 스키마 단일화 병합
            const finalBody = {
                PDNO: PDNO || (incomingBody as any).PDNO || (incomingBody as any).pdno,
                buyOrSell: normalizedAction || (incomingBody as any).buyOrSell,
                ORD_QTY: ORD_QTY || (incomingBody as any).ORD_QTY || (incomingBody as any).ord_qty || "1",
                ...incomingBody
            };

            fetchOptions.body = JSON.stringify(finalBody);
            console.log(`[Proxy Clean POST Body Payload]`, fetchOptions.body);
        }

        console.log(`[Proxy Fetch Execution] Target: ${backendUrl} [Method: ${method}]`);
        const response = await fetch(backendUrl, fetchOptions);

        const newResponseHeaders = new Headers(response.headers);
        // 응답 본문 가공 및 압축 해제 전달을 위해 압축 관련 메타 헤더 제거
        newResponseHeaders.delete('content-encoding');
        newResponseHeaders.delete('content-length');

        if (response.status >= 500) {
            const errText = await response.text();
            console.error(`[Proxy 500 Error Origin Response From Worker]:`, errText);
            return new NextResponse(errText, {
                status: response.status,
                headers: newResponseHeaders
            });
        }

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newResponseHeaders,
        });

    } catch (error) {
        console.error("Proxy Fatal Error:", error);
        return NextResponse.json(
            { error: "Backend Connection Error", details: error instanceof Error ? error.message : String(error) }, 
            { status: 500 }
        );
    }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;