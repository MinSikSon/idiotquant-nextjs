"use client"

import { useEffect, useState } from "react";

import { verifyJWT } from "@/lib/jwt";
import { clearCookie, getCookie } from "./util";
import { KakaoTotal, selectKakaoTatalState, setKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { getCloudFlareUserInfo, selectCloudflareUserInfo } from "@/lib/features/cloudflare/cloudflareSlice";

const DEBUG = false;

export default function LoadKakaoTotal() {
    const dispatch = useAppDispatch();
    const cloudFlareUserInfo = useAppSelector(selectCloudflareUserInfo);
    const kakaoTotalState = useAppSelector(selectKakaoTatalState);

    const [mount, setMount] = useState<boolean>(false);

    const callback = async () => {
        try {
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

                            if (DEBUG) console.log(`기준 + ${jsonPayload.expires_in}초:`, target.toISOString());

                            const now: any = new Date();
                            const diffMs = now - target;
                            const diffSec = Math.floor(diffMs / 1000);

                            if (DEBUG) console.log("현재와 차이(초):", diffSec);
                            if (DEBUG) console.log("현재와 차이(분):", (diffSec / 60).toFixed(2));
                            if (DEBUG) console.log("현재와 차이(시간):", (diffSec / 3600).toFixed(2));

                            if (diffSec > 0) {
                                if (DEBUG) console.log(`[LoadKakaoTotal] need to refresh`);

                                clearCookie("authToken");
                                clearCookie("koreaInvestmentToken");
                            }
                            else {
                                if (DEBUG) console.log(`[LoadKakaoTotal] jsonPayload:`, jsonPayload);
                                if ("init" == kakaoTotalState) {
                                    dispatch(setKakaoTotal(jsonPayload));
                                }
                                dispatch(getCloudFlareUserInfo());
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.log(`[LoadKakaoTotal] err:`, err);
        }

        setMount(true);
    }

    useEffect(() => {
        if (DEBUG) console.log(`[LoadKakaoTotal] []`);
        callback();
    }, []);

    useEffect(() => {
        if (DEBUG) console.log(`[LoadKakaoTotal] cloudFlareUserInfo:`, cloudFlareUserInfo);
        callback();
    }, [cloudFlareUserInfo]);

    useEffect(() => {
        if (DEBUG) console.log(`[LoadKakaoTotal] mount:`, mount);
    }, [mount]);

    return <></>;
}