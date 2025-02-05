"use client"

import { postWebSocket } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { useAppDispatch } from "@/lib/hooks";
import React from "react";

export default function OpenApi() {
    const dispatch = useAppDispatch();

    React.useEffect(() => {
        // login check ?
        dispatch(postWebSocket());
    }, []);

    return <>
        OpenApi
    </>
}
