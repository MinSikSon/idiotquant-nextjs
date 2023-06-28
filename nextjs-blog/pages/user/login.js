import { useRouter } from "next/router";
import { useEffect } from "react"

// export async function getServerSideProps() {
//     return {
//         redirect: {
//             destination: '/',
//             permanent: false, // true로 설정하면 301 리다이렉트로 처리됩니다.
//         },
//     };
// }

function RequestToken(_authorizeCode) {
    const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
    const redirect_uri = 'https://idiotquant.com/';

    const postData = {
        grant_type: 'authorization_code',
        client_id: rest_api_key,
        redirect_uri: redirect_uri,
        code: _authorizeCode,
    };

    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        // body: `grant_type=authorization_code&client_id=${rest_api_key}&redirect_uri=${encodeURIComponent(redirect_uri)}&code=${_authorizeCode}`,
        body: new URLSearchParams(postData).toString(),
    };

    fetch("https://kauth.kakao.com/oauth/token", requestOptions)
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
    // .then(() => {
    //     axios.get('https://geolocation-db.com/json/')
    //         .then((res) => {
    //             console.log('res:', res);
    //             console.log('res.data.IPv4', res.data.IPv4);

    //             setIp(res.data.IPv4);
    //             setAuthorizeCode(_authorizeCode);

    //             const url = `https://idiotquant-backend.tofu89223.workers.dev`;
    //             const port = `443`;
    //             // const res = fetch(`${url}:${port}/${subUrl}`, {
    //             //     method: 'POST',
    //             //     headers: {
    //             //         'Content-Type': 'application/json',
    //             //     },
    //             //     body: JSON.stringify(data),
    //             // });
    //             // const json = await res.json();
    //             // return json;
    //         });
    // })
}

export default function Login(props) {
    const router = useRouter();
    useEffect(() => {
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