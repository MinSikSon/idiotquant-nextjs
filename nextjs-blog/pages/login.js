import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Title from '../components/Title';
const env = {
    KAKAO_REST_API_KEY: '25079c20b5c42c7b91a72308ef5c4ad5',
    KAKAO_REDIRECT_URI: 'https://idiotquant.com/login'
}
async function RequestToken(_authorizeCode) {
    const tokenUrl = `https://kauth.kakao.com/oauth/token?grant_type=authorization_code&client_id=${env.KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(env.KAKAO_REDIRECT_URI)}&code=${_authorizeCode}`;

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    })
        // .then(res => {
        //     console.log(`res`, res);
        //     return res;
        // })
        .then((res) => res.json());

    return response;
}

export default function Login(props) {
    const { authorizeCode, setAuthorizeCode } = useState('');
    const router = useRouter();
    useEffect(() => {
        async function callback() {
            if (!router.isReady) return;
            console.log(`1 router.isReady`, router.isReady);
            console.log(`1 router`, router);

            const _authorizeCode = new URL(window.location.href).searchParams.get('code');

            if (!!!_authorizeCode) return;
            const responseToken = await RequestToken(_authorizeCode);
            console.log('responseToken', responseToken);

            if ('' == authorizeCode) {
                setAuthorizeCode(_authorizeCode);
            }
        }
        callback();
    }, [router.isReady]);


    const loginStatus = (!!authorizeCode) ? 'kakao logout' : 'kakao login';

    console.log(`2 authorizeCode`, authorizeCode);
    console.log(`2 loginStatus`, loginStatus);

    function Login() {
        console.log(`Login`);
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${env.KAKAO_REST_API_KEY}&redirect_uri=${env.KAKAO_REDIRECT_URI}`;

        console.log(`authorizeEndpoint`, authorizeEndpoint);
        router.push(authorizeEndpoint);
    }

    const Logout = () => {
        console.log(`Logout`);
        const redirect_uri = 'https://idiotquant.com/user/logout';
        const authorizeEndpoint = `https://kauth.kakao.com/oauth/authorize?client_id=${env.KAKAO_REST_API_KEY}&logout_redirect_uri=${encodeURIComponent(redirect_uri)}`;
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