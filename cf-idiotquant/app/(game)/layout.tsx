import type { Metadata } from "next";
import localFont from "next/font/local";
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";

/**
 * 한글 픽셀 폰트 — 게임 라우트에만.
 *
 * 이 레이아웃이 감싸는 것은 /game 하나뿐이라, 폰트도 그 화면에 들어올 때만 받는다.
 * 다른 화면에서 이 파일이 로드되지 않으므로 번들에도 들어가지 않는다.
 *
 * 굵기를 브라우저에 맡기면(합성 볼드) 픽셀 격자가 옆으로 번져 글자가 뭉갠 것처럼 보인다.
 * 그래서 400·700 을 각각 실제 파일로 준다.
 */
const galmuri = localFont({
    src: [
        { path: "./fonts/Galmuri11.woff2", weight: "400", style: "normal" },
        { path: "./fonts/Galmuri11-Bold.woff2", weight: "700", style: "normal" },
    ],
    variable: "--font-pixel",
    display: "swap",
    // 픽셀 폰트가 오기 전에 보이는 글자와 온 뒤의 글자가 크게 어긋나지 않게 잡아 둔다.
    adjustFontFallback: false,
    fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

/**
 * 로그라이크가 쓰는 글꼴 — 숫자와 라틴은 IBM Plex Mono, 한글은 IBM Plex Sans KR.
 *
 * 고정폭 하나로 끝나지 않는 이유: Plex Mono 에는 한글이 없다. 한글만 시스템 글꼴로
 * 떨어지면 카드 이름과 HUD 숫자가 서로 다른 시대의 물건처럼 보인다.
 *
 * KR 쪽은 `subsets` 를 안 준다 — next/font 가 아는 이 글꼴의 subset 목록에 `korean` 이
 * 없어서, 이름을 붙여 고르면 오히려 한글이 빠진다. 대신 preload 를 끈다(subset 을 안
 * 주면 preload 를 켤 수 없고, 어차피 unicode-range 로 갈려 있어 브라우저가 쓰는 조각만
 * 받아 간다).
 */
const plexMono = IBM_Plex_Mono({
    weight: ["400", "600"],
    subsets: ["latin"],
    variable: "--font-plex-mono",
    display: "swap",
});

const plexKr = IBM_Plex_Sans_KR({
    weight: ["400", "600"],
    preload: false,
    variable: "--font-plex-kr",
    display: "swap",
});

export const metadata: Metadata = {
    title: "내 운용사 - 블라인드 차트 리플레이 투자 게임",
    description:
        "어느 종목인지 모르는 차트를 하루씩 넘기며 사고팝니다. 반기마다 성적이 맡은 돈에 곱해지고, 고객이 돈을 맡기거나 빼갑니다. 종목명과 시기는 판이 끝나야 열립니다.",
    keywords: [
        "주식 게임", "투자 시뮬레이션", "블라인드 차트", "차트 리플레이",
        "모의투자", "주식 연습", "매매 습관",
    ],
    alternates: { canonical: "https://idiotquant.com/game" },
    openGraph: {
        title: "내 운용사 | IdiotQuant",
        description: "어느 종목인지 모르는 차트를 하루씩 넘기며 굴리는 투자 게임.",
        url: "https://idiotquant.com/game",
    },
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
    // id 는 표시용이 아니라 표식이다. global.css 의 html:has(#game-canvas) 규칙이 이걸 보고
    // 문서 뿌리까지 기기의 어둠으로 칠한다 — 고무줄 스크롤로 드러나는 자리가 거기다.
    // 페이지가 아니라 레이아웃에 다는 이유는 불러오는 중에도 그 어둠이 있어야 해서다.
    return (
        <div
            id="game-canvas"
            className={`${galmuri.variable} ${plexMono.variable} ${plexKr.variable}`}
        >
            {children}
        </div>
    );
}
