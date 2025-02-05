/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'contents.kyobobook.co.kr',
                port: '',
                pathname: '/sih/fit-in/458x0/pdt/9780060555665.jpg',
            },
        ],
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_KAKAO_REST_API_KEY: process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY,
        KOREA_INVESTMENT_API_URL: process.env.KOREA_INVESTMENT_API_URL,
        KOREA_INVESTMENT_API_APPKEY: process.env.KOREA_INVESTMENT_API_APPKEY,
        KOREA_INVESTMENT_API_SECRETKEY: process.env.KOREA_INVESTMENT_API_SECRETKEY,
        KOREA_INVESTMENT_TEST_API_URL: process.env.KOREA_INVESTMENT_TEST_API_URL,
        KOREA_INVESTMENT_TEST_API_APPKEY: process.env.KOREA_INVESTMENT_TEST_API_APPKEY,
        KOREA_INVESTMENT_TEST_API_SECRETKEY: process.env.KOREA_INVESTMENT_TEST_API_SECRETKEY,
    },
    reactStrictMode: false,
};

export default nextConfig;
