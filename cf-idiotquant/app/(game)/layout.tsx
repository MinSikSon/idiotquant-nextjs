import type { Metadata } from "next";
import localFont from "next/font/local";

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
    return <div id="game-canvas" className={galmuri.variable}>{children}</div>;
}
