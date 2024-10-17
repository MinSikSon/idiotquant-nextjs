"use server"

import { signIn } from "../auth";
import { AuthError } from "next-auth";

export async function googleAuthenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        // await signIn('credentials', formData);
        await signIn('google');
    } catch (error) {
        if (error instanceof AuthError) {
            // return '로그인 실패'
            return '구글 로그인 실패'
        }
        throw error;
    }
}