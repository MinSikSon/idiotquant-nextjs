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
            {
                protocol: 'http',
                hostname: 'k.kakaocdn.net',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'k.kakaocdn.net',
                pathname: '/**',
            },
        ],
        domains: [
            'cdn.pixabay.com',
            'encrypted-tbn0.gstatic.com',
            'encrypted-tbn1.gstatic.com',
            'encrypted-tbn2.gstatic.com',
            'encrypted-tbn3.gstatic.com',
            'mud-kage.kakao.com',
            'example.com',
        ],
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_KAKAO_REST_API_KEY: process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY,
        KOREA_INVESTMENT_API_URL: process.env.KOREA_INVESTMENT_API_URL,
        KOREA_INVESTMENT_API_APPKEY: process.env.KOREA_INVESTMENT_API_APPKEY,
        KOREA_INVESTMENT_API_APPSECRET: process.env.KOREA_INVESTMENT_API_APPSECRET,
        KOREA_INVESTMENT_TEST_API_URL: process.env.KOREA_INVESTMENT_TEST_API_URL,
        KOREA_INVESTMENT_TEST_API_APPKEY: process.env.KOREA_INVESTMENT_TEST_API_APPKEY,
        KOREA_INVESTMENT_TEST_API_APPSECRET: process.env.KOREA_INVESTMENT_TEST_API_APPSECRET,
    },
    reactStrictMode: false,
    // reactStrictMode: true,
};

import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === 'true', // 환경변수로 켜고 끄기
});

export default withBundleAnalyzer(nextConfig);
