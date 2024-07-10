import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const rewritePath = `${process.env.NEXT_PUBLIC_API_URL}${request.nextUrl.pathname}${request.nextUrl.search}`;

    console.log(`[Proxy]: (${request.method}) ${request.url} => ${rewritePath}`);

    let response = NextResponse.rewrite(new URL(rewritePath));

    return response;
}

export const config = {
    // matcher: ['/api/:path*'],
    matcher: ['/stock/:path*'],
};