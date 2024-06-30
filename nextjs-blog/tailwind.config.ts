/** @type {import('tailwindcss').Config} */

import type { Config } from 'tailwindcss';
const withMT = require("@material-tailwind/react/utils/withMT");

const config: Config = withMT({
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/legacy/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",

        // Or if using `src` directory:
        "./src/**/*.{js,ts,jsx,tsx,mdx}",

        "./node_modules/@material-tailwind/react/components/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@material-tailwind/react/theme/components/**/*.{js,ts,jsx,tsx}",

    ],
    theme: {
        extend: {
            animation: {
                marquee: "marquee 12s linear infinite",
                marquee2: "marquee2 12s linear infinite",
            },
            keyframes: {
                marquee: {
                    "0%": { transform: "translateX(0%)" },
                    "100%": { transform: "translateX(-100%)" },
                },
                marquee2: {
                    "0%": { transform: "translateX(100%)" },
                    "100%": { transform: "translateX(0%)" },
                },
            },
        },
    },
    plugins: [],
});

export default config;


// NOTE (material-tailwind 와 typescript 호환성 문제) : https://github.com/creativetimofficial/material-tailwind/issues/528
// - package.json 에서 "@types/react": "18.2.19", 로 변경