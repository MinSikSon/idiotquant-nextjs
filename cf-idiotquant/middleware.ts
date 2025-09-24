// // src/middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWT } from './lib/jwt';
// import { decodeJWT } from '@/lib/jwt' // jwt.verify 래퍼 함수


// This function can be marked `async` if using `await` inside
// export async function middleware(request: NextRequest) {
//     const token = request.cookies.get('access_token')?.value
//     console.log(`[middleware] request.url:`, request.url);
//     console.log(`[middleware] token:`, token);
//     return NextResponse.redirect(new URL('/', request.url))
// }

export async function middleware(req: NextRequest) {
    const url = new URL(req.url);
    const path = req.nextUrl.pathname;

    if (
        path.startsWith("/_next")
        || path.startsWith("/.well-known")
        || path.startsWith("/images")
        || path === "/favicon.ico"
        || path === "/login"
        || path === "/calculator"
    ) {
        return NextResponse.next(); // login 없이 접근 허용
    }
    if (
        path === "/"
        || path === "/search"
        || path === "/search-kr"
        || path === "/search-us"
    ) {
        // TODO: 한국 투자 조회 가능
        console.log(`[middleware] url:`, url, `, req.url:`, req.url);
        console.log(`[middleware] path:`, path);

        return NextResponse.next(); // login 없이 접근 허용
    }

    console.log(`[middleware] url:`, url, `, req.url:`, req.url);
    console.log(`[middleware] path:`, path);

    // console.log(`[middleware] req.cookies:`, req.cookies); // req.cookies == req.headers.get('cookie')
    // console.log(`[middleware] req.headers.get('authToken'):`, req.headers.get('authToken'));
    // console.log(`[middleware] req.headers.get('cookie'):`, req.headers.get('cookie'));
    const authToken = req.cookies.get("authToken")?.value;
    console.log(`[middleware] authToken:`, authToken, `, typeof authToken:`, typeof authToken, `, !authToken:`, !authToken);
    if ("" == authToken || !authToken) {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    const decodeJwt = await verifyJWT(authToken, process.env.NEXT_PUBLIC_JWT_SECRET_KEY);
    console.log(`[middleware] decodeJwt:`, decodeJwt, `, typeof decodeJwt:`, typeof decodeJwt, `, !decodeJwt:`, !decodeJwt);
    if (!decodeJwt) {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    // const payload = decodeJwt.payload;
    // console.log(`[middleware] payload:`, payload, `, typeof payload:`, typeof payload, `, !!payload`, !!payload, `, 'undefined' === payload`, 'undefined' === payload);
    // if (!payload || 'undefined' === payload) {
    //     return NextResponse.next();
    // }

    // const kakaoId = payload.id;
    // console.log(`[middleware] kakaoId:`, kakaoId);
    // if (!kakaoId) {
    //     return NextResponse.next();
    // }
    // // if (!cf_token) return NextResponse.next();

    // const kakaoNickName = payload.properties?.nickname;
    // console.log(`[middleware] kakaoNickName:`, kakaoNickName);
    // if (!kakaoNickName) {
    //     return NextResponse.next();
    // }

    const res = NextResponse.next();
    // const res = NextResponse.redirect(new URL('/login', req.url))

    // res.headers.set('x-user-id', kakaoId);
    // res.headers.set('x-user-nickname', kakaoNickName);

    // console.log(`[middleware] res.headers:`, res.headers);

    // const payload = await generateJWT(cf_token, process.env.NEXT_PUBLIC_JWT_SECRET_KEY);
    // console.log(`[middleware] payload:`, payload);
    // if (!payload) return NextResponse.redirect(new URL('/login', req.url))

    // payload에서 user 정보 저장 (req.nextUrl이나 request header에 넣어 SSR에서 사용 가능)
    // const jsonPayload = JSON.parse(payload as string);
    // res.headers.set('x-user-id', jsonPayload.id);
    // res.headers.set('x-user-nickname', jsonPayload.name);
    // console.log(`[middleware] jsonPayload:`, jsonPayload);
    return res;
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
