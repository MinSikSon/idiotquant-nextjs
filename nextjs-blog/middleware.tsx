import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    console.log(`request.nextUrl.searchParams`, request.nextUrl.searchParams);
    const rewritePath = `${process.env.NEXT_PUBLIC_API_URL}/${request.nextUrl.pathname}?${request.nextUrl.searchParams}`;

    console.log(`[Proxy]: ${request.url} => ${rewritePath}`);

    return NextResponse.rewrite(new URL(rewritePath));
}

export const config = {
    // matcher: ['/api/:path*'],
    matcher: ['/stock/:path*'],
};