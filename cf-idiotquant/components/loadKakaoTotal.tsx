"use client"

import { useEffect } from "react";

import { verifyJWT } from "@/lib/jwt";
import { clearCookie, getCookie } from "./util";
import { KakaoTotal, setKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import { useAppDispatch } from "@/lib/hooks";

const DEBUG = false;

export default function LoadKakaoTotal() {
    const dispatch = useAppDispatch();

    useEffect(() => {

        async function callback() {
            const authToken = getCookie("authToken");
            if (DEBUG) console.log(`[LoadKakaoTotal]`, `authToken:`, authToken, `, !!authToken:`, !!authToken);
            if (!!authToken) {
                const secretKey = process.env.NEXT_PUBLIC_JWT_SECRET_KEY;
                if (!secretKey || secretKey.length === 0) {
                    console.error("❌ JWT secret key가 비어 있습니다. verifyJWT를 실행할 수 없습니다.");
                    return;
                }

                let result = { valid: false, payload: "" };
                result = await verifyJWT(authToken, secretKey);
                if (DEBUG) console.log(`[LoadKakaoTotal] result:`, result, `, !!result:`, !!result);
                if (true == !!result) {
                    if (true == result.valid) {
                        const payload: string = result.payload;
                        if (DEBUG) console.log(`[LoadKakaoTotal] typeof payload:`, typeof payload, `, payload:`, payload);
                        if ('undefined' != payload) {
                            const jsonPayload: KakaoTotal = JSON.parse(payload);
                            if (DEBUG) console.log(`[LoadKakaoTotal] typeof jsonPayload:`, typeof jsonPayload, `, jsonPayload:`, jsonPayload);

                            const base = new Date(jsonPayload.access_date);
                            const plusSeconds = jsonPayload.expires_in * 1000;
                            const target: any = new Date(base.getTime() + plusSeconds);

                            console.log(`기준 + ${jsonPayload.expires_in}초:`, target.toISOString());

                            const now: any = new Date();
                            const diffMs = now - target;
                            const diffSec = Math.floor(diffMs / 1000);

                            console.log("현재와 차이(초):", diffSec);
                            console.log("현재와 차이(분):", (diffSec / 60).toFixed(2));
                            console.log("현재와 차이(시간):", (diffSec / 3600).toFixed(2));

                            if (diffSec > 0) {
                                console.log(`need to refresh`);

                                clearCookie("authToken");
                                clearCookie("koreaInvestmentToken");
                            }
                            else {
                                dispatch(setKakaoTotal(jsonPayload));
                            }
                        }
                    }
                }
            }
        }

        callback();
    }, []);

    return <></>;
}