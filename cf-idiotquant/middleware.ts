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

    if (path.startsWith("/admin")) {
        if (!isLoggedIn) return Response.redirect(new URL("/login", req.nextUrl));
        if (!isAdmin) return Response.redirect(new URL("/", req.nextUrl));
    }

    if (path.startsWith("/balance-kr") || path.startsWith("/balance-us")) {
        if (!session?.user?.can_search_account) {
            return Response.redirect(new URL("/login", req.nextUrl));
        }
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
        path === "/calculator" ||
        path === "/not-found" ||
        path === "/laboratory" ||
        path === "/ads.txt" ||
        path === "/" ||
        path === "/search" ||
        path === "/analyze"
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
