"use client"

import React from "react";
import { Button, Card } from '@material-tailwind/react';
import { useRouter } from "next/navigation";
import { selectKakaoAuthCode, selectKakaoId, selectKakaoNickName, setKakaoAuthCode, setKakaoId, setKakaoNickName } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { clearCookie, getCookie, registerCookie } from "@/components/util";
import { DesignButton } from "@/components/DesignButton";

const DEBUG = false;

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

async function registerUser(id: any, nickname: any) {
    async function fetchAndSet(subUrl: any) {

        const data = {
            'id': id,
            'nickname': nickname,
        };

        const options: any = {
            method: "POST",
            credentials: "include",  // include credentials (like cookies) in the request
            headers: {
                "Content-Type": "application/json", // 요청 본문이 JSON 형식임을 명시
                // 'Content-Type': 'text/html', // 요청 본문이 JSON 형식임을 명시

            },
            body: JSON.stringify(data)
        };
        const url = 'https://idiotquant-backend.tofu89223.workers.dev';
        const port = '443';
        const fetchUrl = `${url}:${port}/${subUrl}`;

        fetch(fetchUrl, options)
            .then(res => {
                // console.log(`res`, res);
                if (res.ok) {
                    return res.json();
                }
            })
            .then(res => {
                // console.log(`res2`, res);
            })
            .catch(error => {
                console.log(`error`, error);
            })
    };

    fetchAndSet('login');
}

export default function Login(props: any) {
    const router = useRouter();

    const [nickname, setNickname] = React.useState("");
    const [authorizeCode, setAuthorizeCode] = React.useState("");

    const dispatch = useAppDispatch();
    const kakaoAuthCode = useAppSelector(selectKakaoAuthCode);
    const kakaoNickName = useAppSelector(selectKakaoNickName);
    const kakaoId = useAppSelector(selectKakaoId);

    interface KakaoLoginErrorInterface {
        error: string;
        error_description: string; // "authorization code not found for code=AnZhlhnF7IzjA81_K-gxDx2w3wY4ShoMUUikaIk9pMDx70iBIQH7WQAAAAQKFxAvAAABlZ0Pu28h5oEAb4_jFQ",
        error_code: string //  "KOE320"
    }
    const [responseToken, setResponseToken] = React.useState<KakaoLoginErrorInterface>({ error: "", error_description: "", error_code: "" });

    React.useEffect(() => {
        async function callback() {
            if (DEBUG) console.log(`[Login]`, `getCookie("kakaoId"):`, getCookie("kakaoId"), `getCookie("kakaoNickName"):`, getCookie("kakaoNickName"));
            if (DEBUG) console.log(`[Login]`, `kakaoId:`, kakaoId, `kakaoAuthCode:`, kakaoAuthCode);
            let _authorizeCode: any = ""
            if ("" == kakaoAuthCode) {
                _authorizeCode = new URL(window.location.href).searchParams.get('code');
                if (!!!_authorizeCode) {
                    return;
                }

                if (DEBUG) console.log(`[Login]`, `_authorizeCode:`, _authorizeCode);

                dispatch(setKakaoAuthCode(_authorizeCode));
            }
            else {
                _authorizeCode = kakaoAuthCode;
            }

            const responseToken = await RequestToken(_authorizeCode, `${window.location.origin}${props.parentUrl}`);
            setResponseToken(responseToken);
            if (!!responseToken.error_code && "KOE320" == responseToken.error_code) {
                if (DEBUG) console.log(`[Login]`, `responseToken:`, responseToken);
                dispatch(setKakaoAuthCode(""));
                return;
            }

            const responseNickname = await RequestNickname(responseToken.access_token);

            if ("" == nickname) {
                setNickname(responseNickname.properties.nickname);
            }

            if ("" == authorizeCode) {
                setAuthorizeCode(_authorizeCode);
            }

            registerCookie("kakaoId", responseNickname.id);
            registerCookie("kakaoNickName", responseNickname.properties.nickname);

            registerUser(responseNickname.id, responseNickname.properties.nickname);
            dispatch(setKakaoNickName(responseNickname.properties.nickname))
            dispatch(setKakaoId(responseNickname.id))

            const url = {
                pathname: `${window.location.origin}${props.parentUrl}`,
                query: { id: responseNickname.id },
            };
            const queryString = new URLSearchParams(url.query).toString();
            router.push(`${url.pathname}?${queryString}`);
        }
        callback();
    }, []);

    function onClickLogin(redirectUrl: any) {
        if (DEBUG) console.log(`Login`);
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${redirectUrl}`;

        router.push(authorizeEndpoint);
    }

    const Logout = (redirectUrl: any) => {
        if (DEBUG) console.log(`Logout`);
        clearCookie("kakaoId");
        clearCookie("kakaoNickName");
        clearCookie("koreaInvestmentToken");

        dispatch(setKakaoAuthCode(""));
        dispatch(setKakaoNickName(""));
        dispatch(setKakaoId(""));

        const authorizeEndpoint = `https://kauth.kakao.com/oauth/logout?client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&logout_redirect_uri=${redirectUrl}`;
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
                        handleOnClick={() => onClickLogin(`${window.location.origin}${props.parentUrl}`)}
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
            <div className="p-5">
                <div className="font-mono text-xl mb-2">
                    {kakaoNickName}님 반갑습니다.
                </div>
                <div className="font-mono">
                    logout 하려면 아래 버튼을 눌려주세요.
                </div>
                <DesignButton
                    handleOnClick={() => Logout(`${window.location.origin}${props.parentUrl}`)}
                    buttonName="logout"
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

    return (
        <>
            <div className="w-full h-screen items-center dark:bg-black dark:text-white">
                <KakaoIcon />
                <div></div>
            </div>
        </>
    );
}