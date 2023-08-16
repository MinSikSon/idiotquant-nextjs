import { useRouter } from 'next/router';
import React from "react";
import Title from '../components/Title';
import { Button, Card, CardBody, Typography } from '@material-tailwind/react';

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

    return responseToken;
}

function registerUser(id, nickname) {
    function fetchAndSet(subUrl) {
        console.log(`fetchAndSet`);

        const data = {
            'id': id,
            'nickname': nickname,
        };
        // const options = {
        //     method: "POST", // *GET, POST, PUT, DELETE 등
        //     // mode: "cors", // no-cors, *cors, same-origin
        //     // cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        //     // credentials: "omit", // include, *same-origin, omit
        //     headers: {
        //         "content-type": "application/json",
        //         // "Access-Control-Allow-Origin": "*",
        //     },
        //     // redirect: "follow", // manual, *follow, error
        //     // referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        //     body: JSON.stringify(data), // body의 데이터 유형은 반드시 "Content-Type" 헤더와 일치해야 함
        // };
        const options = { method: "POST", body: JSON.stringify(data) };
        const url = `https://idiotquant-backend.tofu89223.workers.dev`;
        // const port = `443`;
        const port = `443`;
        fetch(`${url}:${port}/${subUrl}`, options)
            .then(res => {
                console.log(`res`, res);

                if (res.ok) {
                    return res.json();
                }
            })
            .catch(error => {
                console.log(`error`, error);
            })
        // .then(data => {
        //     console.log(`data`, data);
        // })
        // .catch(error => {
        //     console.log(`error`, error);
        // })
    };

    fetchAndSet('login');
}

export default function Login(props) {
    const router = useRouter();
    const [nickname, setNickname] = React.useState('');
    const [authorizeCode, setAuthorizeCode] = React.useState('');
    React.useEffect(() => {
        async function callback() {
            if (!router.isReady) return;

            const _authorizeCode = new URL(window.location.href).searchParams.get('code');
            if (!!!_authorizeCode) return;

            const responseToken = await RequestToken(_authorizeCode);

            const responseNickname = await RequestNickname(responseToken.access_token);
            console.log(`responseNickname`, responseNickname);

            if ('' == nickname) {
                setNickname(responseNickname.properties.nickname);
            }

            if ('' == authorizeCode) {
                setAuthorizeCode(_authorizeCode);
            }

            registerUser(responseNickname.id, responseNickname.nickname);
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
                        <>
                            <Card className="mt-6 w-96">
                                {/* <CardHeader color="blue-gray" className="relative h-20">
                                    <img
                                        src="https://images.unsplash.com/photo-1540553016722-983e48a2cd10?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80"
                                        alt="card-image"
                                    />
                                </CardHeader> */}
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
                                    onClick={Login}
                                >
                                    <img src="/images/kakaotalk_sharing_btn_small.png" alt="metamask" className="h-6 w-6" />
                                    Continue with Kakao
                                </Button>
                            </Card>
                        </>
                        :
                        <>
                            <Card className="mt-6 w-96">
                                {/* <CardHeader color="blue-gray" className="relative h-20">
                                    <img
                                        src="https://images.unsplash.com/photo-1540553016722-983e48a2cd10?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80"
                                        alt="card-image"
                                    />
                                </CardHeader> */}
                                <CardBody>
                                    <Typography variant="h5" color="blue-gray" className="mb-2">
                                        {nickname} 님 반갑습니다.
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
                                    onClick={Logout}
                                >
                                    <img src="/images/kakaotalk_sharing_btn_small.png" alt="metamask" className="h-6 w-6" />
                                    Logout
                                </Button>
                            </Card>
                        </>

                }
            </>
        );
    }

    return (
        <>
            <Title />
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