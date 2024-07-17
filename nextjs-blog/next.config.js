const nextConfig = {
    output: 'export',
    distDir: 'out',
    webpack: (config) => {
        // Webpack 캐시를 비우고 새로운 캐시를 설정
        config.cache = false;

        // 최적화 설정
        config.optimization = {
            ...config.optimization,
            splitChunks: {
                ...config.optimization.splitChunks,
                maxSize: 2500000, // 최대 파일 크기 설정
            },
        };

        return config;
    },
    experimental: {
        // runtime: 'experimental-edge',
    },
    // reactStrictMode: true,
    // swcMinify: true,
    // images: {
    //     unoptimized: true
    // },
    // async redirects() {
    //     return [
    //         {
    //             source: "/user/login",
    //             destination: "/",
    //             permanent: false
    //         },
    //         {
    //             source: "/user/logout",
    //             destination: "/",
    //             permanent: false
    //         }
    //     ]
    // }
    // async headers() {
    //     return [
    //         {
    //             source: "/(.*)",
    //             headers: [
    //                 {
    //                     key: "Access-Control-Allow-Origin",
    //                     value: process.env.NEXT_PUBLIC_API_URL,
    //                 },
    //                 {
    //                     key: "Access-Control-Allow-Headers",
    //                     value:
    //                         "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    //                 },
    //                 {
    //                     key: "Access-Control-Allow-Methods",
    //                     value: "GET, POST, PATCH, DELETE, OPTIONS",
    //                 },
    //             ],
    //         },
    //     ];
    // },
}
module.exports = nextConfig;