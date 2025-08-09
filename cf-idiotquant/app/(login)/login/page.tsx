"use client"

import Login from "@/app/(login)/login/login"
import { googleAuthenticate } from "@/lib/actions"
import { Button } from "@material-tailwind/react"
import { useFormState } from "react-dom"

import { usePathname } from "next/navigation";

export default function LoginPage() {
    const [errorMsgGoogle, dispatchGoogle] = useFormState(googleAuthenticate, undefined) //googleAuthenticate 관련 hook 추가
    const pathName = usePathname();
    return <>
        <Login parentUrl={pathName} />
        {/* <form className="mt-16 mx-0 flex items-center justify-center rounded-sm w-full" action={dispatchGoogle}>
            <Button
                size="lg"
                // variant="outlined"
                color="white"
                className="flex items-center gap-3"
            >
                <img className="h-6 w-6" src="https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA" />
                continue with google
            </Button>
            <p>{errorMsgGoogle}</p>
        </form> */}
    </>
}