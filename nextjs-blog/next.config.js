const nextConfig = {
    experimental: {
        // runtime: 'experimental-edge',
    },
    // reactStrictMode: true,
    // swcMinify: true,
    images: {
        unoptimized: true
    },
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
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "Access-Control-Allow-Origin",
                        value: process.env.NEXT_PUBLIC_API_URL,
                    },
                    {
                        key: "Access-Control-Allow-Headers",
                        value:
                            "Origin, X-Requested-With, Content-Type, Accept, Authorization",
                    },
                    {
                        key: "Access-Control-Allow-Methods",
                        value: "GET, POST, PATCH, DELETE, OPTIONS",
                    },
                ],
            },
        ];
    },
    output: 'export',
}
module.exports = nextConfig;