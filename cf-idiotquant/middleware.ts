// // src/middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const { auth: middlewareAuth } = NextAuth(authConfig);
export async function middleware(req: NextRequest) {
    // middlewareAuth()는 내부적으로 JWT만 확인하며 DB에 접근하지 않습니다.
    const session = await middlewareAuth();
    const isLoggedIn = !!session;
    console.log(`[middleware] session:`, session, `, isLoggedIn:`, isLoggedIn);
    const isAdmin = (session?.user as any)?.role === "admin";
    console.log(`[middleware] isAdmin:`, isAdmin);


    const url = new URL(req.url);
    const path = req.nextUrl.pathname;

    console.log(`[middleware] req.url:`, req.url, `, path:`, path, `, req.nextUrl:`, req.nextUrl);
    console.log(`[middleware] path.startsWith("/_next"):`, path.startsWith("/_next")
        , `, path.startsWith("/.well-known"):`, path.startsWith("/.well-known"),
        `, path.startsWith("/images"):`, path.startsWith("/images")
    );

    // /admin 경로 접근 제어
    if (path.startsWith("/admin")) {
        if (!isLoggedIn) {
            return Response.redirect(new URL("/login", req.nextUrl));
        }
        if (!isAdmin) {
            // 관리자가 아니면 홈으로 튕겨내기
            return Response.redirect(new URL("/", req.nextUrl));
        }
    }

    if (path.startsWith("/balance-kr") || path.startsWith("/balance-us")) {
        const can_search_account = (session?.user as any)?.can_search_account;
        console.log(`[middleware] can_search_account:`, can_search_account);

        if (!can_search_account) {
            // 홈으로 보냄
            return Response.redirect(new URL("/", req.url));
        }
    }

    if (path.startsWith("/api/auth")) {
        return NextResponse.next();
    }

    if (path.startsWith("/api/proxy")) {
        return NextResponse.next();
    }

    if (
        path.startsWith("/_next")
        || path.startsWith("/.well-known")
        || path.startsWith("/images")
        || path === "/favicon.ico"
        || path === "/login"
        || path === "/calculator"
        || path === "/not-found"
        || path === "/laboratory"
    ) {
        return NextResponse.next(); // login 없이 접근 허용
    }

    if (
        path === "/"
        || path === "/search"
    ) {
        // TODO: 한국 투자 조회 가능
        console.log(`[middleware] url:`, url, `, req.url:`, req.url);
        console.log(`[middleware] path:`, path);

        return NextResponse.next(); // login 없이 접근 허용
    }

    if (!isLoggedIn) {
        console.log(`[middleware] Redirecting to /login - No Session found`);
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // console.log(`[middleware] url:`, url, `, req.url:`, req.url);
    // console.log(`[middleware] path:`, path);

    // console.log(`[middleware] req.cookies:`, req.cookies); // req.cookies == req.headers.get('cookie')
    // console.log(`[middleware] req.headers.get('authToken'):`, req.headers.get('authToken'));
    // console.log(`[middleware] req.headers.get('cookie'):`, req.headers.get('cookie'));
    // const authToken = req.cookies.get("authToken")?.value;
    // console.log(`[middleware] authToken:`, authToken, `, typeof authToken:`, typeof authToken, `, !authToken:`, !authToken);
    // if ("" == authToken || !authToken) {
    //     return NextResponse.redirect(new URL('/login', req.url))
    // }

    // const decodeJwt = await verifyJWT(authToken, process.env.NEXT_PUBLIC_JWT_SECRET_KEY);
    // console.log(`[middleware] decodeJwt:`, decodeJwt, `, typeof decodeJwt:`, typeof decodeJwt, `, !decodeJwt:`, !decodeJwt);
    // if (!decodeJwt) {
    //     return NextResponse.redirect(new URL('/login', req.url))
    // }

    return NextResponse.next();
}

export default NextAuth(authConfig).auth;

// See "Matching Paths" below to learn more
// export const config = {
//     //   matcher: '/about/:path*',
//     // matcher: ['/login/:path*'], // 보호할 라우트만
//     matcher: ['/test'], // 보호할 라우트만
//     // matcher: ['/login'], // 보호할 라우트만
// }

export const config = {
    matcher: ["/((?!api/public|login|_next/static|_next/image|favicon.ico).*)"]
};

// export const config = {
//   matcher: ['/dashboard/:path*', '/profile/:path*'], // 보호할 라우트만
// }
