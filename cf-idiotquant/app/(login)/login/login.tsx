"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setCloudFlareLoginStatus, selectLoginState } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { clearCookie, getCookie } from "@/components/util";

import { DesignButton } from "@/components/designButton";
import UserPage from "@/app/(user)/user/page";

const DEBUG = false;

import { usePathname } from "next/navigation";
import { verifyJWT } from "@/lib/jwt";
import { KakaoTotal, selectKakaoTotal, setKakaoTotal } from "@/lib/features/kakao/kakaoSlice";

const redirectUrl = `${process.env.NEXT_PUBLIC_API_URL}/kakao-login`;
const redirectLogoutUrl = `${process.env.NEXT_PUBLIC_API_URL}/kakao-logout`;

export default function Login(props: any) {
    const router = useRouter();

    const dispatch = useAppDispatch();
    const loginState = useAppSelector(selectLoginState);
    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);

    const pathname = usePathname();

    // interface KakaoLoginErrorInterface {
    //     error: string;
    //     error_description: string; // "authorization code not found for code=AnZhlhnF7IzjA81_K-gxDx2w3wY4ShoMUUikaIk9pMDx70iBIQH7WQAAAAQKFxAvAAABlZ0Pu28h5oEAb4_jFQ",
    //     error_code: string //  "KOE320"
    // }

    useEffect(() => {
        if (DEBUG) console.log(`[Login]`, `loginState:`, loginState);

        async function callback() {
            let result = { valid: false, payload: "" };
            const authToken = getCookie("authToken");
            if (DEBUG) console.log(`[Login]`, `authToken:`, authToken, `, !!authToken:`, !!authToken);
            if (!!authToken) {
                const secretKey = process.env.NEXT_PUBLIC_JWT_SECRET_KEY;
                if (!secretKey || secretKey.length === 0) {
                    console.error("❌ JWT secret key가 비어 있습니다. verifyJWT를 실행할 수 없습니다.");
                    return;
                }

                result = await verifyJWT(authToken, secretKey);
                if (DEBUG) console.log(`[Login] result:`, result, `, !!result:`, !!result);
                if (true == !!result) {
                    if (true == result.valid) {
                        const payload: string = result.payload;
                        if ('undefined' != payload) {
                            const jsonPayload: KakaoTotal = JSON.parse(payload);
                            if (DEBUG) console.log(`[Login] typeof jsonPayload:`, typeof jsonPayload, `, jsonPayload:`, jsonPayload);

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
                                // dispatch(setKakaoTotal({} as KakaoTotal));
                            }
                            else {
                                dispatch(setKakaoTotal(jsonPayload));
                            }
                        }
                    }
                }
            }
            else {
                // dispatch(setKakaoTotal({} as KakaoTotal));
            }
        }

        callback();
        dispatch(setCloudFlareLoginStatus());
    }, []);

    useEffect(() => {
        if (DEBUG) console.log(`[Login] kakaoTotal:`, kakaoTotal);
    }, [kakaoTotal]);

    async function onClickLogin() {
        if (DEBUG) console.log(`[Login] onClickLogin`, `redirectUrl:`, redirectUrl);
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${redirectUrl}`;

        router.push(authorizeEndpoint);
    }

    const Logout = () => {
        if (DEBUG) console.log(`Logout`);
        clearCookie("authToken");
        clearCookie("koreaInvestmentToken");

        // dispatch(setKakaoTotal({} as KakaoTotal));

        const authorizeEndpoint = `https://kauth.kakao.com/oauth/logout?client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&logout_redirect_uri=${redirectLogoutUrl}`;
        router.push(authorizeEndpoint);
    }

    if (DEBUG) console.log(`[Login] kakaoTotal:`, kakaoTotal, `, undefined == kakaoTotal`, undefined == kakaoTotal);
    const KakaoIcon = () => {
        if (undefined == kakaoTotal || !!!kakaoTotal?.kakao_account?.profile?.nickname) {
            return <>
                <div className="p-5">
                    <div className="font-mono text-xl mb-2">
                        반갑습니다.
                    </div>
                    <div className="font-mono">
                        login 하려면 아래 버튼을 눌려주세요.
                    </div>
                    <DesignButton
                        handleOnClick={() => onClickLogin()}
                        buttonName="Continue with Kakao"
                        buttonBgColor="bg-[#ffea04]"
                        buttonBorderColor="border-[#ebd700]"
                        buttonShadowColor="#1e1e1e"
                        textStyle="font-bold text-xs py-2 text-[#3c1e1e]"
                        additionalTextTop={<img src="/images/kakaotalk_sharing_btn_small.png" alt="metamask" className="h-6 w-6 mx-2" />}
                        // buttonStyle="mt-6"
                        buttonStyle={`mt-6 flex items-center justify-center mb-2 px-1 button bg-[#ffea04] rounded-full cursor-pointer select-none
                                active:translate-y-1 active:[box-shadow:0_0px_0_0_#1e1e1e,0_0px_0_0_#1e1e1e41] active:border-b-[0px]
                                transition-all duration-150 [box-shadow:0_4px_0_0_#1e1e1e,0_8px_0_0_#1e1e1e41] border-b-[1px]
                                `}
                    />
                </div>
            </>;
        }

        return <>
            <UserPage kakaoNickName={kakaoTotal?.kakao_account?.profile?.nickname} Logout={Logout} parentUrl={pathname} />
        </>;
    }

    if (DEBUG) console.log(`[Login] render`, `kakaoTotal?.kakao_account?.profile?.nickname:`, kakaoTotal?.kakao_account?.profile?.nickname, `, loginState:`, loginState);
    return (
        <div className="w-full h-screen items-center dark:bg-black dark:text-white">
            <KakaoIcon />
            <div></div>
        </div>
    );
}