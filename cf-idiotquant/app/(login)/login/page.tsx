"use client"

import { usePathname } from "next/navigation";
import Login from "./login";
import LoadKakaoTotal from "@/components/loadKakaoTotal";

export default function LoginPage() {
    return <>
        <Login />
    </>
}