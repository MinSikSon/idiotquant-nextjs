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
};

export default nextConfig;
