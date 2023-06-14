import { useRouter } from 'next/router';
import { useEffect } from 'react';

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

    const handleLogin = () => {
        console.log('handleLogin');

        const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
        const redirect_uri = 'https://idiotquant.com/';
        const kakaoUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${rest_api_key}&redirect_uri=${redirect_uri}`;

        window.location.href = kakaoUrl;
    }

    const handleLogout = () => {
        console.log('handleLogout');

        const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
        const redirect_uri = 'https://idiotquant.com/';

        const url = `https://kauth.kakao.com/oauth/logout?client_id=${rest_api_key}&logout_redirect_uri=${redirect_uri}`
        // const url = 'https://kapi.kakao.com/v1/user/logout';
        // const requestOptions = {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/x-www-form-urlencoded',
        //         'Authorization': `Bearer ${props.accessToken}`,
        //     },
        // };

        // fetch(url, requestOptions)
        fetch(url)
            .then(response => {
                // POST 요청이 성공한 경우에 대한 처리
                if (response.ok) {
                    console.log('Logout successful');
                    window.location.href = redirect_uri;
                } else {
                    throw new Error('Logout failed');
                }
            })
            .catch(error => {
                // POST 요청이 실패한 경우에 대한 처리
                console.error(error);
            });
    }

    const handleClick = () => {
        if (!!props.authorizeCode) {
            handleLogout();
        }
        else {
            handleLogin();
        }
    }

    return (
        <>
            <button className='flex items-center h-7 py-3 px-1 m-0 ml-1 mt-1' onClick={handleClick}>
                {/* <ArrowRightOnRectangleIcon strokeWidth={2} className="h-5 w-5" /> */}
                <div className="pt-1">{loginStatus}</div>
            </button>
        </>
    );
}