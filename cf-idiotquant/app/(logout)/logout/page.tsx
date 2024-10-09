"use client"

import Login from "@/app/(login)/login/login"
import { googleAuthenticate } from "@/lib/actions"
import { useFormState } from "react-dom"
export default function LoginPage() {
    const [errorMsgGoogle, dispatchGoogle] = useFormState(googleAuthenticate, undefined) //googleAuthenticate 관련 hook 추가
    return <>
        <form className="flex flex-col">
            <input className="w-full shadow-sm" type="text" name="username" placeholder="Username" />
            <input className="w-full shadow-sm" type="password" name="password" placeholder="Password" />
            <button className="w-full shadow-sm" type="submit">Login</button>
        </form>
        <form className="flex flex-col" action={dispatchGoogle}>
            <button>
                구글 로그인
            </button>
            <p>{errorMsgGoogle}</p>
        </form>
        <Login />
    </>
}