"use client"

import { usePathname } from "next/navigation";
import Login from "./login";
import LoadKakaoTotal from "@/components/loadKakaoTotal";

export default function LoginPage() {
    // const [errorMsgGoogle, dispatchGoogle] = useFormState(googleAuthenticate, undefined) //googleAuthenticate 관련 hook 추가
    const pathName = usePathname();
    return <>
        <Login parentUrl={pathName} />
        <LoadKakaoTotal />
    </>
}