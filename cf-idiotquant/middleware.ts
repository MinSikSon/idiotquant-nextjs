// // src/middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWT } from './lib/jwt';

import { auth } from "@/auth" // 👈 Auth.js의 auth 함수를 가져옵니다.

export async function middleware(req: NextRequest) {
    const url = new URL(req.url);
    const path = req.nextUrl.pathname;

    console.log(`[middleware] req.url:`, req.url, `, path:`, path);
    console.log(`[middleware] path.startsWith("/_next"):`, path.startsWith("/_next")
        , `, path.startsWith("/.well-known"):`, path.startsWith("/.well-known"),
        `, path.startsWith("/images"):`, path.startsWith("/images")
    );


    const session = await auth();
    const isLoggedIn = !!session;
    console.log(`[middleware] session:`, session, `, isLoggedIn:`, isLoggedIn);

    if (path.startsWith("/api/auth")) {
        // || path === "/api/auth/providers"
        // || path === "/api/auth/csrf"
        // || path === "/api/auth/signin/kakao"
        // || path === "/api/auth/callback/kakao"
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
