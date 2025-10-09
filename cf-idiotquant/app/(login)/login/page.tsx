"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setCloudFlareLoginStatus, selectLoginState } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import { DesignButton } from "@/components/designButton";
import { KakaoTotal, selectKakaoTatalState, selectKakaoTotal } from "@/lib/features/kakao/kakaoSlice";
import Auth from "@/components/auth";
import { getKoreaInvestmentToken, KoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import LoadKakaoTotal from "@/components/loadKakaoTotal";

const DEBUG = false;

export default function LoginPage() {
    const router = useRouter();

    const dispatch = useAppDispatch();
    const loginState = useAppSelector(selectLoginState);
    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
    const kakaoTotalState = useAppSelector(selectKakaoTatalState);

    useEffect(() => {
        if (DEBUG) console.log(`[LoginPage] loginState:`, loginState);

        dispatch(setCloudFlareLoginStatus());
    }, []);

    useEffect(() => {
        if (DEBUG) console.log(`[LoginPage] loginState:`, loginState);
        if ("init" == kakaoTotalState && "cf-need-retry" == loginState) {
            dispatch(setCloudFlareLoginStatus());
        }
    }, [loginState]);

    useEffect(() => {
        if (DEBUG) console.log(`[LoginPage] loginState:`, loginState);
    }, [loginState]);
    useEffect(() => {
        if (DEBUG) console.log(`[LoginPage] kakaoTotal:`, kakaoTotal);
        if (undefined == kakaoTotal || kakaoTotal?.id == 0 || !!!kakaoTotal?.kakao_account?.profile?.nickname) {
            if (DEBUG) console.log(`[LoginPage] 1`);
        }
        else if ("fulfilled" != kakaoTotalState) {
            if (DEBUG) console.log(`[LoginPage] 2`);
            // waiting
        }
        else {
            if (DEBUG) console.log(`[LoginPage] 3`);
            router.push(`${process.env.NEXT_PUBLIC_CLIENT_URL}/user`); // NOTE: 로그인 성공 시 userpage 로 이동
        }
    }, [kakaoTotal]);

    useEffect(() => {
        if (DEBUG) console.log(`[LoginPage] kiToken:`, kiToken);
        if ("fulfilled" == kiToken?.state) {
            if (DEBUG) console.log(`[LoginPage] kiToken?.state:`, kiToken?.state);
        }
    }, [kiToken]);
    useEffect(() => {
        if (DEBUG) console.log(`[LoginPage] kakaoTotalState:`, kakaoTotalState);
    }, [kakaoTotalState]);

    async function onClickLogin() {
        const redirectUrl = `${process.env.NEXT_PUBLIC_API_URL}/kakao-login`;
        if (DEBUG) console.log(`[LoginPage] onClickLogin`, `redirectUrl:`, redirectUrl);
        const scopeParam = "&scope=friends";
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${redirectUrl}${scopeParam}`;

        router.push(authorizeEndpoint);
    }

    if ("fulfilled" != kiToken?.state) {
        return <>
            <Auth />
            <div className="dark:bg-black h-lvh"></div>
        </>
    }

    if (DEBUG) console.log(`[LoginPage] kakaoTotal:`, kakaoTotal, `, undefined == kakaoTotal`, undefined == kakaoTotal);
    const KakaoIcon = () => {
        if ("cf-need-retry" == loginState || undefined == kakaoTotal || kakaoTotal?.id == 0 || !!!kakaoTotal?.kakao_account?.profile?.nickname) {
            return <>
                {("cf-login" == loginState) && <LoadKakaoTotal />}
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
    }

    if (DEBUG) console.log(`[LoginPage] render`, `kakaoTotal?.kakao_account?.profile?.nickname:`, kakaoTotal?.kakao_account?.profile?.nickname, `, loginState:`, loginState);
    return (
        <div className="w-full h-screen items-center dark:bg-black dark:text-white">
            <KakaoIcon />
        </div>
    );
}