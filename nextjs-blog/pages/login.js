import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Title from '../components/Title';

export default function Login(props) {
    const router = useRouter();
    useEffect(() => {
        if (!router.isReady) return;
        console.log(`1 router.isReady`, router.isReady);
        console.log(`1 router`, router);
    }, [router.isReady]);

    const { authorizeCode } = router.query;

    const loginStatus = (!!authorizeCode) ? 'kakao logout' : 'kakao login';

    console.log(`2 authorizeCode`, authorizeCode);
    console.log(`2 loginStatus`, loginStatus);

    const getLoginUrl = () => {
        const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
        const redirect_uri = 'https://idiotquant.com/user/login';
        const kakaoUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${rest_api_key}&redirect_uri=${encodeURIComponent(redirect_uri)}`;

        // const kakaoUrl = {
        //     pathname: `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${rest_api_key}&redirect_uri=${encodeURIComponent(redirect_uri)}`,
        //     // query: {
        //     //     authorizeCode: true,
        //     // },
        // }
        return kakaoUrl;
    }

    const getLogoutUrl = () => {
        const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
        const redirect_uri = 'https://idiotquant.com/user/logout';

        const kakaoUrl = `https://kauth.kakao.com/oauth/logout?client_id=${rest_api_key}&logout_redirect_uri=${encodeURIComponent(redirect_uri)}`;
        // const kakaoUrl = {
        //     pathname: `https://kauth.kakao.com/oauth/logout?client_id=${rest_api_key}&logout_redirect_uri=${encodeURIComponent(redirect_uri)}`,
        //     // query: {
        //     //     authorizeCode: false,
        //     // },
        // }
        return kakaoUrl;
    }

    console.log(`router`, router);
    console.log(`router.query`, router.query);
    console.log(`props.authorizeCode`, props.authorizeCode);

    const KakaoIcon = () => {
        return (
            <img className='w-fit' src='/images/kakao_login_medium_narrow.png'></img>
        );
    }

    return (
        <>
            <Title />
            <div className='grid grid-cols-5 grid-rows-2 place-content-center h-32'>
                <div className='col-span-5' />
                <div />
                <div className='col-span-3 grid place-items-center'>
                    <Link className='' href={!!props.authorizeCode ? getLogoutUrl() : getLoginUrl()}>
                        <KakaoIcon />
                    </Link>
                </div>
                <div />
            </div>
        </>
    );
}