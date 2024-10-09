// // src/middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
// export function middleware(request: NextRequest) {
//     return NextResponse.redirect(new URL('/', request.url))
// }

export default NextAuth(authConfig).auth;

// See "Matching Paths" below to learn more
export const config = {
    //   matcher: '/about/:path*',
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],

}
