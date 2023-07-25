import { useRouter } from 'next/router';
import React from "react";
import Title from '../components/Title';
import { Button } from '@material-tailwind/react';
const env = {
    KAKAO_REST_API_KEY: '25079c20b5c42c7b91a72308ef5c4ad5',
    KAKAO_REDIRECT_URI: 'https://idiotquant.com/login'
}

async function RequestNickname(_token) {
    if (!!!_token) return;

    const requestUrl = `https://kapi.kakao.com/v2/user/me`;

    const response = await fetch(requestUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${_token}` },
    }).then((res) => res.json());

    console.log('_token', _token);
    console.log('RequestNickname', response);

    return response;
}

async function RequestToken(_authorizeCode) {
    const tokenUrl = `https://kauth.kakao.com/oauth/token?grant_type=authorization_code&client_id=${env.KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(env.KAKAO_REDIRECT_URI)}&code=${_authorizeCode}`;

    const responseToken = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    }).then((res) => res.json());

    console.log('responseToken', responseToken);

    const responseNickname = await RequestNickname(responseToken.access_token);
    console.log(`responseNickname`, responseNickname);

    return responseToken;
}


export default function Login(props) {
    const router = useRouter();
    const [authorizeCode, setAuthorizeCode] = React.useState('');
    React.useEffect(() => {
        async function callback() {
            if (!router.isReady) return;

            const _authorizeCode = new URL(window.location.href).searchParams.get('code');
            if (!!!_authorizeCode) return;

            const responseToken = await RequestToken(_authorizeCode);

            if ('' == authorizeCode) {
                setAuthorizeCode(_authorizeCode);
            }
        }
        callback();
    }, [router.isReady]);

    function Login() {
        console.log(`Login`);
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${env.KAKAO_REST_API_KEY}&redirect_uri=${env.KAKAO_REDIRECT_URI}`;

        router.push(authorizeEndpoint);
    }


    const Logout = () => {
        console.log(`Logout`);
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/logout?client_id=${env.KAKAO_REST_API_KEY}&logout_redirect_uri=${env.KAKAO_REDIRECT_URI}`;

        fetch(authorizeEndpoint, {
            method: 'GET',
        }).then((res) => {
            console.log(`RequestLogout`, res);
            if (true === res.ok) {
                router.push('/');
            }
            return res;
        })
    }

    const KakaoIcon = () => {
        return (
            <>
                {
                    (!!!authorizeCode) ?
                        <Button
                            size="lg"
                            // variant="outlined"
                            color="yellow"
                            className="flex items-center gap-3"
                            onClick={Login}
                        >
                            <img src="/images/kakaotalk_sharing_btn_small.png" alt="metamask" className="h-6 w-6" />
                            Continue with Kakao
                        </Button>
                        :
                        <Button
                            size="lg"
                            variant="outlined"
                            color="blue-gray"
                            className="flex items-center gap-3"
                            onClick={Logout}
                        >
                            <img src="/images/kakaotalk_sharing_btn_small.png" alt="metamask" className="h-6 w-6" />
                            Logout
                        </Button>
                }
            </>
        );
    }

    return (
        <>
            <Title />
            <div className='grid grid-cols-8 grid-rows-3 place-content-center h-32'>
                <div className='col-span-8' />
                <div className='col-span-8' />
                <div className='col-span-8 flex justify-center items-center'>
                    <KakaoIcon />
                </div>
            </div>
        </>
    );
}