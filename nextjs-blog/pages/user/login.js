import { useRouter } from "next/router";
import { useEffect } from "react"

async function RequestToken(_authorizeCode) {
    const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
    const redirect_uri = 'https://idiotquant.com';

    const postData = {
        grant_type: 'authorization_code',
        client_id: rest_api_key,
        redirect_uri: encodeURIComponent(redirect_uri),
        code: _authorizeCode,
    };

    console.log(`postData`, postData);
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        // body: `grant_type=authorization_code&client_id=${rest_api_key}&redirect_uri=${encodeURIComponent(redirect_uri)}&code=${_authorizeCode}`,
        body: new URLSearchParams(postData).toString(),
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
    const { authorizeCode } = router.query;
    useEffect(() => {
        console.log(`authorizeCode`, authorizeCode);
        const _authorizeCode = new URL(window.location.href).searchParams.get('code');

        console.log(`[Login] _authorizeCode:`, _authorizeCode);

        RequestToken(_authorizeCode);
        // router.push('/');
    }, []);


    return (
        <>
        </>
    )
}