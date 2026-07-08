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
};

import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
    enabled: process.env.ANALYZE === 'true', // 환경변수로 켜고 끄기
});

export default withBundleAnalyzer(nextConfig);
