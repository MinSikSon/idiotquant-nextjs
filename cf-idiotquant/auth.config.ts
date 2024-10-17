import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            console.log(`*** [${__filename}][auth.config.ts] callbacks - authorized`);
            const isLoggedIn = !!auth?.user;
            console.info(`*** auth: ${auth}, nextUrl: ${nextUrl}`);
            console.info(`*** auth:`, auth);
            console.info(`*** isLoggedIn:`, isLoggedIn);

            console.info(`*** nextUrl:`, nextUrl);
            const isOnProtected = !(nextUrl.pathname.startsWith('login'));
            console.info(`*** isOnProtected:`, isOnProtected);

            if (isOnProtected) {
                return true;
                // return (isLoggedIn) ? true : false; // NOTE: login 무조건 하게 만드는 동작
            }

            console.info(`*** isLoggedIn:`, isLoggedIn);
            if (isLoggedIn) {
                return Response.redirect(new URL('/', nextUrl));
            }

            return true;
        },
    },
    providers: [
    ],
    secret: process.env.AUTH_SECTET
} satisfies NextAuthConfig;