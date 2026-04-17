"use client";

import { useEffect, useCallback, useRef } from "react";

import { getCookie, clearCookie } from "./util";
import { selectKakaoTatalState, setKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { getCloudFlareUserInfo, selectCloudflareUserInfo } from "@/lib/features/cloudflare/cloudflareSlice";
import { verifyJWT } from "@/lib/jwt";

export default function LoadKakaoTotal() {
    const dispatch = useAppDispatch();
    const kakaoTotalState = useAppSelector(selectKakaoTatalState);
    const cloudFlareUserInfo = useAppSelector(selectCloudflareUserInfo);

    // 이미 처리를 시작했는지 확인하기 위한 useRef (리렌더링 방지)
    const isProcessing = useRef(false);

    const loadData = useCallback(async () => {
        // 이미 로드 중이거나 로드가 완료되었다면 실행 중단
        if (isProcessing.current || kakaoTotalState !== "init") return;

        isProcessing.current = true;

        try {
            const authToken = getCookie("authToken");
            if (!authToken) {
                isProcessing.current = false;
                return;
            }

            const secretKey = process.env.NEXT_PUBLIC_JWT_SECRET_KEY;
            if (!secretKey) {
                console.error("❌ JWT secret key missing");
                isProcessing.current = false;
                return;
            }

            const result = await verifyJWT(authToken, secretKey);

            if (result?.valid && result.payload && result.payload !== 'undefined') {
                const jsonPayload = JSON.parse(result.payload);

                // 유효기간 체크
                const targetTime = new Date(jsonPayload.access_date).getTime() + (jsonPayload.expires_in * 1000);
                const now = new Date().getTime();

                if (now > targetTime) {
                    clearCookie("authToken");
                    clearCookie("koreaInvestmentToken");
                } else {
                    // ✅ 데이터 로드 성공
                    dispatch(setKakaoTotal(jsonPayload));
                    // 필요한 경우에만 추가 정보 호출
                    dispatch(getCloudFlareUserInfo());
                }
            }
        } catch (err) {
            console.error(`[LoadKakaoTotal] Error:`, err);
        } finally {
            isProcessing.current = false;
        }
    }, [dispatch, kakaoTotalState]);

    // 1. 마운트 시 최초 실행
    useEffect(() => {
        loadData();
    }, [loadData]);

    return null; // UI 불필요
}