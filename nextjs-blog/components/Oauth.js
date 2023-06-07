import { Input, Select, Option, Button } from "@material-tailwind/react";
import Head from "next/head";
import Link from "next/link";

// https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=25079c20b5c42c7b91a72308ef5c4ad5&redirect_uri=https://idiotquant.com/oauth
export default function Oauth(props) {
    const LoginIcon = (props) => {
        return (
            <img className='h-7' src='/images/icons8-login-60.png'></img>
        );
    }
    const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
    const redirect_uri = 'https://idiotquant.com/';
    const kakaoUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${rest_api_key}&redirect_uri=${redirect_uri}`;

    const handleLogin = () => {
        window.location.href = kakaoUrl;
    }

    return (
        <>
            <div className='z-20 fixed w-fit rounded-xl top-2'>
                <form onSubmit={(e) => { e.preventDefault(); }}>
                    <Button className='flex items-center bg-yellow-400 h-7 p-3 m-0 mt-1' color='yellow' onClick={handleLogin}>
                        <LoginIcon />
                        <div className="pt-1">KAKAO</div>
                    </Button>
                </form>
            </div>
        </>

    );
}