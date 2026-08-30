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
            {
                protocol: 'https',
                hostname: 'kr-logo-api.tofu89223.workers.dev',
                port: '',
                pathname: '/view/**',
            },
            {
                protocol: 'https',
                hostname: 'img.logo.dev',
                port: '',
                pathname: '/**',
            },
            // 기존 images.domains → remotePatterns 로 이전 (Next 16 에서 domains 제거됨)
            { protocol: 'https', hostname: 'cdn.pixabay.com' },
            { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com' },
            { protocol: 'https', hostname: 'encrypted-tbn1.gstatic.com' },
            { protocol: 'https', hostname: 'encrypted-tbn2.gstatic.com' },
            { protocol: 'https', hostname: 'encrypted-tbn3.gstatic.com' },
            { protocol: 'https', hostname: 'mud-kage.kakao.com' },
            { protocol: 'https', hostname: 'example.com' },
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

    // 로그라이크가 /game 으로 올라오면서 /game/roguelike 가 비었다. 하루짜리 주소지만
    // 내비게이션과 문서가 가리키고 있었으므로 404 로 두지 않는다.
    async redirects() {
        return [
            { source: '/game/roguelike', destination: '/game', permanent: true },
        ];
    },
};

import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === 'true', // 환경변수로 켜고 끄기
});

export default withBundleAnalyzer(nextConfig);
