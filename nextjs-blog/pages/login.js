import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Title from '../components/Title';


async function RequestToken(_authorizeCode) {
    const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
    const redirect_uri = 'https://idiotquant.com/login'; // NOTE: [KAKAO] 인가코드 redirect uri 와 액세스 토큰 redirect uri 가 같아야 합니다.

    const postData = {
        'grant_type': 'authorization_code',
        'client_id': rest_api_key,
        'redirect_uri': redirect_uri,
        'code': _authorizeCode,
    };

    console.log(`postData`, postData);
    console.log(`new URLSearchParams(postData)`, new URLSearchParams(postData));
    console.log(`new URLSearchParams(postData).toString()`, new URLSearchParams(postData).toString());
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: encodeURIComponent(new URLSearchParams(postData).toString()),
    };

    console.log(`requestOptions`, requestOptions);

    await fetch("https://kauth.kakao.com/oauth/token", requestOptions)
        .then(res => {
            console.log('post res:', res);
            if (res.ok) {
                return res.text();
            } else {
                throw new Error('Request failed');
            }
        })
        .then(body => {
            console.log('post body:', body);
            console.log(`body.access_token`, body.access_token);
            console.log(`JSON.parse(body).access_token`, JSON.parse(body).access_token);
            // setAccessToken(JSON.parse(body).access_token);
        })
}

export default function Login(props) {
    const router = useRouter();
    useEffect(() => {
        if (!router.isReady) return;
        console.log(`1 router.isReady`, router.isReady);
        console.log(`1 router`, router);

        const _authorizeCode = new URL(window.location.href).searchParams.get('code');
        console.log(`[Login] _authorizeCode:`, _authorizeCode);

        if (!!_authorizeCode) {
            RequestToken(_authorizeCode);
        }
    }, [router.isReady]);

    const { authorizeCode } = router.query;

    const loginStatus = (!!authorizeCode) ? 'kakao logout' : 'kakao login';

    console.log(`2 authorizeCode`, authorizeCode);
    console.log(`2 loginStatus`, loginStatus);

    const Login = () => {
        console.log(`Login`);
        const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
        const redirect_uri = 'https://idiotquant.com/login'; // NOTE: [KAKAO] 인가코드 redirect uri 와 액세스 토큰 redirect uri 가 같아야 합니다.
        // const redirect_uri = 'https://idiotquant.com';
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${rest_api_key}&redirect_uri=${encodeURIComponent(redirect_uri)}`;

        console.log(`authorizeEndpoint`, authorizeEndpoint);
        router.push(authorizeEndpoint);
    }

    const Logout = () => {
        console.log(`Logout`);
        const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
        const redirect_uri = 'https://idiotquant.com/user/logout';
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/authorize?client_id=${rest_api_key}&logout_redirect_uri=${encodeURIComponent(redirect_uri)}`;
        router.push(authorizeEndpoint);
    }

    console.log(`router`, router);
    console.log(`router.query`, router.query);

    const KakaoIcon = () => {
        console.log(`!!authorizeCode`, !!authorizeCode);
        return (
            <button onClick={!!authorizeCode ? Logout : Login}>
                <img className='w-fit' src='/images/kakao_login_large.png'></img>
            </button>
        );
    }

    return (
        <>
            <Title />
            <div className='grid grid-cols-8 grid-rows-3 place-content-center h-32'>
                <div className='col-span-8' />
                <div className='col-span-8' />
                <div className='col-span-3' />
                <div className='col-span-2 flex justify-center items-center'>
                    <KakaoIcon />
                </div>
                <div className='col-span-3' />
            </div>
        </>
    );
}