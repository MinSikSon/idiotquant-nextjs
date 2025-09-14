"use client"

import dynamic from 'next/dynamic';

const Login = dynamic(() => import('@/app/(login)/login/login'));
// import Login from "@/app/(login)/login/login"
// import { googleAuthenticate } from "@/lib/actions"
// import { useFormState } from "react-dom"

import { usePathname } from "next/navigation";

export default function LoginPage() {
    // const [errorMsgGoogle, dispatchGoogle] = useFormState(googleAuthenticate, undefined) //googleAuthenticate 관련 hook 추가
    const pathName = usePathname();
    return <>
        <Login parentUrl={pathName} />
    </>
}