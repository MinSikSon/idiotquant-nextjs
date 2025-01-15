"use client"

import { selectKakaoAuthCode, selectKakaoId, selectKakaoNickName, setKakaoAuthCode, setKakaoId, setKakaoNickName } from "@/lib/features/login/loginSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import React from "react";

const env = {
    // KAKAO_REDIRECT_URI: 'https://idiotquant.com/login'
    // KAKAO_REDIRECT_URI: 'https://idiotquant.com/'
    // KAKAO_REDIRECT_URI: 'http://localhost:3000' // TODO: for test
    KAKAO_REDIRECT_URI: 'http://localhost:3000/login' // TODO: for test
}

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

    // console.log('_token', _token);
    console.log('RequestNickname', response);

    return response;
}

async function registerUser(id: any, nickname: any) {
    async function fetchAndSet(subUrl: string) {
        console.log(`[registerUser]`, `subUrl:`, subUrl);

        const data = {
            'id': id,
            'nickname': nickname,
        };

        const options: any = {
            method: 'POST',
            credentials: 'include',  // include credentials (like cookies) in the request
            headers: {
                'Content-Type': 'application/json', // 요청 본문이 JSON 형식임을 명시
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
export const LoginCheck = () => {
    console.log(`(1) LoginCheck`);

    const router = useRouter();
    const [nickname, setNickname] = React.useState('');
    const [authorizeCode, setAuthorizeCode] = React.useState('');

    const dispatch = useAppDispatch();
    const kakaoAuthCode = useAppSelector(selectKakaoAuthCode);
    const kakaoNickName = useAppSelector(selectKakaoNickName);
    const kakaoId = useAppSelector(selectKakaoId);

    React.useEffect(() => {
        async function callback() {
            // TODO(minsik.son) : 지금.. 뭔가 bug 인해서 Request 2번 날리고 있음.

            console.log(`kakaoAuthCode:`, kakaoAuthCode);
            let _authorizeCode: any = ""
            if ("" == kakaoAuthCode) {
                _authorizeCode = new URL(window.location.href).searchParams.get('code');
                console.log(`_authorizeCode`, _authorizeCode);
                if (!!!_authorizeCode) return;
                dispatch(setKakaoAuthCode(_authorizeCode));
            }
            else {
                _authorizeCode = selectKakaoAuthCode;
            }

            const responseToken = await RequestToken(_authorizeCode);
            if (!!responseToken.error_code && "KOE320" == responseToken.error_code) {
                console.log(`!!!!! responseToken`, responseToken);
                return;
            }

            // localStorage.setItem('token', responseToken); // accessToken을 local 에 저장하면 안됨
            // console.log(`localStorage.getItem('token')`, localStorage.getItem('token'));

            const responseNickname = await RequestNickname(responseToken.access_token);
            console.log(`responseNickname`, responseNickname);

            if ('' == nickname) {
                setNickname(responseNickname.properties.nickname);
            }

            if ('' == authorizeCode) {
                setAuthorizeCode(_authorizeCode);
            }

            localStorage.setItem('kakaoId', responseNickname.id);
            localStorage.setItem('kakaoNickName', responseNickname.properties.nickname);
            // localStorage.setItem('kakaoAuthorizeCode', _authorizeCode);

            registerUser(responseNickname.id, responseNickname.properties.nickname);
            dispatch(setKakaoNickName(responseNickname.properties.nickname))
            dispatch(setKakaoId(responseNickname.id))

            const url = {
                pathname: env.KAKAO_REDIRECT_URI,
                query: { id: responseNickname.id },
            };
            const queryString = new URLSearchParams(url.query).toString();
            router.push(`${url.pathname}?${queryString}`);
        }
        callback();
    }, []);

    return <></>;
}

async function RequestToken(_authorizeCode: any) {
    const tokenUrl = `https://kauth.kakao.com/oauth/token?grant_type=authorization_code&client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(env.KAKAO_REDIRECT_URI)}&code=${_authorizeCode}`;

    const responseToken = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        },
    }).then((res) => res.json());

    console.log('[RequestToken] response:', responseToken);

    return responseToken;
}