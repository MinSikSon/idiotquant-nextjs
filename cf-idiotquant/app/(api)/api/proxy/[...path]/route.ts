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
        //
        // 워커는 이 Authorization 토큰을 열어보고 "누구인가"를 정한다. X-User-Id 는
        // 이제 신원이 아니다 — 워커가 검증된 값으로 덮어쓰므로, 여기서 보내는 것은
        // INTERNAL_JWT_SECRET 을 아직 넣지 않은 배포를 위한 임시 통로일 뿐이다.
        //
        // 서명 키는 서버 전용이어야 한다. 예전에 쓰던 NEXT_PUBLIC_ 이름은 Next.js 에게
        // "브라우저로 내보내라"는 뜻이라, 클라이언트 컴포넌트가 한 번만 참조해도
        // 서명 키가 방문자 번들에 실린다.
        if (session?.user) {
            const secret = process.env.INTERNAL_JWT_SECRET;

            // 키가 아직 없는 배포에서 통째로 죽지 않게 한다. 이때 워커도 시크릿이
            // 없는 상태라 예전처럼 헤더로 동작한다 — 양쪽에 키를 넣는 순간 검증이 켜진다.
            if (secret) {
                const s2sToken = await new SignJWT({
                    userId: (session.user as any).id,
                    role: (session.user as any).role
                })
                    .setProtectedHeader({ alg: 'HS256' })
                    .setExpirationTime('1m')
                    .sign(new TextEncoder().encode(secret));

                backendHeaders.set('Authorization', `Bearer ${s2sToken}`);
            } else {
                console.warn("[Proxy] INTERNAL_JWT_SECRET 미설정 — 신원 검증 없이 헤더로만 보냅니다.");
            }

            backendHeaders.set("X-User-Id", (session.user as any).id);
            backendHeaders.set("X-User-Role", (session.user as any).role);
        }

        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
        const backendUrl = `${baseUrl}/${path}${search}`;

        const fetchOptions: RequestInit = {
            method,
            headers: backendHeaders,
        };

        /* 본문은 보낸 그대로 넘긴다.
         *
         * 예전에는 여기서 모든 non-GET 본문에 PDNO·buyOrSell·ORD_QTY 를 끼워 넣고,
         * 같은 값을 쿼리에서 지웠다. 주문 경로 하나를 맞추려던 것이 가계부·계산기·
         * 관심종목 요청에까지 주문 필드를 실어 보냈고, 그래서 워커 라우트마다
         * "필요한 키만 뽑아 쓴다"는 회피 코드가 붙었다.
         *
         * 옮겨줄 필요가 없다 — 워커의 주문 라우트는 이미 본문을 먼저 보고 없으면
         * 쿼리를 본다(bodyData.PDNO || url.searchParams.get("PDNO")). 국내 주문은
         * 본문에, 해외 주문은 쿼리에 값을 싣는데 양쪽 다 그대로 도착한다.
         *
         * 방향 정규화도 걷어냈다. 여기 있던 규칙은
         *   includes("buy") ? "buy" : "sell"
         * 라서 값이 비거나 깨지면 조용히 **매도**가 됐다. 워커는 buy/sell 둘 중
         * 하나로 읽히지 않으면 주문을 거절한다 — 틀린 주문을 내는 것보다 낫다.
         */
        if (!isGetOrHead) {
            fetchOptions.body = await req.text();
        }

        // 경로와 메서드만 남긴다. 본문에는 가계부 금액·메모가, 쿼리에는 가계부 주인의
        // user id(?owner=)가 실려 있어서 그대로 찍으면 로그가 곧 사본이 된다.
        console.log(`[Proxy] ${method} /${path}`);
        const response = await fetch(backendUrl, fetchOptions);

        const newResponseHeaders = new Headers(response.headers);
        // 응답 본문 가공 및 압축 해제 전달을 위해 압축 관련 메타 헤더 제거
        newResponseHeaders.delete('content-encoding');
        newResponseHeaders.delete('content-length');

        if (response.status >= 500) {
            const errText = await response.text();
            // 워커가 무엇 때문에 죽었는지("no such table …")는 남겨야 고칠 수 있다.
            // 다만 통째로 받아 적지는 않는다 — 오류 본문에 무엇이 실릴지는 워커 사정이다.
            console.error(`[Proxy] ${method} /${path} → ${response.status}:`, errText.slice(0, 300));
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