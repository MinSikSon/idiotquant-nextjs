"use client"

import Login from "@/app/(login)/login/login"
import { googleAuthenticate } from "@/lib/actions"
import { useFormState } from "react-dom"
export default function LoginPage() {
    const [errorMsgGoogle, dispatchGoogle] = useFormState(googleAuthenticate, undefined) //googleAuthenticate 관련 hook 추가
    return <>
        <Login />
        <form className="mt-16 flex flex items-center justify-center bg-deep-orange-50 p-1 rounded-sm" action={dispatchGoogle}>
            <img className="h-10 w-10" src="https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA" />
            <button className="pl-5">
                구글 로그인
            </button>
            <p>{errorMsgGoogle}</p>
        </form>
    </>
}