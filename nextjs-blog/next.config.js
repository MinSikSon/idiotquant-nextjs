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
}
module.exports = nextConfig;