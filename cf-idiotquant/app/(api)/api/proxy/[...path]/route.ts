// src/app/api/proxy/[...path]/route.ts

export const runtime = 'edge';

import { auth } from "@/auth";
import { createBackendHeaders, ProxyIdentityError } from "@/lib/server/proxyIdentity";
import { NextResponse } from "next/server";

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

        const backendHeaders = await createBackendHeaders(
            req.headers,
            session?.user as { id?: string; role?: string } | undefined,
            process.env.INTERNAL_JWT_SECRET,
        );

        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
        if (!baseUrl) return NextResponse.json(
            { success: false, error: "서버 연결 설정을 확인 중입니다." }, { status: 503 },
        );
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
        if (error instanceof ProxyIdentityError) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        console.error("Proxy Fatal Error:", error);
        return NextResponse.json(
            { success: false, error: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." },
            { status: 500 }
        );
    }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;