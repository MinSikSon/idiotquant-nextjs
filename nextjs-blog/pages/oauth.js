import { Input, Select, Option, Button } from "@material-tailwind/react";
import Head from "next/head";
import Link from "next/link";

export default function Oauth() {
    const LoginIcon = (props) => {
        return (
            <img className='h-7' src='/images/icons8-login-60.png'></img>
        );
    }
    return (
        <div>
            <Head>
                <title>kakao login</title>
                <link rel="icon" href="/images/icons8-login-30.png" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
            </Head>
            {/* <Script
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6995198721227228"
                crossorigin="anonymous"
                strategy="lazyOnload"
                onLoad={() =>
                    console.log(`script loaded correctly, window.FB has been populated`)
                }
            /> */}
            <div className='grid grid-cols-8 py-2'>
                <div className='col-span-1 pl-2'>
                    <LoginIcon />
                </div>
                <div className='col-span-6 self-center text-center'>
                    <Link href="../">
                        <div
                            className='font-serif text-xl sm:text-xl md:text-2xl lg:text-3xl
                            text-black header-contents text-center
                            sm:underline sm:decoration-2 md:decoration-4 sm:decoration-green-400'
                        >
                            IDIOT<span className='text-green-400'>.</span>QUANT
                        </div>
                    </Link>
                </div>
                <img className='h-7 col-span-1' />
                {/* <img className='h-7 col-span-1 object-fill' src='/images/icons8-calculator.gif' /> */}
            </div>

            <div className='bg-gray-200 w-screen h-screen flex justify-center items-center sm:px-20 md:px-40 lg:px-64 xl:px-80 2xl:px-96'>
                <div className="w-full h-full bg-gray-50 rounded-2xl shadow-xl border-4 border-gray-100">
                    <div className="w-auto m-1 h-auto mb-2">
                        <form className="flex flex-col gap-2 m-8 mt-1">
                            <div className='flex flex-col mb-4 '>
                                <div className='text-xl underline decoration-4 decoration-yellow-500'>{'사용자 로그인 임시:'}</div>
                                <div className='text-3xl text-right underline decoration-4 decoration-yellow-500'>{'^_^'}</div>
                            </div>
                            <div className='flex'>
                                <Input color="black" label="ID" onChange={(e) => { }} value={''} />
                            </div>
                            <div className='flex'>
                                <Input color="black" label="P/W" onChange={(e) => { }} value={''} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Button color="gray" onClick={() => { }}>Clear</Button>
                                <Button color="yellow" onClick={() => { }}>Login</Button>
                            </div>
                            <Button color="green" variant="outlined" onClick={() => { }}>
                                <div>kakao login 구현 예정</div>
                                <div>아직은 동작하지 않습니다.</div>
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}