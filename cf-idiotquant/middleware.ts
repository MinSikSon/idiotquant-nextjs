import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

// auth((req) => ...) 패턴: req.auth에 JWT 세션이 올바르게 주입됨.
// 기존 export async function + export default 이중 구조에서
// export default가 실제 미들웨어로 사용되면서 authorized 콜백 없이 모든 경로를 허용하던 버그 수정.
export default auth((req: any) => {
    const session = req.auth;
    const isLoggedIn = !!session;
    const isAdmin = session?.user?.role === "admin";
    const path: string = req.nextUrl.pathname;

    // admin 전용 페이지: 서버 단에서 차단 (페이지 코드가 비admin에게 전달되지 않음)
    const isAdminOnly =
        path.startsWith("/admin") ||
        path.startsWith("/backtest") ||
        path.startsWith("/balance");
    if (isAdminOnly) {
        if (!isLoggedIn) return Response.redirect(new URL("/login", req.nextUrl));
        if (!isAdmin) return Response.redirect(new URL("/", req.nextUrl));
    }

    if (path.startsWith("/api/auth") || path.startsWith("/api/proxy")) {
        return NextResponse.next();
    }

    if (
        path.startsWith("/_next") ||
        path.startsWith("/.well-known") ||
        path.startsWith("/images") ||
        path === "/favicon.ico" ||
        path === "/login" ||
        path === "/terms" ||
        path === "/privacy" ||
        path === "/calculator" ||
        path === "/not-found" ||
        path === "/laboratory" ||
        path === "/ads.txt" ||
        path === "/" ||
        path === "/search" ||
        // 검색엔진이 들어오는 문이다. 로그인으로 돌려보내면 색인 자체가 안 된다.
        path === "/quant" ||
        path === "/analyze" ||
        path === "/screener" ||
        // 모의투자는 로그인 없이 굴러간다. 진행은 localStorage 에만 쌓이므로 계정이
        // 필요 없고, 계정을 요구하면 "한 판 해 보고 정한다" 가 막힌다.
        path === "/game" ||
        // 도감과 이력은 게임 화면 안에서만 들어가는 문이다. 게임이 열려 있는데 그 두 곳이
        // 로그인을 요구하면 닫힌 문이 된다. 이력은 특히 **계정과 아무 상관이 없다** —
        // 쌓인 것은 이 브라우저의 localStorage 에만 있어서 서버는 애초에 모른다.
        path === "/game/cards" ||
        path === "/game/status"
    ) {
        return NextResponse.next();
    }

    if (!isLoggedIn) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', path + req.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!api/public|login|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"]
};
