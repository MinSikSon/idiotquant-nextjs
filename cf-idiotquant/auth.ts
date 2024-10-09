import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import Credentials from 'next-auth/providers/credentials';
import { User } from '@/lib/definitions';
import { AdapterUser } from 'next-auth/adapters';
import Google from 'next-auth/providers/google';

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        }),
        Credentials({
            async authorize(credentials) {
                console.log(`*** [auth.ts] credentials`, credentials);
                if (credentials.id && credentials.password) {
                    // 백엔드에서 로그인 처리
                    // let loginRes = await backendLogin(credentials.id, credentials.password)
                    let loginRes = {
                        success: true,
                        data: {
                            user: {
                                ID: "user1",
                                NAME: "홍길동",
                                EMAIL: "email@email.email",
                            },
                        }
                    }
                    // 로그인 실패 처리
                    if (!loginRes.success) return null;
                    // 로그인 성공 처리
                    const user = {
                        id: loginRes.data.user.ID ?? '',
                        name: loginRes.data.user.NAME ?? '',
                        email: loginRes.data.user.EMAIL ?? '',
                    } as User;
                    return user;
                }
                return null;
            },
        })
    ],
    callbacks: {
        async session({ session, token, user }) {
            session.user = token.user as AdapterUser
            return session;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.user = user;
            }
            if (trigger === "update" && session) {
                token = { ...token, user: session }
                return token;
            };
            return token;
        },

    },
});