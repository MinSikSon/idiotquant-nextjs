"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCloudFlareLoginStatus, selectKakaoAuthCode, selectKakaoId, selectKakaoNickName, selectLoginState, selectUserInfo, setKakaoAuthCode, setKakaoId, setKakaoNickName } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { clearCookie, getCookie, registerCookie } from "@/components/util";

import { DesignButton } from "@/components/designButton";
import UserPage from "@/app/(user)/user/page";

const DEBUG = true;

import { usePathname } from "next/navigation";
import { verifyJWT } from "@/lib/jwt";

async function RequestNickname(_token: any) {
    if (!!!_token) return;

    const requestUrl = `https://kapi.kakao.com/v2/user/me`;

    const response = await fetch(requestUrl, {
        method: 'GET',
        // credentials: 'include',  // include credentials (like cookies) in the request
        headers: {
            'Authorization': `Bearer ${_token}`
        },
    }).then((res) => res.json());

    return response;
}

async function RequestToken(_authorizeCode: any, redirectUrl: any) {
    const tokenUrl = `https://kauth.kakao.com/oauth/token?grant_type=authorization_code&client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(redirectUrl)}&code=${_authorizeCode}`;

    const responseToken = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        },
    }).then((res) => res.json());

    return responseToken;
}

const redirectUrl = `${process.env.NEXT_PUBLIC_API_URL}/kakao-login`;
const redirectLogoutUrl = `${process.env.NEXT_PUBLIC_API_URL}/kakao-logout`;

export default function Login(props: any) {
    const router = useRouter();

    const [nickname, setNickname] = useState("");
    const [authorizeCode, setAuthorizeCode] = useState("");

    const dispatch = useAppDispatch();
    const kakaoAuthCode = useAppSelector(selectKakaoAuthCode);
    const kakaoNickName = useAppSelector(selectKakaoNickName);
    const kakaoId = useAppSelector(selectKakaoId);
    const userInfo = useAppSelector(selectUserInfo);
    const loginState = useAppSelector(selectLoginState);

    const pathname = usePathname();

    // interface KakaoLoginErrorInterface {
    //     error: string;
    //     error_description: string; // "authorization code not found for code=AnZhlhnF7IzjA81_K-gxDx2w3wY4ShoMUUikaIk9pMDx70iBIQH7WQAAAAQKFxAvAAABlZ0Pu28h5oEAb4_jFQ",
    //     error_code: string //  "KOE320"
    // }

    useEffect(() => {
        if (DEBUG) console.log(`[Login]`, `loginState:`, loginState);
        if (DEBUG) console.log(`[Login]`, `kakaoNickName:`, kakaoNickName, `kakaoId:`, kakaoId);

        async function callback() {
            let result = { valid: false, payload: "" };
            const cf_token = getCookie("authToken");
            if (DEBUG) console.log(`[Login]`, `cf_token:`, cf_token);
            if (!!cf_token) {
                if (DEBUG) console.log(`process.env.NEXT_PUBLIC_JWT_SECRET_KEY`, process.env.NEXT_PUBLIC_JWT_SECRET_KEY);
                result = await verifyJWT(cf_token, process.env.NEXT_PUBLIC_JWT_SECRET_KEY);
                if (DEBUG) console.log(`[Login] result:`, result, `, !!result:`, !!result);
                if (true == !!result) {
                    if (true == result.valid) {
                        const payload: string = result.payload;
                        if ('undefined' != payload) {
                            const jsonPayload = JSON.parse(payload);
                            if (DEBUG) console.log(`[Login] jsonPayload:`, jsonPayload);
                            dispatch(setKakaoId(jsonPayload.id));
                            dispatch(setKakaoNickName(jsonPayload.properties.nickname));
                        }
                    }
                }
            }
        }
        callback();

        dispatch(getCloudFlareLoginStatus());
    }, []);

    async function onClickLogin() {
        if (DEBUG) console.log(`[Login] onClickLogin`, `redirectUrl:`, redirectUrl);
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${redirectUrl}`;

        router.push(authorizeEndpoint);
    }

    const Logout = () => {
        if (DEBUG) console.log(`Logout`);
        clearCookie("authToken");
        clearCookie("cf_token");
        clearCookie("kakaoId");
        clearCookie("kakaoNickName");
        clearCookie("koreaInvestmentToken");

        dispatch(setKakaoAuthCode(""));
        dispatch(setKakaoNickName(""));
        dispatch(setKakaoId(""));

        const authorizeEndpoint = `https://kauth.kakao.com/oauth/logout?client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&logout_redirect_uri=${redirectLogoutUrl}`;
        router.push(authorizeEndpoint);
    }

    const KakaoIcon = () => {
        if (!!!kakaoNickName) {
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
            <UserPage kakaoNickName={kakaoNickName} Logout={Logout} parentUrl={pathname} />
        </>;
    }

    return (
        <>
            <div className="w-full h-screen items-center dark:bg-black dark:text-white">
                <KakaoIcon />
                <div></div>
            </div>
        </>
    );
}