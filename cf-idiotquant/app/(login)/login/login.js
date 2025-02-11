"use client"

import React from "react";
import { Button, Card, CardBody, Typography } from '@material-tailwind/react';
import { useRouter } from "next/navigation";
import { selectKakaoAuthCode, selectKakaoId, selectKakaoNickName, setKakaoAuthCode, setKakaoId, setKakaoNickName } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { clearCookie, getCookie, registerCookie } from "@/components/util";

async function RequestNickname(_token) {
    if (!!!_token) return;

    const requestUrl = `https://kapi.kakao.com/v2/user/me`;

    const response = await fetch(requestUrl, {
        method: 'GET',
        // credentials: 'include',  // include credentials (like cookies) in the request
        headers: {
            'Authorization': `Bearer ${_token}`
        },
    }).then((res) => res.json());

    // console.log('_token', _token);
    // console.log('RequestNickname', response);

    return response;
}

async function RequestToken(_authorizeCode, redirectUrl) {
    const tokenUrl = `https://kauth.kakao.com/oauth/token?grant_type=authorization_code&client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(redirectUrl)}&code=${_authorizeCode}`;

    const responseToken = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        },
    }).then((res) => res.json());

    // console.log('[RequestToken] response:', responseToken);

    return responseToken;
}

async function registerUser(id, nickname) {
    async function fetchAndSet(subUrl) {
        // console.log(`[registerUser]`, `subUrl:`, subUrl);

        const data = {
            'id': id,
            'nickname': nickname,
        };

        const options = {
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
                console.log(`res`, res);
                if (res.ok) {
                    return res.json();
                }
            })
            .then(res => {
                console.log(`res2`, res);
            })
            .catch(error => {
                console.log(`error`, error);
            })
    };

    fetchAndSet('login');
}

export default function Login(props) {
    const router = useRouter();

    const [nickname, setNickname] = React.useState("");
    const [authorizeCode, setAuthorizeCode] = React.useState("");

    const dispatch = useAppDispatch();
    const kakaoAuthCode = useAppSelector(selectKakaoAuthCode);
    const kakaoNickName = useAppSelector(selectKakaoNickName);
    const kakaoId = useAppSelector(selectKakaoId);

    React.useEffect(() => {
        async function callback() {
            console.log(`[Login]`, `getCookie("kakaoId"):`, getCookie("kakaoId"), `getCookie("kakaoNickName"):`, getCookie("kakaoNickName"));
            console.log(`[Login]`, `kakaoId:`, kakaoId, `kakaoAuthCode:`, kakaoAuthCode);
            let _authorizeCode = ""
            if ("" == kakaoAuthCode) {
                _authorizeCode = new URL(window.location.href).searchParams.get('code');
                console.log(`[Login]`, `_authorizeCode:`, _authorizeCode);
                if (!!!_authorizeCode) return;
                dispatch(setKakaoAuthCode(_authorizeCode));
            }
            else {
                _authorizeCode = selectKakaoAuthCode;
            }

            const responseToken = await RequestToken(_authorizeCode, `${window.location.origin}${props.parentUrl}`);
            if (!!responseToken.error_code && "KOE320" == responseToken.error_code) {
                console.log(`[Login]`, `responseToken:`, responseToken);
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

    function onClickLogin(redirectUrl) {
        console.log(`Login`);
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${redirectUrl}`;

        router.push(authorizeEndpoint);
    }

    const Logout = (redirectUrl) => {
        console.log(`Logout`);
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
                <Card className="mt-6 w-96">
                    <CardBody>
                        <Typography variant="h5" color="blue-gray" className="mb-2">
                            반갑습니다.
                        </Typography>
                        <Typography>
                            login 하려면 아래 버튼을 눌려주세요.
                        </Typography>
                    </CardBody>
                    <Button
                        size="lg"
                        // variant="outlined"
                        color="yellow"
                        className="flex items-center gap-3"
                        onClick={() => onClickLogin(`${window.location.origin}${props.parentUrl}`)}
                    >
                        <img src="/images/kakaotalk_sharing_btn_small.png" alt="metamask" className="h-6 w-6" />
                        Continue with Kakao
                    </Button>
                </Card>
            </>
        }

        return <>
            <Card className="mt-6 w-96">
                <CardBody>
                    <Typography variant="h5" color="blue-gray" className="mb-2">
                        {kakaoNickName} 님 반갑습니다.
                    </Typography>
                    <Typography>
                        logout 하려면 아래 버튼을 눌려주세요.
                    </Typography>
                </CardBody>
                <Button
                    size="lg"
                    variant="outlined"
                    color="blue-gray"
                    className="flex items-center gap-3"
                    onClick={() => Logout(`${window.location.origin}${props.parentUrl}`)}
                >
                    <img src="/images/kakaotalk_sharing_btn_small.png" alt="metamask" className="h-6 w-6" />
                    Logout
                </Button>
            </Card>

        </>;
    }

    return (
        <>
            <div className='grid grid-cols-8 grid-rows-4 place-content-center h-32'>
                <div className='col-span-8' />
                <div className='col-span-8' />
                <div className='col-span-8 flex justify-center items-center'>
                    <KakaoIcon />
                </div>
            </div>
        </>
    );
}