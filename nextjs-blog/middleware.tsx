import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // console.log(`[middleware] request`, request);
    // console.log(`[middleware] request.nextUrl`, request.nextUrl);

    // const search = (!!!request.nextUrl.search) ? `` : `${request.nextUrl.search}`;
    const rewritePath = `${process.env.NEXT_PUBLIC_API_URL}${request.nextUrl.pathname}${request.nextUrl.search}`;

    console.log(`[Proxy]: ${request.url} => ${rewritePath}`);

    let response = NextResponse.rewrite(new URL(rewritePath));

    return response;
}

export const config = {
    // matcher: ['/api/:path*'],
    matcher: ['/stock/:path*'],
};