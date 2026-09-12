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
        // 게임은 로그인 없이 굴러간다. 진행은 localStorage 에만 쌓이므로 계정이
        // 필요 없고, 계정을 요구하면 "한 판 해 보고 정한다" 가 막힌다.
        //
        // **`/game` 아래는 통째로 연다.** 예전에는 경로를 하나씩 적었는데, 그러다
        // `/game/imf` 로 옛 게임을 옮기면서 세 줄이 한꺼번에 죽었다 — 화면은 멀쩡히
        // 링크를 걸어 두고 누르면 로그인으로 튕겼다. 게임 페이지를 하나 더 만들 때마다
        // 이 목록을 고쳐야 한다는 것을 아무도 기억하지 못한다.
        path === "/game" ||
        path.startsWith("/game/")
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
